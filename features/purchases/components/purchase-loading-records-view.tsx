"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Link2, MoreVertical, Printer, RefreshCcw, Search, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewportActionMenu } from "@/components/ui/viewport-action-menu";
import { Card, CardContent } from "@/components/ui/card";
import { ErpPageActions } from "@/components/layout/erp-page-actions";
import { cn } from "@/lib/utils";

type LoadingStatus = "draft" | "pending" | "loaded" | "received" | "cancelled";

function CustomDropdown({ recordId }: { recordId: string }) {
  return (
    <ViewportActionMenu
      ariaLabel="Loading record actions"
      buttonClassName="grid h-7 w-7 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition"
      trigger={<MoreVertical className="h-3.5 w-3.5" />}
    >
      {(close) => (
        <div className="py-1">
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => close()}>Edit Record</button>
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition" onClick={() => close()}>Load Details</button>
          <button className="flex w-full items-center px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition" onClick={() => { close(); window.open(`/dashboard/purchase/purchase-loading-records/${recordId}`, "_self"); }}>View Full Details</button>
        </div>
      )}
    </ViewportActionMenu>
  );
}
type LoadingRecord = {
  id: string;
  loading_record_no: string;
  purchase_order_no: string | null;
  container_number: string;
  container_type: string | null;
  loading_status: LoadingStatus;
  loaded_at: string | null;
  loading_location: string | null;
  receiving_location: string | null;
  shipment_status: string | null;
  carrier_name: string | null;
  remarks: string | null;
  created_at: string;
  countries?: { name?: string | null; iso2?: string | null } | null;
  country_branches?: { name?: string | null; code?: string | null } | null;
  city_branches?: { name?: string | null; code?: string | null; city_name?: string | null } | null;
  purchase_orders?: { form_data?: any } | null;
};

type ApiPayload = {
  ok: boolean;
  data?: {
    records: LoadingRecord[];
    summary: {
      total: number;
      loaded: number;
      pending: number;
      received: number;
    };
    setupRequired?: boolean;
    setupMessage?: string | null;
  };
  error?: { message?: string } | string;
};

const statusOptions: Array<"all" | LoadingStatus> = ["all", "draft", "pending", "loaded", "received", "cancelled"];
const containerTypes = ["20 FT", "40 FT", "20 FT Reefer", "40 FT Reefer", "Non Reefer"];

function emptyForm() {
  return {
    linkPurchaseOrder: false,
    purchaseOrderNo: "",
    containerNumber: "",
    containerType: "40 FT",
    loadingStatus: "pending" as LoadingStatus,
    loadedAt: "",
    loadingLocation: "",
    receivingLocation: "",
    shipmentStatus: "open",
    carrierName: "",
    remarks: ""
  };
}

