"use client";

import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, MoreVertical, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportFilterBar, type DatePresetKey } from "@/components/reports/report-filter-bar";
import { ReportFilterMenu } from "@/components/reports/report-filter-menu";
import { ReportTd, ReportTh } from "@/components/reports/report-primitives";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import {
  getLedgerStatement,
  listLedgerReportLedgers,
  type LedgerLookupRow,
  type LedgerReportScope,
  type LedgerStatementLine
} from "@/features/reports/ledger-report/ledger-report-api";

function fmtNumber(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRate(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  if (!n) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
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

function weekStartIso() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function safeText(value: string | null | undefined) {
  const v = (value ?? "").toString().trim();
  return v ? v : "-";
}

function isNegative(value: number) {
  return Number.isFinite(value) && value < 0;
}

function deriveLedgerBranchName(header: LedgerLookupRow | null) {
  if (!header) return "-";
  return header.cityBranchName || header.countryBranchName || "-";
}

function buildLedgerOption(row: LedgerLookupRow): SearchSelectOption {
  const branch = row.cityBranchName || row.countryBranchName || "";
  const country = row.countryName || "";
  const city = row.cityName || "";
  const account = row.accountName || row.ledgerName || "";
  const accountNo = row.accountCode || row.ledgerCode || "";
  const company = row.companyName || "";

  const label = `${accountNo} - ${account}${branch ? ` (${branch})` : ""}`;
  const keywords = [accountNo, account, company, branch, city, country, row.ledgerCode, row.ledgerName]
    .filter(Boolean)
    .join(" ");

  return { value: row.ledgerId, label, keywords };
}

type SessionInfo = {
  user: { id: string; email: string | null; fullName: string | null };
  roles: string[];
};

async function fetchSessionInfo() {
  return apiGet<SessionInfo>("/api/erp/auth/session");
}

function calcUsdFromLocal(amountLocal: number, usdRate: number) {
  if (!Number.isFinite(amountLocal) || !Number.isFinite(usdRate) || usdRate <= 0) return 0;
  return amountLocal * usdRate;
}

function csvEscape(value: string) {
  const v = (value ?? "").toString();
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
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
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [ledgers, setLedgers] = useState<LedgerLookupRow[]>([]);
  const [ledgerId, setLedgerId] = useState(initialLedgerId ?? "");

  const [accountNoFilter, setAccountNoFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | string>("all");
  const [fromDate, setFromDate] = useState(initialFromDate ?? monthStartIso());
  const [toDate, setToDate] = useState(initialToDate ?? todayIso());
  const [datePreset, setDatePreset] = useState<DatePresetKey>(
    initialFromDate || initialToDate ? "custom" : "this_month"
  );
  const [entrySearch, setEntrySearch] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [loadingStatement, setLoadingStatement] = useState(false);
  const [header, setHeader] = useState<LedgerLookupRow | null>(null);
  const [lines, setLines] = useState<LedgerStatementLine[]>([]);
  const [totals, setTotals] = useState<{
    entries: number;
    debit: number;
    credit: number;
    balance: number;
    usdDebit: number;
    usdCredit: number;
  } | null>(null);

  // Exchange rate override (preview-only): convert LOCAL -> USD using one rate.
  const [usdRateOverride, setUsdRateOverride] = useState<number | "">("");

  // Client-side table paging (keeps API simple and fast).
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let cancelled = false;

    fetchSessionInfo()
      .then((info) => {
        if (!cancelled) setSessionInfo(info);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [reportScope]);

  useEffect(() => {
    if (initialLedgerId) {
      setLedgerId(initialLedgerId);
    }
  }, [initialLedgerId]);

  // Load ledgers (supports server-side search via `q`).
  useEffect(() => {
    let cancelled = false;
    const query = accountNoFilter.trim();

    const handle = setTimeout(() => {
      (async () => {
        try {
          setLoadingLedgers(true);
          const res = await listLedgerReportLedgers({ reportScope, q: query || null, limit: 500 });
          if (!cancelled) setLedgers(res.ledgers ?? []);
        } finally {
          if (!cancelled) setLoadingLedgers(false);
        }
      })().catch(() => {
        if (!cancelled) setLoadingLedgers(false);
      });
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [accountNoFilter, reportScope]);

  // Date presets (quick filter).
  useEffect(() => {
    if (datePreset === "custom") return;

    const today = todayIso();
    if (datePreset === "today") {
      setFromDate(today);
      setToDate(today);
      return;
    }

    if (datePreset === "yesterday") {
      const y = yesterdayIso();
      setFromDate(y);
      setToDate(y);
      return;
    }

    if (datePreset === "this_week") {
      setFromDate(weekStartIso());
      setToDate(today);
      return;
    }

    if (datePreset === "this_month") {
      setFromDate(monthStartIso());
      setToDate(today);
      return;
    }
  }, [datePreset]);

  // Close the action menu when clicking outside or pressing escape.
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

  const branchOptions = useMemo(() => {
    const pairs = new Map<string, string>();
    for (const row of ledgers) {
      const id = row.cityBranchId || row.countryBranchId;
      const name = row.cityBranchName || row.countryBranchName;
      if (id && name) pairs.set(id, name);
    }
    return Array.from(pairs.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgers]);

  const filteredLedgers = useMemo(() => {
    return ledgers.filter((row) => {
      if (branchFilter !== "all") {
        const id = row.cityBranchId || row.countryBranchId;
        if (id !== branchFilter) return false;
      }
      return true;
    });
  }, [branchFilter, ledgers]);

  const ledgerOptions: SearchSelectOption[] = useMemo(() => filteredLedgers.map(buildLedgerOption), [filteredLedgers]);

  const accountNoOptions: SearchSelectOption[] = useMemo(() => {
    const map = new Map<string, { code: string; account: string; company: string; branch: string; country: string; city: string }>();
    for (const row of ledgers) {
      const code = (row.accountCode || row.ledgerCode || "").trim();
      if (!code) continue;
      if (!map.has(code)) {
        map.set(code, {
          code,
          account: row.accountName || row.ledgerName || "",
          company: row.companyName || "",
          branch: row.cityBranchName || row.countryBranchName || "",
          country: row.countryName || "",
          city: row.cityName || ""
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((item) => ({
        value: item.code,
        label: `${item.code}${item.account ? ` - ${item.account}` : ""}`,
        keywords: [item.code, item.account, item.company, item.branch, item.city, item.country].filter(Boolean).join(" ")
      }));
  }, [ledgers]);

  const branchFilterOptions: SearchSelectOption[] = useMemo(() => {
    return [{ value: "all", label: t(lang, "ledger.all_branches"), keywords: t(lang, "ledger.all_branches") }].concat(
      branchOptions.map((b) => ({
        value: b.id,
        label: b.name,
        keywords: `${b.name} ${b.name.toLowerCase().includes("city") ? "city" : ""} ${b.name.toLowerCase().includes("main") ? "main" : ""}`
      }))
    );
  }, [branchOptions, lang]);

  const datePresetOptions: SearchSelectOption[] = useMemo(
    () => [
      { value: "today", label: t(lang, "ledger.preset_today"), keywords: t(lang, "ledger.preset_today") },
      { value: "yesterday", label: t(lang, "ledger.preset_yesterday"), keywords: t(lang, "ledger.preset_yesterday") },
      { value: "this_week", label: t(lang, "ledger.preset_this_week"), keywords: t(lang, "ledger.preset_this_week") },
      { value: "this_month", label: t(lang, "ledger.preset_this_month"), keywords: t(lang, "ledger.preset_this_month") },
      { value: "custom", label: t(lang, "ledger.preset_custom"), keywords: t(lang, "ledger.preset_custom") }
    ],
    [lang]
  );

  const selectedLedger = useMemo(() => ledgers.find((l) => l.ledgerId === ledgerId) ?? null, [ledgers, ledgerId]);

  const filteredLines = useMemo(() => {
    const q = entrySearch.trim().toLowerCase();
    if (!q) return lines;

    return lines.filter((row) => {
      const hay = [
        row.entryDate,
        row.referenceNo,
        row.description,
        row.createdByName,
        row.createdById,
        row.currency,
        row.sourceTable,
        row.sourceId
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [entrySearch, lines]);

  const tableRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredLines.slice(start, end);
  }, [filteredLines, page]);

  const pageCount = Math.max(1, Math.ceil(filteredLines.length / pageSize));

  const effectiveUsdRateForDisplay = useMemo(() => {
    if (usdRateOverride === "" || !Number.isFinite(Number(usdRateOverride)) || Number(usdRateOverride) <= 0) {
      // When no override, show "transaction-time" conversion (per row).
      return null;
    }
    return Number(usdRateOverride);
  }, [usdRateOverride]);

  const displayTotals = useMemo(() => {
    if (!header) return null;

    const creditNormal = header.normalBalance === "credit";

    let debit = 0;
    let credit = 0;
    let usdDebit = 0;
    let usdCredit = 0;
    let usdBalance = 0;

    for (const row of filteredLines) {
      debit += row.debit;
      credit += row.credit;

      const txRate = row.usdRate || 1;
      const rate = effectiveUsdRateForDisplay ?? txRate;
      const amountLocal = row.debit > 0 ? row.debit : row.credit;

      const amountUsd =
        effectiveUsdRateForDisplay !== null
          ? calcUsdFromLocal(amountLocal, rate)
          : row.usdAmount > 0
            ? row.usdAmount
            : calcUsdFromLocal(amountLocal, txRate);

      const debitUsd = row.debit > 0 ? amountUsd : 0;
      const creditUsd = row.credit > 0 ? amountUsd : 0;

      usdDebit += debitUsd;
      usdCredit += creditUsd;
      usdBalance += creditNormal ? creditUsd - debitUsd : debitUsd - creditUsd;
    }

    const balance = filteredLines.length ? filteredLines[filteredLines.length - 1]!.runningBalance : 0;

    return {
      entries: filteredLines.length,
      debit,
      credit,
      balance,
      usdDebit,
      usdCredit,
      usdBalance
    };
  }, [effectiveUsdRateForDisplay, filteredLines, header]);

  const lastLine = useMemo(() => {
    return filteredLines.length ? filteredLines[filteredLines.length - 1]! : null;
  }, [filteredLines]);

  const lastTransactionDate = lastLine?.entryDate ?? "-";
  const lastReferenceNo = lastLine?.referenceNo ?? null;
  const lastUserLabel = lastLine?.createdByName ?? null;

  useEffect(() => {
    // keep paging consistent when filtering
    setPage(1);
  }, [entrySearch, ledgerId]);

  function resetReport() {
    setLedgerId("");
    setHeader(null);
    setLines([]);
    setTotals(null);
    setUsdRateOverride("");
    setFromDate(monthStartIso());
    setToDate(todayIso());
    setPage(1);
  }

  async function applyReport() {
    if (!ledgerId) return;
    setLoadingStatement(true);
    try {
      const res = await getLedgerStatement({ ledgerId, fromDate, toDate, limit: 2000 });
      setHeader(res.header);
      setLines(res.lines ?? []);
      setTotals(res.totals ?? null);
      setPage(1);

      // Set a sensible default override from the latest transaction rate (optional).
      // Override is preview-only; transaction-time rates are still visible in the table.
      if (res.lines?.length) {
        const lastRate = res.lines[res.lines.length - 1]?.usdRate ?? 0;
        if (lastRate > 0) setUsdRateOverride(lastRate);
      }
    } finally {
      setLoadingStatement(false);
    }
  }

  useEffect(() => {
    if (!ledgerId) return;
    applyReport().catch(() => null);

    const handleSaved = () => {
      if (ledgerId) {
        applyReport().catch(() => null);
      }
    };

    window.addEventListener("erp:posting-saved", handleSaved);
    window.addEventListener("erp:posting-deleted", handleSaved);
    return () => {
      window.removeEventListener("erp:posting-saved", handleSaved);
      window.removeEventListener("erp:posting-deleted", handleSaved);
    };
  }, [ledgerId]);

  const balanceTone = displayTotals?.balance
    ? isNegative(displayTotals.balance)
      ? "text-red-600"
      : "text-emerald-600"
    : "text-muted-foreground";

  const ledgerCurrency = header?.ledgerCurrency || selectedLedger?.ledgerCurrency || "-";

  function exportCsv() {
    if (!header) return;

    const creditNormal = header.normalBalance === "credit";
    const branchName = deriveLedgerBranchName(header);
    let runningUsd = 0;

    const rows = lines.map((row) => {
      const txRate = row.usdRate || 1;
      const rate = effectiveUsdRateForDisplay ?? txRate;

      const debitUsd =
        effectiveUsdRateForDisplay !== null
          ? calcUsdFromLocal(row.debit, rate)
          : row.debit > 0
            ? row.usdAmount > 0
              ? row.usdAmount
              : calcUsdFromLocal(row.debit, txRate)
            : 0;

      const creditUsd =
        effectiveUsdRateForDisplay !== null
          ? calcUsdFromLocal(row.credit, rate)
          : row.credit > 0
            ? row.usdAmount > 0
              ? row.usdAmount
              : calcUsdFromLocal(row.credit, txRate)
            : 0;

      runningUsd += creditNormal ? creditUsd - debitUsd : debitUsd - creditUsd;

      return [
        branchName,
        row.entryDate,
        row.sourceId.slice(0, 8),
        row.createdByName || (row.createdById ? row.createdById.slice(0, 8) : ""),
        row.referenceNo ?? "",
        row.sourceTable === "roznamcha_entries" ? t(lang, "ledger.source_roznamcha") : t(lang, "ledger.source_ledger"),
        row.description ?? "",
        row.debit ? String(row.debit) : "",
        row.credit ? String(row.credit) : "",
        String(row.runningBalance),
        String(rate),
        debitUsd ? String(debitUsd) : "",
        creditUsd ? String(creditUsd) : "",
        String(runningUsd)
      ];
    });

    const headerRow = [
      "Branch",
      "Date",
      "Serial",
      "User",
      "Roz#",
      "Source",
      "Details",
      "Debit",
      "Credit",
      "Running Balance",
      "Exchange Rate",
      "Debit USD",
      "Credit USD",
      "Running USD"
    ];

    const csv = [headerRow, ...rows]
      .map((r) => r.map((c) => csvEscape(String(c ?? ""))).join(","))
      .join("\r\n");

    const file = `ledger-report_${header.ledgerCode}_${fromDate}_to_${toDate}.csv`.replace(/[^\w.-]+/g, "_");
    downloadTextFile(file, csv, "text/csv");
  }

  return (
    <div className="space-y-4">
      <ReportPageHeader
        title={pageTitle}
        subtitle={t(lang, "ledger.report_subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative" ref={actionsRef}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t(lang, "ledger.actions")}
                onClick={() => setActionsOpen((v) => !v)}
                disabled={!header || loadingStatement}
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>

              {actionsOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border bg-background shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      window.print();
                    }}
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    {t(lang, "ledger.print")}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setActionsOpen(false);
                      exportCsv();
                    }}
                  >
                    <DownloadActionIcon className="h-4 w-4" aria-hidden />
                    {t(lang, "ledger.export_csv")}
                  </button>
                </div>
              ) : null}
            </div>

            <ReportFilterMenu ariaLabel={t(lang, "ledger.filters")} disabled={loadingLedgers}>
              <div className="border-b bg-muted/10 px-3 py-2 text-sm font-semibold">{t(lang, "ledger.filters")}</div>
              <div className="space-y-3 p-3">
                <ReportFilterBar
                  accountNoLabel={t(lang, "ledger.filter_account_no")}
                  accountNoValue={accountNoFilter}
                  accountNoOptions={accountNoOptions}
                  onAccountNoChange={(code) => {
                    setAccountNoFilter(code);
                    const matches = ledgers.filter((row) => (row.accountCode || row.ledgerCode || "").trim() === code);
                    if (matches.length === 1) setLedgerId(matches[0].ledgerId);
                  }}
                  ledgerLabel={t(lang, "ledger.select_account")}
                  ledgerValue={ledgerId}
                  ledgerOptions={ledgerOptions}
                  onLedgerChange={(v) => setLedgerId(v)}
                  datePresetLabel={t(lang, "ledger.date_preset")}
                  datePresetValue={datePreset}
                  datePresetOptions={datePresetOptions}
                  onDatePresetChange={setDatePreset}
                  branchLabel={t(lang, "ledger.branch_filter")}
                  branchValue={branchFilter}
                  branchOptions={branchFilterOptions}
                  onBranchChange={(v) => setBranchFilter(v as any)}
                  disabled={loadingLedgers}
                />

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

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button type="button" size="sm" disabled={!ledgerId || loadingStatement} onClick={() => applyReport()}>
                    {loadingStatement ? t(lang, "ledger.loading") : t(lang, "ledger.apply")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={resetReport} disabled={loadingStatement}>
                    {t(lang, "ledger.reset")}
                  </Button>
                </div>
              </div>
            </ReportFilterMenu>
          </div>
        }
      />

      {/* Top Row Details */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t(lang, "ledger.report_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {/* Account Details */}
            <div className="space-y-2">
              <h3 className="border-b pb-1 text-xs font-semibold text-foreground">{t(lang, "ledger.account_details")}</h3>
              <div className="space-y-1 text-xs">
                <KV k={t(lang, "ledger.economic_name")} v={safeText(header?.ledgerName)} />
                <KV k={t(lang, "ledger.category")} v={fmtKind(header?.accountKind)} />
                <KV k={t(lang, "ledger.account_title")} v={"-"} />
                <KV k={t(lang, "ledger.account_type")} v={"-"} />
                <KV k={t(lang, "ledger.currency")} v={safeText(ledgerCurrency)} />
                <KV k={t(lang, "ledger.contract_no")} v={"-"} />
                <KV k={t(lang, "ledger.contract_date")} v={"-"} />
                <KV k={t(lang, "ledger.contract_type")} v={"-"} />
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-2">
              <h3 className="border-b pb-1 text-xs font-semibold text-foreground">{t(lang, "ledger.company_details")}</h3>
              <div className="space-y-1 text-xs">
                <KV k={t(lang, "ledger.company_name")} v={safeText(header?.companyName)} />
                <KV k={t(lang, "ledger.business_title")} v={"-"} />
                <KV k={t(lang, "ledger.registration_number")} v={"-"} />
                <KV k={t(lang, "ledger.trn")} v={"-"} />
                <KV k={t(lang, "ledger.website")} v={"-"} />
              </div>
            </div>

            {/* Branch Details */}
            <div className="space-y-2">
              <h3 className="border-b pb-1 text-xs font-semibold text-foreground">{t(lang, "ledger.branch_details")}</h3>
              <div className="space-y-1 text-xs">
                <KV k={t(lang, "ledger.branch_name")} v={safeText(deriveLedgerBranchName(header))} />
                <KV k={t(lang, "ledger.branch_account_no")} v={safeText(header?.cityBranchId || header?.countryBranchId)} />
                <KV k={t(lang, "ledger.country")} v={safeText(header?.countryName)} />
                <KV k={t(lang, "ledger.state_city")} v={[header?.stateName, header?.cityName].filter(Boolean).join(" / ") || "-"} />
                <KV k={t(lang, "ledger.address")} v={safeText(header?.address)} />
              </div>
            </div>

            {/* Ledger Summary */}
            <div className="space-y-2">
              <h3 className="border-b pb-1 text-xs font-semibold text-foreground">{t(lang, "ledger.summary")}</h3>
              <div className="space-y-1 text-xs">
                <KV k={t(lang, "ledger.entries")} v={displayTotals ? String(displayTotals.entries) : "-"} />
                <KV
                  k={t(lang, "ledger.total_debit")}
                  v={displayTotals ? fmtNumber(displayTotals.debit) : "-"}
                  tone="text-red-600"
                />
                <KV
                  k={t(lang, "ledger.total_credit")}
                  v={displayTotals ? fmtNumber(displayTotals.credit) : "-"}
                  tone="text-emerald-600"
                />
                <KV
                  k={t(lang, "ledger.current_balance")}
                  v={displayTotals ? fmtNumber(displayTotals.balance) : "-"}
                  tone={balanceTone}
                />
                <KV k={t(lang, "ledger.last_transaction")} v={lastTransactionDate} />
                <KV k={t(lang, "ledger.last_reference")} v={safeText(lastReferenceNo)} />
                <KV k={t(lang, "ledger.user_name")} v={safeText(lastUserLabel)} />
                <KV k={t(lang, "ledger.normal_balance")} v={fmtKind(header?.normalBalance)} />
                <KV k={t(lang, "ledger.ledger_scope")} v={fmtKind(header?.scope)} />
                <KV k={t(lang, "ledger.ledger_status")} v={header ? "Active" : "-"} />

                <div className="mt-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.exchange_rate_local_to_usd")}</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    min={0}
                    className="h-9 text-xs"
                    value={usdRateOverride}
                    onChange={(e) => setUsdRateOverride(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={t(lang, "ledger.exchange_rate_ph")}
                  />
                  <p className="text-[11px] text-muted-foreground">{t(lang, "ledger.exchange_rate_hint")}</p>
                </div>
              </div>
            </div>

            {/* Session / Login Details */}
            <div className="space-y-2">
              <h3 className="border-b pb-1 text-xs font-semibold text-foreground">{t(lang, "ledger.session_details")}</h3>
              <div className="space-y-1 text-xs">
                <KV k={t(lang, "ledger.session_branch")} v={safeText(deriveLedgerBranchName(header))} />
                <KV k={t(lang, "ledger.user_name")} v={safeText(sessionInfo?.user.fullName || sessionInfo?.user.email)} />
                <KV k={t(lang, "ledger.user_id")} v={safeText(sessionInfo?.user.id)} />
                <KV k={t(lang, "ledger.roles")} v={sessionInfo?.roles?.length ? sessionInfo.roles.join(", ") : "-"} />
              </div>
            </div>

            {/* Filters moved to compact top filter menu */}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Entries */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t(lang, "ledger.entries_table_title")}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {header ? (
                  <>
                    {t(lang, "ledger.showing_range")}{" "}
                    <span className="font-mono text-[11px] text-foreground">
                      {fromDate} {"->"} {toDate}
                    </span>
                  </>
                ) : (
                  t(lang, "ledger.select_account_hint")
                )}
              </p>
            </div>

            {header ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-[280px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    className="h-9 pl-8 text-xs"
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                    placeholder={t(lang, "ledger.entry_search_ph")}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t(lang, "ledger.rows")}: <b className="text-foreground">{filteredLines.length}</b>
                  </span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">
                    {t(lang, "ledger.page")} <b className="text-foreground">{page}</b> / {pageCount}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-white dark:bg-slate-800">
                <tr className="whitespace-nowrap">
                  <ReportTh>{t(lang, "ledger.col_branch")}</ReportTh>
                  <ReportTh>{t(lang, "ledger.col_date")}</ReportTh>
                  <ReportTh>{t(lang, "ledger.col_serial")}</ReportTh>
                  <ReportTh>{t(lang, "ledger.col_user")}</ReportTh>
                  <ReportTh>{t(lang, "ledger.col_roz")}</ReportTh>
                  <ReportTh>{t(lang, "ledger.col_name")}</ReportTh>
                  <ReportTh className="text-start">{t(lang, "ledger.col_details")}</ReportTh>
                  <ReportTh className="text-end">{t(lang, "ledger.col_debit")}</ReportTh>
                  <ReportTh className="text-end">{t(lang, "ledger.col_credit")}</ReportTh>
                  <ReportTh className="text-end">{t(lang, "ledger.col_total")}</ReportTh>
                  <ReportTh className="text-center">{t(lang, "ledger.col_ex_rate")}</ReportTh>
                  <ReportTh className="text-end">{t(lang, "ledger.col_debit_usd")}</ReportTh>
                  <ReportTh className="text-end">{t(lang, "ledger.col_credit_usd")}</ReportTh>
                </tr>
              </thead>
              <tbody>
                {header && loadingStatement ? (
                  <tr>
                    <td colSpan={13} className="p-4 text-center text-sm text-muted-foreground">
                      {t(lang, "ledger.loading")}
                    </td>
                  </tr>
                ) : !header ? (
                  <tr>
                    <td colSpan={13} className="p-4 text-center text-sm text-muted-foreground">
                      {t(lang, "ledger.no_data")}
                    </td>
                  </tr>
                ) : tableRows.length ? (
                  tableRows.map((row, idx) => {
                    const txRate = row.usdRate || 1;
                    const rate = effectiveUsdRateForDisplay ?? txRate;

                    const debitUsd =
                      effectiveUsdRateForDisplay !== null
                        ? calcUsdFromLocal(row.debit, rate)
                        : row.debit > 0
                          ? row.usdAmount > 0
                            ? row.usdAmount
                            : calcUsdFromLocal(row.debit, txRate)
                          : 0;

                    const creditUsd =
                      effectiveUsdRateForDisplay !== null
                        ? calcUsdFromLocal(row.credit, rate)
                        : row.credit > 0
                          ? row.usdAmount > 0
                            ? row.usdAmount
                            : calcUsdFromLocal(row.credit, txRate)
                          : 0;

                    const balanceToneRow =
                      row.runningBalance === 0 ? "text-muted-foreground" : isNegative(row.runningBalance) ? "text-red-600" : "text-emerald-600";

                    const serial = row.sourceId.slice(0, 8);
                    const name =
                      row.sourceTable === "roznamcha_entries"
                        ? t(lang, "ledger.source_roznamcha")
                        : t(lang, "ledger.source_ledger");
                    const userLabel =
                      row.createdByName || (row.createdById ? row.createdById.slice(0, 8) : "");

                    return (
                      <tr key={`${row.sourceId}-${idx}`} className="border-b last:border-b-0">
                        <ReportTd>{deriveLedgerBranchName(header)}</ReportTd>
                        <ReportTd>{row.entryDate}</ReportTd>
                        <ReportTd className="font-mono">{serial}</ReportTd>
                        <ReportTd>{safeText(userLabel)}</ReportTd>
                        <ReportTd className="font-mono">{safeText(row.referenceNo)}</ReportTd>
                        <ReportTd>{name}</ReportTd>
                        <ReportTd className="max-w-[440px] text-start">
                          <div className="truncate">{safeText(row.description)}</div>
                        </ReportTd>
                        <ReportTd className="text-end tabular-nums">{fmtNumber(row.debit)}</ReportTd>
                        <ReportTd className="text-end tabular-nums">{fmtNumber(row.credit)}</ReportTd>
                        <ReportTd className={cn("text-end tabular-nums font-semibold", balanceToneRow)}>{fmtNumber(row.runningBalance)}</ReportTd>
                        <ReportTd className="text-center tabular-nums">
                          <div>{fmtRate(rate || 0)}</div>
                          {effectiveUsdRateForDisplay !== null ? (
                            <div className="text-[10px] text-muted-foreground">{fmtRate(txRate || 0)}</div>
                          ) : null}
                        </ReportTd>
                        <ReportTd className="text-end tabular-nums text-primary">{fmtNumber(debitUsd)}</ReportTd>
                        <ReportTd className="text-end tabular-nums text-amber-600">{fmtNumber(creditUsd)}</ReportTd>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="p-4 text-center text-sm text-muted-foreground">
                      {t(lang, "ledger.no_entries")}
                    </td>
                  </tr>
                )}
              </tbody>
              {header ? (
                <tfoot className="bg-muted/40">
                  <tr className="border-t">
                    <td colSpan={7} className="px-2 py-2 text-end text-xs font-semibold">
                      {t(lang, "ledger.totals")}
                    </td>
                    <td className="px-2 py-2 text-end text-xs font-semibold tabular-nums">
                      {displayTotals ? fmtNumber(displayTotals.debit) : "0.00"}
                    </td>
                    <td className="px-2 py-2 text-end text-xs font-semibold tabular-nums">
                      {displayTotals ? fmtNumber(displayTotals.credit) : "0.00"}
                    </td>
                    <td className={cn("px-2 py-2 text-end text-xs font-semibold tabular-nums", balanceTone)}>
                      {displayTotals ? fmtNumber(displayTotals.balance) : "0.00"}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-muted-foreground">-</td>
                    <td className="px-2 py-2 text-end text-xs font-semibold tabular-nums text-primary">
                      {displayTotals ? fmtNumber(displayTotals.usdDebit) : "0.00"}
                    </td>
                    <td className="px-2 py-2 text-end text-xs font-semibold tabular-nums text-amber-600">
                      {displayTotals ? fmtNumber(displayTotals.usdCredit) : "0.00"}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          {header ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {t(lang, "ledger.pagination_hint")} {pageSize}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t(lang, "ledger.prev")}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                  {t(lang, "ledger.next")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[110px] text-[11px] text-muted-foreground">{k}:</div>
      <div className={cn("text-xs font-semibold text-foreground", tone)}>{v}</div>
    </div>
  );
}
