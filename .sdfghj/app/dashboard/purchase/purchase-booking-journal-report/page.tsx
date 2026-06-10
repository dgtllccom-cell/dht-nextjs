import { PurchaseBookingJournalReportView } from "@/features/purchases/components/purchase-booking-journal-report-view";
import { requireErpSession } from "@/lib/auth/session";

export default async function PurchaseBookingJournalReportPage() {
  await requireErpSession();
  return <PurchaseBookingJournalReportView />;
}
