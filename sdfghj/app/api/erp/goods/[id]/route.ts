import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { auditApiAction } from "@/lib/api/audit";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope, getScopeFromSearchParams } from "@/lib/api/scope-middleware";
import { goodsUpdateSchema } from "@/lib/api/erp-validation";
import { goodsService } from "@/lib/services/goods-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const scope = getScopeFromSearchParams(request);
    const { id } = await params;

    authorizeApiScope(session, {
      resource: "goods",
      action: "read",
      ...scope
    });

    const data = await goodsService.getById(id);
    return apiOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;
    const body = goodsUpdateSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "goods",
      action: "update",
      countryId: body.countryId,
      countryBranchId: body.countryBranchId,
      cityBranchId: body.cityBranchId
    });

    await goodsService.update(
      id,
      {
        goodsName: body.goodsName,
        productCode: body.productCode ?? null,
        hsCode: body.hsCode ?? null,
        size: body.size ?? null,
        brand: body.brand ?? null,
        originCountryId: body.originCountryId ?? null,
        imageUrl: body.imageUrl ?? null,
        originalLanguage: body.originalLanguage ?? "en"
      },
      session.userId
    );

    await auditApiAction(request, {
      action: "goods.update.api",
      entityTable: "goods",
      entityId: id,
      after: body
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const { id } = await context.params;

    authorizeApiScope(session, {
      resource: "goods",
      action: "delete",
      countryId: request.nextUrl.searchParams.get("countryId")
    });

    await goodsService.softDelete(id);

    await auditApiAction(request, {
      action: "goods.delete.api",
      entityTable: "goods",
      entityId: id
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
