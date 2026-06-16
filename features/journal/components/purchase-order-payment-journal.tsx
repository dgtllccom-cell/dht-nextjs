"use client";
 
import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  WalletCards,
  Save,
  Plus,
  FileText,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = useState("");
  const [draftFilter, setDraftFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);

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

  const supplierLedger = useMemo(() => {
    return ledgers.find((l) => l.code === selectedForm.salesAccountNo);
  }, [ledgers, selectedForm.salesAccountNo]);

  const cashLedger = useMemo(() => {
    return ledgers.find((l) => l.code === "CASH-001") ||
           ledgers.find((l) => l.code?.toLowerCase().includes("cash") || l.name?.toLowerCase().includes("cash")) ||
           ledgers.find((l) => l.code?.toLowerCase().includes("bank") || l.name?.toLowerCase().includes("bank")) ||
           ledgers[0];
  }, [ledgers]);

  // Set default paymentSourceLedgerId once cashLedger is loaded
  useEffect(() => {
    if (cashLedger && !paymentSourceLedgerId) {
      setPaymentSourceLedgerId(cashLedger.id);
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
    if (activeMode === "advance" || activeMode === "remaining") {
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
    } else {
      return {
        debitName: selectedForm.purchaseAccountName || "Purchase Account",
        debitCode: selectedForm.purchaseAccountNo || "-",
        debitBranch: selectedForm.purchaseAccountBranch || "-",
        creditName: selectedForm.salesAccountName || "Supplier Payable Account",
        creditCode: selectedForm.salesAccountNo || "-",
        creditBranch: selectedForm.salesAccountBranch || "-",
        debitLedgerId: purchaseLedger?.id,
        creditLedgerId: supplierLedger?.id
      };
    }
  }, [activeMode, selectedForm, selectedSourceLedger, supplierLedger, purchaseLedger]);

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

  // Sync category details directly to remarks textarea dynamically
  useEffect(() => {
    setRemarks((prev) => {
      const lines = prev.split("\n").map((l) => l.trim()).filter((l) => {
        return !l.startsWith("Bank Details:") &&
               !l.startsWith("Cash Details:") &&
               !l.startsWith("Transfer Details:") &&
               !l.startsWith("Invoice/Business Details:") &&
               !l.startsWith("Invoice Details:");
      });
      
      if (detailsString) {
        lines.push(detailsString);
      }
      return lines.filter(Boolean).join("\n");
    });
  }, [detailsString]);

  // Sync calculation details directly to remarks textarea dynamically
  useEffect(() => {
    if (showCalcPanel && calcAmount && exchangeRate && calcFinal !== null) {
      setRemarks((prev) => {
        const opSymbol = calcOp === "mul" ? "×" : "÷";
        const newCalcLine = `Calculation: ${Number(calcAmount).toLocaleString()} ${currency.toUpperCase()} ${opSymbol} ${Number(exchangeRate).toLocaleString()} = ${calcFinal.toFixed(2)} PKR`;
        
        const lines = prev.split("\n").map((l) => l.trim()).filter((l) => !l.startsWith("Calculation:"));
        lines.push(newCalcLine);
        return lines.filter(Boolean).join("\n");
      });
    } else {
      setRemarks((prev) => {
        const lines = prev.split("\n").map((l) => l.trim()).filter((l) => !l.startsWith("Calculation:"));
        return lines.filter(Boolean).join("\n");
      });
    }
  }, [showCalcPanel, calcAmount, exchangeRate, calcOp, currency, calcFinal]);

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
                    debitAccount: debitAccountCode,
                    debitAccountName,
                    creditAccount: creditAccountCode,
                    creditAccountName,
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
                {(activeMode === "advance"
                  ? ["SR#", "Admin S#", "Country S#", "Bill No", "Date", "Seller Acc", "Buyer Acc", "Goods Name", "Qty", "Gross Weight", "Net Weight", "Price", "Total Price", "Ex. Rate", "Final Amount", "Advance Due Date", "Advance %", "Req. Advance", "Paid Advance", "Remaining Advance", "Payment Condition", "Actions"]
                  : ["SR#", "Admin S#", "Country S#", "Bill No", "Date", "Seller Acc", "Buyer Acc", "Goods Name", "Qty", "Gross Weight", "Net Weight", "Price", "Total Price", "Ex. Rate", "Final Amount", "Payment Condition", "Actions"]
                ).map((header, idx) => (
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

                const advancePercent = Number(form.advancePercent || 0);
                const requiredAdvance = (finalAmount * advancePercent) / 100;
                const paidAdvance = Number(row.advance_paid || 0);
                const remainingAdvance = Math.max(0, requiredAdvance - paidAdvance);

                const requiredAdvanceBC = (totalPrice * advancePercent) / 100;
                const paidAdvanceBC = paidAdvance / exchangeRate;
                const remainingAdvanceBC = Math.max(0, requiredAdvanceBC - paidAdvanceBC);

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
                    {activeMode === "advance" && (
                      <>
                        <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center font-semibold text-slate-700 last:border-r-0">{date(form.advancePaymentDate || form.advanceDate || form.dueDate)}</td>
                        <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-slate-700 last:border-r-0">{advancePercent}%</td>
                        <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-amber-700 font-bold last:border-r-0">
                          {money(requiredAdvanceBC, row.currency_code ?? "")}
                          <span className="block text-[10px] text-muted-foreground font-normal">{money(requiredAdvance, "PKR")}</span>
                        </td>
                        <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-emerald-650 font-bold last:border-r-0">
                          {money(paidAdvanceBC, row.currency_code ?? "")}
                          <span className="block text-[10px] text-muted-foreground font-normal">{money(paidAdvance, "PKR")}</span>
                        </td>
                        <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-right font-mono text-rose-600 font-bold last:border-r-0">
                          {money(remainingAdvanceBC, row.currency_code ?? "")}
                          <span className="block text-[10px] text-muted-foreground font-normal">{money(remainingAdvance, "PKR")}</span>
                        </td>
                      </>
                    )}
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-slate-700 max-w-[280px] truncate text-[11px] font-medium last:border-r-0" title={transitSummary}>{transitSummary}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center last:border-r-0"><RowActions onSelect={() => setSelectedId(row.id)} /></td>
                  </tr>
                );
              })}
              {!pageRows.length && !loading ? (
                <tr>
                  <td colSpan={activeMode === "advance" ? 22 : 17} className="px-3 py-10 text-center text-muted-foreground">No purchase order payment records found.</td>
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
          (() => {
            const selGoods = selected.form_data?.goodsEntries || [];
            const selForm = selected.form_data?.form || {};
            const selExchangeRate = Number(selected.exchange_rate || selForm.exchangeRate || 1);
            const selCurrency = selected.currency_code || selForm.currencyType || "USD";

            const selTotalPriceUsd = selGoods.length ? selGoods.reduce((sum: number, g: any) => sum + Number(g.totalAmount || 0), 0) : Number(selForm.totalAmount || 0);
            const selTotalPricePkr = Number(selected.order_total || selected.form_data?.totals?.grandFinal || (selTotalPriceUsd * selExchangeRate));

            const selAdvancePercent = Number(selForm.advancePercent || 0);
            const selRequiredAdvancePkr = (selTotalPricePkr * selAdvancePercent) / 100;
            const selRequiredAdvanceUsd = (selTotalPriceUsd * selAdvancePercent) / 100;

            const selPaidAdvancePkr = Number(selected.advance_paid || 0);
            const selPaidAdvanceUsd = selPaidAdvancePkr / selExchangeRate;

            const selRemainingPaidPkr = Number(selected.remaining_paid || 0);
            const selRemainingPaidUsd = selRemainingPaidPkr / selExchangeRate;

            const selCreditAmountPkr = Number(selected.credit_amount || 0);
            const selCreditAmountUsd = selCreditAmountPkr / selExchangeRate;

            const selRemainingDuePkr = Number(selected.remaining_due || 0);
            const selRemainingDueUsd = selRemainingDuePkr / selExchangeRate;

            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Purchase Order Info</h3>
                  <InfoRow label="Purchase Order No" value={selected.purchase_order_no} />
                  <InfoRow label="Contract Ref No" value={selected.purchase_contract_no ?? "-"} />
                  <InfoRow label="Booking Date" value={date(selected.created_at)} />
                  <InfoRow label="Advance Due Date" value={date(selForm.advancePaymentDate || selForm.advanceDate || selForm.dueDate)} />
                  <InfoRow label="Journal Code" value={`JE-${selected.purchase_order_no.replace(/[^0-9]/g, "").slice(-6) || "000001"}`} />
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Transaction Valuations</h3>
                  <InfoRow label="Base Currency" value={selCurrency} />
                  <InfoRow label="Exchange Rate" value={`${selExchangeRate.toFixed(2)} Rs`} />
                  <InfoRow label="Total PO Amount" value={`${money(selTotalPriceUsd)} ${selCurrency} / ${money(selTotalPricePkr)} PKR`} highlight />
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Payment Allocations</h3>
                  <InfoRow label="Advance Paid" value={`${money(selPaidAdvanceUsd)} ${selCurrency} / ${money(selPaidAdvancePkr)} PKR`} />
                  <InfoRow label="Remaining Paid" value={`${money(selRemainingPaidUsd)} ${selCurrency} / ${money(selRemainingPaidPkr)} PKR`} />
                  <InfoRow label="Credit Amount" value={`${money(selCreditAmountUsd)} ${selCurrency} / ${money(selCreditAmountPkr)} PKR`} />
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">Current Standing</h3>
                  <InfoRow label="Outstanding Due" value={`${money(selRemainingDueUsd)} ${selCurrency} / ${money(selRemainingDuePkr)} PKR`} highlight />
                  <InfoRow label="Payment Status" value={selected.payment_status ?? "Pending"} />
                  <InfoRow label="Posting Status" value={selected.ledger_posting_status ?? "Pending"} />
                </div>
              </div>
            );
          })()
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
                  <tr className="border-b border-border bg-indigo-500/8 ring-1 ring-inset ring-indigo-400/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 px-2.5 py-1 text-[10px] font-black text-indigo-600 uppercase">
                        DEBIT (Dr)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{doubleEntry.debitName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{doubleEntry.debitCode}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">{doubleEntry.debitBranch}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                      {amount ? money(amount / Number(exchangeRate || 1), currency) : <span className="text-muted-foreground">—</span>}
                      <span className="block text-[10px] text-muted-foreground font-normal">{money(amount, "PKR")}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        checked
                        readOnly
                        className="h-4 w-4 accent-indigo-600"
                      />
                    </td>
                  </tr>
                  <tr className="bg-violet-500/8 ring-1 ring-inset ring-violet-400/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-400/30 px-2.5 py-1 text-[10px] font-black text-violet-600 uppercase">
                        CREDIT (Cr)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{doubleEntry.creditName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{doubleEntry.creditCode}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">{doubleEntry.creditBranch}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-violet-600">
                      {amount ? money(amount / Number(exchangeRate || 1), currency) : <span className="text-muted-foreground">—</span>}
                      <span className="block text-[10px] text-muted-foreground font-normal">{money(amount, "PKR")}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        checked
                        readOnly
                        className="h-4 w-4 accent-violet-600"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FieldBlock label="Payment Source Account" required>
                <SearchSelect
                  label=""
                  value={paymentSourceLedgerId}
                  placeholder="Search Payment Source Account..."
                  options={ledgerOptions}
                  disabled={loading}
                  onValueChange={setPaymentSourceLedgerId}
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
                  onChange={(e) => setRoznamchaType(e.target.value)}
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
                <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  {paymentType === "cash" && "Cash Details"}
                  {paymentType === "bank" && "Bank Details"}
                  {paymentType === "business" && "Business Details"}
                  {paymentType === "invoice" && "Invoice Details"}
                  {paymentType === "transfer" && "Transfer Details"}
                </div>

                {paymentType === "cash" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldBlock label="Receiver / Sender Name">
                      <Input className="h-9 text-xs" value={typeDetails.receiverSenderName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, receiverSenderName: e.target.value }))} placeholder="Receiver or sender name" />
                    </FieldBlock>
                    <FieldBlock label="Mobile Number">
                      <Input className="h-9 text-xs" value={typeDetails.mobileNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, mobileNumber: e.target.value }))} placeholder="Mobile number" />
                    </FieldBlock>
                    <FieldBlock label="WhatsApp Number">
                      <Input className="h-9 text-xs" value={typeDetails.whatsappNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, whatsappNumber: e.target.value }))} placeholder="WhatsApp number" />
                    </FieldBlock>
                    <FieldBlock label="ID Card Copy Upload">
                      <Input
                        className="h-9 text-xs bg-white"
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
                    <div className="grid gap-3 grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-500 uppercase">Bank Name</Label>
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
                        <Label className="text-[10px] font-black text-slate-500 uppercase">Payment Method</Label>
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
                    </div>

                    <div className="grid gap-3 grid-cols-3">
                      <FieldBlock label="Account Number">
                        <Input
                          className="h-9 text-xs font-semibold w-full"
                          value={typeDetails.bankAccount || ""}
                          onChange={(e) => setTypeDetails((prev) => ({ ...prev, bankAccount: e.target.value }))}
                          placeholder="Bank A/C number"
                        />
                      </FieldBlock>
                      <FieldBlock label="Transfer Reference">
                        <Input
                          className="h-9 text-xs font-semibold w-full"
                          value={typeDetails.refNo || ""}
                          onChange={(e) => setTypeDetails((prev) => ({ ...prev, refNo: e.target.value }))}
                          placeholder="Ref or Tx ID"
                        />
                      </FieldBlock>
                      <FieldBlock label="Transfer Date" required>
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
                        className="h-9 text-xs bg-white"
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
                      <Input className="h-9 text-xs" value={typeDetails.invoiceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice number" />
                    </FieldBlock>
                    <FieldBlock label="Purchase Information">
                      <Input className="h-9 text-xs" value={typeDetails.purchaseInfo || typeDetails.businessName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, purchaseInfo: e.target.value, businessName: e.target.value }))} placeholder="Purchase information" />
                    </FieldBlock>
                  </div>
                )}

                {paymentType === "transfer" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldBlock label="From">
                      <Input className="h-9 text-xs" value={typeDetails.from || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, from: e.target.value }))} placeholder="From account" />
                    </FieldBlock>
                    <FieldBlock label="To">
                      <Input className="h-9 text-xs" value={typeDetails.to || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, to: e.target.value }))} placeholder="To account" />
                    </FieldBlock>
                    <FieldBlock label="Reference" className="md:col-span-2">
                      <Input className="h-9 text-xs" value={typeDetails.ref || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, ref: e.target.value }))} placeholder="Reference" />
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
