"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Link2, MoreVertical, Printer, RefreshCcw, Search, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";`r`nimport { ViewportActionMenu } from "@/components/ui/viewport-action-menu";
import { Card, CardContent } from "@/components/ui/card";
import { ErpPageActions } from "@/components/layout/erp-page-actions";
import { cn } from "@/lib/utils";

type LoadingStatus = "draft" | "pending" | "loaded" | "received" | "cancelled";

function CustomDropdown({ recordId }: { recordId: string }) {
  return (
    <ViewportActionMenu
      ariaLabel="Loading record actions"
      buttonClassName="grid h-8 w-8 place-items-center rounded-md border border-input bg-background text-foreground hover:bg-muted"
      trigger={<MoreVertical className="h-4 w-4" />}
    >
      {(close) => (
        <>
          <button className="block w-full rounded-lg px-4 py-2 text-left text-sm text-foreground hover:bg-muted" onClick={() => close()}>Edit</button>
          <button className="block w-full rounded-lg px-4 py-2 text-left text-sm text-foreground hover:bg-muted" onClick={() => close()}>Load</button>
          <button className="block w-full rounded-lg px-4 py-2 text-left text-sm text-foreground hover:bg-muted" onClick={() => { close(); window.open(`/dashboard/purchase/purchase-loading-records/${recordId}`, "_self"); }}>View</button>
        </>
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
    <div className="w-full max-w-none px-2 py-4 sm:px-4">
      <ErpPageActions>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadRecords()} disabled={loading}>
          <RefreshCcw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
          Refresh
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="More actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </ErpPageActions>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search container / loading no / PO"
              className="h-9 w-64 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | LoadingStatus)} className="h-9 rounded-md border bg-background px-3 text-sm">
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All Status" : option}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={() => void loadRecords()} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
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
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4">
              <h2 className="text-base font-black">Loading Records Report</h2>
              <p className="text-xs text-muted-foreground">Independent from Purchase Booking Order unless explicitly linked.</p>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-max min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-left text-xs uppercase tracking-wide text-white">
                    {["SR#", "Organization", "Loading No", "Purchase Booking No.", "Sales Account", "Account Detail", "Goods Name", "Goods Details", "Quantity", "Net Weight", "Gross Weight", "Purchase Total Currency", "Advance Currency", "Transport Information", "Action"].map((head) => (
                      <th key={head} className="whitespace-nowrap px-3 py-3 font-black">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="px-3 py-8 text-center text-muted-foreground">
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredRecords.length ? (
                    filteredRecords.map((record, index) => {
                      const poData = (Array.isArray(record.purchase_orders) ? record.purchase_orders[0] : record.purchase_orders)?.form_data || {};
                      const form = poData.form || {};
                      
                      // Supplier
                      const supplierName = form.supplierName || form.vendorName || poData.supplier?.accountName || "-";
                      const accountDetail = form.supplierDetails || poData.accountDetail || "-";
                      
                      // Goods
                      const goods = poData.goodsEntries || [];
                      const goodsName = goods.map((g: any) => g.goodsName || g.item_name).filter(Boolean).join(", ") || form.itemName || "-";
                      const goodsDetails = goods.map((g: any) => g.brand || g.size || g.item_details).filter(Boolean).join(", ") || form.itemDetails || "-";
                      const totalQty = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.qtyNo || g.quantity || 0), 0) : Number(form.quantity || 0);
                      const totalNet = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);
                      const totalGross = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                      
                      // Financial
                      const totalAmt = goods.length > 0 ? goods.reduce((s: number, g: any) => s + Number(g.finalAmount || g.totalAmount || 0), 0) : Number(form.totalAmount || form.finalAmount || 0);
                      const currency = form.secondaryCurrency?.split(" ")?.[0] || form.currency || "-";
                      const advanceCurrency = form.advanceAmount ? `${form.advanceAmount} ${currency}` : "-";
                      
                      // Logistics
                      const loadingCountry = form.loadingCountry || form.originCountry || "-";
                      const loadingPort = form.loadingPort || form.exitPort || "-";
                      const loadingDateVal = form.loadingDate || "-";
                      const receivingCountry = form.receivedCountry || form.destinationCountry || "-";
                      const receivingPort = form.receivedPort || form.destinationPort || "-";
                      const receivingDateVal = form.receivedDate || form.arrivalDate || "-";`r`n                      const countryLabel = `${record.countries?.name || form.branchCountry || "-"}${record.countries?.iso2 ? ` (${record.countries.iso2})` : ""}`;`r`n                      const cityLabel = `${record.city_branches?.city_name || form.cityName || "-"}${record.city_branches?.code ? ` (${record.city_branches.code})` : ""}`;`r`n                      const branchLabel = `${record.country_branches?.name || form.branchName || "-"}${record.country_branches?.code ? ` (${record.country_branches.code})` : ""}`;`r`n                      const adminLabel = form.userName || form.userId || "-";

                      return (
                        <tr key={record.id} className="border-b hover:bg-muted/40">
                          <td className="whitespace-nowrap px-3 py-2">{String(index + 1).padStart(2, "0")}</td>
                          <td className="min-w-[260px] px-3 py-2 text-[11px] leading-relaxed"><div className="font-black text-foreground">{countryLabel}</div><div>{cityLabel}</div><div>{branchLabel}</div><div className="text-muted-foreground">Created By: {adminLabel}</div></td>`r`n                          <td className="whitespace-nowrap px-3 py-2 font-bold text-primary">{record.loading_record_no}</td>
                          <td className="whitespace-nowrap px-3 py-2">{record.purchase_order_no ? <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{record.purchase_order_no}</span> : "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{supplierName || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{accountDetail || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{goodsName || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{goodsDetails || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{totalQty || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{totalNet || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{totalGross || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{totalAmt ? `${totalAmt} ${currency}` : "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{advanceCurrency || "-"}</td>
                          <td className="min-w-[300px] px-3 py-2 text-[11px] leading-relaxed">
                            <div><span className="font-black">Loading:</span> {loadingCountry || "-"} / {record.loading_location || loadingPort || "-"}</div>
                            <div><span className="font-black">Loaded:</span> {record.loaded_at ? new Date(record.loaded_at).toLocaleDateString() : (loadingDateVal || "-")}</div>
                            <div><span className="font-black">Destination:</span> {receivingCountry || "-"} / {record.receiving_location || receivingPort || "-"}</div>
                            <div><span className="font-black">Receiving:</span> {receivingDateVal || "-"}</div>
                            <div><span className="font-black">Shipping:</span> {record.carrier_name || form.shippingMethod || form.shippingLine || "-"}</div>
                            <div><span className="font-black">Vessel / Container:</span> {record.container_number || form.containerNumber || "-"} / {record.container_type || "-"}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <CustomDropdown recordId={record.id} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={15} className="px-3 py-8 text-center text-muted-foreground">
                        No loading records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "blue" }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-2 text-2xl font-black", color)}>{value}</div>
      </CardContent>
    </Card>
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
