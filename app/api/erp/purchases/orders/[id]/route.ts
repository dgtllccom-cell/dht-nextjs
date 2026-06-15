import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { purchaseOrderUpdateSchema, uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);

    const supabase = await createApiSupabaseClient();
    const row = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select(
          "id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, advance_paid, remaining_paid, credit_amount, remaining_due, payment_status, ledger_posting_status, form_data, created_at, updated_at"
        )
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: (row as any)?.country_id ?? null,
      countryBranchId: (row as any)?.country_branch_id ?? null,
      cityBranchId: (row as any)?.city_branch_id ?? null
    });

    return apiOk({ order: row });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = purchaseOrderUpdateSchema.parse(await request.json());

    const supabase = await createApiSupabaseClient();
    const before = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select(
          "id, country_id, country_branch_id, city_branch_id, supplier_company_id, currency_code, exchange_rate, order_total, form_data"
        )
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "update",
      countryId: (before as any)?.country_id ?? null,
      countryBranchId: (before as any)?.country_branch_id ?? null,
      cityBranchId: (before as any)?.city_branch_id ?? null
    });

    const patch: Record<string, unknown> = {};
    if (body.supplierCompanyId !== undefined) patch.supplier_company_id = body.supplierCompanyId ?? null;
    if (body.purchaseContractNo !== undefined) patch.purchase_contract_no = body.purchaseContractNo?.trim() || null;
    if (body.currencyCode !== undefined) patch.currency_code = body.currencyCode;
    if (body.exchangeRate !== undefined) patch.exchange_rate = body.exchangeRate;
    if (body.orderTotal !== undefined) patch.order_total = body.orderTotal;
    if (body.formData !== undefined) patch.form_data = body.formData ?? null;
    if (body.ledgerPostingStatus !== undefined) {
      const s = String(body.ledgerPostingStatus).toLowerCase();
      patch.ledger_posting_status = s === "posted" ? "posted" : s === "cancelled" ? "cancelled" : "draft";
    }
    if (body.paymentStatus !== undefined) {
      const s = String(body.paymentStatus).toLowerCase();
      patch.payment_status = ["pending", "partial", "completed", "cancelled"].includes(s) ? s : "pending";
    }
    patch.updated_at = new Date().toISOString();

    const shouldPost = (before as any)?.ledger_posting_status !== "posted" && patch.ledger_posting_status === "posted";

    if (shouldPost) {
      const orderId = params.id;
      const orderTotal = body.orderTotal !== undefined ? body.orderTotal : (before as any).order_total;
      const currencyCode = body.currencyCode !== undefined ? body.currencyCode : (before as any).currency_code;
      const exchangeRate = body.exchangeRate !== undefined ? body.exchangeRate : (before as any).exchange_rate;
      const formData = body.formData !== undefined ? body.formData : (before as any).form_data;
      
      const form = formData?.form ?? {};
      const advancePercent = Number(form.advancePercent ?? 10);
      const advanceAmount = (Number(orderTotal) * advancePercent) / 100;
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
        p_currency_code: currencyCode || "USD",
        p_exchange_rate: Number(exchangeRate || 1),
        p_debit_ledger_id: debitLedgerId,
        p_credit_ledger_id: creditLedgerId,
        p_reference_no: body.purchaseContractNo || (before as any).purchase_contract_no || null,
        p_narration: `Purchase Booking Purchase ${(before as any).purchase_order_no}${form.orderReportRemarks || form.remarks ? ` - ${form.orderReportRemarks || form.remarks}` : ""}`
      });

      if (paymentError) {
        throw new Error(`Failed to post ledger entry: ${paymentError.message}`);
      }
    }

    const updated = await requireSupabaseData(
      supabase.from("purchase_orders").update(patch).eq("id", params.id).select("id").single()
    );

    await writeAuditLog({
      action: "update",
      entityTable: "purchase_orders",
      entityId: (updated as any).id ?? params.id,
      before,
      after: patch,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiOk({ purchaseOrderId: params.id });
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
