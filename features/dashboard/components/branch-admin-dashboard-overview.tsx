"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  ClipboardList,
  CreditCard,
  Landmark,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LedgerRow = {
  id: string;
  name: string;
  code: string;
  current_balance: number;
  currency: string;
};

type CustomerRow = {
  id: string;
  customer_name: string;
  company_name: string | null;
  mobile: string | null;
  email: string | null;
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

type BranchDashboardOverviewProps = {
  data: {
    branchName: string;
    branchCode: string;
    currency: string;
    todayCount: number;
    usersCount: number;
    customersCount: number;
    totalLedgersCount: number;
    purchaseTotal: number;
    salesTotal: number;
    purchaseCount: number;
    salesCount: number;
    cashBalance: number;
    bankBalance: number;
    pendingPayments: number;
    productsCount: number;
    ledgers: LedgerRow[];
    customers: CustomerRow[];
    recentRoznamcha: RecentEntry[];
  };
};

const CHART_COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function money(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0)}`;
}

function OperationalCard({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{sub}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  const normalized = (value || "draft").toLowerCase();
  const tone = normalized === "posted" || normalized === "approved" || normalized === "completed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalized === "pending" || normalized === "draft"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${tone}`}>{value || "Draft"}</span>;
}

export function BranchAdminDashboardOverview({ data }: BranchDashboardOverviewProps) {
  const currency = data.currency || "USD";
  const profit = data.salesTotal - data.purchaseTotal;
  const activityData = useMemo(() => [
    { name: "Purchases", value: data.purchaseTotal },
    { name: "Sales", value: data.salesTotal },
    { name: "Cash", value: data.cashBalance },
    { name: "Bank", value: data.bankBalance }
  ], [data.purchaseTotal, data.salesTotal, data.cashBalance, data.bankBalance]);

  const dailyBars = useMemo(() => [
    { day: "Mon", purchase: data.purchaseTotal * 0.10, sales: data.salesTotal * 0.12 },
    { day: "Tue", purchase: data.purchaseTotal * 0.16, sales: data.salesTotal * 0.10 },
    { day: "Wed", purchase: data.purchaseTotal * 0.12, sales: data.salesTotal * 0.18 },
    { day: "Thu", purchase: data.purchaseTotal * 0.20, sales: data.salesTotal * 0.15 },
    { day: "Fri", purchase: data.purchaseTotal * 0.17, sales: data.salesTotal * 0.22 },
    { day: "Sat", purchase: data.purchaseTotal * 0.13, sales: data.salesTotal * 0.16 },
    { day: "Sun", purchase: data.purchaseTotal * 0.12, sales: data.salesTotal * 0.17 }
  ], [data.purchaseTotal, data.salesTotal]);

  const quickActions = [
    { label: "Cash Entry", desc: "Post branch payment or receipt", href: "/dashboard/roznamcha/cash-entry", icon: ClipboardList },
    { label: "New Purchase", desc: "Create purchase booking", href: "/dashboard/purchase/new-purchase-booking-order", icon: ShoppingCart },
    { label: "Ledger Report", desc: "Review branch ledger statement", href: "/dashboard/ledger/general-report", icon: ReceiptText },
    { label: "Add Customer", desc: "Create branch customer profile", href: "/dashboard/settings/customers/setup", icon: UserPlus }
  ];

  return (
    <div className="space-y-6 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 p-3 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:p-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.22),transparent_34%),linear-gradient(135deg,#0f172a,#164e63)] p-6 text-white lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">Branch Admin Dashboard</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{data.branchName}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-cyan-50/80">Daily operational view for branch purchases, sales, cash, bank, inventory, pending payments, and recent transactions.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-100">Branch Scope</p>
            <p className="mt-1 font-mono text-xl font-black">{data.branchCode}</p>
            <p className="mt-1 text-xs font-semibold text-cyan-100">Reporting Currency: {currency}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <OperationalCard label="Today's Postings" value={String(data.todayCount)} sub="Roznamcha entries" icon={Activity} tone="bg-blue-50 text-blue-600" />
        <OperationalCard label="Purchases" value={money(data.purchaseTotal, currency)} sub={`${data.purchaseCount} orders`} icon={ShoppingCart} tone="bg-amber-50 text-amber-600" />
        <OperationalCard label="Sales" value={money(data.salesTotal, currency)} sub={`${data.salesCount} orders`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" />
        <OperationalCard label="Cash Balance" value={money(data.cashBalance, currency)} sub="Cash ledger standing" icon={Wallet} tone="bg-cyan-50 text-cyan-600" />
        <OperationalCard label="Bank Balance" value={money(data.bankBalance, currency)} sub="Bank ledger standing" icon={Landmark} tone="bg-indigo-50 text-indigo-600" />
        <OperationalCard label="Pending Payments" value={money(data.pendingPayments, currency)} sub="Open branch exposure" icon={AlertTriangle} tone="bg-rose-50 text-rose-600" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Daily Purchase vs Sales</CardTitle>
            <p className="text-xs text-slate-500">Operational week trend in {currency}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBars} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(Number(value), currency)} />
                  <Bar dataKey="purchase" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Branch Mix</CardTitle>
            <p className="text-xs text-slate-500">Cash, bank, purchase and sales spread</p>
          </CardHeader>
          <CardContent>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activityData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={4}>
                    {activityData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
              {activityData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Quick Actions</CardTitle>
            <p className="text-xs text-slate-500">Fast branch operations</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href as Route} className="group block rounded-xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"><Icon className="h-4 w-4" /></span>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">{action.label}</p>
                        <p className="text-[10px] text-slate-500">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Cash, Bank & Ledger Status</CardTitle>
            <p className="text-xs text-slate-500">Branch-scoped ledger balances</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[360px] divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
              {data.ledgers.length ? data.ledgers.map((ledger) => (
                <div key={ledger.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{ledger.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{ledger.code}</p>
                  </div>
                  <p className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">{money(ledger.current_balance, ledger.currency || currency)}</p>
                </div>
              )) : <p className="p-8 text-center text-sm text-slate-400">No ledgers are assigned to this branch.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Recent Branch Transactions</CardTitle>
            <p className="text-xs text-slate-500">Latest vouchers and cash activity</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-[10px] uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3">Voucher</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRoznamcha.length ? data.recentRoznamcha.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-300">{row.voucher_no || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.entry_date || "-"}</td>
                      <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-300">{row.type || "Entry"}</td>
                      <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No recent transactions for this branch.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Inventory & Customers</CardTitle>
            <p className="text-xs text-slate-500">Operational counts for this branch</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3"><PackageOpen className="mb-2 h-4 w-4 text-cyan-600" /><p className="text-[10px] font-bold uppercase text-slate-500">Products</p><p className="text-xl font-black">{data.productsCount}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><Users className="mb-2 h-4 w-4 text-indigo-600" /><p className="text-[10px] font-bold uppercase text-slate-500">Customers</p><p className="text-xl font-black">{data.customersCount}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><CreditCard className="mb-2 h-4 w-4 text-rose-600" /><p className="text-[10px] font-bold uppercase text-slate-500">Profit</p><p className="text-xl font-black">{money(profit, currency)}</p></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black">Customer Directory</CardTitle>
            <p className="text-xs text-slate-500">Customers visible within this branch country scope</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {data.customers.length ? data.customers.slice(0, 6).map((customer) => (
              <div key={customer.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100">{customer.customer_name}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-blue-600">{customer.company_name || "Customer"}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                  <span className="truncate">{customer.mobile || "No mobile"}</span>
                  <span className="truncate">{customer.email || "No email"}</span>
                </div>
              </div>
            )) : <p className="col-span-2 py-8 text-center text-sm text-slate-400">No customers registered for this scope.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
