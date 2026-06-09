import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { approvalDecisionSchema, uuidSchema } from "@/lib/api/erp-validation";
import { auditApiAction } from "@/lib/api/audit";
import { createApiSupabaseClient } from "@/lib/api/supabase";
import { SupabaseApprovalsRepository } from "@/lib/api/approval-repository";
import { requireErpSession } from "@/lib/auth/session";
import { ApprovalService } from "@/lib/services/approval-service";

type ApprovalRow = {
  id: string;
  request_no: string;
  status: string;
  target_table: string;
  target_id: string;
  country_id: string | null;
  city_branch_id: string | null;
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;
    const approvalRequestId = uuidSchema.parse(id);
    const body = approvalDecisionSchema.parse(await request.json());

    const supabase = await createApiSupabaseClient();
    const currentResult = await supabase
      .from("approval_requests")
      .select("id, request_no, status, target_table, target_id, country_id, city_branch_id")
      .eq("id", approvalRequestId)
      .single();

    if (currentResult.error) {
      throw new Error(currentResult.error.message);
    }

    const current = currentResult.data as ApprovalRow;
    const service = new ApprovalService(new SupabaseApprovalsRepository());

    if (body.action === "unlock") {
      await service.unlockRecord(session, {
        recordTable: body.recordTable ?? current.target_table,
        recordId: body.recordId ?? current.target_id
      });

      await auditApiAction(request, {
        action: "approval.unlock",
        entityTable: "approval_requests",
        entityId: approvalRequestId,
        before: current,
        after: {
          recordTable: body.recordTable ?? current.target_table,
          recordId: body.recordId ?? current.target_id,
          note: body.note ?? null
        }
      });

      return apiOk({
        approvalRequestId,
        action: body.action,
        status: current.status,
        unlocked: true
      });
    }

    const statusByAction = {
      approve: "approved",
      reject: "rejected",
      cancel: "cancelled"
    } as const;

    const nextStatus = statusByAction[body.action];

    await service.decide(session, {
      approvalRequestId,
      status: nextStatus,
      countryId: body.countryId ?? current.country_id,
      cityBranchId: body.cityBranchId ?? current.city_branch_id,
      note: body.note
    });

    if (nextStatus === "rejected" || nextStatus === "cancelled") {
      await service.unlockRecord(session, {
        recordTable: current.target_table,
        recordId: current.target_id
      });
    }

    await auditApiAction(request, {
      action: `approval.${body.action}`,
      entityTable: "approval_requests",
      entityId: approvalRequestId,
      before: current,
      after: {
        status: nextStatus,
        note: body.note ?? null
      }
    });

    return apiOk({
      approvalRequestId,
      requestNo: current.request_no,
      action: body.action,
      status: nextStatus
    });
  } catch (error) {
    return handleApiError(error);
  }
}
