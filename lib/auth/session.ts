import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type EnterpriseRole, enterpriseRoles } from "@/lib/permissions/enterprise-roles";
import { enterpriseRolePermissions } from "@/lib/permissions/enterprise-roles";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readTempSession } from "@/lib/auth/temp-session";

export type RoleAssignmentScope = {
  role: EnterpriseRole;
  countryId: string | null;
  countryBranchId: string | null;
  cityBranchId: string | null;
};

export type ErpSession = {
  userId: string;
  email: string | null;
  fullName: string | null;
  preferredLanguage: SupportedLanguage;
  roles: EnterpriseRole[];
  permissions: string[];
  assignments: RoleAssignmentScope[];
  countryIds: string[];
  countryBranchIds: string[];
  cityBranchIds: string[];
  isSuperAdmin: boolean;
};

type ProfileRow = {
  full_name: string | null;
  preferred_language_code: SupportedLanguage | null;
};

type PermissionSetRow = {
  permissions: string[] | null;
};

type AssignmentRow = {
  role: string;
  country_id: string | null;
  country_branch_id: string | null;
  city_branch_id: string | null;
};

type LooseQueryBuilder = {
  select(columns: string): LooseQueryBuilder;
  eq(column: string, value: string | boolean): LooseQueryBuilder;
  is(column: string, value: null): Promise<{ data: AssignmentRow[] | null; error: { message: string } | null }>;
  maybeSingle(): Promise<{ data: ProfileRow | null }>;
};

export class ErpAuthError extends Error {
  status = 401;

  constructor(message = "Authentication is required") {
    super(message);
  }
}

function normalizeRole(role: string): EnterpriseRole | null {
  if (role === "branch_admin") return "city_branch_admin";
  if (role === "staff") return "staff_user";
  return enterpriseRoles.includes(role as EnterpriseRole) ? (role as EnterpriseRole) : null;
}

