"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Expand, Eye, FileSpreadsheet, FileText, MoreVertical, PencilLine, Printer, Search, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportFilterMenu } from "@/components/reports/report-filter-menu";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportTd, ReportTh } from "@/components/reports/report-primitives";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/i18n/languages";

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
  recentMovements: Array<{
    source: "ledger" | "roznamcha";
    referenceNo: string | null;
    entryDate: string;
    debit: number;
    credit: number;
    currency: string;
    usdRate: number;
    usdAmount: number;
  }>;
};

type AccountGeneralReportResponse = {
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    countryAccounts: number;
    branchAccounts: number;
    adminAccounts: number;
    totalLedgers: number;
    activeLedgers: number;
    openingBalanceTotal: number;
    debitTotal: number;
    creditTotal: number;
    currentBalanceTotal: number;
    journalActivityTotal: number;
    recentUpdates: number;
  };
  workspace: {
    companyId: string | null;
    companyName: string;
    companyCode: string;
    companyOwner: string;
  };
  rows: AccountGeneralReportRow[];
  generatedAt: string;
};

type SessionInfo = {
  permissions: string[];
  roles: string[];
  scopes?: {
    countryIds: string[];
    countryBranchIds: string[];
    cityBranchIds: string[];
    isSuperAdmin: boolean;
  };
};

