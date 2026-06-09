import { NextResponse } from "next/server";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CountryRow = {
  id: string;
  name: string;
  iso2: string | null;
  iso3: string | null;
  currency_code: string;
  is_active: boolean;
};

type CountryBranchRow = {
  id: string;
  country_id: string;
  name: string;
  code: string;
  local_currency: string;
  status: string;
  is_main: boolean;
  address: string | null;
  company_id: string | null;
  owner_name: string | null;
  contacts: unknown;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type CityBranchRow = {
  id: string;
  country_id: string;
  country_branch_id: string;
  city_name: string;
  name: string;
  code: string;
  local_currency: string;
  status: string;
  address: string | null;
  company_id: string | null;
  owner_name: string | null;
  contacts: unknown;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type AssignmentRow = {
  user_id: string;
  country_id: string | null;
  country_branch_id: string | null;
  city_branch_id: string | null;
  is_active: boolean;
  deleted_at: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function resolveAccessibleCountryIds(admin: any, session: Awaited<ReturnType<typeof requireErpSession>>) {
  if (session.isSuperAdmin) return null;

  const ids = new Set<string>(session.countryIds);

  if (session.countryBranchIds.length) {
    const { data } = await admin
      .from("country_branches")
      .select("country_id")
      .in("id", session.countryBranchIds)
      .is("deleted_at", null);
    for (const row of (data ?? []) as Array<{ country_id: string | null }>) {
      if (row.country_id) ids.add(row.country_id);
    }
  }

  if (session.cityBranchIds.length) {
    const { data } = await admin
      .from("city_branches")
      .select("country_id")
      .in("id", session.cityBranchIds)
      .is("deleted_at", null);
    for (const row of (data ?? []) as Array<{ country_id: string | null }>) {
      if (row.country_id) ids.add(row.country_id);
    }
  }

  return [...ids];
}

export async function GET() {
  try {
    const session = await requireErpSession();
    const admin = createSupabaseAdminClient() as any;
    const accessibleCountryIds = await resolveAccessibleCountryIds(admin, session);

    if (accessibleCountryIds && accessibleCountryIds.length === 0) {
      return NextResponse.json(
        {
          summary: {
            superAdminName: session.fullName || session.email || "Super Admin",
            totalCountries: 0,
            totalMainBranches: 0,
            totalCityBranches: 0,
            totalActiveUsers: 0,
            totalActiveBranches: 0
          },
          countries: [],
          generatedAt: new Date().toISOString()
        },
        { status: 200 }
      );
    }

    const countriesQuery = admin
      .from("countries")
      .select("id, name, iso2, iso3, currency_code, is_active")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (accessibleCountryIds) countriesQuery.in("id", accessibleCountryIds);
    const { data: countryData, error: countryError } = await countriesQuery;
    if (countryError) throw new Error(countryError.message);

    const countries = (countryData ?? []) as CountryRow[];
    const countryIds = countries.map((country) => country.id);

    const countryBranchesQuery = admin
      .from("country_branches")
      .select("id, country_id, name, code, local_currency, status, is_main, address, company_id, owner_name, contacts, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (countryIds.length) countryBranchesQuery.in("country_id", countryIds);
    const { data: countryBranchData, error: countryBranchError } = await countryBranchesQuery;
    if (countryBranchError) throw new Error(countryBranchError.message);

    const cityBranchesQuery = admin
      .from("city_branches")
      .select("id, country_id, country_branch_id, city_name, name, code, local_currency, status, address, company_id, owner_name, contacts, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("city_name", { ascending: true });
    if (countryIds.length) cityBranchesQuery.in("country_id", countryIds);
    const { data: cityBranchData, error: cityBranchError } = await cityBranchesQuery;
    if (cityBranchError) throw new Error(cityBranchError.message);

    const assignmentsQuery = admin
      .from("user_role_assignments")
      .select("user_id, country_id, country_branch_id, city_branch_id, is_active, deleted_at")
      .eq("is_active", true)
      .is("deleted_at", null);
    const { data: assignmentData, error: assignmentError } = await assignmentsQuery;
    if (assignmentError) throw new Error(assignmentError.message);

    const countryBranches = (countryBranchData ?? []) as CountryBranchRow[];
    const cityBranches = (cityBranchData ?? []) as CityBranchRow[];
    const assignments = (assignmentData ?? []) as AssignmentRow[];

    const countryBranchByCountry = new Map<string, CountryBranchRow[]>();
    for (const branch of countryBranches) {
      const list = countryBranchByCountry.get(branch.country_id) ?? [];
      list.push(branch);
      countryBranchByCountry.set(branch.country_id, list);
    }

    const cityBranchByCountryBranch = new Map<string, CityBranchRow[]>();
    for (const branch of cityBranches) {
      const list = cityBranchByCountryBranch.get(branch.country_branch_id) ?? [];
      list.push(branch);
      cityBranchByCountryBranch.set(branch.country_branch_id, list);
    }

    const mainBranchIds = countryBranches.map((branch) => branch.id);
    const cityBranchIds = cityBranches.map((branch) => branch.id);

    const allowedCountryIds = accessibleCountryIds ?? countryIds;
    const activeUserIds = new Set<string>();
    for (const assignment of assignments) {
      if (!assignment.user_id || !assignment.is_active || assignment.deleted_at) continue;
      if (assignment.country_id && allowedCountryIds.includes(assignment.country_id)) {
        activeUserIds.add(assignment.user_id);
        continue;
      }
      if (assignment.country_branch_id && mainBranchIds.includes(assignment.country_branch_id)) {
        activeUserIds.add(assignment.user_id);
        continue;
      }
      if (assignment.city_branch_id && cityBranchIds.includes(assignment.city_branch_id)) {
        activeUserIds.add(assignment.user_id);
      }
    }

    const countriesPayload = countries.map((country) => {
      const mainBranches = (countryBranchByCountry.get(country.id) ?? []).map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        localCurrency: branch.local_currency,
        status: branch.status,
        isMain: branch.is_main,
        address: branch.address,
        companyId: branch.company_id,
        ownerName: branch.owner_name,
        contacts: branch.contacts,
        createdAt: branch.created_at,
        updatedAt: branch.updated_at,
        cityBranches: (cityBranchByCountryBranch.get(branch.id) ?? []).map((cityBranch) => ({
          id: cityBranch.id,
          cityName: cityBranch.city_name,
          name: cityBranch.name,
          code: cityBranch.code,
          localCurrency: cityBranch.local_currency,
          status: cityBranch.status,
          address: cityBranch.address,
          companyId: cityBranch.company_id,
          ownerName: cityBranch.owner_name,
          contacts: cityBranch.contacts,
          createdAt: cityBranch.created_at,
          updatedAt: cityBranch.updated_at
        }))
      }));

      const totalCityBranches = mainBranches.reduce((sum, branch) => sum + branch.cityBranches.length, 0);
      const countryCode = (country.iso2 || country.iso3 || country.currency_code || "").toUpperCase();

      return {
        id: country.id,
        name: country.name,
        code: countryCode || country.currency_code,
        currency: country.currency_code,
        status: country.is_active ? "active" : "inactive",
        totalMainBranches: mainBranches.length,
        totalCityBranches,
        totalActiveMainBranches: mainBranches.filter((branch) => branch.status === "active").length,
        totalActiveCityBranches: mainBranches.reduce(
          (sum, branch) => sum + branch.cityBranches.filter((cityBranch) => cityBranch.status === "active").length,
          0
        ),
        mainBranches
      };
    });

    return NextResponse.json(
      {
        summary: {
          superAdminName: session.fullName || session.email || "Super Admin",
          totalCountries: countriesPayload.length,
          totalMainBranches: countryBranches.length,
          totalCityBranches: cityBranches.length,
          totalActiveUsers: activeUserIds.size,
          totalActiveBranches:
            countryBranches.filter((branch) => branch.status === "active").length +
            cityBranches.filter((branch) => branch.status === "active").length
        },
        countries: countriesPayload,
        generatedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
