import { NextRequest } from "next/server";
import { apiCreated, handleApiError } from "@/lib/api/response";
import { auditApiAction } from "@/lib/api/audit";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { goodsVariationCreateSchema } from "@/lib/api/erp-validation";
import { goodsService } from "@/lib/services/goods-service";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();
    
    // Extend schema to validate goodsId along with size and brand
    const payloadSchema = goodsVariationCreateSchema.extend({
      goodsId: z.string().uuid()
    });
    const body = payloadSchema.parse(await request.json());

    authorizeApiScope(session, {
      resource: "goods",
      action: "update"
    });

    const variationId = await goodsService.createVariation(
      {
        goodsId: body.goodsId,
        size: body.size,
        brand: body.brand
      },
      session.user?.id
    );

    await auditApiAction(request, {
      action: "goods_variations.create.api",
      entityTable: "goods_variations",
      entityId: variationId,
      after: {
        goodsId: body.goodsId,
        size: body.size,
        brand: body.brand
      }
    });

    return apiCreated({ variationId });
  } catch (error) {
    return handleApiError(error);
  }
}
