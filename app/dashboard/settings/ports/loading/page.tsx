import { requireErpSession } from "@/lib/auth/session";
import { PortMasterClient } from "@/features/ports/components/port-master-client";

export default async function LoadingPortsPage() {
  await requireErpSession();

  return (
    <PortMasterClient
      type="loading"
      title="Loading Port Master"
      description="Manage centralized departure ports, border checkpoints, and airports for shipments."
      apiEndpoint="/api/erp/ports/loading"
    />
  );
}
