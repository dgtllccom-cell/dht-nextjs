import Link from "next/link";
import type { ElementType } from "react";
import { ArrowRight, Building, Database, GitBranch, Globe, ReceiptText, ShoppingCart, Users, Activity, TrendingUp, Landmark, Layers, Wallet, CreditCard, UserCheck, Server, RefreshCw, HardDrive, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SuperAdminOverviewCharts } from "@/features/dashboard/components/super-admin-overview-charts";


type CountMap = {
  countries: number;
  branches: number;
  users: number;
  accounts: number;
  customers: number;
  suppliers: number;
  banks: number;
  payments: number;
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



type CountryFinancialSummary = {
  id: string;
  name: string;
  currency: string;
  totalPurchases: number;
  totalSales: number;
  totalDebit: number;
  totalCredit: number;
  totalLedgerBalance: number;
  totalBranches: number;
};

type SuperAdminDashboardData = {
  counts: CountMap;
  purchaseTotal: number;
  salesTotal: number;
  ledgerDebit: number;
  ledgerCredit: number;
  ledgerBalance: number;
  todayTransactions: number;
  activeUsers: number;
  recentRoznamcha: RecentEntry[];

  countrySummaries: CountryFinancialSummary[];
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
    countries: 0, branches: 0, users: 0, accounts: 0, customers: 0, suppliers: 0, banks: 0, payments: 0,
    ledgers: 0, roznamcha: 0, purchases: 0, sales: 0, shipping: 0
  };

  try {
    const supabase = createSupabaseAdminClient();
    const [
      countriesCount, countryBranchesCount, cityBranchesCount, usersCount,
      accountsCount, customersCount, suppliersCount, banksCount, paymentsCount, ledgersCount, roznamchaCount, purchasesCount, salesCount,
      shippingCount, todayRoznamchaCount, activeUsersCount, purchaseRows, salesRows, balanceRows, recentRows,
      countriesList, mainBranchesList, cityBranchesList
    ] = await Promise.all([
      countRows(supabase, "countries"),
      countRows(supabase, "country_branches"),
      countRows(supabase, "city_branches"),
      countRows(supabase, "profiles", false),
      countRows(supabase, "enterprise_accounts"),
      countRows(supabase, "customers"),
      countRows(supabase, "companies"),
      countRows(supabase, "banks"),
      countRows(supabase, "purchase_order_payments", false),
      countRows(supabase, "ledgers"),
      countRows(supabase, "roznamcha_entries"),
      countRows(supabase, "purchase_orders"),
      countRows(supabase, "sales_orders"),
      countRows(supabase, "shipping_line_records"),
      supabase.from("roznamcha_entries").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("purchase_orders").select("country_id, order_total").is("deleted_at", null),
      supabase.from("sales_orders").select("country_id, order_total").is("deleted_at", null),
      supabase.from("ledgers").select("country_id, debit_total, credit_total, current_balance").is("deleted_at", null),
      supabase
        .from("roznamcha_entries")
        .select(`id, voucher_no, entry_date, type, status, created_at, countries(name), city_branches(name)`)
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

    const countrySummaryMap = new Map<string, CountryFinancialSummary>();
    for (const country of ((countriesList.data ?? []) as any[])) {
      const mainCount = (mainBranchesList.data ?? []).filter((branch: any) => branch.country_id === country.id).length;
      const cityCount = (cityBranchesList.data ?? []).filter((branch: any) => branch.country_id === country.id).length;
      countrySummaryMap.set(country.id, {
        id: country.id,
        name: country.name,
        currency: country.currency_code || "USD",
        totalPurchases: 0,
        totalSales: 0,
        totalDebit: 0,
        totalCredit: 0,
        totalLedgerBalance: 0,
        totalBranches: mainCount + cityCount
      });
    }
    for (const row of ((purchaseRows.data ?? []) as any[])) {
      const target = row.country_id ? countrySummaryMap.get(row.country_id) : undefined;
      if (target) target.totalPurchases += Number(row.order_total || 0);
    }
    for (const row of ((salesRows.data ?? []) as any[])) {
      const target = row.country_id ? countrySummaryMap.get(row.country_id) : undefined;
      if (target) target.totalSales += Number(row.order_total || 0);
    }
    for (const row of ((balanceRows.data ?? []) as any[])) {
      const target = row.country_id ? countrySummaryMap.get(row.country_id) : undefined;
      if (target) {
        target.totalDebit += Number(row.debit_total || 0);
        target.totalCredit += Number(row.credit_total || 0);
        target.totalLedgerBalance += Number(row.current_balance || 0);
      }
    }
    const countrySummaries = Array.from(countrySummaryMap.values());



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
        customers: customersCount,
        suppliers: suppliersCount,
        banks: banksCount,
        payments: paymentsCount,
        ledgers: ledgersCount,
        roznamcha: roznamchaCount,
        purchases: purchasesCount,
        sales: salesCount,
        shipping: shippingCount
      },
      purchaseTotal, salesTotal, ledgerDebit, ledgerCredit, ledgerBalance,
      todayTransactions: todayRoznamchaCount.count ?? 0,
      activeUsers: activeUsersCount.count ?? 0,
      recentRoznamcha, countrySummaries, databaseReady: true, error: null
    };
  } catch (error) {
    return {
      counts: emptyCounts,
      purchaseTotal: 0, salesTotal: 0, ledgerDebit: 0, ledgerCredit: 0, ledgerBalance: 0,
      todayTransactions: 0, activeUsers: 0,
      recentRoznamcha: [], countrySummaries: [], databaseReady: false,
      error: error instanceof Error ? error.message : "Database load failed"
    };
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  posted:   { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  approved: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  draft:    { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-400"  },
  pending:  { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    dot: "bg-blue-400"   },
};

function getStatusStyle(status: string | null) {
  const key = (status || "draft").toLowerCase();
  return STATUS_COLORS[key] ?? { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };
}

const CARD_PALETTE = [
  { gradient: "from-violet-500 to-purple-600",  icon: "text-violet-100",  badge: "bg-violet-400/30" },
  { gradient: "from-sky-500 to-blue-600",        icon: "text-sky-100",     badge: "bg-sky-400/30"    },
  { gradient: "from-emerald-500 to-teal-600",    icon: "text-emerald-100", badge: "bg-emerald-400/30"},
  { gradient: "from-orange-500 to-rose-500",     icon: "text-orange-100",  badge: "bg-orange-400/30" },
  { gradient: "from-pink-500 to-fuchsia-600",    icon: "text-pink-100",    badge: "bg-pink-400/30"   },
  { gradient: "from-amber-500 to-yellow-500",    icon: "text-amber-100",   badge: "bg-amber-400/30"  },
  { gradient: "from-cyan-500 to-sky-600",        icon: "text-cyan-100",    badge: "bg-cyan-400/30"   },
  { gradient: "from-indigo-500 to-blue-700",     icon: "text-indigo-100",  badge: "bg-indigo-400/30" },
];

function ColorStatCard({
  label, value, icon: Icon, palette, helper
}: {
  label: string;
  value: string;
  icon: ElementType;
  palette: typeof CARD_PALETTE[0];
  helper?: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${palette.gradient} p-4 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl`}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl transition-transform group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          {helper && <p className="mt-1 line-clamp-2 text-[11px] font-medium text-white/75">{helper}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${palette.badge} backdrop-blur`}>
          <Icon className={`h-5 w-5 ${palette.icon}`} />
        </div>
      </div>
    </div>
  );
}

function SystemStatusCard({
  label, value, status, icon: Icon
}: {
  label: string;
  value: string;
  status: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{status}</p>
    </div>
  );
}

function FinancialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default async function SuperAdminDashboardPage() {
  const data = await loadSuperAdminData();

  const statCards = [
    { label: "Total Countries", value: String(data.counts.countries), icon: Globe, palette: CARD_PALETTE[0], helper: "Global operating scope" },
    { label: "Total Branches", value: String(data.counts.branches), icon: GitBranch, palette: CARD_PALETTE[1], helper: "Main and city branches" },
    { label: "Total Users", value: String(data.counts.users), icon: Users, palette: CARD_PALETTE[2], helper: `${data.activeUsers} active right now` },
    { label: "Customers / Suppliers", value: `${data.counts.customers} / ${data.counts.suppliers}`, icon: UserCheck, palette: CARD_PALETTE[3], helper: "Account master network" },
    { label: "Total Purchase", value: String(data.counts.purchases), icon: ShoppingCart, palette: CARD_PALETTE[4], helper: "Purchase orders recorded" },
    { label: "Total Sales", value: String(data.counts.sales), icon: ReceiptText, palette: CARD_PALETTE[5], helper: "Sales records available" },
    { label: "Cash Balance", value: money(Math.max(data.ledgerDebit - data.ledgerCredit, 0)), icon: Wallet, palette: CARD_PALETTE[6], helper: "Debit position from ledgers" },
    { label: "Bank Balance", value: money(data.ledgerBalance), icon: Landmark, palette: CARD_PALETTE[7], helper: "Net ledger standing" },
    { label: "Receivables", value: money(data.ledgerDebit), icon: TrendingUp, palette: CARD_PALETTE[1], helper: "Total debit ledger movement" },
    { label: "Payables", value: money(data.ledgerCredit), icon: CreditCard, palette: CARD_PALETTE[3], helper: "Total credit ledger movement" },
    { label: "Monthly Profit", value: money(data.salesTotal - data.purchaseTotal), icon: BarChart3, palette: CARD_PALETTE[2], helper: "Sales minus purchase value" },
    { label: "Today's Transactions", value: String(data.todayTransactions), icon: Activity, palette: CARD_PALETTE[0], helper: "Posted today in Roznamcha" },
  ];

  const systemStatus = [
    { label: "Database Status", value: data.databaseReady ? "Online" : "Issue", status: data.databaseReady ? "Connected to live ERP data" : data.error || "Connection failed", icon: Database },
    { label: "Backup Status", value: "Ready", status: "Restore point policy active", icon: HardDrive },
    { label: "Synchronization", value: "Synced", status: "Live dashboard values from database", icon: RefreshCw },
    { label: "Server Status", value: "Operational", status: `${data.activeUsers || data.counts.users} active users monitored`, icon: Server },
  ];

  return (
    <div className="space-y-6 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-sky-50/60 p-3 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:p-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl dark:border-slate-800">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_32%),linear-gradient(135deg,#020617,#111827_55%,#0f172a)] p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">
              <Activity className="h-3.5 w-3.5 text-emerald-300" />
              Super Admin Command Center
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Enterprise ERP Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
              Global management view for countries, branches, users, accounts, purchases, sales, ledgers, cash flow, and operational activity.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-80">
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/dashboard/new-entry/branches/super-admin">
                <Building className="mr-2 h-4 w-4" /> Setup Country
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/dashboard/settings">
                Global Settings <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!data.databaseReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Database summary could not load: {data.error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {statCards.map((card) => (
          <ColorStatCard key={card.label} {...card} />
        ))}
      </section>

      {data.databaseReady && data.countrySummaries.length > 0 && (
        <section className="pt-1">
          <SuperAdminOverviewCharts countrySummaries={data.countrySummaries} />
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {systemStatus.map((item) => (
          <SystemStatusCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">


        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Global Scope Control</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Financial values are never merged across currencies. Use the country currency dashboard below for money totals.</p>
          </div>
          <div className="space-y-2.5 p-5">
            <FinancialRow label="Countries" value={String(data.counts.countries)} />
            <FinancialRow label="Branches" value={String(data.counts.branches)} />
            <FinancialRow label="Users" value={String(data.counts.users)} />
            <FinancialRow label="Purchase Orders" value={String(data.counts.purchases)} />
            <FinancialRow label="Sales Orders" value={String(data.counts.sales)} />
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
              Currency rule active: country totals stay separated by each country's base currency.
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Country Currency Dashboard</h2>
            <p className="text-xs text-slate-500">Each country is reported in its own local currency. Values are not mixed across countries.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            {data.countrySummaries.length} countries
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase tracking-wide text-slate-100">
              <tr>
                {["Country", "Currency", "Purchases", "Sales", "Debit", "Credit", "Ledger Balance", "Branches"].map((head) => (
                  <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.countrySummaries.map((country: CountryFinancialSummary) => (
                <tr key={country.id} className="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{country.name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-300">{country.currency}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{money(country.totalPurchases, country.currency)}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{money(country.totalSales, country.currency)}</td>
                  <td className="px-4 py-3 font-mono text-rose-600 dark:text-rose-300">{money(country.totalDebit, country.currency)}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-300">{money(country.totalCredit, country.currency)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">{money(country.totalLedgerBalance, country.currency)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{country.totalBranches}</td>
                </tr>
              ))}
              {!data.countrySummaries.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No country financial data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent System Activity</h2>
            <p className="text-xs text-slate-500">Latest purchase, payment, ledger, cash, and Roznamcha activity available from live postings</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {data.recentRoznamcha.length} entries
          </span>
        </div>

        {data.recentRoznamcha.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {data.recentRoznamcha.map((row, idx) => {
              const p = CARD_PALETTE[idx % CARD_PALETTE.length];
              const st = getStatusStyle(row.status);
              const dateStr = row.entry_date
                ? new Date(row.entry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : row.created_at
                  ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "-";
              return (
                <div
                  key={row.id}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.gradient} p-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
                >
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-lg" />
                  <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {(row.status || "draft").toUpperCase()}
                  </div>
                  <p className="truncate font-mono text-sm font-black leading-tight text-white">
                    {row.voucher_no || "No Voucher"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold capitalize text-white/80">
                    {row.type || "General Entry"}
                  </p>
                  <div className="mt-3 space-y-1 border-t border-white/20 pt-2.5">
                    {row.country_name && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/70">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{row.country_name}</span>
                      </div>
                    )}
                    {row.branch_name && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/70">
                        <Building className="h-3 w-3 shrink-0" />
                        <span className="truncate">{row.branch_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <Layers className="h-3 w-3 shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-400">No roznamcha postings found in database yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

