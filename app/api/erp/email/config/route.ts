import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { resolveCountryEmailConfig } from "@/lib/email/country-email-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  countryId: z.string().uuid().nullable().optional(),
  countryBranchId: z.string().uuid().nullable().optional(),
  cityBranchId: z.string().uuid().nullable().optional()
});

function firstScope<T>(values: T[]) {
  return values.length ? values[0] : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const params = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const admin = createSupabaseAdminClient();

    const scope = {
      countryId: params.countryId ?? firstScope(session.countryIds),
      countryBranchId: params.countryBranchId ?? firstScope(session.countryBranchIds),
      cityBranchId: params.cityBranchId ?? firstScope(session.cityBranchIds)
    };

    const cityBranchRes = scope.cityBranchId
      ? await admin.from("city_branches").select("id, name, code, city_name, country_id, country_branch_id, email").eq("id", scope.cityBranchId).maybeSingle()
      : { data: null, error: null };
    if (cityBranchRes.error) throw new Error(cityBranchRes.error.message);
    const cityBranch = cityBranchRes.data as any;

    const countryBranchId = scope.countryBranchId ?? cityBranch?.country_branch_id ?? null;
    const countryBranchRes = countryBranchId
      ? await admin.from("country_branches").select("id, name, code, country_id, email").eq("id", countryBranchId).maybeSingle()
      : { data: null, error: null };
    if (countryBranchRes.error) throw new Error(countryBranchRes.error.message);
    const countryBranch = countryBranchRes.data as any;

    const countryId = scope.countryId ?? cityBranch?.country_id ?? countryBranch?.country_id ?? null;
    const countryRes = countryId
      ? await admin.from("countries").select("id, name, iso2, official_email, admin_email, email_domain, email_server_settings").eq("id", countryId).maybeSingle()
      : { data: null, error: null };
    if (countryRes.error) throw new Error(countryRes.error.message);

    const countryData = (countryRes as { data: any }).data;
    const config = resolveCountryEmailConfig(countryData, {
      mainBranchName: countryBranch?.name ?? null,
      mainBranchCode: countryBranch?.code ?? null,
      cityBranchName: cityBranch?.name ?? null,
      cityBranchCode: cityBranch?.code ?? null,
      cityName: cityBranch?.city_name ?? null
    });

    return apiOk({
      config,
      scope: {
        countryId: countryData?.id ?? countryId,
        countryBranchId: countryBranch?.id ?? countryBranchId,
        cityBranchId: cityBranch?.id ?? scope.cityBranchId
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}