type AccountDashboardScope = "super_admin" | "country" | "branch";

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fmtNumber(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadTextFile(filename: string, contents: string, mime = "text/plain") {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildAccountOption(row: AccountGeneralReportRow): SearchSelectOption {
  return {
    value: row.accountId,
    label: `${row.accountCode} - ${row.accountName}`,
    keywords: [
      row.accountCode,
      row.rawAccountCode ?? "",
      row.customerNumber ?? "",
      row.countrySerialNumber ?? "",
      row.branchSerialNumber ?? "",
      row.manualReferenceNumber ?? "",
      row.accountName,
      row.journalCode,
      row.branchName,
      row.branchCode,
      row.countryName,
      row.countryCode,
      row.cityName,
      row.cityCode,
      row.currency,
      row.companyName
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function buildBranchOption(row: AccountGeneralReportRow) {
  return {
    value: row.branchCode,
    label: `${row.branchName} (${row.branchCode})`,
    keywords: [row.branchName, row.branchCode, row.countryName, row.cityName].filter(Boolean).join(" ")
  };
}

function safeRowText(row: AccountGeneralReportRow) {
  return normalizeSearch(
    [
      row.accountCode,
      row.rawAccountCode ?? "",
      row.customerNumber ?? "",
      row.countrySerialNumber ?? "",
      row.branchSerialNumber ?? "",
      row.manualReferenceNumber ?? "",
      row.accountName,
      row.journalCode,
      row.ledgerName,
      row.branchName,
      row.branchCode,
      row.countryName,
      row.countryCode,
      row.cityName,
      row.cityCode,
      row.currency,
      row.accountCategory,
      row.subType,
      row.status,
      row.companyName,
      row.companyOwner,
      row.latestJournalNo ?? "",
      row.recentActivityLabel ?? ""
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function rowTone(balance: number) {
  if (!Number.isFinite(balance) || balance === 0) return "text-foreground";
  return balance < 0 ? "text-red-600" : "text-emerald-600";
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value) && value !== "-")).size;
}

function groupCounts(rows: AccountGeneralReportRow[], getKey: (row: AccountGeneralReportRow) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row) || "-";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function groupSums(
  rows: AccountGeneralReportRow[],
  getKey: (row: AccountGeneralReportRow) => string,
  getValue: (row: AccountGeneralReportRow) => number
) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row) || "-";
    map.set(key, (map.get(key) ?? 0) + getValue(row));
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);
}

function MiniChart({
  title,
  rows,
  formatValue
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length ? (
          rows.map((row) => (
            <div key={`${title}-${row.label}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{row.label}</span>
                <span className="font-mono text-muted-foreground">{formatValue ? formatValue(row.value) : row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${Math.max(8, (Math.abs(row.value) / max) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No chart data available.</div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountRowActionsMenu({
  row,
  disabled,
  onView,
  onEdit,
  onOpenAccount,
  onOpenLedger,
  onViewJournal,
  onPrint,
  onPdf,
  onExcel,
  onDelete
}: {
  row: AccountGeneralReportRow;
  disabled?: boolean;
  onView: () => void;
  onEdit: () => void;
  onOpenAccount: () => void;
  onOpenLedger: () => void;
  onViewJournal: () => void;
  onPrint: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onDelete?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onMouseDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  function item(
    label: string,
    icon: ReactNode,
    action: () => void,
    tone?: "danger",
    hidden = false
  ) {
    if (hidden) return null;
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
          tone === "danger" ? "text-red-600 hover:bg-red-50" : ""
        )}
        onClick={() => {
          setOpen(false);
          action();
        }}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={() => setOpen((value) => !value)}>
        <MoreVertical className="h-4 w-4" aria-hidden />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-lg border bg-background shadow-lg">
          {item("View", <Eye className="h-4 w-4" aria-hidden />, onView)}
          {item("Edit", <PencilLine className="h-4 w-4" aria-hidden />, onEdit)}
          {item("Ledger", <FileText className="h-4 w-4" aria-hidden />, onOpenLedger)}
          {item("Journal", <Printer className="h-4 w-4" aria-hidden />, onViewJournal)}
          {item("Print", <Printer className="h-4 w-4" aria-hidden />, onPrint)}
          {item("PDF", <Download className="h-4 w-4" aria-hidden />, onPdf)}
          {item("Excel", <FileSpreadsheet className="h-4 w-4" aria-hidden />, onExcel)}
          {onDelete
            ? item("Delete", <Trash2 className="h-4 w-4" aria-hidden />, onDelete, "danger")
            : null}
        </div>
      ) : null}
    </div>
  );
}

export function AccountGeneralReportView({
  lang,
  pageTitle,
  subtitle,
  initialAccountId,
  highlightCreated = false,
  showProfilePanel = true
}: {
  lang: SupportedLanguage;
  pageTitle: string;
  subtitle?: string | null;
  initialAccountId?: string | null;
  highlightCreated?: boolean;
  showProfilePanel?: boolean;
}) {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDeleting, setLoadingDeleting] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [data, setData] = useState<AccountGeneralReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [draftAccountId, setDraftAccountId] = useState("all");
  const [draftCountryName, setDraftCountryName] = useState("all");
  const [draftBranchCode, setDraftBranchCode] = useState("all");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("all");
  const [countryName, setCountryName] = useState("all");
  const [branchCode, setBranchCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dashboardScope, setDashboardScope] = useState<AccountDashboardScope>("super_admin");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(initialAccountId ?? null);
  const [accountToDelete, setAccountToDelete] = useState<AccountGeneralReportRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiGet<SessionInfo>("/api/erp/auth/session")
      .then((info) => {
        if (!cancelled) setSession(info);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<AccountGeneralReportResponse>("/api/erp/accounting/reports/accounts/general?limit=500");
        if (!cancelled) {
          setData(res);
          if (initialAccountId) setSelectedAccountId(initialAccountId);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load account report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialAccountId]);

  useEffect(() => {
    if (!actionsOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActionsOpen(false);
    }

    function onMouseDown(e: MouseEvent) {
      const root = actionsRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setActionsOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [actionsOpen]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const isSuperAdmin = session?.scopes?.isSuperAdmin ?? session?.roles.includes("super_admin") ?? false;

  useEffect(() => {
    if (!session) return;
    if (isSuperAdmin) return;
    if (session.scopes?.cityBranchIds?.length) setDashboardScope("branch");
    else setDashboardScope("country");
  }, [isSuperAdmin, session]);

  const accountOptions = useMemo(() => rows.map(buildAccountOption), [rows]);
  const countryOptions = useMemo(() => {
    const map = new Map<string, SearchSelectOption>();
    for (const row of rows) {
      if (!row.countryName || row.countryName === "-") continue;
      if (!map.has(row.countryName)) {
        map.set(row.countryName, {
          value: row.countryName,
          label: `${row.countryName}${row.countryCode && row.countryCode !== "-" ? ` (${row.countryCode})` : ""}`,
          keywords: [row.countryName, row.countryCode].filter(Boolean).join(" ")
        });
      }
    }
    return [{ value: "all", label: "All Countries", keywords: "all countries" }, ...map.values()];
  }, [rows]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; keywords: string }>();
    for (const row of rows) {
      if (!map.has(row.branchCode)) {
        const option = buildBranchOption(row);
        map.set(row.branchCode, option);
      }
    }
    return [{ value: "all", label: "All Branches", keywords: "all branches" }, ...map.values()];
  }, [rows]);

  const scopedRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (dashboardScope === "super_admin") return true;
        if (dashboardScope === "country") return row.branchType === "Country" || row.branchType === "Main Branch" || row.branchType === "City Branch";
        return row.branchType === "Main Branch" || row.branchType === "City Branch";
      })
      .filter((row) => {
        if (countryName !== "all") return row.countryName === countryName;
        return true;
      });
  }, [countryName, dashboardScope, rows]);

  const filteredRows = useMemo(() => {
    const q = normalizeSearch(query);
    return scopedRows
      .filter((row) => (accountId !== "all" ? row.accountId === accountId : true))
      .filter((row) => (branchCode !== "all" ? row.branchCode === branchCode : true))
      .filter((row) => (status !== "all" ? row.status === status : true))
      .filter((row) => {
        if (fromDate && row.createdAt.slice(0, 10) < fromDate) return false;
        if (toDate && row.createdAt.slice(0, 10) > toDate) return false;
        if (!q) return true;
        return safeRowText(row).includes(q);
      });
  }, [accountId, branchCode, fromDate, query, scopedRows, status, toDate]);

  useEffect(() => {
    if (!selectedAccountId && filteredRows.length) {
      setSelectedAccountId(filteredRows[0]!.accountId);
    }
  }, [filteredRows, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) return;
    if (filteredRows.some((row) => row.accountId === selectedAccountId)) return;
    if (filteredRows.length) {
      setSelectedAccountId(filteredRows[0]!.accountId);
    } else {
      setSelectedAccountId(null);
    }
  }, [filteredRows, selectedAccountId]);

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.accountId === selectedAccountId) ?? filteredRows[0] ?? null,
    [filteredRows, selectedAccountId]
  );
  const highlightedAccountId = highlightCreated ? initialAccountId ?? null : null;

  const visibleSummary = useMemo(() => {
    const totalAccounts = filteredRows.length;
    const activeAccounts = filteredRows.filter((row) => row.status === "active").length;
    const totalLedgers = filteredRows.reduce((sum, row) => sum + row.linkedLedgerCount, 0);
    const activeLedgers = filteredRows.filter((row) => row.ledgerStatus === "active").length;
    const totalCountries = uniqueCount(filteredRows.map((row) => row.countryName));
    const totalBranches = uniqueCount(filteredRows.map((row) => row.branchCode));
    const debitTotal = filteredRows.reduce((sum, row) => sum + row.debitTotal, 0);
    const creditTotal = filteredRows.reduce((sum, row) => sum + row.creditTotal, 0);
    const totalBalance = filteredRows.reduce((sum, row) => sum + row.currentBalance, 0);
    const totalJournalActivity = filteredRows.reduce((sum, row) => sum + row.journalActivityCount, 0);
    const categoryCount = (category: string) =>
      filteredRows.filter((row) => row.accountCategory.toLowerCase() === category).length;

    return {
      totalAccounts,
      activeAccounts,
      totalLedgers,
      activeLedgers,
      totalCountries,
      totalBranches,
      debitTotal,
      creditTotal,
      totalBalance,
      totalJournalActivity,
      assetAccounts: categoryCount("asset"),
      expenseAccounts: categoryCount("expense"),
      incomeAccounts: categoryCount("income"),
      liabilityAccounts: categoryCount("liability")
    };
  }, [filteredRows]);

  const dashboardCards = useMemo(() => {
    if (dashboardScope === "branch") {
      return [
        { label: "Total Accounts", value: visibleSummary.totalAccounts },
        { label: "Asset Accounts", value: visibleSummary.assetAccounts },
        { label: "Expense Accounts", value: visibleSummary.expenseAccounts },
        { label: "Income Accounts", value: visibleSummary.incomeAccounts },
        { label: "Liability Accounts", value: visibleSummary.liabilityAccounts }
      ];
    }

    if (dashboardScope === "country") {
      return [
        { label: "Total Accounts", value: visibleSummary.totalAccounts },
        { label: "Total Debit", value: fmtNumber(visibleSummary.debitTotal) },
        { label: "Total Credit", value: fmtNumber(visibleSummary.creditTotal) },
        { label: "Net Balance", value: fmtNumber(visibleSummary.totalBalance) },
        { label: "Active Accounts", value: visibleSummary.activeAccounts }
      ];
    }

    return [
      { label: "Total Accounts", value: visibleSummary.totalAccounts },
      { label: "Total Countries", value: visibleSummary.totalCountries },
      { label: "Total Branches", value: visibleSummary.totalBranches },
      { label: "Total Debit", value: fmtNumber(visibleSummary.debitTotal) },
      { label: "Total Credit", value: fmtNumber(visibleSummary.creditTotal) },
      { label: "Total Balance (USD)", value: fmtNumber(visibleSummary.totalBalance) }
    ];
  }, [dashboardScope, visibleSummary]);

  const chartGroups = useMemo(() => {
    if (dashboardScope === "branch") {
      return [
        { title: "Accounts by Category", rows: groupCounts(filteredRows, (row) => row.accountCategory) },
        { title: "Accounts by Currency", rows: groupCounts(filteredRows, (row) => row.currency) },
        { title: "Accounts by Status", rows: groupCounts(filteredRows, (row) => titleCase(row.status)) },
        {
          title: "Branch Financial Summary",
          rows: [
            { label: "Debit", value: visibleSummary.debitTotal },
            { label: "Credit", value: visibleSummary.creditTotal },
            { label: "Balance", value: visibleSummary.totalBalance }
          ],
          formatValue: fmtNumber
        }
      ];
    }

    if (dashboardScope === "country") {
      return [
        { title: "Main Branch-wise Summary", rows: groupCounts(filteredRows, (row) => row.mainBranchName ?? row.branchName) },
        { title: "City Branch-wise Summary", rows: groupCounts(filteredRows, (row) => row.cityBranchName ?? row.cityName) },
        {
          title: "Debit / Credit Summary",
          rows: [
            { label: "Debit", value: visibleSummary.debitTotal },
            { label: "Credit", value: visibleSummary.creditTotal }
          ],
          formatValue: fmtNumber
        },
        {
          title: "Balance Summary",
          rows: [{ label: "Net Balance", value: visibleSummary.totalBalance }],
          formatValue: fmtNumber
        }
      ];
    }

    return [
      { title: "Country-wise Summary", rows: groupSums(filteredRows, (row) => row.countryName, (row) => row.currentBalance), formatValue: fmtNumber },
      { title: "Currency-wise Summary", rows: groupSums(filteredRows, (row) => row.currency, (row) => row.currentBalance), formatValue: fmtNumber },
      { title: "Accounts by Category", rows: groupCounts(filteredRows, (row) => row.accountCategory) },
      { title: "Accounts by Status", rows: groupCounts(filteredRows, (row) => titleCase(row.status)) }
    ];
  }, [dashboardScope, filteredRows, visibleSummary.creditTotal, visibleSummary.debitTotal, visibleSummary.totalBalance]);

  const canDelete = Boolean(session?.permissions.includes("accounts:delete") || session?.roles.includes("super_admin"));

  function resetFilters() {
    setDraftQuery("");
    setDraftAccountId("all");
    setDraftCountryName("all");
    setDraftBranchCode("all");
    setDraftStatus("all");
    setDraftFromDate("");
    setDraftToDate("");
    setQuery("");
    setAccountId("all");
    setCountryName("all");
    setBranchCode("all");
    setStatus("all");
    setFromDate("");
    setToDate("");
  }

  function applyFilters() {
    setQuery(draftQuery);
    setAccountId(draftAccountId);
    setCountryName(draftCountryName);
    setBranchCode(draftBranchCode);
    setStatus(draftStatus);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
  }

  function exportCsv(scope: "filtered" | "selected" = "filtered") {
    const exportRows = scope === "selected" && selectedRow ? [selectedRow] : filteredRows;
    const csvRows: string[][] = [
      [
        "Account Code",
        "Manual Reference Number",
        "Country Serial Number",
        "Branch Serial Number",
        "Account Name",
        "Journal Code",
        "Branch",
        "Country",
        "City",
        "Branch Type",
        "Currency",
        "Category",
        "Sub Type",
        "Status",
        "Created Date",
        "Opening Balance",
        "Debit Total",
        "Credit Total",
        "Current Balance"
      ]
    ];

    for (const row of exportRows) {
      csvRows.push([
        row.accountCode,
        row.manualReferenceNumber ?? "",
        row.countrySerialNumber ?? "",
        row.branchSerialNumber ?? "",
        row.accountName,
        row.journalCode,
        row.branchName,
        row.countryName,
        row.cityName,
        row.branchType,
        row.currency,
        row.accountCategory,
        row.subType,
        row.status,
        row.createdAt,
        String(row.openingBalance),
        String(row.debitTotal),
        String(row.creditTotal),
        String(row.currentBalance)
      ]);
    }

    const csv = csvRows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\r\n");
    downloadTextFile(`new-account-general-report_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  async function deleteAccount(row: AccountGeneralReportRow) {
    if (!canDelete) return;
    if (!window.confirm(`Delete account ${row.accountCode} - ${row.accountName}?`)) return;
    setLoadingDeleting(true);
    try {
      await apiDelete(`/api/erp/accounting/accounts/${row.accountId}`);
      setData((current) =>
        current
          ? {
              ...current,
              rows: current.rows.filter((item) => item.accountId !== row.accountId),
              summary: {
                ...current.summary,
                totalAccounts: Math.max(0, current.summary.totalAccounts - 1)
              }
            }
          : current
      );
      if (selectedAccountId === row.accountId) {
        const next = filteredRows.find((item) => item.accountId !== row.accountId) ?? null;
        setSelectedAccountId(next?.accountId ?? null);
      }
    } finally {
      setLoadingDeleting(false);
    }
  }

  function openFullScreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {
        setExpandedView((current) => !current);
      });
    } else {
      void document.exitFullscreen().catch(() => {
        setExpandedView((current) => !current);
      });
    }
  }

  const containerClassName = expandedView ? "fixed inset-0 z-50 overflow-auto bg-background p-4 md:p-6" : "space-y-6";

  return (
    <div className={containerClassName}>
      <ReportPageHeader
        title={pageTitle}
        subtitle={subtitle ?? "All created accounts with live balances, journals, and linked ledger activity."}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={openFullScreen} disabled={loading}>
              <Expand className="h-4 w-4" aria-hidden />
              {expandedView ? "Shrink View" : "Open Full Screen"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={loading}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
            <div className="relative" ref={actionsRef}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Report actions"
                disabled={loading}
                onClick={() => setActionsOpen((value) => !value)}
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>

              {actionsOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border bg-background shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      window.print();
                    }}
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                    setActionsOpen(false);
                    window.print();
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  PDF Export
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      exportCsv();
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    Excel Export
                  </button>
                </div>
              ) : null}
            </div>

            <ReportFilterMenu ariaLabel="Account filters" disabled={loading}>
              <div className="border-b bg-muted/10 px-3 py-2 text-sm font-semibold">Account Filters</div>
              <div className="space-y-3 p-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      className="h-9 pl-9 text-xs"
                      value={draftQuery}
                      onChange={(e) => setDraftQuery(e.target.value)}
                      placeholder="Search code, name, journal, branch, or city"
                    />
                  </div>
                </div>

                <SearchSelect
                  label="Account"
                  value={draftAccountId}
                  placeholder="All accounts"
                  options={[{ value: "all", label: "All Accounts", keywords: "all accounts" }, ...accountOptions]}
                  onValueChange={setDraftAccountId}
                  disabled={loading}
                />

                <SearchSelect
                  label="Country"
                  value={draftCountryName}
                  placeholder="All countries"
                  options={countryOptions}
                  onValueChange={setDraftCountryName}
                  disabled={loading || (!isSuperAdmin && dashboardScope !== "super_admin")}
                />

                <SearchSelect
                  label="Branch"
                  value={draftBranchCode}
                  placeholder="All branches"
                  options={branchOptions}
                  onValueChange={setDraftBranchCode}
                  disabled={loading}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">From Date</Label>
                    <Input type="date" className="h-9 text-xs" value={draftFromDate} onChange={(e) => setDraftFromDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">To Date</Label>
                    <Input type="date" className="h-9 text-xs" value={draftToDate} onChange={(e) => setDraftToDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button type="button" size="sm" onClick={applyFilters}>
                    Apply
                  </Button>
                </div>
              </div>
            </ReportFilterMenu>
          </>
        }
      />

      <Card className="rounded-lg">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              Account Reporting System
            </div>
            <div className="text-sm font-semibold">
              {dashboardScope === "super_admin"
                ? "Level 1 - Super Admin Account Dashboard"
                : dashboardScope === "country"
                  ? "Level 2 - Country Account Dashboard"
                  : "Level 3 - Branch Account Dashboard"}
            </div>
            <div className="text-xs text-muted-foreground">
              Scope-aware accounts, ledgers, balances, country/branch hierarchy, and activity reporting.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">Dashboard Level</Label>
            <select
              className="h-9 rounded-lg border bg-background px-3 text-sm font-semibold shadow-sm"
              value={dashboardScope}
              onChange={(event) => {
                const next = event.target.value as AccountDashboardScope;
                setDashboardScope(next);
                setCountryName("all");
                setDraftCountryName("all");
                setBranchCode("all");
                setDraftBranchCode("all");
              }}
            >
              <option value="super_admin" disabled={!isSuperAdmin}>
                Super Admin
              </option>
              <option value="country">Country</option>
              <option value="branch">Branch</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {highlightCreated && selectedRow ? (
        <Card className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-extrabold">Account Created Successfully</div>
              <div className="mt-1 text-xs">
                New account is now selected in Account Register. Country, City Branch, Company, Balance, Status, and Created Date are visible below.
              </div>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <span><b>Account:</b> {selectedRow.accountCode}</span>
              <span><b>Country:</b> {selectedRow.countryName}</span>
              <span><b>City Branch:</b> {selectedRow.cityBranchName ?? selectedRow.cityName}</span>
              <span><b>Company:</b> {selectedRow.companyName}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="h-10 pl-9 text-sm"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setDraftQuery(event.target.value);
              }}
              placeholder="Search account no, account name, country, branch, role, status..."
              aria-label="Account search"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background px-3 py-1 font-semibold">
              {filteredRows.length} visible accounts
            </span>
            <span className="rounded-full border bg-background px-3 py-1 font-semibold">
              Filters open from Search / Filters
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardCards.map((card) => (
          <Card key={card.label} className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {chartGroups.map((chart) => (
          <MiniChart key={chart.title} title={chart.title} rows={chart.rows} formatValue={chart.formatValue} />
        ))}
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className={cn("grid gap-6", showProfilePanel ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "xl:grid-cols-1")}>
        <section className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">New Account General Report</h2>
                <p className="text-sm text-muted-foreground">
                  Shows every created account with journal code, balances, and linked ledger activity.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">Generated {fmtDateTime(data?.generatedAt)}</div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1360px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 text-left text-muted-foreground backdrop-blur">
                <tr>
                  <ReportTh className="text-left">Account Number</ReportTh>
                  <ReportTh className="text-left">Account Name</ReportTh>
                  <ReportTh className="text-left">Country</ReportTh>
                  <ReportTh className="text-left">Manual Ref.</ReportTh>
                  <ReportTh className="text-left">Main Branch</ReportTh>
                  <ReportTh className="text-left">City Branch</ReportTh>
                  <ReportTh className="text-left">Branch Code</ReportTh>
                  <ReportTh className="text-left">Company Name</ReportTh>
                  <ReportTh className="text-left">Currency</ReportTh>
                  <ReportTh className="text-right">Debit</ReportTh>
                  <ReportTh className="text-right">Credit</ReportTh>
                  <ReportTh className="text-right">Current Balance</ReportTh>
                  <ReportTh className="text-left">Status</ReportTh>
                  <ReportTh className="text-left">Created</ReportTh>
                  <ReportTh className="text-left">Actions</ReportTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Loading account general report...
                    </td>
                  </tr>
                ) : filteredRows.length ? (
                  filteredRows.map((row) => {
                    const active = row.accountId === selectedRow?.accountId;
                    const highlighted = row.accountId === highlightedAccountId;
                    return (
                      <tr
                        key={row.accountId}
                        className={cn(
                          "border-t transition hover:bg-muted/30",
                          active ? "bg-muted/40" : "",
                          highlighted ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-800" : ""
                        )}
                        onClick={() => setSelectedAccountId(row.accountId)}
                      >
                        <ReportTd className="whitespace-nowrap font-mono text-xs">{row.accountCode}</ReportTd>
                        <ReportTd className="min-w-44 font-medium">
                          <div className="flex flex-col">
                            <span>{row.accountName}</span>
                            <span className="text-xs text-muted-foreground">{row.accountCategory} / {row.subType}</span>
                          </div>
                        </ReportTd>
                        <ReportTd>{row.countryName}</ReportTd>
                        <ReportTd className="whitespace-nowrap font-mono text-xs">{row.manualReferenceNumber ?? "-"}</ReportTd>
                        <ReportTd>{row.mainBranchName ?? (row.branchType === "Main Branch" ? row.branchName : "-")}</ReportTd>
                        <ReportTd>{row.cityBranchName ?? (row.branchType === "City Branch" ? row.branchName : "-")}</ReportTd>
                        <ReportTd className="whitespace-nowrap font-mono text-xs">{row.branchCode}</ReportTd>
                        <ReportTd>{row.companyName}</ReportTd>
                        <ReportTd>{row.currency}</ReportTd>
                        <ReportTd className="text-right font-mono">{fmtNumber(row.debitTotal)}</ReportTd>
                        <ReportTd className="text-right font-mono">{fmtNumber(row.creditTotal)}</ReportTd>
                        <ReportTd className={cn("text-right font-mono font-semibold", rowTone(row.currentBalance))}>
                          {fmtNumber(row.currentBalance)}
                        </ReportTd>
                        <ReportTd>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                              row.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {titleCase(row.status)}
                          </span>
                        </ReportTd>
                        <ReportTd className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(row.createdAt)}</ReportTd>
                        <ReportTd>
                          <AccountRowActionsMenu
                            row={row}
                            disabled={loadingDeleting}
                            onView={() => {
                              if (showProfilePanel) {
                                setSelectedAccountId(row.accountId);
                              } else {
                                router.push(`/dashboard/accounts/view?accountId=${row.accountId}` as Route);
                              }
                            }}
                            onEdit={() => router.push(`/dashboard/accounts/setup?accountId=${row.accountId}` as Route)}
                            onOpenAccount={() => {
                              if (showProfilePanel) {
                                setSelectedAccountId(row.accountId);
                              } else {
                                router.push(`/dashboard/accounts/view?accountId=${row.accountId}` as Route);
                              }
                            }}
                            onOpenLedger={() => {
                              if (row.ledgerId) router.push(`/dashboard/ledger/general-report?ledgerId=${row.ledgerId}` as Route);
                            }}
                            onViewJournal={() => setSelectedAccountId(row.accountId)}
                            onPrint={() => window.print()}
                            onPdf={() => window.print()}
                            onExcel={() => exportCsv("selected")}
                            onDelete={canDelete ? () => void deleteAccount(row) : undefined}
                          />
                        </ReportTd>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={15} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No accounts found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showProfilePanel ? (
        <aside className="h-fit rounded-lg border bg-card xl:sticky xl:top-24">
          <div className="border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Account View Profile</h2>
                <p className="mt-1 text-xs text-muted-foreground">Complete account, branch, audit, and financial profile.</p>
              </div>
              <span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                {selectedRow ? "Selected" : "Empty"}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <Card className="rounded-lg border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-semibold">{data?.workspace.companyName ?? "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Company Code</span>
                    <span className="font-semibold">{data?.workspace.companyCode ?? "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Company Owner</span>
                    <span className="font-semibold">{data?.workspace.companyOwner ?? "-"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
              <PreviewRow label="Account Number" value={selectedRow?.accountCode} />
              <PreviewRow label="Manual Reference" value={selectedRow?.manualReferenceNumber ?? undefined} />
              <PreviewRow label="Country Serial" value={selectedRow?.countrySerialNumber} />
              <PreviewRow label="Branch Serial" value={selectedRow?.branchSerialNumber} />
              <PreviewRow label="Customer Number" value={selectedRow?.customerNumber} />
              <PreviewRow label="Account Name" value={selectedRow?.accountName} />
              <PreviewRow label="Journal Code" value={selectedRow?.journalCode} />
              <PreviewRow label="Account Category" value={selectedRow?.accountCategory} />
              <PreviewRow label="Sub Type" value={selectedRow?.subType} />
              <PreviewRow label="Status" value={selectedRow?.status ? titleCase(selectedRow.status) : "-"} />
              <PreviewRow label="Created Date" value={fmtDateTime(selectedRow?.createdAt)} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Branch Information</h3>
              <PreviewRow label="Main Branch" value={selectedRow?.mainBranchName ?? selectedRow?.branchName} />
              <PreviewRow label="City Branch" value={selectedRow?.cityBranchName ?? selectedRow?.cityName} />
              <PreviewRow label="Branch Code" value={selectedRow?.branchCode} />
              <PreviewRow label="Branch Type" value={selectedRow?.branchType} />
              <PreviewRow label="Ledger Name" value={selectedRow?.ledgerName ?? "-"} />
              <PreviewRow label="Ledger Status" value={selectedRow?.ledgerStatus ? titleCase(selectedRow.ledgerStatus) : "-"} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Country Information</h3>
              <PreviewRow label="Country" value={selectedRow?.countryName} />
              <PreviewRow label="Country Code" value={selectedRow?.countryCode} />
              <PreviewRow label="State / Province" value={selectedRow?.stateName} />
              <PreviewRow label="State Code" value={selectedRow?.stateCode} />
              <PreviewRow label="City" value={selectedRow?.cityName} />
              <PreviewRow label="City Code" value={selectedRow?.cityCode} />
              <PreviewRow label="Currency" value={selectedRow?.currency} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
              <PreviewRow label="Company" value={selectedRow?.companyName} />
              <PreviewRow label="Company Code" value={selectedRow?.companyCode} />
              <PreviewRow label="Company Owner" value={selectedRow?.companyOwner} />
              <PreviewRow label="Branch Contact" value="Linked from branch profile" />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Financial Summary</h3>
              <PreviewRow label="Opening Balance" value={selectedRow ? fmtNumber(selectedRow.openingBalance) : "-"} />
              <PreviewRow label="Debit Total" value={selectedRow ? fmtNumber(selectedRow.debitTotal) : "-"} />
              <PreviewRow label="Credit Total" value={selectedRow ? fmtNumber(selectedRow.creditTotal) : "-"} />
              <PreviewRow label="Current Balance" value={selectedRow ? fmtNumber(selectedRow.currentBalance) : "-"} tone={selectedRow ? rowTone(selectedRow.currentBalance) : undefined} />
              <PreviewRow label="Linked Ledger Entries" value={selectedRow ? String(selectedRow.linkedLedgerCount) : "-"} />
              <PreviewRow label="Journal Activity" value={selectedRow ? String(selectedRow.journalActivityCount) : "-"} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Audit Information</h3>
              <PreviewRow label="Latest Journal" value={selectedRow?.latestJournalNo ?? "-"} />
              <PreviewRow label="Recent Activity" value={selectedRow?.recentActivityLabel ?? "-"} />
              <PreviewRow label="Recent Activity At" value={fmtDateTime(selectedRow?.recentActivityAt)} />
              <PreviewRow label="Last Ledger Activity" value={fmtDateTime(selectedRow?.latestActivityAt)} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Journal Preview</h3>
              {selectedRow?.recentMovements.length ? (
                <div className="space-y-2">
                  {selectedRow.recentMovements.map((movement, index) => (
                    <div key={`${movement.source}-${movement.referenceNo ?? index}`} className="rounded-lg border bg-background p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold uppercase tracking-wide text-muted-foreground">{movement.source}</span>
                        <span className="text-muted-foreground">{fmtDateTime(movement.entryDate)}</span>
                      </div>
                      <div className="mt-2 grid gap-1">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Ref</span>
                          <span className="font-medium">{movement.referenceNo ?? "-"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Debit</span>
                          <span className="font-medium">{fmtNumber(movement.debit)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Credit</span>
                          <span className="font-medium">{fmtNumber(movement.credit)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Currency</span>
                          <span className="font-medium">{movement.currency}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed bg-background p-3 text-sm text-muted-foreground">
                  No journal activity found for this account yet.
                </p>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Entry Status</h3>
              <PreviewRow label="Selection State" value={selectedRow ? "Selected" : "Empty"} />
              <PreviewRow label="Active Account" value={selectedRow?.status ? titleCase(selectedRow.status) : "-"} />
              <PreviewRow label="Last Activity" value={fmtDateTime(selectedRow?.latestActivityAt)} />
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => selectedRow && setSelectedAccountId(selectedRow.accountId)} disabled={!selectedRow}>
                View
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => selectedRow && router.push(`/dashboard/accounts/setup?accountId=${selectedRow.accountId}` as Route)} disabled={!selectedRow}>
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={loading}>
                <Printer className="h-4 w-4" aria-hidden />
                Print
              </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={!selectedRow}>
                  <Download className="h-4 w-4" aria-hidden />
                  PDF Export
                </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exportCsv()} disabled={loading}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
                Excel Export
              </Button>
            </div>

            {selectedRow?.recentMovements.length ? (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Row</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRow.accountCode} - {selectedRow.accountName}
                </p>
              </div>
            ) : null}
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, tone }: { label: string; value?: string | null; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 text-sm last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-right font-semibold", tone ?? "text-foreground")}>{value || "-"}</span>
    </div>
  );
}
