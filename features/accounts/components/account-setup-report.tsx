"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import {
  Search, UserRound, Building2, Landmark, Hash,
  Phone, Mail, MoreVertical, FileSpreadsheet,
  FileText, Send, MessageCircle, Printer, RefreshCw,
  Eye, Edit3, Filter, X, ChevronDown, CheckCircle2,
  XCircle, Loader2, LayoutList,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { rtlLanguages, type SupportedLanguage } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AccountRow = {
  accountId: string;
  accountCode: string;
  manualReferenceNumber: string | null;
  journalCode: string;
  accountName: string;
  customerId: string | null;
  customerName: string;
  companyId: string | null;
  bankId: string | null;
  accountCategory: string;
  subType: string;
  branchType: string;
  branchName: string;
  branchCode: string;
  mainBranchName: string;
  cityBranchName: string;
  countryId: string | null;
  countryName: string;
  countryCode: string;
  currency: string;
  status: string;
  companyName: string;
  companyCode: string;
  customerNumber: string;
  accountSerialNumber: number;
  countrySerialNumber: string;
  branchSerialNumber: string;
  createdAt: string;
  latestActivityAt: string;
  recentActivityLabel: string | null;
  contacts: Array<{ type: string; value: string }>;
};

type ReportMeta = {
  companyName: string;
  companyOwner: string;
};

