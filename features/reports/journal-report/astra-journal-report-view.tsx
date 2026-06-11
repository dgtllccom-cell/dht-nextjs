"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashEntryForm } from "@/features/roznamcha/components/cash-entry-form";
import { cn } from "@/lib/utils";
import type { RoznamchaType } from "@/lib/accounting/roznamcha-flow";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import { Mail } from "lucide-react";

type JournalScope = "country" | "city" | "construction";

type ApiRow = {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  accountCode: string | null;
  accountName: string | null;
  accountKind: string | null;
  scope: string;
  ledgerCurrency: string | null;
  countryName: string | null;
  countryBranchName: string | null;
  cityBranchName: string | null;
  companyName: string | null;
  status: "active" | "inactive";
  entries: number;
  debit: number;
  credit: number;
  balance: number;
  lastEntryDate: string | null;
  lastReferenceNo: string | null;
  lastDescription: string | null;
};

type ApiResponse = {
  generatedAt?: string;
  summary?: {
    entries: number;
    debit: number;
    credit: number;
    balance: number;
    activeLedgers?: number;
    totalLedgers?: number;
  };
  rows?: ApiRow[];
};

type JournalRow = {
  id: string;
  voucherNo: string;
  accountNumber: string;
  accountName: string;
  date: string;
  endDate: string;
  country: string;
  city: string;
  branch: string;
  branchCode: string;
  project: string;
  site: string;
  contractor: string;
  voucherType: string;
  txType: string;
  account: string;
  narration: string;
  currency: string;
  debit: number;
  credit: number;
  balance: number;
  trend: string;
  status: string;
  entries?: number;
  companyName?: string;
};

const sampleRows: JournalRow[] = [
  {
    id: "sample-1",
    voucherNo: "JV-0001",
    accountNumber: "AC-0001",
    accountName: "Construction Material",
    date: "2026-06-01",
    endDate: "2026-06-01",
    country: "Pakistan",
    city: "Quetta",
    branch: "Quetta Main Branch",
    branchCode: "QTA-MAIN",
    project: "Warehouse Expansion",
    site: "Site A",
    contractor: "Damaan Contractors",
    voucherType: "Material Journal",
    txType: "Debit",
    account: "Construction Material",
    narration: "Steel and cement material posting",
    currency: "PKR",
    debit: 250000,
    credit: 0,
    balance: 250000,
    trend: "Increase",
    status: "Active",
    entries: 10
  },
  {
    id: "sample-2",
    voucherNo: "JV-0002",
    accountNumber: "AC-0002",
    accountName: "Labour Cost",
    date: "2026-06-02",
    endDate: "2026-06-02",
    country: "Pakistan",
    city: "Chaman",
    branch: "Chaman City Branch",
    branchCode: "CH-CITY",
    project: "Cold Storage",
    site: "Site B",
    contractor: "Asmat Builders",
    voucherType: "Labour Journal",
    txType: "Debit",
    account: "Labour Cost",
    narration: "Weekly labour payment",
    currency: "PKR",
    debit: 85000,
    credit: 20000,
    balance: 65000,
    trend: "Increase",
    status: "Active",
    entries: 5
  }
];

