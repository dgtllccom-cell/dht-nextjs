import { NextRequest } from "next/server";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { locationsRepository } from "@/lib/repositories/locations-repository";

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const q = request.nextUrl.searchParams.get("q");
    let countries = await locationsRepository.listCountries({ query: q, limit: 500 });

    // Scope: super admin can see all; others see only assigned countries.
    if (!session.isSuperAdmin) {
      const allowed = new Set(session.countryIds);
      countries = countries.filter((c) => allowed.has(c.id));
    }
    return apiOk({ countries });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    // Only Super Admin can add countries (enterprise policy).
    if (!session.isSuperAdmin) {
      throw new Error("Only Super Admin can create countries.");
    }

    const body = (await request.json()) as {
      name: string;
      iso2?: string | null;
      iso3?: string | null;
      currencyCode: string;
      defaultLanguageCode?: string | null;
    };

    if (!body.name?.trim() || !body.currencyCode?.trim()) {
      throw new Error("name and currencyCode are required");
    }

    const country = await locationsRepository.createCountry({
      name: body.name,
      iso2: body.iso2 ?? null,
      iso3: body.iso3 ?? null,
      currencyCode: body.currencyCode,
      defaultLanguageCode: body.defaultLanguageCode ?? null
    });

    return apiCreated({ country });
  } catch (error) {
    return handleApiError(error);
  }
}
