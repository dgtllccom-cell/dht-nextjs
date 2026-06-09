import { requireErpSession } from "@/lib/auth/session";
import ProductMasterClient from "./ui-client";

export default async function ChsProductsPage() {
  const session = await requireErpSession();
  return <ProductMasterClient session={session} />;
}
