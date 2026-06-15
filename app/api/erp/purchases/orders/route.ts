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

    const lps = String(body.ledgerPostingStatus || "draft").toLowerCase();
    const ledgerPostingStatus = lps === "posted" ? "posted" : lps === "cancelled" ? "cancelled" : "draft";

    const purchaseOrderNo = randomCode("PO");
    const paymentStatusRaw = String(body.paymentStatus || "pending").toLowerCase();
    const paymentStatus = ["pending", "partial", "completed", "cancelled"].includes(paymentStatusRaw) ? paymentStatusRaw : "pending";

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
      payment_status: paymentStatus,
      ledger_posting_status: ledgerPostingStatus
    };

    const inserted = await requireSupabaseData(
      supabase.from("purchase_orders").insert(payload).select("id, purchase_order_no").single()
    );

    const orderId = (inserted as any).id;

    if (ledgerPostingStatus === "posted") {
      const form = (body.formData as any)?.form ?? {};
      const advancePercent = Number(form.advancePercent ?? 10);
      const advanceAmount = (Number(body.orderTotal) * advancePercent) / 100;
      const entryDate = form.advancePaymentDate || form.purchaseDate || new Date().toISOString().slice(0, 10);
      
      const debitLedgerId = await getLedgerIdByCode(supabase, form.purchaseAccountNo);
      const creditLedgerId = await getLedgerIdByCode(supabase, form.salesAccountNo);
      
      if (!debitLedgerId) {
        throw new Error(`Debit Ledger not found for account code: ${form.purchaseAccountNo}`);
      }
      if (!creditLedgerId) {
        throw new Error(`Credit Ledger not found for account code: ${form.salesAccountNo}`);
      }

      const { error: paymentError } = await supabase.rpc("post_purchase_order_payment", {
        p_purchase_order_id: orderId,
        p_kind: "advance",
        p_entry_date: entryDate,
        p_amount: advanceAmount,
        p_currency_code: body.currencyCode || "USD",
        p_exchange_rate: Number(body.exchangeRate || 1),
        p_debit_ledger_id: debitLedgerId,
        p_credit_ledger_id: creditLedgerId,
        p_reference_no: body.purchaseContractNo || null,
        p_narration: `Purchase Booking Purchase ${purchaseOrderNo}${form.orderReportRemarks || form.remarks ? ` - ${form.orderReportRemarks || form.remarks}` : ""}`
      });

      if (paymentError) {
        throw new Error(`Failed to post ledger entry: ${paymentError.message}`);
      }
    }

    await writeAuditLog({
      action: "create",
      entityTable: "purchase_orders",
      entityId: orderId ?? null,
      before: null,
      after: payload,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiCreated({
      purchaseOrderId: orderId as string,
      purchaseOrderNo: (inserted as any).purchase_order_no as string
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getLedgerIdByCode(supabase: any, code: string) {
  const lookup = String(code || "").trim();
  if (!lookup) return null;

  const { data, error } = await supabase
    .from("ledgers")
    .select("id")
    .eq("code", lookup)
    .is("deleted_at", null)
    .maybeSingle();
  if (!error && data?.id) return data.id;

  const { data: account } = await supabase
    .from("enterprise_accounts")
    .select("id, code, account_number, manual_reference_number, customer_number")
    .or(`code.eq.${lookup},account_number.eq.${lookup},manual_reference_number.eq.${lookup},customer_number.eq.${lookup}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (!account?.id) return null;

  const { data: ledgerByAccount } = await supabase
    .from("ledgers")
    .select("id")
    .eq("enterprise_account_id", account.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (ledgerByAccount?.id) return ledgerByAccount.id;

  const accountCodes = [account.code, account.account_number, account.manual_reference_number, account.customer_number].filter(Boolean);
  if (!accountCodes.length) return null;

  const { data: ledgerByCode } = await supabase
    .from("ledgers")
    .select("id")
    .in("code", accountCodes)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return ledgerByCode?.id ?? null;
}
