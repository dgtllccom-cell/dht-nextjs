"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Building2,
  Calendar,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  Filter,
  Globe2,
  Grid2X2,
  Info,
  Mail,
  MessageCircle,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  Users
} from "lucide-react";
import { apiGet } from "@/lib/api/client";
import type { SearchSelectOption } from "@/components/ui/search-select";
import { cn } from "@/lib/utils";

type UserJournalRow = {
  userId: string;
  userCode: string;
  fullName: string;
  countryId: string | null;
  countryName: string;
  branchId: string | null;
  branchName: string;
  branchType: string;
  role: string;
  registrationDate: string;
  status: "active" | "inactive";
  permissions: string[];
  lastActivity: string;
  lastActivityAction: string | null;
  activityCounts: {
    logins: number;
    transactions: number;
    roznamcha: number;
    purchases: number;
    payments: number;
    accounts: number;
    approvals: number;
    edits: number;
  };
};

type UserJournalReportResponse = {
  summary: {
    totalUsers: number;
    activeUsers: number;
    countryUsers: number;
    branchUsers: number;
    adminUsers: number;
    recentLogins: number;
  };
  filters: {
    countries: SearchSelectOption[];
    branches: SearchSelectOption[];
    roles: SearchSelectOption[];
  };
  rows: UserJournalRow[];
  generatedAt: string;
};

