"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Download, MoreVertical, Printer, RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import {
  getLedgerStatement,
  type LedgerLookupRow,
  type LedgerReportScope,
  type LedgerStatementLine
} from "@/features/reports/ledger-report/ledger-report-api";

type GeneralReportRow = LedgerLookupRow & {
  branch: string;
  status: "active" | "inactive";
  entries: number;
  debit: number;
  credit: number;
  balance: number;
  balanceDate: string | null;
  lastActivityAt: string | null;
  lastReferenceNo: string | null;
  lastSource: "ledger" | "roznamcha" | null;
  lastDescription: string | null;
  lastEntryDate: string | null;
};

type GeneralReportResponse = {
  reportScope: LedgerReportScope;
  generatedAt: string;
  filters: {
    q: string | null;
    scope: string | null;
    countryId: string | null;
    countryBranchId: string | null;
    cityBranchId: string | null;
    ledgerId: string | null;
    fromDate: string;
    toDate: string;
  };
  summary: {
    totalLedgers: number;
    activeLedgers: number;
    inactiveLedgers: number;
    entries: number;
    debit: number;
    credit: number;
    balance: number;
  };
  rows: GeneralReportRow[];
  selectedLedger: GeneralReportRow | null;
  statement: {
    found: boolean;
    header: LedgerLookupRow | null;
    lines: LedgerStatementLine[];
    totals: {
      entries: number;
      debit: number;
      credit: number;
      balance: number;
      usdDebit: number;
      usdCredit: number;
    };
  } | null;
};

type SessionInfo = {
  user: { id: string; email: string | null; fullName: string | null };
  roles: string[];
};

function fmtNumber(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRate(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n ? n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 }) : "-";
}

function safeText(value: string | null | undefined) {
  const v = (value ?? "").toString().trim();
  return v || "-";
}

function titleCase(input: string) {
  const v = input.trim();
  if (!v) return v;
  return v
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
    .join(" ");
}

