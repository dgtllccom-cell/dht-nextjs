import Link from "next/link";
import { ArrowRight, Banknote, Building, Database, GitBranch, Globe, ReceiptText, ShieldCheck, Ship, ShoppingCart, Users, Activity, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CountMap = {
  countries: number;
  branches: number;
  users: number;
  accounts: number;
  ledgers: number;
  roznamcha: number;
  purchases: number;
  sales: number;
  shipping: number;
};

type RecentEntry = {
  id: string;
  voucher_no: string | null;
  entry_date: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
  country_name?: string;
  branch_name?: string;
};

type CountryBranchNode = {
  id: string;
  name: string;
  code: string;
  currency: string;
  mainBranches: Array<{
    id: string;
    name: string;
    code: string;
    cityBranches: Array<{
      id: string;
      name: string;
      cityName: string;
      code: string;
    }>;
  }>;
};

type SuperAdminDashboardData = {
  counts: CountMap;
  purchaseTotal: number;
  salesTotal: number;
  ledgerDebit: number;
  ledgerCredit: number;
  ledgerBalance: number;
  recentRoznamcha: RecentEntry[];
  countryBranches: CountryBranchNode[];
  databaseReady: boolean;
  error: string | null;
};

function money(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value || 0)}`;
}

async function countRows(supabase: ReturnType<typeof createSupabaseAdminClient>, table: string, deleted = true) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (deleted) query = query.is("deleted_at", null);
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function loadSuperAdminData(): Promise<SuperAdminDashboardData> {
  const emptyCounts: CountMap = {
    countries: 0,
    branches: 0,
    users: 0,
    accounts: 0,
    ledgers: 0,
    roznamcha: 0,
    purchases: 0,
    sales: 0,
    shipping: 0
  };

  try {
    const supabase = createSupabaseAdminClient();
    const [
      countriesCount,
      countryBranchesCount,
      cityBranchesCount,
      usersCount,
      accountsCount,
      ledgersCount,
      roznamchaCount,
      purchasesCount,
      salesCount,
      shippingCount,
      purchaseRows,
      salesRows,
      balanceRows,
      recentRows,
      countriesList,
      mainBranchesList,
      cityBranchesList
    ] = await Promise.all([
      countRows(supabase, "countries"),
      countRows(supabase, "country_branches"),
      countRows(supabase, "city_branches"),
      countRows(supabase, "profiles", false),
      countRows(supabase, "enterprise_accounts"),
      countRows(supabase, "ledgers"),
      countRows(supabase, "roznamcha_entries"),
      countRows(supabase, "purchase_orders"),
      countRows(supabase, "sales_orders"),
      countRows(supabase, "shipping_line_records"),
      supabase.from("purchase_orders").select("order_total").is("deleted_at", null),
      supabase.from("sales_orders").select("order_total").is("deleted_at", null),
      supabase.from("ledger_balances").select("debit_total, credit_total, current_balance"),
      supabase
        .from("roznamcha_entries")
        .select(`
          id, voucher_no, entry_date, type, status, created_at,
          countries(name),
          city_branches(name)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("countries").select("id, name, currency_code, is_active").is("deleted_at", null),
      supabase.from("country_branches").select("id, country_id, name, code, local_currency, is_main").is("deleted_at", null),
      supabase.from("city_branches").select("id, country_id, country_branch_id, city_name, name, code, local_currency").is("deleted_at", null)
    ]);

    const purchaseTotal = (purchaseRows.data ?? []).reduce((sum: number, row: any) => sum + Number(row.order_total || 0), 0);
    const salesTotal = (salesRows.data ?? []).reduce((sum: number, row: any) => sum + Number(row.order_total || 0), 0);
    const ledgerDebit = (balanceRows.data ?? []).reduce((sum: number, row: any) => sum + Number(row.debit_total || 0), 0);
    const ledgerCredit = (balanceRows.data ?? []).reduce((sum: number, row: any) => sum + Number(row.credit_total || 0), 0);
    const ledgerBalance = (balanceRows.data ?? []).reduce((sum: number, row: any) => sum + Number(row.current_balance || 0), 0);

    // Build the country branch hierarchy tree
    const countryBranches: CountryBranchNode[] = (countriesList.data ?? []).map((country: any) => {
      const countryMain = (mainBranchesList.data ?? []).filter((b: any) => b.country_id === country.id);
      return {
        id: country.id,
        name: country.name,
        code: country.name.substring(0, 3).toUpperCase(),
        currency: country.currency_code,
        mainBranches: countryMain.map((mb: any) => {
          const mainCityBranches = (cityBranchesList.data ?? []).filter((cb: any) => cb.country_branch_id === mb.id);
          return {
            id: mb.id,
            name: mb.name,
            code: mb.code,
            cityBranches: mainCityBranches.map((cb: any) => ({
              id: cb.id,
              name: cb.name,
              cityName: cb.city_name,
              code: cb.code
            }))
          };
        })
      };
    });

    const recentRoznamcha: RecentEntry[] = (recentRows.data ?? []).map((row: any) => ({
      id: row.id,
      voucher_no: row.voucher_no,
      entry_date: row.entry_date,
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      country_name: row.countries?.name ?? undefined,
      branch_name: row.city_branches?.name ?? undefined
    }));

    return {
      counts: {
        countries: countriesCount,
        branches: countryBranchesCount + cityBranchesCount,
        users: usersCount,
        accounts: accountsCount,
        ledgers: ledgersCount,
        roznamcha: roznamchaCount,
        purchases: purchasesCount,
        sales: salesCount,
        shipping: shippingCount
      },
      purchaseTotal,
      salesTotal,
      ledgerDebit,
      ledgerCredit,
      ledgerBalance,
      recentRoznamcha,
      countryBranches,
      databaseReady: true,
      error: null
    };
  } catch (error) {
    return {
      counts: {
        countries: 0,
        branches: 0,
        users: 0,
        accounts: 0,
        ledgers: 0,
        roznamcha: 0,
        purchases: 0,
        sales: 0,
        shipping: 0
      },
      purchaseTotal: 0,
      salesTotal: 0,
      ledgerDebit: 0,
      ledgerCredit: 0,
      ledgerBalance: 0,
      recentRoznamcha: [],
      countryBranches: [],
      databaseReady: false,
      error: error instanceof Error ? error.message : "Database load failed"
    };
  }
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "posted" || value === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
      : value === "draft"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

