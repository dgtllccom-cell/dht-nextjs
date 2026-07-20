export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { db } from "@/lib/db/client";
import { localPurchases } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import postgres from "postgres";

const migrationSql = `
CREATE TABLE IF NOT EXISTS local_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  country_id uuid REFERENCES countries(id),
  country_branch_id uuid REFERENCES country_branches(id),
  city_branch_id uuid REFERENCES city_branches(id),
  goods_id uuid REFERENCES goods(id),
  goods_name text NOT NULL,
  supplier_name text,
  quantity_name text NOT NULL DEFAULT 'Bags',
  quantity_kgs numeric(18, 4) NOT NULL DEFAULT 0,
  total_gross_weight numeric(18, 4) NOT NULL DEFAULT 0,
  empty_kgs numeric(18, 4) NOT NULL DEFAULT 0,
  net_weight numeric(18, 4) NOT NULL DEFAULT 0,
  divide_kgs numeric(18, 4) NOT NULL DEFAULT 0,
  numbers numeric(18, 4) NOT NULL DEFAULT 0,
  rate_type text NOT NULL DEFAULT 'per_kg',
  purchase_rate numeric(18, 4) NOT NULL DEFAULT 0,
  purchase_currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
  local_currency text NOT NULL DEFAULT 'PKR',
  purchase_cost numeric(18, 4) NOT NULL DEFAULT 0,
  final_cost numeric(18, 4) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE local_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'local_purchases' 
    AND policyname = 'local_purchases_all'
  ) THEN
    CREATE POLICY local_purchases_all ON local_purchases FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
`;

async function ensureTableExists() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  const sqlClient = postgres(dbUrl, { max: 1, prepare: false });
  try {
    const res = await sqlClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'local_purchases'
      );
    `;
    if (!res[0]?.exists) {
      await sqlClient.unsafe(migrationSql);
      console.log("local_purchases table created through self-healing migration.");
    }
  } catch (err) {
    console.error("Auto migration check failed:", err);
  } finally {
    await sqlClient.end();
  }
}

const listQuerySchema = z.object({
  countryId: z.string().uuid().optional(),
  countryBranchId: z.string().uuid().optional(),
  cityBranchId: z.string().uuid().optional(),
});

const localPurchaseCreateSchema = z.object({
  companyId: z.string().uuid(),
  countryId: z.string().uuid(),
  countryBranchId: z.string().uuid(),
  cityBranchId: z.string().uuid().nullable().optional(),
  goodsId: z.string().uuid().nullable().optional(),
  goodsName: z.string().min(1),
  supplierName: z.string().nullable().optional(),
  quantityName: z.string().default("Bags"),
  quantityKgs: z.coerce.number().min(0),
  totalGrossWeight: z.coerce.number().min(0),
  emptyKgs: z.coerce.number().min(0),
  netWeight: z.coerce.number().min(0),
  divideKgs: z.coerce.number().min(0),
  numbers: z.coerce.number().min(0),
  rateType: z.string().default("per_kg"),
  purchaseRate: z.coerce.number().min(0),
  purchaseCurrency: z.string().default("USD"),
  exchangeRate: z.coerce.number().min(0),
  localCurrency: z.string().default("PKR"),
  purchaseCost: z.coerce.number().min(0),
  finalCost: z.coerce.number().min(0),
});

export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    const session = await requireErpSession();
    const url = new URL(request.url);

    const params = listQuerySchema.parse({
      countryId: url.searchParams.get("countryId") || undefined,
      countryBranchId: url.searchParams.get("countryBranchId") || undefined,
      cityBranchId: url.searchParams.get("cityBranchId") || undefined,
    });

    authorizeApiScope(session, {
      resource: "purchases",
      action: "read",
      countryId: params.countryId ?? null,
      countryBranchId: params.countryBranchId ?? null,
      cityBranchId: params.cityBranchId ?? null,
    });

    let selectQuery = db
      .select()
      .from(localPurchases)
      .where(isNull(localPurchases.deletedAt))
      .orderBy(desc(localPurchases.createdAt));

    if (params.countryId) {
      selectQuery = selectQuery.where(eq(localPurchases.countryId, params.countryId)) as any;
    }
    if (params.countryBranchId) {
      selectQuery = selectQuery.where(eq(localPurchases.countryBranchId, params.countryBranchId)) as any;
    }
    if (params.cityBranchId) {
      selectQuery = selectQuery.where(eq(localPurchases.cityBranchId, params.cityBranchId)) as any;
    }

    const records = await selectQuery;

    return NextResponse.json({
      ok: true,
      data: { purchases: records }
    });
  } catch (err: any) {
    console.error("[GET /api/erp/purchases/local-purchase] Error:", err);
    return NextResponse.json(
      { ok: false, error: { message: err.message || "Failed to fetch local purchases" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    const session = await requireErpSession();
    const body = await request.json();
    const payload = localPurchaseCreateSchema.parse(body);

    authorizeApiScope(session, {
      resource: "purchases",
      action: "create",
      countryId: payload.countryId,
      countryBranchId: payload.countryBranchId,
      cityBranchId: payload.cityBranchId ?? null,
    });

    const [inserted] = await db
      .insert(localPurchases)
      .values({
        companyId: payload.companyId,
        countryId: payload.countryId,
        countryBranchId: payload.countryBranchId,
        cityBranchId: payload.cityBranchId,
        goodsId: payload.goodsId,
        goodsName: payload.goodsName,
        supplierName: payload.supplierName,
        quantityName: payload.quantityName,
        quantityKgs: String(payload.quantityKgs),
        totalGrossWeight: String(payload.totalGrossWeight),
        emptyKgs: String(payload.emptyKgs),
        netWeight: String(payload.netWeight),
        divideKgs: String(payload.divideKgs),
        numbers: String(payload.numbers),
        rateType: payload.rateType,
        purchaseRate: String(payload.purchaseRate),
        purchaseCurrency: payload.purchaseCurrency,
        exchangeRate: String(payload.exchangeRate),
        localCurrency: payload.localCurrency,
        purchaseCost: String(payload.purchaseCost),
        finalCost: String(payload.finalCost),
        createdBy: session.userId,
      })
      .returning();

    return NextResponse.json({
      ok: true,
      data: { purchase: inserted }
    });
  } catch (err: any) {
    console.error("[POST /api/erp/purchases/local-purchase] Error:", err);
    return NextResponse.json(
      { ok: false, error: { message: err.message || "Failed to save local purchase" } },
      { status: 500 }
    );
  }
}
