import { PurchaseLoadingRecordsView } from "@/features/purchases/components/purchase-loading-records-view";
import { requireErpSession } from "@/lib/auth/session";

export default async function PurchaseLoadingRecordsPage() {
  await requireErpSession();
  return <PurchaseLoadingRecordsView />;
}
