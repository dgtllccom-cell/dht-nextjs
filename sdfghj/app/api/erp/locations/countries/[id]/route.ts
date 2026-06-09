import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { locationsRepository } from "@/lib/repositories/locations-repository";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    if (!session.isSuperAdmin) throw new Error("Only Super Admin can update countries.");

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string | null;
      iso2?: string | null;
      iso3?: string | null;
      currencyCode?: string | null;
      defaultLanguageCode?: string | null;
      isActive?: boolean | null;
    };

    const country = await locationsRepository.updateCountry({
      countryId: id,
      name: body.name,
      iso2: body.iso2,
      iso3: body.iso3,
      currencyCode: body.currencyCode,
      defaultLanguageCode: body.defaultLanguageCode,
      isActive: body.isActive
    });

    return apiOk({ country });
  } catch (error) {
    return handleApiError(error);
  }
}
