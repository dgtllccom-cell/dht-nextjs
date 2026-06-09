"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, ClipboardList, FileSpreadsheet, Printer, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentMode = "advance" | "remaining" | "charges" | "history";

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

const modeLabels: Record<PaymentMode, string> = {
  advance: "Advance Payment",
  remaining: "Remaining Payment",
  charges: "Charges & Expenses",
  history: "Payment History"
};

function money(value: unknown, currency = "") {
  const amount = Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function paymentRows(order: PurchaseOrderRow | null, mode: PaymentMode) {
  if (!order) return [];
  const currency = order.currency_code ?? "";
  const total = Number(order.order_total || 0);
  const advance = Number(order.advance_paid || 0);
  const remainingPaid = Number(order.remaining_paid || 0);
  const due = Number(order.remaining_due ?? Math.max(0, total - advance - remainingPaid));

  if (mode === "advance") {
    return [
      { label: "Purchase Order No", value: order.purchase_order_no },
      { label: "Advance Paid", value: money(advance, currency) },
      { label: "Debit Entry", value: advance ? "Purchase Account" : "Pending" },
      { label: "Credit Entry", value: advance ? "Cash / Bank / Sales Account" : "Pending" },
      { label: "Journal Status", value: order.ledger_posting_status ?? "Pending" }
    ];
  }

  if (mode === "remaining") {
    return [
      { label: "Purchase Order No", value: order.purchase_order_no },
      { label: "Remaining Paid", value: money(remainingPaid, currency) },
      { label: "Remaining Due", value: money(due, currency) },
      { label: "Payment Status", value: order.payment_status ?? "Pending" },
      { label: "Journal Status", value: order.ledger_posting_status ?? "Pending" }
    ];
  }

  if (mode === "charges") {
    return [
      { label: "Purchase Order No", value: order.purchase_order_no },
      { label: "Charges / Expenses", value: "Linked from Journal expense postings" },
      { label: "Exchange Rate", value: String(order.exchange_rate ?? 1) },
      { label: "Roznamcha Status", value: order.ledger_posting_status ?? "Pending" },
      { label: "Traceability", value: "PO Number linked" }
    ];
  }

  return [
    { label: "Purchase Order No", value: order.purchase_order_no },
    { label: "Order Total", value: money(total, currency) },
    { label: "Advance Paid", value: money(advance, currency) },
    { label: "Remaining Paid", value: money(remainingPaid, currency) },
    { label: "Outstanding", value: money(due, currency) },
    { label: "Payment Status", value: order.payment_status ?? "Pending" }
  ];
}

export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setSelectedId((current) => current || rows[0]?.id || "");
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Unable to load purchase order payment records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((row) =>
      [row.purchase_order_no, row.purchase_contract_no, row.payment_status, row.currency_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [orders, query]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const rows = paymentRows(selected, mode);
  const totals = useMemo(
    () => ({
      orders: filtered.length,
      total: filtered.reduce((sum, row) => sum + Number(row.order_total || 0), 0),
      advance: filtered.reduce((sum, row) => sum + Number(row.advance_paid || 0), 0),
      remaining: filtered.reduce((sum, row) => sum + Number(row.remaining_due || 0), 0)
    }),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Journal / Purchase Order Payment</p>
            <h1 className="text-2xl font-bold text-foreground">{modeLabels[mode]}</h1>
            <p className="text-sm text-muted-foreground">Payments are managed under Journal and remain traceable by Purchase Order Number.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void loadOrders()}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Purchase Orders" value={String(totals.orders)} />
        <Metric label="Order Total" value={money(totals.total)} />
        <Metric label="Advance Paid" value={money(totals.advance)} />
        <Metric label="Outstanding" value={money(totals.remaining)} />
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by Purchase Order No, Contract No, Currency, Status"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Rows: {filtered.length}</span>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
                <tr>
                  {["PO Number", "Contract", "Date", "Currency", "Order Total", "Advance", "Remaining", "Status", "Journal"].map((header) => (
                    <th key={header} className="px-3 py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={cn("cursor-pointer border-b border-border hover:bg-muted/50", selected?.id === row.id && "bg-primary/10")}
                  >
                    <td className="px-3 py-3 font-semibold text-primary">{row.purchase_order_no}</td>
                    <td className="px-3 py-3">{row.purchase_contract_no ?? "-"}</td>
                    <td className="px-3 py-3">{date(row.created_at)}</td>
                    <td className="px-3 py-3">{row.currency_code ?? "-"}</td>
                    <td className="px-3 py-3">{money(row.order_total, row.currency_code ?? "")}</td>
                    <td className="px-3 py-3">{money(row.advance_paid, row.currency_code ?? "")}</td>
                    <td className="px-3 py-3">{money(row.remaining_due, row.currency_code ?? "")}</td>
                    <td className="px-3 py-3">{row.payment_status ?? "Pending"}</td>
                    <td className="px-3 py-3">{row.ledger_posting_status ?? "Pending"}</td>
                  </tr>
                ))}
                {!filtered.length && !loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No purchase order payment records found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <aside className="border-t border-border p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">{modeLabels[mode]}</h2>
                <p className="text-xs text-muted-foreground">{selected?.purchase_order_no ?? "No PO selected"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2 last:border-b-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                  <span className="text-right text-sm font-semibold">{row.value}</span>
                </div>
              ))}
              {!rows.length ? <p className="text-sm text-muted-foreground">Select a purchase order to view linked payment details.</p> : null}
            </div>
            <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-200">
              <ClipboardList className="mb-2 h-4 w-4" />
              Purchase payment posting stays under Journal. Debit/Credit entries are created by the existing posting API and remain linked to the same Purchase Order Number.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
