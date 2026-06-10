"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Hash,
  Landmark,
  Mail,
  Phone,
  ReceiptText,
  Save,
  Search,
  UserRound,
  Warehouse
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCountries, type LocationCountry } from "@/features/locations/location-api";
import { apiPost } from "@/lib/api/client";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { CompanyIncorporationForm } from "@/features/companies/components/company-incorporation-form";
import { rtlLanguages, type SupportedLanguage } from "@/lib/i18n/languages";
import { getLabel } from "./translations";

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

type AccountTitle = "Customer" | "Company" | "Bank" | "Employee";

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
  Customer: ["Company Account", "Business Account", "Personal Account"],
  Company: ["Trading Company", "Supplier Company", "Service Provider", "Logistics Company"],
  Bank: ["Company Bank Account", "Branch Bank Account", "Cash Control Account"],
  Employee: ["Employee Position: Manager", "Employee Position: Cashier", "Employee Position: Clerk"]
};

const categories = ["Expenses", "Purchase", "Sales", "Revenue"];

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

export function NewAccountSetup({ lang: propLang }: { lang?: SupportedLanguage }) {
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
  const [journalCounter, setJournalCounter] = useState(0);
  const [lastBranchCode, setLastBranchCode] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<AccountCreateResponse | null>(null);

  // Master record links
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const [linkedCustomerName, setLinkedCustomerName] = useState("");
  const [linkedCompanyId, setLinkedCompanyId] = useState<string | null>(null);
  const [linkedCompanyName, setLinkedCompanyName] = useState("");
  const [linkedBankId, setLinkedBankId] = useState<string | null>(null);
  const [linkedBankName, setLinkedBankName] = useState("");

  // Search states (reused across steps)
  const [masterSearch, setMasterSearch] = useState("");
  const [masterResults, setMasterResults] = useState<{ id: string; name: string }[]>([]);
  const [masterSearchOpen, setMasterSearchOpen] = useState(false);
  const [masterSearchLoading, setMasterSearchLoading] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterModalType, setMasterModalType] = useState<"customer" | "company" | "bank" | null>(null);

  // Live report states
  const [reportRows, setReportRows] = useState<AccountGeneralReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReportAccountId, setSelectedReportAccountId] = useState("current");

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

  // Fetch master records based on active step
  useEffect(() => {
    const query = masterSearch.trim();
    if (!query) { setMasterResults([]); return; }

    const targetType =
      currentStep === 2 ? "Customer" : currentStep === 3 ? "Company" : currentStep === 4 ? "Bank" : "";
    if (!targetType) return;

    const endpoint =
      targetType === "Customer"
        ? `/api/erp/customers?limit=20&search=${encodeURIComponent(query)}`
        : `/api/erp/companies?limit=20&search=${encodeURIComponent(query)}`; // Banks are companies in this module

    let cancelled = false;
    setMasterSearchLoading(true);
    fetch(endpoint)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const rows: { id: string; name: string }[] =
          targetType === "Customer"
            ? (json.customers ?? []).map((c: any) => ({ id: c.id, name: c.customer_name }))
            : (json.companies ?? []).map((c: any) => ({ id: c.id, name: c.company_name ?? c.companyName }));
        setMasterResults(rows);
      })
      .catch(() => { if (!cancelled) setMasterResults([]); })
      .finally(() => { if (!cancelled) setMasterSearchLoading(false); });

    return () => { cancelled = true; };
  }, [masterSearch, currentStep]);

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
  const accountPreview = lastCreated?.accountNumber || accountCode || (branchCode ? "AUTO" : "");
  const readyToSave = Boolean(country && branchType && branch && accountTitle && subType && category && accountName);
  const saved = message.startsWith("Saved");

  useEffect(() => {
    if (!branchCode || branchCode === lastBranchCode) return;
    setLastBranchCode(branchCode);
    setAccountCode("");
  }, [branchCode, lastBranchCode]);

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
      const response = await apiPost<AccountCreateResponse>("/api/erp/accounting/accounts", {
        scope,
        countryId: country,
        countryBranchId:
          branchType === "Main"
            ? branch
            : cityBranches.find((item) => item.id === branch)?.country_branch_id ?? mainBranches[0]?.id ?? null,
        cityBranchId: branchType === "City" ? branch : null,
        parentId: null,
        code: "AUTO",
        manualReferenceNumber: manualReferenceNumber.trim() || null,
        name: accountName.trim(),
        kind: category === "Sales" || category === "Revenue" ? "income" : category === "Expenses" ? "expense" : "asset",
        currency: branchInfo.currency || selectedCountry?.currency_code || "USD",
        openingBalance: 0,
        isControlAccount: accountTitle === "Bank"
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{getLabel("newAccountReport", lang)}</h1>
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
                  setMasterSearch("");
                  setMasterResults([]);
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
                  : "bg-slate-200 text-slate-500"
              }`}>
                {s.id}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Left Column Form + Right Column Preview ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Step View */}
        <section className="lg:col-span-4 rounded-lg border bg-card p-5 space-y-6">
          {/* Step 1: Account Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">{getLabel("step1Label", lang)}</h2>
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
                    <option value="Customer">Customer</option>
                    <option value="Company">Company</option>
                    <option value="Bank">Bank</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subType">{getLabel("subType", lang)} *</Label>
                  <select id="subType" value={subType} onChange={(event) => setSubType(event.target.value)} disabled={!accountTitle} className={selectClass()}>
                    <option value="">Select Sub Type</option>
                    {accountTitle ? subTypes[accountTitle].map((item) => (<option key={item} value={item}>{item}</option>)) : null}
                  </select>
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
                  <Label htmlFor="accountName">{getLabel("accountName", lang)} *</Label>
                  <Input id="accountName" value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="e.g. Sales Account" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualReferenceNumber">{getLabel("manualReference", lang)}</Label>
                <Input id="manualReferenceNumber" value={manualReferenceNumber} onChange={(event) => setManualReferenceNumber(event.target.value.toUpperCase())} placeholder="e.g. CUST-001" />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => { if (country && branchType && branch && accountTitle && subType && category && accountName) { setCurrentStep(2); } else { setMessage("Please complete all required (*) fields."); } }} className="bg-primary text-white">
                  {getLabel("saveNext", lang)}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Customer Details */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <UserRound className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 2: Customer Details</h2>
              </div>

              {linkedCustomerId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-800">Linked Customer Profile</h3>
                    <Button variant="outline" size="sm" onClick={() => { setLinkedCustomerId(null); setLinkedCustomerName(""); setMasterSearch(""); }} className="h-7 text-xs text-emerald-700 border-emerald-300 bg-white">
                      Disconnect
                    </Button>
                  </div>
                  <div className="text-sm">
                    <div><b>Name:</b> {linkedCustomerName}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-1"><b>ID:</b> {linkedCustomerId}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="customerSearch">Search Existing Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="customerSearch"
                      value={masterSearch}
                      onChange={(e) => { setMasterSearch(e.target.value); setMasterSearchOpen(true); }}
                      placeholder="Type customer name to search..."
                      className="pl-9"
                    />
                  </div>

                  {masterSearchOpen && masterSearch && (
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                      {masterResults.length > 0 ? (
                        masterResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs border-b last:border-0"
                            onClick={() => {
                              setLinkedCustomerId(r.id);
                              setLinkedCustomerName(r.name);
                              setMasterSearchOpen(false);
                              if (!accountName) setAccountName(r.name);
                            }}
                          >
                            {r.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-500 flex items-center justify-between">
                          <span>No customer found matching "{masterSearch}"</span>
                          <Button size="sm" type="button" onClick={() => { setMasterModalType("customer"); setShowMasterModal(true); }} className="h-7 text-xs">
                            + New Customer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="button" onClick={() => { setMasterModalType("customer"); setShowMasterModal(true); }} className="text-xs text-primary font-bold hover:underline">
                      + Add New Customer to Master Forms
                    </button>
                  </div>
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

          {/* Step 3: Company Details */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 3: Company Details</h2>
              </div>

              {linkedCompanyId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-800">Linked Company Profile</h3>
                    <Button variant="outline" size="sm" onClick={() => { setLinkedCompanyId(null); setLinkedCompanyName(""); setMasterSearch(""); }} className="h-7 text-xs text-emerald-700 border-emerald-300 bg-white">
                      Disconnect
                    </Button>
                  </div>
                  <div className="text-sm">
                    <div><b>Name:</b> {linkedCompanyName}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-1"><b>ID:</b> {linkedCompanyId}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="companySearch">Search Existing Company</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="companySearch"
                      value={masterSearch}
                      onChange={(e) => { setMasterSearch(e.target.value); setMasterSearchOpen(true); }}
                      placeholder="Type company name to search..."
                      className="pl-9"
                    />
                  </div>

                  {masterSearchOpen && masterSearch && (
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                      {masterResults.length > 0 ? (
                        masterResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs border-b last:border-0"
                            onClick={() => {
                              setLinkedCompanyId(r.id);
                              setLinkedCompanyName(r.name);
                              setMasterSearchOpen(false);
                              if (!accountName) setAccountName(r.name);
                            }}
                          >
                            {r.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-500 flex items-center justify-between">
                          <span>No company found matching "{masterSearch}"</span>
                          <Button size="sm" type="button" onClick={() => { setMasterModalType("company"); setShowMasterModal(true); }} className="h-7 text-xs">
                            + New Company
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="button" onClick={() => { setMasterModalType("company"); setShowMasterModal(true); }} className="text-xs text-primary font-bold hover:underline">
                      + Add New Company to Master Forms
                    </button>
                  </div>
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

          {/* Step 4: Bank Details */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <Landmark className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 4: Bank Details</h2>
              </div>

              {linkedBankId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-emerald-800">Linked Bank Profile</h3>
                    <Button variant="outline" size="sm" onClick={() => { setLinkedBankId(null); setLinkedBankName(""); setMasterSearch(""); }} className="h-7 text-xs text-emerald-700 border-emerald-300 bg-white">
                      Disconnect
                    </Button>
                  </div>
                  <div className="text-sm">
                    <div><b>Name:</b> {linkedBankName}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-1"><b>ID:</b> {linkedBankId}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="bankSearch">Search Existing Bank</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="bankSearch"
                      value={masterSearch}
                      onChange={(e) => { setMasterSearch(e.target.value); setMasterSearchOpen(true); }}
                      placeholder="Type bank name to search..."
                      className="pl-9"
                    />
                  </div>

                  {masterSearchOpen && masterSearch && (
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                      {masterResults.length > 0 ? (
                        masterResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs border-b last:border-0"
                            onClick={() => {
                              setLinkedBankId(r.id);
                              setLinkedBankName(r.name);
                              setMasterSearchOpen(false);
                              if (!accountName) setAccountName(r.name);
                            }}
                          >
                            {r.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-500 flex items-center justify-between">
                          <span>No bank found matching "{masterSearch}"</span>
                          <Button size="sm" type="button" onClick={() => { setMasterModalType("bank"); setShowMasterModal(true); }} className="h-7 text-xs">
                            + New Bank
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="button" onClick={() => { setMasterModalType("bank"); setShowMasterModal(true); }} className="text-xs text-primary font-bold hover:underline">
                      + Add New Bank to Master Forms
                    </button>
                  </div>
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <Warehouse className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 5: Warehouse Details</h2>
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Step 6: Review & Save</h2>
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
                  {saving ? "Saving..." : "Create & Save Account"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Live Report Sidebar */}
        <aside className="lg:col-span-8 h-fit rounded-lg border bg-card lg:sticky lg:top-24">
          <div className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-semibold">{getLabel("liveReport", lang)}</h2>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={fetchReport}>
                {getLabel("refresh", lang)}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Select and preview accounts setup details live.</p>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Select Entry Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 font-bold uppercase">{getLabel("selectEntry", lang)}</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-white px-3 text-xs shadow-sm focus:outline-none"
                  value={selectedReportAccountId}
                  onChange={(e) => setSelectedReportAccountId(e.target.value)}
                >
                  <option value="current">{getLabel("currentDraftAccount", lang)}</option>
                  {reportRows.slice(0, 15).map((r) => (
                    <option key={r.accountId} value={r.accountId}>
                      {r.accountCode} - {r.accountName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Setup Progress */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{getLabel("setupProgress", lang)}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { id: 1, label: getLabel("step1Label", lang), step: 1 },
                    { id: 2, label: getLabel("step2Label", lang), step: 2, linked: Boolean(linkedCustomerId) },
                    { id: 3, label: getLabel("step3Label", lang), step: 3, linked: Boolean(linkedCompanyId) },
                    { id: 4, label: getLabel("step4Label", lang), step: 4, linked: Boolean(linkedBankId) },
                    { id: 5, label: getLabel("step5Label", lang), step: 5 },
                    { id: 6, label: getLabel("step6Label", lang), step: 6 }
                  ].map((item, index) => {
                    const active = currentStep === item.step;
                    const completed = currentStep > item.step || item.linked;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                        <span className={`font-semibold text-[11px] ${active ? "text-primary" : completed ? "text-emerald-700" : "text-slate-500"}`}>
                          {index + 1}. {item.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                          active
                            ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                            : completed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}>
                          {active ? getLabel("inProgress", lang) : completed ? getLabel("completed", lang) : getLabel("notStarted", lang)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dynamic Summary Preview Card */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs space-y-3 border-t">
              {selectedReportAccountId === "current" ? (
                <>
                  <h4 className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">{getLabel("currentDraftAccount", lang)}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-semibold text-slate-700">
                    <div><b>Account Name:</b> <span className="text-slate-600">{accountName || "-"}</span></div>
                    <div><b>Account Number:</b> <span className="text-slate-600">{accountPreview || "-"}</span></div>
                    <div><b>Branch Code:</b> <span className="text-slate-600">{branchInfo?.code || "-"}</span></div>
                    <div><b>Currency:</b> <span className="text-slate-600">{branchInfo?.currency || "-"}</span></div>
                  </div>
                  {(linkedCustomerId || linkedCompanyId || linkedBankId) && (
                    <div className="flex flex-wrap gap-4 border-t pt-2 mt-2">
                      {linkedCustomerId && <div className="text-emerald-750"><b>Linked Customer:</b> {linkedCustomerName}</div>}
                      {linkedCompanyId && <div className="text-emerald-750"><b>Linked Company:</b> {linkedCompanyName}</div>}
                      {linkedBankId && <div className="text-emerald-750"><b>Linked Bank:</b> {linkedBankName}</div>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h4 className="font-extrabold text-slate-600 uppercase tracking-widest text-[9px]">{getLabel("savedAccountDetails", lang)}</h4>
                  {(() => {
                    const row = reportRows.find((r) => r.accountId === selectedReportAccountId);
                    if (!row) return <div className="text-slate-400">No account found.</div>;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-semibold text-slate-700">
                        <div><b>Account Name:</b> <span className="text-slate-600">{row.accountName}</span></div>
                        <div><b>Account Code:</b> <span className="text-slate-600">{row.accountCode}</span></div>
                        <div><b>Branch Code:</b> <span className="text-slate-600">{row.branchCode}</span></div>
                        <div><b>Currency:</b> <span className="text-slate-600">{row.currency}</span></div>
                        <div><b>Category:</b> <span className="text-slate-600">{row.accountCategory} / {row.subType}</span></div>
                        <div><b>Status:</b> <span className="text-slate-600">{row.status}</span></div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Saved Accounts Entries Table */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{getLabel("accountSetupReport", lang)}</h3>
                <div className="relative w-44">
                  <Search className={cn("absolute top-2 h-3.5 w-3.5 text-slate-400", isRtl ? "right-2" : "left-2")} />
                  <Input
                    placeholder="Search entries..."
                    value={sidebarFilter}
                    onChange={(e) => setSidebarFilter(e.target.value)}
                    className={cn("h-7 text-[10px] bg-white", isRtl ? "pr-7" : "pl-7")}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 uppercase tracking-wider text-[9px]">
                      <th className="px-2.5 py-2 font-bold border-r">Code</th>
                      <th className="px-2.5 py-2 font-bold border-r">Account Name</th>
                      <th className="px-2.5 py-2 font-bold border-r">Type</th>
                      <th className="px-2.5 py-2 font-bold border-r text-center">Currency</th>
                      <th className="px-2.5 py-2 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportLoading ? (
                      <tr><td colSpan={5} className="text-center py-4 text-slate-400">Loading entries...</td></tr>
                    ) : filteredSidebarRows.length > 0 ? (
                      filteredSidebarRows.slice(0, 10).map((r) => (
                        <tr key={r.accountId} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-2.5 py-1.5 border-r font-mono text-[9px] text-blue-600 font-semibold">{r.accountCode}</td>
                          <td className="px-2.5 py-1.5 border-r font-medium text-slate-800 max-w-[150px] truncate">{r.accountName}</td>
                          <td className="px-2.5 py-1.5 border-r text-slate-500">{r.accountCategory}</td>
                          <td className="px-2.5 py-1.5 border-r font-mono text-center font-bold text-slate-655">{r.currency}</td>
                          <td className="px-2.5 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/accounts/view?accountId=${r.accountId}`)}
                              className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              {getLabel("view", lang)}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="text-center py-4 text-slate-400">No entries found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Master Record Overlay Modal ────────────────────────────────────── */}
      {showMasterModal && masterModalType && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto bg-white min-h-screen shadow-xl border-x">
            <div className="flex items-center justify-between border-b bg-white px-8 py-5 sticky top-0 z-10 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Master Forms</p>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {masterModalType === "customer" ? "New Customer — Customer Master" : masterModalType === "bank" ? "New Bank — Bank Master" : "New Company — Company Master"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterModal(false)}
                className="rounded-full p-2 bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8">
              {masterModalType === "customer" ? (
                <CustomerForm
                  lang={lang}
                  mode="embedded"
                  onSave={(customerId) => {
                    setLinkedCustomerId(customerId);
                    fetch(`/api/erp/customers/${customerId}`)
                      .then((r) => r.json())
                      .then((json) => {
                        const name = json.customer?.customer_name ?? json.customer_name ?? "New Customer";
                        setLinkedCustomerName(name);
                        if (!accountName) setAccountName(name);
                      })
                      .catch(() => setLinkedCustomerName("New Customer"));
                    setShowMasterModal(false);
                  }}
                />
              ) : (
                <CompanyIncorporationForm
                  mode="embedded"
                  onSave={(data) => {
                    const companyId = (data as any).id ?? "";
                    if (masterModalType === "bank") {
                      setLinkedBankId(companyId);
                      setLinkedBankName(data.companyName ?? "New Bank");
                    } else {
                      setLinkedCompanyId(companyId);
                      setLinkedCompanyName(data.companyName ?? "New Company");
                    }
                    if (!accountName) setAccountName(data.companyName ?? "");
                    setShowMasterModal(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
