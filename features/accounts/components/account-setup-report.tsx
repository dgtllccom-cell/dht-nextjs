"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  createdAt: string;
  latestActivityAt: string;
  recentActivityLabel: string | null;
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
  const header = ["#", "Account No", "Manual Ref", "Account Name", "Account Type", "Category", "Branch", "Branch Code", "Country", "Currency", "Status"];
  const lines = rows.map((r, i) => [
    i + 1, r.accountCode, r.manualReferenceNumber ?? "", r.accountName,
    r.subType, r.accountCategory, r.branchName, r.branchCode,
    r.countryName, r.currency, r.status,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([header.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "account-setup-report.csv"; a.click();
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
      const res = await fetch("/api/erp/accounting/reports/accounts/general?limit=500");
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

  useEffect(() => {
    fetchReport();
    fetchSessionInfo();
  }, []);

  /* Close action menu on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Filter options ───────────────────────────────────────── */
  const uniqueCountries = useMemo(() => [...new Set(rows.map(r => r.countryName).filter(Boolean))].sort(), [rows]);
  const uniqueBranches  = useMemo(() => [...new Set(rows.map(r => r.branchName).filter(Boolean))].sort(), [rows]);
  const uniqueTypes     = useMemo(() => [...new Set(rows.map(r => r.accountCategory).filter(Boolean))].sort(), [rows]);
  const uniqueSubs      = useMemo(() => [...new Set(rows.map(r => r.subType).filter(Boolean))].sort(), [rows]);

  /* ── Filtered rows ────────────────────────────────────────── */
  const filtered = useMemo(() => rows.filter(r => {
    if (accNo && !r.accountCode.toLowerCase().includes(accNo.toLowerCase()) && !(r.manualReferenceNumber ?? "").toLowerCase().includes(accNo.toLowerCase())) return false;
    if (accName && !r.accountName.toLowerCase().includes(accName.toLowerCase())) return false;
    if (country !== "all" && r.countryName !== country) return false;
    if (branch !== "all" && r.branchName !== branch) return false;
    if (accType !== "all" && r.accountCategory !== accType) return false;
    if (subType !== "all" && r.subType !== subType) return false;
    return true;
  }), [rows, accNo, accName, country, branch, accType, subType]);

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

      {/* ─── Compact Professional Header ─────────────────────────────── */}
      <header className="asr-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="asr-header-icon">
            <LayoutList className="h-4 w-4 text-[#1f5eff]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="asr-title">Account Setup Report</h1>
              <span className="asr-badge">{loading ? "…" : filtered.length} accounts</span>
              {hasActiveFilters && (
                <span className="asr-badge asr-badge-orange">{activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active</span>
              )}
            </div>
            <p className="asr-subtitle">Enterprise FMS · Multi-country branch account management</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh */}
          <button type="button" className="asr-icon-btn" onClick={fetchReport} title="Refresh" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          {/* Filters toggle */}
          <button
            type="button"
            className={cn("asr-toolbar-btn", filtersOpen && "asr-toolbar-btn-active")}
            onClick={() => setFiltersOpen(v => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="asr-filter-count">{activeFilterCount}</span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
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
                  { icon: FileSpreadsheet, label: "Export Excel", color: "text-emerald-600", action: () => alert("Export Excel coming soon") },
                  { icon: FileText, label: "Export CSV", color: "text-blue-600", action: () => { exportCSV(filtered); setActionMenuOpen(false); } },
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
                  { icon: Send, label: "Email Report", color: "text-indigo-600" },
                  { icon: MessageCircle, label: "WhatsApp Share", color: "text-emerald-600" },
                ].map(({ icon: Icon, label, color }) => (
                  <button key={label} type="button" className="asr-action-item" onClick={() => setActionMenuOpen(false)}>
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
        </div>
      </header>

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

      {/* ─── Summary Cards (compact row) ──────────────────────────────── */}
      <div className="asr-cards-row">
        {[
          { label: "Total Accounts", value: loading ? null : filtered.length, color: "#1f5eff", Icon: Hash },
          { label: "Customers",      value: loading ? null : customers,        color: "#059669", Icon: UserRound },
          { label: "Companies",      value: loading ? null : companies,        color: "#7c3aed", Icon: Building2 },
          { label: "Banks",          value: loading ? null : banks,            color: "#d97706", Icon: Landmark },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="asr-card" style={{ borderTopColor: color }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="asr-card-label" style={{ color }}>{label}</div>
                <div className="asr-card-value">
                  {value === null ? <span className="asr-skeleton" /> : value}
                </div>
              </div>
              <div className="asr-card-icon" style={{ background: `${color}18` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Report Identity Strip ─────────────────────────────── */}
      <div className="asr-report-strip">
        {[
          { label: "Country", value: reportContext.countryName },
          { label: "Country Code", value: reportContext.countryCode },
          { label: "Branch", value: reportContext.branchName },
          { label: "Branch Code", value: reportContext.branchCode },
          { label: "User Name", value: reportContext.userName },
          { label: "User ID", value: reportContext.userId },
          { label: "User Password", value: reportContext.userPassword },
          { label: "Branch Password", value: reportContext.branchPassword },
          { label: "Role", value: reportContext.userRole },
          { label: "Date", value: reportContext.date },
          { label: "Time", value: reportContext.time },
          { label: "Records", value: `${filtered.length} / ${rows.length}` },
        ].map((item) => (
          <div className="asr-report-cell" key={item.label}>
            <span className="asr-report-label">{item.label}</span>
            <span className="asr-report-value">{item.value || "-"}</span>
          </div>
        ))}
        {hasActiveFilters && (
          <button type="button" onClick={resetFilters} className="asr-clear-chip">
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
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
                  "Manual Ref No",
                  "Customer Name / Account",
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
                  <td colSpan={14} className="asr-empty-cell">
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
                        {hasCompany ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </td>

                      {/* Bank Status */}
                      <td className="asr-td text-center">
                        {hasBank ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </td>

                      {/* Contact Status */}
                      <td className="asr-td">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="asr-contact-dot bg-rose-50 text-rose-500 border-rose-100">
                            <Phone className="h-2.5 w-2.5" />
                          </span>
                          <span className="asr-contact-dot bg-purple-50 text-purple-500 border-purple-100">
                            <Mail className="h-2.5 w-2.5" />
                          </span>
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
                  <td colSpan={14} className="asr-empty-cell">
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
        width: 34px; height: 34px;
        display: grid; place-items: center;
        border-radius: 9px;
        border: 1.5px solid var(--asr-line);
        background: var(--asr-card);
        color: var(--asr-muted);
        transition: all .15s;
      }
      .asr-icon-btn:hover { border-color: #1f5eff; color: #1f5eff; }
      .asr-icon-btn:disabled { opacity: .5; }
      .asr-toolbar-btn {
        display: inline-flex; align-items: center; gap: 5px;
        height: 34px; padding: 0 12px;
        border-radius: 9px;
        border: 1.5px solid var(--asr-line);
        background: var(--asr-card);
        color: var(--asr-muted);
        font-size: 11px; font-weight: 800;
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

      /* Summary cards */
      .asr-cards-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      @media (max-width: 640px) { .asr-cards-row { grid-template-columns: repeat(2, 1fr); } }
      .asr-card {
        background: var(--asr-card);
        border: 1.5px solid var(--asr-line);
        border-top-width: 4px;
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 4px 12px rgba(15,23,42,0.03);
        transition: all 0.2s ease-in-out;
      }
      .asr-card:hover {
        transform: translateY(-1.5px);
        box-shadow: 0 10px 24px rgba(15,23,42,0.08);
      }
      .asr-card-label {
        font-size: 9px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.08em;
        margin-bottom: 4px;
      }
      .asr-card-value {
        font-size: 22px; font-weight: 900;
        color: var(--asr-title); line-height: 1;
        letter-spacing: -0.03em;
      }
      .asr-card-icon {
        width: 32px; height: 32px;
        border-radius: 8px;
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .asr-skeleton {
        display: inline-block; width: 48px; height: 24px;
        border-radius: 6px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: asr-shimmer 1.2s infinite;
      }
      @keyframes asr-shimmer { to { background-position: -200% 0; } }

      /* Meta strip */
      .asr-meta-strip {
        display: flex; align-items: center; flex-wrap: wrap; gap: 0;
        background: var(--asr-card);
        border: 1px solid var(--asr-line);
        border-radius: 10px;
        padding: 8px 16px;
        box-shadow: 0 2px 8px rgba(15,23,42,.04);
      }
      .asr-meta-item { display: flex; flex-direction: column; padding: 0 12px; }
      .asr-meta-item:first-child { padding-left: 0; }
      .asr-meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--asr-muted); }
      .asr-meta-value { font-size: 11px; font-weight: 800; color: var(--asr-title); margin-top: 1px; }
      .asr-meta-sep { width: 1px; height: 28px; background: var(--asr-line); flex-shrink: 0; }

      /* Report identity strip */
      .asr-report-strip {
        display: grid;
        grid-template-columns: repeat(6, minmax(130px, 1fr));
        gap: 0;
        background: var(--asr-card);
        border: 1.5px solid var(--asr-line);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(15,23,42,0.03);
      }
      @media (max-width: 1280px) { .asr-report-strip { grid-template-columns: repeat(4, minmax(120px, 1fr)); } }
      @media (max-width: 768px) { .asr-report-strip { grid-template-columns: repeat(3, minmax(120px, 1fr)); } }
      @media (max-width: 480px) { .asr-report-strip { grid-template-columns: repeat(2, minmax(100px, 1fr)); } }
      .asr-report-cell {
        min-height: 48px;
        padding: 10px 14px;
        border-right: 1px solid var(--asr-line);
        border-bottom: 1px solid var(--asr-line);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        transition: background-color 0.2s ease;
      }
      .asr-report-cell:hover {
        background-color: var(--asr-hover);
      }
      .asr-report-label {
        font-size: 8px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--asr-muted);
      }
      .asr-report-value {
        font-size: 11px;
        line-height: 1.25;
        font-weight: 700;
        color: var(--asr-title);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .asr-clear-chip {
        margin: 6px;
        min-height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border-radius: 7px;
        border: 1px solid rgba(249,115,22,.25);
        background: rgba(249,115,22,.08);
        color: #ea580c;
        font-size: 10px;
        font-weight: 900;
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







