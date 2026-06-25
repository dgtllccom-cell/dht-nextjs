import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { createApiSupabaseClient, requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { optionalUuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";

const salesOrderSchema = z.object({
  countryId: optionalUuidSchema,
  countryBranchId: optionalUuidSchema,
  cityBranchId: optionalUuidSchema,
  customerAccountId: optionalUuidSchema,
  customerLedgerId: optionalUuidSchema,
  purchaseOrderId: optionalUuidSchema,
  salesOrderNo: z.string().trim().min(1).max(120).optional(),
  salesContractNo: z.string().trim().max(120).optional().nullable(),
  orderDate: z.string().date().optional(),
  customerName: z.string().trim().max(200).optional().nullable(),
  accountNumber: z.string().trim().max(120).optional().nullable(),
  manualReferenceNumber: z.string().trim().max(120).optional().nullable(),
  customerNumber: z.string().trim().max(120).optional().nullable(),
  countrySerialNumber: z.string().trim().max(120).optional().nullable(),
  branchSerialNumber: z.string().trim().max(120).optional().nullable(),
  productSummary: z.string().trim().max(1000).optional().nullable(),
  quantity: z.coerce.number().finite().min(0).default(0),
  totalWeight: z.coerce.number().finite().min(0).default(0),
  currencyCode: z.string().trim().min(2).max(10).default("USD"),
  exchangeRate: z.coerce.number().finite().positive().default(1),
  orderTotal: z.coerce.number().finite().min(0).default(0),
  paidAmount: z.coerce.number().finite().min(0).default(0),
  remainingAmount: z.coerce.number().finite().min(0).default(0),
  salesStatus: z.string().trim().max(80).default("draft"),
  paymentStatus: z.string().trim().max(80).default("pending"),
  deliveryStatus: z.string().trim().max(80).default("pending"),
  workflowState: z.unknown().optional(),
  formData: z.unknown().optional()
});

function orderNo() {
  const now = new Date();
  return `SO-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

async function resolveCountryCurrency(supabase: any, countryId: string | null | undefined, fallback = "USD") {
  if (!countryId) return fallback;
  const { data } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("id", countryId)
    .maybeSingle();
  return data?.currency_code || fallback;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const params = request.nextUrl.searchParams;
    const countryId = params.get("countryId");
    const countryBranchId = params.get("countryBranchId");
    const cityBranchId = params.get("cityBranchId");

    authorizeApiScope(session, { resource: "sales", action: "read", countryId, countryBranchId, cityBranchId });

    const supabase = await createApiSupabaseClient();
    let query: any = supabase
      .from("sales_orders")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(params.get("limit") || 100), 200));

    if (params.get("q")) {
      const term = String(params.get("q")).replace(/[%_]/g, "");
      query = query.or(`sales_order_no.ilike.%${term}%,account_number.ilike.%${term}%,manual_reference_number.ilike.%${term}%,customer_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }
    if (cityBranchId) query = query.eq("city_branch_id", cityBranchId);
    else if (!session.isSuperAdmin && session.cityBranchIds.length) query = query.in("city_branch_id", session.cityBranchIds);
    else if (countryBranchId) query = query.eq("country_branch_id", countryBranchId);
    else if (!session.isSuperAdmin && session.countryBranchIds.length) query = query.in("country_branch_id", session.countryBranchIds);
    else if (countryId) query = query.eq("country_id", countryId);
    else if (!session.isSuperAdmin) query = query.in("country_id", session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]);

    return apiOk({ salesOrders: await requireSupabaseData(query) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = salesOrderSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "sales",
      action: "create",
      countryId: body.countryId ?? null,
      countryBranchId: body.countryBranchId ?? null,
      cityBranchId: body.cityBranchId ?? null
    });

    const supabase = await createApiSupabaseClient();
    const recordCurrencyCode = await resolveCountryCurrency(supabase, body.countryId, body.currencyCode);

    const payload = {
      country_id: body.countryId ?? null,
      country_branch_id: body.countryBranchId ?? null,
      city_branch_id: body.cityBranchId ?? null,
      customer_account_id: body.customerAccountId ?? null,
      customer_ledger_id: body.customerLedgerId ?? null,
      purchase_order_id: body.purchaseOrderId ?? null,
      sales_order_no: body.salesOrderNo?.trim() || orderNo(),
      sales_contract_no: body.salesContractNo ?? null,
      order_date: body.orderDate ?? new Date().toISOString().slice(0, 10),
      customer_name: body.customerName ?? null,
      account_number: body.accountNumber ?? null,
      manual_reference_number: body.manualReferenceNumber ?? null,
      customer_number: body.customerNumber ?? null,
      country_serial_number: body.countrySerialNumber ?? null,
      branch_serial_number: body.branchSerialNumber ?? null,
      product_summary: body.productSummary ?? null,
      quantity: body.quantity,
      total_weight: body.totalWeight,
      currency_code: recordCurrencyCode,
      exchange_rate: body.exchangeRate,
      order_total: body.orderTotal,
      paid_amount: body.paidAmount,
      remaining_amount: body.remainingAmount,
      sales_status: body.salesStatus,
      payment_status: body.paymentStatus,
      delivery_status: body.deliveryStatus,
      workflow_state: body.workflowState ?? {},
      form_data: body.formData ?? {},
      created_by: null,
      updated_by: null
    };

    const row = await requireSupabaseData(supabase.from("sales_orders").insert(payload).select("id, sales_order_no").single());

    await writeAuditLog({
      action: "create",
      entityTable: "sales_orders",
      entityId: (row as any).id,
      before: null,
      after: payload,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiCreated({ salesOrderId: (row as any).id, salesOrderNo: (row as any).sales_order_no });
  } catch (error) {
    return handleApiError(error);
  }
}
