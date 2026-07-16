"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Mail, MoreVertical, Printer, RefreshCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openSalesA4ReportWindow } from "@/lib/reports/open-sales-a4-report-window";
import { apiGet } from "@/lib/api/client";

type SalesReport = {
  id: string;
  salesBookingOrderNumber: string;
  salesDate: string;
  bookingDate: string;
  salesAccountName: string;
  salesAccountNumber: string;
  customerName: string;
  productName: string;
  goodsDescription: string;
  quantity: number;
  unit: string;
  totalWeight: number;
  containerCount: number;
  salesRate: number;
  totalSalesAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  branchName: string;
  countryName: string;
  createdAt: string;
  form_data?: any;
  audit: {
    userName: string;
    userId: string;
    branchCode: string;
  };
};

export function SalesBookingJournalReportView() {
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [countryId, setCountryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");

  const [countries, setCountries] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await apiGet<{ countries: any[] }>("/api/erp/locations/countries");
        setCountries(res.countries || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    if (!countryId) {
      setBranches([]);
      setBranchId("");
      return;
    }
    async function loadBranches() {
      try {
        const res = await apiGet<{ ok: boolean; data: { branches: any[] } }>(`/api/erp/locations/branches/main?countryId=${countryId}`);
        if (res.ok && res.data?.branches) {
          setBranches(res.data.branches);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadBranches();
  }, [countryId]);

  async function loadReports(searchQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qp = new URLSearchParams({ limit: "100" });
      if (searchQuery.trim()) qp.set("q", searchQuery.trim());
      if (countryId) qp.set("countryId", countryId);
      if (branchId) qp.set("countryBranchId", branchId);
      if (status) qp.set("q", status); // Status filter fallback in queries

      const res = await apiGet<{ reports: SalesReport[] }>(`/api/erp/sales/booking-journal-report?${qp.toString()}`);
      setReports(res.reports || []);
    } catch (err: any) {
      setError(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports(query).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId, branchId, status]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      amount: reports.reduce((sum, r) => sum + Number(r.totalSalesAmount || 0), 0),
      qty: reports.reduce((sum, r) => sum + Number(r.quantity || 0), 0),
      containers: reports.reduce((sum, r) => sum + Number(r.containerCount || 0), 0)
    };
  }, [reports]);

  function exportCsv() {
    const headers = ["SO Number", "Date", "Customer", "Product Details", "Qty", "Total Weight", "Containers", "Amount", "Status", "Payment", "Delivery"];
    const rows = reports.map((r) => [
      r.salesBookingOrderNumber,
      r.salesDate?.split("T")[0],
      r.customerName,
      r.goodsDescription,
      r.quantity,
      r.totalWeight,
      r.containerCount,
      r.totalSalesAmount,
      r.status,
      r.paymentStatus,
      r.deliveryStatus
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_booking_register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Search & Filters */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Search Records</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadReports(query);
              }}
              placeholder="Search sales order #, customer, brand..."
              className="bg-slate-950 border-slate-850 pl-9 text-xs text-white placeholder-slate-600 h-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Country</label>
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 h-10 text-xs text-white"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Branch Scope</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={!countryId}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 h-10 text-xs text-white disabled:opacity-40"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => void loadReports(query)}
            disabled={loading}
            variant="outline"
            className="border-slate-850 bg-slate-900/60 text-white h-10 px-3"
          >
            <RefreshCcw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>

          <Button
            onClick={exportCsv}
            disabled={reports.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 text-xs px-4"
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-bold block uppercase mb-1">Total Sales Orders</span>
          <span className="text-lg font-black text-white">{summary.total}</span>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-bold block uppercase mb-1">Total Weight</span>
          <span className="text-lg font-black text-white">{reports.reduce((sum, r) => sum + Number(r.totalWeight || 0), 0).toLocaleString()} KG</span>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-bold block uppercase mb-1">Total Containers Booked</span>
          <span className="text-lg font-black text-indigo-400">{summary.containers}</span>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl bg-indigo-950/20">
          <span className="text-xs text-indigo-400 font-bold block uppercase mb-1">Gross sales amount</span>
          <span className="text-lg font-black text-white">{summary.amount.toLocaleString()} USD</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/20">
        <table className="min-w-full text-xs text-left text-slate-350">
          <thead className="bg-slate-950 text-slate-450 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">SO Number</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer Details</th>
              <th className="px-6 py-4">Products / Description</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">Weight</th>
              <th className="px-6 py-4">Containers</th>
              <th className="px-6 py-4">Sales Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">Loading sales booking registry...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-500">No sales orders found.</td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/30">
                  <td className="px-6 py-4 font-mono font-bold text-white">{r.salesBookingOrderNumber}</td>
                  <td className="px-6 py-4 text-slate-400">{r.salesDate?.split("T")[0]}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{r.customerName}</div>
                    <div className="text-[10px] text-slate-500">{r.branchName} • {r.countryName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-200">{r.productName}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-xs">{r.goodsDescription}</div>
                  </td>
                  <td className="px-6 py-4">{r.quantity?.toLocaleString()} {r.unit}</td>
                  <td className="px-6 py-4">{r.totalWeight?.toLocaleString()} KG</td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-400">{r.containerCount}</td>
                  <td className="px-6 py-4 font-black text-white">{r.totalSalesAmount?.toLocaleString()} {r.currency}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === "Confirmed" 
                        ? "bg-indigo-950 text-indigo-400 border border-indigo-900" 
                        : "bg-slate-900 text-slate-500 border border-slate-800"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      onClick={() => openSalesA4ReportWindow({ title: "Sales Booking Invoice", salesData: r })}
                      variant="outline"
                      className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-950 text-xs px-2 py-1 h-auto"
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
