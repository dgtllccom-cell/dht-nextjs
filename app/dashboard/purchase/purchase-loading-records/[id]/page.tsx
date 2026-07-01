import { PurchaseLoadingRecordDetailsView } from "@/features/purchases/components/purchase-loading-record-details-view";
import { requireErpSession } from "@/lib/auth/session";

export default async function PurchaseLoadingRecordDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireErpSession();
  const { id } = await params;
  return <PurchaseLoadingRecordDetailsView recordId={id} />;
}
