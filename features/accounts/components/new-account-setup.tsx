"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Save,
  Printer,
  FileText,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Loader2,
  Phone,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCountries, type LocationCountry } from "@/features/locations/location-api";
import { apiPost, apiPatch } from "@/lib/api/client";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { CompanyPicker } from "@/features/companies/components/company-picker";
import { BankPicker } from "@/features/banks/components/bank-picker";
import { rtlLanguages, type SupportedLanguage } from "@/lib/i18n/languages";
import { getLabel } from "./translations";
import { AccountLiveReportPanel } from "./account-live-report-panel";
import { openAccountA4ReportWindow } from "@/lib/reports/open-account-a4-report-window";

type BranchType = "Main" | "City";

type AccountGeneralReportRow = {
  accountId: string;
  accountCode: string;
  rawAccountCode?: string;
  customerNumber?: string;
  countrySerialNumber?: string;
  branchSerialNumber?: string;
  manualReferenceNumber?: string | null;
  accountName: string;
  journalCode: string;
  ledgerId: string | null;
  ledgerName: string | null;
  ledgerStatus: string;
  ledgerCurrency: string;
  branchType: string;
  branchName: string;
  mainBranchName?: string;
  cityBranchName?: string;
  branchCode: string;
  countryId: string | null;
  countryName: string;
  countryCode: string;
  stateName: string;
  stateCode: string;
  cityId: string | null;
  cityName: string;
  cityCode: string;
  currency: string;
  accountCategory: string;
  subType: string;
  status: string;
  createdAt: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  currentBalance: number;
  linkedLedgerCount: number;
  journalActivityCount: number;
  latestJournalNo: string | null;
  latestActivityAt: string | null;
  companyName: string;
  companyCode: string;
  companyOwner: string;
  recentActivityLabel: string | null;
  recentActivityAt: string | null;
  accountSerialNumber?: number;
  branchAccountSequence?: number;
};

type AccountTitle = "Customer" | "Company" | "Bank" | "Employee" | "Personal";

type BranchInfo = {
  company: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  opening: string;
  currency: string;
};

