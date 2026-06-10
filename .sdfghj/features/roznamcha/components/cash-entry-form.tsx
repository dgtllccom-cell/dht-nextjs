"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Menu, Printer, Save, Search, X } from "lucide-react";
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
  const branch = row.cityBranchName || row.countryBranchName || "";
  const country = row.countryName || "";
  const city = row.cityName || "";
  const company = row.companyName || "";

  const label = `${accountNo} - ${account}${branch ? ` (${branch})` : ""}`;
  const keywords = [accountNo, account, company, branch, city, country, row.ledgerCode, row.ledgerName]
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
  scopeMode = "auto"
}: {
  lang: SupportedLanguage;
  pageTitle: string;
  postingType?: RoznamchaType;
  // auto: infer visibility from session roles; super_admin/country/branch: force scope rules for dedicated pages.
  scopeMode?: CashEntryScopeMode;
}) {
  // When we auto-derive scope from the selected account/ledger, avoid wiping selections
  // in the "country changed" reset effect.
  const suppressScopeResetRef = useRef(false);

  const [loadingScope, setLoadingScope] = useState(true);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [manualViewScope, setManualViewScope] = useState<CashEntryViewScope | null>(null);

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
  const [accountNoInput, setAccountNoInput] = useState("");
  const [accountLookupError, setAccountLookupError] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState(todayIso());
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === countryId) ?? null,
    [countries, countryId]
  );

  const [currency, setCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [currencyError, setCurrencyError] = useState(false);

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
  const [message, setMessage] = useState<string | null>(null);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);

  const ledgerRowsWithAccount = useMemo(
    () => ledgers.filter((row) => Boolean(row.accountId && row.ledgerId)),
    [ledgers]
  );
  const ledgerOptions = useMemo(
    () => ledgerRowsWithAccount.map(toLedgerOption),
    [ledgerRowsWithAccount]
  );

  const selectedCashLedger = useMemo(
    () => ledgerRowsWithAccount.find((row) => row.ledgerId === cashLedgerId) ?? null,
    [ledgerRowsWithAccount, cashLedgerId]
  );

  const selectedCounterLedger = useMemo(
    () => ledgerRowsWithAccount.find((row) => row.ledgerId === counterLedgerId) ?? null,
    [ledgerRowsWithAccount, counterLedgerId]
  );

  useEffect(() => {
    if (!selectedCounterLedger) return;
    const code = selectedCounterLedger.accountCode || selectedCounterLedger.ledgerCode || "";
    setAccountNoInput(code);
    setAccountLookupError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCounterLedger?.ledgerId]);

  useEffect(() => {
    // If the user hasn't picked a cash/bank ledger yet, try to auto-pick one for the current branch.
    if (!cityBranchId || cashLedgerId) return;
    const match = ledgerRowsWithAccount.find((row) => {
      const name = `${row.ledgerName || ""} ${row.accountName || ""}`.toLowerCase();
      const code = `${row.ledgerCode || ""} ${row.accountCode || ""}`.toLowerCase();
      return name.includes("cash") || code.includes("cash");
    });
    if (match?.ledgerId) setCashLedgerId(match.ledgerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityBranchId, ledgerRowsWithAccount.length]);

  const amount = useMemo(() => Number(finalPayment || 0), [finalPayment]);
  const isDebitOnCounterparty = paymentMode === "DEBIT";

  const computed = useMemo(() => {
    if (!selectedCashLedger || !selectedCounterLedger) return null;
    if (!amount || !(amount > 0)) return null;
    if (!paymentMode) return null;

    const entryType =
      paymentType === "transfer"
        ? "transfer"
        : paymentType === "bank"
          ? isDebitOnCounterparty
            ? "bank_cheque"
            : "bank_deposit"
          : paymentType === "business"
            ? isDebitOnCounterparty
              ? "debit"
              : "credit"
            : isDebitOnCounterparty
              ? "cash_payment"
              : "cash_receipt";

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
    isDebitOnCounterparty,
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
    }
    setMainBranches([]);
    setCityBranches([]);
    setLedgers([]);

    // Keep currency empty until an account is selected (matches reference UX).
    if (!suppress) setCurrency("");
    setCurrencyError(false);
    setExchangeRate("1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Load ledgers once the scope is selected (branch-level).
  useEffect(() => {
    let cancelled = false;
    if (!cityBranchId) return;

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
    Boolean(countryId && countryBranchId && cityBranchId) &&
    Boolean(selectedCashLedger?.ledgerId && selectedCounterLedger?.ledgerId) &&
    Boolean(paymentType) &&
    Boolean(paymentMode) &&
    Boolean(amount && amount > 0) &&
    currency.trim().length === 3 &&
    Number(exchangeRate) > 0 &&
    !saving;

  function applyScopeFromLedger(row: LedgerLookupRow) {
    if (!row.countryId || !row.countryBranchId || !row.cityBranchId) return;
    if (!isSuperAdmin) return;

    const needsCountry = row.countryId !== countryId;
    const needsMain = row.countryBranchId !== countryBranchId;
    const needsCity = row.cityBranchId !== cityBranchId;

    if (needsCountry || needsMain || needsCity) {
      // Prevent the "country changed" reset effect from wiping the selected ledger.
      suppressScopeResetRef.current = true;
      if (needsCountry) setCountryId(row.countryId);
      if (needsMain) setCountryBranchId(row.countryBranchId);
      if (needsCity) setCityBranchId(row.cityBranchId);
    }
  }

  function handleCounterLedgerChange(nextId: string) {
    setCounterLedgerId(nextId);
    const row = ledgers.find((r) => r.ledgerId === nextId) ?? null;
    if (!row) return;

    applyScopeFromLedger(row);

    const nextCur = (row.ledgerCurrency || "").trim();
    if (nextCur.length === 3) setCurrency(nextCur.toUpperCase());
  }

  function clearSelectedAccount() {
    setCounterLedgerId("");
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

  function lookupAccountNo() {
    const needle = accountNoInput.trim().toLowerCase();
    if (!needle) return;

    const match =
      ledgerRowsWithAccount.find(
        (row) => (row.accountCode ?? row.ledgerCode ?? "").toLowerCase() === needle
      ) ?? null;

    if (!match?.ledgerId) {
      setAccountLookupError("Account not found for this branch scope.");
      return;
    }

    handleCounterLedgerChange(match.ledgerId);
    setAccountLookupError(null);
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
      setMessage("Please fill required fields (scope, account, payment type, mode, and amount).");
      return;
    }

    if (!computed) {
      setMessage("Select DEBIT or CREDIT and enter a valid amount.");
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
        journalNo: effectiveJournal,
        voucherNo: effectiveVoucher,
        paymentMethodId: null,
        referenceNo: referenceNo.trim() ? referenceNo.trim() : undefined,
        narration: narration.trim() ? narration.trim() : undefined,
        lines: [
          {
            paymentEntryType: computed.entryType,
            enterpriseAccountId: computed.counter.enterpriseAccountId,
            ledgerId: computed.counter.ledgerId,
            description: narration.trim() ? narration.trim() : undefined,
            debit: computed.counter.debit,
            credit: computed.counter.credit,
            currency: currency.trim().toUpperCase(),
            exchangeRate: Number(exchangeRate)
          },
          {
            paymentEntryType: computed.entryType,
            enterpriseAccountId: computed.cash.enterpriseAccountId,
            ledgerId: computed.cash.ledgerId,
            description: narration.trim() ? narration.trim() : undefined,
            debit: computed.cash.debit,
            credit: computed.cash.credit,
            currency: currency.trim().toUpperCase(),
            exchangeRate: Number(exchangeRate)
          }
        ]
      };

      const res = await apiPost<RoznamchaPostResponse>("/api/erp/roznamcha", payload);
      setLastEntryId(res.entryId ?? null);
      setMessage(res.entryId ? `Saved successfully (Entry: ${res.entryId})` : "Saved successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function printPreview() {
    if (!computed || !selectedCashLedger || !selectedCounterLedger) return;
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
    </table>

    <script>window.onload = () => window.print();</script>
  </body>
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
    const list = [branchCurrency, "USD", "AFN", "INR", "IRR"]
      .map((v) => (v ?? "").toString().trim().toUpperCase())
      .filter(Boolean);
    return new Set(list);
  }, [branchCurrency]);

  const normalizedCurrency = currency.trim().toUpperCase();
  const isLocalCurrency = normalizedCurrency === branchCurrency.toUpperCase();
  const showCalcPanel = Boolean(normalizedCurrency) && !isLocalCurrency && allowedCurrencies.has(normalizedCurrency);

  const calcFinal = useMemo(() => {
    if (!showCalcPanel) return null;
    const a = Number(calcAmount);
    const p = Number(calcPrice);
    if (!Number.isFinite(a) || !Number.isFinite(p) || a <= 0 || p <= 0) return null;
    if (calcOp === "div" && p === 0) return null;
    const v = calcOp === "mul" ? a * p : a / p;
    return Number.isFinite(v) ? v : null;
  }, [calcAmount, calcOp, calcPrice, showCalcPanel]);

  // Enforce currency rules and keep derived fields in sync with the reference behavior.
  useEffect(() => {
    const selected = normalizedCurrency;

    if (!selected) {
      setCurrencyError(false);
      setCalcAmount("");
      setCalcPrice("");
      setFinalPayment("");
      setExchangeRate("1");
      return;
    }

    if (!allowedCurrencies.has(selected)) {
      setCurrencyError(true);
      setCalcAmount("");
      setCalcPrice("");
      setFinalPayment("");
      setExchangeRate("1");
      return;
    }

    setCurrencyError(false);

    if (selected === branchCurrency.toUpperCase()) {
      // Local currency: manual final payment, no calc panel.
      setCalcAmount("");
      setCalcPrice("");
      setExchangeRate("1");
      return;
    }

    // Foreign currency: derive final payment from calc panel; keep rate aligned to price.
    if (calcPrice.trim()) setExchangeRate(calcPrice);
    const derived = calcFinal;
    const next = derived !== null ? String(derived) : "";
    if (finalPayment !== next) setFinalPayment(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedCurrencies, branchCurrency, calcFinal, calcOp, calcPrice, calcAmount, normalizedCurrency]);

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
      ? Boolean(countryId && countryBranchId && cityBranchId)
      : Boolean(cityBranchId);

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

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-4 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-lg font-black">
              <Menu className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">{pageTitle}</h1>
              <p className="text-xs text-white/80">Smart Daily Roznamcha System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-200/20 px-3 py-1 text-xs font-semibold">{entryDate}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              {session?.user?.fullName || session?.user?.email || "Admin"}
            </span>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {message}
        </div>
      ) : null}

      {scopeMode === "auto" ? (
        <Card className="border-slate-200/80 shadow-sm">
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

      {scopeReady ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-extrabold tracking-wide text-blue-700 dark:text-blue-300">
                  BRANCH REPORT
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Main branch daily information</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Print</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([branchFullName || "-"], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "branch-report.txt";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Export</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white dark:bg-slate-800">
                User: {session?.user?.fullName || session?.user?.email || "-"}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                Roles: {session?.roles?.length ? session.roles.join(", ") : "-"}
              </span>
              {/* Voucher/serial is generated automatically on save; do not show manual serial fields here. */}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <tbody className="[&>tr]:border-b [&>tr:last-child]:border-b-0">
                  <tr>
                    <th className="w-[38%] bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Branch Full Name
                    </th>
                    <td className="px-3 py-2 font-semibold">{branchFullName || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Branch Currency
                    </th>
                    <td className="px-3 py-2 font-semibold">{branchCurrency}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Main Branch Code
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedMainBranch?.code ?? "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      City Branch Code
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCityBranch?.code ?? "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Branch Contacts
                    </th>
                    <td className="px-3 py-2 font-semibold">-</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Logged-in User
                    </th>
                    <td className="px-3 py-2 font-semibold">{session?.user?.id ?? "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Date
                    </th>
                    <td className="px-3 py-2 font-semibold">
                      {entryDate}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-extrabold tracking-wide text-emerald-700 dark:text-emerald-300">
                  ACCOUNT REPORT
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Selected account complete details</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={clearSelectedAccount} disabled={!selectedCounterLedger}>
                  <X className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Clear</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" aria-hidden />
                  <span className="ms-2">Print</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <tbody className="[&>tr]:border-b [&>tr:last-child]:border-b-0">
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Account Number
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCounterLedger?.accountCode || selectedCounterLedger?.ledgerCode || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Account Name
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCounterLedger?.accountName || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Category
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCounterLedger?.accountKind || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Currency
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCounterLedger?.ledgerCurrency || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Account Type
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCounterLedger?.scope || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Contacts
                    </th>
                    <td className="px-3 py-2 font-semibold">-</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Account Branch Main
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedMainBranch?.name || "-"}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                      Account Branch City
                    </th>
                    <td className="px-3 py-2 font-semibold">{selectedCityBranch?.city_name || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Work Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {showScopeSelectors ? (
              <div className={cn("grid gap-4", showCountrySelector ? "md:grid-cols-3" : "md:grid-cols-2")}>
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
            ) : (
              <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs">
                <div className="font-semibold">{t(lang, "roz.branch")} Scope</div>
                <div className="mt-1 text-muted-foreground">{branchFullName || "-"}</div>
              </div>
            )}

            {scopeReady ? (
              <>
                <div className="space-y-2">
                  <Label>Account No *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={accountNoInput}
                      onChange={(e) => setAccountNoInput(e.target.value)}
                      placeholder="Search by account number"
                      list="acctSamples"
                      disabled={!cityBranchId || loadingLedgers}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!cityBranchId || loadingLedgers}
                      onClick={lookupAccountNo}
                      aria-label="Lookup"
                    >
                      <Search className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={!cityBranchId || loadingLedgers}
                      onClick={clearSelectedAccount}
                      aria-label="Clear"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>

                  <datalist id="acctSamples">
                    {ledgerRowsWithAccount.slice(0, 80).map((row) => {
                      const code = row.accountCode || row.ledgerCode;
                      if (!code) return null;
                      return <option key={row.ledgerId} value={code} />;
                    })}
                  </datalist>

                  <div className="text-xs text-muted-foreground">Cash/Bank ledger is selected automatically for this scope.</div>

                  {accountLookupError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {accountLookupError}
                    </div>
                  ) : null}
                </div>

                <div className="max-w-xs space-y-2">
                  <Label>{t(lang, "roz.date")}</Label>
                  <Input value={entryDate} onChange={(e) => setEntryDate(e.target.value)} type="date" />
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                Select Country/Branch/City scope first to continue.
              </div>
            )}

            {scopeReady ? (
              <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
              <div className="space-y-2 lg:col-span-3">
                <Label>Payment Type *</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={paymentType}
                  disabled={!selectedCounterLedger || !cityBranchId}
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
                  disabled={!selectedCounterLedger || !cityBranchId}
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

              <div className="space-y-2 lg:col-span-6">
                <Label>Final Payment *</Label>
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
                    disabled={!selectedCounterLedger || !cityBranchId}
                    readOnly={showCalcPanel}
                  />
                  <button
                    type="button"
                    className={cn(
                      "min-w-[92px] border-l px-3 text-xs font-extrabold",
                      paymentMode === "CREDIT" ? "bg-emerald-600 text-white" : "bg-background text-foreground hover:bg-muted"
                    )}
                    disabled={!selectedCounterLedger || !cityBranchId}
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
                    disabled={!selectedCounterLedger || !cityBranchId}
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>USD Rate</Label>
                <Input
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={!selectedCounterLedger || !cityBranchId}
                />
              </div>
              <div className="space-y-2">
                <Label>{t(lang, "roz.reference_no")}</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            {paymentType ? (
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="text-xs font-extrabold tracking-wide">Payment Type Details</div>
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
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="text-xs font-extrabold tracking-wide">Currency Calculation</div>
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
                disabled={!selectedCounterLedger || !cityBranchId}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">
                Attachment upload will be connected to storage in the next step.
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t(lang, "roz.narration")}</Label>
              <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Cash paid for office expense" />
            </div>
          </div>
        ) : null}

          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posting Lines</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{selectedCounterLedger?.ledgerName || selectedCounterLedger?.accountName || "-"}</div>
                    <div className="text-xs text-muted-foreground">{t(lang, "roz.ledger")}</div>
                  </div>
                  <div className={cn("text-right text-xs font-semibold", computed ? "text-foreground" : "text-muted-foreground")}>
                    {computed ? (
                      <>
                        <div>D: {fmtAmount(computed.counter.debit)}</div>
                        <div>C: {fmtAmount(computed.counter.credit)}</div>
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
                        <div>D: {fmtAmount(computed.cash.debit)}</div>
                        <div>C: {fmtAmount(computed.cash.credit)}</div>
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
  );
}

