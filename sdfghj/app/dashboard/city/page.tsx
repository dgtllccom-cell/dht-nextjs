import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CityDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">City / Branch Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Daily transactions, roznamcha activity, cash/bank position, and branch reports (foundation view).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We will connect this dashboard to branch-scoped postings and ledger balances.
        </CardContent>
      </Card>
    </div>
  );
}

