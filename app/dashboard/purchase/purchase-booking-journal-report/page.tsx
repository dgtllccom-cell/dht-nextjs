import { PurchaseOrderWizard } from "@/features/purchases/components/purchase-order-wizard.jsx";
import { requireErpSession } from "@/lib/auth/session";

export default async function PurchaseBookingJournalReportPage() {
  await requireErpSession();
  return <PurchaseOrderWizard />;
}
