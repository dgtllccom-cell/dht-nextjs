import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { purchaseOrderCreateSchema, uuidSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";

const listQuerySchema = z.object({
  countryId: uuidSchema.optional(),
  countryBranchId: uuidSchema.optional(),
  cityBranchId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

function randomCode(prefix: string) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

async function resolveEffectiveScope(input: {
  session: Awaited<ReturnType<typeof requireErpSession>>;
  requested: { countryId?: string | null; countryBranchId?: string | null; cityBranchId?: string | null };
}) {
  const session = input.session;
  const req = input.requested;

  // Super Admin can choose, but at minimum should provide countryId for country-scope records.
  if (session.isSuperAdmin) {
    return {
      countryId: req.countryId ?? null,
      countryBranchId: req.countryBranchId ?? null,
      cityBranchId: req.cityBranchId ?? null
    };
  }

  // Strictest scope first.
  const supabase = await createApiSupabaseClient();

  if (session.cityBranchIds.length) {
    const cityBranchId = session.cityBranchIds[0]!;
    const row = await requireSupabaseData(
      supabase
        .from("city_branches")
        .select("id, country_id, country_branch_id")
        .eq("id", cityBranchId)
        .is("deleted_at", null)
        .maybeSingle()
    );
    return {
      countryId: (row as any)?.country_id ?? session.countryIds[0] ?? null,
      countryBranchId: (row as any)?.country_branch_id ?? session.countryBranchIds[0] ?? null,
      cityBranchId
    };
  }

  if (session.countryBranchIds.length) {
    const countryBranchId = session.countryBranchIds[0]!;
    const row = await requireSupabaseData(
      supabase
        .from("country_branches")
        .select("id, country_id")
        .eq("id", countryBranchId)
        .is("deleted_at", null)
        .maybeSingle()
    );
    return {
      countryId: (row as any)?.country_id ?? session.countryIds[0] ?? null,
      countryBranchId,
      cityBranchId: null
    };
  }

  return {
    countryId: session.countryIds[0] ?? null,
    countryBranchId: null,
    cityBranchId: null
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const query = listQuerySchema.parse({
      countryId: request.nextUrl.searchParams.get("countryId") ?? undefined,
      countryBranchId: request.nextUrl.searchParams.get("countryBranchId") ?? undefined,
      cityBranchId: request.nextUrl.searchParams.get("cityBranchId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: query.countryId ?? null,
      countryBranchId: query.countryBranchId ?? null,
      cityBranchId: query.cityBranchId ?? null
    });

    const supabase = await createApiSupabaseClient();
    let q = supabase
      .from("purchase_orders")
      .select(
        "id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, advance_paid, remaining_paid, credit_amount, remaining_due, payment_status, ledger_posting_status, form_data, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Enforce scope isolation (same pattern as Roznamcha listing).
    if (query.countryId) {
      q = q.eq("country_id", query.countryId);
    } else if (!session.isSuperAdmin) {
      q = q.in("country_id", session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    if (query.countryBranchId) {
      q = q.eq("country_branch_id", query.countryBranchId);
    } else if (!session.isSuperAdmin && session.countryBranchIds.length) {
      q = q.in("country_branch_id", session.countryBranchIds);
    }

    if (query.cityBranchId) {
      q = q.eq("city_branch_id", query.cityBranchId);
    } else if (!session.isSuperAdmin && session.cityBranchIds.length) {
      q = q.in("city_branch_id", session.cityBranchIds);
    }

    const rows = await requireSupabaseData(q.limit(query.limit));

    return apiOk({ orders: rows ?? [], limit: query.limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = purchaseOrderCreateSchema.parse(await request.json());

    const effective = await resolveEffectiveScope({
      session,
      requested: {
        countryId: body.countryId ?? null,
        countryBranchId: body.countryBranchId ?? null,
        cityBranchId: body.cityBranchId ?? null
      }
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "create",
      countryId: effective.countryId,
      countryBranchId: effective.countryBranchId,
      cityBranchId: effective.cityBranchId
    });

    const supabase = await createApiSupabaseClient();

    const purchaseOrderNo = randomCode("PO");
    const payload = {
      country_id: effective.countryId,
      country_branch_id: effective.countryBranchId,
      city_branch_id: effective.cityBranchId,
      purchase_order_no: purchaseOrderNo,
      purchase_contract_no: body.purchaseContractNo?.trim() || null,
      supplier_company_id: body.supplierCompanyId ?? null,
      currency_code: body.currencyCode,
      exchange_rate: body.exchangeRate,
      order_total: body.orderTotal,
      form_data: body.formData ?? null,
      ledger_posting_status: body.ledgerPostingStatus || "Pending"
    };

    const inserted = await requireSupabaseData(
      supabase.from("purchase_orders").insert(payload).select("id, purchase_order_no").single()
    );

    await writeAuditLog({
      action: "create",
      entityTable: "purchase_orders",
      entityId: (inserted as any).id ?? null,
      before: null,
      after: payload,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiCreated({
      purchaseOrderId: (inserted as any).id as string,
      purchaseOrderNo: (inserted as any).purchase_order_no as string
    });
  } catch (error) {
    return handleApiError(error);
  }
}
