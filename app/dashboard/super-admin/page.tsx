import Link from "next/link";
import { ArrowRight, Banknote, Building, Database, GitBranch, Globe, ReceiptText, ShieldCheck, Ship, ShoppingCart, Users, Activity, TrendingUp, Landmark, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRequestLanguage } from "@/lib/i18n/server";
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
  recentRoznamcha: RecentEntry[];
  countryBranches: CountryBranchNode[];
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
    countries: 0, branches: 0, users: 0, accounts: 0,
    ledgers: 0, roznamcha: 0, purchases: 0, sales: 0, shipping: 0
  };

  try {
    const supabase = createSupabaseAdminClient();
    const [
      countriesCount, countryBranchesCount, cityBranchesCount, usersCount,
      accountsCount, ledgersCount, roznamchaCount, purchasesCount, salesCount,
      shippingCount, purchaseRows, salesRows, balanceRows, recentRows,
      countriesList, mainBranchesList, cityBranchesList
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
            id: mb.id, name: mb.name, code: mb.code,
            cityBranches: mainCityBranches.map((cb: any) => ({
              id: cb.id, name: cb.name, cityName: cb.city_name, code: cb.code
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
      purchaseTotal, salesTotal, ledgerDebit, ledgerCredit, ledgerBalance,
      recentRoznamcha, countryBranches, countrySummaries, databaseReady: true, error: null
    };
  } catch (error) {
    return {
      counts: emptyCounts,
      purchaseTotal: 0, salesTotal: 0, ledgerDebit: 0, ledgerCredit: 0, ledgerBalance: 0,
      recentRoznamcha: [], countryBranches: [], countrySummaries: [], databaseReady: false,
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
  label, value, icon: Icon, palette
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  palette: typeof CARD_PALETTE[0];
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${palette.gradient} p-5 shadow-lg`}>
      <div className={`absolute -right-3 -top-3 h-20 w-20 rounded-full opacity-20 ${palette.badge} blur-xl`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ${palette.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FinancialRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 ${highlight ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-slate-100"}`}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-indigo-700" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

export default async function SuperAdminDashboardPage() {
  const data = await loadSuperAdminData();

  const statCards = [
    { label: "Total Countries",        value: String(data.counts.countries),  icon: Globe,        palette: CARD_PALETTE[0] },
    { label: "Branches (Main + City)", value: String(data.counts.branches),   icon: GitBranch,    palette: CARD_PALETTE[1] },
    { label: "Registered Users",       value: String(data.counts.users),      icon: Users,        palette: CARD_PALETTE[2] },
    { label: "Account Master",         value: String(data.counts.accounts),   icon: Banknote,     palette: CARD_PALETTE[3] },
    { label: "Active Ledgers",         value: String(data.counts.ledgers),    icon: ReceiptText,  palette: CARD_PALETTE[4] },
    { label: "Roznamcha Entries",      value: String(data.counts.roznamcha),  icon: ShieldCheck,  palette: CARD_PALETTE[5] },
    { label: "Purchase Orders",        value: String(data.counts.purchases),  icon: ShoppingCart, palette: CARD_PALETTE[6] },
    { label: "Shipping Records",       value: String(data.counts.shipping),   icon: Ship,         palette: CARD_PALETTE[7] },
  ];

  return (
    <div className="space-y-7">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Header Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            <Activity className="h-3 w-3 animate-pulse text-indigo-500" />
            System Wide Scope
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enterprise overview across all nations, branches, ledger systems, and postings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/new-entry/branches/super-admin">
              <Building className="mr-2 h-4 w-4" /> Setup Country
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/settings">
              Global Settings <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {!data.databaseReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Database summary could not load: {data.error}
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Colorful Stat Cards Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <ColorStatCard key={card.label} {...card} />
        ))}
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Financial Summary + Branch Tree Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="grid gap-5 xl:grid-cols-3">
        {/* Branch Hierarchy */}
        <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Nations & Branch Networks</h2>
              <p className="text-xs text-slate-500">Country -&gt; Main Branch -&gt; City Branch topology</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <div className="p-5">
            {data.countryBranches.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.countryBranches.map((country, idx) => {
                  const p = CARD_PALETTE[idx % CARD_PALETTE.length];
                  return (
                    <div key={country.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient} text-[10px] font-black text-white`}>
                            {country.code}
                          </div>
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{country.name}</span>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {country.currency}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {country.mainBranches.length ? (
                          country.mainBranches.map((mb) => (
                            <div key={mb.id} className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <Building className="h-3 w-3 text-indigo-500" />
                                {mb.name}
                                <span className="font-mono text-[9px] text-slate-400">({mb.code})</span>
                              </p>
                              {mb.cityBranches.length ? (
                                <div className="mt-2 space-y-1 border-l-2 border-dashed border-slate-200 pl-4 dark:border-slate-700">
                                  {mb.cityBranches.map((cb) => (
                                    <div key={cb.id} className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-500">{cb.cityName} - {cb.name}</span>
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] font-bold dark:bg-slate-800">{cb.code}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 pl-4 text-[10px] italic text-slate-400">No city branches</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] italic text-slate-400">No main branch configured</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No countries configured yet.</p>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Global Scope Standings</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Per-country totals remain in each country currency</p>
          </div>
          <div className="space-y-2.5 p-5">
            <FinancialRow label="Ledger Debit Total"       value={money(data.ledgerDebit)} />
            <FinancialRow label="Ledger Credit Total"      value={money(data.ledgerCredit)} />
            <FinancialRow label="Ledger Current Balance"   value={money(data.ledgerBalance)} highlight />
            <FinancialRow label="Purchase Booking Volume"  value={money(data.purchaseTotal)} />
            <FinancialRow label="Sales Booking Volume"     value={money(data.salesTotal)} />
          </div>
        </div>
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Recent Postings Ã¢â‚¬â€ Colorful Cards Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent System Postings</h2>
            <p className="text-xs text-slate-500">Latest Roznamcha entries from branches worldwide</p>
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
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.gradient} p-4 shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`}
                >
                  {/* Decorative blob */}
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-lg" />

                  {/* Status pill */}
                  <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {(row.status || "draft").toUpperCase()}
                  </div>

                  {/* Voucher */}
                  <p className="font-mono text-sm font-black text-white leading-tight truncate">
                    {row.voucher_no || "No Voucher"}
                  </p>

                  {/* Type */}
                  <p className="mt-0.5 text-[11px] font-semibold capitalize text-white/80 truncate">
                    {row.type || "General Entry"}
                  </p>

                  {/* Meta */}
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
