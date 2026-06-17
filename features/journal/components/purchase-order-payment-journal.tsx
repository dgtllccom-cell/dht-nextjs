"use client";
 
import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Landmark,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  WalletCards,
  Save,
  Plus,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { openPurchaseA4ReportWindow, type PurchaseReportData } from "@/lib/reports/open-purchase-a4-report-window";

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
  form_data?: any;
};

type OrdersPayload = {
  orders?: PurchaseOrderRow[];
  limit?: number;
};

type KpiCard = {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
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
  const count = rows.length;

  if (mode === "remaining") {
    const totalRemaining = rows.reduce((sum, row) => sum + numeric(row.remaining_due), 0);
    const totalRemainingPaid = rows.reduce((sum, row) => sum + numeric(row.remaining_paid), 0);
    const totalOutstanding = Math.max(0, totalRemaining - totalRemainingPaid);

    return [
      {
        label: "Total POs",
        value: String(count),
        sublabel: "All Purchase Orders",
        icon: <FileText className="h-5 w-5" />,
        tone: "blue"
      },
      {
        label: "Total Remaining",
        value: money(totalRemaining),
        sublabel: "PKR",
        icon: <Banknote className="h-5 w-5" />,
        tone: "green"
      },
      {
        label: "Cleared Amount",
        value: money(totalRemainingPaid),
        sublabel: "PKR",
        icon: <CheckCircle className="h-5 w-5" />,
        tone: "amber"
      },
      {
        label: "Outstanding Due",
        value: money(totalOutstanding),
        sublabel: "PKR",
        icon: <XCircle className="h-5 w-5" />,
        tone: "red"
      }
    ];
  }

  if (mode === "credit" || mode === "charges") {
    const totalCredit = rows.reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    const usedCredit = rows.filter((row) => numeric(row.credit_amount) > 0).reduce((sum, row) => sum + numeric(row.credit_amount), 0);
    const availableCredit = Math.max(0, totalCredit - usedCredit);

    return [
      {
        label: "Total POs",
        value: String(count),
        sublabel: "All Purchase Orders",
        icon: <FileText className="h-5 w-5" />,
        tone: "blue"
      },
      {
        label: "Total Credit",
        value: money(totalCredit),
        sublabel: "PKR",
        icon: <Banknote className="h-5 w-5" />,
        tone: "green"
      },
      {
        label: "Used Credit",
        value: money(usedCredit),
        sublabel: "PKR",
        icon: <CheckCircle className="h-5 w-5" />,
        tone: "amber"
      },
      {
        label: "Available Credit",
        value: money(availableCredit),
        sublabel: "PKR",
        icon: <XCircle className="h-5 w-5" />,
        tone: "red"
      }
    ];
  }

  // advance mode (mockup style)
  const totalAdvanceRequired = rows.reduce((sum, row) => {
    const form = row.form_data?.form || {};
    const totalPrice = row.form_data?.goodsEntries?.length
      ? row.form_data.goodsEntries.reduce((s: number, g: any) => s + Number(g.totalAmount || 0), 0)
      : Number(form.totalAmount || 0);
    const advancePercent = Number(form.advancePercent || 0);
    const rate = row.exchange_rate || form.exchangeRate || 1;
    return sum + ((totalPrice * advancePercent) / 100) * rate;
  }, 0);
  const totalPaidAdvance = rows.reduce((sum, row) => sum + numeric(row.advance_paid), 0);
  const pendingAdvance = Math.max(0, totalAdvanceRequired - totalPaidAdvance);

  return [
    {
      label: "Total POs",
      value: String(count),
      sublabel: "All Purchase Orders",
      icon: <FileText className="h-5 w-5" />,
      tone: "blue"
    },
    {
      label: "Total Advance",
      value: money(totalAdvanceRequired),
      sublabel: "PKR",
      icon: <Banknote className="h-5 w-5" />,
      tone: "green"
    },
    {
      label: "Paid Advance",
      value: money(totalPaidAdvance),
      sublabel: "PKR",
      icon: <CheckCircle className="h-5 w-5" />,
      tone: "amber"
    },
    {
      label: "Pending Advance",
      value: money(pendingAdvance),
      sublabel: "PKR",
      icon: <XCircle className="h-5 w-5" />,
      tone: "red"
    }
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

const SAVED_BANKS_KEY = "erp_saved_banks_v1";
const SAVED_METHODS_KEY = "erp_saved_payment_methods_v1";

type SavedBankItem = { name: string; address?: string };

function readLocalList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocalList(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function readLocalBankList(key: string): SavedBankItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBankList(key: string, values: SavedBankItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function toLedgerOption(row: any): SearchSelectOption {
  const account = row.name || "";
  const accountNo = row.code || "";
  const label = `${accountNo} - ${account}`;
  const keywords = [accountNo, account].filter(Boolean).join(" ");
  return { value: row.id, label, keywords };
}

function getInitialPurchaseOrderNo(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("purchaseOrderNo") ?? "";
}

function FieldBlock({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
        {required ? <span className="text-red-605"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function PurchaseOrderPaymentJournal({ mode = "advance" }: { mode?: PaymentMode }) {
  const router = useRouter();
  const activeMode: PaymentMode = mode === "charges" ? "credit" : mode;
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const selectOrder = (id: string) => {
    setSelectedId(id);
    setTimeout(() => {
      const el = document.getElementById("ledger-cash-entry-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);

  // Redesign state hooks
  const [viewingRow, setViewingRow] = useState<PurchaseOrderRow | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const handleOpenA4PDF = (row: PurchaseOrderRow, autoPrint = false) => {
    const form = row.form_data?.form || {};
    const goods = row.form_data?.goodsEntries || [];
    const totals = row.form_data?.totals || {};

    const purchaseData: PurchaseReportData = {
      id: row.id,
      purchaseBookingOrderNumber: row.purchase_order_no,
      purchaseDate: form.purchaseDate || row.created_at || "",
      bookingDate: form.bookingDate || form.purchaseDate || row.created_at || "",
      purchaseAccountName: form.purchaseAccountName || "Dubai Purchase Account",
      purchaseAccountNumber: form.purchaseAccountNo || "AE-AC-0001",
      salesAccountName: form.salesAccountName || "Damaan Sales Account",
      salesAccountNumber: form.salesAccountNo || "SA-2001",
      supplierName: form.salesAccountName || "N/A",
      buyerName: form.purchaseAccountName || "N/A",
      productName: goods.map((g: any) => g.goodsName).filter(Boolean).join(", ") || form.goodsName || "N/A",
      goodsDescription: form.orderReportRemarks || "",
      quantity: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.qtyNo || 0), 0) : Number(form.qtyNo || 0),
      unit: goods[0]?.qtyName || form.qtyName || "BAGS",
      totalWeight: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0),
      containerCount: Number(form.containersCount || form.containerCount || 1),
      purchaseRate: goods.length ? (goods.reduce((sum: number, g: any) => sum + Number(g.coursePrice || 0), 0) / goods.length) : Number(form.coursePrice || 0),
      totalPurchaseAmount: goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0),
      currency: row.currency_code || "USD",
      status: row.payment_status || "Pending",
      paymentStatus: row.payment_status || "Pending",
      branchName: form.purchaseAccountBranch || "Kabul Main Branch",
      countryName: form.loadingCountry || "N/A",
      createdAt: row.created_at || "",
      form_data: row.form_data || {},
      audit: {
        userName: session?.name || session?.username || "SUPER ADMIN",
        userId: session?.id || "USR-1001",
        branchCode: form.branchCode || "QTA-01"
      }
    };

    openPurchaseA4ReportWindow({
      title: "Purchase Master Verification Report",
      purchaseData,
      autoPrint,
      lang: "en"
    });
  };

  // Ledger Entry Panel state
  const [paymentSourceLedgerId, setPaymentSourceLedgerId] = useState("");
  const [roznamchaType, setRoznamchaType] = useState("Cash Book No.");
  const [roznamchaNumber, setRoznamchaNumber] = useState("000123");
  const [paymentType, setPaymentType] = useState<"" | "bank" | "business" | "invoice" | "cash" | "transfer">("");
  const [currency, setCurrency] = useState("USD");
  const [calcAmount, setCalcAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [calcOp, setCalcOp] = useState<"mul" | "div">("mul");
  const [finalPayment, setFinalPayment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [typeDetails, setTypeDetails] = useState<Record<string, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  // Local cache for Bank/Method quick add
  const [savedBanks, setSavedBanks] = useState<SavedBankItem[]>([]);
  const [savedMethods, setSavedMethods] = useState<string[]>([]);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"bank" | "method">("bank");
  const [addOptionValue, setAddOptionValue] = useState("");
  const [addOptionAddress, setAddOptionAddress] = useState("");

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setSelectedOrderPayments([]);
      return;
    }
    let cancelled = false;
    async function fetchPayments() {
      setLoadingPayments(true);
      try {
        const response = await fetch(`/api/erp/purchases/orders/${selectedId}/payments`);
        const body = await response.json();
        if (body?.ok && body.data?.payments && !cancelled) {
          setSelectedOrderPayments(body.data.payments);
        }
      } catch (err) {
        console.error("Failed to load payments for selected order:", err);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    }
    void fetchPayments();
    return () => { cancelled = true; };
  }, [selectedId]);

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

  const [ledgers, setLedgers] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchLedgers() {
      try {
        const response = await fetch("/api/erp/ledgers");
        const body = await response.json();
        if (body?.ok && body.data?.ledgers && !cancelled) {
          setLedgers(body.data.ledgers);
        }
      } catch (err) {
        console.error("Ledger load error:", err);
      }
    }
    fetchLedgers();
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
      // Auto-select by URL param
      const urlOrderNo = getInitialPurchaseOrderNo();
      if (urlOrderNo) {
        const match = rows.find((r) => r.purchase_order_no === urlOrderNo);
        if (match) setSelectedId(match.id);
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

  useEffect(() => {
    setPageIndex(0);
  }, [activeMode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const draft = draftFilter.trim().toLowerCase();
    return orders.filter((row) => {
      if (row.ledger_posting_status?.toLowerCase() !== "posted") return false;
      if (draft && !(row.payment_status ?? "").toLowerCase().includes(draft)) return false;

      // Extract form values for clearance calculation
      const form = row.form_data?.form || {};
      const totals = row.form_data?.totals || {};
      const finalAmount = row.order_total || totals.grandFinal || 0;
      const advancePercent = Number(form.advancePercent || 0);
      const requiredAdvance = (finalAmount * advancePercent) / 100;
      const paidAdvance = Number(row.advance_paid || 0);
      const remainingAdvance = requiredAdvance - paidAdvance;
      const remainingDue = Number(row.remaining_due || 0);
      const isCreditPaid = (row.payment_status || "").toLowerCase().includes("posted") || 
                           (row.payment_status || "").toLowerCase().includes("paid");

      const isAdvanceCleared = advancePercent > 0 ? remainingAdvance <= 0.01 : true;
      const isRemainingCleared = remainingDue <= 0.01;

      if (activeMode === "advance") {
        if (advancePercent <= 0) return false; // Doesn't require advance
        if (remainingAdvance <= 0.01) return false; // Already cleared
      } else if (activeMode === "remaining") {
        if (remainingDue <= 0.01) return false; // Already cleared
      } else if (activeMode === "credit") {
        if (isCreditPaid) return false; // Already cleared
      } else if (activeMode === "history") {
        // Show in history if fully cleared
        const isFullyCleared = (advancePercent > 0 ? isAdvanceCleared : true) && isRemainingCleared;
        if (!isFullyCleared && !isCreditPaid) return false;
      }

      if (!needle) return true;
      const supplierName = form.salesAccountName || "";
      const supplierCode = form.salesAccountNo || "";
      return [row.purchase_order_no, row.purchase_contract_no, row.payment_status, row.currency_code, supplierName, supplierCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [activeMode, draftFilter, orders, query]);

  const selected = selectedId ? (filtered.find((row) => row.id === selectedId) ?? null) : null;
  const pageRows = useMemo(() => {
    return filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filtered, pageIndex, pageSize]);
  const cards = useMemo(() => kpis(filtered, activeMode), [activeMode, filtered]);

  function reset() {
    setQuery("");
    setDraftFilter("");
    setPageIndex(0);
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

  const supplierLedger = useMemo(() => {
    return ledgers.find((l) => l.code === selectedForm.salesAccountNo);
  }, [ledgers, selectedForm.salesAccountNo]);

  const cashLedger = useMemo(() => {
    return ledgers.find((l) => l.code === "CASH-001") ||
           ledgers.find((l) => l.code?.toLowerCase().includes("cash") || l.name?.toLowerCase().includes("cash")) ||
           ledgers.find((l) => l.code?.toLowerCase().includes("bank") || l.name?.toLowerCase().includes("bank")) ||
           ledgers[0];
  }, [ledgers]);

  // Set default paymentSourceLedgerId and sync Category & Type once cashLedger is loaded
  useEffect(() => {
    if (cashLedger && !paymentSourceLedgerId) {
      setPaymentSourceLedgerId(cashLedger.id);
      const name = String(cashLedger.name || "").toLowerCase();
      const code = String(cashLedger.code || "").toLowerCase();
      if (name.includes("cash") || code.includes("cash")) {
        setPaymentType("cash");
        setRoznamchaType("Cash Book No.");
      } else if (name.includes("bank") || code.includes("bank")) {
        setPaymentType("bank");
        setRoznamchaType("Roznamcha Book No.");
      }
    }
  }, [cashLedger, paymentSourceLedgerId]);

  const selectedSourceLedger = useMemo(() => {
    return ledgers.find((l) => l.id === paymentSourceLedgerId) || cashLedger || null;
  }, [ledgers, paymentSourceLedgerId, cashLedger]);

  const sourceBalanceText = useMemo(() => {
    if (!selectedSourceLedger) return "—";
    const bal = Number(selectedSourceLedger.current_balance ?? 0);
    return `${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedSourceLedger.currency || "PKR"}`;
  }, [selectedSourceLedger]);

  const purchaseLedger = useMemo(() => {
    return ledgers.find((l) => l.code === selectedForm.purchaseAccountNo);
  }, [ledgers, selectedForm.purchaseAccountNo]);

  const doubleEntry = useMemo(() => {
    return {
      debitName: selectedForm.salesAccountName || "Supplier Payable Account",
      debitCode: selectedForm.salesAccountNo || "-",
      debitBranch: selectedForm.salesAccountBranch || "-",
      creditName: selectedSourceLedger?.name || "General Cash Account",
      creditCode: selectedSourceLedger?.code || "CASH-001",
      creditBranch: "-",
      debitLedgerId: supplierLedger?.id,
      creditLedgerId: selectedSourceLedger?.id
    };
  }, [selectedForm, selectedSourceLedger, supplierLedger]);

  // Sync PO currency and exchange rate when order changes
  useEffect(() => {
    if (selected) {
      const rate = String(selected.exchange_rate || 1);
      setExchangeRate(rate);
      const poCur = selected.currency_code || "USD";
      setCurrency(poCur.toUpperCase());
    }
  }, [selectedId, selected]);

  const isLocalCurrency = currency.trim().toUpperCase() === "PKR";
  const showCalcPanel =
    Boolean(currency) &&
    !isLocalCurrency &&
    ["USD", "AED", "AFN", "INR", "IRR", "PKR"].includes(currency.toUpperCase());

  const calcFinal = useMemo(() => {
    if (!showCalcPanel) return null;
    const a = Number(calcAmount);
    const p = Number(exchangeRate);
    if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || p <= 0) return null;
    if (calcOp === "div" && p === 0) return null;
    const v = calcOp === "mul" ? a * p : a / p;
    return Number.isFinite(v) ? v : null;
  }, [calcAmount, calcOp, exchangeRate, showCalcPanel]);

  const amount = useMemo(() => {
    if (showCalcPanel && calcFinal !== null) return calcFinal;
    return Number(finalPayment || 0);
  }, [finalPayment, showCalcPanel, calcFinal]);

  const detailsString = useMemo(() => {
    if (!paymentType) return "";
    if (paymentType === "bank") {
      const bankName = typeDetails.bankName || "";
      const method = typeDetails.method || "";
      const refNo = typeDetails.refNo || "";
      const payDate = typeDetails.payDate || paymentDate;
      const formattedDate = payDate ? payDate.split("-").reverse().join("/") : "";
      const attachment = attachmentFile?.name || typeDetails.bankAttachmentName || "";
      const bankAccount = typeDetails.bankAccount || "";
      
      const parts = [
        bankName && `Bank: ${bankName}`,
        bankAccount && `A/C: ${bankAccount}`,
        method && `Method: ${method}`,
        refNo && `Ref: ${refNo}`,
        formattedDate && `Date: ${formattedDate}`,
        attachment && `Attachment: ${attachment}`
      ].filter(Boolean);
      
      return parts.length ? `Bank Details: ${parts.join(" | ")}` : "";
    }
    if (paymentType === "cash") {
      const receiver = typeDetails.receiverSenderName || "";
      const mobile = typeDetails.mobileNumber || "";
      const whatsapp = typeDetails.whatsappNumber || "";
      
      const parts = [
        receiver && `Receiver/Sender: ${receiver}`,
        mobile && `Mobile: ${mobile}`,
        whatsapp && `WhatsApp: ${whatsapp}`
      ].filter(Boolean);
      
      return parts.length ? `Cash Details: ${parts.join(" | ")}` : "";
    }
    if (paymentType === "transfer") {
      const fromVal = typeDetails.from || "";
      const toVal = typeDetails.to || "";
      const refVal = typeDetails.ref || "";
      
      const parts = [
        fromVal && `From: ${fromVal}`,
        toVal && `To: ${toVal}`,
        refVal && `Ref: ${refVal}`
      ].filter(Boolean);
      
      return parts.length ? `Transfer Details: ${parts.join(" | ")}` : "";
    }
    if (paymentType === "business" || paymentType === "invoice") {
      const invNo = typeDetails.invoiceNumber || "";
      const purInfo = typeDetails.purchaseInfo || typeDetails.businessName || "";
      
      const parts = [
        invNo && `Invoice #: ${invNo}`,
        purInfo && `Info: ${purInfo}`
      ].filter(Boolean);
      
      return parts.length ? `Invoice/Business Details: ${parts.join(" | ")}` : "";
    }
    return "";
  }, [paymentType, typeDetails, paymentDate, attachmentFile]);

  // Sync all system metadata (accounts, details, calculation) to remarks textarea dynamically
  useEffect(() => {
    setRemarks((prev) => {
      // 1. Extract user's custom lines (filter out any system-generated lines)
      const userLines = prev.split("\n").map((l) => l.trim()).filter((l) => {
        return !l.startsWith("Debit Account:") &&
               !l.startsWith("Credit Account:") &&
               !l.startsWith("Bank Details:") &&
               !l.startsWith("Cash Details:") &&
               !l.startsWith("Transfer Details:") &&
               !l.startsWith("Invoice/Business Details:") &&
               !l.startsWith("Invoice Details:") &&
               !l.startsWith("Calculation:");
      });

      const systemLines: string[] = [];

      // 2. Add Debit and Credit Account details
      if (doubleEntry.debitCode && doubleEntry.debitName) {
        systemLines.push(`Debit Account: ${doubleEntry.debitCode} - ${doubleEntry.debitName}`);
      }
      if (doubleEntry.creditCode && doubleEntry.creditName) {
        systemLines.push(`Credit Account: ${doubleEntry.creditCode} - ${doubleEntry.creditName}`);
      }

      // 3. Add Category Details (remarks note)
      if (detailsString) {
        systemLines.push(detailsString);
      }

      // 4. Add Calculation Details
      if (showCalcPanel && calcAmount && exchangeRate && calcFinal !== null) {
        const opSymbol = calcOp === "mul" ? "×" : "÷";
        systemLines.push(`Calculation: ${Number(calcAmount).toLocaleString()} ${currency.toUpperCase()} ${opSymbol} ${Number(exchangeRate).toLocaleString()} = ${calcFinal.toFixed(2)} PKR`);
      }

      return [...systemLines, ...userLines].filter(Boolean).join("\n");
    });
  }, [
    doubleEntry.debitCode,
    doubleEntry.debitName,
    doubleEntry.creditCode,
    doubleEntry.creditName,
    detailsString,
    showCalcPanel,
    calcAmount,
    exchangeRate,
    calcOp,
    currency,
    calcFinal
  ]);

  // Load saved bank/method options
  useEffect(() => {
    setSavedBanks(readLocalBankList(SAVED_BANKS_KEY));
    setSavedMethods(readLocalList(SAVED_METHODS_KEY));
  }, []);

  function commitAddOption() {
    const value = addOptionValue.trim();
    if (!value) return;

    if (addOptionType === "bank") {
      const exists = savedBanks.some((b) => b.name.toLowerCase() === value.toLowerCase());
      if (!exists) {
        const next = [...savedBanks, { name: value, address: addOptionAddress.trim() }];
        setSavedBanks(next);
        writeLocalBankList(SAVED_BANKS_KEY, next);
      }
      setTypeDetails((prev) => ({ ...prev, bankName: value }));
    } else {
      const exists = savedMethods.some((m) => m.toLowerCase() === value.toLowerCase());
      if (!exists) {
        const next = [...savedMethods, value];
        setSavedMethods(next);
        writeLocalList(SAVED_METHODS_KEY, next);
      }
      setTypeDetails((prev) => ({ ...prev, method: value }));
    }

    setAddOptionOpen(false);
  }

  function renameCustomMethod(oldName: string, newName: string) {
    const cleanedNew = newName.trim();
    if (!cleanedNew) return;
    const next = savedMethods.map((m) => (m === oldName ? cleanedNew : m));
    setSavedMethods(next);
    writeLocalList(SAVED_METHODS_KEY, next);
    if (typeDetails.method === oldName) {
      setTypeDetails((prev) => ({ ...prev, method: cleanedNew }));
    }
  }

  function deleteCustomMethod(name: string) {
    const next = savedMethods.filter((m) => m !== name);
    setSavedMethods(next);
    writeLocalList(SAVED_METHODS_KEY, next);
    if (typeDetails.method === name) {
      setTypeDetails((prev) => ({ ...prev, method: "" }));
    }
  }

  function openAddOption(type: "bank" | "method") {
    setAddOptionType(type);
    setAddOptionValue("");
    setAddOptionAddress("");
    setAddOptionOpen(true);
  }

  const suggestedAdvance = useMemo(() => {
    if (!selected) return 0;
    const totals = (selected as any).form_data?.totals || {};
    const goods = (selected as any).form_data?.goodsEntries || [];
    const form = (selected as any).form_data?.form || {};
    
    const totalPrice = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0);
    const required = (totalPrice * (Number(form.advancePercent || 10))) / 100;
    
    const exchangeRate = selected.exchange_rate || form.exchangeRate || 1;
    const paidAdvance = Number(selected.advance_paid || 0);
    const paidAdvanceBC = paidAdvance / exchangeRate;
    
    return Math.max(0, required - paidAdvanceBC);
  }, [selected]);

  const canSave =
    Boolean(selected) &&
    Boolean(paymentSourceLedgerId) &&
    Boolean(paymentType) &&
    Boolean(amount && amount > 0) &&
    currency.trim().length === 3 &&
    Number(exchangeRate) > 0 &&
    !processingPayment;

  const ledgerOptions = useMemo(() => {
    return ledgers.map(toLedgerOption);
  }, [ledgers]);

  const currencyValue = currency;

  async function handleProcessPayment() {
    if (!selected) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setPaymentError("Please enter a valid payment amount.");
      return;
    }

    if ((activeMode === "advance" || activeMode === "remaining") && (!doubleEntry.debitLedgerId || !doubleEntry.creditLedgerId)) {
      setPaymentError("Unable to resolve supplier or cash account ledgers. Please check your accounting setup.");
      return;
    }

    // Validate that the payment amount does not exceed the remaining balance to prevent duplicate/excess postings
    if (activeMode === "advance") {
      const form = selected.form_data?.form || {};
      const totalPrice = (selected as any).form_data?.goodsEntries?.length
        ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
        : Number(form.totalAmount || 0);
      const advancePercent = Number(form.advancePercent || 0);
      const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
      const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
      const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
      const remainingAdvancePKR = remainingAdvanceBC * (selected.exchange_rate || 1);

      if (Number(amount) > remainingAdvancePKR + 1) {
        setPaymentError(`Payment amount (${Number(amount).toFixed(2)} PKR) cannot exceed the remaining advance amount (${remainingAdvancePKR.toFixed(2)} PKR).`);
        return;
      }
    } else if (activeMode === "remaining") {
      const remainingDuePKR = Number(selected.remaining_due || 0);
      if (Number(amount) > remainingDuePKR + 1) {
        setPaymentError(`Payment amount (${Number(amount).toFixed(2)} PKR) cannot exceed the remaining due balance (${remainingDuePKR.toFixed(2)} PKR).`);
        return;
      }
    }

    setProcessingPayment(true);
    setPaymentError("");
    setPaymentSuccess("");
    try {
      const isPostPaymentApi = activeMode === "advance" || activeMode === "remaining";
      
      let auditTrail = "";
      if (showCalcPanel && calcFinal !== null) {
        const opSymbol = calcOp === "mul" ? "×" : "÷";
        auditTrail = `[Audit Trail - Qty: ${calcAmount} | Currency: ${currency.toUpperCase()} | Rate: ${exchangeRate} | Op: ${opSymbol} | Converted: ${amount.toFixed(2)} PKR]`;
      } else {
        auditTrail = `[Audit Trail - Final Amount: ${amount.toFixed(2)} PKR (Local Currency Entry)]`;
      }
      const combinedNarration = remarks.trim();
      const finalNarration = `${combinedNarration.trim()}\n${auditTrail}`;

      const response = await fetch(
        isPostPaymentApi
          ? `/api/erp/purchases/orders/${selected.id}/payments`
          : `/api/erp/purchases/orders/${selected.id}`,
        {
          method: isPostPaymentApi ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isPostPaymentApi
              ? {
                  kind: activeMode,
                  entryDate: paymentDate,
                  amount: Number(amount),
                  currencyCode: currency,
                  exchangeRate: Number(exchangeRate || 1),
                  debitLedgerId: doubleEntry.debitLedgerId,
                  creditLedgerId: doubleEntry.creditLedgerId,
                  referenceNo: typeDetails.refNo || selected.purchase_contract_no || undefined,
                  narration: finalNarration.trim() || `PO ${selected.purchase_order_no} – ${activeMode === "advance" ? "Advance" : "Remaining"} Payment`
                }
              : {
                  paymentStatus: "credit_posted",
                  ledgerPostingStatus: "Posted",
                  creditAmount: Number(amount),
                  paymentDate,
                  paymentMethod: typeDetails.method || "Cash",
                  paymentNarration: finalNarration.trim() || `Credit payment for PO ${selected.purchase_order_no} on ${paymentDate}`,
                  ledgerEntry: {
                    type: "credit",
                    debitAccount: selectedForm.salesAccountNo || "-",
                    debitAccountName: selectedForm.salesAccountName || "Supplier Payable Account",
                    creditAccount: selectedSourceLedger?.code || "CASH-001",
                    creditAccountName: selectedSourceLedger?.name || "General Cash Account",
                    amount: Number(amount),
                    currency,
                    date: paymentDate,
                    narration: finalNarration.trim() || `PO ${selected.purchase_order_no} – Sales Credit Payment`
                  }
                }
          )
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Payment posting failed.");
      }
      setPaymentSuccess(`✅ Payment posted successfully for PO ${selected.purchase_order_no}.`);
      
      // Reset Roznamcha fields
      setCalcAmount("");
      setFinalPayment("");
      setRemarks("");
      setTypeDetails({});
      setAttachmentFile(null);

      void loadOrders();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment processing failed.");
    } finally {
      setProcessingPayment(false);
    }
  }

  const pageTitle = activeMode === "advance" ? "Purchase Order Advance Payment"
    : activeMode === "remaining" ? "Purchase Order Remaining Payment"
    : activeMode === "credit" ? "Purchase Order Credit Payment"
    : "Purchase Order Payment History";

  const pageDescription = activeMode === "advance" ? "Manage advance payments made against purchase orders."
    : activeMode === "remaining" ? "Manage remaining payments made against purchase orders."
    : activeMode === "credit" ? "Manage credit payments made against purchase orders."
    : "Trace and audit historical payments made against purchase orders.";

  const handleNewPaymentClick = () => {
    if (selected) {
      const el = document.getElementById("ledger-cash-entry-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (filtered.length > 0) {
      selectOrder(filtered[0].id);
    }
  };

  const getStatusBadge = (status: string) => {
    const val = status.toLowerCase();
    let badgeClass = "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/30";
    let displayLabel = "Pending";

    if (val.includes("paid") || val.includes("posted") || val.includes("clear")) {
      badgeClass = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30";
      displayLabel = "Paid";
    } else if (val.includes("partial")) {
      badgeClass = "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30";
      displayLabel = "Partial";
    }

    return (
      <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm", badgeClass)}>
        {displayLabel}
      </span>
    );
  };

  const renderDualCurrency = (amountFC: number, amountPKR: number, currencyCode: string, colorClass = "text-slate-800 dark:text-slate-200") => {
    const isPKR = (currencyCode || "PKR").toUpperCase() === "PKR";
    if (isPKR) {
      return (
        <span className={cn("font-mono font-bold text-xs", colorClass)}>
          {money(amountPKR, "PKR")}
        </span>
      );
    }
    return (
      <span className="flex flex-col text-right">
        <span className={cn("font-mono font-bold text-xs", colorClass)}>
          {money(amountFC, currencyCode)}
        </span>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          {money(amountPKR, "PKR")}
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{pageDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box input */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPageIndex(0);
              }}
              placeholder="Search PO, Supplier..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          {/* Filter toggle button */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
              filtersOpen && "border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", filtersOpen && "rotate-180")} />
          </button>
          {/* Combined Reset & Refresh Button */}
          <button
            onClick={() => {
              reset();
              void loadOrders();
            }}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin text-slate-550" : "h-3.5 w-3.5 text-slate-550"} />
            Reset & Refresh
          </button>
          {/* Three-dots menu (now contains export) */}
          <ReportActions rows={filtered} mode={activeMode} />
          {/* Calendar Date/Time Indicator */}
          <div className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>17 Jun 2026, 08:54 PM</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => <Metric key={card.label} {...card} />)}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Report Section ──────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Table Header */}
        <div className="flex flex-col items-center justify-center text-center w-full py-4 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-extrabold text-slate-950 dark:text-slate-100">Purchase Orders</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">List of purchase orders requiring payment action</p>
        </div>

        {/* Collapsible Filter Panel */}
        {filtersOpen && (
          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/10 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Status</span>
              <select
                value={draftFilter}
                onChange={(event) => setDraftFilter(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="">Draft Dropdown</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="posted">Posted</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <MiniFilter label="Currency" value="" options={Array.from(new Set(orders.map((row) => row.currency_code ?? "").filter(Boolean)))} onChange={() => undefined} />
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={reset}
                className="h-9 w-full border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 font-bold text-xs"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div style={{ minHeight: 320, overflowX: "auto", overflowY: "visible" }}>
          <table style={{ width: "100%", minWidth: "1200px", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 12, color: "#1e293b" }}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 2 }}>
                {[
                  { label: "PO Number", className: "text-left" },
                  { label: "Bill No", className: "text-left" },
                  { label: "Date", className: "text-left" },
                  { label: "Branch", className: "text-left" },
                  { label: "Supplier", className: "text-left" },
                  { label: "Goods", className: "text-left" },
                  { label: "Weights", className: "text-right" },
                  { label: "Total Price", className: "text-right" },
                  { label: activeMode === "advance" ? "Advance Details" : activeMode === "remaining" ? "Remaining Details" : "Credit Details", className: "text-right" },
                  { label: "Status", className: "text-center" },
                  { label: "Action", className: "text-center" }
                ].map((h, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "px-3 py-3.5 font-bold text-[10px] uppercase text-slate-500 dark:text-slate-400 select-none border-b border-slate-100 dark:border-slate-800",
                      h.className
                    )}
                    style={{
                      whiteSpace: "nowrap",
                      letterSpacing: "0.07em"
                    }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => {
                const goods = (row as any).form_data?.goodsEntries || [];
                const form = (row as any).form_data?.form || {};
                const totals = (row as any).form_data?.totals || {};

                const billNo = form.billNo || "-";
                const dateStr = date(form.purchaseDate || row.created_at);
                const countrySerial = form.branchCode || "-";

                const goodsName = goods.map((g: any) => g.goodsName).filter(Boolean).join(", ") || form.goodsName || "-";
                const grossWeight = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.grossWeight || 0), 0) : Number(form.grossWeight || 0);
                const netWeight = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.netWeight || 0), 0) : Number(form.netWeight || 0);

                const totalPrice = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0);
                const exchangeRate = row.exchange_rate || form.exchangeRate || 1;
                const finalAmount = row.order_total || totals.grandFinal || 0;

                const advancePercent = Number(form.advancePercent || 0);
                const requiredAdvance = (finalAmount * advancePercent) / 100;
                const paidAdvance = Number(row.advance_paid || 0);
                const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);

                const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                const paidAdvanceBC = paidAdvance / exchangeRate;
                const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                const remainingDue = Number(row.remaining_due || 0);

                const totalAmountBC = totalPrice;
                const totalAmountPKR = finalAmount;

                let paidAmountBC = 0;
                let paidAmountPKR = 0;
                let balanceAmountBC = 0;
                let balanceAmountPKR = 0;

                if (activeMode === "advance") {
                  paidAmountBC = paidAdvanceBC;
                  paidAmountPKR = paidAdvance;
                  balanceAmountBC = remainingAdvanceBC;
                  balanceAmountPKR = remainingAdvance;
                } else if (activeMode === "remaining") {
                  const remPaid = Number(row.remaining_paid || 0);
                  paidAmountPKR = remPaid;
                  paidAmountBC = remPaid / exchangeRate;
                  balanceAmountPKR = remainingDue;
                  balanceAmountBC = remainingDue / exchangeRate;
                } else {
                  // credit or history
                  const credPaid = Number(row.credit_amount || 0);
                  paidAmountPKR = credPaid;
                  paidAmountBC = credPaid / exchangeRate;
                  balanceAmountPKR = Math.max(0, finalAmount - credPaid);
                  balanceAmountBC = Math.max(0, totalPrice - paidAmountBC);
                }

                const statusText = row.payment_status || "Pending";
                const isSelected = selected?.id === row.id;
                const isExpanded = Boolean(expandedIds[row.id]);
                const rowBg = isSelected ? "#eff6ff" : index % 2 === 0 ? "#ffffff" : "#f8fafc";

                const getLedgerLabel = (id: string) => {
                  const led = ledgers.find((l) => l.id === id);
                  if (!led) return "—";
                  return `${led.code} - ${led.name}`;
                };

                const isPosted = row.ledger_posting_status === "Posted" || row.ledger_posting_status === "posted";
                const getRowColor = () => {
                  return isPosted ? "text-black dark:text-white" : "text-red-600 dark:text-red-400";
                };

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => selectOrder(row.id)}
                      style={{ background: rowBg, borderBottom: "1px solid #e2e8f0", cursor: "pointer", outline: isSelected ? "2px solid #3b82f6" : undefined, outlineOffset: -1 }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#f0f9ff"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                    >
                      {/* PO Number */}
                      <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800">
                        <span className={cn("font-mono font-bold text-xs bg-blue-50/50 hover:bg-blue-100/70 transition px-2.5 py-1 rounded-lg dark:bg-blue-950/20", getRowColor())}>
                          {row.purchase_order_no}
                        </span>
                      </td>
                      {/* Bill No */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 font-mono text-xs", getRowColor())}>
                        {billNo}
                      </td>
                      {/* PO Date */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-xs", getRowColor())}>
                        {dateStr}
                      </td>
                      {/* Branch */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-xs font-mono", getRowColor())}>
                        {countrySerial}
                      </td>
                      {/* Supplier */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800", getRowColor())}>
                        <div className="font-semibold text-xs leading-normal truncate" title={form.salesAccountName || "N/A"}>
                          {form.salesAccountName || "N/A"}
                        </div>
                      </td>
                      {/* Goods */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-xs leading-normal truncate", getRowColor())} title={goodsName}>
                        {goodsName}
                      </td>
                      {/* Weights */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right", getRowColor())}>
                        <div className="font-mono text-[11px]">G: {grossWeight.toLocaleString()}</div>
                        <div className="text-[9px] opacity-70 font-mono mt-0.5">N: {netWeight.toLocaleString()}</div>
                      </td>
                      {/* Total Price */}
                      <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right">
                        {renderDualCurrency(totalAmountBC, totalAmountPKR, row.currency_code ?? "USD", getRowColor())}
                      </td>
                      {/* Advance / Remaining Details */}
                      <td className={cn("px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-right", getRowColor())}>
                        {activeMode === "advance" ? (
                          <>
                            <div className="font-mono text-[11px]" title="Required Advance">
                              Req: {money(requiredAdvanceBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-emerald-600 font-mono mt-0.5 font-semibold" title="Paid Advance">
                              Paid: {money(paidAdvanceBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-rose-600 font-mono mt-0.5 font-bold" title="Remaining Advance">
                              Rem: {money(remainingAdvanceBC, row.currency_code ?? "")}
                            </div>
                          </>
                        ) : activeMode === "remaining" ? (
                          <>
                            <div className="font-mono text-[11px]" title="Required Remaining">
                              Req: {money(totalAmountBC - paidAdvanceBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-emerald-600 font-mono mt-0.5 font-semibold" title="Paid Remaining">
                              Paid: {money(paidAmountBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-rose-600 font-mono mt-0.5 font-bold" title="Remaining Due">
                              Rem: {money(balanceAmountBC, row.currency_code ?? "")}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-[11px]" title="Credit Total">
                              Cred: {money(totalAmountBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-emerald-600 font-mono mt-0.5 font-semibold" title="Paid Credit">
                              Paid: {money(paidAmountBC, row.currency_code ?? "")}
                            </div>
                            <div className="text-[9px] text-rose-600 font-mono mt-0.5 font-bold" title="Remaining Balance">
                              Rem: {money(balanceAmountBC, row.currency_code ?? "")}
                            </div>
                          </>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-center">
                        {getStatusBadge(statusText)}
                      </td>
                      {/* Action */}
                      <td className="px-3 py-4 align-middle border-b border-slate-100 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingRow(row)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                            title="View Detailed Bill"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenA4PDF(row, true)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                            title="Print Full A4 Bill/Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setExpandedIds((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                            }}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm font-bold text-xs",
                              isExpanded
                                ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                                : "text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                            )}
                            title="Toggle Payment History"
                          >
                            {isExpanded ? "➖" : "➕"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr onClick={(e) => e.stopPropagation()} style={{ background: "#f8fafc" }}>
                        <td colSpan={11} className="p-4 border-b border-slate-100 dark:border-slate-800">
                          {/* Nested Payments Traceability Sub-table */}
                          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                ➕ Traceable Payment History (Nested Journal Entries)
                              </h4>
                              {loadingPayments && (
                                <span className="text-[10px] font-semibold text-slate-400 animate-pulse">Loading history...</span>
                              )}
                            </div>
                            {selectedOrderPayments.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse" style={{ fontSize: 11 }}>
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-900 border-b font-bold text-slate-600 uppercase text-[9px] tracking-wider">
                                      <th className="p-2 border-r">Journal Serial</th>
                                      <th className="p-2 border-r">Country Serial</th>
                                      <th className="p-2 border-r">Branch Serial</th>
                                      <th className="p-2 border-r">Date</th>
                                      <th className="p-2 border-r">Debit Account (Supplier Payable)</th>
                                      <th className="p-2 border-r">Credit Account (Payment Source)</th>
                                      <th className="p-2 border-r">Narration</th>
                                      <th className="p-2 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedOrderPayments.map((p) => {
                                      const drLabel = getLedgerLabel(p.debit_ledger_id);
                                      const crLabel = getLedgerLabel(p.credit_ledger_id);
                                      const re = p.roznamcha_entries || {};

                                      const drLedger = ledgers.find((l) => l.id === p.debit_ledger_id);
                                      const crLedger = ledgers.find((l) => l.id === p.credit_ledger_id);
                                      const localCurrency = (drLedger?.ledgerCurrency || drLedger?.currency || crLedger?.ledgerCurrency || crLedger?.currency || "PKR").toUpperCase();

                                      return (
                                        <tr key={p.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200">
                                          <td className="p-2 border-r font-mono font-bold text-slate-900 dark:text-slate-100">{re.super_admin_serial_number || "—"}</td>
                                          <td className="p-2 border-r font-mono">{re.country_transaction_serial_number || "—"}</td>
                                          <td className="p-2 border-r font-mono">{re.branch_transaction_serial_number || "—"}</td>
                                          <td className="p-2 border-r">{date(p.entry_date)}</td>
                                          <td className="p-2 border-r font-semibold text-indigo-600" title={drLabel}>{drLabel}</td>
                                          <td className="p-2 border-r font-semibold text-violet-600" title={crLabel}>{crLabel}</td>
                                          <td className="p-2 border-r text-slate-500 max-w-[320px] truncate" title={p.narration}>{p.narration || "—"}</td>
                                          <td className="p-2 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                                            <div>{money(p.amount / (p.exchange_rate || 1), p.currency_code || "USD")}</div>
                                            {p.currency_code && p.currency_code !== localCurrency && (
                                              <div className="text-[9px] text-slate-400 font-normal mt-0.5">{money(p.amount, localCurrency)}</div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">No payments posted for this purchase order yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!pageRows.length && !loading && (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <FileSpreadsheet style={{ width: 40, height: 40, opacity: 0.3 }} />
                      <span>No purchase order payment records found.</span>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>Try adjusting filters or check if orders are posted.</span>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={11} style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading records…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{pageRows.length ? pageIndex * pageSize + 1 : 0} to {Math.min(filtered.length, (pageIndex + 1) * pageSize)}</strong> of <strong className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</strong> records
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPageIndex(0);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((idx) => Math.max(0, idx - 1))}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-650 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
                pageIndex === 0 && "text-slate-400 opacity-50 cursor-not-allowed"
              )}
              aria-label="Previous page"
            >
              <span className="text-xs">‹</span>
            </button>
            {Array.from({ length: Math.ceil(filtered.length / pageSize) }).slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPageIndex(idx)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition",
                  pageIndex === idx
                    ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                )}
              >
                {idx + 1}
              </button>
            ))}
            <button
              disabled={(pageIndex + 1) * pageSize >= filtered.length}
              onClick={() => setPageIndex((idx) => idx + 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-655 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
                (pageIndex + 1) * pageSize >= filtered.length && "text-slate-400 opacity-50 cursor-not-allowed"
              )}
              aria-label="Next page"
            >
              <span className="text-xs">›</span>
            </button>
          </div>
        </div>
      </section>



      {/* ── Ledger Cash Entry Panel ─────────────────────────── */}
      {selected && (
        <section id="ledger-cash-entry-section" className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden scroll-mt-6">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Ledger Cash Entry</h2>
              <p className="text-xs text-muted-foreground">Process Debit or Credit payment for PO <span className="font-bold text-primary">{selected.purchase_order_no}</span></p>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Already Transferred / Overpaid Warning Banner */}
            {(() => {
              const form = selected.form_data?.form || {};
              const totalPrice = (selected as any).form_data?.goodsEntries?.length
                ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                : Number(form.totalAmount || 0);
              const advancePercent = Number(form.advancePercent || 0);
              const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
              const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
              const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
              const remainingDue = Number(selected.remaining_due || 0);

              if (activeMode === "advance" && remainingAdvanceBC <= 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The advance payment for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              if (activeMode === "remaining" && remainingDue <= 0.01) {
                return (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 animate-in fade-in duration-300">
                    <XCircle className="h-5 w-5 shrink-0" /> Already Transferred: The remaining due for PO {selected.purchase_order_no} has already been fully paid.
                  </div>
                );
              }
              return null;
            })()}

            {/* Prominent Active PO Banner */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 dark:bg-blue-950/20 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-extrabold text-xs shadow-sm">
                  PO
                </span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Active Bill Selection</div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{selected.purchase_order_no}</span>
                    {selected.purchase_contract_no && (
                      <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border">
                        Contract: {selected.purchase_contract_no}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Total Value</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">{money(selected.order_total, selected.currency_code ?? "USD")}</span>
                </div>
                {activeMode === "advance" && (
                  <>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Paid Advance</span>
                      <span className="font-extrabold text-emerald-600">{money(selected.advance_paid, selected.currency_code ?? "USD")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Advance</span>
                      {(() => {
                        const form = (selected as any).form_data?.form || {};
                        const totalPrice = (selected as any).form_data?.goodsEntries?.length
                          ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                          : Number(form.totalAmount || 0);
                        const advancePercent = Number(form.advancePercent || 0);
                        const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                        const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
                        const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                        return <span className="font-extrabold text-rose-600">{money(remainingAdvanceBC, selected.currency_code ?? "USD")}</span>;
                      })()}
                    </div>
                  </>
                )}
                {activeMode === "remaining" && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Due</span>
                    <span className="font-extrabold text-rose-600">{money(selected.remaining_due, selected.currency_code ?? "USD")}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Exchange Rate</span>
                  <span className="font-bold text-slate-600 dark:text-slate-400 font-mono">1 {selected.currency_code} = {Number(selected.exchange_rate || 1).toFixed(2)} PKR</span>
                </div>
              </div>
            </div>

            {/* Split Layout grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form (Col Span 7) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Payment Input Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label="Payment Source Account" required>
                    <SearchSelect
                      label=""
                      value={paymentSourceLedgerId}
                      placeholder="Search Payment Source Account..."
                      options={ledgerOptions}
                      disabled={loading}
                      onValueChange={(val) => {
                        setPaymentSourceLedgerId(val);
                        // Sync account -> Category & Type
                        const led = ledgers.find((l) => l.id === val);
                        if (led) {
                          const name = String(led.name || "").toLowerCase();
                          const code = String(led.code || "").toLowerCase();
                          if (name.includes("cash") || code.includes("cash")) {
                            setPaymentType("cash");
                            setRoznamchaType("Cash Book No.");
                          } else if (name.includes("bank") || code.includes("bank")) {
                            setPaymentType("bank");
                            setRoznamchaType("Roznamcha Book No.");
                          }
                        }
                      }}
                    />
                    {selectedSourceLedger && (
                      <div className="mt-1 text-[10px] font-semibold text-slate-500 flex justify-between">
                        <span>Balance: {sourceBalanceText}</span>
                        <span>Currency: {selectedSourceLedger.currency || "PKR"}</span>
                      </div>
                    )}
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Type" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={roznamchaType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoznamchaType(val);
                        if (val === "Cash Book No.") {
                          setPaymentType("cash");
                          const cashLed = ledgers.find((l) => String(l.name || "").toLowerCase().includes("cash") || String(l.code || "").toLowerCase().includes("cash"));
                          if (cashLed) setPaymentSourceLedgerId(cashLed.id);
                        } else if (val === "Roznamcha Book No.") {
                          setPaymentType("bank");
                          const bankLed = ledgers.find((l) => String(l.name || "").toLowerCase().includes("bank") || String(l.code || "").toLowerCase().includes("bank"));
                          if (bankLed) setPaymentSourceLedgerId(bankLed.id);
                        }
                      }}
                    >
                      <option value="Cash Book No.">Cash Book No.</option>
                      <option value="Roznamcha Book No.">Roznamcha Book No.</option>
                      <option value="Receipt No.">Receipt No.</option>
                    </select>
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Number" required>
                    <Input
                      className="h-9 text-xs font-semibold w-full"
                      value={roznamchaNumber}
                      onChange={(e) => setRoznamchaNumber(e.target.value)}
                      placeholder="e.g. 000123"
                    />
                  </FieldBlock>

                  <FieldBlock label="Payment Date" required>
                    <Input
                      className="h-9 text-xs font-semibold w-full"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </FieldBlock>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label="Roznamcha Category" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={paymentType}
                      onChange={(e) => {
                        const value = e.target.value as any;
                        setPaymentType(value);
                        setTypeDetails({});
                        setAttachmentFile(null);
                        setFinalPayment("");

                        // Sync Category -> Type and Source Account
                        if (value === "cash") {
                          setRoznamchaType("Cash Book No.");
                          const cashLed = ledgers.find((l) => String(l.name || "").toLowerCase().includes("cash") || String(l.code || "").toLowerCase().includes("cash"));
                          if (cashLed) setPaymentSourceLedgerId(cashLed.id);
                        } else if (value === "bank") {
                          setRoznamchaType("Roznamcha Book No.");
                          const bankLed = ledgers.find((l) => String(l.name || "").toLowerCase().includes("bank") || String(l.code || "").toLowerCase().includes("bank"));
                          if (bankLed) setPaymentSourceLedgerId(bankLed.id);
                        }
                      }}
                    >
                      <option value="">Select Category</option>
                      <option value="cash">Cash Roznamcha</option>
                      <option value="bank">Bank Roznamcha</option>
                      <option value="business">Business Roznamcha</option>
                      <option value="invoice">Invoice Journal</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </FieldBlock>

                  <FieldBlock label="Currency" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        setFinalPayment("");
                      }}
                    >
                      <option value="">Select Currency</option>
                      {["USD", "AED", "PKR", "AFN", "INR", "IRR"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FieldBlock>
                </div>

                {/* Dynamic Type Panel */}
                {paymentType && (
                  <div className="rounded-lg border bg-slate-50/50 p-3 dark:bg-slate-900/20">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      {paymentType === "cash" && "Cash Details"}
                      {paymentType === "bank" && "Bank Details"}
                      {paymentType === "business" && "Business Details"}
                      {paymentType === "invoice" && "Invoice Details"}
                      {paymentType === "transfer" && "Transfer Details"}
                    </div>
                    
                    {paymentType === "cash" && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="Receiver / Sender Name">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.receiverSenderName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, receiverSenderName: e.target.value }))} placeholder="Receiver or sender name" />
                        </FieldBlock>
                        <FieldBlock label="Mobile Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.mobileNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, mobileNumber: e.target.value }))} placeholder="Mobile number" />
                        </FieldBlock>
                        <FieldBlock label="WhatsApp Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.whatsappNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, whatsappNumber: e.target.value }))} placeholder="WhatsApp number" />
                        </FieldBlock>
                        <FieldBlock label="ID Card Copy Upload">
                          <Input
                            className="h-9 text-xs font-semibold bg-background"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setAttachmentFile(file);
                              setTypeDetails((p) => ({ ...p, idCardCopyName: file?.name || "" }));
                            }}
                          />
                        </FieldBlock>
                      </div>
                    )}

                    {paymentType === "bank" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank Name</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                            value={typeDetails.bankName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new_bank__") {
                                openAddOption("bank");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, bankName: val }));
                              }
                            }}
                          >
                            <option value="">Select Bank</option>
                            {["HBL", "MCB", "UBL", "Meezan", "Bank Alfalah"].map((bank) => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                            {savedBanks.map((bank, index) => (
                              <option key={`${bank.name}-${index}`} value={bank.name}>{bank.name}</option>
                            ))}
                            <option value="__new_bank__" className="text-blue-700 font-bold">+ New Bank</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Method</span>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                            value={typeDetails.method || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new_method__") {
                                openAddOption("method");
                              } else {
                                setTypeDetails((prev) => ({ ...prev, method: val }));
                              }
                            }}
                          >
                            <option value="">Select Method</option>
                            {["Cheque", "Mobile Transfer", "Online Transfer", "Bank Transfer"].map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                            {savedMethods.map((method, index) => (
                              <option key={`${method}-${index}`} value={method}>{method}</option>
                            ))}
                            <option value="__new_method__" className="text-blue-700 font-bold">+ New Method</option>
                          </select>
                        </div>

                        <div className="grid gap-3 grid-cols-2">
                          <FieldBlock label="Reference No.">
                            <Input
                              className="h-9 text-xs font-semibold w-full"
                              value={typeDetails.refNo || ""}
                              onChange={(e) => setTypeDetails((prev) => ({ ...prev, refNo: e.target.value }))}
                              placeholder="Cheque/Mobile transaction number"
                            />
                          </FieldBlock>
                          <FieldBlock label="Payment Date" required>
                            <Input
                              className="h-9 text-xs font-semibold w-full"
                              type="date"
                              required
                              value={typeDetails.payDate || paymentDate}
                              onChange={(e) => setTypeDetails((prev) => ({ ...prev, payDate: e.target.value }))}
                            />
                          </FieldBlock>
                        </div>

                        <FieldBlock label="Attachment Upload">
                          <Input
                            className="h-9 text-xs font-semibold bg-background"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setAttachmentFile(file);
                              setTypeDetails((p) => ({ ...p, bankAttachmentName: file?.name || "" }));
                            }}
                          />
                        </FieldBlock>
                      </div>
                    )}

                    {(paymentType === "business" || paymentType === "invoice") && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="Invoice Number">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.invoiceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice number" />
                        </FieldBlock>
                        <FieldBlock label="Purchase Information">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.purchaseInfo || typeDetails.businessName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, purchaseInfo: e.target.value, businessName: e.target.value }))} placeholder="Purchase information" />
                        </FieldBlock>
                      </div>
                    )}

                    {paymentType === "transfer" && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldBlock label="From">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.from || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, from: e.target.value }))} placeholder="From account" />
                        </FieldBlock>
                        <FieldBlock label="To">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.to || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, to: e.target.value }))} placeholder="To account" />
                        </FieldBlock>
                        <FieldBlock label="Reference" className="md:col-span-2">
                          <Input className="h-9 text-xs font-semibold" value={typeDetails.ref || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, ref: e.target.value }))} placeholder="Reference" />
                        </FieldBlock>
                      </div>
                    )}
                  </div>
                )}



                {/* Currency Rate / Calculations */}
                {currency && showCalcPanel && (
                  <div className="rounded-lg border bg-slate-50/50 p-3 dark:bg-slate-900/20">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Transaction Conversion Details (Local Calculation) ({currency} ➔ PKR)
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldBlock label="Quantity / Amount">
                        <Input className="h-9 text-xs font-semibold" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} type="number" step="0.0001" min="0" placeholder="e.g. 100" />
                      </FieldBlock>
                      <FieldBlock label="Transaction Rate">
                        <Input className="h-9 text-xs font-semibold" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} type="number" step="0.0001" min="0" disabled={isLocalCurrency} />
                      </FieldBlock>
                      <FieldBlock label="Operation">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold outline-none"
                          value={calcOp}
                          onChange={(e) => setCalcOp(e.target.value as any)}
                        >
                          <option value="mul">Multiply (*)</option>
                          <option value="div">Divide (/)</option>
                        </select>
                      </FieldBlock>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Final Local Amount (PKR)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        PKR
                      </span>
                      <Input
                        className="h-9 pl-12 text-right text-xs font-black font-mono"
                        value={showCalcPanel && calcFinal !== null ? calcFinal.toFixed(2) : finalPayment}
                        onChange={(e) => setFinalPayment(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={showCalcPanel && calcFinal !== null}
                      />
                    </div>
                    {suggestedAdvance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const rate = Number(exchangeRate || 1);
                          setFinalPayment((suggestedAdvance * rate).toFixed(2));
                          setCalcAmount(suggestedAdvance.toFixed(2));
                        }}
                        className="text-[10px] text-primary font-semibold hover:underline mt-1 block"
                      >
                        Use suggested: {money(suggestedAdvance, currency)} / {money(suggestedAdvance * Number(exchangeRate || 1), "PKR")}
                      </button>
                    )}
                  </FieldBlock>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Transaction Entry Preview
                    </span>
                    <div className="h-9 flex items-center px-3 rounded-lg border border-indigo-400/40 bg-indigo-500/10 text-indigo-600 font-bold text-xs uppercase truncate">
                      🔵 Balanced entry — Dr: {doubleEntry.debitCode} / Cr: {doubleEntry.creditCode}
                    </div>
                  </div>
                </div>

                <FieldBlock label="Narration / Remarks">
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Manually add additional descriptions, comments, explanations, or transaction notes..."
                  />
                </FieldBlock>

                {/* Summary & Action */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                  <div className="text-xs space-y-0.5 text-muted-foreground">
                    <div>
                      <span className="font-bold text-foreground">Posting: </span>
                      <><span className="font-bold text-indigo-600">DR</span> {doubleEntry.debitName} ({doubleEntry.debitCode}) / <span className="font-bold text-violet-600">CR</span> {doubleEntry.creditName} ({doubleEntry.creditCode})</>
                    </div>
                    <div><span className="font-bold text-foreground">Amount: </span>{amount ? money(amount, "PKR") : "—"}</div>
                    {selected && (
                      <div>
                        <span className="font-bold text-foreground font-semibold">Remaining Bill Balance (Baqaya): </span>
                        {(() => {
                          const form = selected.form_data?.form || {};
                          const totalPrice = (selected as any).form_data?.goodsEntries?.length
                            ? (selected as any).form_data.goodsEntries.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0)
                            : Number(form.totalAmount || 0);
                          const advancePercent = Number(form.advancePercent || 0);
                          const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                          const paidAdvanceBC = Number(selected.advance_paid || 0) / (selected.exchange_rate || 1);
                          const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);
                          const remainingDue = Number(selected.remaining_due || 0);

                          if (activeMode === "advance") {
                            return (
                              <span className="font-extrabold text-rose-600">
                                {money(remainingAdvanceBC, selected.currency_code ?? "USD")} ({money(remainingAdvanceBC * (selected.exchange_rate || 1), "PKR")})
                              </span>
                            );
                          } else {
                            return (
                              <span className="font-extrabold text-rose-600">
                                {money(remainingDue / (selected.exchange_rate || 1), selected.currency_code ?? "USD")} ({money(remainingDue, "PKR")})
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={processingPayment || !amount || !canSave}
                    className="h-10 px-6 font-bold text-xs uppercase shadow-md transition bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {processingPayment ? "Processing..." : `Post ${activeMode === "advance" ? "Advance" : "Remaining"} Payment`}
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

              {/* Right Column: Double-entry Ledger Preview (Col Span 5) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Double-Entry Journal Posting Preview
                </div>
                <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-950">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 text-left">Type</th>
                        <th className="px-3 py-2.5 text-left">Account</th>
                        <th className="px-3 py-2.5 text-right">Amount ({currency})</th>
                        <th className="px-2 py-2.5 text-center">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border bg-indigo-500/5 ring-1 ring-inset ring-indigo-400/20">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-400/20 px-2 py-0.5 text-[9px] font-black text-indigo-600 uppercase">
                            DEBIT (Dr)
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground line-clamp-1">{doubleEntry.debitName}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {doubleEntry.debitCode} {doubleEntry.debitBranch && doubleEntry.debitBranch !== "-" && `| Branch: ${doubleEntry.debitBranch}`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {amount ? money(amount / Number(exchangeRate || 1), currency) : <span className="text-muted-foreground">—</span>}
                          <span className="block text-[9px] text-muted-foreground font-normal">{money(amount, "PKR")}</span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            checked
                            readOnly
                            className="h-3.5 w-3.5 accent-indigo-600"
                          />
                        </td>
                      </tr>
                      <tr className="bg-violet-500/5 ring-1 ring-inset ring-violet-400/20">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-400/20 px-2 py-0.5 text-[9px] font-black text-violet-600 uppercase">
                            CREDIT (Cr)
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground line-clamp-1">{doubleEntry.creditName}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {doubleEntry.creditCode} {doubleEntry.creditBranch && doubleEntry.creditBranch !== "-" && `| Branch: ${doubleEntry.creditBranch}`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-violet-600 whitespace-nowrap">
                          {(() => {
                            if (!amount) return <span className="text-muted-foreground">—</span>;
                            const isCrPKR = !selectedSourceLedger || selectedSourceLedger.currency?.toUpperCase() === "PKR";
                            if (isCrPKR) {
                              return (
                                <>
                                  {money(amount, "PKR")}
                                  {currency !== "PKR" && (
                                    <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                                      {money(amount / Number(exchangeRate || 1), currency)}
                                    </span>
                                  )}
                                </>
                              );
                            } else {
                              const crCurrency = selectedSourceLedger?.currency || currency;
                              return (
                                <>
                                  {money(amount / Number(exchangeRate || 1), crCurrency)}
                                  {crCurrency !== "PKR" && (
                                    <span className="block text-[9px] text-muted-foreground font-normal mt-0.5">
                                      {money(amount, "PKR")}
                                    </span>
                                  )}
                                </>
                              );
                            }
                          })()}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <input
                            type="radio"
                            checked
                            readOnly
                            className="h-3.5 w-3.5 accent-violet-600"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-[11px] text-muted-foreground dark:border-slate-800 dark:bg-slate-900/30 leading-relaxed space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Double-Entry Posting Guide</div>
                  <p>
                    Every transaction balances dynamically. When you process a payment:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>The Debit (Dr) records are updated to settle liabilities with the seller/supplier.</li>
                    <li>The Credit (Cr) records deduct funds from your payment source ledger.</li>
                    <li>Exchange conversion calculates local currency value (PKR) automatically.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      {addOptionOpen ? (
        <SimpleModal
          title={addOptionType === "bank" ? "Add New Bank" : "Payment Method Manager"}
          onClose={() => setAddOptionOpen(false)}
          className="max-w-md"
        >
          {addOptionType === "bank" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-black">Bank Name</Label>
                <Input
                  className="text-xs font-semibold"
                  value={addOptionValue}
                  onChange={(e) => setAddOptionValue(e.target.value)}
                  placeholder="e.g. HBL Karachi Branch"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-black">Bank Address</Label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold focus-visible:outline-none"
                  value={addOptionAddress}
                  onChange={(e) => setAddOptionAddress(e.target.value)}
                  placeholder="Enter bank physical branch address..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs" onClick={commitAddOption}>
                  Save Bank
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 pb-3 border-b">
                <Label className="text-xs font-black">Add New Payment Method</Label>
                <div className="flex gap-2">
                  <Input
                    className="text-xs font-semibold"
                    value={addOptionValue}
                    onChange={(e) => setAddOptionValue(e.target.value)}
                    placeholder="e.g. EasyPaisa / JazzCash"
                  />
                  <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs" onClick={commitAddOption}>
                    Add
                  </Button>
                </div>
              </div>

              {savedMethods.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-black">Custom Methods List (Click text to rename, or Blur to save)</Label>
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {savedMethods.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Input
                          defaultValue={m}
                          className="h-8 text-xs font-semibold"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== m) {
                              renameCustomMethod(m, val);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-bold"
                          onClick={() => deleteCustomMethod(m)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-400 italic text-center py-2">
                  No custom payment methods added yet.
                </p>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </SimpleModal>
      ) : null}

      {/* Detailed PO Modal */}
      {viewingRow && (
        <SimpleModal
          title={`Purchase Order Details - ${viewingRow.purchase_order_no}`}
          onClose={() => setViewingRow(null)}
          className="max-w-4xl w-full"
        >
          {(() => {
            const form = viewingRow.form_data?.form || {};
            const goods = viewingRow.form_data?.goodsEntries || [];
            const totals = viewingRow.form_data?.totals || {};
            
            const billNo = form.billNo || "-";
            const dateStr = date(form.purchaseDate || viewingRow.created_at);
            const branchCode = form.branchCode || "-";
            
            const totalPriceFC = goods.length ? goods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(form.totalAmount || 0);
            const exchangeRateVal = viewingRow.exchange_rate || form.exchangeRate || 1;
            const finalAmountPKR = viewingRow.order_total || totals.grandFinal || 0;

            const advancePercent = Number(form.advancePercent || 0);
            const reqAdvanceBC = (totalPriceFC * advancePercent) / 100;
            const reqAdvancePKR = (finalAmountPKR * advancePercent) / 100;
            const paidAdvancePKR = Number(viewingRow.advance_paid || 0);
            const paidAdvanceBC = paidAdvancePKR / exchangeRateVal;
            const remAdvanceBC = Math.max(0, reqAdvanceBC - paidAdvanceBC);

            return (
              <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                {/* Header overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">PO Number</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{viewingRow.purchase_order_no}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Bill Number</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{billNo}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Purchase Date</span>
                    <span className="mt-1 block font-bold text-xs text-slate-800 dark:text-slate-200">{dateStr}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Branch</span>
                    <span className="mt-1 block font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{branchCode}</span>
                  </div>
                </div>

                {/* Items & Weights */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                    Goods & Weights Details
                  </div>
                  <div className="p-4 space-y-4">
                    {goods.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b text-slate-400 font-bold uppercase text-[10px]">
                              <th className="pb-2">Goods Name</th>
                              <th className="pb-2 text-right">Qty</th>
                              <th className="pb-2 text-right">Gross Wt</th>
                              <th className="pb-2 text-right">Net Wt</th>
                              <th className="pb-2 text-right">Unit Price</th>
                              <th className="pb-2 text-right">Total FC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goods.map((g: any, idx: number) => (
                              <tr key={idx} className="border-b last:border-b-0 text-slate-800 dark:text-slate-200">
                                <td className="py-2.5 font-semibold">{g.goodsName || "-"}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.qtyNo || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.grossWeight || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{Number(g.netWeight || 0).toLocaleString()}</td>
                                <td className="py-2.5 text-right font-mono">{money(g.coursePrice, viewingRow.currency_code ?? "")}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{money(g.totalAmount, viewingRow.currency_code ?? "")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Goods</span>
                          <span className="font-semibold">{form.goodsName || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Qty</span>
                          <span className="font-mono font-semibold">{Number(form.qtyNo || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Gross Weight</span>
                          <span className="font-mono font-semibold">{Number(form.grossWeight || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Net Weight</span>
                          <span className="font-mono font-semibold">{Number(form.netWeight || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase text-slate-400">Total FC</span>
                          <span className="font-mono font-bold">{money(totalPriceFC, viewingRow.currency_code ?? "")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Total & Conversion Summary</h4>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-400 text-xs">Total Purchase (FC)</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(totalPriceFC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-400 text-xs">Exchange Rate</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">1 {viewingRow.currency_code} = {Number(exchangeRateVal).toFixed(4)} PKR</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-800 font-bold dark:text-slate-200">Final Converted (PKR)</span>
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">{money(finalAmountPKR, "PKR")}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Advance Payment Summary ({advancePercent}%)</h4>
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-400 text-xs">Required Advance</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{money(reqAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 text-emerald-600">
                      <span className="text-xs font-semibold">Paid Advance</span>
                      <span className="font-mono font-bold">{money(paidAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 text-rose-600 font-bold">
                      <span>Remaining Advance Due</span>
                      <span className="font-mono font-black">{money(remAdvanceBC, viewingRow.currency_code ?? "")}</span>
                    </div>
                  </div>
                </div>

                {/* Transit Details */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20 space-y-2 text-xs">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Transit & Logistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    <div>
                      <span className="text-slate-400 block">Loading Country</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.loadingCountry || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Loading Date</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.loadingDate || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Received Country</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.receivedCountry || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Received Date</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{form.receivedDate || "N/A"}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <span className="text-slate-400 block">Payment / Transit Condition</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{form.paymentType || viewingRow.payment_status || "N/A"}</span>
                  </div>
                </div>

                {/* Print and Close Buttons */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    type="button"
                    onClick={() => handleOpenA4PDF(viewingRow, true)}
                    className="h-10 px-5 font-bold text-xs uppercase bg-blue-600 hover:bg-blue-700 text-white border-0 flex items-center gap-2 rounded-xl"
                  >
                    <Printer className="h-4 w-4" />
                    Print Full A4 Invoice (PDF)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setViewingRow(null)}
                    className="h-10 px-6 font-bold text-xs uppercase bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border-0 rounded-xl"
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            );
          })()}
        </SimpleModal>
      )}
    </div>
  );
}

function Metric({ label, value, sublabel, icon, tone }: KpiCard) {
  const colorClasses = {
    blue: {
      text: "text-blue-800 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/30",
      iconText: "text-blue-800 dark:text-blue-400"
    },
    green: {
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconText: "text-emerald-700 dark:text-emerald-400"
    },
    amber: {
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
      iconText: "text-amber-700 dark:text-amber-400"
    },
    red: {
      text: "text-red-700 dark:text-red-400",
      iconBg: "bg-red-50 dark:bg-red-950/30",
      iconText: "text-red-700 dark:text-red-400"
    },
    slate: {
      text: "text-slate-700 dark:text-slate-300",
      iconBg: "bg-slate-50 dark:bg-slate-800",
      iconText: "text-slate-600 dark:text-slate-400"
    }
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", colorClasses.iconBg, colorClasses.iconText)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">{label}</p>
        <p className={cn("mt-1 text-[22px] font-black tracking-tight", colorClasses.text)}>{value}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">{sublabel}</p>
      </div>
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
  function handleReportAction(fn: () => void) {
    fn();
    const details = document.activeElement?.closest("details");
    if (details) (details as HTMLDetailsElement).open = false;
  }
  return (
    <details className="relative">
      <summary className="flex h-9 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-input bg-background text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Payment report actions" title="Payment report actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl">
        <MenuAction icon={<Eye />} label="Plate View" onClick={() => handleReportAction(() => undefined)} />
        <MenuAction icon={<DownloadActionIcon />} label="Download" onClick={() => handleReportAction(() => exportRows(rows, mode))} />
        <MenuAction icon={<FileSpreadsheet />} label="Export Excel" onClick={() => handleReportAction(() => exportRows(rows, mode))} />
        <MenuAction icon={<DownloadActionIcon />} label="Export PDF" onClick={() => handleReportAction(() => window.print())} />
        <MenuAction icon={<Printer />} label="Print" onClick={() => handleReportAction(() => window.print())} />
      </div>
    </details>
  );
}

function RowActions({ onSelect, rowId }: { onSelect: () => void; rowId: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 192 });
    }
    setOpen((o) => !o);
  }

  function handleItem(fn: () => void) {
    fn();
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 32, width: 32, borderRadius: 8,
          border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer",
          color: "#64748b", transition: "background 0.15s"
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        aria-label="Row actions"
      >
        <MoreVertical style={{ width: 15, height: 15 }} />
      </button>

      {open && typeof document !== "undefined" && (
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: 192,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 10px 40px rgba(0,0,0,0.14)",
            padding: "4px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { icon: <Eye style={{ width: 14, height: 14 }} />, label: "View Details", color: "#2563eb", fn: () => handleItem(onSelect) },
            { icon: <WalletCards style={{ width: 14, height: 14 }} />, label: "Payment History", color: "#7c3aed", fn: () => handleItem(onSelect) },
            { icon: <Banknote style={{ width: 14, height: 14 }} />, label: "Journal Entry", color: "#059669", fn: () => handleItem(onSelect) },
            { icon: <Printer style={{ width: 14, height: 14 }} />, label: "Print", color: "#475569", fn: () => handleItem(() => window.print()) },
            { icon: <DownloadActionIcon />, label: "Export PDF", color: "#dc2626", fn: () => handleItem(() => window.print()) },
          ].map(({ icon, label, color, fn }) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px",
                background: "none", border: "none", borderRadius: 8,
                cursor: "pointer", textAlign: "left",
                fontSize: 12, fontWeight: 600, color: "#1e293b",
                transition: "background 0.12s"
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ color, flexShrink: 0 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </>
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
