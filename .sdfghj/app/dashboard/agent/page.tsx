import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Agent task queue, shipments/clearing status, and assigned transactions (foundation view).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Step</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Agent workflows will be connected to Shipping and Clearing modules later.
        </CardContent>
      </Card>
    </div>
  );
}