type SessionInfo = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    preferredLanguage: SupportedLanguage;
  };
  roles: string[];
  scopes: {
    isSuperAdmin: boolean;
    countryIds: string[];
    countryBranchIds: string[];
    cityBranchIds: string[];
  };
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function exportCSV(rows: AccountRow[]) {
  const header = ["#", "Account Number", "Super Admin Account Number", "Country Serial", "Branch Serial", "Manual Ref No", "Customer Name / Account", "Owner", "Account Type", "Category", "Branch Name", "Branch Code", "Country", "Currency", "Company Status", "Bank Status"];
  const lines = rows.map((r, i) => [
    i + 1,
    r.accountCode,
    "SAD-" + String(r.accountSerialNumber).padStart(3, "0"),
    r.countrySerialNumber ?? "-",
    r.branchSerialNumber ?? "-",
    r.manualReferenceNumber ?? "",
    r.accountName,
    r.customerName && r.customerName !== "-" ? r.customerName : "—",
    r.subType,
    r.accountCategory,
    r.branchName,
    r.branchCode,
    r.countryName,
    r.currency,
    r.companyName && r.companyName !== "—" ? "Yes" : "No",
    r.accountCategory.toLowerCase().includes("asset") || r.accountCategory.toLowerCase().includes("bank") ? "Yes" : "No"
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header.join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `account-setup-report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function AccountSetupReport({ lang: propLang }: { lang?: SupportedLanguage }) {
  const router = useRouter();

  const lang = useMemo(() => {
    if (propLang) return propLang;
    if (typeof document !== "undefined") {
      const d = document.documentElement.lang as SupportedLanguage;
      return ["en", "ar", "ur", "fa", "ps"].includes(d) ? d : "en";
    }
    return "en";
  }, [propLang]);

  const isRtl = useMemo(() => rtlLanguages.includes(lang), [lang]);

  /* ── Data ─────────────────────────────────────────────────── */
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [meta, setMeta] = useState<ReportMeta>({ companyName: "—", companyOwner: "—" });
  const [generatedAt, setGeneratedAt] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── Filter state ─────────────────────────────────────────── */
  const [draftAccNo, setDraftAccNo] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftCountry, setDraftCountry] = useState("all");
  const [draftBranch, setDraftBranch] = useState("all");
  const [draftType, setDraftType] = useState("all");
  const [draftSub, setDraftSub] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [accNo, setAccNo] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [accName, setAccName] = useState("");
  const [country, setCountry] = useState("all");
  const [branch, setBranch] = useState("all");
  const [accType, setAccType] = useState("all");
  const [subType, setSubType] = useState("all");

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ────────────────────────────────────────────────── */
  async function fetchSessionInfo() {
    try {
      const res = await fetch("/api/erp/auth/session", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok && json?.data) setSessionInfo(json.data as SessionInfo);
    } catch (error) {
      console.error("Account setup session fetch error:", error);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500", language: lang });
      const res = await fetch(`/api/erp/accounting/reports/accounts/general?${params.toString()}`);
      const json = await res.json();
      if (json?.ok && json?.data) {
        setRows(json.data.rows ?? []);
        setMeta({
          companyName: json.data.workspace?.companyName ?? "—",
          companyOwner: json.data.workspace?.companyOwner ?? "—",
        });
        setGeneratedAt(json.data.generatedAt ?? new Date().toISOString());
      }
    } catch (e) {
      console.error("Account report fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [titlePortalNode, setTitlePortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    fetchReport();
    fetchSessionInfo();
    setPortalNode(document.getElementById("erp-page-actions-slot"));
    setTitlePortalNode(document.getElementById("erp-page-title-slot"));
  }, [lang]);

  /* Close action menu on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [lang]);

  /* ── Filter options ───────────────────────────────────────── */
  const uniqueCountries = useMemo(() => [...new Set(rows.map(r => r.countryName).filter(Boolean))].sort(), [rows]);
  const uniqueBranches  = useMemo(() => [...new Set(rows.map(r => r.branchName).filter(Boolean))].sort(), [rows]);
  const uniqueTypes     = useMemo(() => [...new Set(rows.map(r => r.accountCategory).filter(Boolean))].sort(), [rows]);
  const uniqueSubs      = useMemo(() => [...new Set(rows.map(r => r.subType).filter(Boolean))].sort(), [rows]);

  /* ── Filtered rows ────────────────────────────────────────── */
  const filtered = useMemo(() => rows.filter(r => {
    if (accNo) {
      const q = accNo.toLowerCase();
      if (searchField === "all") {
        const matchCode = r.accountCode.toLowerCase().includes(q) || (r.manualReferenceNumber ?? "").toLowerCase().includes(q);
        const matchName = r.accountName.toLowerCase().includes(q);
        const matchCountry = r.countryName.toLowerCase().includes(q);
        const matchBranch = r.branchName.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchCountry && !matchBranch) return false;
      } else if (searchField === "code") {
        if (!r.accountCode.toLowerCase().includes(q) && !(r.manualReferenceNumber ?? "").toLowerCase().includes(q)) return false;
      } else if (searchField === "name") {
        if (!r.accountName.toLowerCase().includes(q)) return false;
      } else if (searchField === "country") {
        if (!r.countryName.toLowerCase().includes(q)) return false;
      } else if (searchField === "branch") {
        if (!r.branchName.toLowerCase().includes(q)) return false;
      }
    }
    if (accName && !r.accountName.toLowerCase().includes(accName.toLowerCase())) return false;
    if (country !== "all" && r.countryName !== country) return false;
    if (branch !== "all" && r.branchName !== branch) return false;
    if (accType !== "all" && r.accountCategory !== accType) return false;
    if (subType !== "all" && r.subType !== subType) return false;
    return true;
  }), [rows, accNo, searchField, accName, country, branch, accType, subType]);

  /* ── Counts ───────────────────────────────────────────────── */
  const customers = useMemo(() => filtered.filter(r => r.accountCategory.toLowerCase().includes("customer") || r.customerNumber?.startsWith("CUST")).length, [filtered]);
  const companies = useMemo(() => filtered.filter(r => r.companyName && r.companyName !== "—").length, [filtered]);
  const banks     = useMemo(() => filtered.filter(r => r.accountCategory.toLowerCase().includes("bank") || r.accountCategory.toLowerCase().includes("asset")).length, [filtered]);

  function applyFilters() {
    setAccNo(draftAccNo); setAccName(draftName); setCountry(draftCountry);
    setBranch(draftBranch); setAccType(draftType); setSubType(draftSub);
    setFiltersOpen(false);
  }
  function resetFilters() {
    setDraftAccNo(""); setDraftName(""); setDraftCountry("all");
    setDraftBranch("all"); setDraftType("all"); setDraftSub("all");
    setAccNo(""); setAccName(""); setCountry("all");
    setBranch("all"); setAccType("all"); setSubType("all");
  }
  const hasActiveFilters = accNo || accName || country !== "all" || branch !== "all" || accType !== "all" || subType !== "all";

  const activeFiltersObj = { accNo, accName, country, branch, accType, subType };
  const activeFilterCount = Object.values(activeFiltersObj).filter(v => v && v !== "all").length;

  const reportSeed = filtered[0] ?? rows[0] ?? null;
  const reportContext = {
    countryName: country !== "all" ? country : reportSeed?.countryName ?? "All Countries",
    countryCode: reportSeed?.countryCode || "-",
    branchName: branch !== "all" ? branch : reportSeed?.branchName ?? "All Branches",
    branchCode: reportSeed?.branchCode || "-",
    userName: sessionInfo?.user.fullName ?? meta.companyOwner ?? "Current User",
    userId: sessionInfo?.user.id ? sessionInfo.user.id.slice(0, 12).toUpperCase() : "-",
    userRole: sessionInfo?.roles?.[0]?.replace(/_/g, " ") ?? "-",
    userPassword: "Protected",
    branchPassword: "Protected",
    date: fmt(generatedAt),
    time: fmtTime(generatedAt)
  };

  return (
    <div className="asr-shell" dir={isRtl ? "rtl" : "ltr"}>
      <AsrStyles />

      {/* Portals to main page header */}
      {titlePortalNode && createPortal(
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xs font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">Account Setup Report</h1>
          <span className="asr-badge text-[9px] px-1.5 py-0.5">{loading ? "…" : filtered.length} accounts</span>
          {hasActiveFilters && (
            <span className="asr-badge asr-badge-orange text-[9px] px-1.5 py-0.5">{activeFilterCount} active</span>
          )}
          
          <div className="hidden lg:flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
            <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-slate-500 font-extrabold uppercase">Country:</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold">{reportContext.countryName}</span>
            
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 font-extrabold uppercase">Branch:</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[80px]">{reportContext.branchName}</span>
            
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 font-extrabold uppercase">User:</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold">{reportContext.userName}</span>
            
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 font-extrabold uppercase">Role:</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{reportContext.userRole}</span>
          </div>
        </div>,
        titlePortalNode
      )}

      {portalNode && createPortal(
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Instant Search with Dropdown select */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 h-7 shadow-sm">
            <select
              className="h-full bg-slate-50 dark:bg-slate-800 text-[10px] font-bold px-1.5 border-r border-slate-200 dark:border-slate-800 outline-none text-slate-500 cursor-pointer hover:bg-slate-100"
              value={searchField}
              onChange={e => setSearchField(e.target.value)}
            >
              <option value="all">All</option>
              <option value="code">No</option>
              <option value="name">Name</option>
              <option value="country">Country</option>
              <option value="branch">Branch</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              className="h-full px-2 text-[10px] font-semibold outline-none bg-transparent w-[90px] focus:w-[130px] transition-all text-slate-900 dark:text-slate-100"
              value={accNo}
              onChange={e => {
                setAccNo(e.target.value);
                setDraftAccNo(e.target.value);
              }}
            />
          </div>

          {/* Refresh */}
          <button type="button" className="asr-icon-btn" onClick={fetchReport} title="Refresh" disabled={loading}>
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>

          {/* Filters toggle */}
          <button
            type="button"
            className={cn("asr-toolbar-btn", filtersOpen && "asr-toolbar-btn-active")}
            onClick={() => setFiltersOpen(v => !v)}
          >
            <Filter className="h-3 w-3" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="asr-filter-count">{activeFilterCount}</span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", filtersOpen && "rotate-180")} />
          </button>

          {/* Three-dot action menu */}
          <div className="relative" ref={actionRef}>
            <button
              type="button"
              className="asr-icon-btn"
              onClick={() => setActionMenuOpen(v => !v)}
              title="Export & Share"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {actionMenuOpen && (
              <div className="asr-action-menu">
                <div className="asr-action-section-label">Export</div>
                {[
                  { icon: FileSpreadsheet, label: "Export Excel", color: "text-emerald-600", action: () => exportCSV(filtered) },
                  { icon: FileText, label: "Export CSV", color: "text-blue-600", action: () => exportCSV(filtered) },
                  { icon: FileText, label: "Export PDF", color: "text-red-600", action: () => window.print() },
                ].map(({ icon: Icon, label, color, action }) => (
                  <button key={label} type="button" className="asr-action-item" onClick={() => { action(); setActionMenuOpen(false); }}>
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
                    <span>{label}</span>
                  </button>
                ))}
                <div className="asr-action-divider" />
                <div className="asr-action-section-label">Share</div>
                {[
                  { icon: Send, label: "Email Report", color: "text-indigo-600", action: () => {
                    const subject = encodeURIComponent("Account Setup Report");
                    const body = encodeURIComponent(`Account Setup Report\nAccounts: ${filtered.length}\nGenerated on: ${new Date(generatedAt).toLocaleString()}`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }},
                  { icon: MessageCircle, label: "WhatsApp Share", color: "text-emerald-600", action: () => {
                    const text = encodeURIComponent(`Account Setup Report: ${filtered.length} accounts found.`);
                    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
                  }},
                ].map(({ icon: Icon, label, color, action }) => (
                  <button key={label} type="button" className="asr-action-item" onClick={() => { action(); setActionMenuOpen(false); }}>
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
                    <span>{label}</span>
                  </button>
                ))}
                <div className="asr-action-divider" />
                <div className="asr-action-section-label">Print</div>
                {[
                  { icon: Printer, label: "Print Report", action: () => window.print() },
                  { icon: DownloadActionIcon, label: "Download Report", action: () => exportCSV(filtered) },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} type="button" className="asr-action-item" onClick={() => { action(); setActionMenuOpen(false); }}>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        portalNode
      )}

      {/* ─── Filter Panel ─────────────────────────────────────────────── */}
      {filtersOpen && (
        <div className="asr-filter-panel">
          <div className="asr-filter-grid">
            {/* Account Number */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Account Number</label>
              <div className="relative">
                <Search className="asr-filter-icon" />
                <input className="asr-filter-input" placeholder="Search account no…" value={draftAccNo} onChange={e => setDraftAccNo(e.target.value)} />
              </div>
            </div>
            {/* Account Name */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Account Name</label>
              <div className="relative">
                <Search className="asr-filter-icon" />
                <input className="asr-filter-input" placeholder="Search name…" value={draftName} onChange={e => setDraftName(e.target.value)} />
              </div>
            </div>
            {/* Country */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Country</label>
              <select className="asr-filter-select" value={draftCountry} onChange={e => setDraftCountry(e.target.value)}>
                <option value="all">All Countries</option>
                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Branch */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Branch</label>
              <select className="asr-filter-select" value={draftBranch} onChange={e => setDraftBranch(e.target.value)}>
                <option value="all">All Branches</option>
                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {/* Account Type */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Account Type</label>
              <select className="asr-filter-select" value={draftType} onChange={e => setDraftType(e.target.value)}>
                <option value="all">All Types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Sub Type */}
            <div className="asr-filter-field">
              <label className="asr-filter-label">Sub Type</label>
              <select className="asr-filter-select" value={draftSub} onChange={e => setDraftSub(e.target.value)}>
                <option value="all">All Sub Types</option>
                {uniqueSubs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" className="asr-btn-primary" onClick={applyFilters}>Apply Filters</button>
            <button type="button" className="asr-btn-secondary" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      )}

      {/* ─── Compact Metrics Panel ─────────────────────────────── */}
      <div className="asr-executive-panel">
        <div className="asr-metrics-section">
          {[
            { label: "Total Accounts", value: loading ? null : filtered.length, color: "#1f5eff" },
            { label: "Customers",      value: loading ? null : customers,        color: "#059669" },
            { label: "Companies",      value: loading ? null : companies,        color: "#7c3aed" },
            { label: "Banks",          value: loading ? null : banks,            color: "#d97706" },
          ].map(({ label, value, color }) => (
            <div key={label} className="asr-metric-mini-card" style={{ borderLeft: `3px solid ${color}` }}>
              <div className="asr-metric-mini-content">
                <span className="asr-metric-mini-label">{label}</span>
                <span className="asr-metric-mini-value">
                  {value === null ? <span className="asr-skeleton" /> : value}
                </span>
              </div>
            </div>
          ))}
          {hasActiveFilters && (
            <button type="button" onClick={resetFilters} className="asr-clear-chip-compact ml-auto">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>
      {/* ─── Table ────────────────────────────────────────────────────── */}
      <div className="asr-table-wrap">
        <div className="overflow-x-auto">
          <table className="asr-table">
            <thead>
              <tr>
                {[
                  "#",
                  "Account Number",
                  "Super Admin Account Number",
                  "Country Serial",
                  "Branch Serial",
                  "Manual Ref No",
                  "Customer Name / Account",
                  "Owner",
                  "Account Type",
                  "Category",
                  "Branch Name",
                  "Branch Code",
                  "Country",
                  "Currency",
                  "Company",
                  "Bank",
                  "Contact",
                  "Actions",
                ].map(h => (
                  <th key={h} className="asr-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={17} className="asr-empty-cell">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1f5eff]" />
                      <span>Loading accounts report…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((row, idx) => {
                  const hasCompany = Boolean(row.companyName && row.companyName !== "—");
                  const hasBank = row.accountCategory.toLowerCase().includes("asset") || row.accountCategory.toLowerCase().includes("bank");

                  return (
                    <tr key={row.accountId} className="asr-row">
                      {/* # */}
                      <td className="asr-td asr-td-num">{idx + 1}</td>

                      {/* Account Number */}
                      <td className="asr-td">
                        <div className="font-mono font-bold text-[#1455ff] text-[11px] leading-tight whitespace-nowrap">
                          {row.accountCode}
                        </div>
                        {row.journalCode && row.journalCode !== row.accountCode && (
                          <div className="text-[9px] text-[var(--asr-muted)] font-mono mt-0.5">{row.journalCode}</div>
                        )}
                      </td>

                      {/* Super Admin Account Number */}
                      <td className="asr-td text-center">
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {"SAD-" + String(row.accountSerialNumber).padStart(3, "0")}
                        </span>
                      </td>

                      {/* Country Serial */}
                      <td className="asr-td text-center">
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          {row.countrySerialNumber}
                        </span>
                      </td>

                      {/* Branch Serial */}
                      <td className="asr-td text-center">
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          {row.branchSerialNumber}
                        </span>
                      </td>

                      {/* Manual Ref No */}
                      <td className="asr-td">
                        <span className="font-mono text-[10px] font-semibold text-slate-500">
                          {row.manualReferenceNumber || "—"}
                        </span>
                      </td>

                      {/* Customer Name / Account */}
                      <td className="asr-td">
                        <div className="flex items-center gap-2">
                          <div className="asr-avatar">{row.accountName.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="font-black text-[var(--asr-title)] text-[11px] leading-tight">{row.accountName}</div>
                            <div className="text-[9px] text-[var(--asr-muted)] font-mono mt-0.5">{row.customerNumber}</div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="asr-td">
                        <span className="font-bold text-[#10b981] text-[11px]">{row.customerName && row.customerName !== "-" ? row.customerName : "—"}</span>
                      </td>

                      {/* Account Type */}
                      <td className="asr-td">
                        <span className="asr-type-badge">{row.subType}</span>
                      </td>

                      {/* Category */}
                      <td className="asr-td">
                        <span className={cn("asr-cat-badge", {
                          "asr-cat-asset":     row.accountCategory.toLowerCase() === "asset",
                          "asr-cat-expense":   row.accountCategory.toLowerCase() === "expense",
                          "asr-cat-income":    row.accountCategory.toLowerCase() === "income",
                          "asr-cat-liability": row.accountCategory.toLowerCase() === "liability",
                          "asr-cat-equity":    row.accountCategory.toLowerCase() === "equity",
                        })}>
                          {row.accountCategory}
                        </span>
                      </td>

                      {/* Branch Name */}
                      <td className="asr-td">
                        <div className="font-semibold text-[11px] leading-tight">{row.branchName}</div>
                        <div className="text-[9px] text-[var(--asr-muted)] mt-0.5">{row.branchType}</div>
                      </td>

                      {/* Branch Code */}
                      <td className="asr-td">
                        <span className="font-mono font-black text-[10px] text-[#1455ff]">{row.branchCode || "—"}</span>
                      </td>

                      {/* Country */}
                      <td className="asr-td font-semibold text-[11px]">{row.countryName}</td>

                      {/* Currency */}
                      <td className="asr-td">
                        <span className="font-mono font-bold text-[11px]">{row.currency}</span>
                      </td>

                      {/* Company Status */}
                      <td className="asr-td text-center">
                        {row.companyId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/settings/company-setup?companyId=${row.companyId}`)}
                            className="cursor-pointer hover:scale-110 transition-transform focus:outline-none block mx-auto"
                            title="Click to view company profile file"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                          </button>
                        ) : hasCompany ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto opacity-60" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </td>

                      {/* Bank Status */}
                      <td className="asr-td text-center">
                        {row.bankId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/settings/company-setup?companyId=${row.bankId}`)}
                            className="cursor-pointer hover:scale-110 transition-transform focus:outline-none block mx-auto"
                            title="Click to view bank profile file"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                          </button>
                        ) : hasBank ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto opacity-60" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </td>

                      {/* Contact Status */}
                      <td className="asr-td">
                        <div className="flex items-center justify-center gap-1.5">
                          {(() => {
                            const safeContacts: Array<{ type: string; value: string }> = Array.isArray(row.contacts) ? row.contacts : (typeof row.contacts === "string" ? JSON.parse(row.contacts || "[]") : []);
                            const phones = safeContacts.filter((c) => c?.type?.toLowerCase().includes("mobile") || c?.type?.toLowerCase().includes("whatsapp") || c?.type?.toLowerCase().includes("phone") || c?.type?.toLowerCase().includes("landline") || c?.type?.toLowerCase().includes("office"));
                            const emails = safeContacts.filter((c) => c?.type?.toLowerCase().includes("email"));
                            
                            return (
                              <>
                                <span 
                                  className={cn("asr-contact-dot", phones?.length ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-slate-50 text-slate-300 border-slate-100")}
                                  title={phones?.length ? phones.map(p => `${p.type}: ${p.value}`).join("\\n") : "No Phone"}
                                >
                                  <Phone className="h-2.5 w-2.5" />
                                </span>
                                <span 
                                  className={cn("asr-contact-dot", emails?.length ? "bg-purple-50 text-purple-500 border-purple-100" : "bg-slate-50 text-slate-300 border-slate-100")}
                                  title={emails?.length ? emails.map(e => `${e.type}: ${e.value}`).join("\\n") : "No Email"}
                                >
                                  <Mail className="h-2.5 w-2.5" />
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="asr-td">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="asr-action-btn asr-action-view"
                            title="View Account Profile"
                            onClick={() => router.push(`/dashboard/accounts/view?accountId=${row.accountId}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="asr-action-btn asr-action-edit"
                            title="Edit Account"
                            onClick={() => router.push(`/dashboard/accounts/setup?accountId=${row.accountId}&mode=edit`)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={17} className="asr-empty-cell">
                    No accounts found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="asr-table-footer">
          <span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> accounts</span>
          <span className="text-[var(--asr-muted)]">Generated {fmt(generatedAt)} at {fmtTime(generatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
function AsrStyles() {
  return (
    <style>{`
      .asr-shell {
        --asr-bg: #f0f5ff;
        --asr-card: rgba(255,255,255,.97);
        --asr-line: #d9e4f5;
        --asr-title: #0a1028;
        --asr-muted: #64728b;
        --asr-head: #f3f7ff;
        --asr-hover: #f7faff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--asr-bg);
        padding: 12px 16px;
        min-height: 100%;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 12px;
      }
      .dark .asr-shell {
        --asr-bg: #071120;
        --asr-card: #101b2f;
        --asr-line: #24344c;
        --asr-title: #f8fafc;
        --asr-muted: #90a4c2;
        --asr-head: #152238;
        --asr-hover: #182842;
      }

      /* Header */
      .asr-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        background: var(--asr-card);
        border: 1.5px solid var(--asr-line);
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 16px rgba(15,23,42,0.04);
      }
      .asr-header-icon {
        width: 30px; height: 30px;
        border-radius: 10px;
        background: rgba(31,94,255,.1);
        display: grid; place-items: center;
        flex-shrink: 0;
        border: 1px solid rgba(31,94,255,.2);
      }
      .asr-title {
        font-size: 14px; font-weight: 900;
        color: var(--asr-title); line-height: 1.2;
        letter-spacing: -.02em;
      }
      .asr-subtitle {
        font-size: 9px; font-weight: 600;
        color: var(--asr-muted); margin-top: 2px;
      }
      .asr-badge {
        display: inline-flex; align-items: center;
        border-radius: 9999px;
        background: rgba(31,94,255,.1);
        color: #1f5eff;
        font-size: 9px; font-weight: 800;
        padding: 2px 8px;
        border: 1px solid rgba(31,94,255,.2);
      }
      .asr-badge-orange {
        background: rgba(249,115,22,.1);
        color: #ea580c;
        border-color: rgba(249,115,22,.2);
      }

      /* Toolbar buttons */
      .asr-icon-btn {
        width: 28px; height: 28px;
        display: grid; place-items: center;
        border-radius: 6px;
        border: 1.5px solid var(--asr-line);
        background: var(--asr-card);
        color: var(--asr-muted);
        transition: all .15s;
      }
      .asr-icon-btn:hover { border-color: #1f5eff; color: #1f5eff; }
      .asr-icon-btn:disabled { opacity: .5; }
      .asr-toolbar-btn {
        display: inline-flex; align-items: center; gap: 4px;
        height: 28px; padding: 0 10px;
        border-radius: 6px;
        border: 1.5px solid var(--asr-line);
        background: var(--asr-card);
        color: var(--asr-muted);
        font-size: 10px; font-weight: 800;
        transition: all .15s;
      }
      .asr-toolbar-btn:hover, .asr-toolbar-btn-active {
        border-color: #1f5eff; color: #1f5eff;
        background: rgba(31,94,255,.06);
      }
      .asr-filter-count {
        background: #1f5eff; color: white;
        font-size: 9px; font-weight: 900;
        border-radius: 9999px; padding: 0 5px;
        min-width: 16px; text-align: center;
      }

      /* Action menu */
      .asr-action-menu {
        position: absolute; right: 0; top: calc(100% + 6px); z-index: 100;
        width: 200px;
        background: var(--asr-card);
        border: 1px solid var(--asr-line);
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(15,23,42,.16);
        padding: 6px;
        animation: asr-fadein .12s ease-out;
      }
      @keyframes asr-fadein { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      .asr-action-section-label {
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: .08em; color: var(--asr-muted);
        padding: 4px 10px 2px;
      }
      .asr-action-item {
        display: flex; align-items: center; gap: 8px;
        width: 100%; text-align: left;
        padding: 7px 10px; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        color: var(--asr-title);
        transition: background .1s;
      }
      .asr-action-item:hover { background: var(--asr-hover); }
      .asr-action-divider { height: 1px; background: var(--asr-line); margin: 4px 6px; }

      /* Filter panel */
      .asr-filter-panel {
        background: var(--asr-card);
        border: 1px solid var(--asr-line);
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 4px 16px rgba(15,23,42,.05);
        animation: asr-fadein .12s ease-out;
      }
      .asr-filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
      }
      .asr-filter-field { display: flex; flex-direction: column; gap: 4px; }
      .asr-filter-label { font-size: 10px; font-weight: 800; color: var(--asr-title); }
      .asr-filter-icon {
        position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
        width: 13px; height: 13px; color: var(--asr-muted); pointer-events: none;
      }
      .asr-filter-input {
        height: 32px; width: 100%; border-radius: 8px;
        border: 1.5px solid var(--asr-line); background: var(--asr-card);
        padding: 0 10px 0 28px; color: var(--asr-title);
        font-size: 11px; font-weight: 600; outline: none;
        transition: border-color .15s, box-shadow .15s;
      }
      .asr-filter-input:focus { border-color: #1f5eff; box-shadow: 0 0 0 3px rgba(31,94,255,.1); }
      .asr-filter-select {
        height: 32px; width: 100%; border-radius: 8px;
        border: 1.5px solid var(--asr-line); background: var(--asr-card);
        padding: 0 10px; color: var(--asr-title);
        font-size: 11px; font-weight: 600; outline: none;
        transition: border-color .15s;
      }
      .asr-filter-select:focus { border-color: #1f5eff; }

      /* Buttons */
      .asr-btn-primary {
        display: inline-flex; align-items: center; gap: 6px;
        height: 32px; padding: 0 16px; border-radius: 8px;
        background: #1f5eff; color: white;
        font-size: 11px; font-weight: 900;
        box-shadow: 0 6px 16px rgba(31,94,255,.28);
        transition: all .15s;
      }
      .asr-btn-primary:hover { background: #1a50e0; transform: translateY(-1px); }
      .asr-btn-secondary {
        display: inline-flex; align-items: center; gap: 5px;
        height: 32px; padding: 0 14px; border-radius: 8px;
        border: 1.5px solid var(--asr-line); background: var(--asr-card);
        color: var(--asr-muted); font-size: 11px; font-weight: 800;
        transition: all .15s;
      }
      .asr-btn-secondary:hover { border-color: #ef4444; color: #ef4444; }

      /* Executive summary panel */
      .asr-executive-panel {
        background: var(--asr-card);
        border: 1.5px solid var(--asr-line);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(15,23,42,0.03);
        overflow: hidden;
      }
      .asr-panel-flex-row {
        display: flex;
        align-items: stretch;
        width: 100%;
      }
      @media (max-width: 1024px) {
        .asr-panel-flex-row {
          flex-direction: column;
        }
        .asr-panel-divider {
          display: none;
        }
      }
      .asr-metrics-section {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px 10px;
        align-items: center;
        flex-shrink: 0;
        background: rgba(247, 250, 255, 0.25);
      }
      .dark .asr-metrics-section {
        background: rgba(24, 40, 66, 0.15);
      }
      .asr-metric-mini-card {
        background: var(--asr-card);
        border: 1px solid var(--asr-line);
        border-radius: 6px;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        min-width: 105px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        transition: background-color 0.15s;
      }
      .asr-metric-mini-card:hover { background-color: var(--asr-hover); }
      .asr-metric-mini-content {
        display: flex;
        flex-direction: column;
        gap: 0.5px;
      }
      .asr-metric-mini-label {
        font-size: 7.5px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--asr-muted);
      }
      .asr-metric-mini-value {
        font-size: 13px; font-weight: 900;
        color: var(--asr-title); line-height: 1.1;
      }
      .asr-skeleton {
        display: inline-block; width: 32px; height: 16px;
        border-radius: 4px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: asr-shimmer 1.2s infinite;
      }
      @keyframes asr-shimmer { to { background-position: -200% 0; } }

      .asr-panel-divider {
        width: 1px;
        background: var(--asr-line);
        margin: 6px 0;
        align-self: stretch;
        flex-shrink: 0;
      }

      /* Sleek Metadata Grid */
      .asr-metadata-section {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 0;
        padding: 6px 10px;
        flex-grow: 1;
      }
      .asr-metadata-mini-cell {
        padding: 4px 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        border-right: 1px dashed var(--asr-line);
        min-width: 90px;
      }
      .asr-metadata-mini-cell:last-of-type { border-right: none; }
      .asr-metadata-mini-label {
        font-size: 7.5px; font-weight: 850;
        text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--asr-muted);
      }
      .asr-metadata-mini-value {
        font-size: 9.5px; font-weight: 700;
        color: var(--asr-title);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 130px;
      }
      .asr-clear-chip-compact {
        margin: auto 8px;
        height: 22px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        border-radius: 5px;
        border: 1px solid rgba(249,115,22,.25);
        background: rgba(249,115,22,.08);
        color: #ea580c;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .asr-clear-chip-compact:hover {
        background: rgba(249,115,22,.15);
      }
      /* Table */
      .asr-table-wrap {
        background: var(--asr-card);
        border: 1px solid var(--asr-line);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(15,23,42,.06);
      }
      .asr-table {
        width: 100%; border-collapse: collapse;
        font-size: 11px; text-align: left;
        min-width: 1400px;
      }
      .asr-th {
        background: var(--asr-head);
        padding: 9px 10px;
        font-size: 9px; font-weight: 900;
        text-transform: uppercase; letter-spacing: .06em;
        color: var(--asr-muted);
        border-bottom: 1px solid var(--asr-line);
        border-right: 1px solid var(--asr-line);
        white-space: nowrap;
      }
      .asr-th:last-child { border-right: none; }
      .asr-row { background: var(--asr-card); transition: background .1s; }
      .asr-row:hover { background: var(--asr-hover); }
      .asr-td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--asr-line);
        border-right: 1px solid var(--asr-line);
        color: var(--asr-title);
        vertical-align: middle;
        white-space: nowrap;
      }
      .asr-td:last-child { border-right: none; }
      .asr-td-num { font-weight: 800; color: var(--asr-muted); text-align: center; width: 36px; }
      .asr-empty-cell { padding: 48px; text-align: center; color: var(--asr-muted); font-weight: 600; }

      /* Avatar */
      .asr-avatar {
        width: 24px; height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1f5eff, #7c3aed);
        color: white; font-size: 9px; font-weight: 900;
        display: grid; place-items: center; flex-shrink: 0;
      }

      /* Badges */
      .asr-type-badge {
        display: inline-flex; align-items: center;
        border-radius: 6px; padding: 2px 7px;
        background: #f0f5ff; color: #1f5eff;
        border: 1px solid #c7d8ff;
        font-size: 9px; font-weight: 800;
        white-space: nowrap;
      }
      .asr-cat-badge {
        display: inline-flex; align-items: center;
        border-radius: 6px; padding: 2px 7px;
        font-size: 9px; font-weight: 800; white-space: nowrap;
        background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
      }
      .asr-cat-asset    { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
      .asr-cat-expense  { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
      .asr-cat-income   { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
      .asr-cat-liability{ background:#fef2f2; color:#991b1b; border-color:#fecaca; }
      .asr-cat-equity   { background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe; }

      /* Contact dots */
      .asr-contact-dot {
        display: inline-flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%; border: 1px solid;
      }

      /* Action buttons */
      .asr-action-btn {
        display: inline-flex; align-items: center; gap: 4px;
        height: 26px; padding: 0 8px; border-radius: 6px;
        font-size: 10px; font-weight: 800;
        border: 1.5px solid; transition: all .15s;
        white-space: nowrap;
      }
      .asr-action-view {
        background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;
      }
      .asr-action-view:hover { background: #dbeafe; border-color: #1d4ed8; }
      .asr-action-edit {
        background: #fff7ed; color: #c2410c; border-color: #fed7aa;
      }
      .asr-action-edit:hover { background: #ffedd5; border-color: #c2410c; }

      /* Table footer */
      .asr-table-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 16px;
        border-top: 1px solid var(--asr-line);
        font-size: 10px; font-weight: 700;
        color: var(--asr-muted);
        background: var(--asr-head);
        flex-wrap: wrap; gap: 8px;
      }

      @media print {
        .asr-header button, .asr-action-menu,
        .asr-filter-panel, .asr-action-btn { display: none !important; }
        .asr-shell { background: white; padding: 0; }
        .asr-table-wrap { box-shadow: none; border: 1px solid #ddd; }
      }
    `}</style>
  );
}
