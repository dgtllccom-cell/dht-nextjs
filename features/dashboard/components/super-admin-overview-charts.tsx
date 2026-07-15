"use client";

import React, { useMemo } from "react";
import {
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
  Award,
  BarChart3,
  PieChart as PieIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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
  const comparisonData = useMemo(() => {
    return countrySummaries.slice(0, 8).map((country) => ({
      name: country.name,
      Sales: country.totalSales,
      Purchases: country.totalPurchases,
      currency: country.currency
    }));
  }, [countrySummaries]);

  const distributionPieData = useMemo(() => {
    return countrySummaries
      .map((country, index) => ({
        name: country.name,
        value: Math.max(0, Math.round(country.totalSales || country.totalPurchases || country.totalLedgerBalance || 0)),
        currency: country.currency,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .filter((item) => item.value > 0)
      .slice(0, 6);
  }, [countrySummaries]);

  const topCountries = useMemo(() => {
    return [...countrySummaries]
      .sort((a, b) => b.totalSales + b.totalPurchases - (a.totalSales + a.totalPurchases))
      .slice(0, 5);
  }, [countrySummaries]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr_1fr]">
      <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Purchase vs Sales
          </CardTitle>
          <CardDescription className="text-[10px] font-semibold uppercase text-slate-400">
            Compact country comparison without oversized country/currency lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name, props) => [moneyFormat(Number(value), props.payload.currency), name]}
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 11
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Bar dataKey="Sales" fill="#2563eb" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Purchases" fill="#10b981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            <PieIcon className="h-4 w-4 text-violet-600" />
            Sales by Country
          </CardTitle>
          <CardDescription className="text-[10px] font-semibold uppercase text-slate-400">
            Top scopes only, clean executive view
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <div className="relative h-[190px] w-full">
            {distributionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distributionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => [moneyFormat(Number(value), props.payload.currency), props.payload.name]}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.92)",
                      border: "none",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs font-semibold text-slate-400">No chart data yet</div>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {distributionPieData.map((entry) => (
              <div key={entry.name} className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Award className="h-4 w-4 text-emerald-600" />
            Top Performing Countries
          </CardTitle>
          <CardDescription className="text-[10px] font-semibold uppercase text-slate-400">
            Short management list, not a full master list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topCountries.map((country, index) => {
            const total = country.totalSales + country.totalPurchases;
            return (
              <div key={country.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-slate-100">{country.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{country.totalBranches} branches</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-blue-700 shadow-sm dark:bg-slate-950">
                    #{index + 1}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-semibold">
                  <span className="truncate text-blue-600">{moneyFormat(country.totalSales, country.currency)}</span>
                  <span className="truncate text-emerald-600">{moneyFormat(country.totalPurchases, country.currency)}</span>
                  <span className="truncate text-slate-600 dark:text-slate-300">{moneyFormat(total, country.currency)}</span>
                </div>
              </div>
            );
          })}
          {!topCountries.length && (
            <div className="grid h-52 place-items-center rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
              No country performance data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