let userJournalCache: { data: UserJournalReportResponse; cachedAt: number } | null = null;
const USER_JOURNAL_CACHE_MS = 1000 * 60 * 3;

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesText(haystack: string, query: string) {
  if (!query) return true;
  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

function csvEscape(value: string) {
  const v = (value ?? "").toString();
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function summarizePermissions(perms: string[]) {
  if (!perms.length) return "-";
  return perms.slice(0, 4).join(", ") + (perms.length > 4 ? ` +${perms.length - 4} more` : "");
}

export function UserJournalReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserJournalReportResponse | null>(null);

  const [draftQuery, setDraftQuery] = useState("");
  const [draftCountryId, setDraftCountryId] = useState("all");
  const [draftBranchId, setDraftBranchId] = useState("all");
  const [draftRole, setDraftRole] = useState("all");
  const [draftShareBy, setDraftShareBy] = useState("all");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");

  const [query, setQuery] = useState("");
  const [countryId, setCountryId] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [role, setRole] = useState("all");
  const [shareBy, setShareBy] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openMenu, setOpenMenu] = useState<"filters" | "actions" | "fields" | "more" | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientGeneratedAt, setClientGeneratedAt] = useState("");

  function loadReport(options: { force?: boolean } = {}) {
    let cancelled = false;
    const cached = userJournalCache;
    const freshCache = cached && Date.now() - cached.cachedAt < USER_JOURNAL_CACHE_MS;
    if (!options.force && freshCache) {
      setData(cached.data);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    apiGet<UserJournalReportResponse>("/api/erp/users/journal-report?limit=200")
      .then((res) => {
        if (cancelled) return;
        userJournalCache = { data: res, cachedAt: Date.now() };
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load user journal report");
        if (userJournalCache?.data) setData(userJournalCache.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    return loadReport();
  }, []);

  useEffect(() => {
    function refreshIfDirty() {
      const dirtyAt = localStorage.getItem("user_journal_dirty");
      if (!dirtyAt) return;
      localStorage.removeItem("user_journal_dirty");
      userJournalCache = null;
      loadReport({ force: true });
    }

    refreshIfDirty();
    window.addEventListener("focus", refreshIfDirty);
    document.addEventListener("visibilitychange", refreshIfDirty);
    return () => {
      window.removeEventListener("focus", refreshIfDirty);
      document.removeEventListener("visibilitychange", refreshIfDirty);
    };
  }, []);

  useEffect(() => {
    setClientGeneratedAt(formatDateTime(data?.generatedAt ?? new Date().toISOString()));
  }, [data?.generatedAt]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(draftQuery.trim());
      setCurrentPage(1);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [draftQuery]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((row) => {
      if (countryId !== "all" && row.countryId !== countryId) return false;
      if (branchId !== "all" && row.branchId !== branchId) return false;
      if (role !== "all" && row.role !== role) return false;
      if (shareBy === "country" && row.branchType !== "Country") return false;
      if (shareBy === "branch" && !["Main Branch", "City Branch", "Branch"].includes(row.branchType)) return false;
      if (shareBy === "global" && row.branchType !== "Global") return false;
      if (status !== "all" && row.status !== status) return false;
      if (fromDate && row.registrationDate.slice(0, 10) < fromDate) return false;
      if (toDate && row.registrationDate.slice(0, 10) > toDate) return false;
      if (!query) return true;
      return matchesText(
        [
          row.userCode,
          row.fullName,
          row.countryName,
          row.branchName,
          row.branchType,
          row.role,
          row.status,
          row.permissions.join(" "),
          row.lastActivityAction ?? ""
        ]
          .filter(Boolean)
          .join(" "),
        query
      );
    });
  }, [branchId, countryId, data?.rows, fromDate, query, role, shareBy, status, toDate]);

  const summary = useMemo(() => {
    return {
      totalUsers: filteredRows.length,
      activeUsers: filteredRows.filter((row) => row.status === "active").length,
      countryUsers: filteredRows.filter((row) => row.branchType === "Country").length,
      branchUsers: filteredRows.filter((row) => row.branchType === "Main Branch" || row.branchType === "City Branch" || row.branchType === "Branch").length,
      adminUsers: filteredRows.filter((row) => ["super_admin", "country_admin", "main_branch_admin"].includes(row.role)).length,
      recentLogins: filteredRows.reduce((sum, row) => sum + row.activityCounts.logins, 0)
    };
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = filteredRows.length ? (safeCurrentPage - 1) * pageSize : 0;
  const pageEnd = Math.min(pageStart + pageSize, filteredRows.length);
  const paginatedRows = filteredRows.slice(pageStart, pageEnd);
  const superAdminRow = useMemo(
    () => filteredRows.find((row) => row.role === "super_admin") ?? filteredRows.find((row) => row.branchType === "Global") ?? filteredRows[0] ?? null,
    [filteredRows]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [branchId, countryId, fromDate, pageSize, query, role, shareBy, status, toDate]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  function applyFilters() {
    setQuery(draftQuery.trim());
    setCountryId(draftCountryId);
    setBranchId(draftBranchId);
    setRole(draftRole);
    setShareBy(draftShareBy);
    setStatus(draftStatus);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setOpenMenu(null);
  }

  function resetFilters() {
    setDraftQuery("");
    setDraftCountryId("all");
    setDraftBranchId("all");
    setDraftRole("all");
    setDraftShareBy("all");
    setDraftStatus("all");
    setDraftFromDate("");
    setDraftToDate("");
    setQuery("");
    setCountryId("all");
    setBranchId("all");
    setRole("all");
    setShareBy("all");
    setStatus("all");
    setFromDate("");
    setToDate("");
    setOpenMenu(null);
  }

  function printReport() {
    window.print();
  }

  function openNewUser() {
    const href = "/dashboard/new-entry/users/registration";
    router.push(href);
    window.setTimeout(() => {
      if (!window.location.pathname.endsWith("/dashboard/new-entry/users/registration")) {
        window.location.assign(href);
      }
    }, 120);
  }

  function exportPdf() {
    window.print();
  }

  function exportExcel() {
    const rows: string[][] = [
      ["User ID", "Full Name", "Country", "Branch", "Branch Type", "Role", "Registration Date", "Status", "Permissions", "Last Activity"]
    ];
    for (const row of filteredRows) {
      rows.push([
        row.userCode,
        row.fullName,
        row.countryName,
        row.branchName,
        row.branchType,
        row.role,
        row.registrationDate,
        row.status,
        row.permissions.join("; "),
        row.lastActivity
      ]);
    }
    downloadCsv(`user-journal-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function editReport() {
    setOpenMenu("filters");
  }

  function emailReport() {
    const subject = encodeURIComponent("User Journal Report");
    const body = encodeURIComponent(`User Journal Report\nRows: ${filteredRows.length}\nGenerated: ${new Date().toLocaleString()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function whatsappReport() {
    const text = encodeURIComponent(`User Journal Report - ${filteredRows.length} rows`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function shareReport() {
    const text = `User Journal Report - ${filteredRows.length} rows`;
    if (navigator.share) {
      await navigator.share({ title: "User Journal Report", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  return (
    <div className="ujr-shell space-y-4 text-[var(--ujr-text)]">
      <UserJournalStyles />
        <main className="min-w-0">
          <header className="mb-2 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-blue-300/70 bg-gradient-to-br from-blue-50 to-indigo-100 text-[#1d4ed8] shadow-[0_8px_18px_rgba(37,99,235,.14)] dark:from-blue-950 dark:to-indigo-950">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black leading-tight tracking-[-.03em] text-[var(--ujr-title)]">User Journal Report</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--ujr-muted)]">
                  Tracks user registration, logins, activity, and journal-style ERP actions.
                  <Info className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>

            <TopToolbar
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              data={data}
              draftQuery={draftQuery}
              setDraftQuery={setDraftQuery}
              draftFromDate={draftFromDate}
              setDraftFromDate={setDraftFromDate}
              draftToDate={draftToDate}
              setDraftToDate={setDraftToDate}
              draftShareBy={draftShareBy}
              setDraftShareBy={setDraftShareBy}
              draftStatus={draftStatus}
              setDraftStatus={setDraftStatus}
              draftRole={draftRole}
              setDraftRole={setDraftRole}
              draftCountryId={draftCountryId}
              setDraftCountryId={setDraftCountryId}
              draftBranchId={draftBranchId}
              setDraftBranchId={setDraftBranchId}
              applyFilters={applyFilters}
              resetFilters={resetFilters}
              editReport={editReport}
              printReport={printReport}
              exportPdf={exportPdf}
              exportExcel={exportExcel}
              emailReport={emailReport}
              whatsappReport={whatsappReport}
              shareReport={() => void shareReport()}
              openNewUser={openNewUser}
            />
          </header>

          <section className="mb-2 rounded-[12px] border border-[var(--ujr-line)] bg-[var(--ujr-card)] p-2.5 shadow-[0_7px_18px_rgba(15,23,42,.05)]">
            <div className="grid gap-2 text-[11px] sm:grid-cols-2 xl:grid-cols-7">
              <AdminInfo label="Super Admin" value={superAdminRow?.fullName ?? "Super Admin"} />
              <AdminInfo label="User ID" value={superAdminRow?.userCode ?? "-"} />
              <AdminInfo label="Team" value="ERP Admin" />
              <AdminInfo label="Branch" value={superAdminRow?.branchName || "Global"} />
              <AdminInfo label="Country" value={superAdminRow?.countryName || "Global"} />
              <AdminInfo label="Last Login" value={formatDateTime(superAdminRow?.lastActivity ?? "")} />
              <AdminInfo label="Date / Time" value={clientGeneratedAt || "-"} />
            </div>
          </section>

          <section className="mb-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <JournalMetric icon={Users} label="Total Users" value={summary.totalUsers} tone="violet" />
            <JournalMetric icon={ShieldCheck} label="Active Users" value={summary.activeUsers} tone="green" />
            <JournalMetric icon={Globe2} label="Country Users" value={summary.countryUsers} tone="blue" />
            <JournalMetric icon={Building2} label="Branch Users" value={summary.branchUsers} tone="orange" />
            <JournalMetric icon={UserCog} label="Admin Users" value={summary.adminUsers} tone="violet" />
            <JournalMetric icon={Download} label="Recent Logins" value={summary.recentLogins} tone="cyan" />
          </section>

          {error ? (
            <div className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <span>Report data could not refresh right now. Showing cached/fallback data where available. Detail: {error}</span>
              <button className="ujr-secondary-btn h-8 px-3" type="button" onClick={() => { loadReport({ force: true }); }}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : null}

          <section className="ujr-table-card overflow-hidden rounded-[14px] border shadow-[0_12px_34px_rgba(15,23,42,.08)]">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="bg-[var(--ujr-table-head)] text-[11px] font-black uppercase tracking-wide text-[var(--ujr-title)]">
                    {["#", "User Image", "User Name", "User ID", "Country / Branch", "Branch Type", "Role", "Status", "Last Activity", "Actions"].map((head) => (
                      <th key={head} className="border-b border-r border-[var(--ujr-line)] px-2.5 py-2 last:border-r-0">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-[var(--ujr-muted)]">Loading user journal report...</td></tr>
                  ) : paginatedRows.length ? (
                    paginatedRows.map((row, index) => (
                      <tr key={row.userId} className="bg-[var(--ujr-card)] text-[var(--ujr-title)] transition hover:bg-[var(--ujr-row-hover)]">
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-bold">{pageStart + index + 1}</td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5">
                          <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[8px] font-black text-white shadow-md">
                            {initials(row.fullName)}
                          </div>
                        </td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-black">{row.fullName}</td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-black text-[#1455ff]">{row.userCode}</td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5">
                          <div className="font-bold">{row.countryName || "Global"}</div>
                          <div className="text-[11px] font-semibold text-[var(--ujr-muted)]">{row.branchName || "-"}</div>
                        </td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-semibold">{row.branchType}</td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-mono text-[11px] font-semibold">{row.role}</td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5"><StatusPill status={row.status} /></td>
                        <td className="border-b border-r border-[var(--ujr-line)] px-2.5 py-1.5 font-mono text-[11px]">{row.lastActivityAction ?? "-"}</td>
                        <td className="border-b border-[var(--ujr-line)] px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <button className="ujr-icon-btn" type="button"><Eye className="h-4 w-4" /></button>
                            <button className="ujr-icon-btn" type="button"><MoreVertical className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-[var(--ujr-muted)]">No user journal records found for the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--ujr-title)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {filteredRows.length ? pageStart + 1 : 0} to {pageEnd} of {filteredRows.length} entries
              </div>
              <div className="flex items-center gap-3">
                <select className="ujr-page-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <button className="ujr-page-btn" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(1)}>|&lt;</button>
                <button className="ujr-page-btn" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>&lt;</button>
                <button className="ujr-page-active">{safeCurrentPage} / {pageCount}</button>
                <button className="ujr-page-btn" disabled={safeCurrentPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>&gt;</button>
                <button className="ujr-page-btn" disabled={safeCurrentPage >= pageCount} onClick={() => setCurrentPage(pageCount)}>&gt;|</button>
              </div>
            </div>
          </section>
        </main>
    </div>
  );
}

type ToolbarMenuKey = "filters" | "actions" | "fields" | "more";

type TopToolbarProps = {
  openMenu: ToolbarMenuKey | null;
  setOpenMenu: (menu: ToolbarMenuKey | null) => void;
  data: UserJournalReportResponse | null;
  draftQuery: string;
  setDraftQuery: (value: string) => void;
  draftFromDate: string;
  setDraftFromDate: (value: string) => void;
  draftToDate: string;
  setDraftToDate: (value: string) => void;
  draftShareBy: string;
  setDraftShareBy: (value: string) => void;
  draftStatus: string;
  setDraftStatus: (value: string) => void;
  draftRole: string;
  setDraftRole: (value: string) => void;
  draftCountryId: string;
  setDraftCountryId: (value: string) => void;
  draftBranchId: string;
  setDraftBranchId: (value: string) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  editReport: () => void;
  printReport: () => void;
  exportPdf: () => void;
  exportExcel: () => void;
  emailReport: () => void;
  whatsappReport: () => void;
  shareReport: () => void;
  openNewUser: () => void;
};

function TopToolbar({
  openMenu,
  setOpenMenu,
  data,
  draftQuery,
  setDraftQuery,
  draftFromDate,
  setDraftFromDate,
  draftToDate,
  setDraftToDate,
  draftShareBy,
  setDraftShareBy,
  draftStatus,
  setDraftStatus,
  draftRole,
  setDraftRole,
  draftCountryId,
  setDraftCountryId,
  draftBranchId,
  setDraftBranchId,
  applyFilters,
  resetFilters,
  editReport,
  printReport,
  exportPdf,
  exportExcel,
  emailReport,
  whatsappReport,
  shareReport,
  openNewUser
}: TopToolbarProps) {
  function toggle(menu: ToolbarMenuKey) {
    setOpenMenu(openMenu === menu ? null : menu);
  }

  return (
    <div className="ujr-toolbar">
      <button className="ujr-primary-btn h-9 px-3 text-xs" type="button" onClick={openNewUser}>
        <UserPlus className="h-4 w-4" /> New User
      </button>

      <div className="ujr-menu-wrap">
        <ToolbarButton active={openMenu === "filters"} icon={Filter} label="Filters" onClick={() => toggle("filters")} />
        {openMenu === "filters" ? (
          <DropdownPanel widthClass="w-[min(700px,calc(100vw-2rem))]">
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="lg:col-span-2">
                <FieldLabel icon={Search} label="Search" />
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ujr-muted)]" />
                  <input
                    className="ujr-input pr-9"
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Search user, ID, country, branch, role, permission..."
                  />
                </div>
              </label>

              <div>
                <FieldLabel icon={Calendar} label="Date Range" />
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <DateBox label="From Date" value={draftFromDate} onChange={setDraftFromDate} />
                  <DateBox label="To Date" value={draftToDate} onChange={setDraftToDate} />
                </div>
              </div>

              <SelectField
                icon={SlidersHorizontal}
                label="Share By"
                value={draftShareBy}
                onChange={setDraftShareBy}
                options={[
                  { value: "all", label: "All Share By" },
                  { value: "global", label: "Global" },
                  { value: "country", label: "Country" },
                  { value: "branch", label: "Branch" }
                ]}
              />

              <SelectField
                icon={ShieldCheck}
                label="Status"
                value={draftStatus}
                onChange={setDraftStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]}
              />

              <SelectField
                icon={Shield}
                label="Role"
                value={draftRole}
                onChange={setDraftRole}
                options={[{ value: "all", label: "All Roles" }, ...(data?.filters.roles ?? [])]}
              />

              <SelectField
                icon={Globe2}
                label="Country"
                value={draftCountryId}
                onChange={setDraftCountryId}
                options={[{ value: "all", label: "All Countries" }, ...(data?.filters.countries ?? [])]}
              />

              <SelectField
                icon={Building2}
                label="Branch"
                value={draftBranchId}
                onChange={setDraftBranchId}
                options={[{ value: "all", label: "All Branches" }, ...(data?.filters.branches ?? [])]}
              />
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[var(--ujr-line)] pt-3">
              <button className="ujr-secondary-btn px-5" type="button" onClick={resetFilters}>
                <RefreshCw className="h-4 w-4" /> Reset
              </button>
              <button className="ujr-primary-btn px-5" type="button" onClick={applyFilters}>
                <Filter className="h-4 w-4" /> Apply Filters
              </button>
            </div>
          </DropdownPanel>
        ) : null}
      </div>

      <div className="ujr-menu-wrap">
        <ToolbarButton active={openMenu === "actions"} icon={Settings} label="Actions" onClick={() => toggle("actions")} />
        {openMenu === "actions" ? (
          <DropdownPanel widthClass="w-56">
            <MenuActionButton icon={UserPlus} label="New User" onClick={openNewUser} />
            <MenuActionButton icon={Filter} label="Apply Filters" onClick={applyFilters} />
            <MenuActionButton icon={RefreshCw} label="Reset Filters" onClick={resetFilters} />
            <MenuActionButton icon={Eye} label="Focus Table" onClick={() => document.querySelector(".ujr-table-card")?.scrollIntoView({ behavior: "smooth" })} />
          </DropdownPanel>
        ) : null}
      </div>

      <div className="ujr-menu-wrap">
        <ToolbarButton active={openMenu === "fields"} icon={Grid2X2} label="Fields" onClick={() => toggle("fields")} />
        {openMenu === "fields" ? (
          <DropdownPanel widthClass="w-[min(360px,calc(100vw-2rem))]">
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckOption checked icon={Users} label="User ID / Name" />
              <CheckOption checked icon={Shield} label="Role" />
              <CheckOption checked icon={Globe2} label="Country / Branch" />
              <CheckOption checked icon={ShieldCheck} label="Status" />
              <CheckOption checked icon={Building2} label="Branch Type" />
              <CheckOption checked icon={SlidersHorizontal} label="Share By" />
            </div>
          </DropdownPanel>
        ) : null}
      </div>

      <div className="ujr-menu-wrap">
        <ToolbarButton active={openMenu === "more"} icon={MoreVertical} label="More" onClick={() => toggle("more")} />
        {openMenu === "more" ? (
          <DropdownPanel widthClass="w-60" alignRight>
            <MenuActionButton icon={Edit3} label="Edit" onClick={editReport} />
            <MenuActionButton icon={Printer} label="Print" onClick={printReport} />
            <MenuActionButton icon={Printer} label="Export PDF" onClick={exportPdf} />
            <MenuActionButton icon={Download} label="Export CSV" onClick={exportExcel} />
            <MenuActionButton icon={Mail} label="Email" onClick={emailReport} />
            <MenuActionButton icon={MessageCircle} label="WhatsApp" onClick={whatsappReport} />
            <MenuActionButton icon={Share2} label="Share" onClick={shareReport} />

            <div className="mt-2 border-t border-[var(--ujr-line)] pt-2">
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--ujr-muted)]">
                <Bookmark className="h-4 w-4" /> Saved Filters
              </div>
              <button className="ujr-saved-filter" type="button" onClick={applyFilters}>
                Current draft filters
              </button>
              <button className="ujr-saved-filter" type="button" onClick={resetFilters}>
                Clear all filters
              </button>
            </div>
          </DropdownPanel>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={cn("ujr-toolbar-btn", active ? "ujr-toolbar-btn-active" : "")} type="button" onClick={onClick}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}

function DropdownPanel({
  children,
  widthClass,
  alignRight = false
}: {
  children: React.ReactNode;
  widthClass: string;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("ujr-dropdown-panel", widthClass, alignRight ? "right-0" : "left-0")}>
      {children}
    </div>
  );
}

function SelectField({
  icon,
  label,
  value,
  onChange,
  options
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
}) {
  return (
    <label>
      <FieldLabel icon={icon} label={label} />
      <select className="ujr-input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => (
          <option key={`${label}-${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MenuActionButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="ujr-menu-action" type="button" onClick={onClick}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function UserJournalStyles() {
  return (
    <style>{`
      .ujr-shell {
        --ujr-bg:#eef5ff;
        --ujr-card:rgba(255,255,255,.96);
        --ujr-soft:rgba(255,255,255,.72);
        --ujr-line:#d9e4f5;
        --ujr-title:#0a1028;
        --ujr-text:#17213c;
        --ujr-muted:#64728b;
        --ujr-table-head:#f0f5ff;
        --ujr-row-hover:#f7faff;
        font-family:Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .dark .ujr-shell,
      .ujr-shell[data-theme="dark"] {
        --ujr-bg:#071120;
        --ujr-card:#101b2f;
        --ujr-soft:#0c1728;
        --ujr-line:#24344c;
        --ujr-title:#f8fafc;
        --ujr-text:#dbe7f7;
        --ujr-muted:#90a4c2;
        --ujr-table-head:#152238;
        --ujr-row-hover:#182842;
      }
      .ujr-filter-card,
      .ujr-table-card {
        background:var(--ujr-card);
        border-color:var(--ujr-line);
      }
      .ujr-input {
        height:34px;
        width:100%;
        border-radius:8px;
        border:1px solid var(--ujr-line);
        background:var(--ujr-card);
        padding:0 12px;
        color:var(--ujr-title);
        font-size:11px;
        font-weight:650;
        outline:none;
        box-shadow:0 2px 10px rgba(15,23,42,.03);
      }
      .ujr-input:focus {
        border-color:#245cff;
        box-shadow:0 0 0 2px rgba(36,92,255,.16);
      }
      .ujr-primary-btn,
      .ujr-secondary-btn {
        display:flex;
        height:34px;
        align-items:center;
        justify-content:center;
        gap:7px;
        border-radius:8px;
        font-weight:900;
        box-shadow:0 8px 18px rgba(37,99,235,.2);
      }
      .ujr-primary-btn {
        background:#1f5eff;
        color:#fff;
      }
      .ujr-secondary-btn {
        border:1px solid var(--ujr-line);
        background:var(--ujr-card);
        color:var(--ujr-title);
        box-shadow:0 6px 14px rgba(15,23,42,.06);
      }
      .ujr-icon-btn,
      .ujr-page-btn,
      .ujr-page-active,
      .ujr-page-select {
        border:1px solid var(--ujr-line);
        background:var(--ujr-card);
        color:var(--ujr-title);
      }
      .ujr-icon-btn {
        display:grid;
        height:30px;
        width:34px;
        place-items:center;
        border-radius:7px;
        color:#1455ff;
      }
      .ujr-page-btn,
      .ujr-page-active {
        height:34px;
        min-width:34px;
        border-radius:8px;
        font-weight:850;
      }
      .ujr-page-active {
        background:#1f5eff;
        color:white;
        border-color:#1f5eff;
      }
      .ujr-page-select {
        height:34px;
        border-radius:8px;
        padding:0 34px 0 10px;
        font-weight:750;
      }
      .ujr-toolbar {
        position:relative;
        z-index:20;
        display:flex;
        flex-wrap:wrap;
        justify-content:flex-end;
        gap:7px;
      }
      .ujr-menu-wrap {
        position:relative;
      }
      .ujr-toolbar-btn {
        display:flex;
        height:34px;
        align-items:center;
        gap:6px;
        border-radius:9px;
        border:1px solid var(--ujr-line);
        background:var(--ujr-card);
        padding:0 10px;
        color:var(--ujr-title);
        font-size:11px;
        font-weight:900;
        box-shadow:0 6px 16px rgba(15,23,42,.06);
      }
      .ujr-toolbar-btn:hover,
      .ujr-toolbar-btn-active {
        border-color:#245cff;
        background:rgba(36,92,255,.08);
        color:#1455ff;
      }
      .ujr-dropdown-panel {
        position:absolute;
        top:calc(100% + 8px);
        z-index:50;
        border:1px solid var(--ujr-line);
        border-radius:12px;
        background:var(--ujr-card);
        padding:12px;
        color:var(--ujr-title);
        box-shadow:0 18px 44px rgba(15,23,42,.16);
      }
      .ujr-menu-action {
        display:flex;
        width:100%;
        align-items:center;
        gap:8px;
        border-radius:8px;
        padding:8px 9px;
        color:var(--ujr-title);
        font-size:12px;
        font-weight:850;
        text-align:left;
      }
      .ujr-menu-action:hover,
      .ujr-saved-filter:hover {
        background:rgba(36,92,255,.08);
        color:#1455ff;
      }
      .ujr-saved-filter {
        display:block;
        width:100%;
        border-radius:8px;
        padding:7px 8px;
        text-align:left;
        font-size:11px;
        font-weight:800;
        color:var(--ujr-title);
      }
      @media print {
        .ujr-shell { margin:0 !important; }
        .ujr-toolbar,
        .ujr-primary-btn,
        .ujr-secondary-btn,
        .ujr-icon-btn { display:none !important; }
      }
    `}</style>
  );
}

function FieldLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-black text-[var(--ujr-title)]">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function DateBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <div className="mb-1.5 text-xs font-black text-[var(--ujr-title)]">{label}</div>
      <input className="ujr-input" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CheckOption({ icon: Icon, label, checked }: { icon: React.ComponentType<{ className?: string }>; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-xs font-black text-[var(--ujr-title)]">
      <span className={cn("grid h-[18px] w-[18px] place-items-center rounded-[4px] text-[11px]", checked ? "bg-[#1f5eff] text-white" : "border border-[var(--ujr-line)]")}>
        {checked ? "✓" : ""}
      </span>
      <Icon className="h-4 w-4 text-[var(--ujr-title)]" />
      {label}
    </label>
  );
}
function JournalMetric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "violet" | "green" | "blue" | "orange" | "cyan" }) {
  const tones = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-200",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200"
  };
  return (
    <div className="flex min-h-[60px] items-center gap-2.5 rounded-[10px] border border-[var(--ujr-line)] bg-[var(--ujr-card)] px-3 shadow-[0_6px_16px_rgba(15,23,42,.05)]">
      <div className={cn("grid h-9 w-9 place-items-center rounded-[9px]", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wide text-[var(--ujr-title)]">{label}</div>
        <div className="mt-0.5 text-[20px] font-black leading-none text-[var(--ujr-title)]">{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

function AdminInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--ujr-line)] bg-[var(--ujr-soft)] px-2.5 py-2">
      <div className="text-[9px] font-black uppercase tracking-wide text-[var(--ujr-muted)]">{label}</div>
      <div className="mt-0.5 truncate text-[12px] font-black text-[var(--ujr-title)]" title={value}>{value || "-"}</div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize", tone)}>{status}</span>;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "-"}</div>
    </div>
  );
}

function ActivityCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

