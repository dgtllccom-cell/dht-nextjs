"use client";

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Menu,
  Printer,
  RefreshCw,
  Save,
  Search,
  User,
  X,
  MoreVertical
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { SimpleModal } from "@/components/ui/simple-modal";
import { listCountries, type LocationCountry } from "@/features/locations/location-api";
import {
  listLedgerReportLedgers,
  type LedgerLookupRow
} from "@/features/reports/ledger-report/ledger-report-api";
import { apiGet, apiPost } from "@/lib/api/client";
import type { RoznamchaType } from "@/lib/accounting/roznamcha-flow";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import { BankPicker } from "@/features/banks/components/bank-picker";
import { getBankById } from "@/features/banks/bank-api";

const SAVED_BANKS_KEY = "erp_saved_banks_v1";
const SAVED_METHODS_KEY = "erp_saved_payment_methods_v1";

type SessionResponse = {
  user: { id: string; email: string | null; fullName: string | null };
  roles: string[];
  scopes: {
    countryIds: string[];
    countryBranchIds: string[];
    cityBranchIds: string[];
    isSuperAdmin: boolean;
  };
};

type CountryBranchRow = {
  id: string;
  country_id: string;
  name: string;
  code: string;
  local_currency: string;
  is_main: boolean;
};

type CityBranchRow = {
  id: string;
  country_id: string;
  country_branch_id: string;
  city_name: string;
  name: string;
  code: string;
  local_currency: string;
};

type RoznamchaPostResponse = {
  mode: "post" | "validate";
  balanced: boolean;
  entryId?: string;
  superAdminSerialNumber?: string | null;
  countryTransactionSerialNumber?: string | null;
  branchTransactionSerialNumber?: string | null;
};

type AccountLookupResponse = {
  found: boolean;
  account: LedgerLookupRow | null;
  query: string;
};

type LatestRateResponse = {
  rate: number;
  buyRate?: number;
  sellRate?: number;
  creditRate?: number;
  debitRate?: number;
  effectiveDate?: string | null;
  source: string;
};