export function PurchaseLoadingRecordsView() {
  const [records, setRecords] = useState<LoadingRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, loaded: 0, pending: 0, received: 0 });
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LoadingStatus>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(() => emptyForm());

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (status !== "all" && record.loading_status !== status) return false;
      if (!q) return true;
      return [
        record.loading_record_no,
        record.purchase_order_no,
        record.container_number,
        record.container_type,
        record.loading_location,
        record.receiving_location,
        record.carrier_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [query, records, status]);

  async function loadRecords() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/erp/purchases/loading-records?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.ok) {
        const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(error || "Purchase Loading Records could not be loaded.");
      }
      setRecords(payload.data?.records ?? []);
      setSummary(payload.data?.summary ?? { total: 0, loaded: 0, pending: 0, received: 0 });
      setSetupMessage(payload.data?.setupMessage ?? null);
    } catch (error) {
      setRecords([]);
      setSummary({ total: 0, loaded: 0, pending: 0, received: 0 });
      setMessage(error instanceof Error ? error.message : "Purchase Loading Records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    const refresh = () => void loadRecords();
    window.addEventListener("focus", refresh);
    window.addEventListener("erp:purchase-order-saved", refresh);
    window.addEventListener("erp:purchase-transfer-saved", refresh);
    window.addEventListener("erp:purchase-loading-saved", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("erp:purchase-order-saved", refresh);
      window.removeEventListener("erp:purchase-transfer-saved", refresh);
      window.removeEventListener("erp:purchase-loading-saved", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRecord() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/erp/purchases/loading-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderNo: form.linkPurchaseOrder ? form.purchaseOrderNo : null,
          containerNumber: form.containerNumber,
          containerType: form.containerType,
          loadingStatus: form.loadingStatus,
          loadedAt: form.loadedAt ? new Date(form.loadedAt).toISOString() : null,
          loadingLocation: form.loadingLocation,
          receivingLocation: form.receivingLocation,
          shipmentStatus: form.shipmentStatus,
          carrierName: form.carrierName,
          remarks: form.remarks,
          reportPayload: {
            standalone: true,
            explicitPurchaseOrderLink: form.linkPurchaseOrder,
            sourceModule: "purchase-loading-records"
          }
        })
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.ok) {
        const error = typeof payload.error === "string" ? payload.error : payload.error?.message;
        throw new Error(error || "Purchase Loading Record was not saved.");
      }
      setForm(emptyForm());
      setMessage("Purchase Loading Record saved.");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase Loading Record was not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-none space-y-4 px-2 py-3 text-slate-900 dark:text-slate-100 sm:px-4">
      <ErpPageActions
        title="Purchase Loading Records"
        backLink="/dashboard/purchase"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 backdrop-blur p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search container / loading no / PO"
              className="h-8 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | LoadingStatus)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
            {statusOptions.map((option) => (
              <option key={option} value={option} className="uppercase">
                {option === "all" ? "All Status" : option}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadRecords()} disabled={loading} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
            <RefreshCcw className={cn("mr-1.5 h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} />
            Apply Filter
          </Button>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()} className="h-8 rounded-lg border-slate-200 text-xs font-bold">
          <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Print Report
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Total Records" value={summary.total} />
        <Metric label="Loaded" value={summary.loaded} tone="green" />
        <Metric label="Pending" value={summary.pending} tone="amber" />
        <Metric label="Received" value={summary.received} tone="blue" />
      </div>

      {setupMessage ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          {setupMessage}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Loading Records Report</h2>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide mt-0.5">Independent from Purchase Booking Order unless explicitly linked.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                    {[
                      "SR#",
                      "Country",
                      "Branch",
                      "User Name",
                      "Loading No",
                      "Purchase Booking No.",
                      "Sales Account",
                      "Purchase Account",
                      "Goods",
                      "Quantity",
                      "Net Weight",
                      "Gross Weight",
                      "Purchase Amount",
                      "Exchange Rate",
                      "Final Amount (PKR)",
                      "Advance Amount",
                      "Advance (PKR)",
                      "Balance Amount",
                      "Balance (PKR)",
                      "Payment Date",
                      "Loading Country",
                      "Loading Port",
                      "Loading Date",
                      "Received Country",
                      "Received Port",
                      "Received Date",
                      "Action"
                    ].map((head) => (
                      <th key={head} className="whitespace-nowrap px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={23} className="px-3 py-8 text-center text-muted-foreground">
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredRecords.length ? (
                    filteredRecords.map((record, index) => {
                      const poData = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders)?.form_data || {};
                      const form = poData.form || {};
                      
                      // Account Info
                      const salesAccountNo = form.salesAccountNumber || form.salesAccountNo || "-";
                      const salesAccountName = form.salesAccountName || "-";
                      const purchaseAccountNo = form.purchaseAccountNumber || form.purchaseAccountNo || "-";
                      const purchaseAccountName = form.purchaseAccountName || "-";
                      
                      // Goods
                      const goods = poData.goodsEntries || [];
                      const goodsName = goods.map((g: any) => g.goodsName || g.item_name).filter(Boolean).join(", ") || form.itemName || "-";
                      const goodsDetails = goods.map((g: any) => g.brand || g.size || g.item_details).filter(Boolean).join(", ") || form.itemDetails || "-";
                      const combinedGoods = goodsName !== "-" ? `${goodsName}${goodsDetails !== "-" ? ` - ${goodsDetails}` : ""}` : "-";
                      const totalQty = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || g.quantity || 0), 0) : Number(form.quantity || 0);
                      const totalNet = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);
                      const totalGross = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                      
                      // Financial Calculations
                      const totalAmt = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.finalAmount || g.totalAmount || 0), 0) : Number(form.totalAmount || form.finalAmount || 0);
                      const currency = form.secondaryCurrency?.split(" ")?.[0] || form.currency || "PKR";
                      const rawExRate = Number(form.exchangeRate || (poData as any).exchange_rate || 1);
                      const exchangeRate = isNaN(rawExRate) ? 1 : rawExRate;
                      
                      const purchaseAmtStr = totalAmt > 0 ? `${totalAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const finalAmtPKR = totalAmt * exchangeRate;
                      const finalAmtPKRStr = finalAmtPKR > 0 ? `${finalAmtPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";

                      const advanceAmt = Number(form.advanceAmount || 0);
                      const advanceAmtStr = advanceAmt > 0 ? `${advanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const advanceFinalPKR = advanceAmt * exchangeRate;
                      const advanceFinalPKRStr = advanceFinalPKR > 0 ? `${advanceFinalPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";

                      const balanceAmt = totalAmt - advanceAmt;
                      const balanceAmtStr = balanceAmt > 0 ? `${balanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}` : "-";
                      const balanceFinalPKR = balanceAmt * exchangeRate;
                      const balanceFinalPKRStr = balanceFinalPKR > 0 ? `${balanceFinalPKR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PKR` : "-";
                      
                      const paymentDate = form.advancePaymentDate || form.paymentDate || form.clearanceDate || "Nil";
                      
                      // Logistics
                      const loadingCountry = form.loadingCountry || form.originCountry || "-";
                      const loadingPort = form.loadingPort || form.exitPort || "-";
                      const loadingDateVal = form.loadingDate || "-";
                      const receivingCountry = form.receivedCountry || form.destinationCountry || "-";
                      const receivingPort = form.receivedPort || form.destinationPort || "-";
                      const receivingDateVal = form.receivedDate || form.arrivalDate || "-";
                      
                      const countryLabel = `${record.countries?.name || form.branchCountry || "-"}${record.countries?.iso2 ? ` (${record.countries.iso2})` : ""}`;
                      const branchLabel = `${record.country_branches?.name || form.branchName || "-"}${record.country_branches?.code ? ` (${record.country_branches.code})` : ""}`;
                      const adminLabel = form.userName || form.userId || "-";

                      return (
                        <tr key={record.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-4 py-2 text-[10px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{countryLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-500">{branchLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{adminLabel}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-bold text-blue-600">{record.loading_record_no}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{record.purchase_order_no ? <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"><Link2 className="h-3 w-3 text-blue-500" />{record.purchase_order_no}</span> : "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 leading-tight">
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{salesAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{salesAccountName}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 leading-tight">
                            <div className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{purchaseAccountNo}</div>
                            <div className="text-slate-400 text-[9px] uppercase tracking-wider">{purchaseAccountName}</div>
                          </td>
                          <td className="min-w-[150px] px-4 py-2 text-[11px] text-slate-600 dark:text-slate-300">{combinedGoods}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalQty || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalNet || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono">{totalGross || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-emerald-600">{purchaseAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px] font-semibold text-slate-400">{exchangeRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-[#0f2942] dark:text-blue-400">{finalAmtPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-amber-600">{advanceAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-[#0f2942] dark:text-amber-400">{advanceFinalPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-bold text-rose-600">{balanceAmtStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono font-black text-rose-700 dark:text-rose-500">{balanceFinalPKRStr}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{paymentDate}</td>
                          <td className="whitespace-nowrap px-4 py-2">{loadingCountry}</td>
                          <td className="whitespace-nowrap px-3 py-2">{record.loading_location || loadingPort || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{record.loaded_at ? new Date(record.loaded_at).toLocaleDateString() : (loadingDateVal || "-")}</td>
                          <td className="whitespace-nowrap px-4 py-2">{receivingCountry}</td>
                          <td className="whitespace-nowrap px-4 py-2">{record.receiving_location || receivingPort || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px]">{receivingDateVal}</td>
                          <td className="whitespace-nowrap px-4 py-2">
                            <CustomDropdown recordId={record.id} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={23} className="px-3 py-8 text-center text-muted-foreground">
                        No loading records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "blue" }) {
  const color = tone === "green" ? "text-emerald-600 dark:text-emerald-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "blue" ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-100";
  const bg = tone === "green" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50" : tone === "amber" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50" : tone === "blue" ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800";
  
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", bg)}>
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("mt-1 text-2xl font-black font-mono tracking-tight", color)}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: LoadingStatus }) {
  const classes =
    status === "loaded" || status === "received"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "cancelled"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return <span className={cn("rounded-full px-2 py-1 text-xs font-black capitalize", classes)}>{status}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

