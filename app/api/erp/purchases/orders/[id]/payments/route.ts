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

    // Check if the advance payment is completed and auto-move to Loading Module
    try {
      const { data: updatedOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .select("id, purchase_order_no, country_id, country_branch_id, city_branch_id, order_total, advance_paid, remaining_due, form_data")
        .eq("id", params.id)
        .is("deleted_at", null)
        .single();

      if (orderError) throw orderError;

      if (updatedOrder) {
        const form = (updatedOrder.form_data as any)?.form ?? {};
        const advancePercent = Number(form.advancePercent ?? 10);
        const orderTotal = Number(updatedOrder.order_total || 0);
        const requiredAdvance = (orderTotal * advancePercent) / 100;
        const advancePaid = Number(updatedOrder.advance_paid || 0);

        const isAdvanceCompleted = requiredAdvance > 0 && advancePaid >= requiredAdvance;

        if (isAdvanceCompleted) {
          // Check if a record already exists in purchase_loading_records
          const { data: existingLoading, error: loadingCheckError } = await supabase
            .from("purchase_loading_records")
            .select("id")
            .eq("purchase_order_id", params.id)
            .is("deleted_at", null)
            .maybeSingle();

          if (loadingCheckError) throw loadingCheckError;

          if (!existingLoading) {
            const containerNumber = String(form.containerNo || form.containerNumber || `CONT-${updatedOrder.purchase_order_no}`).trim();
            const containerType = form.containerType || null;
            
            const randomCode = (prefix: string) => {
              const now = new Date();
              const y = now.getUTCFullYear();
              const m = String(now.getUTCMonth() + 1).padStart(2, "0");
              const d = String(now.getUTCDate()).padStart(2, "0");
              const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
              return `${prefix}-${y}${m}${d}-${rand}`;
            };

            const plrNo = randomCode("PLR");

            const loadingPayload = {
              country_id: updatedOrder.country_id,
              country_branch_id: updatedOrder.country_branch_id,
              city_branch_id: updatedOrder.city_branch_id,
              purchase_order_id: updatedOrder.id,
              purchase_order_no: updatedOrder.purchase_order_no,
              loading_record_no: plrNo,
              container_number: containerNumber,
              container_type: containerType,
              loading_status: "pending",
              loading_location: form.loadingPort || null,
              receiving_location: form.receivedPort || form.exitPort || null,
              shipment_status: "pending",
              carrier_name: form.vesselName || form.shipName || null,
              remarks: `Automatically moved to loading module after 100% advance completion of PO ${updatedOrder.purchase_order_no}`,
              report_payload: updatedOrder.form_data ?? {},
              created_by: session.userId
            };

            const { error: insertLoadingError } = await supabase
              .from("purchase_loading_records")
              .insert(loadingPayload);

            if (insertLoadingError) {
              console.error("Failed to auto-create loading record:", insertLoadingError);
              throw new Error(`Failed to automatically move to Loading Module: ${insertLoadingError.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error in auto-moving purchase order to loading records:", err);
      throw err;
    }

    return apiCreated({ paymentId });
  } catch (error) {
    return handleApiError(error);
  }
}
