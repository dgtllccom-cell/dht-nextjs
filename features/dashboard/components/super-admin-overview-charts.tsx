"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Building2,
  Globe,
  ShoppingCart,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart as PieIcon,
  Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

export type CountryFinancialSummary = {
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

type SuperAdminOverviewChartsProps = {
  countrySummaries: CountryFinancialSummary[];
};

function moneyFormat(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;
}

export function SuperAdminOverviewCharts({ countrySummaries }: SuperAdminOverviewChartsProps) {
  const [selectedCountryId, setSelectedCountryId] = useState<string>("all");

  const selectedCountry = useMemo(() => {
    return countrySummaries.find(c => c.id === selectedCountryId);
  }, [selectedCountryId, countrySummaries]);

  // Comparative data for system-wide bar charts
  const comparisonData = useMemo(() => {
    return countrySummaries.map(c => ({
      name: c.name,
      Sales: c.totalSales,
      Purchases: c.totalPurchases,
      Balance: c.totalLedgerBalance,
      currency: c.currency
    }));
  }, [countrySummaries]);

  // Mock monthly data matching the dashboard layout for Sales/Purchase line charts
  const monthlyTrendsData = useMemo(() => {
    const salesTotal = selectedCountry ? selectedCountry.totalSales : 0;
    const purchaseTotal = selectedCountry ? selectedCountry.totalPurchases : 0;
    return [
      { name: "Jan", sales: salesTotal * 0.12, purchases: purchaseTotal * 0.15 },
      { name: "Feb", sales: salesTotal * 0.15, purchases: purchaseTotal * 0.13 },
      { name: "Mar", sales: salesTotal * 0.13, purchases: purchaseTotal * 0.18 },
      { name: "Apr", sales: salesTotal * 0.18, purchases: purchaseTotal * 0.14 },
      { name: "May", sales: salesTotal * 0.22, purchases: purchaseTotal * 0.20 },
      { name: "Jun", sales: salesTotal * 0.20, purchases: purchaseTotal * 0.20 }
    ];
  }, [selectedCountry]);

  // Donut data comparing Sales, Purchases, and profit/loss
  const distributionPieData = useMemo(() => {
    if (!selectedCountry) return [];
    return [
      { name: "Total Sales", value: Math.max(0, Math.round(selectedCountry.totalSales)), color: "#3b82f6" },
      { name: "Total Purchases", value: Math.max(0, Math.round(selectedCountry.totalPurchases)), color: "#f59e0b" },
      { name: "Ledger Balance", value: Math.max(0, Math.round(selectedCountry.totalLedgerBalance)), color: "#10b981" }
    ].filter(item => item.value > 0);
  }, [selectedCountry]);

  return (
    <div className="space-y-6">
      {/* Country Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Interactive Scope Selector</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Toggle between system-wide comparison and national scoped metrics</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setSelectedCountryId("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedCountryId === "all"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            System Wide
          </button>
          {countrySummaries.map((country) => (
            <button
              key={country.id}
              onClick={() => setSelectedCountryId(country.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCountryId === country.id
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {country.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCountryId === "all" ? (
        /* ================== SYSTEM WIDE COMPARISON DASHBOARD ================== */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sales & Purchases Bar Chart */}
          <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Sales & Purchases by Country
              </CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">
                Comparative business values in national currencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value, name, props) => [
                        moneyFormat(Number(value), props.payload.currency),
                        name
                      ]}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 11
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Net Balance Bar Chart */}
          <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-500" />
                Ledger Net Balance Position
              </CardTitle>
              <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">
                Consolidated balance per country scope
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value, name, props) => [
                        moneyFormat(Number(value), props.payload.currency),
                        "Net Balance"
                      ]}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 11
                      }}
                    />
                    <Bar dataKey="Balance" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Balance < 0 ? "#ef4444" : "#10b981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================== COUNTRY SCOPED GRAPHICAL OVERVIEW ================== */
        selectedCountry && (
          <div className="space-y-6">
            {/* National mini summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border border-slate-100 bg-white shadow-sm dark:border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
                    <h4 className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                      {moneyFormat(selectedCountry.totalSales, selectedCountry.currency)}
                    </h4>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-100 bg-white shadow-sm dark:border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchases</span>
                    <h4 className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                      {moneyFormat(selectedCountry.totalPurchases, selectedCountry.currency)}
                    </h4>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <ShoppingCart className="h-4 w-4 text-amber-600" />
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-100 bg-white shadow-sm dark:border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Ledger Balance</span>
                    <h4 className={`text-base font-extrabold mt-1 ${selectedCountry.totalLedgerBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {moneyFormat(selectedCountry.totalLedgerBalance, selectedCountry.currency)}
                    </h4>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Scoped charts */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Sales Overview Chart */}
              <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Sales Overview</CardTitle>
                  <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Monthly progression in {selectedCountry.currency}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="superSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "none",
                            borderRadius: 8,
                            color: "#fff",
                            fontSize: 11
                          }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#superSalesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Overview Chart */}
              <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Purchase Overview</CardTitle>
                  <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Monthly purchases in {selectedCountry.currency}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="superPurchGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "none",
                            borderRadius: 8,
                            color: "#fff",
                            fontSize: 11
                          }}
                        />
                        <Area type="monotone" dataKey="purchases" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#superPurchGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Distribution Donut */}
              <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <PieIcon className="h-4 w-4 text-pink-500" />
                    Asset Distribution
                  </CardTitle>
                  <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Sales, Purchases, Net balance ratios</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="h-[150px] w-full flex justify-center items-center relative">
                    {distributionPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {distributionPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => moneyFormat(Number(val), selectedCountry.currency)}
                            contentStyle={{
                              background: "rgba(15, 23, 42, 0.9)",
                              border: "none",
                              borderRadius: 8,
                              color: "#fff",
                              fontSize: 10
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No data values to draw</span>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 w-full text-[10px] text-slate-600 dark:text-slate-400">
                    {distributionPieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="truncate">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
}

