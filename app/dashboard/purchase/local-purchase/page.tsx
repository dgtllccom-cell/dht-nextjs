import { getCurrentErpSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { goods, countryBranches, cityBranches, companies } from "@/lib/db/schema";
import { isNull, eq, and } from "drizzle-orm";
import { LocalPurchaseView } from "@/features/purchases/components/local-purchase-view";

export const dynamic = "force-dynamic";

export default async function LocalPurchasePage() {
  const session = await getCurrentErpSession();
  if (!session) {
    redirect("/auth/login");
  }

  // Load essential references statically from the database to populate selection menus
  const goodsList = await db
    .select()
    .from(goods)
    .where(isNull(goods.deletedAt))
    .orderBy(goods.goodsName);

  const branches = await db
    .select()
    .from(countryBranches)
    .where(and(eq(countryBranches.status, "active"), isNull(countryBranches.deletedAt)))
    .orderBy(countryBranches.name);

  const cities = await db
    .select()
    .from(cityBranches)
    .where(and(eq(cityBranches.status, "active"), isNull(cityBranches.deletedAt)))
    .orderBy(cityBranches.name);

  const companyList = await db
    .select()
    .from(companies)
    .where(and(eq(companies.isActive, true), isNull(companies.deletedAt)))
    .orderBy(companies.name);

  return (
    <LocalPurchaseView
      session={session}
      goodsList={goodsList}
      countryBranches={branches}
      cityBranches={cities}
      companies={companyList}
    />
  );
}