function uniqueStrings(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function resolveHierarchyScopes(
  supabase: any,
  initialCountryIds: string[],
  initialCountryBranchIds: string[],
  initialCityBranchIds: string[],
  isSuperAdmin: boolean
): Promise<{ countryIds: string[]; countryBranchIds: string[]; cityBranchIds: string[] }> {
  if (isSuperAdmin || !supabase) {
    return {
      countryIds: initialCountryIds,
      countryBranchIds: initialCountryBranchIds,
      cityBranchIds: initialCityBranchIds
    };
  }

  let countryIds = [...initialCountryIds];
  let countryBranchIds = [...initialCountryBranchIds];
  let cityBranchIds = [...initialCityBranchIds];

  // 1. From city branches upward -> get parent main branch and country IDs
  if (cityBranchIds.length > 0) {
    try {
      const { data: cbs } = await supabase
        .from("city_branches")
        .select("country_id, country_branch_id")
        .in("id", cityBranchIds)
        .is("deleted_at", null);
      if (cbs) {
        for (const row of cbs) {
          if (row.country_id) countryIds.push(row.country_id);
          if (row.country_branch_id) countryBranchIds.push(row.country_branch_id);
        }
      }
    } catch (e) {
      console.error("Error resolving hierarchy from city branches:", e);
    }
  }

  countryIds = uniqueStrings(countryIds);
  countryBranchIds = uniqueStrings(countryBranchIds);

  // 2. From country branches upward -> get parent country IDs; downward -> get child city branch IDs
  if (countryBranchIds.length > 0) {
    try {
      const [mainRes, childCityRes] = await Promise.all([
        supabase
          .from("country_branches")
          .select("country_id")
          .in("id", countryBranchIds)
          .is("deleted_at", null),
        supabase
          .from("city_branches")
          .select("id, country_id")
          .in("country_branch_id", countryBranchIds)
          .is("deleted_at", null)
      ]);
      if (mainRes?.data) {
        for (const row of mainRes.data) {
          if (row.country_id) countryIds.push(row.country_id);
        }
      }
      if (childCityRes?.data) {
        for (const row of childCityRes.data) {
          if (row.id) cityBranchIds.push(row.id);
          if (row.country_id) countryIds.push(row.country_id);
        }
      }
    } catch (e) {
      console.error("Error resolving hierarchy from country branches:", e);
    }
  }

  countryIds = uniqueStrings(countryIds);
  cityBranchIds = uniqueStrings(cityBranchIds);

  // 3. From country IDs downward -> get all main branches and city branches in assigned countries
  if (initialCountryIds.length > 0) {
    try {
      const [countryBranchesRes, cityBranchesRes] = await Promise.all([
        supabase
          .from("country_branches")
          .select("id")
          .in("country_id", initialCountryIds)
          .is("deleted_at", null),
        supabase
          .from("city_branches")
          .select("id")
          .in("country_id", initialCountryIds)
          .is("deleted_at", null)
      ]);
      if (countryBranchesRes?.data) {
        for (const row of countryBranchesRes.data) {
          if (row.id) countryBranchIds.push(row.id);
        }
      }
      if (cityBranchesRes?.data) {
        for (const row of cityBranchesRes.data) {
          if (row.id) cityBranchIds.push(row.id);
        }
      }
    } catch (e) {
      console.error("Error resolving hierarchy from country IDs:", e);
    }
  }

  return {
    countryIds: uniqueStrings(countryIds),
    countryBranchIds: uniqueStrings(countryBranchIds),
    cityBranchIds: uniqueStrings(cityBranchIds)
  };
}

export async function getCurrentErpSession(): Promise<ErpSession | null> {
  // Temporary local session (for initial Super Admin bootstrapping)
  const temp = await readTempSession();
  if (temp) {
    let resolvedUserId = temp.userId;
    let adminSupabase: any = null;
    if (isSupabaseConfigured()) {
      try {
        adminSupabase = createSupabaseAdminClient();
        if (temp.userId.startsWith("00000000-")) {
          const { data: firstProfile } = await adminSupabase
            .from("profiles")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (firstProfile?.id) {
            resolvedUserId = firstProfile.id;
          }
        }
      } catch (e) {
        console.error("Failed to resolve profile ID for temp session:", e);
      }
    }

    const perms = [...new Set(temp.roles.flatMap((role) => enterpriseRolePermissions[role] ?? []))];
    const initialCountryIds = uniqueStrings(temp.assignments.map((assignment) => assignment.countryId));
    const initialCountryBranchIds = uniqueStrings(temp.assignments.map((assignment) => assignment.countryBranchId));
    const initialCityBranchIds = uniqueStrings(temp.assignments.map((assignment) => assignment.cityBranchId));
    const isSuperAdmin = temp.roles.includes("super_admin");

    const resolvedScopes = await resolveHierarchyScopes(
      adminSupabase,
      initialCountryIds,
      initialCountryBranchIds,
      initialCityBranchIds,
      isSuperAdmin
    );

    return {
      userId: resolvedUserId,
      email: temp.email,
      fullName: temp.fullName,
      preferredLanguage: temp.preferredLanguage,
      roles: temp.roles,
      permissions: perms,
      assignments: temp.assignments,
      countryIds: resolvedScopes.countryIds,
      countryBranchIds: resolvedScopes.countryBranchIds,
      cityBranchIds: resolvedScopes.cityBranchIds,
      isSuperAdmin
    };
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const db = supabase as unknown as { from(table: string): LooseQueryBuilder };

  const profileQuery = db.from("profiles").select("full_name, preferred_language_code").eq("id", user.id);
  const profileResult = await profileQuery.maybeSingle();

  const assignmentsQuery = db
    .from("user_role_assignments")
    .select("role, country_id, country_branch_id, city_branch_id")
    .eq("user_id", user.id)
    .eq("is_active", true);
  const assignmentsResult = await assignmentsQuery.is("deleted_at", null);

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignments = (assignmentsResult.data ?? [])
    .map((assignment) => {
      const role = normalizeRole(assignment.role);
      if (!role) return null;

      return {
        role,
        countryId: assignment.country_id,
        countryBranchId: assignment.country_branch_id,
        cityBranchId: assignment.city_branch_id
      };
    })
    .filter((assignment): assignment is RoleAssignmentScope => Boolean(assignment));

  const roles = [...new Set(assignments.map((assignment) => assignment.role))];

  // Load explicit permission set if available; else fallback to role-template permissions.
  let permissions: string[] = [];
  try {
    const permQuery = db.from("user_permission_sets").select("permissions").eq("user_id", user.id);
    const permResult = (await (permQuery as any).maybeSingle()) as { data: PermissionSetRow | null };
    const explicit = permResult?.data?.permissions ?? null;
    permissions = explicit && Array.isArray(explicit) ? explicit.filter((p) => typeof p === "string" && p.length > 0) : [];
  } catch {
    permissions = [];
  }

  if (!permissions.length) {
    permissions = [...new Set(roles.flatMap((role) => enterpriseRolePermissions[role] ?? []))];
  }

  if (roles.includes("super_admin") && !permissions.includes("*:*")) {
    permissions = ["*:*", ...permissions];
  }

  const initialCountryIds = uniqueStrings(assignments.map((assignment) => assignment.countryId));
  const initialCountryBranchIds = uniqueStrings(assignments.map((assignment) => assignment.countryBranchId));
  const initialCityBranchIds = uniqueStrings(assignments.map((assignment) => assignment.cityBranchId));
  const isSuperAdmin = roles.includes("super_admin");

  const resolvedScopes = await resolveHierarchyScopes(
    supabase,
    initialCountryIds,
    initialCountryBranchIds,
    initialCityBranchIds,
    isSuperAdmin
  );

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profileResult.data?.full_name ?? null,
    preferredLanguage: profileResult.data?.preferred_language_code ?? "en",
    roles,
    permissions,
    assignments,
    countryIds: resolvedScopes.countryIds,
    countryBranchIds: resolvedScopes.countryBranchIds,
    cityBranchIds: resolvedScopes.cityBranchIds,
    isSuperAdmin
  };
}

export async function requireErpSession() {
  const session = await getCurrentErpSession();

  if (!session) {
    throw new ErpAuthError();
  }

  return session;
}