function fmtKind(value: string | null | undefined) {
  const v = (value ?? "").toString().trim();
  return v ? titleCase(v) : "-";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekStartIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLedgerOption(row: LedgerLookupRow): SearchSelectOption {
  const branch = row.cityBranchName || row.countryBranchName || row.countryName || "";
  const label = `${row.ledgerCode} · ${row.accountName || row.ledgerName}${branch ? ` · ${branch}` : ""}`;
  const keywords = [
    row.ledgerCode,
    row.ledgerName,
    row.accountCode,
    row.accountName,
    row.companyName,
    row.countryName,
    row.stateName,
    row.cityName,
    branch,
    row.accountKind,
    row.ledgerCurrency
  ]
    .filter(Boolean)
    .join(" ");
  return { value: row.ledgerId, label, keywords };
}

function buildBranchLabel(row: GeneralReportRow) {
  return row.branch || row.cityBranchName || row.countryBranchName || row.countryName || "-";
}

function badgeClass(status: "active" | "inactive") {
  return status === "active"
    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
    : "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300";
}

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const v = String(value ?? "");
          return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LedgerReportView({
  lang,
  reportScope,
  pageTitle,
  initialLedgerId,
  initialFromDate,
  initialToDate
}: {
  lang: SupportedLanguage;
  reportScope: LedgerReportScope;
  pageTitle: string;
  initialLedgerId?: string | null;
  initialFromDate?: string | null;
  initialToDate?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "this_week" | "this_month" | "custom">(
    initialFromDate || initialToDate ? "custom" : "this_month"
  );
  const [fromDate, setFromDate] = useState(initialFromDate ?? monthStartIso());
  const [toDate, setToDate] = useState(initialToDate ?? todayIso());
  const [ledgerId, setLedgerId] = useState(initialLedgerId ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [rows, setRows] = useState<GeneralReportRow[]>([]);
  const [summary, setSummary] = useState<GeneralReportResponse["summary"] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [statement, setStatement] = useState<GeneralReportResponse["statement"]>(null);
  const [selectedLedger, setSelectedLedger] = useState<GeneralReportRow | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 40;

  const ledgerOptions = useMemo(() => rows.map((row) => buildLedgerOption(row)), [rows]);
  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const label = buildBranchLabel(row);
      const key = normalizeForSearch(label);
      if (key && !seen.has(key)) seen.set(key, label);
    }
    return Array.from(seen.values()).map((label) => ({ value: label, label }));
  }, [rows]);

  async function loadReport(nextLedgerId = ledgerId, nextAccountSearch = accountSearch) {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set("reportScope", reportScope);
      qp.set("fromDate", fromDate);
      qp.set("toDate", toDate);
      qp.set("limit", "250");
      if (nextLedgerId) qp.set("ledgerId", nextLedgerId);
      const qParts = [nextAccountSearch.trim(), branchFilter.trim()].filter(Boolean);
      if (qParts.length) qp.set("q", qParts.join(" "));

      const res = await apiGet<GeneralReportResponse>(`/api/erp/accounting/reports/ledger/general?${qp.toString()}`);
      setRows(res.rows ?? []);
      setSummary(res.summary ?? null);
      setGeneratedAt(res.generatedAt ?? null);
      setStatement(res.statement ?? null);
      setSelectedLedger(res.selectedLedger ?? null);
      if (res.selectedLedger?.ledgerId) setLedgerId(res.selectedLedger.ledgerId);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedStatement(nextLedgerId: string) {
    if (!nextLedgerId) {
      setStatement(null);
      setSelectedLedger(null);
      return;
    }

    setLoadingStatement(true);
    try {
      const res = await getLedgerStatement({
        ledgerId: nextLedgerId,
        fromDate,
        toDate,
        limit: 5000
      });
      setStatement({
        found: Boolean(res.header),
        header: res.header,
        lines: res.lines,
        totals: {
          entries: res.lines.length,
          debit: res.lines.reduce((sum, row) => sum + row.debit, 0),
          credit: res.lines.reduce((sum, row) => sum + row.credit, 0),
          balance: res.lines.length ? res.lines[res.lines.length - 1]!.runningBalance : 0,
          usdDebit: res.lines.reduce((sum, row) => sum + (row.debit > 0 ? row.usdAmount : 0), 0),
          usdCredit: res.lines.reduce((sum, row) => sum + (row.credit > 0 ? row.usdAmount : 0), 0)
        }
      });
      setSelectedLedger(res.header ? rows.find((row) => row.ledgerId === nextLedgerId) ?? null : null);
      setLedgerId(nextLedgerId);
    } finally {
      setLoadingStatement(false);
    }
  }

  useEffect(() => {
    fetch("/api/erp/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((info) => setSessionInfo(info))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (datePreset === "custom") return;
    if (datePreset === "today") {
      const d = todayIso();
      setFromDate(d);
      setToDate(d);
    } else if (datePreset === "yesterday") {
      const d = yesterdayIso();
      setFromDate(d);
      setToDate(d);
    } else if (datePreset === "this_week") {
      setFromDate(weekStartIso());
      setToDate(todayIso());
    } else {
      setFromDate(monthStartIso());
      setToDate(todayIso());
    }
  }, [datePreset]);

  useEffect(() => {
    void loadReport(initialLedgerId ?? ledgerId, accountSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayRows = useMemo(() => {
    const q = normalizeForSearch(accountSearch.trim());
    const branchQ = normalizeForSearch(branchFilter.trim());
    let list = rows;
    if (q) {
      list = list.filter((row) =>
        normalizeForSearch(
          [
            row.ledgerCode,
            row.ledgerName,
            row.accountCode,
            row.accountName,
            row.companyName,
            row.countryName,
            row.stateName,
            row.cityName,
            row.countryBranchName,
            row.cityBranchName
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(q)
      );
    }
    if (branchQ) {
      list = list.filter((row) => normalizeForSearch(buildBranchLabel(row)).includes(branchQ));
    }
    if (statusFilter !== "all") {
      list = list.filter((row) => row.status === statusFilter);
    }
    return list;
  }, [accountSearch, branchFilter, rows, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const tableRows = displayRows.slice((page - 1) * pageSize, page * pageSize);

  const totalLedgers = summary?.totalLedgers ?? rows.length;
  const activeLedgers = summary?.activeLedgers ?? rows.filter((row) => row.status === "active").length;
  const inactiveLedgers = summary?.inactiveLedgers ?? rows.filter((row) => row.status === "inactive").length;

  function openPrint(autoPrint: boolean) {
    openA4ReportWindow({
      title: "Ledger General Report",
      subtitle: `Generated ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}`,
      rows: [
        { label: "Report Scope", value: reportScope },
        { label: "Generated Date", value: generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString() },
        { label: "Ledgers", value: String(totalLedgers) },
        { label: "Active", value: String(activeLedgers) },
        { label: "Inactive", value: String(inactiveLedgers) },
        { label: "Total Entries", value: fmtNumber(summary?.entries ?? 0) },
        { label: "Debit", value: fmtNumber(summary?.debit ?? 0) },
        { label: "Credit", value: fmtNumber(summary?.credit ?? 0) },
        { label: "Balance", value: fmtNumber(summary?.balance ?? 0) },
        { label: "Selected Ledger", value: selectedLedger?.ledgerName ?? "-" },
        { label: "Account No", value: selectedLedger?.accountCode ?? selectedLedger?.ledgerCode ?? "-" },
        { label: "Currency", value: selectedLedger?.ledgerCurrency ?? "-" },
        { label: "Branch", value: selectedLedger ? buildBranchLabel(selectedLedger) : "-" }
      ],
      autoPrint
    });
  }

  function exportReportCsv() {
    const rowsCsv = [
      [
        "Account Name",
        "Account No",
        "Category",
        "Type",
        "Currency",
        "Branch",
        "Company",
        "Entries",
        "Debit",
        "Credit",
        "Balance",
        "Status"
      ],
      ...displayRows.map((row) => [
        row.accountName || row.ledgerName || "-",
        row.accountCode || row.ledgerCode || "-",
        row.accountKind || "-",
        row.scope,
        row.ledgerCurrency || "-",
        buildBranchLabel(row),
        row.companyName || "-",
        String(row.entries ?? 0),
        fmtNumber(row.debit ?? 0),
        fmtNumber(row.credit ?? 0),
        fmtNumber(row.balance ?? 0),
        row.status
      ])
    ];
    exportCsv(`ledger-general-report_${new Date().toISOString().slice(0, 10)}.csv`, rowsCsv);
  }

  function resetFilters() {
    setAccountSearch("");
    setBranchFilter("");
    setStatusFilter("all");
    setDatePreset("this_month");
    setFromDate(monthStartIso());
    setToDate(todayIso());
    setLedgerId("");
    setStatement(null);
    setSelectedLedger(null);
    setPage(1);
    void loadReport("", "");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onMouseDown(e: MouseEvent) {
      const el = document.getElementById("ledger-actions-menu");
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("mousedown", onMouseDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("mousedown", onMouseDown);
      };
    }
  }, [menuOpen]);

  return (
    <div className="mx-auto max-w-[1650px] space-y-4 px-4 py-4 md:px-6">
      <ReportHeader
        title={pageTitle}
        generatedAt={generatedAt}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setFiltersOpen((v) => !v)}>
              <Search className="h-4 w-4" aria-hidden />
              {filtersOpen ? "Hide Filters" : "Search / Filters"}
            </Button>

            <div id="ledger-actions-menu" className="relative">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setMenuOpen((v) => !v)}>
                <MoreVertical className="h-4 w-4" aria-hidden />
                {t(lang, "ledger.actions")}
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border bg-background shadow-xl">
                  <MenuAction icon={<Printer className="h-4 w-4" />} label={t(lang, "ledger.print")} onClick={() => openPrint(true)} />
                  <MenuAction icon={<Download className="h-4 w-4" />} label="PDF Export" onClick={() => openPrint(false)} />
                  <MenuAction icon={<Download className="h-4 w-4" />} label={t(lang, "ledger.export_csv")} onClick={exportReportCsv} />
                  <MenuAction icon={<Search className="h-4 w-4" />} label="View Ledger" onClick={() => selectedLedger?.ledgerId && loadSelectedStatement(selectedLedger.ledgerId)} />
                  <MenuAction icon={<ChevronDown className="h-4 w-4" />} label="Open Journal" onClick={() => selectedLedger?.ledgerId && loadSelectedStatement(selectedLedger.ledgerId)} />
                  <MenuAction icon={<RefreshCcw className="h-4 w-4" />} label="Account Activity" onClick={() => selectedLedger?.ledgerId && loadSelectedStatement(selectedLedger.ledgerId)} />
                </div>
              ) : null}
            </div>
          </>
        }
        />

      {filtersOpen ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Search / Filters</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Collapsed by default for a cleaner report view.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setFiltersOpen(false)}>
                <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
                Hide
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_180px_auto] xl:items-end">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.filter_account_no")}</Label>
                <SearchSelect
                  label={t(lang, "ledger.select_account")}
                  value={ledgerId}
                  placeholder={t(lang, "ledger.select_account_ph")}
                  options={ledgerOptions}
                  onValueChange={(value) => {
                    setLedgerId(value);
                    void loadSelectedStatement(value);
                  }}
                  createButtonPlacement="modal"
                  onOpenChange={(open) => {
                    if (open) setMenuOpen(false);
                  }}
                />
                <Input
                  className="h-9 text-sm"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder={t(lang, "ledger.filter_account_no_ph")}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.branch_filter")}</Label>
                <SearchSelect
                  label={t(lang, "ledger.branch_filter")}
                  value={branchFilter}
                  options={[{ value: "", label: t(lang, "ledger.all_branches") }, ...branchOptions]}
                  onValueChange={setBranchFilter}
                  placeholder={t(lang, "ledger.all_branches")}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Status</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.from_date")}</Label>
                  <Input
                    className="h-9 text-xs"
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setFromDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.to_date")}</Label>
                  <Input
                    className="h-9 text-xs"
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setToDate(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button type="button" size="sm" onClick={() => void loadReport(ledgerId, accountSearch)} disabled={loading}>
                  {loading ? t(lang, "ledger.loading") : t(lang, "ledger.apply")}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={resetFilters} disabled={loading}>
                  {t(lang, "ledger.reset")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Entries" value={fmtNumber(summary?.entries ?? 0)} />
        <StatCard label="Debit" value={fmtNumber(summary?.debit ?? 0)} tone="text-rose-600" />
        <StatCard label="Credit" value={fmtNumber(summary?.credit ?? 0)} tone="text-emerald-600" />
        <StatCard label="Balance" value={fmtNumber(summary?.balance ?? 0)} tone="text-slate-950 dark:text-slate-100" />
        <StatCard label="Active Accounts" value={String(activeLedgers)} tone="text-emerald-600" />
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-2 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Account Details</CardTitle>
            </div>
            <span className={badgeClass(selectedLedger?.status === "inactive" ? "inactive" : "active")}>
              {selectedLedger?.status === "inactive" ? "Inactive" : "Active"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {selectedLedger ? (
            <>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <KeyValue label="Account No" value={selectedLedger.accountCode || selectedLedger.ledgerCode || "-"} />
                <KeyValue label="Account Name" value={selectedLedger.accountName || selectedLedger.ledgerName || "-"} />
                <KeyValue label="Ledger Name" value={selectedLedger.ledgerName || "-"} />
                <KeyValue label="Branch" value={buildBranchLabel(selectedLedger)} />
                <KeyValue label="Country" value={selectedLedger.countryName || "-"} />
                <KeyValue label="Currency" value={selectedLedger.ledgerCurrency || "-"} />
                <KeyValue label="Status" value={selectedLedger.status === "inactive" ? "Inactive" : "Active"} tone={selectedLedger.status === "inactive" ? "text-rose-600" : "text-emerald-600"} />
                <KeyValue label="Opening Balance" value={fmtNumber((statement?.lines?.[0] ? statement.lines[0]!.runningBalance - statement.lines[0]!.debit + statement.lines[0]!.credit : selectedLedger.balance ?? 0))} />
                <KeyValue label="Current Balance" value={fmtNumber(statement?.totals?.balance ?? selectedLedger.balance ?? 0)} />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => selectedLedger?.ledgerId && loadSelectedStatement(selectedLedger.ledgerId)}>
                  <Search className="h-4 w-4" aria-hidden />
                  View Ledger
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openPrint(false)}>
                  <Printer className="h-4 w-4" aria-hidden />
                  Print
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportReportCsv}>
                  <Download className="h-4 w-4" aria-hidden />
                  PDF / Excel
                </Button>
              </div>

              {loadingStatement ? <div className="text-sm text-muted-foreground">Loading selected account...</div> : null}
            </>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">{t(lang, "ledger.select_account_hint")}</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-2 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{t(lang, "ledger.entries_table_title")}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(lang, "ledger.showing_range")} <span className="font-mono text-[11px] text-foreground">{fromDate} → {toDate}</span>
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {t(lang, "ledger.rows")}: <b className="text-foreground">{displayRows.length}</b>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white dark:bg-slate-800">
                <tr className="whitespace-nowrap">
                  {["Account Name", "Account No", "Category", "Type", "Currency", "Branch", "Company", "Entries", "Debit", "Credit", "Balance", "Status"].map((head) => (
                    <th key={head} className="border-b border-slate-700 px-3 py-2 text-left font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t(lang, "ledger.loading")}
                    </td>
                  </tr>
                ) : tableRows.length ? (
                  tableRows.map((row, index) => {
                    const active = row.ledgerId === ledgerId;
                    return (
                      <tr
                        key={row.ledgerId}
                        className={cn(
                          "cursor-pointer border-b transition hover:bg-slate-50 dark:hover:bg-slate-900/40",
                          index % 2 === 0 ? "bg-background" : "bg-muted/20",
                          active ? "bg-primary/5 dark:bg-primary/10" : ""
                        )}
                        onClick={() => void loadSelectedStatement(row.ledgerId)}
                      >
                        <td className="px-3 py-2 font-medium text-slate-950 dark:text-slate-100">{row.accountName || row.ledgerName}</td>
                        <td className="px-3 py-2 font-mono">{row.accountCode || row.ledgerCode}</td>
                        <td className="px-3 py-2">{row.accountKind || "-"}</td>
                        <td className="px-3 py-2">{fmtKind(row.scope)}</td>
                        <td className="px-3 py-2">{row.ledgerCurrency || "-"}</td>
                        <td className="px-3 py-2">{buildBranchLabel(row)}</td>
                        <td className="px-3 py-2">{row.companyName || "-"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.entries}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-600">{fmtNumber(row.debit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{fmtNumber(row.credit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtNumber(row.balance)}</td>
                        <td className="px-3 py-2">
                          <span className={badgeClass(row.status)}>{row.status === "active" ? "Active" : "Inactive"}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t(lang, "ledger.no_data")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
            <div className="text-xs text-muted-foreground">
              {t(lang, "ledger.pagination_hint")} {pageSize}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t(lang, "ledger.prev")}
              </Button>
              <div className="text-xs text-muted-foreground">
                {t(lang, "ledger.page")} <b className="text-foreground">{page}</b> / {pageCount}
              </div>
              <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                {t(lang, "ledger.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportHeader({
  title,
  generatedAt,
  actions
}: {
  title: string;
  generatedAt: string | null;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Generated Date: <span className="font-medium text-foreground">{generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}</span>
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function MenuAction({
  icon,
  label,
  onClick
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-xl font-semibold leading-none tracking-tight", tone)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function KeyValue({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="grid grid-cols-[128px_1fr] gap-3 text-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-semibold text-slate-950 dark:text-slate-100", tone)}>{value || "-"}</div>
    </div>
  );
}
