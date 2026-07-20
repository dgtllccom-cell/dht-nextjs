"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { fetchWarehouses } from "@/features/warehouses/warehouse-api";
import {
  Package, Search, Coins, Loader2, Truck, Globe, Pencil, CheckCircle2, X, ChevronDown, Building2, FileText, Send, Eye, MoreVertical, Edit3, ArrowRight, ArrowLeft
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LocalGoodsReceiptType = "warehouse" | "loading" | "export";

function localGoodsReceiptTypeFromShipment(value: unknown): LocalGoodsReceiptType {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("warehouse")) return "warehouse";
  if (normalized.includes("export")) return "export";
  return "loading";
}

function localGoodsReceiptCompletedStatus(type: LocalGoodsReceiptType) {
  if (type === "warehouse") return "Warehouse Received";
  if (type === "export") return "Export Completed";
  return "Loading Completed";
}

function localGoodsReceiptLabel(type: LocalGoodsReceiptType) {
  if (type === "warehouse") return "Warehouse";
  if (type === "export") return "Export";
  return "Loading";
}

function money(value: unknown, currency?: string) {
  const amount = Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

interface LocalGoodsReceivedViewProps {
  session: any;
  countryBranches: any[];
  cityBranches: any[];
}

export function LocalGoodsReceivedView({
  session,
  countryBranches,
  cityBranches,
}: LocalGoodsReceivedViewProps) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [goodsReceivedTab, setGoodsReceivedTab] = useState<LocalGoodsReceiptType>("warehouse");
  const [activeGoodsReceipt, setActiveGoodsReceipt] = useState<{ type: LocalGoodsReceiptType; row: any } | null>(null);
  const [savingGoodsReceipt, setSavingGoodsReceipt] = useState(false);

  // Scoping location select states
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCityBranchId, setSelectedCityBranchId] = useState("");

  // Warehouse list states
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // Fetch warehouses on mount
  useEffect(() => {
    async function loadWarehouses() {
      try {
        setLoadingWarehouses(true);
        const data = await fetchWarehouses();
        setWarehousesList(data);
      } catch (err) {
        console.error("Failed to load warehouses:", err);
      } finally {
        setLoadingWarehouses(false);
      }
    }
    loadWarehouses();
  }, []);

  // Derived Country options from branches list
  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    countryBranches.forEach(b => {
      const cId = b.countryId || b.country_id;
      const cName = b.countryName || b.country_name || b.name;
      if (cId && !map.has(cId)) {
        map.set(cId, cName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [countryBranches]);

  // Filtered country branches based on selected country
  const filteredCountryBranches = useMemo(() => {
    if (!selectedCountryId) return countryBranches;
    return countryBranches.filter(b => (b.countryId || b.country_id) === selectedCountryId);
  }, [countryBranches, selectedCountryId]);

  // Selected Active Branch object
  const activeBranch = useMemo(() => {
    return countryBranches.find(b => b.id === selectedBranchId) || filteredCountryBranches[0] || countryBranches[0];
  }, [countryBranches, filteredCountryBranches, selectedBranchId]);

  // Selected Active City Branches
  const activeCityBranches = useMemo(() => {
    if (!selectedBranchId) return [];
    return cityBranches.filter(c => c.countryBranchId === selectedBranchId || c.country_branch_id === selectedBranchId);
  }, [cityBranches, selectedBranchId]);

  const localCurrency = useMemo(() => {
    return activeBranch?.localCurrency || activeBranch?.local_currency || activeBranch?.currency || "PKR";
  }, [activeBranch]);

  // On mount or location change, load registry logs
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      let query = "/api/erp/purchases/local-purchase";
      const params = new URLSearchParams();
      if (selectedCountryId) params.append("countryId", selectedCountryId);
      if (selectedBranchId) params.append("countryBranchId", selectedBranchId);
      if (selectedCityBranchId) params.append("cityBranchId", selectedCityBranchId);
      if (params.toString()) query += `?${params.toString()}`;

      const res = await fetch(query);
      const payload = await res.json();
      if (payload.ok && payload.data?.purchases) {
        setPurchases(payload.data.purchases);
      }
    } catch (err) {
      console.error("Failed to load local purchases:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (countryBranches.length > 0) {
      const match = countryBranches[0];
      setSelectedCountryId(match.countryId || match.country_id || "");
      setSelectedBranchId(match.id || "");
    }
  }, [countryBranches]);

  useEffect(() => {
    void loadHistory();
  }, [selectedCountryId, selectedBranchId, selectedCityBranchId]);

  // Filter purchases by text search
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const q = searchQuery.toLowerCase();
      return (p.goodsName || p.goods_name || "").toLowerCase().includes(q) ||
             (p.supplierName || p.supplier_name || "").toLowerCase().includes(q) ||
             (p.paymentMode || p.payment_mode || "").toLowerCase().includes(q) ||
             (p.shippingMode || p.shipping_mode || "").toLowerCase().includes(q) ||
             (p.truckNo || p.truck_no || "").toLowerCase().includes(q) ||
             (p.driverName || p.driver_name || "").toLowerCase().includes(q);
    });
  }, [purchases, searchQuery]);

  // Group filtered purchases into tabs for local goods receipt
  const localGoodsReceivedDashboard = useMemo(() => {
    const empty = { warehouse: [] as any[], loading: [] as any[], export: [] as any[] };
    filteredPurchases.forEach((row: any) => {
      const status = String(row.status || row.bill_status || "draft").toLowerCase();
      // Route only accepted or transferred bills (routed by shipment type into one receiving process)
      const isEligible = ["accepted", "transferred", "posted", "paid"].includes(status) || row.transferred_at || row.transferredAt;
      if (!isEligible) return;
      const type = localGoodsReceiptTypeFromShipment(row.shipping_mode || row.shippingMode || row.shipment_type || row.shipmentType);
      empty[type].push(row);
    });
    return empty;
  }, [filteredPurchases]);

  const activeGoodsReceivedRows = localGoodsReceivedDashboard[goodsReceivedTab] || [];

  // Handle Goods Receipt submission
  async function saveLocalGoodsReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGoodsReceipt?.row?.id) return;
    const formData = new FormData(event.currentTarget);
    const details = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
    const status = localGoodsReceiptCompletedStatus(activeGoodsReceipt.type);

    try {
      setSavingGoodsReceipt(true);
      const res = await fetch("/api/erp/purchases/local-purchase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: activeGoodsReceipt.row.id,
          receiptType: activeGoodsReceipt.type,
          status,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error?.message || "Failed to save local goods receipt.");
      setPurchases((prev: any[]) => prev.map((row: any) => row.id === activeGoodsReceipt.row.id ? data.data.purchase : row));
      setActiveGoodsReceipt(null);
    } catch (err: any) {
      alert(err.message || "Failed to save local goods receipt.");
    } finally {
      setSavingGoodsReceipt(false);
    }
  }

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-6">
      
      {/* Context Location Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Local Goods Received</h1>
            <p className="text-xs text-slate-500 font-medium">Route and process accepted local purchase bills by shipment type.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {countryOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-500" /> Country
              </span>
              <select
                value={selectedCountryId}
                onChange={e => setSelectedCountryId(e.target.value)}
                className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="">All Countries</option>
                {countryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Country Branch</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-blue-500"
            >
              {filteredCountryBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {activeCityBranches.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City Branch</span>
              <select
                value={selectedCityBranchId}
                onChange={e => setSelectedCityBranchId(e.target.value)}
                className="h-9 w-44 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="">Select City Branch...</option>
                {activeCityBranches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Search Registry Bar */}
          <div className="flex flex-col gap-1 w-48 sm:w-60">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Registry</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search item, vendor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Receiving Module Card */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
                <Package className="h-4 w-4 text-emerald-600" /> Local Goods Received
              </CardTitle>
              <p className="mt-1 text-xs font-semibold text-slate-500">Accepted / transferred local purchase bills are routed by shipment type into one receiving process only.</p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(["warehouse", "export", "loading"] as LocalGoodsReceiptType[]).map(type => (
                <button key={type} type="button" onClick={() => setGoodsReceivedTab(type)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition ${goodsReceivedTab === type ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>
                  {localGoodsReceiptLabel(type)} ({localGoodsReceivedDashboard[type].length})
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 font-mono">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-650 mb-2" />
                Loading pending bills...
              </div>
            ) : (
              <table className="w-full min-w-[1500px] border-collapse text-left text-[10px]">
                <thead className="bg-slate-900 text-[9px] font-black uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-2 py-2">Local Purchase Bill No</th>
                    <th className="px-2 py-2">Manual Bill No</th>
                    <th className="px-2 py-2">Journal Serial</th>
                    <th className="px-2 py-2">Country Serial</th>
                    <th className="px-2 py-2">Branch Serial</th>
                    <th className="px-2 py-2">Country</th>
                    <th className="px-2 py-2">Branch</th>
                    <th className="px-2 py-2">Supplier / Party Name</th>
                    <th className="px-2 py-2">Goods Name</th>
                    <th className="px-2 py-2 text-right">Quantity</th>
                    <th className="px-2 py-2 text-right">Gross Weight</th>
                    <th className="px-2 py-2 text-right">Net Weight</th>
                    <th className="px-2 py-2">Shipment Type</th>
                    <th className="px-2 py-2 text-right">Purchase Amount</th>
                    <th className="px-2 py-2 text-right">Final Amount</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">User Name</th>
                    <th className="px-2 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeGoodsReceivedRows.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="px-4 py-10 text-center text-xs font-bold text-slate-400">
                        No {localGoodsReceiptLabel(goodsReceivedTab).toLowerCase()} bills are pending in Local Goods Received.
                      </td>
                    </tr>
                  ) : (
                    activeGoodsReceivedRows.map((row: any) => {
                      const rowCurrency = row.local_currency || row.localCurrency || row.purchase_currency || row.purchaseCurrency || localCurrency || "PKR";
                      const shipment = row.shipping_mode || row.shippingMode || row.shipment_type || row.shipmentType || localGoodsReceiptLabel(goodsReceivedTab);
                      const status = row.goods_receipt_status || row.goodsReceiptStatus || "Pending Receipt";
                      const billNo = row.journal_serial_no || row.serial_no || row.serialNo || row.bill_no || row.billNo || ("LP-" + String(row.id || "").slice(0, 8));
                      return (
                        <tr key={`received-${row.id}`} className="cursor-pointer hover:bg-emerald-50/50" onClick={() => setActiveGoodsReceipt({ type: goodsReceivedTab, row })}>
                          <td className="px-2 py-2 font-mono font-black text-blue-700">{billNo}</td>
                          <td className="px-2 py-2 font-mono text-slate-600">{row.manual_bill_no || row.manualBillNo || "-"}</td>
                          <td className="px-2 py-2 font-mono text-slate-600">{row.journal_serial_no || row.journalSerialNo || "-"}</td>
                          <td className="px-2 py-2 font-mono text-slate-600">{row.country_serial_no || row.countrySerialNo || "-"}</td>
                          <td className="px-2 py-2 font-mono text-slate-600">{row.branch_serial_no || row.branchSerialNo || "-"}</td>
                          <td className="px-2 py-2 font-semibold text-slate-700">{row.country_name || row.countryName || activeBranch?.countryName || activeBranch?.country_name || "-"}</td>
                          <td className="px-2 py-2 font-semibold text-slate-700">{row.city_branch_name || row.cityBranchName || row.branch_name || row.branchName || activeBranch?.name || "-"}</td>
                          <td className="px-2 py-2 font-bold text-slate-800">{row.supplier_name || row.supplierName || "Local Vendor"}</td>
                          <td className="px-2 py-2 font-black text-slate-900">{row.goods_name || row.goodsName || "-"}</td>
                          <td className="px-2 py-2 text-right font-mono font-bold">{Number(row.quantity_kgs || row.quantityKgs || 0).toLocaleString()} {row.quantity_name || row.quantityName || ""}</td>
                          <td className="px-2 py-2 text-right font-mono">{Number(row.total_gross_weight || row.totalGrossWeight || 0).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-blue-700">{Number(row.net_weight || row.netWeight || 0).toLocaleString()} kg</td>
                          <td className="px-2 py-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-black text-slate-700">{shipment}</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{money(row.purchase_cost || row.purchaseCost || 0, row.purchase_currency || row.purchaseCurrency || rowCurrency)}</td>
                          <td className="px-2 py-2 text-right font-mono font-black text-emerald-700">{money(row.final_cost || row.finalCost || row.purchase_cost || 0, rowCurrency)}</td>
                          <td className="px-2 py-2">
                            <span className={`rounded-full px-2 py-0.5 font-black ${String(status).includes("Completed") || String(status).includes("Received") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{status}</span>
                          </td>
                          <td className="px-2 py-2 font-mono text-slate-500">{new Date(row.created_at || row.createdAt || Date.now()).toLocaleDateString("en-GB")}</td>
                          <td className="px-2 py-2 font-semibold text-slate-700">{row.created_by_name || row.userName || session.fullName || session.email || "Admin"}</td>
                          <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <Button type="button" size="sm" variant="outline" onClick={() => setActiveGoodsReceipt({ type: goodsReceivedTab, row })} className="h-7 rounded-lg px-2 text-[10px] font-black">Open Form</Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* activeGoodsReceipt Modal Form */}
      {activeGoodsReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={saveLocalGoodsReceipt} className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-750">Local Goods Received</p>
                <h3 className="mt-1 text-lg font-black text-slate-900">{localGoodsReceiptLabel(activeGoodsReceipt.type)} Receipt Form</h3>
                <p className="text-xs font-semibold text-slate-500">Bill is routed from Local Purchase by shipment type. Existing accounting posting remains unchanged.</p>
              </div>
              <button type="button" onClick={() => setActiveGoodsReceipt(null)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-145px)] overflow-y-auto p-5">
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600">Bill Number</span>
                  <p className="mt-1 font-mono text-sm font-black text-slate-900">{activeGoodsReceipt.row.journal_serial_no || activeGoodsReceipt.row.serial_no || activeGoodsReceipt.row.bill_no || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Supplier / Party</span>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{activeGoodsReceipt.row.supplier_name || activeGoodsReceipt.row.supplierName || "Local Vendor"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Goods</span>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{activeGoodsReceipt.row.goods_name || activeGoodsReceipt.row.goodsName || "-"}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Quantity / Net WT</span>
                  <p className="mt-1 text-sm font-black text-slate-900">{Number(activeGoodsReceipt.row.quantity_kgs || activeGoodsReceipt.row.quantityKgs || 0).toLocaleString()} / {Number(activeGoodsReceipt.row.net_weight || activeGoodsReceipt.row.netWeight || 0).toLocaleString()} kg</p>
                </div>
              </div>

              {activeGoodsReceipt.type === "warehouse" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Warehouse Name<input name="warehouseName" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Warehouse Location<input name="warehouseLocation" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Receiving Date<input name="receivingDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Received Quantity<input name="receivedQuantity" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.quantity_kgs || activeGoodsReceipt.row.quantityKgs || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Gross Weight<input name="grossWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.total_gross_weight || activeGoodsReceipt.row.totalGrossWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Net Weight<input name="netWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.net_weight || activeGoodsReceipt.row.netWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Damage / Shortage<input name="damageShortage" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Received By<input name="receivedBy" defaultValue={session.fullName || session.email || "Admin"} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                </div>
              )}

              {activeGoodsReceipt.type === "loading" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Truck Number<input name="truckNumber" defaultValue={activeGoodsReceipt.row.truck_no || activeGoodsReceipt.row.truckNo || ""} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Driver Name<input name="driverName" defaultValue={activeGoodsReceipt.row.driver_name || activeGoodsReceipt.row.driver_name || ""} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Driver Mobile<input name="driverMobile" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Loading Date<input name="loadingDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Loading Location<input name="loadingLocation" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Destination<input name="destination" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Loaded Quantity<input name="loadedQuantity" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.quantity_kgs || activeGoodsReceipt.row.quantityKgs || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Loading Charges<input name="loadingCharges" type="number" step="0.01" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Gross Weight<input name="grossWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.total_gross_weight || activeGoodsReceipt.row.totalGrossWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Net Weight<input name="netWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.net_weight || activeGoodsReceipt.row.netWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                </div>
              )}

              {activeGoodsReceipt.type === "export" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Export Country<input name="exportCountry" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Port / Border<input name="portBorder" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Container Number<input name="containerNumber" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Truck Number<input name="truckNumber" defaultValue={activeGoodsReceipt.row.truck_no || activeGoodsReceipt.row.truckNo || ""} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Export Date<input name="exportDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" required /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Export Quantity<input name="exportQuantity" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.quantity_kgs || activeGoodsReceipt.row.quantityKgs || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Gross Weight<input name="grossWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.total_gross_weight || activeGoodsReceipt.row.totalGrossWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Net Weight<input name="netWeight" type="number" step="0.01" defaultValue={Number(activeGoodsReceipt.row.net_weight || activeGoodsReceipt.row.netWeight || 0)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Export Document Number<input name="exportDocumentNumber" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                  <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">Shipping / Transport Details<input name="shippingTransportDetails" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-900" /></label>
                </div>
              )}

              <label className="mt-4 block space-y-1 text-[10px] font-black uppercase text-slate-500">Remarks<textarea name="remarks" rows={4} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold normal-case text-slate-900" placeholder="Enter receiving, loading, export notes or shortage details..." /></label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-[11px] font-bold text-slate-500">Saving this form updates only Local Goods Received status. Journal, Roznamcha and Ledger posting stay as-is.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveGoodsReceipt(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={savingGoodsReceipt} className="rounded-xl bg-emerald-600 font-black hover:bg-emerald-700 text-white">
                  {savingGoodsReceipt ? "Saving..." : `Save ${localGoodsReceiptLabel(activeGoodsReceipt.type)}`}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
