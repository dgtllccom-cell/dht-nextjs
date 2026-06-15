"use client";

import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Landmark,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type PaymentMode = "advance" | "remaining" | "credit" | "charges" | "history";

type PurchaseOrderRow = {
  id: string;
  purchase_order_no: string;
  purchase_contract_no: string | null;
  currency_code: string | null;
  exchange_rate: number | null;
  order_total: number | null;
  advance_paid: number | null;
  remaining_paid: number | null;
  credit_amount: number | null;
  remaining_due: number | null;
  payment_status: string | null;
  ledger_posting_status: string | null;
  created_at: string | null;
};

type OrdersPayload = {
  orders?: PurchaseOrderRow[];
  limit?: number;
};

type KpiCard = {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "red" | "slate";
};

const modeLabels: Record<PaymentMode, string> = {
  advance: "Advance Payment",
  remaining: "Remaining Payment",
  credit: "Credit Payment",
  charges: "Credit Payment",
  history: "Payment History"
};

function money(value: unknown, currency = "") {
  const amount = Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

function numeric(value: unknown) {
  return Number(value || 0);
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function monthMatch(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function weekDue(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(now.getDate() + 7);
  return d >= now && d <= sevenDays;
}

function kpis(rows: PurchaseOrderRow[], mode: PaymentMode): KpiCard[] {
  const total = rows.reduce((sum, row) => sum + numeric(row.order_total), 0);
  const advance = rows.reduce((sum, row) => sum + numeric(row.advance_paid), 0);
  const remaining = rows.reduce((sum, row) => sum + numeric(row.remaining_due), 0);
  const remainingPaid = rows.reduce((sum, row) => sum + numeric(row.remaining_paid), 0);
  const credit = rows.reduce((sum, row) => sum + numeric(row.credit_amount), 0);
  const monthRows = rows.filter((row) => monthMatch(row.created_at));
  const monthAdvance = monthRows.reduce((sum, row) => sum + numeric(row.advance_paid), 0);
  const monthRemaining = monthRows.reduce((sum, row) => sum + numeric(row.remaining_due), 0);
  const monthCredit = monthRows.reduce((sum, row) => sum + numeric(row.credit_amount), 0);
  const averageAdvance = total ? Math.round((advance / total) * 100) : 0;

  if (mode === "remaining") {
    const dueThisWeek = rows.filter((row) => weekDue(row.created_at)).reduce((sum, row) => sum + numeric(row.remaining_due), 0);
    const overdue = rows
      .filter((row) => numeric(row.remaining_due) > 0 && row.payment_status?.toLowerCase().includes("overdue"))
      .reduce((sum, row) => sum + numeric(row.remaining_due), 0);
    return [
      { label: "Total Remaining Amount", value: money(remaining), tone: "blue" },
      { label: "Due This Week", value: money(dueThisWeek), tone: "amber" },
      { label: "Overdue Amount", value: money(overdue), tone: "red" },
      { label: "Cleared Amount", value: money(remainingPaid), tone: "green" },
      { label: "This Month Remaining", value: money(monthRemaining), tone: "slate" }
    ];
  }

  if (mode === "credit" || mode === "charges") {
    const usedCredit = rows.filter((row) => numeric(row.credit_amount) > 0).reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    const expiredCredit = rows
      .filter((row) => row.payment_status?.toLowerCase().includes("expired"))
      .reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    return [
      { label: "Total Credit Amount", value: money(credit), tone: "blue" },
      { label: "Used Credit", value: money(usedCredit), tone: "green" },
      { label: "Available Credit", value: money(Math.max(0, total - usedCredit)), tone: "amber" },
      { label: "Expired Credit", value: money(expiredCredit), tone: "red" },
      { label: "This Month Credit", value: money(monthCredit), tone: "slate" }
    ];
  }

  return [
    { label: "Total Advance Amount", value: money(total), tone: "blue" },
    { label: "Paid Advance", value: money(advance), tone: "green" },
    { label: "Pending Advance", value: money(Math.max(0, total - advance)), tone: "amber" },
    { label: "This Month Advance", value: money(monthAdvance), tone: "slate" },
    { label: "Average Advance %", value: `${averageAdvance}%`, tone: "red" }
  ];
}

function statusClass(status: string | null | undefined) {
  const value = (status || "Pending").toLowerCase();
  if (value.includes("paid") || value.includes("posted") || value.includes("clear")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value.includes("overdue") || value.includes("expired")) return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (value.includes("pending") || value.includes("due")) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function exportRows(rows: PurchaseOrderRow[], mode: PaymentMode) {
  const headers = ["PO Number", "Contract", "Date", "Currency", "Order Total", "Advance", "Remaining", "Credit", "Payment Status", "Journal Status"];
  const body = rows.map((row) =>
    [
      row.purchase_order_no,
      row.purchase_contract_no ?? "-",
      date(row.created_at),
      row.currency_code ?? "-",
      money(row.order_total),
      money(row.advance_paid),
      money(row.remaining_due),
      money(row.credit_amount),
      row.payment_status ?? "Pending",
      row.ledger_posting_status ?? "Pending"
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `purchase-order-${modeLabels[mode].toLowerCase().replace(/\s+/g, "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getInitialPurchaseOrderNo(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("purchaseOrderNo") ?? "";
}

export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const router = useRouter();
  const activeMode: PaymentMode = mode === "charges" ? "credit" : mode;
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);

  // Ledger Entry Panel state
  const [entryType, setEntryType] = useState<"debit" | "credit">("debit");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNarration, setPaymentNarration] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchSession() {
      try {
        const response = await fetch("/api/erp/auth/session");
        const body = await response.json();
        if (body?.ok && !cancelled) setSession(body.data);
      } catch (err) { console.error("Session load error:", err); }
    }
    fetchSession();
    return () => { cancelled = true; };
  }, []);

  const isSuperAdmin = useMemo(() => session ? (session.scopes?.isSuperAdmin || session.roles?.includes("super_admin")) : true, [session]);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/erp/purchases/orders?limit=200", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || body?.ok === false) throw new Error(body?.error?.message ?? body?.message ?? "Unable to load purchase orders.");
      const payload = (body?.data ?? body) as OrdersPayload;
      const rows = payload.orders ?? [];
      setOrders(rows);
      // Auto-select by URL param or first row
      const urlOrderNo = getInitialPurchaseOrderNo();
      if (urlOrderNo) {
        const match = rows.find((r) => r.purchase_order_no === urlOrderNo);
        if (match) setSelectedId(match.id);
        else setSelectedId(rows[0]?.id || "");
      } else {
        setSelectedId((current) => current || rows[0]?.id || "");
      }
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Unable to load purchase order payment records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const draft = draftFilter.trim().toLowerCase();
    return orders.filter((row) => {
      if (row.ledger_posting_status?.toLowerCase() !== "posted") return false;
      if (draft && !(row.payment_status ?? "").toLowerCase().includes(draft)) return false;
      if (!needle) return true;
      return [row.purchase_order_no, row.purchase_contract_no, row.payment_status, row.currency_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [draftFilter, orders, query]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const pageRows = filtered.slice(0, 12);
  const cards = useMemo(() => kpis(filtered, activeMode), [activeMode, filtered]);

  function reset() {
    setQuery("");
    setDraftFilter("");
  }

  // Derived account info from form_data
  const selectedForm = (selected as any)?.form_data?.form || {};
  const debitAccountCode = selectedForm.purchaseAccountNo || "-";
  const debitAccountName = selectedForm.purchaseAccountName || "Purchase Account";
  const debitAccountBranch = selectedForm.purchaseAccountBranch || "-";
  const creditAccountCode = selectedForm.salesAccountNo || "-";
  const creditAccountName = selectedForm.salesAccountName || "Sales Account";
  const creditAccountBranch = selectedForm.salesAccountBranch || "-";
  const orderTotalUsd = Number(selected?.order_total || 0);
  const advancePct = Number(selectedForm.advancePercent || 0);
  const suggestedAdvance = (orderTotalUsd * advancePct) / 100;
  const currency = selected?.currency_code || selectedForm.currencyType || "USD";

  async function handleProcessPayment() {
    if (!selected) return;
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      setPaymentError("Please enter a valid payment amount.");
      return;
    }
    setProcessingPayment(true);
    setPaymentError("");
    setPaymentSuccess("");
    try {
      const response = await fetch(`/api/erp/purchases/orders/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: entryType === "debit" ? "advance_paid" : "credit_posted",
          ledgerPostingStatus: "Posted",
          advancePaid: entryType === "debit" ? Number(paymentAmount) : (selected.advance_paid ?? 0),
          creditAmount: entryType === "credit" ? Number(paymentAmount) : (selected.credit_amount ?? 0),
          paymentDate,
          paymentMethod,
          paymentNarration: paymentNarration || `${entryType === "debit" ? "Debit" : "Credit"} payment for PO ${selected.purchase_order_no} on ${paymentDate}`,
          ledgerEntry: {
            type: entryType,
            debitAccount: debitAccountCode,
            debitAccountName,
            creditAccount: creditAccountCode,
            creditAccountName,
            amount: Number(paymentAmount),
            currency,
            date: paymentDate,
            narration: paymentNarration || `PO ${selected.purchase_order_no} – ${entryType === "debit" ? "Purchase Advance" : "Sales Credit"} Payment`
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Payment posting failed.");
      }
      setPaymentSuccess(`✅ ${entryType === "debit" ? "Debit" : "Credit"} entry of ${money(paymentAmount, currency)} posted successfully to ledger for PO ${selected.purchase_order_no}.`);
      setPaymentAmount("");
      setPaymentNarration("");
      void loadOrders();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment processing failed.");
    } finally {
      setProcessingPayment(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Journal / Purchase Order Payment</span>
              {!isSuperAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20"><span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />Scoped Session</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-1">{modeLabels[activeMode]}</h1>
            <p className="text-sm text-muted-foreground">Payments are managed under Journal and remain traceable by Purchase Order Number.</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 xl:max-w-5xl xl:flex-row xl:items-center xl:justify-end">
            <select value={draftFilter} onChange={(event) => setDraftFilter(event.target.value)} className="h-9 min-w-[150px] rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary" aria-label="Draft status">
              <option value="">Draft Dropdown</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="posted">Posted</option>
              <option value="overdue">Overdue</option>
            </select>
            <div className="relative min-w-[240px] flex-1 xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search PO, contract, currency, status"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => setFiltersOpen((open) => !open)} className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" variant="outline" onClick={reset} className="h-9">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportRows(filtered, activeMode)} className="h-9">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export
            </Button>
            <ReportActions rows={filtered} mode={activeMode} />
          </div>
        </div>
        {filtersOpen ? (
          <div className="grid gap-3 border-t border-border p-4 md:grid-cols-3">
            <MiniFilter label="Payment Status" value={draftFilter} options={["Pending", "Paid", "Posted", "Overdue", "Expired"]} onChange={setDraftFilter} />
            <MiniFilter label="Currency" value="" options={Array.from(new Set(orders.map((row) => row.currency_code ?? "").filter(Boolean)))} onChange={() => undefined} />
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <CalendarDays className="mb-1 h-4 w-4" />
              Date filters are ready for API-backed payment schedules.
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <Metric key={card.label} {...card} />)}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{modeLabels[activeMode]} Report</h2>
            <p className="text-xs text-muted-foreground">Full-width ERP table with journal traceability and payment status.</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Rows: {filtered.length}</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-xs text-slate-800">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold tracking-wide text-slate-650 border-b border-slate-200">
              <tr>
                {["SR#", "Admin S#", "Country S#", "Bill No", "Date", "Seller Acc", "Buyer Acc", "Goods Name", "Qty", "Gross Weight", "Net Weight", "Price", "Total Price", "Ex. Rate", "Final Amount", "Payment Condition", "Actions"].map((header, idx) => (
                  <th key={idx} className="whitespace-nowrap border-r border-slate-200 px-3 py-3 text-left font-black last:border-r-0">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {pageRows.map((row, index) => {
                const goods = (row as any).form_data?.goodsEntries || [];
                const form = (row as any).form_data?.form || {};
                const totals = (row as any).form_data?.totals || {};

                const billNo = form.billNo || "-";
                const dateStr = date(form.purchaseDate || row.created_at);
                const countrySerial = form.branchCode || "-";

                const purchaseAcc = form.purchaseAccountName ? `${form.purchaseAccountNo} (${form.purchaseAccountName})` : "-";
                const salesAcc = form.salesAccountName ? `${form.salesAccountNo} (${form.salesAccountName})` : "-";

                const goodsName = goods.map((g: any) => g.goodsName).filter(Boolean).join(", ") || form.goodsName || "-";
                const qty = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.qtyNo || 0), 0) : Number(form.qtyNo || 0);
                const grossWeight = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                const netWeight = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);

                const price = goods.length ? (goods[0].coursePrice || 0) : Number(form.coursePrice || 0);
                const totalPrice = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0);

                const exchangeRate = row.exchange_rate || form.exchangeRate || 1;
                const finalAmount = row.order_total || totals.grandFinal || 0;

                const paymentType = form.paymentType || row.payment_status || "N/A";
                const loadingCountry = form.loadingCountry || "N/A";
                const loadingDate = form.loadingDate || "N/A";
                const receivedCountry = form.receivedCountry || "N/A";
                const receivedDate = form.receivedDate || "N/A";

                const transitSummary = `${paymentType} (Loading: ${loadingCountry} on ${loadingDate} -> Recv: ${receivedCountry} on ${receivedDate})`;

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={cn("cursor-pointer border-b border-slate-200 hover:bg-slate-50/80 transition", selected?.id === row.id && "bg-blue-50/60 ring-1 ring-inset ring-blue-300")}
                  >
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-800 last:border-r-0">{index + 1}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-bold text-blue-700 font-mono last:border-r-0">{row.purchase_order_no}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-800 font-mono last:border-r-0">{countrySerial}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-bold text-slate-800 font-mono last:border-r-0">{billNo}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-slate-700 last:border-r-0">{dateStr}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-slate-700 max-w-[180px] truncate last:border-r-0" title={purchaseAcc}>{purchaseAcc}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-slate-700 max-w-[180px] truncate last:border-r-0" title={salesAcc}>{salesAcc}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-semibold text-amber-700 max-w-[160px] truncate last:border-r-0" title={goodsName}>{goodsName}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-emerald-650 last:border-r-0">{qty.toLocaleString()}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-700 last:border-r-0">{grossWeight.toLocaleString()}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-800 font-bold last:border-r-0">{netWeight.toLocaleString()}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-700 last:border-r-0">{money(price, row.currency_code ?? "")}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-850 font-bold last:border-r-0">{money(totalPrice, row.currency_code ?? "")}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-700 last:border-r-0">{exchangeRate.toFixed(2)}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-blue-700 font-black last:border-r-0">{money(finalAmount, "PKR")}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-slate-700 max-w-[280px] truncate text-[11px] font-medium last:border-r-0" title={transitSummary}>{transitSummary}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center last:border-r-0"><RowActions onSelect={() => setSelectedId(row.id)} /></td>
                  </tr>
                );
              })}
              {!pageRows.length && !loading ? (
                <tr>
                  <td colSpan={17} className="px-3 py-10 text-center text-muted-foreground">No purchase order payment records found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>Showing {pageRows.length ? 1 : 0} to {pageRows.length} of {filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled>Previous</Button>
            <span className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">1</span>
            <Button size="sm" variant="outline" disabled>Next</Button>
          </div>
        </div>
      </section>

      {/* ── Payment Profile ─────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{modeLabels[activeMode]} Profile & Traceability</h2>
            <p className="text-xs text-muted-foreground">Traceable by Purchase Order and Journal entries</p>
          </div>
        </div>

        {selected ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Purchase Order Info</h3>
              <InfoRow label="Purchase Order No" value={selected.purchase_order_no} />
              <InfoRow label="Contract Ref No" value={selected.purchase_contract_no ?? "-"} />
              <InfoRow label="Booking Date" value={date(selected.created_at)} />
              <InfoRow label="Journal Code" value={`JE-${selected.purchase_order_no.replace(/[^0-9]/g, "").slice(-6) || "000001"}`} />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Transaction Valuations</h3>
              <InfoRow label="Base Currency" value={selected.currency_code ?? "USD"} />
              <InfoRow label="Exchange Rate" value={String(selected.exchange_rate ?? "1.00")} />
              <InfoRow label="Total PO Amount" value={money(selected.order_total, selected.currency_code ?? "")} highlight />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Payment Allocations</h3>
              <InfoRow label="Advance Paid" value={money(selected.advance_paid, selected.currency_code ?? "")} />
              <InfoRow label="Remaining Paid" value={money(selected.remaining_paid, selected.currency_code ?? "")} />
              <InfoRow label="Credit Amount" value={money(selected.credit_amount, selected.currency_code ?? "")} />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Current Standing</h3>
              <InfoRow label="Outstanding Due" value={money(selected.remaining_due, selected.currency_code ?? "")} highlight />
              <InfoRow label="Payment Status" value={selected.payment_status ?? "Pending"} />
              <InfoRow label="Posting Status" value={selected.ledger_posting_status ?? "Pending"} />
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">Select a purchase order row from the report above to view its payment journal profile.</div>
        )}
      </section>

      {/* ── Ledger Cash Entry Panel ─────────────────────────── */}
      {selected && (
        <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Ledger Cash Entry</h2>
              <p className="text-xs text-muted-foreground">Process Debit or Credit payment for PO <span className="font-bold text-primary">{selected.purchase_order_no}</span></p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Double-entry Ledger Preview */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Entry Type</th>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Branch / Details</th>
                    <th className="px-4 py-3 text-right">Amount ({currency})</th>
                    <th className="px-4 py-3 text-center">Select</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={cn("border-b border-border cursor-pointer transition", entryType === "debit" ? "bg-indigo-500/8 ring-1 ring-inset ring-indigo-400/30" : "hover:bg-muted/30")}
                    onClick={() => setEntryType("debit")}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 px-2.5 py-1 text-[10px] font-black text-indigo-600 uppercase">
                        DEBIT (Dr)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{debitAccountName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{debitAccountCode}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">{debitAccountBranch}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                      {entryType === "debit" && paymentAmount ? money(paymentAmount, currency) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="entryType"
                        checked={entryType === "debit"}
                        onChange={() => setEntryType("debit")}
                        className="h-4 w-4 accent-indigo-600"
                      />
                    </td>
                  </tr>
                  <tr
                    className={cn("cursor-pointer transition", entryType === "credit" ? "bg-violet-500/8 ring-1 ring-inset ring-violet-400/30" : "hover:bg-muted/30")}
                    onClick={() => setEntryType("credit")}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-400/30 px-2.5 py-1 text-[10px] font-black text-violet-600 uppercase">
                        CREDIT (Cr)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{creditAccountName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{creditAccountCode}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">{creditAccountBranch}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-violet-600">
                      {entryType === "credit" && paymentAmount ? money(paymentAmount, currency) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="entryType"
                        checked={entryType === "credit"}
                        onChange={() => setEntryType("credit")}
                        className="h-4 w-4 accent-violet-600"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Amount ({currency})</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={suggestedAdvance > 0 ? `Suggested: ${suggestedAdvance.toFixed(2)}` : "Enter amount"}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                {suggestedAdvance > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(suggestedAdvance.toFixed(2))}
                    className="text-[10px] text-primary font-semibold hover:underline"
                  >
                    Use suggested: {money(suggestedAdvance, currency)}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="letter_of_credit">Letter of Credit (LC)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entry Type Selected</label>
                <div className={cn(
                  "h-9 flex items-center px-3 rounded-lg border font-bold text-xs uppercase",
                  entryType === "debit"
                    ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-600"
                    : "border-violet-400/40 bg-violet-500/10 text-violet-600"
                )}>
                  {entryType === "debit" ? "🔵 Debit (Dr) — Purchase Account" : "🟣 Credit (Cr) — Sales Account"}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narration / Remarks</label>
              <input
                type="text"
                value={paymentNarration}
                onChange={(e) => setPaymentNarration(e.target.value)}
                placeholder={`${entryType === "debit" ? "Debit" : "Credit"} payment for PO ${selected.purchase_order_no} via ${paymentMethod}`}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            {/* Summary & Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
              <div className="text-xs space-y-0.5 text-muted-foreground">
                <div>
                  <span className="font-bold text-foreground">Posting: </span>
                  {entryType === "debit"
                    ? <><span className="font-bold text-indigo-600">DR</span> {debitAccountName} ({debitAccountCode}) / <span className="font-bold text-violet-600">CR</span> {creditAccountName}</>
                    : <><span className="font-bold text-violet-600">CR</span> {creditAccountName} ({creditAccountCode}) / <span className="font-bold text-indigo-600">DR</span> {debitAccountName}</>
                  }
                </div>
                <div><span className="font-bold text-foreground">Amount: </span>{paymentAmount ? money(paymentAmount, currency) : "—"}</div>
              </div>

              <Button
                type="button"
                onClick={handleProcessPayment}
                disabled={processingPayment || !paymentAmount}
                className={cn(
                  "h-10 px-6 font-bold text-xs uppercase shadow-md transition",
                  entryType === "debit"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                )}
              >
                {processingPayment ? "Processing..." : `Post ${entryType === "debit" ? "Debit" : "Credit"} Payment to Ledger`}
              </Button>
            </div>

            {/* Feedback messages */}
            {paymentSuccess && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-sm text-emerald-700 animate-in fade-in duration-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-0.5">Payment Posted Successfully</div>
                  <div className="text-xs">{paymentSuccess}</div>
                </div>
              </div>
            )}
            {paymentError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                ❌ {paymentError}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: KpiCard) {
  const toneClass = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    slate: "border-border bg-card text-foreground"
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary">
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option.toLowerCase()}>{option}</option>)}
      </select>
    </label>
  );
}

function ReportActions({ rows, mode }: { rows: PurchaseOrderRow[]; mode: PaymentMode }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-input bg-background text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Payment report actions" title="Payment report actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl">
        <MenuAction icon={<Eye />} label="Plate View" onClick={() => undefined} />
        <MenuAction icon={<DownloadActionIcon />} label="Download" onClick={() => exportRows(rows, mode)} />
        <MenuAction icon={<FileSpreadsheet />} label="Export Excel" onClick={() => exportRows(rows, mode)} />
        <MenuAction icon={<DownloadActionIcon />} label="Export PDF" onClick={() => window.print()} />
        <MenuAction icon={<Printer />} label="Print" onClick={() => window.print()} />
      </div>
    </details>
  );
}

function RowActions({ onSelect }: { onSelect: () => void }) {
  return (
    <details className="relative inline-block">
      <summary className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Payment row actions" title="Payment row actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl">
        <MenuAction icon={<Eye />} label="View Details" onClick={onSelect} />
        <MenuAction icon={<WalletCards />} label="Payment History" onClick={onSelect} />
        <MenuAction icon={<Banknote />} label="Journal" onClick={onSelect} />
        <MenuAction icon={<Printer />} label="Print" onClick={() => window.print()} />
        <MenuAction icon={<DownloadActionIcon />} label="Export PDF" onClick={() => window.print()} />
      </div>
    </details>
  );
}

function MenuAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-muted">
      <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5 last:border-b-0 dark:border-slate-800">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold text-foreground text-right truncate max-w-[200px]", highlight && "text-primary font-black")}>{value}</span>
    </div>
  );
}
