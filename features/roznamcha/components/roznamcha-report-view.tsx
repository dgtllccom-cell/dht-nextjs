"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Eye, FileText, Link2, MoreVertical, Printer, RefreshCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportTd, ReportTh } from "@/components/reports/report-primitives";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api/client";
import {
  getRoznamchaEntry,
  listRoznamchaEntries,
  type RoznamchaEntryRow,
  type RoznamchaLineRow,
  type RoznamchaType
} from "@/features/roznamcha/roznamcha-api";
import { parseNarration } from "@/lib/accounting/narration-parser";

type SessionInfo = {
  scopes: {
    countryIds: string[];
    countryBranchIds: string[];
    cityBranchIds: string[];
    isSuperAdmin: boolean;
  };
};

async function fetchSessionInfo() {
  return apiGet<SessionInfo>("/api/erp/auth/session");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function safeText(value: string | null | undefined) {
  const v = (value ?? "").toString().trim();
  return v ? v : "-";
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

function fmtNumber(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function entryCountryName(row: RoznamchaEntryRow) {
  return row.countries?.name ?? "-";
}

function entryBranchName(row: RoznamchaEntryRow) {
  return row.city_branches?.name ?? row.country_branches?.name ?? "-";
}

function entryBranchId(row: RoznamchaEntryRow) {
  return row.city_branch_id ?? row.country_branch_id ?? "";
}

function buildCountryOption(row: RoznamchaEntryRow): SearchSelectOption | null {
  if (!row.country_id) return null;
  const label = row.countries?.name ?? row.country_id;
  return { value: row.country_id, label, keywords: label };
}

function buildBranchOption(row: RoznamchaEntryRow): SearchSelectOption | null {
  const id = entryBranchId(row);
  if (!id) return null;
  const label = entryBranchName(row);
  const keywords = [label, row.city_branches?.code, row.country_branches?.code].filter(Boolean).join(" ");
  return { value: id, label, keywords };
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function RoznamchaReportView({
  lang,
  pageTitle,
  typeFilter
}: {
  lang: SupportedLanguage;
  pageTitle: string;
  typeFilter: RoznamchaType;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<RoznamchaEntryRow[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [countryId, setCountryId] = useState<string>("all");
  const [branchId, setBranchId] = useState<string>("all");
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedId, setSelectedId] = useState("");
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedHeader, setSelectedHeader] = useState<RoznamchaEntryRow | null>(null);
  const [selectedLines, setSelectedLines] = useState<RoznamchaLineRow[]>([]);
  const [selectedTotals, setSelectedTotals] = useState<{ lines: number; debit: number; credit: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const info = await fetchSessionInfo();
        if (!cancelled) setSessionInfo(info);

        // Default filters (country/branch) for non-super roles to avoid "empty" screens.
        if (!info.scopes.isSuperAdmin) {
          const nextCountry = info.scopes.countryIds[0] ?? "";
          const nextBranch = info.scopes.cityBranchIds[0] ?? info.scopes.countryBranchIds[0] ?? "";
          if (!cancelled) {
            if (nextCountry) setCountryId(nextCountry);
            if (nextBranch) setBranchId(nextBranch);
          }
        }

        const res = await listRoznamchaEntries({
          countryId: info.scopes.isSuperAdmin ? null : info.scopes.countryIds[0] ?? null,
          countryBranchId: info.scopes.isSuperAdmin ? null : info.scopes.countryBranchIds[0] ?? null,
          cityBranchId: info.scopes.isSuperAdmin ? null : info.scopes.cityBranchIds[0] ?? null
        });

        if (!cancelled) setEntries(res.entries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })().catch(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const countryOptions = useMemo(() => {
    const map = new Map<string, SearchSelectOption>();
    for (const row of entries) {
      const opt = buildCountryOption(row);
      if (opt) map.set(opt.value, opt);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, SearchSelectOption>();
    for (const row of entries) {
      const opt = buildBranchOption(row);
      if (opt) map.set(opt.value, opt);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const from = fromDate;
    const to = toDate;
    const needle = normalizeQuery(q);
    return entries
      .filter((row) => row.type === typeFilter)
      .filter((row) => {
        if (countryId !== "all" && row.country_id !== countryId) return false;
        if (branchId !== "all" && entryBranchId(row) !== branchId) return false;
        if (from && row.entry_date < from) return false;
        if (to && row.entry_date > to) return false;
        if (!needle) return true;
        const hay = normalizeQuery(
          [
            row.journal_no,
            row.voucher_no,
            row.reference_no,
            row.narration,
            entryCountryName(row),
            entryBranchName(row),
            row.profiles?.full_name
          ]
            .filter(Boolean)
            .join(" ")
        );
        return hay.includes(needle);
      })
      .sort((a, b) => (a.entry_date === b.entry_date ? a.voucher_no.localeCompare(b.voucher_no) : b.entry_date.localeCompare(a.entry_date)));
  }, [branchId, countryId, entries, fromDate, q, toDate, typeFilter]);

  const summary = useMemo(() => {
    const countries = new Set(filteredEntries.map((row) => row.country_id ?? entryCountryName(row)));
    return {
      countries: countries.size,
      entries: filteredEntries.length,
      debit: filteredEntries.reduce((sum, row) => sum + Number((row as any).debit ?? 0), 0),
      credit: filteredEntries.reduce((sum, row) => sum + Number((row as any).credit ?? 0), 0),
      balance: filteredEntries.reduce((sum, row) => sum + Number((row as any).debit ?? 0) - Number((row as any).credit ?? 0), 0)
    };
  }, [filteredEntries]);

  function applyFilters() {
    void 0;
  }

  function resetFilters() {
    setFromDate(monthStartIso());
    setToDate(todayIso());
    setCountryId(sessionInfo?.scopes.isSuperAdmin ? "all" : sessionInfo?.scopes.countryIds[0] ?? "all");
    setBranchId(sessionInfo?.scopes.isSuperAdmin ? "all" : sessionInfo?.scopes.cityBranchIds[0] ?? sessionInfo?.scopes.countryBranchIds[0] ?? "all");
    setQ("");
  }

  async function selectEntry(id: string) {
    setSelectedId(id);
    setSelectedLoading(true);
    try {
      const res = await getRoznamchaEntry(id);
      setSelectedHeader(res.header);
      setSelectedLines(res.lines ?? []);
      setSelectedTotals(res.totals ?? null);
    } finally {
      setSelectedLoading(false);
    }
  }

  const selectedLedgerId = useMemo(
    () => selectedLines.find((line) => line.ledger_id)?.ledger_id ?? selectedLines.find((line) => line.account_id)?.account_id ?? null,
    [selectedLines]
  );
  const selectedAccountId = useMemo(() => selectedLines.find((line) => line.account_id)?.account_id ?? null, [selectedLines]);


  function exportCsv() {
    if (!selectedHeader) return;

    const headerRow = [
      "Entry Date",
      "Type",
      "Voucher No",
      "Journal No",
      "Country",
      "Branch",
      "Payment Type",
      "Ledger",
      "Account",
      "Details",
      "Currency",
      "Debit",
      "Credit",
      "USD Rate",
      "USD Amount"
    ];

    const rows = selectedLines.map((l) => [
      selectedHeader.entry_date,
      selectedHeader.type,
      selectedHeader.voucher_no,
      selectedHeader.journal_no,
      entryCountryName(selectedHeader),
      entryBranchName(selectedHeader),
      l.payment_entry_type,
      l.ledgers ? `${l.ledgers.code} - ${l.ledgers.name}` : "",
      l.accounts ? `${l.accounts.code} - ${l.accounts.name}` : "",
      l.description ?? "",
      l.currency,
      l.debit ? String(l.debit) : "",
      l.credit ? String(l.credit) : "",
      l.usd_rate ? String(l.usd_rate) : "",
      l.usd_amount ? String(l.usd_amount) : ""
    ]);

    const csv = [headerRow, ...rows]
      .map((r) => r.map((c) => csvEscape(String(c ?? ""))).join(","))
      .join("\r\n");
        label: `Line ${index + 1}`,
        value: [
          line.payment_entry_type,
          line.ledgers ? `${line.ledgers.code} - ${line.ledgers.name}` : "",
          line.accounts ? `${line.accounts.code} - ${line.accounts.name}` : "",
          line.description,
          `Dr ${fmtNumber(Number(line.debit || 0))}`,
          `Cr ${fmtNumber(Number(line.credit || 0))}`,
          line.currency,
          `USD ${fmtNumber(Number(line.usd_amount || 0))}`
        ]
          .filter(Boolean)
          .join("  |  ")
      });
    });

    const title = mode === "voucher" ? "Roznamcha Voucher" : "Roznamcha Journal";
    const win = window.open("", "_blank", "width=1100,height=1400");
    if (!win) return;
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}.k{width:220px;font-weight:700;color:#475569}.h{font-size:20px;font-weight:700;margin-bottom:8px}.s{color:#64748b;margin-bottom:16px}</style></head><body>`);
    win.document.write(`<div class="h">${title}</div><div class="s">${selectedHeader.voucher_no} · ${selectedHeader.entry_date} · ${entryCountryName(selectedHeader)}</div>`);
    win.document.write(`<table>`);
    for (const row of rowsForPrint) {
      win.document.write(`<tr><td class="k">${row.label}</td><td>${row.value}</td></tr>`);
    }
    win.document.write(`</table>`);
    win.document.write(`</body></html>`);
    win.document.close();
    if (autoPrint) win.print();
  }

  function openSelectedLedger() {
    if (!selectedLedgerId) return;
    router.push(`/dashboard/ledger/general-report?ledgerId=${encodeURIComponent(selectedLedgerId)}`);
  }

  function openSelectedAccount() {
    if (!selectedAccountId) return;
    router.push(`/dashboard/new-entry/accounts/general-report?accountId=${encodeURIComponent(selectedAccountId)}`);
  }

  function openSelectedEntry() {
    const el = document.getElementById("roznamcha-entries-table");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const toneDebit = "text-red-600";
  const toneCredit = "text-blue-600";

  return (
    <div className="space-y-4">
      <ReportPageHeader
        title={pageTitle}
        subtitle={`${t(lang, "roz.report_subtitle")} · Compact accounting report`}
        actions={
          <>
            <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              Generated Date: <b className="text-foreground">{new Date().toLocaleString()}</b>
            </span>
            <Button type="button" variant="outline" onClick={() => setFiltersOpen((v) => !v)}>
              <Search className="h-4 w-4" aria-hidden />
              <span className="ms-2">{filtersOpen ? "Hide Filters" : "Search / Filters"}</span>
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()} disabled={!selectedHeader}>
              <Printer className="h-4 w-4" aria-hidden />
              <span className="ms-2">{t(lang, "ledger.print")}</span>
            </Button>

            <div id="roznamcha-actions-menu" className="relative">
              <Button type="button" variant="outline" onClick={() => setMenuOpen((v) => !v)}>
                <MoreVertical className="h-4 w-4" aria-hidden />
                <span className="ms-2">Actions</span>
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border bg-background shadow-xl">
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openSelectedReport(true, "journal")}>
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    Print
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openSelectedReport(false, "journal")}>
                    <Download className="h-4 w-4 text-muted-foreground" />
                    PDF Export
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={exportCsv}>
                    <Download className="h-4 w-4 text-muted-foreground" />
                    Excel Export
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openSelectedReport(false, "voucher")}>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    View Voucher
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={openSelectedLedger}>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Open Ledger
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openSelectedReport(true, "journal")}>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    View Journal
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={openSelectedEntry}>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Open Roznamcha Entry
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={openSelectedAccount}>
                    <Search className="h-4 w-4 text-muted-foreground" />
                    View Account
                  </button>
                </div>
              ) : null}
            </div>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      {filtersOpen ? (
        <Card className="border-slate-200/80 shadow-sm xl:col-span-2">
          <CardContent className="p-4">
            <div className="grid gap-3 xl:grid-cols-[150px_150px_220px_220px_260px_minmax(240px,1fr)_auto] xl:items-end">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.from_date")}</Label>
                <Input className="h-9 text-xs" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.to_date")}</Label>
                <Input className="h-9 text-xs" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <SearchSelect
                label={t(lang, "roz.country")}
                value={countryId}
                placeholder={t(lang, "roz.all")}
                options={[{ value: "all", label: t(lang, "roz.all") }, ...countryOptions]}
                disabled={loading || !sessionInfo?.scopes.isSuperAdmin}
                onValueChange={(v) => {
                  setCountryId(v);
                  setBranchId("all");
                }}
              />
              <SearchSelect
                label={t(lang, "roz.branch")}
                value={branchId}
                placeholder={t(lang, "roz.all")}
                options={[{ value: "all", label: t(lang, "roz.all") }, ...branchOptions]}
                disabled={loading}
                onValueChange={setBranchId}
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{t(lang, "roz.search")}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-9 pl-9 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "roz.search_placeholder")} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button type="button" size="sm" onClick={applyFilters} disabled={loading}>
                  Apply
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={resetFilters} disabled={loading}>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:col-span-2 xl:grid-cols-5">
        <StatCard label="Entries" value={String(summary.entries)} tone="text-slate-950 dark:text-slate-100" />
        <StatCard label="Countries" value={String(summary.countries)} tone="text-sky-700" />
        <StatCard label="Debit Total" value={fmtNumber(summary.debit)} tone="text-rose-600" />
        <StatCard label="Credit Total" value={fmtNumber(summary.credit)} tone="text-emerald-600" />
        <StatCard label="Remaining Balance" value={fmtNumber(summary.balance)} tone="text-slate-950 dark:text-slate-100" />
      </div>

      <Card id="roznamcha-entries-table" className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t(lang, "roz.entries")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] border-collapse text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <ReportTh>{t(lang, "roz.date")}</ReportTh>
                    <ReportTh>{t(lang, "roz.voucher_no")}</ReportTh>
                    <ReportTh>{t(lang, "roz.journal_no")}</ReportTh>
                    <ReportTh>{t(lang, "roz.country")}</ReportTh>
                    <ReportTh>{t(lang, "roz.branch")}</ReportTh>
                    <ReportTh className="text-start">{t(lang, "roz.narration")}</ReportTh>
                    <ReportTh>{t(lang, "roz.status")}</ReportTh>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredEntries.length ? (
                    filteredEntries.map((row, idx) => {
                      const active = row.id === selectedId;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "cursor-pointer border-t hover:bg-muted/40",
                            idx % 2 ? "bg-muted/10" : "bg-background",
                            active ? "bg-primary/10" : ""
                        )}
                        onClick={() => selectEntry(row.id).catch(() => null)}
                      >
                          <ReportTd className="text-center whitespace-nowrap">{row.entry_date}</ReportTd>
                          <ReportTd className="text-center font-mono whitespace-nowrap">{row.voucher_no}</ReportTd>
                          <ReportTd className="text-center font-mono whitespace-nowrap">{row.journal_no}</ReportTd>
                          <ReportTd className="whitespace-nowrap">{entryCountryName(row)}</ReportTd>
                          <ReportTd className="whitespace-nowrap">{entryBranchName(row)}</ReportTd>
                          <ReportTd className="max-w-[280px] text-start">
                            <div className="truncate">{safeText(row.narration)}</div>
                          </ReportTd>
                          <ReportTd className="text-center whitespace-nowrap">{safeText(row.status)}</ReportTd>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-sm text-muted-foreground">
                        {t(lang, "roz.no_entries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border bg-background p-3 text-xs">
      <div className="text-[11px] font-semibold text-muted-foreground">{k}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
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
