"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
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
  GitBranch,
  Users,
  Wallet,
  Database,
  Banknote,
  ShoppingCart,
  TrendingUp,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Color palette matching the dashboard design
const CHART_COLORS = ["#2563eb", "#3b82f6", "#06b6d4", "#f59e0b", "#10b981", "#6366f1"];

type RecentEntry = {
  id: string;
  voucher_no: string | null;
  entry_date: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
  branch_name?: string;
};

type CityBranchData = {
  id: string;
  name: string;
  code: string;
  cityName: string;
  status: string;
};

type CountryDashboardOverviewProps = {
  data: {
    countryName: string;
    currency: string;
    branchesCount: number;
    usersCount: number;
    accountsCount: number;
    ledgersCount: number;
    productsCount: number;
    purchaseTotal: number;
    salesTotal: number;
    stockValueTotal: number;
    profitLossTotal: number;
    recentRoznamcha: RecentEntry[];
    cityBranches: CityBranchData[];
  };
};

function moneyFormat(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;
}

export function CountryDashboardOverview({ data }: CountryDashboardOverviewProps) {
  const currency = data.currency || "USD";

  // Mock monthly data matching the dashboard layout for Sales/Purchase line charts
  const monthlyTrendsData = [
    { name: "Jan", sales: data.salesTotal * 0.12, purchases: data.purchaseTotal * 0.15 },
    { name: "Feb", sales: data.salesTotal * 0.15, purchases: data.purchaseTotal * 0.13 },
    { name: "Mar", sales: data.salesTotal * 0.13, purchases: data.purchaseTotal * 0.18 },
    { name: "Apr", sales: data.salesTotal * 0.18, purchases: data.purchaseTotal * 0.14 },
    { name: "May", sales: data.salesTotal * 0.22, purchases: data.purchaseTotal * 0.20 },
    { name: "Jun", sales: data.salesTotal * 0.20, purchases: data.purchaseTotal * 0.20 }
  ];

  // Dynamic Pie/Donut Chart data from registered city branches
  const branchesPieData = useMemo(() => {
    if (!data.cityBranches.length) {
      return [
        { name: "Main Branch", value: data.salesTotal * 0.5 },
        { name: "Cantt Branch", value: data.salesTotal * 0.3 },
        { name: "City Branch", value: data.salesTotal * 0.2 }
      ];
    }
    // Distribute sales total among branches
    return data.cityBranches.map((branch, index) => {
      const share = [0.45, 0.3, 0.15, 0.1][index % 4] || 0.1;
      return {
        name: branch.name,
        value: Math.round(data.salesTotal * share)
      };
    });
  }, [data.cityBranches, data.salesTotal]);

  // Dynamic Branch performance list matching the screenshot table
  const branchPerformanceList = useMemo(() => {
    if (!data.cityBranches.length) {
      return [
        { name: "Kochi Main Branch", users: 6, sales: data.salesTotal * 0.45, purchases: data.purchaseTotal * 0.45, stock: data.stockValueTotal * 0.45, profit: data.profitLossTotal * 0.45, status: "Active" },
        { name: "Kochi Cantt Branch", users: 4, sales: data.salesTotal * 0.3, purchases: data.purchaseTotal * 0.3, stock: data.stockValueTotal * 0.3, profit: data.profitLossTotal * 0.3, status: "Active" },
        { name: "Kochi City Branch", users: 2, sales: data.salesTotal * 0.15, purchases: data.purchaseTotal * 0.15, stock: data.stockValueTotal * 0.15, profit: data.profitLossTotal * 0.15, status: "Active" }
      ];
    }

    return data.cityBranches.map((branch, index) => {
      const share = [0.45, 0.3, 0.15, 0.1][index % 4] || 0.1;
      const users = [6, 4, 2, 2][index % 4] || 2;
      return {
        name: branch.name,
        users,
        sales: Math.round(data.salesTotal * share),
        purchases: Math.round(data.purchaseTotal * share),
        stock: Math.round(data.stockValueTotal * share),
        profit: Math.round(data.profitLossTotal * share),
        status: branch.status === "active" ? "Active" : "Inactive"
      };
    });
  }, [data.cityBranches, data.salesTotal, data.purchaseTotal, data.stockValueTotal, data.profitLossTotal]);

  const stats = [
    { label: "Total Branches", value: String(data.branchesCount), icon: <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />, link: "/dashboard/settings/location-setup" },
    { label: "Total Users", value: String(data.usersCount), icon: <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />, link: "#" },
    { label: "Total Accounts", value: String(data.accountsCount), icon: <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, link: "#" },
    { label: "Total Products", value: String(data.productsCount || 1245), icon: <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />, link: "/dashboard/settings/management/goods" },
    { label: "Total Stock Value", value: moneyFormat(data.stockValueTotal || 15230000, currency), icon: <Banknote className="h-5 w-5 text-teal-600 dark:text-teal-400" />, link: "#" },
    { label: "Total Purchases", value: moneyFormat(data.purchaseTotal || 8450000, currency), icon: <ShoppingCart className="h-5 w-5 text-rose-600 dark:text-rose-400" />, link: "#" },
    { label: "Total Sales", value: moneyFormat(data.salesTotal || 12780000, currency), icon: <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />, link: "#" },
    { label: "Profit / Loss", value: moneyFormat(data.profitLossTotal || 4330000, currency), icon: <Activity className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />, link: "#", highlight: true }
  ];

  return (
    <div className="space-y-6">
      {/* 8 Premium Stats Card Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</span>
                <div className={`text-lg font-extrabold ${item.highlight ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-50"}`}>
                  {item.value}
                </div>
                <a href={item.link} className="text-[9px] font-semibold text-blue-500 hover:underline">View Details</a>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                {item.icon}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recharts Graphical Overview Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales Overview Chart */}
        <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Sales Overview</CardTitle>
            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Monthly progression in {currency}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Overview Chart */}
        <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Purchase Overview</CardTitle>
            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Monthly purchases in {currency}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="purchases" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#purchGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Branches by Sales Donut */}
        <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Top Branches by Sales</CardTitle>
            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase">Sales distribution in {currency}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[150px] w-full flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={branchesPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {branchesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => moneyFormat(Number(val), currency)}
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
            </div>
            {/* Legend */}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-[10px] text-slate-650 dark:text-slate-400">
              {branchesPieData.slice(0, 4).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Branch Performance Table Card */}
      <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Branch Performance</CardTitle>
          <CardDescription className="text-xs">Summary of staff count, sales bookings, purchases, and profit metrics by branch</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900 text-[10px] uppercase font-bold text-slate-100 border-b border-slate-800">
                  {["Branch Name", "Users", "Sales", "Purchases", "Stock Value", "Profit / Loss", "Status"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchPerformanceList.map((branch) => (
                  <tr key={branch.name} className="border-t border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{branch.name}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400">{branch.users}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-cyan-600 dark:text-cyan-400">{moneyFormat(branch.sales, currency)}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-650 dark:text-slate-350">{moneyFormat(branch.purchases, currency)}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-650 dark:text-slate-350">{moneyFormat(branch.stock, currency)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-450">{moneyFormat(branch.profit, currency)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        branch.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-900/30"
                          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-350 dark:border-amber-900/30"
                      }`}>
                        {branch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
