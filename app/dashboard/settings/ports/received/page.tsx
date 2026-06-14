import { requireErpSession } from "@/lib/auth/session";
import { PortMasterClient } from "@/features/ports/components/port-master-client";

export default async function ReceivedPortsPage() {
  await requireErpSession();

  return (
    <PortMasterClient
      type="received"
      title="Received Port Master"
      description="Manage centralized arrival ports, border crossings, and airports for shipments."
      apiEndpoint="/api/erp/ports/received"
    />
  );
}
