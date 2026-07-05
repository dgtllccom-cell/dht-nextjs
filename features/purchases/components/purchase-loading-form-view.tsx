"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Link2, MoreVertical, Printer, RefreshCcw, Search, Ship, CheckCircle2, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoadingStatus = "draft" | "pending" | "loaded" | "received" | "cancelled";

const containerTypes = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];
const statusOptions: Array<LoadingStatus> = ["pending", "loaded", "draft", "received", "cancelled"];

export function PurchaseLoadingFormView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  const [form, setForm] = useState({
    containerNumber: "",
    containerType: "40 FT",
    loadingStatus: "pending" as LoadingStatus,
    loadedAt: "",
    loadingLocation: "",
    receivingLocation: "",
    shipmentStatus: "open",
    carrierName: "",
    remarks: ""
  });

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const [poRes, lrRes] = await Promise.all([
        fetch("/api/erp/purchases/orders?limit=300", { cache: "no-store" }),
        fetch("/api/erp/purchases/loading-records?limit=300", { cache: "no-store" })
      ]);

      const poPayload = await poRes.json().catch(() => ({}));
      const lrPayload = await lrRes.json().catch(() => ({}));

      const allOrders = Array.isArray(poPayload.data) ? poPayload.data : (poPayload.data?.orders || poPayload.orders || []);
      const allLoadingRecords = lrPayload.data?.records || [];

      setOrders(allOrders);
      setLoadingRecords(allLoadingRecords);
      setSelectedPO(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const pendingLoadingOrders = useMemo(() => {
    const loadedPONumbers = new Set(loadingRecords.map(r => r.purchase_order_no).filter(Boolean));

    return orders.filter(row => {
      if (loadedPONumbers.has(row.purchase_order_no)) return false;

      // Filter logic: Must be advanced paid, or partially paid and cleared, or completely paid.
      // But based on user requirements: "jab advance payment ho jayega fir wapas loading mein aa jayega"
      const status = (row.payment_status || "").toLowerCase();
      const isAdvancePaid = status.includes("advance paid") || status.includes("paid") || status.includes("clear");
      
      const form = row.form_data?.form || {};
      const advancePercent = Number(form.advancePercent || 0);
      const paidAdvance = Number(row.advance_paid || 0);
      
      // Also check if advance is explicitly paid even if status is not exactly that, 
      // or if it was 0% advance but payment status is partial (meaning it was transferred)
      const hasMetAdvanceReq = advancePercent > 0 ? paidAdvance > 0 : (status === "partial" || status === "advance pending" || isAdvancePaid);

      if (!isAdvancePaid && !hasMetAdvanceReq) return false;
      if (row.ledger_posting_status !== "Posted" && row.ledger_posting_status !== "posted") return false;

      if (!query) return true;
      const q = query.toLowerCase();
      return row.purchase_order_no?.toLowerCase().includes(q) || 
             row.supplierName?.toLowerCase().includes(q) || 
             form.salesAccountName?.toLowerCase().includes(q);
    });
  }, [orders, loadingRecords, query]);

  async function saveRecord() {
    if (!selectedPO) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/erp/purchases/loading-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderNo: selectedPO.purchase_order_no,
          containerNumber: form.containerNumber,
          containerType: form.containerType,
          loadingStatus: form.loadingStatus,
          loadedAt: form.loadedAt ? new Date(form.loadedAt).toISOString() : null,
          loadingLocation: form.loadingLocation || selectedPO.form_data?.form?.loadingLocation,
          receivingLocation: form.receivingLocation || selectedPO.form_data?.form?.destinationCountry,
          shipmentStatus: form.shipmentStatus,
          carrierName: form.carrierName,
          remarks: form.remarks,
          reportPayload: {
            standalone: false,
            explicitPurchaseOrderLink: true,
            sourceModule: "purchase-loading-form"
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || payload.error || "Failed to save loading record.");
      }
      
      setMessage(`Successfully created loading record for ${selectedPO.purchase_order_no}`);
      setForm({
        containerNumber: "",
        containerType: "40 FT",
        loadingStatus: "pending",
        loadedAt: "",
        loadingLocation: "",
        receivingLocation: "",
        shipmentStatus: "open",
        carrierName: "",
        remarks: ""
      });
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error saving loading record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">Purchase Workflow</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Ready for Loading</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select a purchase order that has cleared advance payment to generate a container loading record.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCcw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
            Refresh List
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4 text-sm font-medium text-blue-800 dark:text-blue-300">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_450px]">
        {/* Left Side: PO List */}
        <Card className="flex flex-col border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-4">
            <div>
              <h2 className="text-sm font-black flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Pending Loading List
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bills with advance payment completed.</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PO Number..."
                className="h-8 w-60 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-950">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading pending orders...</div>
            ) : pendingLoadingOrders.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center px-4">
                <Ship className="h-10 w-10 text-slate-200 dark:text-slate-800 mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Orders Ready for Loading</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">All cleared purchase orders have been processed into loading records, or there are no bills with completed advance payments.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black">
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Goods</th>
                    <th className="px-4 py-3 text-right">Advance Paid</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingLoadingOrders.map((row) => {
                    const form = row.form_data?.form || {};
                    const isSelected = selectedPO?.id === row.id;
                    return (
                      <tr 
                        key={row.id} 
                        onClick={() => setSelectedPO(row)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50",
                          isSelected && "bg-blue-50/50 dark:bg-blue-900/20"
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {row.purchase_order_no}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {new Date(row.created_at).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          {form.salesAccountName || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {form.goodsName || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                          {Number(row.advance_paid || 0).toLocaleString()} {row.currency_code || "USD"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            variant={isSelected ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 text-[10px] uppercase font-bold tracking-wider"
                          >
                            Select
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Right Side: Generation Form */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-4">
            <h2 className="text-sm font-black flex items-center gap-2">
              <Ship className="h-4 w-4 text-blue-600" />
              Generate Loading Record
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fill container details for the selected order.</p>
          </div>

          <CardContent className="flex-1 p-5 space-y-4">
            {!selectedPO ? (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
                <ArrowRight className="h-8 w-8 mb-2" />
                <p className="text-sm font-bold">Select a PO first</p>
                <p className="text-xs">Choose an order from the list to begin.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 p-3 mb-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Selected Order</div>
                  <div className="font-mono text-sm font-bold">{selectedPO.purchase_order_no}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{selectedPO.form_data?.form?.salesAccountName}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Container Number <span className="text-red-500">*</span></label>
                  <input 
                    value={form.containerNumber} 
                    onChange={(e) => setForm(f => ({ ...f, containerNumber: e.target.value }))}
                    placeholder="e.g. MSKU-1234567" 
                    className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Container Type</label>
                  <select 
                    value={form.containerType} 
                    onChange={(e) => setForm(f => ({ ...f, containerType: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    {containerTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Loading Status</label>
                    <select 
                      value={form.loadingStatus} 
                      onChange={(e) => setForm(f => ({ ...f, loadingStatus: e.target.value as LoadingStatus }))}
                      className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 capitalize"
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Loaded Date</label>
                    <input 
                      type="datetime-local" 
                      value={form.loadedAt} 
                      onChange={(e) => setForm(f => ({ ...f, loadedAt: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Loading Location</label>
                    <input 
                      value={form.loadingLocation || selectedPO.form_data?.form?.loadingLocation || ""} 
                      onChange={(e) => setForm(f => ({ ...f, loadingLocation: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Receiving Loc.</label>
                    <input 
                      value={form.receivingLocation || selectedPO.form_data?.form?.destinationCountry || ""} 
                      onChange={(e) => setForm(f => ({ ...f, receivingLocation: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Carrier Name</label>
                  <input 
                    value={form.carrierName} 
                    onChange={(e) => setForm(f => ({ ...f, carrierName: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" 
                  />
                </div>

                <Button 
                  className="w-full mt-4 h-10 font-bold bg-blue-600 hover:bg-blue-700" 
                  onClick={() => void saveRecord()} 
                  disabled={saving || !form.containerNumber.trim()}
                >
                  {saving ? "Generating Record..." : "Generate Loading Record"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
