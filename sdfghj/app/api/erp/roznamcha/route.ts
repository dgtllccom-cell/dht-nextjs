import { NextRequest } from "next/server";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { roznamchaPostingSchema } from "@/lib/api/erp-validation";
import { authorizeApiScope, getScopeFromSearchParams } from "@/lib/api/scope-middleware";
import { requireErpSession } from "@/lib/auth/session";
import { roznamchaService } from "@/lib/services/roznamcha-service";
import { createApiSupabaseClient } from "@/lib/api/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const scope = getScopeFromSearchParams(request);
    const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500) : 100;

    authorizeApiScope(session, {
      resource: "roznamcha",
      action: "read",
      ...scope
    });

    const supabase = await createApiSupabaseClient();
    let query = supabase
      .from("roznamcha_entries")
      .select(
        // Disambiguate profiles embedding (created_by vs approved_by) by pinning to the FK.
        // We keep the `profiles` key in the response for backward compatibility with the UI types.
        "id, type, country_id, countries(name,currency_code), country_branch_id, country_branches(name,code), city_branch_id, city_branches(name,code), journal_no, voucher_no, entry_date, payment_method_id, reference_no, narration, status, created_by, profiles!roznamcha_entries_created_by_fkey(full_name), approved_by, approved_at, posted_at, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("entry_date", { ascending: false });

    // Enforce scope isolation:
    // - Super Admin can see all (unless query scopes are provided).
    // - Non-super users are always constrained to their assigned scope if the caller doesn't specify it.
    // This prevents accidental "read all" access when scope params are omitted.
    if (scope.countryId) {
      query = query.eq("country_id", scope.countryId);
    } else if (!session.isSuperAdmin) {
      query = query.in(
        "country_id",
        session.countryIds.length ? session.countryIds : ["00000000-0000-0000-0000-000000000000"]
      );
    }

    if (scope.countryBranchId) {
      query = query.eq("country_branch_id", scope.countryBranchId);
    } else if (!session.isSuperAdmin && session.countryBranchIds.length) {
      query = query.in("country_branch_id", session.countryBranchIds);
    }

    if (scope.cityBranchId) {
      query = query.eq("city_branch_id", scope.cityBranchId);
    } else if (!session.isSuperAdmin && session.cityBranchIds.length) {
      query = query.in("city_branch_id", session.cityBranchIds);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return apiOk({
      entries: data ?? [],
      limit
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = roznamchaPostingSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "roznamcha",
      action: body.mode === "post" ? "post" : "create",
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId
    });

    const postingPlan = roznamchaService.createPostingPlan({
      type: body.type,
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId,
      entryDate: body.entryDate,
      journalNo: body.journalNo,
      voucherNo: body.voucherNo,
      narration: body.narration,
      referenceNo: body.referenceNo,
      lines: body.lines
    });

    if (body.mode === "validate") {
      return apiOk({
        mode: body.mode,
        balanced: true,
        postingPlan
      });
    }

    // Use admin client for bootstrap and transaction safety. Permissions are checked above.
    // RPC relies on `auth.uid()`; requires a real Supabase Auth session (not the temp ERP cookie).
    const supabase = await createApiSupabaseClient();
    const { data, error } = await supabase.rpc("post_roznamcha_entry", {
      p_type: body.type,
      p_country_id: body.countryId ?? null,
      p_country_branch_id: body.countryBranchId ?? null,
      p_city_branch_id: body.cityBranchId ?? null,
      p_journal_no: body.journalNo,
      p_voucher_no: body.voucherNo,
      p_entry_date: body.entryDate,
      p_payment_method_id: body.paymentMethodId ?? null,
      p_reference_no: body.referenceNo ?? null,
      p_narration: body.narration ?? null,
      p_lines: body.lines
    });

    if (error) {
      throw new Error(error.message);
    }

    const entryId = data as string;

    return apiCreated({
      mode: body.mode,
      balanced: true,
      entryId,
      postingPlan
    });
  } catch (error) {
    return handleApiError(error);
  }
}
