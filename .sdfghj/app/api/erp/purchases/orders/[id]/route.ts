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
    patch.updated_at = new Date().toISOString();

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
