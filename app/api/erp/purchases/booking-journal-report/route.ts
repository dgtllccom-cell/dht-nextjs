import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  purchaseOrderNo: z.string().trim().max(140).optional(),
  purchaseAccountNo: z.string().trim().max(140).optional(),
  salesAccountNo: z.string().trim().max(140).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  countryId: uuidSchema.optional(),
  countryBranchId: uuidSchema.optional(),
  cityBranchId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(80)
});

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

function getEffectiveScope(session: Awaited<ReturnType<typeof requireErpSession>>, query: z.infer<typeof querySchema>) {
  const scopeType = session.isSuperAdmin
    ? "super_admin"
    : session.cityBranchIds.length
      ? "city_branch"
      : session.countryBranchIds.length
        ? "main_branch"
        : "country";

  return {
    type: scopeType,
    countryIds: query.countryId ? [query.countryId] : session.isSuperAdmin ? [] : session.countryIds,
    countryBranchIds: query.countryBranchId ? [query.countryBranchId] : session.isSuperAdmin ? [] : session.countryBranchIds,
    cityBranchIds: query.cityBranchId ? [query.cityBranchId] : session.isSuperAdmin ? [] : session.cityBranchIds,
    isGlobal: session.isSuperAdmin && !query.countryId && !query.countryBranchId && !query.cityBranchId
  };
}

