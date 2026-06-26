import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { optionalUuidSchema, uuidSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { requireSupabaseData, writeAuditLog } from "@/lib/api/supabase";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const loadingStatusSchema = z.enum(["draft", "pending", "loaded", "received", "cancelled"]);

const querySchema = z.object({
  countryId: uuidSchema.optional(),
  countryBranchId: uuidSchema.optional(),
  cityBranchId: uuidSchema.optional(),
  status: loadingStatusSchema.optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(300).default(100)
});

const createSchema = z.object({
  countryId: optionalUuidSchema,
  countryBranchId: optionalUuidSchema,
  cityBranchId: optionalUuidSchema,
  purchaseOrderId: optionalUuidSchema,
  purchaseOrderNo: z.string().trim().max(120).nullable().optional(),
  containerNumber: z.string().trim().min(1).max(160),
  containerType: z.string().trim().max(120).nullable().optional(),
  loadingStatus: loadingStatusSchema.default("pending"),
  loadedAt: z.string().datetime().nullable().optional(),
  loadingLocation: z.string().trim().max(240).nullable().optional(),
  receivingLocation: z.string().trim().max(240).nullable().optional(),
  shipmentStatus: z.string().trim().max(120).nullable().optional(),
  carrierName: z.string().trim().max(180).nullable().optional(),
  remarks: z.string().trim().max(1000).nullable().optional(),
  loadedContainers: z.coerce.number().min(1).default(1),
  loadedQuantity: z.coerce.number().min(0).default(0),
  reportPayload: z.record(z.string(), z.unknown()).default({})
});

type Session = Awaited<ReturnType<typeof requireErpSession>>;

function randomCode(prefix: string) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

async function resolveEffectiveScope(session: Session, requested: { countryId?: string | null; countryBranchId?: string | null; cityBranchId?: string | null }) {
  if (session.isSuperAdmin) {
    return {
      countryId: requested.countryId ?? null,
      countryBranchId: requested.countryBranchId ?? null,
      cityBranchId: requested.cityBranchId ?? null
    };
  }

  const supabase = createSupabaseAdminClient() as any;

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

function emptyPayload(session: Session, message?: string) {
  return {
    records: [],
    summary: {
      total: 0,
      loaded: 0,
      pending: 0,
      received: 0
    },
    setupRequired: Boolean(message),
    setupMessage: message,
    session: {
      isSuperAdmin: session.isSuperAdmin,
      userId: session.userId,
      fullName: session.fullName,
      roles: session.roles
    }
  };
}

function summarize(rows: any[]) {
  return {
    total: rows.length,
    loaded: rows.filter((row) => row.loading_status === "loaded").length,
    pending: rows.filter((row) => row.loading_status === "pending").length,
    received: rows.filter((row) => row.loading_status === "received").length
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const query = querySchema.parse({
      countryId: request.nextUrl.searchParams.get("countryId") ?? undefined,
      countryBranchId: request.nextUrl.searchParams.get("countryBranchId") ?? undefined,
      cityBranchId: request.nextUrl.searchParams.get("cityBranchId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: query.countryId ?? null,
      countryBranchId: query.countryBranchId ?? null,
      cityBranchId: query.cityBranchId ?? null
    });

    const supabase = createSupabaseAdminClient() as any;
    let recordsQuery = supabase
      .from("purchase_loading_records")
      .select(
        "id, loading_record_no, purchase_order_id, purchase_order_no, container_number, container_type, loading_status, loaded_at, loading_location, receiving_location, shipment_status, carrier_name, remarks, country_id, country_branch_id, city_branch_id, created_at, countries(name, iso2), country_branches(name, code), city_branches(name, code, city_name)"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (query.countryId) recordsQuery = recordsQuery.eq("country_id", query.countryId);
    else if (!session.isSuperAdmin) recordsQuery = recordsQuery.in("country_id", session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]);

    if (query.countryBranchId) recordsQuery = recordsQuery.eq("country_branch_id", query.countryBranchId);
    else if (!session.isSuperAdmin && session.countryBranchIds.length) recordsQuery = recordsQuery.in("country_branch_id", session.countryBranchIds);

    if (query.cityBranchId) recordsQuery = recordsQuery.eq("city_branch_id", query.cityBranchId);
    else if (!session.isSuperAdmin && session.cityBranchIds.length) recordsQuery = recordsQuery.in("city_branch_id", session.cityBranchIds);

    if (query.status) recordsQuery = recordsQuery.eq("loading_status", query.status);
    if (query.q) {
      const term = query.q.replace(/[%_]/g, "");
      recordsQuery = recordsQuery.or(`loading_record_no.ilike.%${term}%,container_number.ilike.%${term}%,purchase_order_no.ilike.%${term}%,loading_location.ilike.%${term}%,receiving_location.ilike.%${term}%`);
    }

    const { data, error } = await recordsQuery.limit(query.limit);
    if (error) {
      const message = error.message || "Purchase loading records are not available.";
      if (message.includes("purchase_loading_records") || message.includes("schema cache")) {
        return apiOk(emptyPayload(session, "Purchase Loading Records database table is not migrated yet."));
      }
      throw error;
    }

    const records = data ?? [];
    return apiOk({ records, summary: summarize(records), setupRequired: false, setupMessage: null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = createSchema.parse(await request.json());
    const effective = await resolveEffectiveScope(session, {
      countryId: body.countryId ?? null,
      countryBranchId: body.countryBranchId ?? null,
      cityBranchId: body.cityBranchId ?? null
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "create",
      countryId: effective.countryId,
      countryBranchId: effective.countryBranchId,
      cityBranchId: effective.cityBranchId
    });

    const payload = {
      country_id: effective.countryId,
      country_branch_id: effective.countryBranchId,
      city_branch_id: effective.cityBranchId,
      purchase_order_id: body.purchaseOrderId ?? null,
      purchase_order_no: body.purchaseOrderNo?.trim() || null,
      loading_record_no: randomCode("PLR"),
      container_number: body.containerNumber,
      container_type: body.containerType ?? null,
      loading_status: body.loadingStatus,
      loaded_at: body.loadedAt ?? null,
      loading_location: body.loadingLocation ?? null,
      receiving_location: body.receivingLocation ?? null,
      shipment_status: body.shipmentStatus ?? null,
      carrier_name: body.carrierName ?? null,
      remarks: body.remarks ?? null,
      report_payload: body.reportPayload ?? {},
      created_by: session.userId
    };

    const supabase = createSupabaseAdminClient() as any;
    const inserted = await requireSupabaseData(
      supabase
        .from("purchase_loading_records")
        .insert(payload)
        .select("id, loading_record_no")
        .single()
    );

    if (body.purchaseOrderId) {
      const { data: po } = await supabase.from("purchase_orders").select("form_data, payment_status, remaining_due, status").eq("id", body.purchaseOrderId).single();
      if (po) {
        const formData = po.form_data || {};
        const workflow = formData.workflow || {};
        
        const totalContainers = Number(formData.form?.containerCount || formData.totals?.totalContainers || 0);
        const totalQuantity = Number(formData.totals?.grandTotalWeight || formData.totals?.grandNetWeight || formData.form?.quantity || 0);

        const currentLoadedContainers = Number(workflow.loadedContainers || 0);
        const currentLoadedQuantity = Number(workflow.loadedQuantity || 0);

        const newLoadedContainers = currentLoadedContainers + body.loadedContainers;
        const newLoadedQuantity = currentLoadedQuantity + body.loadedQuantity;

        const remainingContainers = Math.max(0, totalContainers - newLoadedContainers);
        const remainingQuantity = Math.max(0, totalQuantity - newLoadedQuantity);

        workflow.totalContainers = totalContainers;
        workflow.loadedContainers = newLoadedContainers;
        workflow.remainingContainers = remainingContainers;

        workflow.totalQuantity = totalQuantity;
        workflow.loadedQuantity = newLoadedQuantity;
        workflow.remainingQuantity = remainingQuantity;

        if (remainingContainers > 0) {
           workflow.containerStatus = "Partially Loaded";
        } else {
           workflow.containerStatus = "Fully Loaded";
        }

        formData.workflow = workflow;
        
        const isPaid = po.payment_status === "completed" || po.remaining_due === 0;
        let newStatus = po.status;
        
        // Step 6: Move to Finalized Purchase Orders automatically if paid and fully loaded
        if (isPaid && remainingContainers === 0) {
           newStatus = "completed";
           workflow.lifecycleStatus = "Finalized Purchase Orders";
        }

        await supabase.from("purchase_orders").update({ 
           form_data: formData,
           status: newStatus 
        }).eq("id", body.purchaseOrderId);
      }
    }

    await writeAuditLog({
      action: "create",
      entityTable: "purchase_loading_records",
      entityId: (inserted as any).id ?? null,
      before: null,
      after: payload,
      ipAddress: request.headers.get("x-forwarded-for") ?? null
    });

    return apiCreated({ loadingRecordId: (inserted as any).id, loadingRecordNo: (inserted as any).loading_record_no });
  } catch (error) {
    return handleApiError(error);
  }
}
