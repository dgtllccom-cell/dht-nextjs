import { NextRequest } from "next/server";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { auditApiAction } from "@/lib/api/audit";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope, getScopeFromSearchParams } from "@/lib/api/scope-middleware";
import { goodsCreateSchema } from "@/lib/api/erp-validation";
import { goodsService } from "@/lib/services/goods-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const scope = getScopeFromSearchParams(request);

    authorizeApiScope(session, {
      resource: "goods",
      action: "read",
      ...scope
    });

    const query = request.nextUrl.searchParams.get("q");
    const countryId = request.nextUrl.searchParams.get("countryId");
    const limit = request.nextUrl.searchParams.get("limit");

    const result = await goodsService.search({
      query,
      countryId,
      limit: limit ? Number(limit) : 50
    });

    return apiOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const body = goodsCreateSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "goods",
      action: "create",
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId
    });

    const goodsId = await goodsService.create(
      {
        countryId: body.countryId,
        goodsName: body.goodsName,
        productCode: body.productCode ?? null,
        hsCode: body.hsCode ?? null,
        size: body.size ?? null,
        brand: body.brand ?? null,
        originCountryId: body.originCountryId ?? null,
        imageUrl: body.imageUrl ?? null,
        originalLanguage: body.originalLanguage
      },
      session.userId
    );

    await auditApiAction(request, {
      action: "goods.create.api",
      entityTable: "goods",
      entityId: goodsId,
      after: {
        countryId: body.countryId,
        goodsName: body.goodsName,
        productCode: body.productCode ?? null,
        hsCode: body.hsCode ?? null
      }
    });

    return apiCreated({ goodsId });
  } catch (error) {
    return handleApiError(error);
  }
}

