import { NextRequest } from "next/server";
import { apiCreated, handleApiError } from "@/lib/api/response";
import { auditApiAction } from "@/lib/api/audit";
import { requireErpSession } from "@/lib/auth/session";
import { userCreateSchema } from "@/lib/api/erp-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EnterpriseRole } from "@/lib/permissions/enterprise-roles";
import { enterpriseRolePermissions } from "@/lib/permissions/enterprise-roles";
import { issueNextUserCode, normalizeUserCode } from "@/lib/services/user-identity-service";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toAppRole(role: EnterpriseRole) {
  // Database enum uses legacy 'staff' while app uses 'staff_user'.
  if (role === "staff_user") return "staff";
  return role;
}

function assertScopeForRole(role: EnterpriseRole, scope: { countryId: string | null; countryBranchId: string | null; cityBranchId: string | null }) {
  if (role === "super_admin") {
    if (scope.countryId || scope.countryBranchId || scope.cityBranchId) {
      throw new Error("Super Admin user must not be assigned to a country/branch scope.");
    }
    return;
  }

  if (!scope.countryId) {
    throw new Error("countryId is required for this role.");
  }

  if (role === "country_admin") {
    if (scope.countryBranchId || scope.cityBranchId) {
      throw new Error("Country Admin user must not be assigned to a branch scope.");
    }
    return;
  }

  if (role === "main_branch_admin") {
    if (!scope.countryBranchId || scope.cityBranchId) {
      throw new Error("Main Branch Admin requires countryBranchId and must not include cityBranchId.");
    }
    return;
  }

  if (role === "auditor_viewer") {
    // Auditor can be country-level or branch-level.
    return;
  }

  // City/branch-scoped roles.
  if (!scope.countryBranchId || !scope.cityBranchId) {
    throw new Error("countryBranchId and cityBranchId are required for this role.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = userCreateSchema.parse(await request.json());

    // Authorization:
    // - Super Admin can create all users.
    // - Country/Main branch admins can create non-admin users within their own country.
    const isCountryManager = session.roles.some((r) => r === "country_admin" || r === "main_branch_admin");
    if (!session.isSuperAdmin) {
      if (!isCountryManager) throw new Error("Not authorized to create users.");
      if (body.role === "super_admin" || body.role === "country_admin") {
        throw new Error("Only Super Admin can create Super Admin or Country Admin users.");
      }
      if (!body.countryId || !session.countryIds.includes(body.countryId)) {
        throw new Error("Country scope is not allowed.");
      }
    }

    assertScopeForRole(body.role, {
      countryId: body.countryId ?? null,
      countryBranchId: body.countryBranchId ?? null,
      cityBranchId: body.cityBranchId ?? null
    });

    const admin = createSupabaseAdminClient() as any;

    const issuedUserCode = normalizeUserCode(
      body.userCode ?? (await issueNextUserCode(admin, { role: body.role, countryId: body.countryId ?? null }))
    );

    const issuedPermissions = session.isSuperAdmin
      ? body.permissions && Array.isArray(body.permissions) && body.permissions.length
        ? [...new Set(body.permissions.map((p) => p.trim()).filter(Boolean))]
        : [...new Set(enterpriseRolePermissions[body.role] ?? [])]
      : [...new Set(enterpriseRolePermissions[body.role] ?? [])];

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        user_code: issuedUserCode,
        phone: body.phone ?? null,
        id_type: body.idType ?? null,
        id_value: body.idValue ?? null
      }
    });

    if (createError) throw new Error(createError.message);

    const newUserId = created?.user?.id as string | undefined;
    if (!newUserId) throw new Error("Failed to create user.");

    // Ensure profile exists.
    const profilePayload = {
      id: newUserId,
      full_name: body.fullName,
      user_code: issuedUserCode,
      preferred_language_code: body.preferredLanguage,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    // Store effective permissions for this user (role defaults + optional overrides from UI).
    // This enables stable permission snapshots and future customization.
    const { error: permError } = await admin
      .from("user_permission_sets")
      .upsert(
        {
          user_id: newUserId,
          permissions: issuedPermissions,
          source: session.isSuperAdmin && body.permissions?.length ? "manual" : "role_default",
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    if (permError) throw new Error(permError.message);

    const assignmentPayload = {
      user_id: newUserId,
      role: toAppRole(body.role),
      country_id: body.countryId ?? null,
      country_branch_id: body.countryBranchId ?? null,
      city_branch_id: body.cityBranchId ?? null,
      is_active: true,
      created_by: isUuid(session.userId) ? session.userId : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: assignmentError } = await admin.from("user_role_assignments").insert(assignmentPayload);
    if (assignmentError) throw new Error(assignmentError.message);

    await auditApiAction(request, {
      action: "users.create.api",
      entityTable: "profiles",
      entityId: newUserId,
      after: {
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        userCode: issuedUserCode,
        countryId: body.countryId ?? null,
        countryBranchId: body.countryBranchId ?? null,
        cityBranchId: body.cityBranchId ?? null
      }
    });

    return apiCreated({ userId: newUserId, userCode: issuedUserCode });
  } catch (error) {
    return handleApiError(error);
  }
}