function fmt(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB");
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function csvEscape(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function exportCsv(rows: JournalRow[], scope: JournalScope) {
  const headers = ["Serial No", "Account Number", "Account Name", "Branch Name", "Entries Today", "Total Debit", "Total Credit"];
  const body = rows.map((row, index) =>
    [
      index + 1,
      row.accountNumber,
      row.accountName,
      row.branch,
      row.entries ?? 0,
      fmt(row.debit),
      fmt(row.credit)
    ].map((cell) => csvEscape(String(cell))).join(",")
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${scope}-journal-report.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function mapApiRows(rows: ApiRow[], scope: JournalScope): JournalRow[] {
  return rows.map((row, index) => {
    const city = row.cityBranchName?.replace(/\s+City\s+Branch$/i, "") || row.countryBranchName?.replace(/\s+Main\s+Branch$/i, "") || "-";
    const debit = Number(row.debit || 0);
    const credit = Number(row.credit || 0);
    const balance = Number(row.balance || 0);
    const accountName = row.accountName || row.ledgerName || "-";
    const txType = debit >= credit ? "Debit" : "Credit";
    return {
      id: row.ledgerId,
      voucherNo: row.lastReferenceNo || `JV-${String(index + 1).padStart(4, "0")}`,
      accountNumber: row.accountCode || row.ledgerCode || "-",
      accountName,
      date: row.lastEntryDate || new Date().toISOString().slice(0, 10),
      endDate: row.lastEntryDate || new Date().toISOString().slice(0, 10),
      country: row.countryName || "-",
      city,
      branch: row.cityBranchName || row.countryBranchName || "-",
      branchCode: "-",
      project: scope === "construction" ? row.companyName || "General Project" : "-",
      site: scope === "construction" ? row.cityBranchName || row.countryBranchName || "Main Site" : "-",
      contractor: scope === "construction" ? row.accountName || row.ledgerName || "-" : "-",
      voucherType: scope === "construction" ? "Cost Center Journal" : row.scope || "Journal Voucher",
      txType,
      account: accountName,
      narration: row.lastDescription || row.ledgerName || "-",
      currency: row.ledgerCurrency || "-",
      debit,
      credit,
      balance,
      trend: balance >= 0 ? "Increase" : "Decrease",
      status: row.status === "active" ? "Active" : "Inactive",
      entries: row.entries || 0,
      companyName: row.companyName || "-"
    };
  });
}

function titleFor(scope: JournalScope) {
  if (scope === "country") return "Country Journal Report";
  if (scope === "city") return "City Journal Report";
  return "Construction Journal Report";
}

function paymentConfigFor(scope: JournalScope): { postingType: RoznamchaType; scopeMode: "super_admin" | "country" | "branch" } {
  if (scope === "country") return { postingType: "country", scopeMode: "country" };
  if (scope === "city") return { postingType: "branch", scopeMode: "branch" };
  return { postingType: "super_admin", scopeMode: "super_admin" };
}

export function AstraJournalReportView({ lang, scope }: { lang: SupportedLanguage; scope: JournalScope }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [branch, setBranch] = useState("");
  const [project, setProject] = useState("");
  const [site, setSite] = useState("");
  const [contractor, setContractor] = useState("");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [sortKey, setSortKey] = useState<keyof JournalRow>("accountName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  async function loadReport(fDate = fromDate, tDate = toDate, query = search) {
    setLoading(true);
    setMessage("");
    try {
      const reportScope = scope === "city" ? "branch" : scope === "country" ? "country" : "super_admin";
      const qp = new URLSearchParams({ 
        reportScope, 
        limit: "250",
        fromDate: fDate,
        toDate: tDate
      });
      if (query.trim()) {
        qp.set("q", query.trim());
      }
      const response = await fetch(`/api/erp/accounting/reports/ledger/general?${qp.toString()}`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) throw new Error("Journal report API could not be loaded.");
      const mapped = mapApiRows(body.rows ?? [], scope);
      setRows(mapped.length ? mapped : sampleRows);
      setGeneratedAt(body.generatedAt || new Date().toISOString());
      if (!mapped.length) setMessage("No live journal vouchers found. Showing preview rows until entries are posted.");
    } catch (error) {
      setRows(sampleRows);
      setGeneratedAt(new Date().toISOString());
      setMessage(error instanceof Error ? error.message : "Journal report API unavailable. Showing preview rows.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport(fromDate, toDate, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, fromDate, toDate]);

  const options = useMemo(() => ({
    countries: Array.from(new Set(rows.map((row) => row.country).filter(Boolean))),
    cities: Array.from(new Set(rows.map((row) => row.city).filter(Boolean))),
    branches: Array.from(new Set(rows.map((row) => row.branch).filter(Boolean))),
    projects: Array.from(new Set(rows.map((row) => row.project).filter((value) => value && value !== "-"))),
    sites: Array.from(new Set(rows.map((row) => row.site).filter((value) => value && value !== "-"))),
    contractors: Array.from(new Set(rows.map((row) => row.contractor).filter((value) => value && value !== "-")))
  }), [rows]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const list = rows.filter((row) => {
      if (draftStatus && normalize(row.status) !== normalize(draftStatus)) return false;
      if (country && row.country !== country) return false;
      if (city && row.city !== city) return false;
      if (branch && row.branch !== branch) return false;
      if (project && row.project !== project) return false;
      if (site && row.site !== site) return false;
      if (contractor && row.contractor !== contractor) return false;
      if (!q) return true;
      return Object.values(row).some((value) => normalize(value).includes(q));
    });
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const result = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? result : -result;
    });
  }, [branch, city, contractor, country, draftStatus, project, rows, search, site, sortDir, sortKey]);

  const summary = useMemo(() => ({
    vouchers: filtered.length,
    debit: filtered.reduce((sum, row) => sum + row.debit, 0),
    credit: filtered.reduce((sum, row) => sum + row.credit, 0),
    balance: filtered.reduce((sum, row) => sum + row.balance, 0),
    active: filtered.filter((row) => row.status === "Active").length,
    accounts: new Set(filtered.map((row) => row.accountNumber).filter(Boolean)).size,
    creditAccounts: filtered.filter((row) => row.credit > 0).length,
    debitAccounts: filtered.filter((row) => row.debit > 0).length
  }), [filtered]);

  const paymentConfig = paymentConfigFor(scope);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function reset() {
    setSearch("");
    setDraftStatus("");
    setCountry("");
    setCity("");
    setBranch("");
    setProject("");
    setSite("");
    setContractor("");
    setFromDate(todayStr);
    setToDate(todayStr);
    setPage(1);
  }

  function sort(column: keyof JournalRow) {
    if (sortKey === column) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir("asc");
    }
  }

  function openPrint(autoPrint: boolean) {
    openA4ReportWindow({
      title: titleFor(scope),
      subtitle: `Generated: ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}`,
      rows: [
        { label: "Report Type", value: titleFor(scope) },
        { label: "Date Range", value: `${fromDate} to ${toDate}` },
        { label: "Total Accounts in Branch", value: String(summary.accounts) },
        { label: "Active Accounts", value: String(summary.active) },
        { label: "Credit Accounts", value: String(summary.creditAccounts) },
        { label: "Debit Accounts", value: String(summary.debitAccounts) },
        { label: "Total Credit", value: fmt(summary.credit) },
        { label: "Total Debit", value: fmt(summary.debit) },
        { label: "Final Balance", value: fmt(summary.balance) }
      ],
      autoPrint
    });
  }

  function emailReport() {
    const subject = encodeURIComponent(`${titleFor(scope)} - Summary`);
    const body = encodeURIComponent(`Please find the summary of the ${titleFor(scope)}:\n\nDate Range: ${fromDate} to ${toDate}\nTotal Accounts: ${summary.accounts}\nActive Accounts: ${summary.active}\nTotal Credit: ${fmt(summary.credit)}\nTotal Debit: ${fmt(summary.debit)}\nFinal Balance: ${fmt(summary.balance)}\n\nBest regards,\nERP Management System`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-3 px-3 py-3 md:px-5">
      <section className="overflow-hidden rounded-lg border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
        <div className="border-b border-blue-700 bg-blue-600 px-4 py-3 text-white dark:bg-blue-950">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-white/10 text-white shadow-inner">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">{titleFor(scope)}</h1>
                <p className="mt-0.5 text-[11px] font-medium text-blue-100/90">
                  Generated: {generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row xl:max-w-5xl xl:items-center xl:justify-end">
              <select 
                value={draftStatus} 
                onChange={(event) => setDraftStatus(event.target.value)} 
                className="h-9 min-w-[145px] rounded-md border border-white/20 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition-all dark:bg-slate-950 dark:text-white"
                aria-label="Voucher Status"
              >
                <option value="">Draft Dropdown</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <div className="relative min-w-[260px] flex-1 xl:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  value={search} 
                  onChange={(event) => setSearch(event.target.value)} 
                  placeholder="Search voucher, account, branch, narration..." 
                  className="h-9 w-full rounded-md border border-white/20 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-all dark:bg-slate-950 dark:text-white" 
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEntryOpen(true)}
                  className="h-9 rounded-md border border-white/20 bg-white px-3 text-slate-900 hover:bg-white/90"
                >
                  New
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setFiltersOpen((open) => !open)} 
                  className={cn("h-9 rounded-md border border-white/20 bg-white/10 px-3 text-white hover:bg-white/20", filtersOpen && "bg-white text-slate-900 hover:bg-white/90")}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={reset} 
                  className="h-9 rounded-md border border-white/20 bg-white/10 px-3 text-white hover:bg-white/20"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <ReportActions rows={filtered} scope={scope} />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Filters Panel */}
        {filtersOpen ? (
          <div className="grid gap-2 border-t border-border bg-card p-3 md:grid-cols-3 xl:grid-cols-6">
            <Select label="Country" value={country} options={options.countries} onChange={setCountry} />
            {scope !== "country" ? <Select label="City" value={city} options={options.cities} onChange={setCity} /> : null}
            <Select label="Branch" value={branch} options={options.branches} onChange={setBranch} />
            {scope === "construction" ? <Select label="Project" value={project} options={options.projects} onChange={setProject} /> : null}
            {scope === "construction" ? <Select label="Site" value={site} options={options.sites} onChange={setSite} /> : null}
            {scope === "construction" ? <Select label="Contractor" value={contractor} options={options.contractors} onChange={setContractor} /> : null}
            <DateInput label="From Date" value={fromDate} onChange={setFromDate} />
            <DateInput label="To Date" value={toDate} onChange={setToDate} />
          </div>
        ) : null}
      </section>

      {entryOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-background shadow-2xl dark:border-slate-800">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-black">New Journal Payment Entry</h2>
                <p className="text-xs text-muted-foreground">Cash Entry Payment workflow linked to {titleFor(scope)}.</p>
              </div>
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close payment entry"
                title="Close payment entry"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <CashEntryForm
                lang={lang}
                pageTitle="Cash Entry Payment"
                postingType={paymentConfig.postingType}
                scopeMode={paymentConfig.scopeMode}
                onSaved={() => {
                  setEntryOpen(false);
                  void loadReport();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Kpi icon={<ClipboardList className="h-5 w-5" />} label="Total Accounts in Branch" value={String(summary.accounts)} tone="blue" />
        <Kpi icon={<Building2 className="h-5 w-5" />} label="Active Accounts" value={String(summary.active)} tone="purple" />
        <Kpi icon={<FileSpreadsheet className="h-5 w-5" />} label="Credit Accounts" value={String(summary.creditAccounts)} tone="green" />
        <Kpi icon={<Download className="h-5 w-5" />} label="Debit Accounts" value={String(summary.debitAccounts)} tone="red" />
        <Kpi icon={<FileSpreadsheet className="h-5 w-5" />} label="Total Credit" value={fmt(summary.credit)} tone="green" />
        <Kpi icon={<Download className="h-5 w-5" />} label="Total Debit" value={fmt(summary.debit)} tone="red" />
        <Kpi icon={<BookOpen className="h-5 w-5" />} label="Final Balance" value={fmt(summary.balance)} tone="slate" />
        {scope === "construction" ? (
          <>
            <Kpi icon={<FileText className="h-5 w-5" />} label="Material Journal" value={fmt(filtered.filter((row) => normalize(row.voucherType).includes("material")).reduce((sum, row) => sum + row.debit, 0))} tone="blue" />
            <Kpi icon={<FileText className="h-5 w-5" />} label="Labour Journal" value={fmt(filtered.filter((row) => normalize(row.voucherType).includes("labour")).reduce((sum, row) => sum + row.debit, 0))} tone="red" />
            <Kpi icon={<FileText className="h-5 w-5" />} label="Equipment Journal" value={fmt(filtered.filter((row) => normalize(row.voucherType).includes("equipment")).reduce((sum, row) => sum + row.debit, 0))} tone="green" />
          </>
        ) : null}
      </div>

      {/* Main Listing Smart Card styled after work-card (4px top border of #0b3b75) */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-card shadow-sm dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800/80">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100">
              <span>Journal Entries</span>
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {scope === "country" ? "Country summary cards and country journal analysis." : scope === "city" ? "City-wise journal analysis and branch summary cards." : "Project, site, contractor, cost center and construction journal analysis."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Rows: {filtered.length}
            </span>
            <Button size="sm" variant="outline" onClick={() => exportCsv(filtered, scope)} className="h-8 rounded-md px-2.5 text-xs">
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => openPrint(false)} className="h-8 rounded-md px-2.5 text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => openPrint(true)} className="h-8 rounded-md px-2.5 text-xs">
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button size="sm" variant="outline" onClick={emailReport} className="h-8 rounded-md px-2.5 text-xs">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3 text-left pl-3 w-16">
                  <button type="button" onClick={() => sort("voucherNo")} className="font-extrabold hover:text-primary transition-colors flex items-center gap-1 select-none">
                    Serial No
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button type="button" onClick={() => sort("accountName")} className="font-extrabold hover:text-primary transition-colors flex items-center gap-1 select-none">
                    Account Name
                  </button>
                </th>
                <th className="px-3 py-3 text-center w-32">
                  <button type="button" onClick={() => sort("entries")} className="font-extrabold hover:text-primary transition-colors flex items-center gap-1 select-none mx-auto">
                    Entries Today
                  </button>
                </th>
                <th className="px-3 py-3 text-right w-44">
                  <button type="button" onClick={() => sort("debit")} className="font-extrabold hover:text-primary transition-colors flex items-center gap-1 select-none ml-auto">
                    Debit Total
                  </button>
                </th>
                <th className="px-3 py-3 text-right w-44">
                  <button type="button" onClick={() => sort("credit")} className="font-extrabold hover:text-primary transition-colors flex items-center gap-1 select-none ml-auto">
                    Credit Total
                  </button>
                </th>
                <th className="px-3 py-3 text-center pr-3 w-36">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center font-bold text-slate-400 dark:text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading report...
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((row, index) => (
                  <tr key={row.id} className={cn("hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors", index % 2 ? "bg-slate-50/20 dark:bg-slate-900/5" : "bg-background")}>
                    <td className="px-3 py-3 pl-3 font-black text-slate-500 dark:text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {row.accountName}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <span className="inline-block px-1.5 py-0.5 font-bold text-primary bg-primary/10 border border-primary/20 rounded">
                            {row.accountNumber}
                          </span>
                          <span>•</span>
                          <span>{row.branch}</span>
                          {row.companyName && row.companyName !== "-" && (
                            <>
                              <span>•</span>
                              <span className="text-muted-foreground">{row.companyName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{row.entries ?? 0}</td>
                    <td className="px-3 py-3 text-right font-black text-rose-600 dark:text-rose-400">{fmt(row.debit)}</td>
                    <td className="px-3 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">{fmt(row.credit)}</td>
                    <td className="px-3 py-3 text-center pr-3">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 h-8 rounded-md shadow-sm transition-all"
                        onClick={() => {
                          window.location.href = `/dashboard/ledger/general-report?ledgerId=${row.id}&fromDate=${fromDate}&toDate=${toDate}`;
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center font-medium text-slate-400 dark:text-slate-500">
                    No journal vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
              <tr>
                <td className="px-3 py-3 pl-3" colSpan={2}>Summary</td>
                <td className="px-3 py-3 text-center text-slate-800 dark:text-slate-200">
                  {filtered.reduce((sum, row) => sum + (row.entries || 0), 0)}
                </td>
                <td className="px-3 py-3 text-right text-rose-700 dark:text-rose-300">{fmt(summary.debit)}</td>
                <td className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(summary.credit)}</td>
                <td className="px-3 py-3 pr-3" />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/10 dark:text-slate-400">
          <span>Showing {pageRows.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-9 rounded-lg">Previous</Button>
            <span className="rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground text-xs shadow-sm">{page} / {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="h-9 rounded-lg">Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground outline-none transition focus:border-primary">
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative">
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold text-foreground outline-none transition-all focus:border-primary" />
        <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
    </label>
  );
}

function Kpi({ icon, label, value, tone = "blue" }: { icon: React.ReactNode; label: string; value: string; tone?: "blue" | "green" | "red" | "slate" | "purple" }) {
  const colors = {
    blue: {
      border: "border-l-[3px] border-l-blue-600",
      bg: "bg-card",
      text: "text-blue-700 dark:text-blue-400",
      iconBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/40"
    },
    green: {
      border: "border-l-[3px] border-l-emerald-600",
      bg: "bg-card",
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/40"
    },
    red: {
      border: "border-l-[3px] border-l-rose-600",
      bg: "bg-card",
      text: "text-rose-700 dark:text-rose-400",
      iconBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/40"
    },
    slate: {
      border: "border-l-[3px] border-l-slate-700 dark:border-l-slate-500",
      bg: "bg-card",
      text: "text-slate-800 dark:text-slate-200",
      iconBg: "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200/45"
    },
    purple: {
      border: "border-l-[3px] border-l-purple-600",
      bg: "bg-card",
      text: "text-purple-700 dark:text-purple-400",
      iconBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/40"
    }
  };
  const theme = colors[tone] || colors.blue;
  return (
    <div className={cn("min-w-[170px] rounded-lg border border-slate-200/70 px-3 py-2 shadow-sm dark:border-slate-800/70", theme.border, theme.bg)}>
      <div className="flex items-center gap-2.5">
        <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md border font-bold shadow-sm [&>svg]:h-3.5 [&>svg]:w-3.5", theme.iconBg)}>{icon}</div>
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
          <p className={cn("mt-0.5 text-base font-black tracking-tight", theme.text)}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Status({ label }: { label: string }) {
  const active = normalize(label) === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-colors",
      active 
        ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20" 
        : "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/20"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
      {label}
    </span>
  );
}

function Trend({ label }: { label: string }) {
  const increase = normalize(label) === "increase";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
      increase
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
    )}>
      {label}
    </span>
  );
}

function ReportActions({ rows, scope }: { rows: JournalRow[]; scope: JournalScope }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20 hover:border-white/25 [&::-webkit-details-marker]:hidden" aria-label="Report actions" title="Report actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-44 rounded-lg border border-slate-200 bg-popover p-1 text-sm text-popover-foreground shadow-2xl dark:border-slate-800">
        <MenuAction icon={<Eye />} label="Plate View" onClick={() => undefined} />
        <MenuAction icon={<Download />} label="Download" onClick={() => exportCsv(rows, scope)} />
      </div>
    </details>
  );
}

function RowActions() {
  return (
    <details className="relative inline-block">
      <summary className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Row actions" title="Row actions">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-popover p-1 text-sm text-popover-foreground shadow-2xl">
        <MenuAction icon={<Eye />} label="View Details" onClick={() => undefined} />
        <MenuAction icon={<Edit3 />} label="Edit Entry" onClick={() => undefined} />
        <MenuAction icon={<BookOpen />} label="View Journal" onClick={() => undefined} />
        <MenuAction icon={<FileText />} label="Attachments" onClick={() => undefined} />
        <MenuAction icon={<ClipboardList />} label="Timeline Audit" onClick={() => undefined} />
        <MenuAction icon={<Printer />} label="Print Voucher" onClick={() => window.print()} />
        <MenuAction icon={<Download />} label="Export PDF" onClick={() => window.print()} />
      </div>
    </details>
  );
}

function MenuAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
      <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}