type CashEntryScopeMode = "auto" | "super_admin" | "country" | "branch";
type CashEntryViewScope = Exclude<CashEntryScopeMode, "auto">;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function generateCode(prefix: string) {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function toLedgerOption(row: LedgerLookupRow): SearchSelectOption {
  const account = row.accountName || row.ledgerName || "";
  const accountNo = row.accountCode || row.ledgerCode || "";
  const manualRef = row.manualReferenceNumber || "";
  const customerNo = row.customerNumber || "";
  const branch = row.cityBranchName || row.countryBranchName || "";
  const country = row.countryName || "";
  const city = row.cityName || "";
  const company = row.companyName || "";

  const label = `${accountNo} - ${account}${branch ? ` (${branch})` : ""}`;
  const keywords = [accountNo, manualRef, customerNo, account, company, branch, city, country, row.ledgerCode, row.ledgerName]
    .filter(Boolean)
    .join(" ");

  return { value: row.ledgerId, label, keywords };
}

function fmtAmount(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export function CashEntryForm({
  lang,
  pageTitle,
  postingType = "branch",
  scopeMode = "auto",
  onSaved
}: {
  lang: SupportedLanguage;
  pageTitle: string;
  postingType?: RoznamchaType;
  // auto: infer visibility from session roles; super_admin/country/branch: force scope rules for dedicated pages.
  scopeMode?: CashEntryScopeMode;
  onSaved?: (entryId: string | null) => void;
}) {
  const router = useRouter();
  // When we auto-derive scope from the selected account/ledger, avoid wiping selections
  // in the "country changed" reset effect.
  const suppressScopeResetRef = useRef(false);

  const [loadingScope, setLoadingScope] = useState(true);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [manualViewScope, setManualViewScope] = useState<CashEntryViewScope | null>(null);
  const [loginTimeText, setLoginTimeText] = useState("-");

  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [countryId, setCountryId] = useState("");
  const [countryBranchId, setCountryBranchId] = useState("");
  const [cityBranchId, setCityBranchId] = useState("");

  const [mainBranches, setMainBranches] = useState<CountryBranchRow[]>([]);
  const [cityBranches, setCityBranches] = useState<CityBranchRow[]>([]);

  const [ledgers, setLedgers] = useState<LedgerLookupRow[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [cashLedgerId, setCashLedgerId] = useState("");
  const [counterLedgerId, setCounterLedgerId] = useState("");
  const [selectedLookupLedger, setSelectedLookupLedger] = useState<LedgerLookupRow | null>(null);
  const [accountNoInput, setAccountNoInput] = useState("");
  const [accountLookupError, setAccountLookupError] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState(todayIso());
  const [roznamchaBookType, setRoznamchaBookType] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [remarks, setRemarks] = useState("");

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === countryId) ?? null,
    [countries, countryId]
  );

  const [currency, setCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [exchangeRateSource, setExchangeRateSource] = useState("default");
  const [exchangeRateEffectiveAt, setExchangeRateEffectiveAt] = useState<string | null>(null);
  const [currencyError, setCurrencyError] = useState(false);
  const [dailyUsdRates, setDailyUsdRates] = useState<{
    buyingRate?: number;
    sellingRate?: number;
    creditRate?: number;
    debitRate?: number;
  } | null>(null);

  const [paymentType, setPaymentType] = useState<"" | "bank" | "business" | "invoice" | "cash" | "transfer">("");
  const [paymentMode, setPaymentMode] = useState<"" | "DEBIT" | "CREDIT">("");
  const [finalPayment, setFinalPayment] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Payment-type details (reference design panel).
  const [typeDetails, setTypeDetails] = useState<Record<string, string>>({});

  // Currency calculation panel (reference design): amount/price/op.
  const [calcAmount, setCalcAmount] = useState("");
  const [calcPrice, setCalcPrice] = useState("");
  const [calcOp, setCalcOp] = useState<"mul" | "div">("mul");

  // Local cache for Bank/Method quick add (until centralized management tables are wired in).
  const [savedBanks, setSavedBanks] = useState<string[]>([]);
  const [savedMethods, setSavedMethods] = useState<string[]>([]);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"bank" | "method">("bank");
  const [addOptionValue, setAddOptionValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

  const [showRoznamcha, setShowRoznamcha] = useState(false);
  const [roznamchaType, setRoznamchaType] = useState("Cash Book No.");
  const [roznamchaBook, setRoznamchaBook] = useState("CB-001 - Main Cash Book");
  const [roznamchaNumber, setRoznamchaNumber] = useState("000123");

  useEffect(() => {
    setLoginTimeText(new Date().toLocaleString());
  }, []);

  const ledgerRowsWithAccount = useMemo(
    () => ledgers.filter((row) => Boolean(row.accountId && row.ledgerId)),
    [ledgers]
  );
  const cashBankLedgerRows = useMemo(
    () =>
      ledgerRowsWithAccount.filter((row) => {
        const text = [
          row.ledgerName,
          row.ledgerCode,
          row.accountName,
          row.accountCode,
          row.accountKind,
          row.scope
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes("cash") || text.includes("bank");
      }),
    [ledgerRowsWithAccount]
  );

  const cashBankLedgerOptions = useMemo(
    () => cashBankLedgerRows.map(toLedgerOption),
    [cashBankLedgerRows]
  );

  const selectedCashLedger = useMemo(
    () => ledgerRowsWithAccount.find((row) => row.ledgerId === cashLedgerId) ?? null,
    [ledgerRowsWithAccount, cashLedgerId]
  );

  const selectedCounterLedger = useMemo(
    () =>
      selectedLookupLedger?.ledgerId === counterLedgerId
        ? selectedLookupLedger
        : ledgerRowsWithAccount.find((row) => row.ledgerId === counterLedgerId) ?? null,
    [ledgerRowsWithAccount, counterLedgerId, selectedLookupLedger]
  );

  const isSamePostingLedger = Boolean(
    selectedCashLedger?.ledgerId &&
      selectedCounterLedger?.ledgerId &&
      selectedCashLedger.ledgerId === selectedCounterLedger.ledgerId
  );

  useEffect(() => {
    if (!selectedCounterLedger) return;
    const code = selectedCounterLedger.accountCode || selectedCounterLedger.manualReferenceNumber || selectedCounterLedger.ledgerCode || "";
    setAccountNoInput(code);
    setAccountLookupError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCounterLedger?.ledgerId]);

  useEffect(() => {
    if (!cashLedgerId) return;
    if (selectedCounterLedger?.ledgerId && cashLedgerId === selectedCounterLedger.ledgerId) {
      setCashLedgerId("");
      return;
    }
    if (ledgerRowsWithAccount.some((row) => row.ledgerId === cashLedgerId)) return;
    setCashLedgerId("");
  }, [ledgerRowsWithAccount, cashLedgerId, selectedCounterLedger?.ledgerId]);

  const showCalcPanel = Boolean(currency) && ["USD", "AED", "AFN", "INR", "IRR"].includes(currency.toUpperCase());

  const calcFinal = useMemo(() => {
    if (!showCalcPanel) return null;
    const a = Number(calcAmount);
    const p = Number(calcPrice);
    if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || p <= 0) return null;
    if (calcOp === "div" && p === 0) return null;
    const v = calcOp === "mul" ? a * p : a / p;
    return Number.isFinite(v) ? v : null;
  }, [calcAmount, calcOp, calcPrice, showCalcPanel]);

  const amount = useMemo(() => {
    if (showCalcPanel && calcFinal !== null) return calcFinal;
    return Number(finalPayment || 0);
  }, [finalPayment, showCalcPanel, calcFinal]);

  const computedDetails = useMemo(() => {
    if (!paymentType) return "";
    if (paymentType === "bank") {
      const bankName = typeDetails.bankName || "";
      const bankAccount = typeDetails.bankAccount || "";
      const transferType = typeDetails.transferType || "Bank Transfer";
      const transferNumber = typeDetails.transferReferenceNumber || "";
      const attachment = attachmentFile?.name || typeDetails.bankAttachmentName || "";
      return `Bank: ${bankName || "-"}${bankAccount ? ` (A/C: ${bankAccount})` : ""} | Transfer Type: ${transferType} | Transfer Number: ${transferNumber || "-"} | Attachment: ${attachment || "-"}`;
    }
    if (paymentType === "cash") {
      const debitAcc = paymentMode === "DEBIT" 
        ? (selectedCounterLedger?.ledgerName || selectedCounterLedger?.accountName || "-")
        : (selectedCashLedger?.ledgerName || selectedCashLedger?.accountName || "-");
      const creditAcc = paymentMode === "CREDIT"
        ? (selectedCounterLedger?.ledgerName || selectedCounterLedger?.accountName || "-")
        : (selectedCashLedger?.ledgerName || selectedCashLedger?.accountName || "-");
      const receiverSender = typeDetails.receiverSenderName || typeDetails.receiver || "";
      const mobile = typeDetails.mobileNumber || "";
      return `Debit Account: ${debitAcc} | Credit Account: ${creditAcc} | Amount: ${amount || 0} ${currency || ""} | Receiver/Sender: ${receiverSender || "-"} | Mobile: ${mobile || "-"}`;
    }
    if (paymentType === "business" || paymentType === "invoice") {
      const invoiceType = typeDetails.invoiceType || "Sales Invoice";
      const invoiceName = typeDetails.invoiceName || "";
      const invoiceNumber = typeDetails.invoiceNumber || "";
      const purchaseInfo = typeDetails.purchaseInfo || typeDetails.businessName || "";
      const transferInfo = typeDetails.transferInfo || typeDetails.receiptNumber || "";
      return `Invoice Type: ${invoiceType} | Invoice Name: ${invoiceName || "-"} | Invoice Number: ${invoiceNumber || "-"} | Purchase Info: ${purchaseInfo || "-"} | Transfer Info: ${transferInfo || "-"}`;
    }
    if (paymentType === "transfer") {
      const fromAcc = typeDetails.from || "";
      const toAcc = typeDetails.to || "";
      const ref = typeDetails.ref || "";
      return `From: ${fromAcc || "-"} | To: ${toAcc || "-"} | Reference: ${ref || "-"}`;
    }
    return "";
  }, [paymentType, paymentMode, selectedCounterLedger, selectedCashLedger, amount, currency, typeDetails, attachmentFile]);

  const recentTransactions = useMemo(() => [
    {
      date: entryDate.split("-").reverse().join("/"),
      accountCode: selectedCounterLedger?.accountCode || selectedCounterLedger?.ledgerCode || "1102-0001",
      accountName: selectedCounterLedger?.accountName || "ABC Traders",
      voucherNo: lastEntryId || "PV-000123",
      description: (computedDetails || remarks.trim()) ? `Details: ${computedDetails}\nRemarks: ${remarks.trim()}` : "Payment to ABC Traders against invoice",
      debit: paymentMode === "DEBIT" ? amount : 0,
      credit: paymentMode === "CREDIT" ? amount : 0,
      balance: paymentMode === "DEBIT" ? 25000 + amount : paymentMode === "CREDIT" ? 25000 - amount : 25000,
      type: paymentMode === "DEBIT" ? "Receipt" : "Payment"
    },
    {
      date: entryDate.split("-").reverse().join("/"),
      accountCode: "1110-0002",
      accountName: "Cash in Hand",
      voucherNo: "RC-000087",
      description: "Cash received from ABC Traders",
      debit: 0,
      credit: 7500,
      balance: 17500,
      type: "Receipt"
    },
    {
      date: entryDate.split("-").reverse().join("/"),
      accountCode: "6300-0001",
      accountName: "Stationery Expenses",
      voucherNo: "JV-000045",
      description: "Stationery purchase",
      debit: 300,
      credit: 0,
      balance: 17800,
      type: "Journal"
    },
    {
      date: entryDate.split("-").reverse().join("/"),
      accountCode: "1120-0003",
      accountName: "Bank Alfalah - Current A/C",
      voucherNo: "BP-000012",
      description: "Bank deposit",
      debit: 0,
      credit: 2650,
      balance: 15150,
      type: "Bank Payment"
    }
  ], [entryDate, selectedCounterLedger, lastEntryId, narration, paymentMode, amount, computedDetails, remarks]);

  const computed = useMemo(() => {
    if (!selectedCashLedger || !selectedCounterLedger) return null;
    if (!amount || !(amount > 0)) return null;
    if (!paymentMode) return null;

    const entryType =
      paymentType === "bank"
        ? paymentMode === "DEBIT"
          ? "bank_deposit"
          : "bank_cheque"
        : (paymentType === "business" || paymentType === "invoice")
          ? paymentMode === "DEBIT"
            ? "debit"
            : "credit"
          : paymentMode === "DEBIT"
            ? "cash_receipt"
            : "cash_payment";

    const counter = {
      ledgerId: selectedCounterLedger.ledgerId,
      enterpriseAccountId: selectedCounterLedger.accountId!,
      debit: paymentMode === "DEBIT" ? amount : 0,
      credit: paymentMode === "CREDIT" ? amount : 0
    };

    const cash = {
      ledgerId: selectedCashLedger.ledgerId,
      enterpriseAccountId: selectedCashLedger.accountId!,
      debit: paymentMode === "CREDIT" ? amount : 0,
      credit: paymentMode === "DEBIT" ? amount : 0
    };

    return { entryType, counter, cash };
  }, [
    amount,
    paymentMode,
    paymentType,
    selectedCashLedger,
    selectedCounterLedger
  ]);

  // Load session + countries + global accounts once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingScope(true);
      try {
        const sessionRes = await apiGet<any>("/api/erp/auth/session");
        if (!cancelled) {
          setSession(sessionRes as SessionResponse);
        }
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    })();

    (async () => {
      setLoadingCountries(true);
      try {
        const rows = await listCountries();
        if (!cancelled) setCountries(rows);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    })();

    (async () => {
      setLoadingLedgers(true);
      try {
        const res = await listLedgerReportLedgers({
          reportScope: "super_admin",
          limit: 500
        });
        if (!cancelled) {
          const rows = Array.isArray(res.ledgers) ? res.ledgers : [];
          setLedgers(rows);
        }
      } catch (e) {
        console.error("Failed to load global accounts", e);
      } finally {
        if (!cancelled) setLoadingLedgers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load saved bank/method options (local cache until management setup tables are wired in).
  useEffect(() => {
    setSavedBanks(readLocalList(SAVED_BANKS_KEY));
    setSavedMethods(readLocalList(SAVED_METHODS_KEY));
  }, []);

  const inferredScopeMode = useMemo<CashEntryViewScope>(() => {
    if (session?.scopes?.isSuperAdmin) return "super_admin";
    // Country-level users can choose main/city within their assigned country (if multiple).
    if (session?.roles?.some((r) => r === "country_admin" || r === "main_branch_admin")) return "country";
    return "branch";
  }, [session]);

  const effectiveScopeMode = useMemo<CashEntryViewScope>(() => {
    if (scopeMode !== "auto") return scopeMode;
    return manualViewScope ?? inferredScopeMode;
  }, [inferredScopeMode, manualViewScope, scopeMode]);

  useEffect(() => {
    if (scopeMode !== "auto") return;
    setManualViewScope((current) => current ?? inferredScopeMode);
  }, [inferredScopeMode, scopeMode]);

  // If the user is not Super Admin, their country scope is fixed from login/session.
  useEffect(() => {
    if (!session) return;
    if (session.scopes.isSuperAdmin) return;

    // Country is fixed. If multiple are assigned, pick the first deterministically.
    if (!countryId && session.scopes.countryIds?.length) {
      setCountryId(session.scopes.countryIds[0]!);
    }

    const branchIds = session.scopes.countryBranchIds ?? [];
    const cityIds = session.scopes.cityBranchIds ?? [];

    // For branch-level pages/users we must pick a concrete branch automatically.
    const forcePickBranch = effectiveScopeMode === "branch";

    // Country-level users can choose when multiple exist.
    if (!countryBranchId && branchIds.length) {
      if (forcePickBranch || branchIds.length === 1) setCountryBranchId(branchIds[0]!);
    }

    if (!cityBranchId && cityIds.length) {
      if (forcePickBranch || cityIds.length === 1) setCityBranchId(cityIds[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, effectiveScopeMode]);

  // When country changes, reset branch scope and currency.
  useEffect(() => {
    const suppress = suppressScopeResetRef.current;
    suppressScopeResetRef.current = false;

    if (!suppress) {
      setCountryBranchId("");
      setCityBranchId("");
      setCashLedgerId("");
      setCounterLedgerId("");
      setSelectedLookupLedger(null);
    }
    setMainBranches([]);
    setCityBranches([]);

    // Keep currency empty until an account is selected (matches reference UX).
    if (!suppress) setCurrency("");
    setCurrencyError(false);
    setExchangeRate("1");
     
  }, [countryId]);

  // Load main branches for selected country.
  useEffect(() => {
    let cancelled = false;
    if (!countryId) return;

    (async () => {
      const res = await fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(countryId)}`, {
        cache: "no-store"
      });
      if (!res.ok) return;
      const json = (await res.json()) as { countryBranches?: CountryBranchRow[] };
      const list = Array.isArray(json.countryBranches) ? json.countryBranches : [];
      const mains = list.filter((b) => b.is_main);
      if (!cancelled) {
        setMainBranches(mains);
        if (mains.length === 1) setCountryBranchId(mains[0]!.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryId]);

  // Load city branches for selected main branch.
  useEffect(() => {
    let cancelled = false;
    if (!countryId || !countryBranchId) return;

    (async () => {
      const res = await fetch(
        `/api/branch-management/city-branches?countryId=${encodeURIComponent(countryId)}&countryBranchId=${encodeURIComponent(
          countryBranchId
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = (await res.json()) as { cityBranches?: CityBranchRow[] };
      const list = Array.isArray(json.cityBranches) ? json.cityBranches : [];
      if (!cancelled) {
        setCityBranches(list);
        if (list.length === 1) setCityBranchId(list[0]!.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryId, countryBranchId]);

  // Load ledgers once the branch scope is selected.
  useEffect(() => {
    let cancelled = false;
    if (!countryId || !countryBranchId) return;

    (async () => {
      setLoadingLedgers(true);
      try {
        const res = await listLedgerReportLedgers({
          reportScope: "branch",
          countryId: countryId || null,
          countryBranchId: countryBranchId || null,
          cityBranchId: cityBranchId || null,
          limit: 250
        });
        if (!cancelled) {
          const rows = Array.isArray(res.ledgers) ? res.ledgers : [];
          
          // Ensure selected lookup ledger is kept in the list
          const selectedRow = selectedLookupLedger || ledgers.find(r => r.ledgerId === counterLedgerId);
          const finalRows = [...rows];
          if (selectedRow && !finalRows.some(r => r.ledgerId === selectedRow.ledgerId)) {
            finalRows.unshift(selectedRow);
          }

          setLedgers(finalRows);

          // Sensible defaults: pick first "cash" ledger if found.
          const cashGuess =
            finalRows.find((r) => (r.ledgerName ?? "").toLowerCase().includes("cash")) ??
            finalRows.find((r) => (r.accountName ?? "").toLowerCase().includes("cash")) ??
            null;
          if (cashGuess?.ledgerId) setCashLedgerId(cashGuess.ledgerId);
          else if (finalRows[0]?.ledgerId) setCashLedgerId(finalRows[0].ledgerId);
        }
      } finally {
        if (!cancelled) setLoadingLedgers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityBranchId, countryId, countryBranchId]);

  // Keep currency aligned with ledger currency when a ledger is selected.
  useEffect(() => {
    const next = (selectedCounterLedger?.ledgerCurrency || selectedCashLedger?.ledgerCurrency || "").trim();
    if (next && next.length === 3) setCurrency(next.toUpperCase());
  }, [selectedCashLedger, selectedCounterLedger]);

  const canSave =
    Boolean(countryId && countryBranchId) &&
    Boolean(selectedCounterLedger?.ledgerId) &&
    Boolean(selectedCashLedger?.ledgerId) &&
    Boolean(paymentMode) &&
    Boolean(paymentType) &&
    Boolean(amount && amount > 0) &&
    currency.trim().length === 3 &&
    Number(exchangeRate) > 0 &&
    !saving;

  function applyScopeFromLedger(row: LedgerLookupRow) {
    if (!row.countryId || !row.countryBranchId) return;

    const needsCountry = row.countryId !== countryId;
    const needsMain = row.countryBranchId !== countryBranchId;
    const nextCityBranchId = row.cityBranchId ?? "";
    const needsCity = nextCityBranchId !== cityBranchId;

    suppressScopeResetRef.current = true;
    if (needsCountry) setCountryId(row.countryId);
    if (needsMain) setCountryBranchId(row.countryBranchId);
    if (needsCity) setCityBranchId(nextCityBranchId);
  }

  function applyPostingLedger(row: LedgerLookupRow) {
    setLedgers((current) => {
      if (current.some((item) => item.ledgerId === row.ledgerId)) return current;
      return [row, ...current];
    });
    const code = row.accountCode || row.manualReferenceNumber || row.customerNumber || row.ledgerCode || "";
    setSelectedLookupLedger(row);
    setCounterLedgerId(row.ledgerId);
    setAccountNoInput(code);
    setAccountLookupError(null);
    applyScopeFromLedger(row);

    const nextCur = (row.ledgerCurrency || "").trim();
    if (nextCur.length === 3) setCurrency(nextCur.toUpperCase());
    setRoznamchaBookType((current) => current || "branch_payment_voucher");
  }

  function handleCounterLedgerChange(nextId: string) {
    setCounterLedgerId(nextId);
    const row = ledgers.find((r) => r.ledgerId === nextId) ?? null;
    setSelectedLookupLedger(row);
    if (!row) return;

    applyPostingLedger(row);
  }

  function clearSelectedAccount() {
    setCounterLedgerId("");
    setCashLedgerId("");
    setSelectedLookupLedger(null);
    setAccountNoInput("");
    setAccountLookupError(null);
    setPaymentType("");
    setPaymentMode("");
    setFinalPayment("");
    setTypeDetails({});
    setCurrency("");
    setCurrencyError(false);
    setCalcAmount("");
    setCalcPrice("");
    setCalcOp("mul");
    setExchangeRate("1");
    setAttachmentFile(null);
  }

  function resetPaymentDraft() {
    clearSelectedAccount();
    setRoznamchaBookType("");
    setEntryDate(todayIso());
    setReferenceNo("");
    setNarration("");
    setRemarks("");
    setAttachmentFile(null);
    setMessage(null);
    setActionMenuOpen(false);
  }

  async function lookupAccountNo() {
    const queryValue = accountNoInput;
    const needle = queryValue.trim().toLowerCase();
    if (!needle) return;

    const match =
      ledgerRowsWithAccount.find((row) => {
        const exactKeys = [
          row.accountCode,
          row.rawAccountCode,
          row.ledgerCode,
          row.manualReferenceNumber,
          row.customerNumber
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        if (exactKeys.includes(needle)) return true;

        const fuzzy = [row.accountName, row.ledgerName, row.countrySerialNumber, row.branchSerialNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fuzzy.includes(needle);
      }) ?? null;

    if (match?.ledgerId) {
      applyPostingLedger(match);
      return;
    }

    try {
      setAccountLookupError(null);
      const params = new URLSearchParams({ q: queryValue.trim(), limit: "500" });
      if (!isSuperAdmin) {
        if (countryId) params.set("countryId", countryId);
        if (countryBranchId) params.set("countryBranchId", countryBranchId);
        if (cityBranchId) params.set("cityBranchId", cityBranchId);
      }
      const res = await apiGet<AccountLookupResponse>(`/api/erp/accounting/accounts/lookup?${params.toString()}`);
      if (res.found && res.account?.ledgerId) {
        applyPostingLedger(res.account);
        return;
      }
      setAccountLookupError("Account not found in Account Master. Check Account Number, Manual Reference, Customer Number, or Account Name.");
    } catch (error) {
      setAccountLookupError(error instanceof Error ? error.message : "Account lookup failed.");
    }
  }

  function openAddOption(type: "bank" | "method") {
    setAddOptionType(type);
    setAddOptionValue("");
    setAddOptionOpen(true);
  }

  function commitAddOption() {
    const value = addOptionValue.trim();
    if (!value) return;

    if (addOptionType === "bank") {
      const next = savedBanks.includes(value) ? savedBanks : [...savedBanks, value];
      setSavedBanks(next);
      writeLocalList(SAVED_BANKS_KEY, next);
      setTypeDetails((prev) => ({ ...prev, bankName: value }));
    } else {
      const next = savedMethods.includes(value) ? savedMethods : [...savedMethods, value];
      setSavedMethods(next);
      writeLocalList(SAVED_METHODS_KEY, next);
      setTypeDetails((prev) => ({ ...prev, method: value }));
    }

    setAddOptionOpen(false);
  }

  async function save() {
    setMessage(null);
    setLastEntryId(null);

    if (!canSave) {
      setMessage("Please select account, Debit/Credit transaction type, currency, and amount.");
      return;
    }

    if (!computed) {
      setMessage("Select account, Debit/Credit transaction type, and enter a valid amount.");
      return;
    }

    // Voucher / Journal numbers are generated automatically; do not ask the user to enter them.
    const effectiveVoucher = generateCode("V");
    const effectiveJournal = generateCode("J");

    setSaving(true);
    try {
      const finalNarration = `Details: ${computedDetails}\nRemarks: ${remarks.trim()}`;
      const payload = {
        mode: "post" as const,
        type: postingType,
        countryId: countryId || null,
        countryBranchId: countryBranchId || null,
        cityBranchId: cityBranchId || null,
        entryDate,
        roznamchaBookType,
        journalNo: effectiveJournal,
        voucherNo: effectiveVoucher,
        paymentMethodId: null,
        referenceNo: referenceNo.trim() ? referenceNo.trim() : undefined,
        narration: finalNarration.trim() ? finalNarration.trim() : undefined,
        paymentDetails: {
          roznamchaBookType,
          paymentType: paymentMode === "DEBIT" ? "money_received" : "money_paid",
          roznamchaCategory: paymentType || null,
          paymentMode,
          quantity: 1,
          finalAmount: amount,
          currency,
          exchangeRate: Number(exchangeRate),
          exchangeRateSource,
          exchangeRateEffectiveAt,
          counterLedgerId,
          receiverSenderName: typeDetails.receiverSenderName ?? typeDetails.receiver ?? null,
          mobileNumber: typeDetails.mobileNumber ?? null,
          whatsappNumber: typeDetails.whatsappNumber ?? null,
          idCardCopyName: typeDetails.idCardCopyName ?? null,
          bankName: typeDetails.bankName ?? null,
          bankAccount: typeDetails.bankAccount ?? null,
          transferReferenceNumber: typeDetails.transferReferenceNumber ?? typeDetails.refNo ?? typeDetails.ref ?? null,
          paymentReference: typeDetails.transferReferenceNumber ?? typeDetails.refNo ?? typeDetails.ref ?? null,
          paymentDate: typeDetails.payDate ?? null,
          bankAttachmentName: typeDetails.bankAttachmentName ?? null,
          receiver: typeDetails.receiverSenderName ?? typeDetails.receiver ?? null,
          purpose: typeDetails.purpose ?? null,
          transferFrom: typeDetails.from ?? null,
          transferTo: typeDetails.to ?? null,
          businessName: typeDetails.businessName ?? typeDetails.bizName ?? null,
          invoiceNumber: typeDetails.invoiceNumber ?? null,
          invoiceName: typeDetails.invoiceName ?? null,
          receiptNumber: typeDetails.receiptNumber ?? null,
          attachmentName: attachmentFile?.name ?? null,
          transferType: typeDetails.transferType ?? null,
          invoiceType: typeDetails.invoiceType ?? null,
          purchaseInfo: typeDetails.purchaseInfo ?? null,
          transferInfo: typeDetails.transferInfo ?? null
        },
        lines: [
          {
            paymentEntryType: computed.entryType,
            enterpriseAccountId: computed.counter.enterpriseAccountId,
            ledgerId: computed.counter.ledgerId,
            description: finalNarration.trim() ? finalNarration.trim() : undefined,
            debit: computed.counter.debit,
            credit: computed.counter.credit,
            currency: currency.trim().toUpperCase(),
            exchangeRate: Number(exchangeRate),
            accountNumber: selectedCounterLedger?.accountCode || selectedCounterLedger?.rawAccountCode || null,
            manualReferenceNumber: selectedCounterLedger?.manualReferenceNumber || null,
            customerNumber: selectedCounterLedger?.customerNumber || null,
            countrySerialNumber: selectedCounterLedger?.countrySerialNumber || null,
            branchSerialNumber: selectedCounterLedger?.branchSerialNumber || null
          },
          {
            paymentEntryType: computed.entryType,
            enterpriseAccountId: selectedCashLedger?.accountId || null,
            ledgerId: selectedCashLedger?.ledgerId || null,
            description: finalNarration.trim() ? finalNarration.trim() : undefined,
            debit: computed.cash.debit,
            credit: computed.cash.credit,
            currency: currency.trim().toUpperCase(),
            exchangeRate: Number(exchangeRate),
            accountNumber: selectedCashLedger?.accountCode || selectedCashLedger?.rawAccountCode || null,
            manualReferenceNumber: selectedCashLedger?.manualReferenceNumber || null,
            customerNumber: selectedCashLedger?.customerNumber || null,
            countrySerialNumber: selectedCashLedger?.countrySerialNumber || null,
            branchSerialNumber: selectedCashLedger?.branchSerialNumber || null
          }
        ]
      };

      const res = await apiPost<RoznamchaPostResponse>("/api/erp/roznamcha", payload);
      setLastEntryId(res.entryId ?? null);
      const serialText = [res.superAdminSerialNumber, res.countryTransactionSerialNumber, res.branchTransactionSerialNumber]
        .filter(Boolean)
        .join(" / ");
      setMessage(res.entryId ? `Saved successfully. Serials: ${serialText || res.entryId}` : "Saved successfully.");
      window.dispatchEvent(
        new CustomEvent("erp:posting-saved", {
          detail: { source: "roznamcha", entryId: res.entryId ?? null }
        })
      );
      onSaved?.(res.entryId ?? null);
      if (res.entryId) {
        router.push(`/dashboard/roznamcha/all?entryId=${encodeURIComponent(res.entryId)}`);
      }
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const countryOptions: SearchSelectOption[] = useMemo(
    () => countries.map((c) => ({ value: c.id, label: `${c.name} (${c.currency_code})` })),
    [countries]
  );

  const mainBranchOptions: SearchSelectOption[] = useMemo(
    () => mainBranches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })),
    [mainBranches]
  );

  const cityBranchOptions: SearchSelectOption[] = useMemo(
    () => cityBranches.map((b) => ({ value: b.id, label: `${b.city_name} - ${b.name} (${b.code})` })),
    [cityBranches]
  );

  const isSuperAdmin = session?.scopes?.isSuperAdmin ?? false;
  const viewScopeLabel =
    effectiveScopeMode === "super_admin" ? "Super Admin" : effectiveScopeMode === "country" ? "Country" : "City";
  const hasFixedCityScope = Boolean(!isSuperAdmin && session?.scopes?.cityBranchIds?.length);
  const showScopeSelectors = effectiveScopeMode !== "branch" || isSuperAdmin || !hasFixedCityScope;
  const showCountrySelector = effectiveScopeMode === "super_admin" || isSuperAdmin;

  const selectedMainBranch = useMemo(
    () => mainBranches.find((b) => b.id === countryBranchId) ?? null,
    [countryBranchId, mainBranches]
  );

  const selectedCityBranch = useMemo(
    () => cityBranches.find((b) => b.id === cityBranchId) ?? null,
    [cityBranchId, cityBranches]
  );

  const branchCurrency =
    selectedCityBranch?.local_currency ||
    selectedMainBranch?.local_currency ||
    selectedCountry?.currency_code ||
    "USD";

  const allowedCurrencies = useMemo(() => {
    const list = [branchCurrency, "PKR", "USD", "AED", "AFN", "INR", "IRR"]
      .map((v) => (v ?? "").toString().trim().toUpperCase())
      .filter(Boolean);
    return new Set(list);
  }, [branchCurrency]);

  const normalizedCurrency = currency.trim().toUpperCase();
  const isLocalCurrency = normalizedCurrency === branchCurrency.toUpperCase();

  const saUsdRate = useMemo(() => {
    if (!dailyUsdRates) return null;
    return paymentMode === "DEBIT"
      ? (dailyUsdRates.debitRate || dailyUsdRates.buyingRate)
      : (dailyUsdRates.creditRate || dailyUsdRates.sellingRate);
  }, [dailyUsdRates, paymentMode]);

  const saUsdAmount = useMemo(() => {
    if (!saUsdRate || saUsdRate <= 0) return null;
    return amount / saUsdRate;
  }, [amount, saUsdRate]);

  // Enforce currency rules and keep derived fields in sync with the reference behavior.
  useEffect(() => {
    const selected = normalizedCurrency;

    if (!selected) {
      setCurrencyError(false);
      setCalcAmount("");
      setCalcPrice("");
      setFinalPayment("");
      setExchangeRate("1");
      setExchangeRateSource("default");
      setExchangeRateEffectiveAt(null);
      return;
    }

    if (!allowedCurrencies.has(selected)) {
      setCurrencyError(true);
      setCalcAmount("");
      setCalcPrice("");
      setFinalPayment("");
      setExchangeRate("1");
      setExchangeRateSource("default");
      setExchangeRateEffectiveAt(null);
      return;
    }

    setCurrencyError(false);
     
  }, [allowedCurrencies, normalizedCurrency]);

  useEffect(() => {
    if (!normalizedCurrency || !allowedCurrencies.has(normalizedCurrency)) return;
    if (!countryId) return;

    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          countryId,
          currency: normalizedCurrency,
          branchCurrency
        });
        if (countryBranchId) params.set("countryBranchId", countryBranchId);
        const res = await apiGet<LatestRateResponse>(`/api/erp/currency/latest-rate?${params.toString()}`);
        if (!cancelled) {
          setExchangeRate(isLocalCurrency ? "1" : String(res.rate || 1));
          setExchangeRateSource(isLocalCurrency ? "local_currency" : (res.source || "default"));
          setExchangeRateEffectiveAt(isLocalCurrency ? null : (res.effectiveDate ?? null));
          setDailyUsdRates({
            buyingRate: res.buyRate,
            sellingRate: res.sellRate,
            creditRate: res.creditRate,
            debitRate: res.debitRate
          });
        }
      } catch {
        if (!cancelled) {
          setExchangeRate(isLocalCurrency ? "1" : exchangeRate || "1");
          setExchangeRateSource(isLocalCurrency ? "local_currency" : "manual_or_default");
          setExchangeRateEffectiveAt(null);
          setDailyUsdRates(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchCurrency, countryBranchId, countryId, isLocalCurrency, normalizedCurrency]);

  const branchFullName = [
    selectedCountry?.name ? `${selectedCountry.name} (${branchCurrency})` : null,
    selectedMainBranch?.name ? `${selectedMainBranch.name} (${selectedMainBranch.code})` : null,
    selectedCityBranch?.name ? `${selectedCityBranch.city_name} - ${selectedCityBranch.name} (${selectedCityBranch.code})` : null
  ]
    .filter(Boolean)
    .join(" | ");

  const scopeTitle = `${viewScopeLabel} Scope`;
  const scopeAccessText =
    effectiveScopeMode === "super_admin"
      ? "Global cash entry access across countries, branches, cities, reports, and audit."
      : effectiveScopeMode === "country"
        ? "Country-level cash entry access filtered to assigned country, branches, cities, approvals, and reports."
        : "City-level cash entry access filtered to assigned city branch operations and transactions.";

  const accountNoOptions = useMemo(() => {
    return ledgers.map((row) => {
      const label = `${row.accountCode || row.ledgerCode || ""} — ${row.accountName || row.ledgerName || ""}`;
      const keywords = `${row.accountCode} ${row.ledgerCode} ${row.accountName} ${row.ledgerName} ${row.manualReferenceNumber} ${row.customerNumber}`;
      return { value: row.ledgerId, label, keywords };
    });
  }, [ledgers]);

  const accountNameOptions = useMemo(() => {
    return ledgers.map((row) => {
      const label = `${row.accountName || row.ledgerName || ""} (${row.accountCode || row.ledgerCode || ""})`;
      const keywords = `${row.accountCode} ${row.ledgerCode} ${row.accountName} ${row.ledgerName} ${row.manualReferenceNumber} ${row.customerNumber}`;
      return { value: row.ledgerId, label, keywords };
    });
  }, [ledgers]);

  return (
    <div className="mx-auto w-full overflow-hidden rounded-[18px] border border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,.10)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
      <section className="bg-gradient-to-br from-slate-950 to-blue-700 px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 opacity-70" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">Cash Entry Payment Software</h1>
              <p className="text-[10px] font-semibold text-white/85">Smart Daily Roznamcha System — Branch Payment Voucher</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {entryDate}
            </span>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full p-0 text-white hover:bg-white/10 flex items-center justify-center"
                onClick={() => setActionMenuOpen((open) => !open)}
                aria-label="Open actions"
                title="Actions"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
              {actionMenuOpen ? (
                <div className="absolute right-0 z-40 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,.18)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                  <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold gap-2" onClick={clearSelectedAccount}>
                    <X className="h-4 w-4" />
                    Clear Account
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold gap-2" onClick={resetPaymentDraft}>
                    <RefreshCw className="h-4 w-4" />
                    Reset Payment
                  </Button>
                  <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold gap-2" onClick={printPreview}>
                    <Printer className="h-4 w-4" />
                    Print PDF View
                  </Button>
                  <Button type="button" className="h-9 w-full justify-start bg-emerald-700 text-white text-xs font-black hover:bg-emerald-800 gap-2" disabled={!canSave || saving} onClick={() => void save()}>
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Submit Payment"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-3 bg-[#f8fbff] p-3 dark:bg-slate-950/40">
        {message ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {message}
          </div>
        ) : null}

        {/* 1. Compact Branch Details section at the top */}
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-4 py-2 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
              🏢 Branch Details
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SearchSelect
                label="Country"
                value={countryId}
                placeholder="Select Country"
                options={countryOptions}
                disabled={loadingCountries || (effectiveScopeMode !== "super_admin" && !isSuperAdmin)}
                onValueChange={(value) => setCountryId(value)}
              />
              <SearchSelect
                label="Branch"
                value={countryBranchId}
                placeholder="Select Branch"
                options={mainBranchOptions}
                disabled={!countryId}
                onValueChange={(value) => setCountryBranchId(value)}
              />
              <SearchSelect
                label="City Branch"
                value={cityBranchId}
                placeholder="Select City Branch"
                options={cityBranchOptions}
                disabled={!countryId || !countryBranchId}
                onValueChange={(value) => setCityBranchId(value)}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-dashed border-slate-200 pt-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span><b>Logged-in User:</b> {session?.user?.fullName || session?.user?.email || "Admin"} (ID: {session?.user?.id || "-"})</span>
              <span>•</span>
              <span><b>Team:</b> {session?.roles?.join(", ") || "Accounts"}</span>
              <span>•</span>
              <span><b>Branch Currency:</b> {branchCurrency}</span>
              <span>•</span>
              <span><b>Login Time:</b> {loginTimeText}</span>
            </div>
          </div>
        </Card>

        {/* Two column layout below the header card */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Payment Customer Account Details Card */}
            <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b-2 border-emerald-600 bg-gradient-to-r from-emerald-50 to-white px-4 py-2 dark:from-slate-900 dark:to-slate-950">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  👤 Payment Customer Account Details
                </h3>
              </div>
              <CardContent className="p-3">
                {selectedCounterLedger ? (
                  <div className="grid gap-4 md:grid-cols-2 text-xs">
                    <div className="space-y-1 md:pr-3">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Billing Address</div>
                      <AddressLine icon="👤" strong value={selectedCounterLedger.companyName || selectedCounterLedger.accountName || "-"} />
                      <AddressLine icon="📍" label="Account Number" value={selectedCounterLedger.accountCode || selectedCounterLedger.ledgerCode || "-"} />
                      <AddressLine icon="📍" label="Manual Reference" value={selectedCounterLedger.manualReferenceNumber || "-"} />
                      <AddressLine icon="📍" label="Customer Number" value={selectedCounterLedger.customerNumber || "-"} />
                      <AddressLine icon="📍" label="Company" value={selectedCounterLedger.companyName || "-"} />
                      <AddressContact icon="💵" label="Balance" value={`${fmtAmount(selectedCounterLedger.currentBalance ?? 0)} ${selectedCounterLedger.ledgerCurrency || branchCurrency}`} />
                      <AddressLine icon="▣" label="Customer Currency" value={selectedCounterLedger.ledgerCurrency || "-"} />
                    </div>
                    <div className="space-y-1 border-t border-dashed border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 dark:border-slate-800">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Shipping / Account Address</div>
                      <AddressLine icon="👤" strong value={selectedCounterLedger.accountName || "-"} />
                      <AddressLine icon="📍" label="Country" value={selectedCounterLedger.countryName || selectedCountry?.name || "-"} />
                      <AddressLine icon="📍" label="City Branch" value={selectedCounterLedger.cityBranchName || selectedCityBranch?.city_name || "-"} />
                      <AddressLine icon="📍" label="Status" value="Active" />
                      <AddressContact icon="▣" label="Ledger" value={selectedCounterLedger.ledgerCode || selectedCounterLedger.ledgerName || "-"} />
                      <AddressLine icon="▣" label="Category" value={selectedCounterLedger.accountKind || selectedCounterLedger.scope || "-"} />
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 font-semibold italic text-xs">
                    No customer account selected. Search by Account Number or Account Name below to select one.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Entry Card */}
            <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-4 py-2 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  📋 Payment Work Entry
                </h3>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* 3. Account Number Master Search (Two Pickers: Number or Name) */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black">Search by Account Number <span className="text-red-600">*</span></Label>
                    <SearchSelect
                      label=""
                      value={counterLedgerId}
                      placeholder="Select by Account Number..."
                      options={accountNoOptions}
                      disabled={loadingLedgers}
                      onValueChange={handleCounterLedgerChange}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-black">Search by Account Name <span className="text-red-600">*</span></Label>
                    <SearchSelect
                      label=""
                      value={counterLedgerId}
                      placeholder="Select by Account Name..."
                      options={accountNameOptions}
                      disabled={loadingLedgers}
                      onValueChange={handleCounterLedgerChange}
                    />
                  </div>
                </div>

                {accountLookupError && (
                  <p className="text-xs text-red-600 font-semibold">{accountLookupError}</p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Roznamcha Date" required>
                    <Input
                      className="h-10 text-xs font-semibold"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      type="date"
                    />
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Type" required>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                      value={roznamchaType}
                      onChange={(e) => setRoznamchaType(e.target.value)}
                    >
                      <option value="Roznamcha Book No.">Roznamcha Book No.</option>
                      <option value="Cash Book No.">Cash Book No.</option>
                      <option value="Receipt No.">Receipt No.</option>
                    </select>
                  </FieldBlock>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Roznamcha Book" required>
                    <Input
                      className="h-10 text-xs font-semibold"
                      value={roznamchaBook}
                      onChange={(e) => setRoznamchaBook(e.target.value)}
                      placeholder="e.g. CB-001 - Main Cash Book"
                    />
                  </FieldBlock>

                  <FieldBlock label="Roznamcha Number" required>
                    <Input
                      className="h-10 text-xs font-semibold"
                      value={roznamchaNumber}
                      onChange={(e) => setRoznamchaNumber(e.target.value)}
                      placeholder="e.g. 000123"
                    />
                  </FieldBlock>
                </div>

                <div className="w-full">
                  <Button
                    type="button"
                    variant={showRoznamcha ? "default" : "outline"}
                    className={cn("w-full h-10 text-xs font-black gap-2 transition-all duration-200", showRoznamcha ? "bg-blue-700 hover:bg-blue-800 text-white" : "")}
                    onClick={() => setShowRoznamcha(!showRoznamcha)}
                  >
                    <CalendarDays className="h-4 w-4" />
                    {showRoznamcha ? "Hide Roznamcha Details" : "Open Roznamcha"}
                  </Button>
                </div>

                {/* Transaction entry details (category, currency, amount) */}
                <div className="border-t border-slate-100 pt-4 space-y-4 dark:border-slate-800">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock label="Roznamcha Category" required>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none"
                        value={paymentType}
                        disabled={!selectedCounterLedger}
                        onChange={(event) => {
                          const value = event.target.value as "" | "cash" | "bank" | "business" | "invoice" | "transfer";
                          setPaymentType(value);
                          setTypeDetails({});
                          setAttachmentFile(null);
                          setRoznamchaBookType(value ? "branch_payment_voucher" : "");
                          setFinalPayment("");
                          setPaymentMode("");
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

                    <FieldBlock label="Currency Type" required>
                      <select
                        className={cn(
                          "h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none",
                          currencyError ? "border-red-300" : ""
                        )}
                        value={currency}
                        disabled={!selectedCounterLedger}
                        onChange={(e) => {
                          setCurrency(e.target.value);
                          setFinalPayment("");
                        }}
                      >
                        <option value="">Select Currency</option>
                        {[...allowedCurrencies].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </FieldBlock>
                  </div>

                  {/* Dynamic Type Panel */}
                  {selectedCounterLedger && paymentType && (
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
                              className="h-9 text-xs"
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
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <BankPicker
                              label="Bank Name (Master Search)"
                              value={typeDetails.bankId || ""}
                              placeholder="Search central Bank Master database..."
                              onValueChange={(bankId) => {
                                void (async () => {
                                  try {
                                    const bank = await getBankById(bankId);
                                    if (bank) {
                                      setTypeDetails((p) => ({
                                        ...p,
                                        bankId,
                                        bankName: bank.bank_name,
                                        bankAccount: bank.account_number,
                                        bankAccountTitle: bank.account_title
                                      }));
                                    }
                                  } catch {
                                    setTypeDetails((p) => ({ ...p, bankId }));
                                  }
                                })();
                              }}
                            />
                          </div>
                          
                          {typeDetails.bankName && (
                            <div className="md:col-span-2 grid gap-3 md:grid-cols-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block">Bank Account Number</span>
                                <span className="text-xs font-black text-slate-950 dark:text-slate-50">{typeDetails.bankAccount || "—"}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 block">Bank Account Title</span>
                                <span className="text-xs font-black text-slate-950 dark:text-slate-50">{typeDetails.bankAccountTitle || "—"}</span>
                              </div>
                            </div>
                          )}

                          <FieldBlock label="Transfer Type">
                            <select
                              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold outline-none"
                              value={typeDetails.transferType || "Bank Transfer"}
                              onChange={(e) => setTypeDetails((p) => ({ ...p, transferType: e.target.value }))}
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Wire Transfer">Wire Transfer</option>
                              <option value="Online Banking">Online Banking</option>
                              <option value="Cheque Deposit">Cheque Deposit</option>
                            </select>
                          </FieldBlock>
                          <FieldBlock label="Transfer Reference Number">
                            <Input className="h-9 text-xs" value={typeDetails.transferReferenceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, transferReferenceNumber: e.target.value }))} placeholder="Transfer reference" />
                          </FieldBlock>
                          <FieldBlock label="Payment Date">
                            <Input className="h-9 text-xs" type="date" value={typeDetails.payDate || entryDate} onChange={(e) => setTypeDetails((p) => ({ ...p, payDate: e.target.value }))} />
                          </FieldBlock>
                          <FieldBlock label="Attachment Upload">
                            <Input
                              className="h-9 text-xs"
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
                          <FieldBlock label="Invoice Type">
                            <select
                              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold outline-none"
                              value={typeDetails.invoiceType || "Sales Invoice"}
                              onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceType: e.target.value }))}
                            >
                              <option value="Sales Invoice">Sales Invoice</option>
                              <option value="Purchase Invoice">Purchase Invoice</option>
                              <option value="Service Invoice">Service Invoice</option>
                              <option value="Credit Note">Credit Note</option>
                              <option value="Debit Note">Debit Note</option>
                            </select>
                          </FieldBlock>
                          <FieldBlock label="Invoice Name">
                            <Input className="h-9 text-xs" value={typeDetails.invoiceName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceName: e.target.value }))} placeholder="Invoice name" />
                          </FieldBlock>
                          <FieldBlock label="Invoice Number">
                            <Input className="h-9 text-xs" value={typeDetails.invoiceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice number" />
                          </FieldBlock>
                          <FieldBlock label="Purchase Information">
                            <Input className="h-9 text-xs" value={typeDetails.purchaseInfo || typeDetails.businessName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, purchaseInfo: e.target.value, businessName: e.target.value }))} placeholder="Purchase information" />
                          </FieldBlock>
                          <FieldBlock label="Transfer Information" className="md:col-span-2">
                            <Input className="h-9 text-xs" value={typeDetails.transferInfo || typeDetails.receiptNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, transferInfo: e.target.value, receiptNumber: e.target.value }))} placeholder="Transfer details or receipt reference" />
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
                  {selectedCounterLedger && currency && showCalcPanel && (
                    <div className="rounded-lg border bg-slate-50/50 p-3 dark:bg-slate-900/20">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Exchange rate calculation ({currency} ➔ {branchCurrency})
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <FieldBlock label="Foreign Amount">
                          <Input className="h-9 text-xs font-semibold" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} type="number" step="0.0001" min="0" placeholder="e.g. 100" />
                        </FieldBlock>
                        <FieldBlock label="Exchange Rate">
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

                  {/* Amount, Debit/Credit Selector */}
                  {selectedCounterLedger && currency && (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldBlock label="Final Amount" required>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              {branchCurrency}
                            </span>
                            <Input
                              className="h-10 pl-12 text-right text-xs font-black"
                              value={showCalcPanel && calcFinal !== null ? fmtAmount(calcFinal) : finalPayment}
                              onChange={(e) => setFinalPayment(e.target.value)}
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={showCalcPanel && calcFinal !== null}
                            />
                          </div>
                        </FieldBlock>

                        <FieldBlock label="Debit / Credit Entry" required>
                          <div className="grid grid-cols-2 gap-2 h-10">
                            <Button
                              type="button"
                              variant={paymentMode === "DEBIT" ? "default" : "outline"}
                              className={cn("h-10 text-[11px] font-black", paymentMode === "DEBIT" ? "bg-emerald-700 hover:bg-emerald-800 text-white" : "")}
                              onClick={() => {
                                setPaymentMode("DEBIT");
                                setRoznamchaBookType("branch_payment_voucher");
                              }}
                            >
                              Debit
                              <span className="block text-[9px] opacity-75 font-medium">(Receive)</span>
                            </Button>
                            <Button
                              type="button"
                              variant={paymentMode === "CREDIT" ? "default" : "outline"}
                              className={cn("h-10 text-[11px] font-black", paymentMode === "CREDIT" ? "bg-red-700 hover:bg-red-800 text-white" : "")}
                              onClick={() => {
                                setPaymentMode("CREDIT");
                                setRoznamchaBookType("branch_payment_voucher");
                              }}
                            >
                              Credit
                              <span className="block text-[9px] opacity-75 font-medium">(Pay)</span>
                            </Button>
                          </div>
                        </FieldBlock>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        Credit = جمع رقم (Money Paid) | Debit = ادا رقم (Money Received)
                      </div>
                    </div>
                  )}

                  {/* Details and Remarks */}
                  {selectedCounterLedger && currency && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-1.5">
                          Details (Auto-populated)
                        </span>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 min-h-[36px] break-words">
                          {computedDetails || "—"}
                        </div>
                      </div>

                      <FieldBlock label="Remarks / Notes">
                        <textarea
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Manually add additional descriptions, comments, explanations, or transaction notes..."
                        />
                      </FieldBlock>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Live Payment Report Card */}
            {selectedCounterLedger && paymentMode && paymentType && currency ? (
              <div className="space-y-4">
                <Card className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white px-4 py-2 dark:from-slate-900 dark:to-slate-950">
                    <CardTitle className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      <span>📄 Professional Live Payment Report</span>
                      <span className="text-[10px] normal-case text-slate-500 font-semibold">{session?.user?.email ?? "-"}</span>
                    </CardTitle>
                  </div>
                  <CardContent className="p-3 space-y-3">
                    <div className="grid gap-3">
                      <ReportBox
                        rows={[
                          ["Scope", scopeTitle],
                          ["Country", selectedCountry ? `${selectedCountry.name} (${branchCurrency})` : "-"],
                          ["Branch", selectedMainBranch?.name || "-"],
                          ["City Branch", selectedCityBranch?.city_name || selectedCityBranch?.name || "-"]
                        ]}
                      />
                      <ReportBox
                        rows={[
                          ["Date", entryDate.split("-").reverse().join("/")],
                          ["Amount", amount ? `${fmtAmount(amount)} ${currency.toUpperCase()}` : "-"],
                          ["Exchange Rate", exchangeRate],
                          ["Rate Source", exchangeRateSource],
                          ["Rate Time", exchangeRateEffectiveAt || "-"],
                          ...(isLocalCurrency && saUsdRate ? [
                            ["SA USD Rate", String(saUsdRate)],
                            ["SA USD Equiv.", saUsdAmount ? `${fmtAmount(saUsdAmount)} USD` : "-"]
                          ] : []),
                          ["Payment Type", paymentType ? `${paymentType[0]!.toUpperCase()}${paymentType.slice(1)} Roznamcha` : "-"]
                        ].filter(Boolean) as Array<[string, string]>}
                      />
                    </div>

                    <ReportBox
                      title="Ledger Summary"
                      rows={[
                        ["Account", selectedCounterLedger.ledgerName || selectedCounterLedger.accountName || "-"],
                        ["Account Number", selectedCounterLedger.accountCode || selectedCounterLedger.ledgerCode || "-"],
                        ["Transaction Type", paymentMode === "DEBIT" ? "Debit (Money Received)" : "Credit (Money Paid)"],
                        ["Amount", amount ? fmtAmount(amount) : "-"],
                        ["Balance Effect", paymentMode === "DEBIT" ? "Add to account balance" : "Reduce account balance"]
                      ]}
                    />
                    
                    <ReportBox title="Details" rows={[["", computedDetails || "-"]]} />
                    <ReportBox title="Remarks" rows={[["", remarks.trim() || "-"]]} />

                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-black gap-2"
                      onClick={() => {
                        const payload = {
                          countryId,
                          countryBranchId,
                          cityBranchId,
                          entryDate,
                          roznamchaBookType,
                          attachmentName: attachmentFile?.name ?? null,
                          transactionType: paymentMode,
                          roznamchaCategory: paymentType,
                          paymentDetails: typeDetails,
                          currency,
                          exchangeRate,
                          exchangeRateSource,
                          exchangeRateEffectiveAt,
                          quantity: 1,
                          finalPayment: amount,
                          narration: `Details: ${computedDetails}\nRemarks: ${remarks.trim()}`,
                          referenceNo
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `cash-entry-${entryDate || "draft"}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Export Draft (JSON)
                    </Button>
                  </CardContent>
                </Card>

                {/* Report Summary Card */}
                <Card className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-slate-200 bg-white px-4 py-2 dark:from-slate-900 dark:to-slate-950">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      📊 Report Summary
                    </h3>
                  </div>
                  <CardContent className="p-3 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="font-semibold text-slate-500">Total Debit (Received)</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {paymentMode === "DEBIT" ? `${fmtAmount(amount)} ${currency}` : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="font-semibold text-slate-500">Total Credit (Paid)</span>
                      <span className="font-black text-red-700 text-sm">
                        {paymentMode === "CREDIT" ? `${fmtAmount(amount)} ${currency}` : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 font-bold bg-white dark:bg-slate-900 p-2 rounded-lg border">
                      <span className="font-black text-slate-800 dark:text-slate-100">Net Amount</span>
                      <span className="font-black text-blue-700 text-base">
                        {fmtAmount(amount)} {currency}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="overflow-hidden rounded-xl border-dashed border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 h-full min-h-[300px] grid place-items-center">
                <div className="p-6 text-center text-xs font-semibold text-slate-400 space-y-2">
                  <p className="text-sm">🔍 Live Payment Report Preview</p>
                  <p className="max-w-[280px]">Select Account, Payment Category, Currency, Amount and Debit/Credit to display the live report.</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Save Entry actions ribbon */}
        <section className="flex justify-end border-t border-slate-200 pt-3 dark:border-slate-800">
          <Button
            type="button"
            className="h-10 min-w-36 justify-center gap-2 rounded-md bg-emerald-700 px-5 text-xs font-black text-white hover:bg-emerald-800 animate-in fade-in"
            disabled={!canSave || saving}
            onClick={save}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </section>

        {/* 8. Roznamcha details open below the form */}
        {showRoznamcha && (
          <Card className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-bottom-5 duration-200">
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  📔 Roznamcha (Cash Book) Details
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Book: <b>{roznamchaBook}</b> | Type: <b>{roznamchaType}</b> | Number: <b>{roznamchaNumber}</b>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] font-bold gap-1.5"
                  onClick={printPreview}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] font-bold"
                  onClick={() => setShowRoznamcha(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              {/* Balanced KPI Ribbon */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <MiniMetric label="Opening Balance" value={`25,000.00 ${branchCurrency}`} tone="blue" />
                <MiniMetric
                  label="Total Debit (+)"
                  value={`${fmtAmount(recentTransactions.reduce((acc, t) => acc + (t.debit ? Number(t.debit) : 0), 0))} ${branchCurrency}`}
                  tone="green"
                />
                <MiniMetric
                  label="Total Credit (-)"
                  value={`${fmtAmount(recentTransactions.reduce((acc, t) => acc + (t.credit ? Number(t.credit) : 0), 0))} ${branchCurrency}`}
                  tone="red"
                />
                <MiniMetric
                  label="Closing Balance"
                  value={`${fmtAmount(25000 + recentTransactions.reduce((acc, t) => acc + (t.debit ? Number(t.debit) : 0) - (t.credit ? Number(t.credit) : 0), 0))} ${branchCurrency}`}
                  tone="blue"
                />
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 font-bold">Date</th>
                      <th className="p-3 font-bold">Account</th>
                      <th className="p-3 font-bold">Voucher No</th>
                      <th className="p-3 font-bold">Description</th>
                      <th className="p-3 font-bold text-right">Debit (+)</th>
                      <th className="p-3 font-bold text-right">Credit (-)</th>
                      <th className="p-3 font-bold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {recentTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="p-3 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3">
                          <div>{tx.accountName}</div>
                          <div className="text-[10px] text-slate-400">{tx.accountCode}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {tx.voucherNo}
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                        <td className="p-3 text-right text-emerald-700 whitespace-nowrap">
                          {tx.debit ? `+${fmtAmount(Number(tx.debit))}` : "—"}
                        </td>
                        <td className="p-3 text-right text-red-700 whitespace-nowrap">
                          {tx.credit ? `-${fmtAmount(Number(tx.credit))}` : "—"}
                        </td>
                        <td className="p-3 text-right font-black whitespace-nowrap">{fmtAmount(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {addOptionOpen ? (
        <SimpleModal
          title={`Add New ${addOptionType === "bank" ? "Bank" : "Method"}`}
          onClose={() => setAddOptionOpen(false)}
          className="max-w-md"
        >
          <div className="space-y-3">
            <Label>Name</Label>
            <Input value={addOptionValue} onChange={(e) => setAddOptionValue(e.target.value)} placeholder="Enter name" />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={commitAddOption}>
                Save
              </Button>
            </div>
          </div>
        </SimpleModal>
      ) : null}
    </div>
  );
}

function AddressLine({
  icon,
  label,
  value,
  strong = false
}: {
  icon: string;
  label?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[18px_1fr] items-start gap-1.5 text-[11px] text-slate-900 dark:text-slate-100">
      <span className="text-center text-xs text-blue-600 dark:text-blue-300">{icon}</span>
      <div className={strong ? "text-sm font-extrabold" : ""}>
        {label ? <>{label}: </> : null}
        <b>{value || "-"}</b>
      </div>
    </div>
  );
}

function AddressContact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[18px_72px_8px_1fr] items-center gap-1.5 text-[11px] text-slate-900 dark:text-slate-100">
      <span className="text-center text-xs text-blue-600 dark:text-blue-300">{icon}</span>
      <span>{label}</span>
      <span>:</span>
      <b className="min-w-0 break-words">{value || "-"}</b>
    </div>
  );
}

function HeaderSelect({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-black text-white/95">{label}</span>
      {children}
    </label>
  );
}

function ProfilePanel({
  title,
  icon,
  badge,
  rows,
  tone
}: {
  title: string;
  icon: ReactNode;
  badge?: string;
  rows: Array<[string, string]>;
  tone: "blue" | "purple";
}) {
  const toneClass =
    tone === "purple"
      ? "text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-950/40"
      : "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40";

  return (
    <Card className="overflow-hidden rounded-lg border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-white py-2 dark:bg-slate-950">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase">
          <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneClass)}>{icon}</span>
          {title}
        </CardTitle>
        {badge ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">{badge}</span> : null}
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={`${label}-${value}`} className="grid grid-cols-[105px_8px_1fr] items-start gap-1.5 text-[11px]">
              <span className="font-black text-slate-700 dark:text-slate-300">{label}</span>
              <span>:</span>
              <span className="break-words font-semibold text-slate-950 dark:text-slate-50">{value || "-"}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "red" | "green" | "blue" }) {
  const toneClass =
    tone === "red"
      ? "text-red-600"
      : tone === "green"
        ? "text-emerald-700"
        : "text-blue-700";

  return (
    <div className="rounded-lg border bg-white p-2 text-center shadow-sm dark:bg-slate-950">
      <div className="text-[10px] font-black text-slate-700 dark:text-slate-300">{label}</div>
      <div className={cn("mt-2 text-base font-black", toneClass)}>{value}</div>
    </div>
  );
}

function FieldBlock({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-xs font-black text-slate-900 dark:text-slate-100">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ReportBox({ title, rows }: { title?: string; rows: Array<[string, string]> }) {
  return (
    <div className="min-h-[96px] rounded-lg border bg-white p-3 text-xs shadow-sm dark:bg-slate-950">
      {title ? <div className="mb-2 text-[11px] font-black uppercase text-blue-800 dark:text-blue-300">{title}</div> : null}
      <div className="space-y-2">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`} className={cn("grid gap-1.5", label ? "grid-cols-[92px_8px_1fr]" : "grid-cols-1")}>
            {label ? (
              <>
                <span className="font-black">{label}</span>
                <span>:</span>
              </>
            ) : null}
            <span className="break-words font-semibold">{value || "-"}</span>
          </div>
          ))}
      </div>
    </div>
  );
}