async function withTimeout<T>(query: PromiseLike<QueryResult<T>>, label: string, ms = 15000): Promise<QueryResult<T>> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      Promise.resolve(query),
      new Promise<QueryResult<T>>((resolve) => {
        timeout = setTimeout(() => resolve({ data: [], error: { message: `${label} timed out` } }), ms);
      })
    ]);
  } catch (error) {
    return {
      data: [],
      error: { message: error instanceof Error ? error.message : `${label} failed` }
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeOrder(row: any) {
  const data = row.form_data ?? {};
  const form = data.form ?? {};
  const totals = data.totals ?? {};
  const goods = Array.isArray(data.goodsEntries) && data.goodsEntries.length ? data.goodsEntries : form.goodsName ? [form] : [];
  const purchaseBooking = data.purchaseBooking ?? {};
  const workflow = data.workflow ?? {};
  const quantity = goods.reduce((sum: number, item: any) => sum + Number(item.qtyNo ?? item.quantity ?? 0), 0);
  const totalWeight = goods.reduce((sum: number, item: any) => sum + Number(item.netWeight ?? item.grossWeight ?? 0), 0);
  const totalAmount = goods.reduce((sum: number, item: any) => sum + Number(item.finalAmount ?? item.totalAmount ?? 0), 0) || Number(row.order_total ?? totals.finalAmount ?? 0);
  
  const totalGrossWeight = goods.reduce((sum: number, item: any) => sum + (Number(item.grossWeight) || (Number(item.qtyNo || 0) * Number(item.qtyKgs || 0))), 0) || Number(totals.totalGross ?? 0);
  const totalNetWeight = goods.reduce((sum: number, item: any) => sum + Number(item.netWeight ?? 0), 0) || Number(totals.totalNet ?? 0);
  const purchaseAmount = goods.reduce((sum: number, item: any) => sum + Number(item.totalAmount ?? 0), 0) || Number(totals.grandPrimaryFinal ?? row.order_total ?? 0);
  const finalAmount = goods.reduce((sum: number, item: any) => sum + Number(item.finalAmount ?? 0), 0) || Number(totals.grandFinal ?? row.order_total ?? 0);

  return {
    id: row.id,
    purchaseBookingOrderNumber: row.purchase_order_no ?? form.purchaseOrderNo ?? "-",
    purchaseDate: form.purchaseDate ?? row.created_at,
    bookingDate: row.created_at,
    purchaseAccountName: form.purchaseAccountName ?? "-",
    purchaseAccountNumber: form.purchaseAccountNo ?? "-",
    salesAccountName: form.salesAccountName ?? "-",
    salesAccountNumber: form.salesAccountNo ?? "-",
    supplierName: form.supplierName ?? row.companies?.name ?? "-",
    buyerName: form.customerName ?? "-",
    productName: goods.map((item: any) => item.goodsName).filter(Boolean).join(", ") || "-",
    goodsDescription: goods
      .map((item: any) => [item.goodsName, item.size, item.brand, item.origin, item.hsCode ? `HS ${item.hsCode}` : ""].filter(Boolean).join(" / "))
      .filter(Boolean)
      .join("; ") || "-",
    quantity,
    unit: form.qtyName ?? goods[0]?.qtyName ?? "-",
    totalWeight,
    totalGrossWeight,
    totalNetWeight,
    purchaseAmount,
    finalAmount,
    containerCount: Number(purchaseBooking.totalContainersBooked ?? form.bookedContainerCount ?? 0),
    purchaseRate: quantity > 0 ? totalAmount / quantity : Number(form.coursePrice ?? 0),
    totalPurchaseAmount: totalAmount,
    currency: row.currency_code ?? form.currencyType ?? "USD",
    status: workflow.lifecycleStatus ?? purchaseBooking.loadingStatus ?? row.payment_status ?? form.salesStatus ?? "Draft",
    currentStep: workflow.currentStepName ?? "Booking Purchase Order",
    nextStep: workflow.nextStepName ?? "Booking Confirm",
    bookingStatus: workflow.bookingStatus ?? form.salesStatus ?? "Draft",
    confirmationStatus: workflow.confirmationStatus ?? (purchaseBooking.totalContainersBooked ? "Booking Confirmed" : "Awaiting Containers"),
    journalStatus: workflow.journalStatus ?? row.ledger_posting_status ?? "Draft",
    paymentStatus: workflow.paymentStatus ?? row.payment_status ?? form.paymentType ?? "-",
    containerStatus: workflow.containerStatus ?? purchaseBooking.loadingStatus ?? "Draft",
    inventoryStatus: workflow.inventoryStatus ?? "Inventory Pending",
    deliveryStatus: workflow.deliveryStatus ?? workflow.finalDeliveryStatus ?? "Pending",
    finalDeliveryStatus: workflow.finalDeliveryStatus ?? workflow.deliveryStatus ?? "Pending",
    workflowDates: workflow.workflowDates ?? {},
    workflowTotals: workflow.workflowTotals ?? {},
    workflowAuditTrail: Array.isArray(workflow.workflowAuditTrail) ? workflow.workflowAuditTrail : [],
    workflow,
    form_data: row.form_data ?? {},
    advance_paid: Number(row.advance_paid || 0),
    remaining_paid: Number(row.remaining_paid || 0),
    credit_amount: Number(row.credit_amount || 0),
    remaining_due: Number(row.remaining_due || 0),
    is_edited_since_transfer: row.is_edited_since_transfer ?? false,
    branchName: form.branchName ?? row.country_branches?.name ?? row.city_branches?.name ?? "-",
    countryName: form.branchCountry ?? row.countries?.name ?? "-",
    createdAt: row.created_at,
    ledger_posting_status: row.ledger_posting_status,
    audit: {
      userName: form.userName ?? "-",
      userId: form.userId ?? "-",
      branchCode: form.branchCode ?? row.country_branches?.code ?? row.city_branches?.code ?? "-"
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const query = querySchema.parse({
      purchaseOrderNo: request.nextUrl.searchParams.get("purchaseOrderNo") ?? undefined,
      purchaseAccountNo: request.nextUrl.searchParams.get("purchaseAccountNo") ?? undefined,
      salesAccountNo: request.nextUrl.searchParams.get("salesAccountNo") ?? undefined,
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
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
    const effectiveScope = getEffectiveScope(session, query);

    const supabase = createSupabaseAdminClient() as any;
    let requestQuery = supabase
      .from("purchase_orders")
      .select(
        "id, purchase_order_no, purchase_contract_no, country_id, country_branch_id, city_branch_id, supplier_company_id, companies(name), currency_code, exchange_rate, order_total, payment_status, ledger_posting_status, is_edited_since_transfer, form_data, created_at, countries(name, iso2), country_branches(name, code), city_branches(name, code, city_name), advance_paid, remaining_paid, credit_amount, remaining_due"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (query.purchaseOrderNo) requestQuery = requestQuery.ilike("purchase_order_no", `%${query.purchaseOrderNo.replace(/[%_]/g, "")}%`);
    if (query.dateFrom) requestQuery = requestQuery.gte("created_at", `${query.dateFrom}T00:00:00.000Z`);
    if (query.dateTo) {
      // Add a 24 hour buffer to the toDate to account for potential timezone differences
      // between the client generating the date and the Supabase database's local time.
      const toDateObj = new Date(query.dateTo);
      toDateObj.setDate(toDateObj.getDate() + 2); // 2 day buffer to be absolutely safe
      const bufferedDateStr = toDateObj.toISOString().slice(0, 10);
      requestQuery = requestQuery.lte("created_at", `${bufferedDateStr}T23:59:59.999Z`);
    }

    // Enforce strict scope isolation: city branch first, then main branch, then country.
    if (query.cityBranchId) {
      requestQuery = requestQuery.eq("city_branch_id", query.cityBranchId);
    } else if (!session.isSuperAdmin && session.cityBranchIds.length) {
      requestQuery = requestQuery.in("city_branch_id", session.cityBranchIds);
    } else if (query.countryBranchId) {
      requestQuery = requestQuery.eq("country_branch_id", query.countryBranchId);
    } else if (!session.isSuperAdmin && session.countryBranchIds.length) {
      requestQuery = requestQuery.in("country_branch_id", session.countryBranchIds);
    } else if (query.countryId) {
      requestQuery = requestQuery.eq("country_id", query.countryId);
    } else if (!session.isSuperAdmin) {
      requestQuery = requestQuery.in("country_id", session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data, error } = await withTimeout<any>(requestQuery.limit(query.limit), "purchase booking journal report");
    if (error) {
      return apiOk({
        reports: [],
        selected: null,
        summary: {
          total: 0,
          totalAmount: 0,
          totalQuantity: 0,
          totalContainers: 0
        },
        scope: effectiveScope,
        warning: error.message
      });
    }

    let reports = (data ?? []).map(normalizeOrder);
    if (query.purchaseAccountNo) {
      const term = query.purchaseAccountNo.toLowerCase();
      reports = reports.filter((report: any) => String(report.purchaseAccountNumber).toLowerCase().includes(term));
    }
    if (query.salesAccountNo) {
      const term = query.salesAccountNo.toLowerCase();
      reports = reports.filter((report: any) => String(report.salesAccountNumber).toLowerCase().includes(term));
    }

    return apiOk({
      reports,
      selected: reports[0] ?? null,
      summary: {
        total: reports.length,
        totalAmount: reports.reduce((sum: number, report: any) => sum + Number(report.totalPurchaseAmount || 0), 0),
        totalQuantity: reports.reduce((sum: number, report: any) => sum + Number(report.quantity || 0), 0),
        totalContainers: reports.reduce((sum: number, report: any) => sum + Number(report.containerCount || 0), 0)
      },
      scope: effectiveScope
    });
  } catch (error) {
    return handleApiError(error);
  }
}
