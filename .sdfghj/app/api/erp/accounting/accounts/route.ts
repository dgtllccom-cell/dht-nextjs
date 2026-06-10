import { NextRequest } from "next/server";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { enterpriseAccountCreateSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope, getScopeFromSearchParams } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { createApiSupabaseClient } from "@/lib/api/supabase";

function normalizeCodePart(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return fallback;
  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 6) || fallback;
}

function cityShortCode(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return fallback;
  const words = raw.split(/[\s_-]+/g).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 3);
  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 3) || fallback;
}

async function nextEnterpriseAccountCode(
  supabase: Awaited<ReturnType<typeof createApiSupabaseClient>>,
  input: {
    scope: string;
    countryId?: string | null;
    countryBranchId?: string | null;
    cityBranchId?: string | null;
  }
) {
  let prefix = "SA-AC";

  if (input.scope !== "super_admin" && input.countryId) {
    const { data: country, error: countryError } = await supabase
      .from("countries")
      .select("name, iso2")
      .eq("id", input.countryId)
      .maybeSingle();
    if (countryError) throw new Error(countryError.message);

    const countryPrefix =
      (country as any)?.name?.toLowerCase?.().includes("united arab emirates")
        ? "UAE"
        : normalizeCodePart((country as any)?.iso2 ?? null, "CT");

    prefix = `${countryPrefix}-AC`;

    if ((input.scope === "main_branch" || input.scope === "city_branch") && input.cityBranchId) {
      const { data: cityBranch, error: cityError } = await supabase
        .from("city_branches")
        .select("city_name, code")
        .eq("id", input.cityBranchId)
        .maybeSingle();
      if (cityError) throw new Error(cityError.message);

      const cityPrefix =
        cityShortCode((cityBranch as any)?.city_name ?? null, "") ||
        normalizeCodePart((cityBranch as any)?.code ?? null, "BR").slice(0, 3);
      prefix = `${countryPrefix}-${cityPrefix}-AC`;
    }
  }

  const { data: existing, error } = await (supabase as any)
    .from("enterprise_accounts")
    .select("code")
    .ilike("code", `${prefix}-%`)
    .order("code", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const latest = Array.isArray(existing) ? (existing[0] as any)?.code as string | undefined : undefined;
  const latestNo = latest ? Number(latest.split("-").pop()) : 0;
  const next = Number.isFinite(latestNo) ? latestNo + 1 : 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const scope = getScopeFromSearchParams(request);

    authorizeApiScope(session, {
      resource: "accounts",
      action: "read",
      ...scope
    });

    const supabase = await createApiSupabaseClient();
    let query = supabase
      .from("enterprise_accounts")
      .select(
        "id, scope, country_id, country_branch_id, city_branch_id, parent_id, code, name, kind, currency, opening_balance, current_balance, status, is_control_account, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("code", { ascending: true });

    if (scope.countryId) query = query.eq("country_id", scope.countryId);
    if (scope.countryBranchId) query = query.eq("country_branch_id", scope.countryBranchId);
    if (scope.cityBranchId) query = query.eq("city_branch_id", scope.cityBranchId);

    const { data, error } = await query.limit(200);

    if (error) {
      throw new Error(error.message);
    }

    return apiOk({
      accounts: data ?? [],
      limit: 200
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = enterpriseAccountCreateSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "accounts",
      action: "create",
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId
    });

    const supabase = await createApiSupabaseClient();
    const issuedCode =
      body.code.trim().toUpperCase() === "AUTO"
        ? await nextEnterpriseAccountCode(supabase, {
            scope: body.scope,
            countryId: body.countryId,
            countryBranchId: body.countryBranchId,
            cityBranchId: body.cityBranchId
          })
        : body.code.trim().toUpperCase();

    // RPC relies on `auth.uid()`; requires a real Supabase Auth session (not the temp ERP cookie).
    const { data, error } = await supabase.rpc("create_enterprise_account", {
      p_scope: body.scope,
      p_country_id: body.countryId ?? null,
      p_country_branch_id: body.countryBranchId ?? null,
      p_city_branch_id: body.cityBranchId ?? null,
      p_parent_id: body.parentId ?? null,
      p_code: issuedCode,
      p_name: body.name,
      p_kind: body.kind,
      p_currency: body.currency,
      p_opening_balance: body.openingBalance,
      p_is_control_account: body.isControlAccount
    });

    if (error) {
      throw new Error(error.message);
    }

    const accountId = data as string;

    // ERP rule: every account should have a ledger.
    // We auto-create a ledger record bound to this enterprise account.
    const creditNormal = body.kind === "liability" || body.kind === "equity" || body.kind === "income";

    let parentLedgerId: string | null = null;
    if (body.parentId) {
      const { data: parentLedger, error: parentLedgerError } = await supabase
        .from("ledgers")
        .select("id")
        .eq("enterprise_account_id", body.parentId)
        .is("deleted_at", null)
        .maybeSingle();
      if (parentLedgerError) {
        throw new Error(parentLedgerError.message);
      }
      parentLedgerId = (parentLedger as any)?.id ?? null;
    }

    const { data: ledgerId, error: ledgerError } = await supabase.rpc("create_enterprise_ledger", {
      p_scope: body.scope,
      p_country_id: body.countryId ?? null,
      p_country_branch_id: body.countryBranchId ?? null,
      p_city_branch_id: body.cityBranchId ?? null,
      p_enterprise_account_id: accountId,
      p_parent_ledger_id: parentLedgerId,
      p_code: issuedCode,
      p_name: body.name,
      p_currency: body.currency,
      p_opening_balance: body.openingBalance,
      p_normal_balance: creditNormal ? "credit" : "debit"
    });

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

    return apiCreated({
      accountId,
      ledgerId: ledgerId as string,
      accountCode: issuedCode
    });
  } catch (error) {
    return handleApiError(error);
  }
}