type SavedEntry = {
  id: string;
  journalCode: string;
  accountCode: string;
  manualReferenceNumber?: string | null;
  customerNumber?: string;
  accountName: string;
  branchName: string;
  branchCode: string;
  savedAt: string;
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

type AccountCreateResponse = {
  accountId: string;
  ledgerId: string;
  accountCode: string;
  accountNumber: string;
  customerNumber: string;
  accountSerialNumber: number;
  countrySerialNumber: string;
  branchSerialNumber: string;
  manualReferenceNumber?: string | null;
  branchCode: string;
  branchAccountSequence: number;
};

const subTypes: Record<AccountTitle, string[]> = {
  Customer: ["Business Account", "Personal Account"],
  Company: ["Trading Company", "Supplier Company", "Service Provider", "Logistics Company"],
  Bank: ["Personal Bank", "Company Bank"],
  Employee: ["Employee Position: Manager", "Employee Position: Cashier", "Employee Position: Clerk"],
  Personal: []
};

const categories = ["P/S", "B/C", "B/P", "EX", "S"];

function nextNumber(current: number) {
  return String(current + 1).padStart(3, "0");
}

function selectClass() {
  return "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
}

function selectedBranchName(rows: CountryBranchRow[], id: string) {
  const row = rows.find((item) => item.id === id);
  return row ? `${row.name} (${row.code})` : "-";
}

function selectedCityBranchName(rows: CityBranchRow[], id: string) {
  const row = rows.find((item) => item.id === id);
  return row ? `${row.city_name} - ${row.name} (${row.code})` : "-";
}

export function NewAccountSetup({ lang: propLang, initialAccountId }: { lang?: SupportedLanguage; initialAccountId?: string }) {
  const router = useRouter();

  const lang = useMemo(() => {
    if (propLang) return propLang;
    if (typeof document !== "undefined") {
      const docLang = document.documentElement.lang as SupportedLanguage;
      return ["en", "ar", "ur", "fa", "ps"].includes(docLang) ? docLang : "en";
    }
    return "en";
  }, [propLang]);

  const isRtl = useMemo(() => rtlLanguages.includes(lang), [lang]);

  // Live report states
  const [reportRows, setReportRows] = useState<AccountGeneralReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReportAccountId, setSelectedReportAccountId] = useState("current");

  // Sidebar filter states
  const [sidebarFilter, setSidebarFilter] = useState("");
  const filteredSidebarRows = useMemo(() => {
    return reportRows.filter((r) => {
      const q = sidebarFilter.toLowerCase().trim();
      if (!q) return true;
      return (
        (r.accountCode ?? "").toLowerCase().includes(q) ||
        (r.accountName ?? "").toLowerCase().includes(q) ||
        (r.accountCategory ?? "").toLowerCase().includes(q) ||
        (r.currency ?? "").toLowerCase().includes(q)
      );
    });
  }, [reportRows, sidebarFilter]);

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Branch / Account form state (Step 1)
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [mainBranches, setMainBranches] = useState<CountryBranchRow[]>([]);
  const [cityBranches, setCityBranches] = useState<CityBranchRow[]>([]);
  const [country, setCountry] = useState("");
  const [branchType, setBranchType] = useState<BranchType | "">("");
  const [branch, setBranch] = useState("");
  const [accountTitle, setAccountTitle] = useState<AccountTitle | "">("");
  const [subType, setSubType] = useState("");
  const [category, setCategory] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [manualReferenceNumber, setManualReferenceNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [contacts, setContacts] = useState<Array<{ type: string; value: string }>>([{ type: "Mobile", value: "" }]);
  const [journalCounter, setJournalCounter] = useState(0);
  const [lastBranchCode, setLastBranchCode] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<AccountCreateResponse | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Load account details for editing if initialAccountId is provided
  useEffect(() => {
    if (!initialAccountId) return;
    let cancelled = false;

    async function loadAccountDetails() {
      setLoadingAccount(true);
      setMessage("");
      try {
        const res = await fetch(`/api/erp/accounting/accounts/${initialAccountId}`).then((r) => r.json());
        if (cancelled) return;
        if (res && res.ok && res.data) {
          const acc = res.data.account;
          if (acc) {
            setCountry(acc.country_id || "");
            const bt = acc.scope === "main_branch" ? "Main" : acc.scope === "city_branch" ? "City" : "";
            setBranchType(bt);
            setBranch(acc.scope === "main_branch" ? acc.country_branch_id || "" : acc.scope === "city_branch" ? acc.city_branch_id || "" : "");
            
            // Determine accountTitle and linked master records
            if (acc.customer_id) {
              setAccountTitle("Customer");
              setLinkedCustomerId(acc.customer_id);
              fetch(`/api/erp/customers/${acc.customer_id}`)
                .then((r) => r.json())
                .then((json) => {
                  const name = json?.customer?.customer_name ?? json?.data?.customer_name ?? "";
                  if (!cancelled) setLinkedCustomerName(name);
                })
                .catch(() => null);
            } else if (acc.company_id) {
              setAccountTitle("Company");
              setLinkedCompanyId(acc.company_id);
              fetch(`/api/erp/companies/${acc.company_id}`)
                .then((r) => r.json())
                .then((json) => {
                  const name = json?.company?.name ?? json?.company?.legal_name ?? "";
                  if (!cancelled) setLinkedCompanyName(name);
                })
                .catch(() => null);
            } else if (acc.bank_id) {
              setAccountTitle("Bank");
              setLinkedBankId(acc.bank_id);
              fetch(`/api/erp/companies/${acc.bank_id}`)
                .then((r) => r.json())
                .then((json) => {
                  const name = json?.company?.name ?? json?.company?.legal_name ?? "";
                  if (!cancelled) setLinkedBankName(name);
                })
                .catch(() => null);
            } else {
              setAccountTitle("Personal");
            }

            // Determine category
            if (acc.is_control_account) {
              setCategory("B/C");
            } else if (acc.kind === "expense") {
              setCategory("EX");
            } else if (acc.kind === "income") {
              setCategory("P/S");
            } else {
              setCategory("S");
            }

            setSubType(acc.is_control_account ? "Control Account" : "Normal Account");
            setAccountCode(acc.account_number || acc.code || "");
            setManualReferenceNumber(acc.manual_reference_number || "");
            setAccountName(acc.name || "");
            setContacts(Array.isArray(acc.contacts) && acc.contacts.length > 0 ? acc.contacts : [{ type: "Mobile", value: "" }]);
          }
        }
      } catch (err) {
        console.error("Failed to load account details:", err);
        setMessage("Failed to load account details.");
      } finally {
        if (!cancelled) setLoadingAccount(false);
      }
    }

    loadAccountDetails();
    return () => {
      cancelled = true;
    };
  }, [initialAccountId]);

  // Master record links — IDs come from Master Form pickers
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const [linkedCustomerName, setLinkedCustomerName] = useState("");
  const [linkedCompanyId, setLinkedCompanyId] = useState<string | null>(null);
  const [linkedCompanyName, setLinkedCompanyName] = useState("");
  const [linkedBankId, setLinkedBankId] = useState<string | null>(null);
  const [linkedBankName, setLinkedBankName] = useState("");

  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [companyDetail, setCompanyDetail] = useState<any>(null);
  const [bankDetail, setBankDetail] = useState<any>(null);

  // Fetch full customer details when linkedCustomerId changes
  useEffect(() => {
    if (!linkedCustomerId) { setCustomerDetail(null); return; }
    let cancelled = false;
    fetch(`/api/erp/customers/${linkedCustomerId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.ok && json?.data) setCustomerDetail(json.data);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, [linkedCustomerId]);

  // Fetch company details when linkedCompanyId changes
  useEffect(() => {
    if (!linkedCompanyId) { setCompanyDetail(null); return; }
    let cancelled = false;
    fetch(`/api/erp/companies/${linkedCompanyId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        let comp = json?.company || {};
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("incorporated_companies");
          if (stored) {
            try {
              const list = JSON.parse(stored);
              const found = list.find((c: any) => c.id === linkedCompanyId);
              if (found) comp = { ...comp, ...found };
            } catch (e) {}
          }
        }
        if (json?.ok && json?.company) {
          setCompanyDetail(comp);
        } else if (comp.id) {
          setCompanyDetail(comp);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("incorporated_companies");
          if (stored) {
            try {
              const list = JSON.parse(stored);
              const found = list.find((c: any) => c.id === linkedCompanyId);
              if (found && !cancelled) setCompanyDetail(found);
            } catch (e) {}
          }
        }
      });
    return () => { cancelled = true; };
  }, [linkedCompanyId]);

  // Fetch bank details when linkedBankId changes
  useEffect(() => {
    if (!linkedBankId) { setBankDetail(null); return; }
    let cancelled = false;
    fetch(`/api/erp/banks/${linkedBankId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.ok && json?.data?.bank) setBankDetail(json.data.bank);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, [linkedBankId]);

  // Fetch report records
  async function fetchReport() {
    setReportLoading(true);
    try {
      const res = await fetch("/api/erp/accounting/reports/accounts/general?limit=500").then((r) => r.json());
      if (res && res.ok && res.data && Array.isArray(res.data.rows)) setReportRows(res.data.rows);
    } catch (err) {
      console.error("Failed to load account report:", err);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => { fetchReport(); }, []);

  // Load countries
  useEffect(() => {
    let cancelled = false;
    listCountries()
      .then((rows) => { if (!cancelled) setCountries(rows); })
      .catch(() => { if (!cancelled) setMessage("Could not load countries."); });
    return () => { cancelled = true; };
  }, []);

  // Load Main Branches
  useEffect(() => {
    if (!country) { setMainBranches([]); return; }
    let cancelled = false;
    fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((json: { countryBranches?: CountryBranchRow[] }) => {
        if (!cancelled) setMainBranches(Array.isArray(json.countryBranches) ? json.countryBranches : []);
      })
      .catch(() => { if (!cancelled) setMessage("Could not load main branches."); });
    return () => { cancelled = true; };
  }, [country]);

  // Load City Branches
  useEffect(() => {
    if (!country) { setCityBranches([]); return; }
    let cancelled = false;
    const mainBranchId = branchType === "City" ? mainBranches[0]?.id ?? "" : "";
    const params = new URLSearchParams({ countryId: country });
    if (mainBranchId) params.set("countryBranchId", mainBranchId);
    fetch(`/api/branch-management/city-branches?${params.toString()}`)
      .then((res) => res.json())
      .then((json: { cityBranches?: CityBranchRow[] }) => {
        if (!cancelled) setCityBranches(Array.isArray(json.cityBranches) ? json.cityBranches : []);
      })
      .catch(() => { if (!cancelled) setMessage("Could not load city branches."); });
    return () => { cancelled = true; };
  }, [branchType, country, mainBranches]);

  const selectedCountry = useMemo(() => countries.find((item) => item.id === country) ?? null, [countries, country]);
  const branchOptions = branchType === "Main" ? mainBranches : branchType === "City" ? cityBranches : [];

  const branchInfo = useMemo<BranchInfo | null>(() => {
    if (!selectedCountry || !branchType || !branch) return null;
    if (branchType === "Main") {
      const row = mainBranches.find((item) => item.id === branch);
      if (!row) return null;
      return {
        company: `Damaan ${selectedCountry.name}`,
        code: row.code,
        city: selectedCountry.name,
        address: "-",
        phone: "-",
        email: "-",
        manager: "-",
        opening: "-",
        currency: row.local_currency || selectedCountry.currency_code || "USD"
      };
    }
    const row = cityBranches.find((item) => item.id === branch);
    if (!row) return null;
    return {
      company: `Damaan ${selectedCountry.name}`,
      code: row.code,
      city: row.city_name,
      address: "-",
      phone: "-",
      email: "-",
      manager: "-",
      opening: "-",
      currency: row.local_currency || selectedCountry.currency_code || "USD"
    };
  }, [branch, branchType, cityBranches, mainBranches, selectedCountry]);

  const branchCode = branchInfo?.code ?? "";
  const isEditMode = Boolean(initialAccountId);
  const accountPreview = lastCreated?.accountNumber || accountCode || (branchCode ? "AUTO" : "");
  const readyToSave = Boolean(country && branchType && branch && accountTitle && subType && category && accountName);
  const saved = message.startsWith("Saved");

  useEffect(() => {
    if (!branchCode || branchCode === lastBranchCode) return;
    setLastBranchCode(branchCode);
    // In edit mode, do NOT reset the loaded account code when branch info resolves
    if (!initialAccountId) {
      setAccountCode("");
    }
  }, [branchCode, lastBranchCode, initialAccountId]);

  function handleCountryChange(value: string) {
    setCountry(value); setBranchType(""); setBranch(""); setLastBranchCode(""); setAccountCode(""); setLastCreated(null); setMessage("");
  }

  function handleBranchTypeChange(value: BranchType) {
    setBranchType(value); setBranch(""); setLastBranchCode(""); setAccountCode(""); setLastCreated(null); setMessage("");
  }

  // Create and save account on Step 6
  async function saveEntry() {
    if (!readyToSave || !branchInfo || !accountTitle || !branchType) {
      setMessage("Account details are incomplete. Please review steps.");
      return;
    }
    const issuedJournal = `SUPER-${nextNumber(journalCounter)}`;
    const scope = branchType === "Main" ? "main_branch" : "city_branch";
    setSaving(true); setMessage(""); setLastCreated(null);
    try {
      if (initialAccountId) {
        // Edit mode!
        await apiPatch<any>(`/api/erp/accounting/accounts/${initialAccountId}`, {
          scope,
          countryId: country,
          countryBranchId:
            branchType === "Main"
              ? branch
              : cityBranches.find((item) => item.id === branch)?.country_branch_id ?? mainBranches[0]?.id ?? null,
          cityBranchId: branchType === "City" ? branch : null,
          parentId: null,
          customerId: linkedCustomerId,
          companyId: linkedCompanyId,
          bankId: linkedBankId,
          code: accountCode || undefined,  // omit code if empty so PATCH doesn't fail min(2) validation
          manualReferenceNumber: manualReferenceNumber.trim() || null,
          name: accountName.trim(),
          kind: category === "P/S" ? "income" : category === "EX" ? "expense" : "asset",
          currency: branchInfo.currency || selectedCountry?.currency_code || "USD",
          isControlAccount: accountTitle === "Bank",
          contacts
        });
        setMessage(`Updated account details successfully.`);
        void fetchReport();
        setTimeout(() => {
          router.push(`/dashboard/accounts?accountId=${initialAccountId}`);
        }, 1500);
      } else {
        // Create mode!
        const response = await apiPost<AccountCreateResponse>("/api/erp/accounting/accounts", {
          scope,
          countryId: country,
          countryBranchId:
            branchType === "Main"
              ? branch
              : cityBranches.find((item) => item.id === branch)?.country_branch_id ?? mainBranches[0]?.id ?? null,
          cityBranchId: branchType === "City" ? branch : null,
          parentId: null,
          customerId: linkedCustomerId,
          companyId: linkedCompanyId,
          bankId: linkedBankId,
          code: "AUTO",
          manualReferenceNumber: manualReferenceNumber.trim() || null,
          name: accountName.trim(),
          kind: category === "P/S" ? "income" : category === "EX" ? "expense" : "asset",
          currency: branchInfo.currency || selectedCountry?.currency_code || "USD",
          openingBalance: 0,
          isControlAccount: accountTitle === "Bank",
          contacts
        });
        setLastCreated(response);
        setJournalCounter((current) => current + 1);
        setSavedEntries((current) => [
          {
            id: response.accountId,
            journalCode: issuedJournal,
            accountCode: response.accountNumber,
            manualReferenceNumber: response.manualReferenceNumber ?? null,
            customerNumber: response.customerNumber,
            accountName,
            branchName: branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch),
            branchCode: response.branchCode,
            savedAt: new Date().toLocaleTimeString()
          },
          ...current
        ]);
        setAccountCode(response.accountNumber);
        setMessage(`Saved account ${response.accountNumber}.`);
        void fetchReport();
        setTimeout(() => {
          router.push(`/dashboard/accounts?accountId=${response.accountId}&created=1`);
        }, 1500);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account save failed.");
    } finally {
      setSaving(false);
    }
  }

  function openReport(autoPrint: boolean) {
    openAccountA4ReportWindow({
      title: "Account Profile Report",
      subtitle: "Account Profile Summary",
      autoPrint,
      accountData: {
        accountName,
        accountCode: accountPreview,
        accountTitle,
        subType,
        category,
        manualReferenceNumber,
        currency: branchInfo?.currency || selectedCountry?.currency_code || "AED",
        status: saved ? "Active" : "In Progress",
        customerDetail,
        companyDetail,
        bankDetail,
        selectedCountryName: selectedCountry?.name,
        selectedCountryCode: (selectedCountry?.iso2 || selectedCountry?.iso3 || undefined),
        selectedBranchName: branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch),
        selectedBranchCode: branchInfo?.code,
        createdBy: "Super Admin"
      }
    });
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{initialAccountId ? "Edit Account Setup" : getLabel("newAccountReport", lang)}</h1>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              {getLabel("draft", lang)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {getLabel("headerSubtitle", lang)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/accounts/setup-report")} className="h-9">
            <ClipboardList className="mr-1.5 h-4 w-4 text-slate-500" /> {getLabel("liveReport", lang)}
          </Button>
          <Button variant="default" size="sm" onClick={() => router.push("/dashboard/accounts")} className="h-9 bg-primary text-white">
            <BookOpen className="mr-1.5 h-4 w-4" /> {getLabel("accountSummary", lang)}
          </Button>
        </div>
      </div>

      {/* ── Steps Indicator Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-semibold text-slate-500">
        {[
          { id: 1, label: getLabel("step1Label", lang) },
          { id: 2, label: getLabel("step2Label", lang) },
          { id: 3, label: getLabel("step3Label", lang) },
          { id: 4, label: getLabel("step4Label", lang) },
          { id: 5, label: getLabel("step5Label", lang) },
          { id: 6, label: getLabel("step6Label", lang) }
        ].map((s) => {
          const active = currentStep === s.id;
          const completed = currentStep > s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.id === 1 || (s.id > 1 && country && branchType && branch)) {
                  setCurrentStep(s.id as any);
                }
              }}
              className={`flex items-center gap-2 border rounded-lg p-2.5 text-left transition-all ${
                active
                  ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                  : completed
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 font-bold"
                  : "border-slate-100 bg-slate-50/50 text-slate-400"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                active
                  ? "bg-primary text-white"
                  : completed
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}>
                {s.id}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">Step {s.id}</span>
                <span className="truncate">{s.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Left Column Form + Right Column Preview ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Step View */}
        <div className="lg:col-span-4 space-y-6">
          {loadingAccount ? (
            <div className="rounded-xl border border-slate-100 bg-white p-10 shadow-sm flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-slate-500">Loading account details...</p>
            </div>
          ) : (
            <>
          {/* Step 1: Account Info */}
          {currentStep === 1 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">1</span>
                <h2 className="text-sm font-bold text-slate-900">{getLabel("step1Label", lang)}</h2>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">{getLabel("country", lang)} *</Label>
                  <select id="country" value={country} onChange={(event) => handleCountryChange(event.target.value)} className={selectClass()}>
                    <option value="">Select Country</option>
                    {countries.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.iso2 ?? "-"})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchType">{getLabel("branchType", lang)} *</Label>
                  <select id="branchType" value={branchType} onChange={(event) => handleBranchTypeChange(event.target.value as BranchType)} disabled={!country} className={selectClass()}>
                    <option value="">Select Branch Type</option>
                    <option value="Main">Main Branch</option>
                    <option value="City">City Branch</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch">{getLabel("selectBranch", lang)} *</Label>
                  <select id="branch" value={branch} onChange={(event) => { setBranch(event.target.value); setMessage(""); }} disabled={!country || !branchType} className={selectClass()}>
                    <option value="">Select Branch</option>
                    {branchOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {branchType === "Main"
                          ? `${(item as CountryBranchRow).name} (${(item as CountryBranchRow).code})`
                          : `${(item as CityBranchRow).city_name} - ${(item as CityBranchRow).name} (${(item as CityBranchRow).code})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountTitle">{getLabel("accountTitle", lang)} *</Label>
                  <select id="accountTitle" value={accountTitle} onChange={(event) => { setAccountTitle(event.target.value as AccountTitle); setSubType(""); }} className={selectClass()}>
                    <option value="">Select Account Title</option>
                    <option value="Customer">Customer Account</option>
                    <option value="Bank">Bank Account</option>
                    <option value="Personal">Personal</option>
                    <option value="Company">Company</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subType">{getLabel("subType", lang)} *</Label>
                  {accountTitle === "Personal" ? (
                    <Input
                      id="subType"
                      value={subType}
                      onChange={(event) => setSubType(event.target.value)}
                      placeholder="Who does this belong to?"
                    />
                  ) : (
                    <select id="subType" value={subType} onChange={(event) => setSubType(event.target.value)} disabled={!accountTitle} className={selectClass()}>
                      <option value="">Select Sub Type</option>
                      {accountTitle ? subTypes[accountTitle].map((item) => (<option key={item} value={item}>{item}</option>)) : null}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{getLabel("category", lang)} *</Label>
                  <select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass()}>
                    <option value="">Select Category</option>
                    {categories.map((item) => (<option key={item} value={item}>{item}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountCode">{getLabel("accountCodeAuto", lang)}</Label>
                  <Input id="accountCode" value={accountCode || "Generated on save"} readOnly className="bg-slate-50 font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualReferenceNumber">{getLabel("manualReference", lang)}</Label>
                  <Input id="manualReferenceNumber" value={manualReferenceNumber} onChange={(event) => setManualReferenceNumber(event.target.value.toUpperCase())} placeholder="e.g. CUST-001" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">{getLabel("accountName", lang)} *</Label>
                <Input id="accountName" value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="e.g. Sales Account" />
              </div>

              {/* Contacts List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4.5 w-4.5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">Contacts</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setContacts([...contacts, { type: "Mobile", value: "" }])}
                    className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 px-2.5 rounded-md font-semibold"
                  >
                    + Add Contact
                  </Button>
                </div>
                <div className="space-y-3">
                  {contacts.map((contact, idx) => {
                    const isCustom = !["Mobile", "WhatsApp", "Email", "Landline", "Office"].includes(contact.type);
                    return (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="w-1/3 space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-500">Type</Label>
                          <select
                            value={isCustom ? "Custom" : contact.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...contacts];
                              updated[idx].type = val === "Custom" ? "Custom: " : val;
                              setContacts(updated);
                            }}
                            className={selectClass() + " h-9 text-xs px-2"}
                          >
                            <option value="Mobile">Mobile</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Landline">Landline</option>
                            <option value="Office">Office</option>
                            <option value="Custom">+ Custom Type</option>
                          </select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-500">Contact Value</Label>
                          <Input
                            value={contact.value}
                            onChange={(e) => {
                              const updated = [...contacts];
                              updated[idx].value = e.target.value;
                              setContacts(updated);
                            }}
                            placeholder={
                              contact.type === "Email"
                                ? "email@example.com"
                                : contact.type === "WhatsApp"
                                ? "+92 300 1234567"
                                : "Contact Number"
                            }
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                        {contacts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = contacts.filter((_, i) => i !== idx);
                              setContacts(updated);
                            }}
                            className="h-9 w-9 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => { if (country && branchType && branch && accountTitle && subType && category && accountName) { setCurrentStep(2); } else { setMessage("Please complete all required (*) fields."); } }} className="bg-primary text-white">
                  {getLabel("saveNext", lang)}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Customer Details — Master Form Picker */}
          {currentStep === 2 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">2</span>
                <h2 className="text-sm font-bold text-slate-900">Step 2: Customer Details</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Search and select an existing customer from the <b>Customer Master</b>. Use <b>+ New Customer</b> to create one — it will be saved to the master database and immediately available here and everywhere else in the ERP.
              </p>

              {/* Master Form Picker — single source of truth */}
              <CustomerPicker
                label="Customer (Master)"
                value={linkedCustomerId ?? ""}
                onValueChange={(id) => {
                  setLinkedCustomerId(id || null);
                  if (!id) { setLinkedCustomerName(""); return; }
                  // Populate account name from customer selection if not already set
                  fetch(`/api/erp/customers/${id}`)
                    .then((r) => r.json())
                    .then((json) => {
                      const name = json?.customer?.customer_name ?? json?.data?.customer_name ?? "";
                      setLinkedCustomerName(name);
                      if (!accountName && name) setAccountName(name);
                    })
                    .catch(() => null);
                }}
                placeholder="Search existing customers..."
              />

              {linkedCustomerId && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs">
                  <span className="text-emerald-700 font-semibold">✓ Linked:</span>
                  <span className="text-emerald-800">{linkedCustomerName || linkedCustomerId}</span>
                  <button
                    type="button"
                    className="ml-auto text-rose-600 hover:underline"
                    onClick={() => { setLinkedCustomerId(null); setLinkedCustomerName(""); }}
                  >
                    Disconnect
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button type="button" onClick={() => setCurrentStep(3)} className="bg-primary text-white">
                  {linkedCustomerId ? "Save & Next" : "Skip & Next"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Company Details — Master Form Picker */}
          {currentStep === 3 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">3</span>
                <h2 className="text-sm font-bold text-slate-900">Step 3: Company Details</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Search and select a company from the <b>Company Master</b>. Use <b>+ New Company</b> to create a new one — it will be available immediately throughout the ERP.
              </p>

              {/* Master Form Picker — single source of truth */}
              <CompanyPicker
                label="Company (Master)"
                value={linkedCompanyId ?? ""}
                onValueChange={(id) => {
                  setLinkedCompanyId(id || null);
                  if (!id) { setLinkedCompanyName(""); return; }
                  fetch(`/api/erp/companies/${id}`)
                    .then((r) => r.json())
                    .then((json) => {
                      const name = json?.company?.name ?? json?.company?.legal_name ?? "";
                      setLinkedCompanyName(name);
                      if (!accountName && name) setAccountName(name);
                    })
                    .catch(() => null);
                }}
                placeholder="Search existing companies..."
                createButtonPlacement="both"
              />

              {linkedCompanyId && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs">
                  <span className="text-emerald-700 font-semibold">✓ Linked:</span>
                  <span className="text-emerald-800">{linkedCompanyName || linkedCompanyId}</span>
                  <button
                    type="button"
                    className="ml-auto text-rose-600 hover:underline"
                    onClick={() => { setLinkedCompanyId(null); setLinkedCompanyName(""); }}
                  >
                    Disconnect
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                <Button type="button" onClick={() => setCurrentStep(4)} className="bg-primary text-white">
                  {linkedCompanyId ? "Save & Next" : "Skip & Next"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Bank Details — Master Form Picker */}
          {currentStep === 4 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">4</span>
                <h2 className="text-sm font-bold text-slate-900">Step 4: Bank Details</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Search and select a bank from the <b>Bank Master</b> (banks are registered as companies). Use <b>+ New Bank</b> to create one — it is saved once and reused throughout the entire ERP.
              </p>

              {/* Master Form Picker — single source of truth */}
              <BankPicker
                label="Bank (Master)"
                value={linkedBankId ?? ""}
                onValueChange={(id) => {
                  setLinkedBankId(id || null);
                  if (!id) { setLinkedBankName(""); return; }
                  fetch(`/api/erp/companies/${id}`)
                    .then((r) => r.json())
                    .then((json) => {
                      const name = json?.company?.name ?? json?.company?.legal_name ?? "";
                      setLinkedBankName(name);
                      if (!accountName && name) setAccountName(name);
                    })
                    .catch(() => null);
                }}
                placeholder="Search existing banks..."
              />

              {linkedBankId && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs">
                  <span className="text-emerald-700 font-semibold">✓ Linked:</span>
                  <span className="text-emerald-800">{linkedBankName || linkedBankId}</span>
                  <button
                    type="button"
                    className="ml-auto text-rose-600 hover:underline"
                    onClick={() => { setLinkedBankId(null); setLinkedBankName(""); }}
                  >
                    Disconnect
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>Back</Button>
                <Button type="button" onClick={() => setCurrentStep(5)} className="bg-primary text-white">
                  {linkedBankId ? "Save & Next" : "Skip & Next"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Warehouse Details */}
          {currentStep === 5 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">5</span>
                <h2 className="text-sm font-bold text-slate-900">Step 5: Warehouse Details</h2>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 space-y-2">
                <div className="font-bold text-amber-800">Form Disabled (Set to Zero)</div>
                <p className="text-xs text-amber-700 leading-5">
                  Warehouse setup page handles inventory locations, currently this configuration is disabled (set to zero). No forms or inputs are required. You can click Next to review and save the account.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
                <Button type="button" onClick={() => setCurrentStep(6)} className="bg-primary text-white">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Review & Save */}
          {currentStep === 6 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">6</span>
                <h2 className="text-sm font-bold text-slate-900">Step 6: Review & Save</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div className="rounded-lg border bg-slate-50/40 p-4 space-y-2">
                  <h3 className="font-bold text-slate-700 border-b pb-1">Branch Details</h3>
                  <div><b>Company:</b> {branchInfo?.company || "-"}</div>
                  <div><b>Branch Name:</b> {branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch)}</div>
                  <div><b>Branch Code:</b> {branchInfo?.code || "-"}</div>
                  <div><b>Country:</b> {selectedCountry?.name || "-"}</div>
                  <div><b>Branch Type:</b> {branchType || "-"}</div>
                  <div><b>Currency:</b> {branchInfo?.currency || "-"}</div>
                </div>

                <div className="rounded-lg border bg-slate-50/40 p-4 space-y-2">
                  <h3 className="font-bold text-slate-700 border-b pb-1">Account Info</h3>
                  <div><b>Account Title:</b> {accountTitle || "-"}</div>
                  <div><b>Sub Type:</b> {subType || "-"}</div>
                  <div><b>Category:</b> {category || "-"}</div>
                  <div><b>Account Code (Auto):</b> {accountCode || "AUTO"}</div>
                  <div><b>Account Name:</b> {accountName || "-"}</div>
                  <div><b>Manual Reference:</b> {manualReferenceNumber || "-"}</div>
                </div>
              </div>

              {/* Linked Masters Summary */}
              {(linkedCustomerId || linkedCompanyId || linkedBankId) && (
                <div className="rounded-lg border bg-slate-50/40 p-4 text-xs space-y-2">
                  <h3 className="font-bold text-slate-700 border-b pb-1">Linked Master Records</h3>
                  {linkedCustomerId && <div><b>Linked Customer:</b> {linkedCustomerName} <span className="text-slate-400 font-mono">({linkedCustomerId})</span></div>}
                  {linkedCompanyId && <div><b>Linked Company:</b> {linkedCompanyName} <span className="text-slate-400 font-mono">({linkedCompanyId})</span></div>}
                  {linkedBankId && <div><b>Linked Bank:</b> {linkedBankName} <span className="text-slate-400 font-mono">({linkedBankId})</span></div>}
                </div>
              )}

              {message && (
                <div className={saved
                  ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800"
                  : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800"
                }>
                  {message}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
                <Button type="button" onClick={saveEntry} disabled={!readyToSave || saving} className="bg-primary text-white">
                  {saving ? "Saving..." : initialAccountId ? "Update & Save Account" : "Create & Save Account"}
                </Button>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Right Side: High-fidelity Live Report Preview */}
        <div className="lg:col-span-8 h-fit lg:sticky lg:top-24 space-y-4">
          <AccountLiveReportPanel
            accountName={accountName}
            accountCode={accountPreview}
            accountTitle={accountTitle}
            subType={subType}
            category={category}
            manualReferenceNumber={manualReferenceNumber}
            currency={branchInfo?.currency || selectedCountry?.currency_code || "AED"}
            status={saved ? "Active" : "In Progress"}
            customerDetail={customerDetail}
            companyDetail={companyDetail}
            bankDetail={bankDetail}
            selectedCountryName={selectedCountry?.name}
            selectedCountryCode={selectedCountry?.iso2 || selectedCountry?.iso3 || undefined}
            selectedBranchName={branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch)}
            selectedBranchCode={branchInfo?.code}
            onBack={() => router.push("/dashboard/accounts")}
            onPrint={() => openReport(true)}
            onPdf={() => openReport(false)}
            onExcel={() => {
              const rows = [
                ["Field", "Value"],
                ["Account Name", accountName || "-"],
                ["Account Code", accountPreview || "-"],
                ["Account Type", subType || category || "Expense"],
                ["Currency", branchInfo?.currency || selectedCountry?.currency_code || "AED"],
                ["Status", saved ? "Active" : "In Progress"]
              ];
              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `account_${accountPreview || "draft"}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            onEmail={() => {
              const subject = encodeURIComponent("Account Profile Report");
              const body = encodeURIComponent(`Account Profile Report\nAccount Name: ${accountName}\nAccount Code: ${accountPreview}`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
            }}
            onWhatsApp={() => {
              const text = encodeURIComponent(`Account Profile: ${accountName} (${accountPreview})`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
          />
        </div>
      </div>

      {/* Master Form modals are handled inline by CustomerPicker / CompanyPicker / BankPicker */}
    </div>
  );
}
