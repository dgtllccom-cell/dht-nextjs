import { NextRequest } from "next/server";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { enterpriseAccountCreateSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope, getScopeFromSearchParams } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { createApiSupabaseClient } from "@/lib/api/supabase";

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizeCodePart(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return fallback;
  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 6) || fallback;
}

function cityShortCode(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return fallback;
  if (raw.includes("CHAMAN")) return "CHM";
  if (raw.includes("QUETTA")) return "QTA";
  const words = raw.split(/[\s_-]+/g).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 3);
  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 3) || fallback;
}

function sequencePrefix(value: string | null | undefined, fallback: string, length = 6) {
  return normalizeCodePart(value, fallback).slice(0, length) || fallback;
}

function countrySerialPrefix(country: { name?: string | null; iso2?: string | null } | null | undefined) {
  const name = country?.name ?? "";
  const normalizedName = normalizeCodePart(name, "");
  if (name.toLowerCase().includes("united arab emirates")) return "UAE";
  if (name.toLowerCase().includes("afghanistan")) return "AFG";
  if (normalizedName.length >= 3) return normalizedName.slice(0, 3);
  return normalizeCodePart(country?.iso2 ?? null, "CT").slice(0, 3) || "CT";
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

async function resolveBranchCode(
  supabase: Awaited<ReturnType<typeof createApiSupabaseClient>>,
  input: {
    scope: string;
    countryId?: string | null;
    countryBranchId?: string | null;
    cityBranchId?: string | null;
  }
) {
  if (input.scope === "super_admin") return "SUPER";

  if (input.scope === "city_branch" && input.cityBranchId) {
    const { data, error } = await supabase
      .from("city_branches")
      .select("code, city_name")
      .eq("id", input.cityBranchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeCodePart((data as any)?.code ?? (data as any)?.city_name ?? null, "CITY");
  }

  if ((input.scope === "main_branch" || input.scope === "country") && input.countryBranchId) {
    const { data, error } = await supabase
      .from("country_branches")
      .select("code, name")
      .eq("id", input.countryBranchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeCodePart((data as any)?.code ?? (data as any)?.name ?? null, "MAIN");
  }

  if (input.countryId) {
    const { data, error } = await supabase
      .from("countries")
      .select("iso2, name")
      .eq("id", input.countryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeCodePart((data as any)?.iso2 ?? (data as any)?.name ?? null, "CT");
  }

  return "BRANCH";
}

async function nextAccountIdentity(
  supabase: Awaited<ReturnType<typeof createApiSupabaseClient>>,
  input: {
    scope: string;
    countryId?: string | null;
    countryBranchId?: string | null;
    cityBranchId?: string | null;
    accountCode: string;
    manualReferenceNumber?: string | null;
  }
) {
  const branchCode = await resolveBranchCode(supabase, input);
  let countryPrefix = "SA";
  let branchPrefix = branchCode;

  if (input.scope !== "super_admin" && input.countryId) {
    const { data: country, error: countryError } = await supabase
      .from("countries")
      .select("name, iso2")
      .eq("id", input.countryId)
      .maybeSingle();
    if (countryError) throw new Error(countryError.message);

    countryPrefix = countrySerialPrefix(country as any);
  }

  if (input.scope === "city_branch" && input.cityBranchId) {
    const { data: cityBranch, error: cityBranchError } = await supabase
      .from("city_branches")
      .select("code, name, city_name")
      .eq("id", input.cityBranchId)
      .maybeSingle();
    if (cityBranchError) throw new Error(cityBranchError.message);
    branchPrefix = cityShortCode((cityBranch as any)?.city_name ?? (cityBranch as any)?.name ?? (cityBranch as any)?.code ?? null, "CITY");
  } else if ((input.scope === "main_branch" || input.scope === "country") && input.countryBranchId) {
    const { data: countryBranch, error: branchError } = await supabase
      .from("country_branches")
      .select("code, name")
      .eq("id", input.countryBranchId)
      .maybeSingle();
    if (branchError) throw new Error(branchError.message);
    branchPrefix = "MAIN";
  }

  const { count: totalCount, error: totalError } = await (supabase as any)
    .from("enterprise_accounts")
    .select("id", { count: "exact", head: true });
  if (totalError) throw new Error(totalError.message);

  let countryQuery = (supabase as any)
    .from("enterprise_accounts")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .not("manual_reference_number", "is", null);
  if (input.countryId) countryQuery = countryQuery.eq("country_id", input.countryId);
  else countryQuery = countryQuery.is("country_id", null);

  const { count: countryCount, error: countryCountError } = await countryQuery;
  if (countryCountError) throw new Error(countryCountError.message);

  let branchQuery = (supabase as any)
    .from("enterprise_accounts")
    .select("id", { count: "exact", head: true })
    .eq("scope", input.scope)
    .is("deleted_at", null)
    .not("manual_reference_number", "is", null);

  if (input.countryId) branchQuery = branchQuery.eq("country_id", input.countryId);
  else branchQuery = branchQuery.is("country_id", null);

  if (input.countryBranchId) branchQuery = branchQuery.eq("country_branch_id", input.countryBranchId);
  else branchQuery = branchQuery.is("country_branch_id", null);

  if (input.cityBranchId) branchQuery = branchQuery.eq("city_branch_id", input.cityBranchId);
  else branchQuery = branchQuery.is("city_branch_id", null);

  const { count: branchCount, error: branchError } = await branchQuery;
  if (branchError) throw new Error(branchError.message);

  const accountSerialNumber = Number(totalCount ?? 0) + 1;
  const branchAccountSequence = Number(branchCount ?? 0) + 1;

  return {
    accountNumber: input.accountCode,
    customerNumber: `CUST-${input.accountCode}`,
    accountSerialNumber,
    countrySerialNumber: `${countryPrefix}-${String(Number(countryCount ?? 0) + 1).padStart(6, "0")}`,
    branchSerialNumber: `${countryPrefix}-${branchPrefix}-${String(branchAccountSequence).padStart(6, "0")}`,
    branchCode,
    branchAccountSequence
  };
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
        "id, scope, country_id, country_branch_id, city_branch_id, parent_id, code, account_number, customer_number, account_serial_number, country_serial_number, branch_serial_number, manual_reference_number, creation_date, branch_code, branch_account_sequence, name, kind, currency, opening_balance, current_balance, status, is_control_account, created_at, updated_at"
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

    const identity = await nextAccountIdentity(supabase, {
      scope: body.scope,
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId,
      accountCode: issuedCode,
      manualReferenceNumber: body.manualReferenceNumber?.trim() || null
    });
    const actorId = isUuid(session.userId) ? session.userId : null;
    const manualReferenceNumber = body.manualReferenceNumber?.trim() || null;

    const { data: createdAccount, error } = await (supabase as any)
      .from("enterprise_accounts")
      .insert({
        scope: body.scope,
        country_id: body.countryId ?? null,
        country_branch_id: body.countryBranchId ?? null,
        city_branch_id: body.cityBranchId ?? null,
        parent_id: body.parentId ?? null,
        code: issuedCode,
        account_number: identity.accountNumber,
        customer_number: identity.customerNumber,
        account_serial_number: identity.accountSerialNumber,
        country_serial_number: identity.countrySerialNumber,
        branch_serial_number: identity.branchSerialNumber,
        manual_reference_number: manualReferenceNumber,
        creation_date: new Date().toISOString(),
        branch_code: identity.branchCode,
        branch_account_sequence: identity.branchAccountSequence,
        name: body.name,
        kind: body.kind,
        currency: body.currency.toUpperCase(),
        opening_balance: body.openingBalance,
        current_balance: body.openingBalance,
        status: "active",
        is_control_account: body.isControlAccount,
        created_by: actorId
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const accountId = (createdAccount as { id: string }).id;

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

    const { data: createdLedger, error: ledgerError } = await (supabase as any)
      .from("ledgers")
      .insert({
        scope: body.scope,
        country_id: body.countryId ?? null,
        country_branch_id: body.countryBranchId ?? null,
        city_branch_id: body.cityBranchId ?? null,
        enterprise_account_id: accountId,
        parent_ledger_id: parentLedgerId,
        code: issuedCode,
        name: body.name,
        currency: body.currency.toUpperCase(),
        opening_balance: body.openingBalance,
        current_balance: body.openingBalance,
        debit_total: 0,
        credit_total: 0,
        normal_balance: creditNormal ? "credit" : "debit",
        is_active: true,
        created_by: actorId
      })
      .select("id")
      .single();

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

    const ledgerId = (createdLedger as { id: string }).id;

    await supabase.from("enterprise_account_history").insert({
      enterprise_account_id: accountId,
      account_number: identity.accountNumber,
      event_type: "created",
      created_by: actorId,
      debit_total: 0,
      credit_total: 0,
      current_balance: body.openingBalance,
      details: {
        customerNumber: identity.customerNumber,
        accountSerialNumber: identity.accountSerialNumber,
        countrySerialNumber: identity.countrySerialNumber,
        branchSerialNumber: identity.branchSerialNumber,
        manualReferenceNumber,
        branchCode: identity.branchCode,
        branchAccountSequence: identity.branchAccountSequence,
        linkedLedgerId: ledgerId,
        sessionUser: {
          id: session.userId,
          email: session.email,
          fullName: session.fullName
        }
      }
    });

    return apiCreated({
      accountId,
      ledgerId,
      accountCode: issuedCode,
      accountNumber: identity.accountNumber,
      customerNumber: identity.customerNumber,
      accountSerialNumber: identity.accountSerialNumber,
      countrySerialNumber: identity.countrySerialNumber,
      branchSerialNumber: identity.branchSerialNumber,
      manualReferenceNumber,
      branchCode: identity.branchCode,
      branchAccountSequence: identity.branchAccountSequence
    });
  } catch (error) {
    return handleApiError(error);
  }
}
