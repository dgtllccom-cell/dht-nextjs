import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Banknote, Building, ClipboardList, Database, Landmark, ReceiptText, ShieldCheck, UserPlus, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import { getRequestLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
import { getCurrentErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerRow = {
  id: string;
  customer_name: string;
  company_name: string | null;
  mobile: string | null;
  email: string | null;
};

type LedgerRow = {
  id: string;
  name: string;
  code: string;
  current_balance: number;
  currency: string;
};

type RecentEntry = {
  id: string;
  voucher_no: string | null;
  entry_date: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
  narration: string | null;
};

type BranchDashboardData = {
  branchName: string;
  branchCode: string;
  currency: string;
  todayCount: number;
  usersCount: number;
  customersCount: number;
  totalLedgersCount: number;
  ledgers: LedgerRow[];
  customers: CustomerRow[];
  recentRoznamcha: RecentEntry[];
  databaseReady: boolean;
  error: string | null;
};

function money(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value || 0)}`;
}

async function loadBranchDashboardData(
  sessionCountryBranchId: string | null,
  sessionCityBranchId: string | null
): Promise<BranchDashboardData> {
  try {
    const supabase = createSupabaseAdminClient() as any;

    let branchName = "Branch Scoped";
    let branchCode = "BR";
    let countryId = "";
    let currency = "USD";
    let queryField = "";
    let queryValue = "";

    if (sessionCityBranchId) {
      const res = (await supabase.from("city_branches").select("name, code, country_id, local_currency").eq("id", sessionCityBranchId).maybeSingle()) as any;
      branchName = res.data?.name || "City Branch";
      branchCode = res.data?.code || "CBR";
      countryId = res.data?.country_id || "";
      currency = res.data?.local_currency || "USD";
      queryField = "city_branch_id";
      queryValue = sessionCityBranchId;
    } else if (sessionCountryBranchId) {
      const res = (await supabase.from("country_branches").select("name, code, country_id, local_currency").eq("id", sessionCountryBranchId).maybeSingle()) as any;
      branchName = res.data?.name || "Main Branch";
      branchCode = res.data?.code || "MBR";
      countryId = res.data?.country_id || "";
      currency = res.data?.local_currency || "USD";
      queryField = "country_branch_id";
      queryValue = sessionCountryBranchId;
    } else {
      throw new Error("No branch scope configuration found in active user session");
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      todayPostings,
      usersRes,
      customersCountRes,
      ledgersRes,
      customersRes,
      recentRows
    ] = await Promise.all([
      supabase.from("roznamcha_entries").select("id", { count: "exact", head: true }).eq(queryField, queryValue).eq("entry_date", todayStr).is("deleted_at", null),
      supabase.from("user_role_assignments").select("user_id", { count: "exact", head: true }).eq(queryField, queryValue).eq("is_active", true).is("deleted_at", null),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("country_id", countryId).is("deleted_at", null),
      supabase.from("ledgers").select("id, name, code, current_balance, currency").eq(queryField, queryValue).is("deleted_at", null).order("code"),
      supabase.from("customers").select("id, customer_name, company_name, mobile, email").eq("country_id", countryId).is("deleted_at", null).order("customer_name").limit(8),
      supabase
        .from("roznamcha_entries")
        .select("id, voucher_no, entry_date, type, status, created_at, narration")
        .eq(queryField, queryValue)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
    ]);

    const todayCount = todayPostings.count || 0;
    const usersCount = usersRes.count || 0;
    const customersCount = customersCountRes.count || 0;
    const totalLedgersCount = ledgersRes.data?.length || 0;

    const ledgers: LedgerRow[] = (ledgersRes.data ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      current_balance: Number(l.current_balance || 0),
      currency: l.currency
    }));

    const customers: CustomerRow[] = (customersRes.data ?? []).map((c: any) => ({
      id: c.id,
      customer_name: c.customer_name,
      company_name: c.company_name,
      mobile: c.mobile,
      email: c.email
    }));

    const recentRoznamcha: RecentEntry[] = (recentRows.data ?? []).map((row: any) => ({
      id: row.id,
      voucher_no: row.voucher_no,
      entry_date: row.entry_date,
      type: row.type,
      status: row.status,
      created_at: row.created_at,
      narration: row.narration
    }));

    return {
      branchName,
      branchCode,
      currency,
      todayCount,
      usersCount,
      customersCount,
      totalLedgersCount,
      ledgers,
      customers,
      recentRoznamcha,
      databaseReady: true,
      error: null
    };
  } catch (error) {
    return {
      branchName: "Branch Dashboard",
      branchCode: "BR",
      currency: "USD",
      todayCount: 0,
      usersCount: 0,
      customersCount: 0,
      totalLedgersCount: 0,
      ledgers: [],
      customers: [],
      recentRoznamcha: [],
      databaseReady: false,
      error: error instanceof Error ? error.message : "Failed to load branch data"
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

export default async function CityDashboardPage() {
  const lang = await getRequestLanguage();
  const session = await getCurrentErpSession();

  const cityBranchId = session?.cityBranchIds?.[0] || null;
  const countryBranchId = session?.countryBranchIds?.[0] || null;

  if (!cityBranchId && !countryBranchId) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold">Branch Access Required</h2>
            <p className="text-sm mt-1">Your user role does not have an assigned City Branch or Country Branch. Please contact administration to assign your branch location.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await loadBranchDashboardData(countryBranchId, cityBranchId);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-700/10 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-500/20">
              Branch Scope ({data.branchCode})
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {data.branchName} Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily branch cash management, roznamcha entries, customer lists, and branch ledgers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={"/dashboard/settings/customers/setup" as Route}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Customer
            </Link>
          </Button>
          <Button asChild>
            <Link href={"/dashboard/roznamcha/cash-entry" as Route}>
              <ClipboardList className="mr-2 h-4 w-4" /> Roznamcha Entry
            </Link>
          </Button>
        </div>
      </section>

      {!data.databaseReady ? (
        <Card className="border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-300">
          <CardContent className="p-4 text-sm font-semibold">
            Branch data could not load: {data.error}
          </CardContent>
        </Card>
      ) : null}

      {/* Grid of stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Postings" value={String(data.todayCount)} icon={ShieldCheck} />
        <StatCard label="Branch Staff" value={String(data.usersCount)} icon={Users} />
        <StatCard label="Branch Customers" value={String(data.customersCount)} icon={UserPlus} />
        <StatCard label="Total Ledgers" value={String(data.totalLedgersCount)} icon={ReceiptText} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* Cash & Bank Balances list */}
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-500" /> Cash & Bank Accounts
            </CardTitle>
            <p className="text-xs text-muted-foreground">Current standings of branch-scoped ledgers.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.ledgers.length ? (
                data.ledgers.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{l.name}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">Code: {l.code}</span>
                    </div>
                    <span className="font-bold text-sm font-mono text-slate-800 dark:text-slate-200">
                      {money(l.current_balance, l.currency)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground p-4 italic text-center">No active ledgers for this branch.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Branch Customers List */}
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" /> Local Customers Directory
            </CardTitle>
            <p className="text-xs text-muted-foreground">Registered customers within the country scope of this branch.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.customers.length ? (
                data.customers.map((c) => (
                  <div key={c.id} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{c.customer_name}</p>
                    {c.company_name && (
                      <p className="text-[10px] text-indigo-600 font-medium dark:text-indigo-400">{c.company_name}</p>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{c.mobile || "No Mobile"}</span>
                      <span>{c.email || "No Email"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground p-4 italic text-center">No customers registered under this scope.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations Shortcuts */}
        <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold">Quick Branch Operations</CardTitle>
            <p className="text-xs text-muted-foreground">Common administrative tasks and links.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { label: "Cash Payment Voucher", desc: "Create roznamcha cash disbursement entry", href: "/dashboard/roznamcha/cash-entry" },
              { label: "Voucher History Log", desc: "Review all posted vouchers in this branch", href: "/dashboard/roznamcha/all" },
              { label: "Local Sales Bookings", desc: "Access the local branch sales records", href: "/dashboard/sales/local-sales" },
              { label: "Voucher Journal Reports", desc: "Print or export daily branch ledger journals", href: "/dashboard/ledger/general-report" }
            ].map((shortcut, idx) => (
              <Link key={idx} href={shortcut.href as Route} className="block group">
                <div className="rounded-lg border border-slate-200/80 p-3 hover:border-primary/80 transition duration-150 bg-card hover:bg-primary/[0.02] dark:border-slate-800/80 dark:hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-primary dark:text-slate-200">{shortcut.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition duration-150" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{shortcut.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Scoped Recent Branch Postings */}
        <Card className="xl:col-span-3 border border-slate-200/80 shadow-sm dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 py-4 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold">Recent Branch Vouchers</CardTitle>
            <p className="text-xs text-muted-foreground">Latest live postings in this specific branch office location.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-start font-semibold">Voucher / ID</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Date</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Type</th>
                    <th className="px-4 py-2.5 text-start font-semibold">Narration</th>
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
                        <td className="px-4 py-3 text-xs capitalize">{row.type || "-"}</td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate">{row.narration || "-"}</td>
                        <td className="px-4 py-3"><StatusPill value={row.status || "draft"} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                        No vouchers posted in this branch yet.
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
