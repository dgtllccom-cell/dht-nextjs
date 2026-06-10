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
  UserRound
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

function StatusBadge({ ready, saved }: { ready: boolean; saved: boolean }) {
  if (saved) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Entry saved
      </span>
    );
  }
  return (
    <span
      className={
        ready
          ? "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
          : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
      }
    >
      {ready ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertCircle className="h-4 w-4" aria-hidden />}
      {ready ? "Ready to save" : "Draft entry"}
    </span>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  const blank = !value || value === "-";
  return (
    <div className="grid grid-cols-[132px_1fr] gap-3 text-sm">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={blank ? "font-semibold text-slate-400" : "font-semibold text-slate-950"}>
        {value || "-"}
      </span>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-300"} aria-hidden />
      <span className={done ? "font-medium text-slate-900" : "text-slate-500"}>{label}</span>
    </div>
  );
}

function selectedBranchName(rows: CountryBranchRow[], id: string) {
  const row = rows.find((item) => item.id === id);
  return row ? `${row.name} (${row.code})` : "-";
}

function selectedCityBranchName(rows: CityBranchRow[], id: string) {
  const row = rows.find((item) => item.id === id);
  return row ? `${row.city_name} - ${row.name} (${row.code})` : "-";
}

export function NewAccountSetup() {
  const router = useRouter();

  // Branch / Account form state
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
  const [accountCounters, setAccountCounters] = useState<Record<string, number>>({});
  const [lastBranchCode, setLastBranchCode] = useState("");
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<AccountCreateResponse | null>(null);

  // Report state
  const [reportRows, setReportRows] = useState<AccountGeneralReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Filter state
  const [filterAccountNo, setFilterAccountNo] = useState("");
  const [filterAccountName, setFilterAccountName] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterAccountType, setFilterAccountType] = useState("all");
  const [filterSubType, setFilterSubType] = useState("all");
  const [appliedAccountNo, setAppliedAccountNo] = useState("");
  const [appliedAccountName, setAppliedAccountName] = useState("");
  const [appliedCountry, setAppliedCountry] = useState("all");
  const [appliedBranch, setAppliedBranch] = useState("all");
  const [appliedAccountType, setAppliedAccountType] = useState("all");
  const [appliedSubType, setAppliedSubType] = useState("all");

  // Global search
  const [globalSearch, setGlobalSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ── Master Record Linking ────────────────────────────────────────────────
  const [linkedMasterId, setLinkedMasterId] = useState<string | null>(null);
  const [linkedMasterName, setLinkedMasterName] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [masterResults, setMasterResults] = useState<{ id: string; name: string }[]>([]);
  const [masterSearchOpen, setMasterSearchOpen] = useState(false);
  const [masterSearchLoading, setMasterSearchLoading] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterModalType, setMasterModalType] = useState<"customer" | "company" | "bank" | null>(null);

  // Wizard steps (step 1 = main form, 2 = customer, 3 = company)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  // ── Fetch report ─────────────────────────────────────────────────────────
  async function fetchReport() {
    setReportLoading(true);
    try {
      const res = await fetch("/api/erp/accounting/reports/accounts/general?limit=500").then((r) => r.json());
      if (res && Array.isArray(res.rows)) setReportRows(res.rows);
    } catch (err) {
      console.error("Failed to load account report:", err);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => { fetchReport(); }, []);

  // ── Master record live search ─────────────────────────────────────────────
  useEffect(() => {
    if (!accountTitle || accountTitle === "Employee") {
      setLinkedMasterId(null);
      setLinkedMasterName("");
      setMasterSearch("");
      setMasterResults([]);
      return;
    }
    const query = masterSearch.trim();
    if (!query) { setMasterResults([]); return; }

    const endpoint =
      accountTitle === "Customer"
        ? `/api/erp/customers?limit=20&search=${encodeURIComponent(query)}`
        : `/api/erp/companies?limit=20&search=${encodeURIComponent(query)}`;

    let cancelled = false;
    setMasterSearchLoading(true);
    fetch(endpoint)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const rows: { id: string; name: string }[] =
          accountTitle === "Customer"
            ? (json.customers ?? []).map((c: any) => ({ id: c.id, name: c.customer_name }))
            : (json.companies ?? []).map((c: any) => ({ id: c.id, name: c.company_name ?? c.companyName }));
        setMasterResults(rows);
      })
      .catch(() => { if (!cancelled) setMasterResults([]); })
      .finally(() => { if (!cancelled) setMasterSearchLoading(false); });

    return () => { cancelled = true; };
  }, [masterSearch, accountTitle]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.countryName) set.add(r.countryName); }
    return Array.from(set);
  }, [reportRows]);

  const uniqueBranches = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reportRows) { if (r.branchCode && r.branchName) map.set(r.branchCode, r.branchName); }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [reportRows]);

  const uniqueAccountTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.accountCategory) set.add(`${r.accountCategory} Account`); }
    return Array.from(set);
  }, [reportRows]);

  const uniqueSubTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportRows) { if (r.subType) set.add(r.subType); }
    return Array.from(set);
  }, [reportRows]);

  const summaryStats = useMemo(() => ({
    total: reportRows.length,
    customers: reportRows.filter((r) => (r.accountCategory ?? "").toLowerCase().includes("customer")).length,
    companies: reportRows.filter((r) =>
      (r.accountCategory ?? "").toLowerCase().includes("company") ||
      (r.subType ?? "").toLowerCase().includes("company")
    ).length,
    banks: reportRows.filter((r) => (r.accountCategory ?? "").toLowerCase().includes("bank")).length,
  }), [reportRows]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    return reportRows.filter(
      (r) =>
        (r.accountName ?? "").toLowerCase().includes(q) ||
        (r.accountCode ?? "").toLowerCase().includes(q) ||
        (r.journalCode ?? "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [globalSearch, reportRows]);

  const filteredReportRows = useMemo(() => {
    return reportRows.filter((row) => {
      if (appliedAccountNo) {
        const q = appliedAccountNo.toLowerCase();
        if (!(row.accountCode ?? "").toLowerCase().includes(q) && !(row.journalCode ?? "").toLowerCase().includes(q)) return false;
      }
      if (appliedAccountName && !(row.accountName ?? "").toLowerCase().includes(appliedAccountName.toLowerCase())) return false;
      if (appliedCountry !== "all" && row.countryName !== appliedCountry) return false;
      if (appliedBranch !== "all" && row.branchCode !== appliedBranch) return false;
      if (appliedAccountType !== "all" && `${row.accountCategory} Account` !== appliedAccountType) return false;
      if (appliedSubType !== "all" && row.subType !== appliedSubType) return false;
      return true;
    });
  }, [reportRows, appliedAccountNo, appliedAccountName, appliedCountry, appliedBranch, appliedAccountType, appliedSubType]);

  function handleApplyFilters() {
    setAppliedAccountNo(filterAccountNo);
    setAppliedAccountName(filterAccountName);
    setAppliedCountry(filterCountry);
    setAppliedBranch(filterBranch);
    setAppliedAccountType(filterAccountType);
    setAppliedSubType(filterSubType);
  }

  function handleResetFilters() {
    setFilterAccountNo(""); setFilterAccountName(""); setFilterCountry("all");
    setFilterBranch("all"); setFilterAccountType("all"); setFilterSubType("all");
    setAppliedAccountNo(""); setAppliedAccountName(""); setAppliedCountry("all");
    setAppliedBranch("all"); setAppliedAccountType("all"); setAppliedSubType("all");
  }

  const selectedCountry = useMemo(() => countries.find((item) => item.id === country) ?? null, [countries, country]);
  const branchOptions = branchType === "Main" ? mainBranches : branchType === "City" ? cityBranches : [];

  const branchInfo = useMemo<BranchInfo | null>(() => {
    if (!selectedCountry || !branchType || !branch) return null;
    if (branchType === "Main") {
      const row = mainBranches.find((item) => item.id === branch);
      if (!row) return null;
      return { company: `Damaan ${selectedCountry.name}`, code: row.code, city: selectedCountry.name, address: "-", phone: "-", email: "-", manager: "-", opening: "-", currency: row.local_currency || selectedCountry.currency_code || "-" };
    }
    const row = cityBranches.find((item) => item.id === branch);
    if (!row) return null;
    return { company: `Damaan ${selectedCountry.name}`, code: row.code, city: row.city_name, address: "-", phone: "-", email: "-", manager: "-", opening: "-", currency: row.local_currency || selectedCountry.currency_code || "-" };
  }, [branch, branchType, cityBranches, mainBranches, selectedCountry]);

  const journalPreview = `SUPER-${nextNumber(journalCounter)}`;
  const branchCode = branchInfo?.code ?? "";
  const accountPreview = lastCreated?.accountNumber || accountCode || (branchCode ? "AUTO" : "");
  const readyToSave = Boolean(country && branchType && branch && accountTitle && subType && category && accountName);
  const saved = message.startsWith("Saved");

  useEffect(() => {
    if (!branchCode || branchCode === lastBranchCode) return;
    setLastBranchCode(branchCode);
    setAccountCode("");
  }, [accountCode, accountCounters, branchCode, lastBranchCode]);

  useEffect(() => {
    let cancelled = false;
    listCountries()
      .then((rows) => { if (!cancelled) setCountries(rows); })
      .catch(() => { if (!cancelled) setMessage("Could not load countries from database."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!country) { setMainBranches([]); return; }
    let cancelled = false;
    fetch(`/api/branch-management/country-branches?countryId=${encodeURIComponent(country)}`)
      .then((res) => res.json())
      .then((json: { countryBranches?: CountryBranchRow[] }) => {
        if (!cancelled) setMainBranches(Array.isArray(json.countryBranches) ? json.countryBranches : []);
      })
      .catch(() => { if (!cancelled) setMessage("Could not load main branches from database."); });
    return () => { cancelled = true; };
  }, [country]);

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
      .catch(() => { if (!cancelled) setMessage("Could not load city branches from database."); });
    return () => { cancelled = true; };
  }, [branchType, country, mainBranches]);

  function handleCountryChange(value: string) {
    setCountry(value); setBranchType(""); setBranch(""); setLastBranchCode(""); setAccountCode(""); setLastCreated(null); setMessage("");
  }

  function handleBranchTypeChange(value: BranchType) {
    setBranchType(value); setBranch(""); setLastBranchCode(""); setAccountCode(""); setLastCreated(null); setMessage("");
  }

  async function saveEntry() {
    if (!readyToSave || !branchInfo || !accountTitle || !branchType) {
      setMessage("Complete branch and account fields first.");
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
      setMessage(`Saved account ${response.accountNumber}. Ledger linked automatically.`);
      void fetchReport();
      router.push(`/dashboard/accounts?accountId=${response.accountId}&created=1`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Template</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">New Account</h1>
          <p className="text-sm text-muted-foreground">
            Branch select karein, account details enter karein, report live update hogi.
          </p>
        </div>
        <StatusBadge ready={readyToSave} saved={saved} />
      </div>

      {/* ── Step 1: Form + Sidebar ───────────────────────────────────────── */}
      {currentStep === 1 && (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-semibold">Step 1 - Branch Selection</h2>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {/* Branch fields */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select id="country" value={country} onChange={(event) => handleCountryChange(event.target.value)} className={selectClass()}>
                      <option value="">Select Country</option>
                      {countries.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.iso2 ?? "-"})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchType">Branch Type</Label>
                    <select id="branchType" value={branchType} onChange={(event) => handleBranchTypeChange(event.target.value as BranchType)} disabled={!country} className={selectClass()}>
                      <option value="">Select Branch Type</option>
                      <option value="Main">Main Branch</option>
                      <option value="City">City Branch</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">Select Branch</Label>
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
                </div>

                {/* Account Entry */}
                <div className="border-t pt-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" aria-hidden />
                    <h2 className="font-semibold">Step 2 - Account Entry</h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="accountTitle">Account Title</Label>
                      <select id="accountTitle" value={accountTitle} onChange={(event) => { setAccountTitle(event.target.value as AccountTitle); setSubType(""); setMessage(""); setLinkedMasterId(null); setLinkedMasterName(""); setMasterSearch(""); }} className={selectClass()}>
                        <option value="">Select Account Title</option>
                        <option value="Customer">Customer</option>
                        <option value="Company">Company</option>
                        <option value="Bank">Bank</option>
                        <option value="Employee">Employee</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subType">Sub Type</Label>
                      <select id="subType" value={subType} onChange={(event) => { setSubType(event.target.value); setMessage(""); }} disabled={!accountTitle} className={selectClass()}>
                        <option value="">Select Sub Type</option>
                        {accountTitle ? subTypes[accountTitle].map((item) => (<option key={item} value={item}>{item}</option>)) : null}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select id="category" value={category} onChange={(event) => { setCategory(event.target.value); setMessage(""); }} className={selectClass()}>
                        <option value="">Select Category</option>
                        {categories.map((item) => (<option key={item} value={item}>{item}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="accountCode">Account Code (Auto)</Label>
                      <Input id="accountCode" value={accountCode} readOnly aria-readonly="true" placeholder="Generated on save" />
                      <p className="text-xs leading-5 text-muted-foreground">
                        Account code branch/country sequence se auto issue hota hai. User manual code enter nahi karega.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input id="accountName" value={accountName} onChange={(event) => { setAccountName(event.target.value); setMessage(""); }} placeholder="e.g. Sales Account" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="manualReferenceNumber">Manual Reference Number</Label>
                      <Input id="manualReferenceNumber" value={manualReferenceNumber} onChange={(event) => { setManualReferenceNumber(event.target.value.toUpperCase()); setMessage(""); }} placeholder="e.g. CUST-001" />
                      <p className="text-xs leading-5 text-muted-foreground">
                        Optional. Search anywhere by account number or this manual reference.
                      </p>
                    </div>
                  </div>

                  {/* ── Link to Master Record ────────────────────────────── */}
                  {(accountTitle === "Customer" || accountTitle === "Company" || accountTitle === "Bank") && (
                    <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <UserRound className="h-4 w-4 text-primary" aria-hidden />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Link to {accountTitle} Record
                        </h3>
                        {linkedMasterId && (
                          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Linked
                          </span>
                        )}
                      </div>

                      {linkedMasterId ? (
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{linkedMasterName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{linkedMasterId}</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => { setLinkedMasterId(null); setLinkedMasterName(""); setMasterSearch(""); }} className="h-7 text-xs text-slate-600 border-slate-200 px-2.5 shrink-0">
                            Change
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                              id="masterSearch"
                              value={masterSearch}
                              onChange={(e) => { setMasterSearch(e.target.value); setMasterSearchOpen(true); }}
                              onFocus={() => setMasterSearchOpen(true)}
                              onBlur={() => setTimeout(() => setMasterSearchOpen(false), 200)}
                              placeholder={`Search existing ${accountTitle.toLowerCase()} by name...`}
                              className="pl-8 bg-white"
                            />
                            {masterSearchLoading && (
                              <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 animate-pulse">Searching...</span>
                            )}
                          </div>

                          {masterSearchOpen && masterSearch && (
                            <div className="rounded-lg border bg-white shadow-lg overflow-hidden">
                              {masterResults.length > 0 ? (
                                <>
                                  {masterResults.map((r) => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center gap-2"
                                      onClick={() => {
                                        setLinkedMasterId(r.id);
                                        setLinkedMasterName(r.name);
                                        setMasterSearchOpen(false);
                                        if (!accountName) setAccountName(r.name);
                                      }}
                                    >
                                      <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-900 truncate">{r.name}</span>
                                    </button>
                                  ))}
                                  <div className="border-t px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => { setMasterModalType(accountTitle === "Customer" ? "customer" : accountTitle === "Bank" ? "bank" : "company"); setShowMasterModal(true); }}
                                      className="w-full flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 py-1"
                                    >
                                      <span className="text-base leading-none">+</span>
                                      New {accountTitle} — Add to Master
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="p-4 space-y-3">
                                  <p className="text-xs text-slate-500">
                                    No {accountTitle.toLowerCase()} found matching <b>&ldquo;{masterSearch}&rdquo;</b>.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => { setMasterModalType(accountTitle === "Customer" ? "customer" : accountTitle === "Bank" ? "bank" : "company"); setShowMasterModal(true); }}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                                  >
                                    <span className="text-sm leading-none">+</span>
                                    New {accountTitle} — Open Master Form
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {!masterSearch && (
                            <button
                              type="button"
                              onClick={() => { setMasterModalType(accountTitle === "Customer" ? "customer" : accountTitle === "Bank" ? "bank" : "company"); setShowMasterModal(true); }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <span className="text-sm">+</span> Add New {accountTitle} to Master Forms
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Save account to Account Master. Ledger aur identity numbers automatically link ho jayenge.
                    </p>
                    <Button type="button" onClick={saveEntry} disabled={!readyToSave || saving} className="rounded-lg">
                      <Save className="h-4 w-4" aria-hidden />
                      {saving ? "Saving..." : "Save Entry"}
                    </Button>
                  </div>

                  {message ? (
                    <div className={saved
                      ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                      : "mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
                    }>
                      {message}
                    </div>
                  ) : null}

                  {lastCreated ? (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 font-extrabold">
                            <CheckCircle2 className="h-5 w-5" aria-hidden />
                            Account Created Successfully
                          </div>
                          <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                            <span><b>Account:</b> {lastCreated.accountNumber}</span>
                            <span><b>Manual Ref:</b> {lastCreated.manualReferenceNumber || "-"}</span>
                            <span><b>Customer:</b> {lastCreated.customerNumber}</span>
                            <span><b>Country Serial:</b> {lastCreated.countrySerialNumber}</span>
                            <span><b>Branch Serial:</b> {lastCreated.branchSerialNumber}</span>
                            <span><b>Ledger:</b> {lastCreated.ledgerId}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/accounts/view?accountId=${lastCreated.accountId}`}>
                              <Eye className="h-4 w-4" aria-hidden /> View
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/accounts/setup?accountId=${lastCreated.accountId}`}>
                              <Save className="h-4 w-4" aria-hidden /> Edit
                            </Link>
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
                            <FileText className="h-4 w-4" aria-hidden /> PDF
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/ledger/new?account=${encodeURIComponent(lastCreated.accountNumber)}`}>
                              <BookOpen className="h-4 w-4" aria-hidden /> Ledger
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/dashboard/roznamcha/cash-entry">
                              <ReceiptText className="h-4 w-4" aria-hidden /> Daily Payment
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Live Report Sidebar */}
            <aside className="h-fit rounded-lg border bg-card xl:sticky xl:top-24">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-semibold">New Account Report</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Yahan har selected field live show hoti hai.</p>
              </div>
              <div className="space-y-5 p-5">
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Full Branch Header</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">
                    {branchInfo
                      ? `${branchInfo.company} - ${branchInfo.code} - ${selectedCountry?.name ?? "-"} - ${branchInfo.city} - ${branchType} - ${branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch)}`
                      : "- - - - - -"}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden /> Branch Details
                  </h3>
                  <ReportRow label="Company" value={branchInfo?.company ?? "-"} />
                  <ReportRow label="Branch Code" value={branchInfo?.code ?? "-"} />
                  <ReportRow label="Country" value={selectedCountry?.name ?? "-"} />
                  <ReportRow label="City" value={branchInfo?.city ?? "-"} />
                  <ReportRow label="Branch Type" value={branchType || "-"} />
                  <ReportRow label="Branch Name" value={branchType === "Main" ? selectedBranchName(mainBranches, branch) : selectedCityBranchName(cityBranches, branch)} />
                  <ReportRow label="Currency" value={branchInfo?.currency ?? "-"} />
                </div>
                <div className="space-y-2 border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Landmark className="h-4 w-4 text-primary" aria-hidden /> Account Details
                  </h3>
                  <ReportRow label="Account Title" value={accountTitle || "-"} />
                  <ReportRow label="Sub Type" value={subType || "-"} />
                  <ReportRow label="Category" value={category || "-"} />
                  <ReportRow label="Account Number" value={accountPreview || "-"} />
                  <ReportRow label="Manual Reference" value={manualReferenceNumber || lastCreated?.manualReferenceNumber || "-"} />
                  <ReportRow label="Customer Number" value={lastCreated?.customerNumber ?? "-"} />
                  <ReportRow label="Country Serial" value={lastCreated?.countrySerialNumber ?? "-"} />
                  <ReportRow label="Branch Serial" value={lastCreated?.branchSerialNumber ?? "-"} />
                  <ReportRow label="Account Name" value={accountName || "-"} />
                  <ReportRow label="Journal Preview" value={journalPreview} />
                  {linkedMasterId && <ReportRow label="Linked Master" value={linkedMasterName} />}
                </div>
                <div className="space-y-2 border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Hash className="h-4 w-4 text-primary" aria-hidden /> Entry Check
                  </h3>
                  <ChecklistItem done={Boolean(country)} label="Country selected" />
                  <ChecklistItem done={Boolean(branchType)} label="Branch type selected" />
                  <ChecklistItem done={Boolean(branch)} label="Branch selected" />
                  <ChecklistItem done={Boolean(accountTitle)} label="Account title selected" />
                  <ChecklistItem done={Boolean(subType)} label="Sub type selected" />
                  <ChecklistItem done={Boolean(category)} label="Category selected" />
                  <ChecklistItem done={Boolean(accountPreview)} label="Account code ready" />
                  <ChecklistItem done={Boolean(accountName)} label="Account name entered" />
                </div>
                <div className="space-y-3 border-t pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <UserRound className="h-4 w-4 text-primary" aria-hidden /> Saved Account Entries
                  </h3>
                  {savedEntries.length ? (
                    <div className="space-y-2">
                      {savedEntries.slice(0, 4).map((entry) => (
                        <div key={entry.id} className="rounded-lg border bg-white p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-950">{entry.accountName}</span>
                            <span className="text-slate-500">{entry.savedAt}</span>
                          </div>
                          <p className="mt-1 text-slate-600">{entry.accountCode} - {entry.journalCode}</p>
                          <p className="mt-1 text-slate-500">{entry.branchName} ({entry.branchCode})</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed bg-white p-3 text-sm text-slate-500">
                      No entry has been saved yet. Saved account entries will show here.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}


      {/* ── Step 2: Customer Form ─────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Step 2 - Owner Details</h2>
            <Button variant="outline" onClick={() => setCurrentStep(1)}>Back to Step 1</Button>
          </div>
          <div className="p-1 rounded-xl border bg-slate-50/50">
            <CustomerForm
              lang="en"
              mode="embedded"
              onSave={(customerId) => {
                setCreatedCustomerId(customerId);
                setCurrentStep(3);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Step 3: Company Form ──────────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Step 3 - Company Details</h2>
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Step 2</Button>
          </div>
          <div className="p-1 rounded-xl border bg-slate-50/50">
            <CompanyIncorporationForm
              mode="embedded"
              onSave={() => { router.push("/dashboard/accounts"); }}
            />
          </div>
        </div>
      )}

      {/* ── Master Record Modal ───────────────────────────────────────────── */}
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
                  lang="en"
                  mode="embedded"
                  onSave={(customerId) => {
                    setLinkedMasterId(customerId);
                    fetch(`/api/erp/customers/${customerId}`)
                      .then((r) => r.json())
                      .then((json) => {
                        const name = json.customer?.customer_name ?? json.customer_name ?? "New Customer";
                        setLinkedMasterName(name);
                        if (!accountName) setAccountName(name);
                      })
                      .catch(() => setLinkedMasterName("New Customer"));
                    setShowMasterModal(false);
                  }}
                />
              ) : (
                <CompanyIncorporationForm
                  mode="embedded"
                  onSave={(data) => {
                    const companyId = (data as any).id ?? "";
                    setLinkedMasterId(companyId);
                    setLinkedMasterName(data.companyName ?? (masterModalType === "bank" ? "New Bank" : "New Company"));
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
