import Link from "next/link";
import { ArrowRight, Banknote, GitBranch, ShieldCheck, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { SalesOverviewChart } from "@/features/dashboard/components/sales-overview-chart";
import { BranchPerformanceChart } from "@/features/dashboard/components/branch-performance-chart";

const recentTransactions = [
  {
    id: "TRX-000124",
    date: "2026-05-21",
    branch: "Pakistan / Karachi",
    type: "Roznamcha",
    amount: "PKR 125,000",
    status: "Posted"
  },
  {
    id: "TRX-000123",
    date: "2026-05-21",
    branch: "UAE / Dubai",
    type: "Sales",
    amount: "AED 18,450",
    status: "Draft"
  },
  {
    id: "TRX-000122",
    date: "2026-05-20",
    branch: "India / Delhi",
    type: "Purchase",
    amount: "INR 92,000",
    status: "Posted"
  }
];

const pendingApprovals = [
  { id: "APR-00041", title: "Reverse voucher TRX-000118", scope: "Pakistan / Karachi", level: "High" },
  { id: "APR-00040", title: "Edit USD rate (2026-05-21)", scope: "UAE / Dubai", level: "Medium" },
  { id: "APR-00039", title: "Delete draft purchase PO-0012", scope: "India / Delhi", level: "Low" }
];

const currencyRates = [
  { pair: "USD/PKR", buy: "279.50", sell: "281.20" },
  { pair: "USD/AED", buy: "3.67", sell: "3.67" },
  { pair: "USD/INR", buy: "83.10", sell: "83.60" },
  { pair: "USD/AFN", buy: "71.40", sell: "72.10" }
];

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "Posted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

export default async function DashboardPage() {
  const lang = await getRequestLanguage();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "nav.dashboard")}</h1>
          <p className="text-sm text-muted-foreground">
            Operational overview, approvals, and performance across countries and branches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/dashboard/new-entry">
              {t(lang, "dash.quick_actions")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/new-entry/branches/super-admin">New Branch</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t(lang, "dash.total_branches")} value="17" icon={GitBranch} />
        <StatCard label={t(lang, "dash.total_users")} value="64" icon={Users} />
        <StatCard label={t(lang, "dash.daily_sales")} value="USD 24,560" icon={TrendingUp} />
        <StatCard label={t(lang, "dash.daily_purchases")} value="USD 18,120" icon={ShoppingCart} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t(lang, "dash.sales_overview")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Weekly sales trend (demo data)</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              Balanced
            </span>
          </CardHeader>
          <CardContent>
            <SalesOverviewChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "dash.pending_approvals")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Requires action (demo)</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((item) => (
              <div key={item.id} className="rounded-md border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.scope}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{item.level}</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t(lang, "dash.recent_transactions")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Latest postings and drafts (demo)</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-start font-semibold">ID</th>
                    <th className="py-2 text-start font-semibold">Date</th>
                    <th className="py-2 text-start font-semibold">Branch</th>
                    <th className="py-2 text-start font-semibold">Type</th>
                    <th className="py-2 text-start font-semibold">Amount</th>
                    <th className="py-2 text-start font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 font-mono text-xs text-foreground">{row.id}</td>
                      <td className="py-3">{row.date}</td>
                      <td className="py-3">{row.branch}</td>
                      <td className="py-3">{row.type}</td>
                      <td className="py-3 font-medium">{row.amount}</td>
                      <td className="py-3">
                        <StatusPill value={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "dash.currency_rates")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">USD reference rates (demo)</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {currencyRates.map((rate) => (
              <div key={rate.pair} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{rate.pair}</p>
                  <p className="text-xs text-muted-foreground">Buy {rate.buy} - Sell {rate.sell}</p>
                </div>
                <Banknote className="h-4 w-4 text-primary" aria-hidden />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t(lang, "dash.branch_performance")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Volume by country (demo data)</p>
          </CardHeader>
          <CardContent>
            <BranchPerformanceChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "dash.profit_loss")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Today (USD, demo)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-semibold">+USD 6,440</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                +4.2%
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sales</p>
                <p className="mt-1 font-semibold">USD 24,560</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Purchases</p>
                <p className="mt-1 font-semibold">USD 18,120</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
