import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Global visibility across countries, branches, users, approvals, ledgers, and reports (foundation view).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Step</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We will connect real totals from Supabase (countries, branches, users, ledger balances, approvals) in Phase 2.
        </CardContent>
      </Card>
    </div>
  );
}

