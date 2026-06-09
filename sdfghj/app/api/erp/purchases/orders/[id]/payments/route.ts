import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { purchaseOrderPaymentPostSchema, uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const paramsSchema = z.object({
  id: uuidSchema
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);

    const supabase = await createApiSupabaseClient();
    const order = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select("id, country_id, country_branch_id, city_branch_id")
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: (order as any)?.country_id ?? null,
      countryBranchId: (order as any)?.country_branch_id ?? null,
      cityBranchId: (order as any)?.city_branch_id ?? null
    });

    const rows = await requireSupabaseData(
      supabase
        .from("purchase_order_payments")
        .select(
          "id, purchase_order_id, kind, entry_date, amount, currency_code, exchange_rate, debit_ledger_id, credit_ledger_id, roznamcha_entry_id, status, reference_no, narration, created_at"
        )
        .eq("purchase_order_id", params.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200)
    );

    return apiOk({ payments: rows ?? [], limit: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = paramsSchema.parse(await context.params);
    const body = purchaseOrderPaymentPostSchema.parse(await request.json());

    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured. Purchase posting requires a real Supabase login.");
    }

    const supabase = await createApiSupabaseClient();
    const order = await requireSupabaseData(
      supabase
        .from("purchase_orders")
        .select("id, country_id, country_branch_id, city_branch_id")
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle()
    );

    authorizeApiScope(session, {
      resource: "purchases",
      action: "post",
      countryId: (order as any)?.country_id ?? null,
      countryBranchId: (order as any)?.country_branch_id ?? null,
      cityBranchId: (order as any)?.city_branch_id ?? null
    });

    // Transaction-safe posting via RPC. Uses auth.uid() from the Supabase session cookies.
    const { data, error } = await supabase.rpc("post_purchase_order_payment", {
      p_purchase_order_id: params.id,
      p_kind: body.kind,
      p_entry_date: body.entryDate,
      p_amount: body.amount,
      p_currency_code: body.currencyCode,
      p_exchange_rate: body.exchangeRate,
      p_debit_ledger_id: body.debitLedgerId,
      p_credit_ledger_id: body.creditLedgerId,
      p_reference_no: body.referenceNo ?? null,
      p_narration: body.narration ?? null
    });

    if (error) {
      throw new Error(error.message);
    }

    const paymentId = data as string;

    await writeAuditLog({
      action: "post_payment",
      entityTable: "purchase_order_payments",
      entityId: paymentId,
      before: null,
      after: {
        purchaseOrderId: params.id,
        kind: body.kind,
        amount: body.amount,
        currencyCode: body.currencyCode,
        exchangeRate: body.exchangeRate,
        debitLedgerId: body.debitLedgerId,
        creditLedgerId: body.creditLedgerId
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiCreated({ paymentId });
  } catch (error) {
    return handleApiError(error);
  }
}
