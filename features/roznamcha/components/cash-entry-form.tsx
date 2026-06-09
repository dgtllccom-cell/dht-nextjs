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
  X
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

  const [paymentType, setPaymentType] = useState<"" | "bank" | "business" | "cash" | "transfer">("");
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
  const accountLedgerOptions = useMemo(
    () => ledgerRowsWithAccount.map(toLedgerOption),
    [ledgerRowsWithAccount]
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

  const amount = useMemo(() => Number(finalPayment || 0), [finalPayment]);

  const computed = useMemo(() => {
    if (!selectedCashLedger || !selectedCounterLedger) return null;
    if (!amount || !(amount > 0)) return null;
    if (!paymentMode) return null;

    const entryType =
      paymentType === "bank"
        ? paymentMode === "DEBIT"
          ? "bank_deposit"
          : "bank_cheque"
        : paymentType === "business"
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

  // Load session + countries once.
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
    setLedgers([]);

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

  // Load ledgers once the branch scope is selected. City branch is optional:
  // main-branch cash entries should still allow payment workflow selection.
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
          setLedgers(rows);

          // Sensible defaults: pick first "cash" ledger if found.
          const cashGuess =
            rows.find((r) => (r.ledgerName ?? "").toLowerCase().includes("cash")) ??
            rows.find((r) => (r.accountName ?? "").toLowerCase().includes("cash")) ??
            null;
          if (cashGuess?.ledgerId) setCashLedgerId(cashGuess.ledgerId);
          else if (rows[0]?.ledgerId) setCashLedgerId(rows[0].ledgerId);
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
    if (!isSuperAdmin) return;

    const needsCountry = row.countryId !== countryId;
    const needsMain = row.countryBranchId !== countryBranchId;
    const nextCityBranchId = row.cityBranchId ?? "";
    const needsCity = nextCityBranchId !== cityBranchId;

    if (needsCountry || needsMain || needsCity) {
      // Prevent the "country changed" reset effect from wiping the selected ledger.
      suppressScopeResetRef.current = true;
      if (needsCountry) setCountryId(row.countryId);
      if (needsMain) setCountryBranchId(row.countryBranchId);
      if (needsCity) setCityBranchId(nextCityBranchId);
    }
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
        narration: narration.trim() ? narration.trim() : undefined,
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
          attachmentName: attachmentFile?.name ?? null
        },
        lines: [
          {
            paymentEntryType: computed.entryType,
            enterpriseAccountId: computed.counter.enterpriseAccountId,
            ledgerId: computed.counter.ledgerId,
            description: narration.trim() ? narration.trim() : undefined,
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
            description: narration.trim() ? narration.trim() : undefined,
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

  function printPreview() {
    if (!computed || !selectedCounterLedger || !selectedCashLedger) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const html = `
<html>
  <head>
    <title>${pageTitle}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}
      h2{margin:0 0 12px 0}
      .muted{color:#555;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ccc;padding:8px;font-size:13px;text-align:left}
      th{background:#f3f4f6}
    </style>
  </head>
  <body>
    <h2>${pageTitle}</h2>
    <div class="muted">Date: ${entryDate}</div>
    <div class="muted">Currency: ${currency} &nbsp; | &nbsp; Rate: ${exchangeRate}</div>
    <div style="margin-top:10px"><b>Narration:</b> ${narration || "-"}</div>

    <table>
      <thead>
        <tr>
          <th>Ledger</th>
          <th>Debit</th>
          <th>Credit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${selectedCounterLedger.ledgerName || selectedCounterLedger.accountName || "-"}</td>
          <td>${fmtAmount(computed.counter.debit)}</td>
          <td>${fmtAmount(computed.counter.credit)}</td>
        </tr>
        <tr>
          <td>${selectedCashLedger.ledgerName || selectedCashLedger.accountName || "-"}</td>
          <td>${fmtAmount(computed.cash.debit)}</td>
          <td>${fmtAmount(computed.cash.credit)}</td>
        </tr>
      </tbody>
</html>
    `.trim();

    w.document.open();
    w.document.write(html);
    w.document.close();
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
  const showCalcPanel = Boolean(normalizedCurrency) && allowedCurrencies.has(normalizedCurrency);

  const calcFinal = useMemo(() => {
    if (!showCalcPanel) return null;
    const a = Number(calcAmount);
    const p = Number(calcPrice);
    if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || p <= 0) return null;
    if (calcOp === "div" && p === 0) return null;
    const v = calcOp === "mul" ? a * p : a / p;
    return Number.isFinite(v) ? v : null;
  }, [calcAmount, calcOp, calcPrice, showCalcPanel]);

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
  const hierarchyItems = [
    { label: "Country", value: selectedCountry?.name ?? (countryId ? "Selected" : "Not selected") },
    { label: "Main Branch", value: selectedMainBranch?.name ?? (countryBranchId ? "Selected" : "Not selected") },
    { label: "City Branch", value: selectedCityBranch?.name ?? (cityBranchId ? "Selected" : "Not selected") },
    { label: "Currency", value: branchCurrency }
  ];
  const scopeReady =
    effectiveScopeMode === "super_admin" || effectiveScopeMode === "country"
      ? Boolean(countryId && countryBranchId)
      : Boolean(countryBranchId || cityBranchId);
  const accountLookupReady = isSuperAdmin || scopeReady;

  useEffect(() => {
    const value = accountNoInput.trim();
    if (!accountLookupReady || loadingLedgers || value.length < 3) return;

    const selectedKeys = selectedCounterLedger
      ? [
          selectedCounterLedger.accountCode,
          selectedCounterLedger.rawAccountCode,
          selectedCounterLedger.ledgerCode,
          selectedCounterLedger.manualReferenceNumber,
          selectedCounterLedger.customerNumber,
          selectedCounterLedger.accountName
        ]
          .filter(Boolean)
          .map((item) => String(item).trim().toLowerCase())
      : [];

    if (selectedKeys.includes(value.toLowerCase())) return;

    const timer = window.setTimeout(() => {
      void lookupAccountNo();
    }, 450);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLookupReady, accountNoInput, loadingLedgers, selectedCounterLedger?.ledgerId]);

  const scopeMetrics = [
    { label: "Working Scope", value: scopeTitle },
    { label: "Reports", value: scopeReady ? "Filtered" : "Waiting" },
    { label: "Approval Status", value: "Draft" },
    { label: "Audit", value: session?.user?.fullName || session?.user?.email || "Current User" }
  ];

  function handleViewScopeChange(nextScope: CashEntryViewScope) {
    setManualViewScope(nextScope);
    setCashLedgerId("");
    setCounterLedgerId("");
    setAccountNoInput("");
    setAccountLookupError(null);

    if (nextScope === "super_admin" && !isSuperAdmin) return;
    if (nextScope === "super_admin") {
      setCountryId("");
      setCountryBranchId("");
      setCityBranchId("");
      return;
    }

    if (session?.scopes?.countryIds?.length) {
      setCountryId(session.scopes.countryIds[0]!);
    } else if (!isSuperAdmin) {
      setCountryId("");
    }

    if (nextScope === "branch" && session?.scopes?.cityBranchIds?.length) {
      if (session.scopes.countryBranchIds?.length) setCountryBranchId(session.scopes.countryBranchIds[0]!);
      setCityBranchId(session.scopes.cityBranchIds[0]!);
    } else {
      setCountryBranchId("");
      setCityBranchId("");
    }
  }

  function saveDraftLocally() {
    const draft = {
      countryId,
      countryBranchId,
      cityBranchId,
      accountNoInput,
      counterLedgerId,
      cashLedgerId,
      entryDate,
      roznamchaBookType,
      paymentType,
      paymentMode,
      currency,
      exchangeRate,
      finalPayment,
      referenceNo,
      narration,
      typeDetails,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem("erp_cash_entry_draft_v1", JSON.stringify(draft));
    setMessage("Draft saved on this screen. Use Save Entry to post it to database.");
  }

  const accountProfileCards = selectedCounterLedger ? (
    <div className="space-y-2">
      <div className="rounded-[10px] border border-slate-200 bg-card p-2.5 shadow-[0_3px_10px_rgba(15,23,42,.05)] dark:border-slate-800">
        <div className="mb-1.5 border-b-2 border-blue-600 pb-1.5 text-xs font-black uppercase tracking-[0.25px] text-blue-700 dark:text-blue-300">
          Payment Branch Details
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1 md:pr-3">
            <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Main Branch Address</div>
            <AddressLine icon="👤" strong value={selectedCounterLedger.countryBranchName || selectedMainBranch?.name || selectedCountry?.name || "Main Branch"} />
            <AddressLine icon="📍" label="Main Branch Code" value={selectedMainBranch?.code || selectedCounterLedger.branchSerialNumber || "-"} />
            <AddressLine icon="📍" label="Country" value={selectedCounterLedger.countryName || selectedCountry?.name || "-"} />
            <AddressLine icon="📍" label="Country Serial" value={selectedCounterLedger.countrySerialNumber || "-"} />
            <AddressLine icon="📍" label="Branch Serial" value={selectedCounterLedger.branchSerialNumber || "-"} />
            <AddressContact icon="👤" label="User" value={session?.user?.fullName || session?.user?.email || "-"} />
          </div>
          <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 dark:border-slate-700">
            <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Working Branch Address</div>
            <AddressLine icon="👤" strong value={selectedCounterLedger.cityBranchName || selectedCityBranch?.name || selectedCityBranch?.city_name || branchFullName || "-"} />
            <AddressLine icon="📍" label="Working Branch Code" value={selectedCityBranch?.code || selectedMainBranch?.code || selectedCounterLedger.branchSerialNumber || "-"} />
            <AddressLine icon="📍" label="City Branch" value={selectedCounterLedger.cityBranchName || selectedCityBranch?.city_name || "-"} />
            <AddressLine icon="📍" label="Currency" value={selectedCounterLedger.ledgerCurrency || branchCurrency} />
            <AddressLine icon="📅" label="Report Date" value={entryDate} />
            <AddressContact icon="ID" label="User ID" value={session?.user?.id ?? "-"} />
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-card p-2.5 shadow-[0_3px_10px_rgba(15,23,42,.05)] dark:border-slate-800">
        <div className="mb-1.5 border-b-2 border-emerald-600 pb-1.5 text-xs font-black uppercase tracking-[0.25px] text-emerald-700 dark:text-emerald-300">
          Payment Customer Account Details
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1 md:pr-3">
            <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Billing Address</div>
            <AddressLine icon="👤" strong value={selectedCounterLedger.companyName || selectedCounterLedger.accountName || "-"} />
            <AddressLine icon="📍" label="Account Number" value={selectedCounterLedger.accountCode || selectedCounterLedger.ledgerCode || "-"} />
            <AddressLine icon="📍" label="Manual Reference" value={selectedCounterLedger.manualReferenceNumber || "-"} />
            <AddressLine icon="📍" label="Customer Number" value={selectedCounterLedger.customerNumber || "-"} />
            <AddressLine icon="📍" label="Company" value={selectedCounterLedger.companyName || "-"} />
            <AddressContact icon="☎" label="Balance" value={fmtAmount(selectedCounterLedger.currentBalance ?? 0)} />
            <AddressLine icon="#" label="Customer Currency" value={selectedCounterLedger.ledgerCurrency || "-"} />
          </div>
          <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 dark:border-slate-700">
            <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Shipping / Account Address</div>
            <AddressLine icon="👤" strong value={selectedCounterLedger.accountName || "-"} />
            <AddressLine icon="📍" label="Country" value={selectedCounterLedger.countryName || selectedCountry?.name || "-"} />
            <AddressLine icon="📍" label="City Branch" value={selectedCounterLedger.cityBranchName || selectedCityBranch?.city_name || "-"} />
            <AddressLine icon="📍" label="Status" value="Active" />
            <AddressContact icon="▣" label="Ledger" value={selectedCounterLedger.ledgerCode || selectedCounterLedger.ledgerName || "-"} />
            <AddressLine icon="▣" label="Category" value={selectedCounterLedger.accountKind || selectedCounterLedger.scope || "-"} />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-[1160px] overflow-hidden rounded-[18px] border border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,.10)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
      <section className="bg-gradient-to-br from-slate-950 to-blue-700 px-4 py-3 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Cash Entry Payment Software</h1>
            <p className="mt-0.5 text-xs font-semibold text-white/85">2025 Dashboard - Branch Payment Voucher</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-extrabold text-white">
              Report No: <span>{lastEntryId || "Draft"}</span>
            </div>
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-lg bg-white px-4 text-xs font-black text-slate-900 shadow hover:bg-slate-100"
              onClick={() => setActionMenuOpen((open) => !open)}
              aria-label="Open cash entry actions"
              title="Actions"
            >
              Actions
              <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
            </Button>
            {actionMenuOpen ? (
              <div className="absolute right-0 z-40 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,.18)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold" onClick={clearSelectedAccount}>
                  Clear Account
                </Button>
                <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold" onClick={resetPaymentDraft}>
                  Reset Payment
                </Button>
                <Button type="button" variant="ghost" className="h-9 w-full justify-start text-xs font-bold" onClick={printPreview}>
                  Print Report
                </Button>
                <Button type="button" className="h-9 w-full justify-start bg-emerald-700 text-xs font-black hover:bg-emerald-800" disabled={!canSave || saving} onClick={() => void save()}>
                  {saving ? "Saving..." : "Submit Payment"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-3 bg-[#f8fbff] p-3 dark:bg-slate-950">
        {message ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {message}
          </div>
        ) : null}

        <section className="space-y-3">
          {selectedCounterLedger ? (
            accountProfileCards
          ) : (
            <div className="space-y-3">
              <ProfilePanel
                tone="blue"
                icon={<Building2 className="h-7 w-7" aria-hidden />}
                title="Payment Branch Details"
                badge="Active"
                rows={[
                  ["Country", selectedCountry ? `${selectedCountry.name} (${branchCurrency})` : "-"],
                  ["Main Branch Code", selectedMainBranch?.code || "-"],
                  ["Main Branch", selectedMainBranch?.name || "-"],
                  ["Working Branch", selectedCityBranch?.city_name || selectedCityBranch?.name || selectedMainBranch?.name || "-"],
                  ["Currency", branchCurrency],
                  ["Report Date", entryDate],
                  ["User", session?.user?.fullName || session?.user?.email || "-"],
                  ["User ID", session?.user?.id ?? "-"]
                ]}
              />
              <ProfilePanel
                tone="purple"
                icon={<User className="h-7 w-7" aria-hidden />}
                title="Payment Customer Account Details"
                badge="-"
                rows={[
                  ["Account Number", "-"],
                  ["Manual Reference", "-"],
                  ["Customer Number", "-"],
                  ["Account Name", "-"],
                  ["Company", "-"],
                  ["Country", selectedCountry?.name || "-"],
                  ["Branch", selectedMainBranch?.name || "-"],
                  ["Current Balance", `0.00 ${branchCurrency}`]
                ]}
              />
            </div>
          )}
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.45fr_0.95fr]">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white py-2 dark:from-slate-900 dark:to-slate-950">
              <CardTitle className="flex items-center gap-2 text-base font-black uppercase text-blue-800 dark:text-blue-300">
                <Building2 className="h-5 w-5" aria-hidden />
                Payment Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              <div className="rounded-lg border border-slate-200 bg-white shadow-[0_6px_16px_rgba(15,23,42,.04)] dark:border-slate-800 dark:bg-slate-950">
                <div className="rounded-t-lg border-b bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
                  Payment Details
                </div>
                <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
                  <FieldBlock label="Country">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-black outline-none"
                      value={countryId}
                      disabled={loadingCountries || (effectiveScopeMode !== "super_admin" && !isSuperAdmin)}
                      onChange={(event) => setCountryId(event.target.value)}
                    >
                      <option value="">Select Country</option>
                      {countryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FieldBlock>
                  <FieldBlock label="Branch">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-black outline-none"
                      value={countryBranchId}
                      disabled={!countryId}
                      onChange={(event) => setCountryBranchId(event.target.value)}
                    >
                      <option value="">Select Branch</option>
                      {mainBranchOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FieldBlock>
                  <FieldBlock label="City Branch">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-black outline-none"
                      value={cityBranchId}
                      disabled={!countryId || !countryBranchId}
                      onChange={(event) => setCityBranchId(event.target.value)}
                    >
                      <option value="">Select City Branch</option>
                      {cityBranchOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FieldBlock>
                  <FieldBlock label="Roznamcha Category" required>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-black outline-none"
                      value={paymentType}
                      onChange={(event) => {
                        const value = event.target.value as "" | "cash" | "bank" | "business";
                        setPaymentType(value);
                        setTypeDetails({});
                        setAttachmentFile(null);
                        setRoznamchaBookType(value ? "branch_payment_voucher" : "");
                        setFinalPayment("");
                        setPaymentMode("");
                      }}
                    >
                      <option value="">Select Roznamcha Category</option>
                      <option value="cash">Cash Roznamcha</option>
                      <option value="bank">Bank Roznamcha</option>
                      <option value="business">Business Roznamcha</option>
                    </select>
                  </FieldBlock>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr]">
                <FieldBlock label="Account Number / Manual Reference" required>
                  <div className="flex gap-2">
                    <Input
                      className="h-9 text-xs font-black"
                      value={accountNoInput}
                      onChange={(e) => setAccountNoInput(e.target.value)}
                      placeholder="Account no / manual ref / customer no / name"
                      list="acctSamples"
                      disabled={!accountLookupReady || loadingLedgers}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void lookupAccountNo();
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={!accountLookupReady || loadingLedgers} onClick={() => void lookupAccountNo()} title="Search Account">
                      <Search className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={!accountLookupReady || loadingLedgers} onClick={clearSelectedAccount} title="Clear Account">
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <datalist id="acctSamples">
                    {ledgerRowsWithAccount.slice(0, 80).flatMap((row) =>
                      [row.accountCode || row.ledgerCode, row.manualReferenceNumber, row.customerNumber, row.accountName]
                        .filter(Boolean)
                        .map((value) => <option key={`${row.ledgerId}-${value}`} value={String(value)} />)
                    )}
                  </datalist>
                  <p className="mt-2 text-[11px] font-medium text-slate-500">
                    Universal lookup: Account Number, Manual Reference, Customer Number, or Account Name.
                  </p>
                  {accountLookupError ? (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {accountLookupError}
                    </div>
                  ) : null}
                </FieldBlock>

                <FieldBlock label="Date" required>
                  <Input className="h-9 text-xs font-black" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} type="date" />
                </FieldBlock>
              </div>

              {selectedCounterLedger && paymentType ? (
                <div className="rounded-lg border bg-white p-3 dark:bg-slate-950">
                  <div className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
                    {paymentType === "cash"
                      ? "Cash Roznamcha Details"
                      : paymentType === "bank"
                        ? "Bank Roznamcha Details"
                        : "Business Roznamcha Details"}
                  </div>
                  {paymentType === "cash" ? (
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
                  ) : paymentType === "bank" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldBlock label="Bank Name">
                        <Input className="h-9 text-xs" value={typeDetails.bankName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, bankName: e.target.value }))} placeholder="Bank name" />
                      </FieldBlock>
                      <FieldBlock label="Bank Account">
                        <Input className="h-9 text-xs" value={typeDetails.bankAccount || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, bankAccount: e.target.value }))} placeholder="Bank account" />
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
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldBlock label="Business Name">
                        <Input className="h-9 text-xs" value={typeDetails.businessName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, businessName: e.target.value }))} placeholder="Business name" />
                      </FieldBlock>
                      <FieldBlock label="Invoice Number">
                        <Input className="h-9 text-xs" value={typeDetails.invoiceNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice number" />
                      </FieldBlock>
                      <FieldBlock label="Invoice Name">
                        <Input className="h-9 text-xs" value={typeDetails.invoiceName || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, invoiceName: e.target.value }))} placeholder="Invoice name" />
                      </FieldBlock>
                      <FieldBlock label="Receipt Number">
                        <Input className="h-9 text-xs" value={typeDetails.receiptNumber || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, receiptNumber: e.target.value }))} placeholder="Receipt number" />
                      </FieldBlock>
                    </div>
                  )}
                </div>
              ) : null}

              {selectedCounterLedger && paymentType ? (
                <div className="grid gap-3 rounded-lg border bg-white p-3 dark:bg-slate-950 lg:grid-cols-3">
                  <FieldBlock label="Roznamcha No">
                    <Input className="h-9 text-xs font-black" value={lastEntryId || referenceNo || "Draft"} onChange={(e) => setReferenceNo(e.target.value)} />
                  </FieldBlock>
                  <FieldBlock label="Reference No">
                    <Input className="h-9 text-xs" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional" />
                  </FieldBlock>
                  <FieldBlock label="Currency Type" required>
                    <select
                      className={cn("h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-black outline-none", currencyError ? "border-red-300" : null)}
                      value={currency}
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
              ) : null}

              {selectedCounterLedger && paymentType && currency ? (
                <div className="grid gap-3 rounded-lg border bg-white p-3 dark:bg-slate-950 lg:grid-cols-3">
                  <FieldBlock label="Currency Type">
                    <Input className="h-9 text-xs font-black" value={currency || "-"} readOnly />
                  </FieldBlock>
                  <FieldBlock label="Exchange Rate">
                    <Input className="h-9 text-xs font-black" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} type="number" step="0.0001" min="0" disabled={!selectedCounterLedger || !countryBranchId || isLocalCurrency} />
                  </FieldBlock>
                  <FieldBlock label="Final Amount" required>
                    <Input className="h-9 text-right text-xs font-black" value={finalPayment} onChange={(e) => setFinalPayment(e.target.value)} placeholder="Enter final amount" type="number" step="0.01" min="0" disabled={!selectedCounterLedger || !countryBranchId} />
                  </FieldBlock>
                </div>
              ) : null}

              {selectedCounterLedger && paymentType && currency ? (
                <div className="rounded-lg border bg-white p-3 dark:bg-slate-950">
                  <FieldBlock label="Debit / Credit Entry" required>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={paymentMode === "DEBIT" ? "default" : "outline"}
                        className={cn("h-9 text-[11px] font-black", paymentMode === "DEBIT" ? "bg-emerald-700 hover:bg-emerald-800" : "")}
                        disabled={!selectedCounterLedger}
                        onClick={() => {
                          setPaymentMode("DEBIT");
                          setRoznamchaBookType("branch_payment_voucher");
                        }}
                      >
                        Debit
                        <span className="ml-1 text-[10px] opacity-80">(Money Received)</span>
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMode === "CREDIT" ? "default" : "outline"}
                        className={cn("h-9 text-[11px] font-black", paymentMode === "CREDIT" ? "bg-red-700 hover:bg-red-800" : "")}
                        disabled={!selectedCounterLedger}
                        onClick={() => {
                          setPaymentMode("CREDIT");
                          setRoznamchaBookType("branch_payment_voucher");
                        }}
                      >
                        Credit
                        <span className="ml-1 text-[10px] opacity-80">(Money Paid)</span>
                      </Button>
                    </div>
                    <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                      {paymentMode === "DEBIT"
                        ? "Debit (Money Received) adds the final amount to this account balance."
                        : paymentMode === "CREDIT"
                          ? "Credit (Money Paid) reduces the final amount from this account balance."
                          : "Select Debit or Credit before saving the transaction."}
                    </div>
                  </FieldBlock>
                </div>
              ) : null}

              {paymentMode && paymentType && currency ? (
                <>
                  <FieldBlock label="Remarks / Details">
                    <Input className="h-9 text-xs" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Cash paid for office expense" />
                  </FieldBlock>
                </>
              ) : null}
            </CardContent>
          </Card>

          {selectedCounterLedger && paymentMode && paymentType && currency ? (
          <Card className="overflow-hidden rounded-xl border-red-100 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-red-50 to-white py-3 dark:from-slate-900 dark:to-slate-950">
              <CardTitle className="flex items-center justify-between gap-2 text-base font-black uppercase text-red-700 dark:text-red-300">
                <span className="flex items-center gap-2"><FileText className="h-5 w-5" aria-hidden /> Live Payment Report</span>
                <span className="text-[11px] normal-case text-slate-500">{session?.user?.email ?? "-"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-2">
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

              <div className="grid gap-3 md:grid-cols-2">
                <ReportBox
                  title="Ledger Summary"
                  rows={[
                    ["Account", selectedCounterLedger?.ledgerName || selectedCounterLedger?.accountName || "-"],
                    ["Account Number", selectedCounterLedger?.accountCode || selectedCounterLedger?.ledgerCode || "-"],
                    ["Transaction Type", paymentMode === "DEBIT" ? "Debit (Money Received)" : "Credit (Money Paid)"],
                    ["Amount", amount ? fmtAmount(amount) : "-"],
                    ["Balance Effect", paymentMode === "DEBIT" ? "Add to account balance" : "Reduce account balance"]
                  ]}
                />
                <ReportBox title="Narration" rows={[["", narration.trim() || "-"]]} />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
                    finalPayment,
                    narration,
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
                <Download className="h-4 w-4" aria-hidden />
                Export Draft (JSON)
              </Button>
            </CardContent>
          </Card>
          ) : (
            <Card className="overflow-hidden rounded-xl border-dashed border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <CardHeader className="border-b py-3">
                <CardTitle className="text-base font-black uppercase text-slate-700 dark:text-slate-200">Live Payment Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6 text-sm font-semibold text-muted-foreground">
                {selectedCounterLedger && !countryBranchId ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
                    <p className="font-black">⚠️ Required options are not available.</p>
                    <p className="mt-3">
                      Account Number has been selected, but branch scope is not available or not loading.
                    </p>
                    <p className="mt-3">Please refresh the page or contact the system administrator.</p>
                    <p className="mt-3 font-black">You cannot continue until these options are loaded.</p>
                  </div>
                ) : selectedCounterLedger && !paymentMode ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-black">⚠️ صرف Account Number منتخب کیا گیا ہے۔</p>
                    <p className="mt-3">آگے بڑھنے کے لیے پہلے:</p>
                    <ul className="mt-2 list-disc space-y-1 ps-5">
                      <li>Debit (Money Received) یا Credit (Money Paid) منتخب کریں</li>
                    </ul>
                    <p className="mt-3">اس کے بعد Currency Type اور Amount کے آپشن ظاہر ہوں گے۔</p>
                  </div>
                ) : selectedCounterLedger && paymentMode && !paymentType ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-black">Payment Type منتخب کریں۔</p>
                    <p className="mt-2">Cash Roznamcha، Bank Roznamcha یا Business Roznamcha میں سے ایک category منتخب کریں۔</p>
                  </div>
                ) : selectedCounterLedger && paymentMode && paymentType && !currency ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-black">Currency Type منتخب کریں۔</p>
                    <p className="mt-2">Currency Type کے بعد Exchange Rate اور Final Amount fields active ہوں گی۔</p>
                  </div>
                ) : (
                  <p>Select Account, Debit/Credit transaction type, Payment Type, and Currency to open the live payment report.</p>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        <section className="flex justify-end border-t bg-white p-2 pt-3 dark:bg-slate-950">
          <Button type="button" className="h-9 min-w-32 justify-center gap-2 rounded-md bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800" disabled={!canSave || saving} onClick={save}>
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </section>

        {addOptionOpen ? (
          <SimpleModal title={`Add New ${addOptionType === "bank" ? "Bank" : "Method"}`} onClose={() => setAddOptionOpen(false)} className="max-w-md">
            <div className="space-y-3">
              <Label>Name</Label>
              <Input value={addOptionValue} onChange={(e) => setAddOptionValue(e.target.value)} placeholder="Enter name" />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOptionOpen(false)}>Cancel</Button>
                <Button type="button" onClick={commitAddOption}>Save</Button>
              </div>
            </div>
          </SimpleModal>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1160px] overflow-hidden rounded-[18px] border border-slate-200 bg-card text-card-foreground shadow-[0_18px_50px_rgba(15,23,42,.10)] dark:border-slate-800">
      <section className="bg-gradient-to-br from-slate-950 to-blue-700 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-lg font-black">
              <Menu className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Cash Entry Payment Software</h1>
              <p className="mt-0.5 text-xs text-white/80">2025 Dashboard - Branch Payment Voucher</p>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-extrabold">
                Report No: <span>{lastEntryId || "Draft"}</span>
              </div>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-200/20 px-3 py-1 text-xs font-semibold">{entryDate}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              {session?.user?.fullName || session?.user?.email || "Admin"}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActionMenuOpen((value) => !value)}
              aria-expanded={actionMenuOpen}
              aria-haspopup="menu"
            >
              Actions
              <span className="ms-2 text-[10px]">▼</span>
            </Button>
            {actionMenuOpen ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-[14px] border border-slate-200 bg-white p-2 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,.18)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                <Button type="button" variant="outline" size="sm" className="mb-2 w-full justify-start" onClick={clearSelectedAccount} disabled={!selectedCounterLedger}>
                  <X className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Clear Account</span>
                </Button>
                <Button type="button" variant="outline" size="sm" className="mb-2 w-full justify-start" onClick={resetPaymentDraft}>
                  <X className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Clear Payment</span>
                </Button>
                <Button type="button" variant="outline" size="sm" className="mb-2 w-full justify-start" onClick={printPreview} disabled={!computed}>
                  <Printer className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Print Report</span>
                </Button>
                <Button type="button" size="sm" className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700" onClick={save} disabled={!canSave || saving}>
                  <Save className="h-4 w-4" aria-hidden />
                  <span className="ms-2">{saving ? "Saving..." : "Submit Payment"}</span>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-3 dark:from-slate-950 dark:to-slate-900">
        {message ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            {message}
          </div>
        ) : null}

      {false && scopeMode === "auto" ? (
        <Card className="overflow-hidden rounded-[14px] border-slate-200 bg-card shadow-[0_6px_16px_rgba(15,23,42,.04)] dark:border-slate-800">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-2 text-xs font-black uppercase tracking-[0.35px] text-slate-950 dark:border-slate-800 dark:from-slate-900 dark:to-blue-950 dark:text-slate-100">
            View Scope / Access Level
          </div>
          <CardContent className="space-y-3 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-2 sm:w-72">
                <Label className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  View Scope
                </Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={effectiveScopeMode}
                  onChange={(event) => handleViewScopeChange(event.target.value as CashEntryViewScope)}
                >
                  <option value="super_admin" disabled={!isSuperAdmin}>
                    Super Admin Scope
                  </option>
                  <option value="country">Country Scope</option>
                  <option value="branch">City Scope</option>
                </select>
              </div>

              <div className="flex-1 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-600 px-3 py-1 font-extrabold text-white dark:bg-blue-500">
                    {scopeTitle}
                  </span>
                  <span>{scopeAccessText}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              {scopeMetrics.map((item) => (
                <div key={item.label} className="rounded-lg border bg-background px-3 py-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 truncate text-sm font-extrabold">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {hierarchyItems.map((item) => (
                <span key={item.label} className="rounded-full border bg-background px-3 py-1 text-xs">
                  <span className="font-semibold text-muted-foreground">{item.label}:</span>{" "}
                  <span className="font-bold">{item.value}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {false && scopeReady ? (
        <div className="space-y-2">
          <div className="rounded-[10px] border border-slate-200 bg-card p-2.5 shadow-[0_3px_10px_rgba(15,23,42,.05)] dark:border-slate-800">
            <div className="mb-1.5 border-b-2 border-blue-600 pb-1.5 text-xs font-black uppercase tracking-[0.25px] text-blue-700 dark:text-blue-300">
              Payment Branch Details
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1 md:pr-3">
                <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Main Branch Address</div>
                <AddressLine icon="👤" strong value={selectedMainBranch?.name || selectedCountry?.name || "Main Branch"} />
                <AddressLine icon="📍" label="Main Branch Code" value={selectedMainBranch?.code ?? "-"} />
                <AddressLine icon="📍" label="Global Super Admin" value="SA-GLOBAL-0001" />
                <AddressLine icon="📍" label="System Level" value={isSuperAdmin ? "Global / All Branches" : scopeTitle} />
                <AddressLine icon="📍" label="Model Code" value="CEP-2025" />
                <AddressContact icon="👤" label="User" value={session?.user?.fullName || session?.user?.email || "-"} />
                <AddressLine icon="#" label="Branch Serial" value={selectedMainBranch?.code ? `${selectedMainBranch?.code}-2025` : "-"} />
              </div>
              <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 dark:border-slate-700">
                <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Working Branch Address</div>
                <AddressLine icon="👤" strong value={branchFullName || "-"} />
                <AddressLine icon="📍" label="Working Branch Code" value={selectedCityBranch?.code || selectedMainBranch?.code || "-"} />
                <AddressLine icon="📍" label="City Branch Code" value={selectedCityBranch?.code ?? "-"} />
                <AddressLine icon="📍" label="Currency" value={branchCurrency} />
                <AddressLine icon="📅" label="Report Date" value={entryDate} />
                <AddressContact icon="ID" label="User ID" value={session?.user?.id ?? "-"} />
                <AddressLine icon="✉" label="Team / Roles" value={session?.roles?.length ? (session?.roles.join(", ") ?? "-") : "-"} />
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-slate-200 bg-card p-2.5 shadow-[0_3px_10px_rgba(15,23,42,.05)] dark:border-slate-800">
            <div className="mb-1.5 border-b-2 border-emerald-600 pb-1.5 text-xs font-black uppercase tracking-[0.25px] text-emerald-700 dark:text-emerald-300">
              Payment Customer Account Details
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1 md:pr-3">
                <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Billing Address</div>
                <AddressLine icon="👤" strong value={selectedCounterLedger?.companyName || selectedCounterLedger?.accountName || "-"} />
                <AddressLine icon="📍" label="Account Number" value={selectedCounterLedger?.accountCode || selectedCounterLedger?.ledgerCode || "-"} />
                <AddressLine icon="📍" label="Manual Reference" value={selectedCounterLedger?.manualReferenceNumber || "-"} />
                <AddressLine icon="📍" label="Customer Number" value={selectedCounterLedger?.customerNumber || "-"} />
                <AddressLine icon="📍" label="Main Branch Code" value={selectedMainBranch?.code || selectedCounterLedger?.branchSerialNumber || "-"} />
                <AddressContact icon="☎" label="Balance" value={fmtAmount(selectedCounterLedger?.currentBalance ?? 0)} />
                <AddressLine icon="#" label="Customer Currency" value={selectedCounterLedger?.ledgerCurrency || "-"} />
              </div>
              <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0 dark:border-slate-700">
                <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">Shipping / Account Address</div>
                <AddressLine icon="👤" strong value={selectedCounterLedger?.accountName || "-"} />
                <AddressLine icon="📍" label="City Branch Code" value={selectedCityBranch?.code || selectedCounterLedger?.branchSerialNumber || "-"} />
                <AddressLine icon="📍" label="Customer City" value={selectedCounterLedger?.cityName || selectedCityBranch?.city_name || "-"} />
                <AddressLine icon="📍" label="Country" value={selectedCounterLedger?.countryName || selectedCountry?.name || "-"} />
                <AddressLine icon="📍" label="Status" value={selectedCounterLedger ? "Active" : "-"} />
                <AddressContact icon="▣" label="Ledger" value={selectedCounterLedger?.ledgerCode || selectedCounterLedger?.ledgerName || "-"} />
                <AddressLine icon="▣" label="Category" value={selectedCounterLedger?.accountKind || selectedCounterLedger?.scope || "-"} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <Card className="overflow-hidden rounded-[14px] border-slate-200 bg-card shadow-[0_6px_16px_rgba(15,23,42,.04)] dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 py-2 dark:border-slate-800 dark:from-slate-900 dark:to-blue-950">
            <CardTitle className="text-sm font-black uppercase tracking-[0.35px]">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-3">
            {showScopeSelectors ? (
              <div className="overflow-hidden rounded-[10px] border border-slate-200 dark:border-slate-800">
                <div className={cn("grid gap-3 bg-background p-3", showCountrySelector ? "md:grid-cols-3" : "md:grid-cols-2")}>
                {showCountrySelector ? (
                  <SearchSelect
                    label={loadingCountries ? `${t(lang, "roz.country")} (Loading...)` : t(lang, "roz.country")}
                    value={countryId}
                    placeholder={t(lang, "roz.country")}
                    options={countryOptions}
                    disabled={loadingCountries || (effectiveScopeMode !== "super_admin" && !isSuperAdmin)}
                    onValueChange={(value) => setCountryId(value)}
                  />
                ) : null}
                <SearchSelect
                  label={t(lang, "roz.branch")}
                  value={countryBranchId}
                  placeholder={countryId ? t(lang, "roz.branch") : t(lang, "roz.country")}
                  options={mainBranchOptions}
                  disabled={!countryId}
                  onValueChange={(value) => setCountryBranchId(value)}
                />
                <SearchSelect
                  label={t(lang, "nav.city_branch")}
                  value={cityBranchId}
                  placeholder={countryBranchId ? t(lang, "nav.city_branch") : t(lang, "roz.branch")}
                  options={cityBranchOptions}
                  disabled={!countryId || !countryBranchId}
                  onValueChange={(value) => setCityBranchId(value)}
                />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs">
                <div className="font-semibold">{t(lang, "roz.branch")} Scope</div>
                <div className="mt-1 text-muted-foreground">{branchFullName || "-"}</div>
              </div>
            )}

            {accountLookupReady ? (
              <>
                <div className="space-y-2 rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800">
                  <Label>Account No *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={accountNoInput}
                      onChange={(e) => setAccountNoInput(e.target.value)}
                      placeholder="Account No / Manual Ref / Customer No / Account Name"
                      list="acctSamples"
                      disabled={!accountLookupReady || loadingLedgers}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void lookupAccountNo();
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!accountLookupReady || loadingLedgers}
                      onClick={() => void lookupAccountNo()}
                      aria-label="Lookup"
                    >
                      <Search className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!accountLookupReady || loadingLedgers}
                      onClick={clearSelectedAccount}
                      aria-label="Clear"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>

                  <datalist id="acctSamples">
                    {ledgerRowsWithAccount.slice(0, 80).flatMap((row) =>
                      [
                        row.accountCode || row.ledgerCode,
                        row.manualReferenceNumber,
                        row.customerNumber,
                        row.accountName
                      ]
                        .filter(Boolean)
                        .map((value) => <option key={`${row.ledgerId}-${value}`} value={String(value)} />)
                    )}
                  </datalist>

                  <div className="text-xs text-muted-foreground">
                    Universal lookup: Account Number, Manual Reference, Customer Number, and Account Name all load the same Account Master record.
                  </div>

                  {accountLookupError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {accountLookupError}
                    </div>
                  ) : null}
                </div>

                {accountProfileCards}

                <div className="max-w-xs space-y-2">
                  <Label>{t(lang, "roz.date")}</Label>
                  <Input value={entryDate} onChange={(e) => setEntryDate(e.target.value)} type="date" />
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                Select Country/Branch/City scope first to continue, or use Super Admin scope for global account lookup.
              </div>
            )}

            {accountLookupReady ? (
              <div className="space-y-5">
            <div className="grid gap-3 rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800 lg:grid-cols-12 lg:items-end">
              <div className="space-y-2 lg:col-span-3">
                <Label>Book Type</Label>
                <Input value="Roznamcha" readOnly className="font-semibold" />
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label>Roznamcha Number</Label>
                <Input value={lastEntryId || referenceNo || "Draft"} readOnly className="font-semibold" />
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label>Payment Type *</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={paymentType}
                  disabled={!selectedCounterLedger || !countryBranchId}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                >
                  <option value="">Select</option>
                  <option value="bank">Bank</option>
                  <option value="business">Business</option>
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label>Currency Type *</Label>
                <select
                  className={cn(
                    "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    currencyError ? "border-red-300" : null
                  )}
                  value={currency}
                  disabled={!selectedCounterLedger || !countryBranchId}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="">Select</option>
                  {[...allowedCurrencies].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {currencyError ? (
                  <div className="text-xs font-medium text-red-600">This currency is not allowed.</div>
                ) : null}
              </div>

              <div className="space-y-2 lg:col-span-12">
                <Label>Amount *</Label>
                <div className="flex h-10 overflow-hidden rounded-lg border">
                  <div className="grid place-items-center bg-muted px-3 text-xs font-semibold text-muted-foreground">
                    Rs
                  </div>
                  <input
                    value={finalPayment}
                    onChange={(e) => setFinalPayment(e.target.value)}
                    inputMode="decimal"
                    className="w-full bg-background px-3 text-sm outline-none"
                    placeholder={showCalcPanel ? "Auto" : `Enter ${branchCurrency.toUpperCase()} amount`}
                    disabled={!selectedCounterLedger || !countryBranchId}
                    readOnly={showCalcPanel}
                  />
                  <button
                    type="button"
                    className={cn(
                      "min-w-[92px] border-l px-3 text-xs font-extrabold",
                      paymentMode === "CREDIT" ? "bg-emerald-600 text-white" : "bg-background text-foreground hover:bg-muted"
                    )}
                    disabled={!selectedCounterLedger || !countryBranchId}
                    onClick={() => setPaymentMode("CREDIT")}
                  >
                    + Credit
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-w-[92px] border-l px-3 text-xs font-extrabold",
                      paymentMode === "DEBIT" ? "bg-red-600 text-white" : "bg-background text-foreground hover:bg-muted"
                    )}
                    disabled={!selectedCounterLedger || !countryBranchId}
                    onClick={() => setPaymentMode("DEBIT")}
                  >
                    - Debit
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Credit = {t(lang, "roz.credit")} | Debit = {t(lang, "roz.debit")}
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800 md:grid-cols-2">
              <div className="space-y-2">
                <Label>USD Rate</Label>
                <Input
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={!selectedCounterLedger || !countryBranchId}
                />
              </div>
              <div className="space-y-2">
                <Label>{t(lang, "roz.reference_no")}</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            {paymentType ? (
              <div className="rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800">
                <div className="border-b border-slate-200 pb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-600 dark:border-slate-800 dark:text-slate-300">Selected Payment Type Information</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {paymentType === "bank" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <div className="flex gap-2">
                          <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={typeDetails.bankName || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "__NEW__") return openAddOption("bank");
                              setTypeDetails((p) => ({ ...p, bankName: v }));
                            }}
                          >
                            <option value="">Select</option>
                            {["HBL", "MCB", "UBL", "Meezan", "Bank Alfalah", ...savedBanks].map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            <option value="__NEW__">+ New</option>
                          </select>
                          <Button type="button" variant="outline" size="icon" onClick={() => openAddOption("bank")}>
                            <span className="text-sm font-black">+</span>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <div className="flex gap-2">
                          <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={typeDetails.method || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "__NEW__") return openAddOption("method");
                              setTypeDetails((p) => ({ ...p, method: v }));
                            }}
                          >
                            <option value="">Select</option>
                            {["Cheque", "Mobile Transfer", "Online Transfer", ...savedMethods].map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            <option value="__NEW__">+ New</option>
                          </select>
                          <Button type="button" variant="outline" size="icon" onClick={() => openAddOption("method")}>
                            <span className="text-sm font-black">+</span>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Reference No.</Label>
                        <Input
                          value={typeDetails.refNo || ""}
                          onChange={(e) => setTypeDetails((p) => ({ ...p, refNo: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input
                          type="date"
                          value={typeDetails.payDate || ""}
                          onChange={(e) => setTypeDetails((p) => ({ ...p, payDate: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : paymentType === "business" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input
                          value={typeDetails.bizName || ""}
                          onChange={(e) => setTypeDetails((p) => ({ ...p, bizName: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : paymentType === "cash" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Receiver Name</Label>
                        <Input
                          value={typeDetails.receiver || ""}
                          onChange={(e) => setTypeDetails((p) => ({ ...p, receiver: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Purpose</Label>
                        <Input
                          value={typeDetails.purpose || ""}
                          onChange={(e) => setTypeDetails((p) => ({ ...p, purpose: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>From</Label>
                        <Input value={typeDetails.from || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, from: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Input value={typeDetails.to || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, to: e.target.value }))} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Reference</Label>
                        <Input value={typeDetails.ref || ""} onChange={(e) => setTypeDetails((p) => ({ ...p, ref: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {showCalcPanel ? (
              <div className="rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800">
                <div className="border-b border-slate-200 pb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-600 dark:border-slate-800 dark:text-slate-300">Currency Type / Exchange Rate / Amount</div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} type="number" step="0.0001" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Price / Rate</Label>
                    <Input value={calcPrice} onChange={(e) => setCalcPrice(e.target.value)} type="number" step="0.0001" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Operation</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={calcOp}
                      onChange={(e) => setCalcOp(e.target.value as any)}
                    >
                      <option value="mul">*</option>
                      <option value="div">/</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Attachment</Label>
              <Input
                type="file"
                disabled={!selectedCounterLedger || !countryBranchId}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">
                Attachment upload will be connected to storage in the next step.
              </div>
            </div>

            <div className="space-y-2 rounded-[10px] border border-slate-200 bg-background p-3 dark:border-slate-800">
              <Label>Remarks / Details</Label>
              <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Cash paid for office expense" />
            </div>
          </div>
        ) : null}

          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[14px] border-slate-200 bg-card shadow-[0_6px_16px_rgba(15,23,42,.04)] dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 py-2 dark:border-slate-800 dark:from-slate-900 dark:to-blue-950">
            <CardTitle className="text-sm font-black uppercase tracking-[0.35px]">Live Payment Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</span>
                <span className="text-xs text-muted-foreground">{loadingScope ? "Loading..." : session?.user?.email ?? "-"}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div>
                  <b>{t(lang, "roz.country")}:</b> <span className="text-muted-foreground">{selectedCountry?.name ?? "-"}</span>
                </div>
                <div>
                  <b>{t(lang, "roz.branch")}:</b>{" "}
                  <span className="text-muted-foreground">{mainBranches.find((b) => b.id === countryBranchId)?.name ?? "-"}</span>
                </div>
                <div>
                  <b>City Branch:</b>{" "}
                  <span className="text-muted-foreground">{cityBranches.find((b) => b.id === cityBranchId)?.city_name ?? "-"}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</div>
                <div className="mt-1 font-semibold">{entryDate}</div>
              </div>
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</div>
                <div className="mt-1 font-semibold">{amount ? `${fmtAmount(amount)} ${currency.toUpperCase()}` : "-"}</div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">USD Rate</div>
                <div className="mt-1 font-semibold">{exchangeRate}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/10 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ledger Summary</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{selectedCounterLedger?.ledgerName || selectedCounterLedger?.accountName || "-"}</div>
                    <div className="text-xs text-muted-foreground">{t(lang, "roz.ledger")}</div>
                  </div>
                  <div className={cn("text-right text-xs font-semibold", computed ? "text-foreground" : "text-muted-foreground")}>
                    {computed ? (
                      <>
                        <div>D: {fmtAmount(computed?.counter.debit ?? 0)}</div>
                        <div>C: {fmtAmount(computed?.counter.credit ?? 0)}</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{selectedCashLedger?.ledgerName || selectedCashLedger?.accountName || "-"}</div>
                    <div className="text-xs text-muted-foreground">Cash/Bank</div>
                  </div>
                  <div className={cn("text-right text-xs font-semibold", computed ? "text-foreground" : "text-muted-foreground")}>
                    {computed ? (
                      <>
                        <div>D: 0.00</div>
                        <div>C: 0.00</div>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/10 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(lang, "roz.narration")}</div>
              <div className="mt-2 text-muted-foreground">{narration.trim() || "-"}</div>
            </div>

            {lastEntryId ? (
              <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                Entry saved: <span className="font-semibold">{lastEntryId}</span>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const payload = {
                  countryId,
                  countryBranchId,
                  cityBranchId,
                  entryDate,
                  attachmentName: attachmentFile?.name ?? null,
                  paymentType,
                  paymentMode,
                  currency,
                  exchangeRate,
                  finalPayment,
                  narration,
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
              <Download className="h-4 w-4" aria-hidden />
              Export Draft (JSON)
            </Button>
          </CardContent>
        </Card>
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

function FieldBlock({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block min-w-0">
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

