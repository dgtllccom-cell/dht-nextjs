import type { NextRequest } from "next/server";
import type { ErpSession } from "@/lib/auth/session";
import { requireErpSession } from "@/lib/auth/session";
import { authorize, type PermissionCheck } from "@/lib/permissions/middleware";

export type ApiScope = {
  countryId?: string | null;
  countryBranchId?: string | null;
  cityBranchId?: string | null;
};

export function getScopeFromSearchParams(request: NextRequest): ApiScope {
  return {
    countryId: request.nextUrl.searchParams.get("countryId"),
    countryBranchId: request.nextUrl.searchParams.get("countryBranchId"),
    cityBranchId: request.nextUrl.searchParams.get("cityBranchId")
  };
}

export async function requireAuthorizedSession(check: PermissionCheck): Promise<ErpSession> {
  const session = await requireErpSession();
  authorize(session, check);
  return session;
}

export function authorizeApiScope(
  session: ErpSession,
  input: {
    resource: string;
    action: string;
  } & ApiScope
) {
  authorize(session, {
    resource: input.resource,
    action: input.action,
    countryId: input.countryId,
    countryBranchId: input.countryBranchId,
    cityBranchId: input.cityBranchId
  });
}
