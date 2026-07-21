"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

import {
  FileText, Package, Scale, Gauge, Coins, MapPin, Building2,
  ChevronDown, ChevronUp, Download, Printer,
  Globe, Loader2, Filter, X, ArrowUpRight, ArrowDownLeft
} from "lucide-react";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
interface ReportRecord {
  id: string;
  purchase_order_no: string;
  purchase_contract_no: string;
  date: string;
  salesman: string;
  salesmanId: string;
  country: string;
  countryId: string;
  branch: string;
  branchId: string;
  netWeight: number;
  dc: number;
  purchaseAmount: number;
  purchasePayment: number;
  invoicePayment: number;
  remainingPayment: number;
  goodsName: string;
  supplier: string;
}

interface Summary {
  totalNetWeight: number;
  totalDC: number;
  totalPurchaseAmount: number;
  totalPurchasePayment: number;
  totalInvoicePayment: number;
  remainingPayment: number;
  totalBills: number;
}



/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function fmtNum(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).toUpperCase();
  } catch {
    return d;
  }
}

/* ─────────────────────────────────────────────
   Summary Card Component
   ───────────────────────────────────────────── */
function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconBg,
  iconColor = "text-white"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  iconBg: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4 transition-all duration-200 hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <h4 className="text-lg font-black text-slate-850 dark:text-slate-100 mt-1 tracking-tight tabular-nums truncate">{value}</h4>
        {subtext && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
interface DropdownItem {
  id: string;
  name: string;
}

export default function JournalStockReportDashboard({
  session,
  initialLevel = "salesman"
}: {
  session: { branchName?: string; fullName?: string; email?: string } | null | undefined;
  initialLevel?: "salesman" | "country" | "branch";
}) {
  // ── State ──
  const [activeTab, setActiveTab] = useState<"salesman" | "country" | "branch">(initialLevel);
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded details section
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  // Filters state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dropdown lists
  const [countries, setCountries] = useState<DropdownItem[]>([]);
  const [branches, setBranches] = useState<DropdownItem[]>([]);
  const [salesmen, setSalesmen] = useState<DropdownItem[]>([]);

  // ── Fetch metadata for filters ──
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch("/api/branch-management/countries"),
          fetch("/api/branch-management/city-branches?limit=500")
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          setCountries((cData.countries as DropdownItem[]) ?? []);
        }
        if (bRes.ok) {
          const bData = await bRes.json();
          setBranches((bData.cityBranches as DropdownItem[]) ?? []);
        }
        // Fallback list of salesmen based on profile IDs
        setSalesmen([
          { id: "7719341b-bfcb-4a31-b852-0f67e8062e95", name: "Ahmad Khan" },
          { id: "724319b1-cf66-4179-8365-1cd3ce20955b", name: "Usman Ali" },
          { id: "ae8b517e-d822-465f-88e9-5c6afa74b65e", name: "Zain Abbas" },
          { id: "3b7f6a85-6201-43fb-a3ce-f1312a5f3e82", name: "Faisal Mahmood" }
        ]);
      } catch { /* silent */ }
    }
    loadMeta();
  }, []);

  // ── Fetch Report Data ──
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (selectedCountryId && selectedCountryId !== "all") params.set("countryId", selectedCountryId);
      if (selectedBranchId && selectedBranchId !== "all") params.set("branchId", selectedBranchId);
      if (selectedSalesmanId && selectedSalesmanId !== "all") params.set("salesmanId", selectedSalesmanId);

      const res = await fetch(`/api/erp/reports/stock-reports?${params.toString()}`);
      const body = await res.json();
      if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? "Failed to fetch stock reports");
      setRecords(body.data.records ?? []);
      setSummary(body.data.summary ?? null);
    } catch {
      // Ignore error for visual dashboard state
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedCountryId, selectedBranchId, selectedSalesmanId]);

  useEffect(() => {
    fetchReport();
    setSelectedEntity(null);
  }, [fetchReport]);

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCountryId("");
    setSelectedBranchId("");
    setSelectedSalesmanId("");
    setFiltersOpen(false);
  };

  // ── Groupings ──
  // Group by active tab (Salesman, Country, Branch)
  const groupedData = useMemo(() => {
    const map: Record<string, {
      key: string;
      name: string;
      netWeight: number;
      dc: number;
      purchaseAmount: number;
      purchasePayment: number;
      invoicePayment: number;
      remainingPayment: number;
      billsCount: number;
      records: ReportRecord[];
    }> = {};

    records.forEach(r => {
      let key = "";
      let name = "";
      if (activeTab === "salesman") {
        key = r.salesmanId || "unknown";
        name = r.salesman || "Unknown Salesman";
      } else if (activeTab === "country") {
        key = r.countryId || "unknown";
        name = r.country || "Unknown Country";
      } else {
        key = r.branchId || "unknown";
        name = r.branch || "Unknown Branch";
      }

      if (!map[key]) {
        map[key] = {
          key,
          name,
          netWeight: 0,
          dc: 0,
          purchaseAmount: 0,
          purchasePayment: 0,
          invoicePayment: 0,
          remainingPayment: 0,
          billsCount: 0,
          records: []
        };
      }

      map[key].netWeight += r.netWeight;
      map[key].dc += r.dc;
      map[key].purchaseAmount += r.purchaseAmount;
      map[key].purchasePayment += r.purchasePayment;
      map[key].invoicePayment += r.invoicePayment;
      map[key].remainingPayment += r.remainingPayment;
      map[key].billsCount += 1;
      map[key].records.push(r);
    });

    return Object.values(map);
  }, [records, activeTab]);

  // Selected group details
  const selectedGroupDetails = useMemo(() => {
    if (!selectedEntity) return null;
    return groupedData.find(g => g.key === selectedEntity) || null;
  }, [groupedData, selectedEntity]);

  // Export CSV
  const handleExport = () => {
    if (!records.length) return;
    const headers = [
      "Date", "PO / Bill No", "Contract No", "Salesman", "Country", "Branch", 
      "Goods Name", "Supplier", "Net Weight (Kg)", "DC (Cartons)", 
      "Purchase Amount (PKR)", "Purchase Payment (PKR)", "Invoice Payment (PKR)", "Remaining Payment (PKR)"
    ];
    const csvContent = [
      headers.join(","),
      ...records.map(r => [
        r.date, r.purchase_order_no, r.purchase_contract_no, r.salesman, r.country, r.branch,
        r.goodsName, r.supplier, r.netWeight, r.dc, r.purchaseAmount, r.purchasePayment, r.invoicePayment, r.remainingPayment
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `journal-stock-report-${activeTab}-${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950 min-h-screen">
      
      {/* ── Top Bar (Falcon Theme style) ── */}
      <div className="flex flex-wrap items-center justify-between text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">ACTIVE BRANCH:</span>
          <span className="text-blue-600 dark:text-blue-400 font-extrabold">{session?.branchName || "PAKISTAN MAIN BRANCH"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">OPERATOR:</span>
          <span className="text-slate-900 dark:text-white font-extrabold">{session?.fullName || "SUPER ADMIN"}</span>
        </div>
        <div className="flex items-center gap-3 font-mono" suppressHydrationWarning>
          <div>DATE: <span className="text-slate-800 dark:text-slate-200 font-bold">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span></div>
          <div>TIME: <span className="text-slate-800 dark:text-slate-200 font-bold">{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span></div>
        </div>
      </div>

      {/* ── Page Title & Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-tight">
              {activeTab === "salesman" ? "Salesman Performance Report" : activeTab === "country" ? "Country Summary Dashboard" : "Branch Summary Dashboard"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Consolidated Journal Stock and Financial Performance Analytics
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {/* Collapsible filters panel */}
          <div className="relative">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-bold uppercase transition-all duration-150 ${filtersOpen ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {filtersOpen && (
              <div className="absolute right-0 mt-2 w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800 dark:text-slate-100">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Advanced Filters</span>
                  <button onClick={() => setFiltersOpen(false)} className="text-slate-400 hover:text-slate-650">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Date From</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Date To</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Country</label>
                    <select value={selectedCountryId} onChange={e => setSelectedCountryId(e.target.value)}
                      className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs outline-none focus:border-blue-500">
                      <option value="all">All Countries</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Branch</label>
                    <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
                      className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs outline-none focus:border-blue-500">
                      <option value="all">All Branches</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Salesman</label>
                    <select value={selectedSalesmanId} onChange={e => setSelectedSalesmanId(e.target.value)}
                      className="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs outline-none focus:border-blue-500">
                      <option value="all">All Salesmen</option>
                      {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={fetchReport} className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all">
                      Apply Filters
                    </button>
                    <button onClick={handleResetFilters} className="h-8 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all">
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase border border-slate-200 dark:border-slate-800 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d2d6b] hover:bg-[#0a2456] text-white rounded-xl text-xs font-bold uppercase transition-all duration-150"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          icon={Scale}
          label="Total Net Weight"
          value={`${fmtNum(summary?.totalNetWeight ?? 0, 0)} Kg`}
          iconBg="bg-blue-600"
        />
        <SummaryCard
          icon={Package}
          label="Total DC"
          value={`${fmtNum(summary?.totalDC ?? 0, 0)} Ctn`}
          subtext="Direct Cartons"
          iconBg="bg-emerald-600"
        />
        <SummaryCard
          icon={Coins}
          label="Total Purchase"
          value={`${fmtNum(summary?.totalPurchaseAmount ?? 0, 2)} PKR`}
          iconBg="bg-violet-600"
        />
        <SummaryCard
          icon={ArrowUpRight}
          label="Purchase Payment"
          value={`${fmtNum(summary?.totalPurchasePayment ?? 0, 2)} PKR`}
          subtext="Paid to Suppliers"
          iconBg="bg-sky-600"
        />
        <SummaryCard
          icon={ArrowDownLeft}
          label="Invoice Payment"
          value={`${fmtNum(summary?.totalInvoicePayment ?? 0, 2)} PKR`}
          subtext="Received from Customers"
          iconBg="bg-indigo-650"
        />
        <SummaryCard
          icon={FileText}
          label="Remaining Payment"
          value={`${fmtNum(summary?.remainingPayment ?? 0, 2)} PKR`}
          subtext="Outstanding from Customers"
          iconBg="bg-rose-600"
        />
      </div>

      {/* ── Tabs selector ── */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto select-none print:hidden">
        {[
          { id: "country", label: "Country Summary", icon: Globe },
          { id: "salesman", label: "Salesman Summary", icon: Building2 },
          { id: "branch", label: "Branch Summary", icon: MapPin }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as "salesman" | "country" | "branch");
                setSelectedEntity(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black uppercase text-[11px] tracking-wider transition-all duration-150 whitespace-nowrap ${isActive ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-slate-900/50" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:hover:text-slate-350"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Summary Table ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Consolidated {activeTab === "salesman" ? "Salesperson" : activeTab === "country" ? "Country" : "Branch"} Performance Overview
          </h3>
          <span className="text-[10px] font-mono font-black text-slate-400">
            Records Found: {groupedData.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead className="bg-slate-900 text-white text-[9px] font-extrabold uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-3 border-r border-slate-700">
                  {activeTab === "salesman" ? "Salesman Name" : activeTab === "country" ? "Country Name" : "Branch Name"}
                </th>
                <th className="p-3 text-center border-r border-slate-700">No. of Bills</th>
                <th className="p-3 text-right border-r border-slate-700">Net Weight (Kg)</th>
                <th className="p-3 text-right border-r border-slate-700">DC (Cartons)</th>
                <th className="p-3 text-right border-r border-slate-700">Total Purchase (PKR)</th>
                <th className="p-3 text-right border-r border-slate-700">Purchase Payment (PKR)</th>
                <th className="p-3 text-right border-r border-slate-700">Invoice Payment (PKR)</th>
                <th className="p-3 text-right border-r border-slate-700">Remaining Payment (PKR)</th>
                <th className="p-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[10px] font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-mono">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Crunching stock reports data...
                  </td>
                </tr>
              ) : groupedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-sans">
                    <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No report records match the selected filters</p>
                  </td>
                </tr>
              ) : (
                groupedData.map(row => {
                  const isSelected = selectedEntity === row.key;
                  return (
                    <tr
                      key={row.key}
                      onClick={() => setSelectedEntity(isSelected ? null : row.key)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50/40 dark:bg-blue-950/20 font-bold" : ""}`}
                    >
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-extrabold">
                        {row.name}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800 tabular-nums">
                        {row.billsCount}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums">
                        {fmtNum(row.netWeight, 0)}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums">
                        {fmtNum(row.dc, 0)}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums text-slate-900 dark:text-slate-100 font-extrabold">
                        {fmtNum(row.purchaseAmount, 2)}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums text-sky-600 dark:text-sky-400">
                        {fmtNum(row.purchasePayment, 2)}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtNum(row.invoicePayment, 2)}
                      </td>
                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800 tabular-nums text-rose-600 dark:text-rose-400">
                        {fmtNum(row.remainingPayment, 2)}
                      </td>
                      <td className="p-3 text-center print:hidden" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedEntity(isSelected ? null : row.key)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          {isSelected ? "Hide Details" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Row */}
            {!loading && groupedData.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-850 font-black text-slate-900 dark:text-slate-100 text-[10px]">
                <tr className="border-t border-slate-300 dark:border-slate-750">
                  <td className="p-3 text-left border-r border-slate-250 dark:border-slate-750">TOTAL</td>
                  <td className="p-3 text-center border-r border-slate-250 dark:border-slate-750 tabular-nums">
                    {groupedData.reduce((sum, r) => sum + r.billsCount, 0)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.netWeight, 0), 0)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.dc, 0), 0)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.purchaseAmount, 0), 2)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums text-sky-600 dark:text-sky-400">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.purchasePayment, 0), 2)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.invoicePayment, 0), 2)}
                  </td>
                  <td className="p-3 text-right border-r border-slate-250 dark:border-slate-750 tabular-nums text-rose-600 dark:text-rose-400">
                    {fmtNum(groupedData.reduce((sum, r) => sum + r.remainingPayment, 0), 2)}
                  </td>
                  <td className="p-3 border-none print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Country / Salesman / Branch Wise Details (Breakdown Section) ── */}
      {selectedGroupDetails && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                {activeTab === "salesman" ? "Salesman" : activeTab === "country" ? "Country" : "Branch"} Wise Details: {selectedGroupDetails.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* KPI Cards inside breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Weight</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums">
                  {fmtNum(selectedGroupDetails.netWeight, 0)} Kg
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cartons (DC)</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums">
                  {fmtNum(selectedGroupDetails.dc, 0)} Ctn
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums text-violet-600">
                  {fmtNum(selectedGroupDetails.purchaseAmount, 2)} PKR
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Purchase Payment</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums text-sky-600">
                  {fmtNum(selectedGroupDetails.purchasePayment, 2)} PKR
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice Payment</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums text-emerald-600">
                  {fmtNum(selectedGroupDetails.invoicePayment, 2)} PKR
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Remaining Payment</span>
                <p className="text-base font-black text-slate-850 dark:text-slate-100 mt-1 tabular-nums text-rose-600">
                  {fmtNum(selectedGroupDetails.remainingPayment, 2)} PKR
                </p>
              </div>
            </div>

            {/* Bill Details Register table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Detailed Bills Register for {selectedGroupDetails.name}
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  <thead className="bg-slate-850 text-white text-[9px] font-extrabold uppercase tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Bill Number</th>
                      <th className="p-2.5">Contract No</th>
                      <th className="p-2.5">Supplier</th>
                      <th className="p-2.5">Goods Name</th>
                      <th className="p-2.5 text-right">Weight (Kg)</th>
                      <th className="p-2.5 text-right">DC (Ctn)</th>
                      <th className="p-2.5 text-right">Purchase (PKR)</th>
                      <th className="p-2.5 text-right">Purchase Pay (PKR)</th>
                      <th className="p-2.5 text-right">Invoice Pay (PKR)</th>
                      <th className="p-2.5 text-right">Remaining (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-850 text-[10px] font-medium">
                    {selectedGroupDetails.records.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                        <td className="p-2.5 tabular-nums text-slate-500">{fmtDate(rec.date)}</td>
                        <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{rec.purchase_order_no}</td>
                        <td className="p-2.5 font-mono text-slate-650">{rec.purchase_contract_no}</td>
                        <td className="p-2.5 truncate max-w-[120px]">{rec.supplier}</td>
                        <td className="p-2.5 text-slate-800 dark:text-slate-250 truncate max-w-[140px]">{rec.goodsName}</td>
                        <td className="p-2.5 text-right tabular-nums">{fmtNum(rec.netWeight, 0)}</td>
                        <td className="p-2.5 text-right tabular-nums">{fmtNum(rec.dc, 0)}</td>
                        <td className="p-2.5 text-right tabular-nums font-bold text-slate-850 dark:text-slate-100">{fmtNum(rec.purchaseAmount, 2)}</td>
                        <td className="p-2.5 text-right tabular-nums text-sky-600">{fmtNum(rec.purchasePayment, 2)}</td>
                        <td className="p-2.5 text-right tabular-nums text-emerald-600">{fmtNum(rec.invoicePayment, 2)}</td>
                        <td className="p-2.5 text-right tabular-nums text-rose-600">{fmtNum(rec.remainingPayment, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