export default async function SuperAdminDashboardPage() {
  const lang = await getRequestLanguage();
  const data = await loadSuperAdminData();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-500/20">
              System Wide Scope
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Super Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise overview across all registered nations, branch office nodes, ledger systems, and postings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/new-entry/branches/super-admin">
              <Building className="mr-2 h-4 w-4" /> Setup Country
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/settings">Global Settings</Link>
          </Button>
        </div>
      </section>

      {!data.databaseReady ? (
        <Card className="border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-300">
          <CardContent className="p-4 text-sm font-semibold">
            Database summary could not load: {data.error}
          </CardContent>
        </Card>
      ) : null}

      {/* Numerical Metrics Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Countries" value={String(data.counts.countries)} icon={Globe} />
        <StatCard label="Branches (Main + City)" value={String(data.counts.branches)} icon={GitBranch} />
        <StatCard label="Total Registered Users" value={String(data.counts.users)} icon={Users} />
        <StatCard label="Total Accounts" value={String(data.counts.accounts)} icon={Banknote} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Ledgers" value={String(data.counts.ledgers)} icon={ReceiptText} />
        <StatCard label="Roznamcha Postings" value={String(data.counts.roznamcha)} icon={ShieldCheck} />
        <StatCard label="Purchase Orders" value={String(data.counts.purchases)} icon={ShoppingCart} />
        <StatCard label="Shipping Records" value={String(data.counts.shipping)} icon={Ship} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* Core Countries & Branches Hierarchy Visual */}
        <Card className="xl:col-span-2 overflow-hidden border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Nations & Branch Networks</CardTitle>
                <p className="text-xs text-muted-foreground">Detailed node topology mapping countries to branch locations.</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-500" /> Live Networks
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {data.countryBranches.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.countryBranches.map((country) => (
                  <div key={country.id} className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 transition duration-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-950/20">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 font-bold text-xs text-primary">
                          {country.code}
                        </div>
                        <span className="font-semibold text-sm">{country.name}</span>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {country.currency}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {country.mainBranches.length ? (
                        country.mainBranches.map((mb) => (
                          <div key={mb.id} className="rounded-lg bg-card p-3 border border-slate-200/60 dark:border-slate-800/40">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Building className="h-3 w-3 text-indigo-500" /> {mb.name} <span className="font-mono text-[9px] text-muted-foreground">({mb.code})</span>
                            </p>

                            {mb.cityBranches.length ? (
                              <div className="mt-2 pl-4 border-l border-dashed border-slate-200 space-y-1.5 dark:border-slate-800">
                                {mb.cityBranches.map((cb) => (
                                  <div key={cb.id} className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">{cb.cityName} - {cb.name}</span>
                                    <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[8px] dark:bg-slate-800">{cb.code}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1.5 pl-4 text-[10px] text-muted-foreground italic">No city branches configured</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No main branch configured</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No countries configured in this ERP database yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Global Financial Status Card */}
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold">Global Ledger Standings</CardTitle>
            <p className="text-xs text-muted-foreground">Consolidated financial stats converted to USD.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-3">
              {[
                { label: "Ledger Debit Total", value: money(data.ledgerDebit) },
                { label: "Ledger Credit Total", value: money(data.ledgerCredit) },
                { label: "Ledger Current Balance", value: money(data.ledgerBalance), highlight: true },
                { label: "Purchase Booking Volume", value: money(data.purchaseTotal) },
                { label: "Sales Booking Volume", value: money(data.salesTotal) }
              ].map((item, idx) => (
                <div key={idx} className={`flex flex-col rounded-lg border p-3 ${item.highlight ? "border-indigo-200 bg-indigo-50/40 dark:border-indigo-950/40 dark:bg-indigo-950/10" : "bg-card"}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                  <span className={`mt-1 text-lg font-bold ${item.highlight ? "text-indigo-600 dark:text-indigo-400" : ""}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System-Wide Recent Postings */}
        <Card className="xl:col-span-3 border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold">System-Wide Postings (Recent)</CardTitle>
            <p className="text-xs text-muted-foreground">Latest live Roznamcha entries flowing in from branches worldwide.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-start font-semibold">Voucher / Doc ID</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Date</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Country</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Branch Office</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Entry Type</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRoznamcha.length ? (
                    data.recentRoznamcha.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{row.voucher_no || "N/A"}</p>
                          <span className="font-mono text-[9px] text-muted-foreground">{row.id}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{row.entry_date || "-"}</td>
                        <td className="px-4 py-3 text-xs">{row.country_name || "-"}</td>
                        <td className="px-4 py-3 text-xs font-medium">{row.branch_name || "-"}</td>
                        <td className="px-4 py-3 text-xs capitalize">{row.type || "-"}</td>
                        <td className="px-4 py-3"><StatusPill value={row.status || "draft"} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                        No roznamcha postings found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
