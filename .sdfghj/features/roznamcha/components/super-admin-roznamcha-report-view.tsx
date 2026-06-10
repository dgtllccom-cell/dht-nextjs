"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Eye, FileText, Filter, Link2, Maximize2, MoreVertical, Printer, RefreshCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { ReportTd, ReportTh } from "@/components/reports/report-primitives";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { openA4ReportWindow } from "@/lib/reports/open-a4-report-window";
import {
  getRoznamchaEntry,
  listRoznamchaEntries,
  type RoznamchaEntryRow,
  type RoznamchaLineRow,
  type RoznamchaType
} from "@/features/roznamcha/roznamcha-api";

type SessionInfo = {
  scopes: {
    countryIds: string[];
    countryBranchIds: string[];
    cityBranchIds: string[];
    isSuperAdmin: boolean;
  };
  isSuperAdmin?: boolean;
};

type SuperAdminRoznamchaRow = {
  id: string;
  type: RoznamchaType;
  typeLabel: string;
  countryId: string | null;
  countryName: string;
  countryCurrency: string;
  countryBranchId: string | null;
  countryBranchName: string;
  countryBranchCode: string;
  cityBranchId: string | null;
  cityBranchName: string;
  cityBranchCode: string;
  journalNo: string;
  voucherNo: string;
  entryDate: string;
  referenceNo: string;
  narration: string;
  status: string;
  createdBy: string;
  postedAt: string;
  approvedAt: string;
  accountParty: string;
  currency: string;
  debit: number;
  credit: number;
  usdRate: number;
  debitUsd: number;
  creditUsd: number;
  searchText: string;
  primaryLedgerId: string | null;
  primaryAccountId: string | null;
  lines: RoznamchaLineRow[];
  sourceEntry: RoznamchaEntryRow;
  remainingBalance?: number;
  balanceUsd?: number;
};

type FilterState = {
  fromDate: string;
  toDate: string;
  countryId: string;
  branchId: string;
  voucherType: string;
  partySearch: string;
};

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
  return v || "-";
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

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string | null | undefined) {
  const v = (value ?? "").toString().trim();
  if (!v) return "-";
  return v
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function fmtNumber(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getEntryBranch(row: RoznamchaEntryRow) {
  return row.city_branches?.name ?? row.country_branches?.name ?? "-";
}

function getEntryBranchCode(row: RoznamchaEntryRow) {
  return row.city_branches?.code ?? row.country_branches?.code ?? "-";
}

function getEntryCountry(row: RoznamchaEntryRow) {
  return row.countries?.name ?? "-";
}

function getVoucherType(row: RoznamchaEntryRow) {
  return titleCase(row.type);
}

function buildAccountPartyLabel(lines: RoznamchaLineRow[]) {
  const parts = lines
    .map((line) => {
      if (line.accounts) return `${line.accounts.code} · ${line.accounts.name}`;
      if (line.ledgers) return `${line.ledgers.code} · ${line.ledgers.name}`;
      return safeText(line.description);
    })
    .filter((value) => value && value !== "-");

  const unique = Array.from(new Set(parts));
  if (!unique.length) return "-";
  return unique.slice(0, 3).join(" / ");
}

function buildPrimaryLedgerId(lines: RoznamchaLineRow[]) {
  for (const line of lines) {
    if (line.ledger_id) return line.ledger_id;
  }
  return null;
}

function buildPrimaryAccountId(lines: RoznamchaLineRow[]) {
  for (const line of lines) {
    if (line.account_id) return line.account_id;
  }
  return null;
}

function buildCountryOptions(rows: SuperAdminRoznamchaRow[]): SearchSelectOption[] {
  const seen = new Map<string, SearchSelectOption>();
  for (const row of rows) {
    if (!row.countryId) continue;
    if (!seen.has(row.countryId)) {
      seen.set(row.countryId, {
        value: row.countryId,
        label: row.countryName,
        keywords: `${row.countryName} ${row.countryCurrency}`
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildBranchOptions(rows: SuperAdminRoznamchaRow[]): SearchSelectOption[] {
  const seen = new Map<string, SearchSelectOption>();
  for (const row of rows) {
    const key = row.cityBranchId ?? row.countryBranchId ?? "";
    if (!key) continue;
    if (!seen.has(key)) {
      const label = row.cityBranchId ? row.cityBranchName : row.countryBranchName;
      const keywords = [label, row.cityBranchCode, row.countryBranchCode, row.countryName].filter(Boolean).join(" ");
      seen.set(key, { value: key, label, keywords });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildVoucherTypeOptions(rows: SuperAdminRoznamchaRow[]): SearchSelectOption[] {
  const seen = new Map<string, SearchSelectOption>();
  for (const row of rows) {
    if (!seen.has(row.type)) {
      seen.set(row.type, { value: row.type, label: row.typeLabel, keywords: row.typeLabel });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildSearchText(entry: RoznamchaEntryRow, lines: RoznamchaLineRow[]) {
  return normalizeForSearch(
    [
      entry.journal_no,
      entry.voucher_no,
      entry.entry_date,
      entry.reference_no,
      entry.narration,
      entry.status,
      entry.countries?.name,
      entry.countries?.currency_code,
      entry.country_branches?.name,
      entry.country_branches?.code,
      entry.city_branches?.name,
      entry.city_branches?.code,
      entry.profiles?.full_name,
      entry.type,
      lines
        .map((line) =>
          [
            line.payment_entry_type,
            line.description,
            line.currency,
            line.accounts?.code,
            line.accounts?.name,
            line.ledgers?.code,
            line.ledgers?.name
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ")
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function toBaseRow(entry: RoznamchaEntryRow, lines: RoznamchaLineRow[]): SuperAdminRoznamchaRow {
  const debit = lines.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const credit = lines.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const debitUsd = lines.reduce((sum, row) => sum + (Number(row.debit || 0) > 0 ? Number(row.usd_amount || 0) : 0), 0);
  const creditUsd = lines.reduce((sum, row) => sum + (Number(row.credit || 0) > 0 ? Number(row.usd_amount || 0) : 0), 0);
  const usdRate = lines.find((row) => Number(row.usd_rate || 0) > 0)?.usd_rate ?? 1;
  const currency = lines.find((row) => row.currency)?.currency ?? entry.countries?.currency_code ?? "-";
  const accountParty = buildAccountPartyLabel(lines);
  const primaryLedgerId = buildPrimaryLedgerId(lines);
  const primaryAccountId = buildPrimaryAccountId(lines);

  return {
    id: entry.id,
    type: entry.type,
    typeLabel: getVoucherType(entry),
    countryId: entry.country_id,
    countryName: getEntryCountry(entry),
    countryCurrency: entry.countries?.currency_code ?? "-",
    countryBranchId: entry.country_branch_id,
    countryBranchName: entry.country_branches?.name ?? "-",
    countryBranchCode: entry.country_branches?.code ?? "-",
    cityBranchId: entry.city_branch_id,
    cityBranchName: entry.city_branches?.name ?? "-",
    cityBranchCode: entry.city_branches?.code ?? "-",
    journalNo: entry.journal_no,
    voucherNo: entry.voucher_no,
    entryDate: entry.entry_date,
    referenceNo: safeText(entry.reference_no),
    narration: safeText(entry.narration),
    status: safeText(entry.status),
    createdBy: safeText(entry.profiles?.full_name),
    postedAt: safeText(entry.posted_at),
    approvedAt: safeText(entry.approved_at),
    accountParty,
    currency,
    debit,
    credit,
    usdRate,
    debitUsd,
    creditUsd,
    searchText: buildSearchText(entry, lines),
    primaryLedgerId,
    primaryAccountId,
    lines,
    sourceEntry: entry
  };
}

function filterRows(rows: SuperAdminRoznamchaRow[], filters: FilterState) {
  const q = normalizeForSearch(filters.partySearch);
  return rows
    .filter((row) => {
      if (filters.countryId !== "all" && row.countryId !== filters.countryId) return false;
      if (filters.branchId !== "all" && row.cityBranchId !== filters.branchId && row.countryBranchId !== filters.branchId) return false;
      if (filters.voucherType !== "all" && row.type !== filters.voucherType) return false;
      if (filters.fromDate && row.entryDate < filters.fromDate) return false;
      if (filters.toDate && row.entryDate > filters.toDate) return false;
      if (q && !row.searchText.includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.entryDate === b.entryDate) return a.voucherNo.localeCompare(b.voucherNo);
      return a.entryDate.localeCompare(b.entryDate);
    })
    .map((row, index, list) => {
      const previous = list.slice(0, index);
      const remainingBalance = previous.reduce((sum, item) => sum + item.debit - item.credit, 0) + row.debit - row.credit;
      const balanceUsd = previous.reduce((sum, item) => sum + item.debitUsd - item.creditUsd, 0) + row.debitUsd - row.creditUsd;
      return { ...row, remainingBalance, balanceUsd };
    });
}

function countryStats(rows: SuperAdminRoznamchaRow[]) {
  const map = new Map<string, { name: string; entries: number; debit: number; credit: number; balance: number }>();
  for (const row of rows) {
    const key = row.countryId ?? row.countryName;
    const next = map.get(key) ?? { name: row.countryName, entries: 0, debit: 0, credit: 0, balance: 0 };
    next.entries += 1;
    next.debit += row.debit;
    next.credit += row.credit;
    next.balance += row.debit - row.credit;
    map.set(key, next);
  }
  return Array.from(map.values()).sort((a, b) => b.entries - a.entries).slice(0, 4);
}

async function fetchSessionInfo() {
  return apiGet<SessionInfo>("/api/erp/auth/session");
}

export function SuperAdminRoznamchaReportView({
  lang,
  pageTitle,
  typeFilter,
  onTypeFilterChange
}: {
  lang: SupportedLanguage;
  pageTitle: string;
  typeFilter: RoznamchaType;
  onTypeFilterChange?: (type: RoznamchaType) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<SuperAdminRoznamchaRow[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toISOString());
  const [selectedId, setSelectedId] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => ({
    fromDate: monthStartIso(),
    toDate: todayIso(),
    countryId: "all",
    branchId: "all",
    voucherType: "all",
    partySearch: ""
  }));
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() => ({
    fromDate: monthStartIso(),
    toDate: todayIso(),
    countryId: "all",
    branchId: "all",
    voucherType: "all",
    partySearch: ""
  }));

  async function loadReport() {
    setRefreshing(true);
    try {
      const session = await fetchSessionInfo();
      setSessionInfo(session);

      const scope = session.scopes.isSuperAdmin
        ? {}
        : {
            countryId: session.scopes.countryIds[0] ?? null,
            countryBranchId: session.scopes.countryBranchIds[0] ?? null,
            cityBranchId: session.scopes.cityBranchIds[0] ?? null
          };

      const response = await listRoznamchaEntries({
        ...scope,
        limit: 250
      });

      const detailed = await Promise.all(
        (response.entries ?? []).map(async (entry) => {
          try {
            const res = await getRoznamchaEntry(entry.id);
            if (!res.header) return null;
            return toBaseRow(res.header, res.lines ?? []);
          } catch {
            return toBaseRow(entry, []);
          }
        })
      );

      const cleanRows = detailed.filter((row): row is SuperAdminRoznamchaRow => Boolean(row));
      setRows(cleanRows);
      setGeneratedAt(new Date().toISOString());

      if (!cleanRows.length) {
        setSelectedId("");
      } else {
        setSelectedId((current) => cleanRows.some((row) => row.id === current) ? current : cleanRows[0]!.id);
      }

      if (!session.scopes.isSuperAdmin) {
        const nextCountry = session.scopes.countryIds[0] ?? "all";
        const nextBranch = session.scopes.cityBranchIds[0] ?? session.scopes.countryBranchIds[0] ?? "all";
        setDraftFilters((current) => ({
          ...current,
          countryId: nextCountry,
          branchId: nextBranch
        }));
        setAppliedFilters((current) => ({
          ...current,
          countryId: nextCountry,
          branchId: nextBranch
        }));
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopedRows = useMemo(() => rows.filter((row) => row.type === typeFilter), [rows, typeFilter]);
  const visibleRows = useMemo(() => filterRows(scopedRows, appliedFilters), [appliedFilters, scopedRows]);

  const countryOptions = useMemo(() => buildCountryOptions(scopedRows), [scopedRows]);
  const branchOptions = useMemo(() => buildBranchOptions(scopedRows), [scopedRows]);
  const voucherTypeOptions = useMemo(() => buildVoucherTypeOptions(scopedRows), [scopedRows]);
  const selectedRow = useMemo(() => visibleRows.find((row) => row.id === selectedId) ?? visibleRows[0] ?? null, [selectedId, visibleRows]);
  const selectedLines = selectedRow?.lines ?? [];
  const countryOverview = useMemo(() => countryStats(visibleRows), [visibleRows]);

  useEffect(() => {
    if (!visibleRows.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!visibleRows.some((row) => row.id === selectedId)) {
      setSelectedId(visibleRows[0]!.id);
    }
  }, [selectedId, visibleRows]);

  const summary = useMemo(() => {
    const countries = new Set(visibleRows.map((row) => row.countryId ?? row.countryName));
    return {
      countries: countries.size,
      entries: visibleRows.length,
      debit: visibleRows.reduce((sum, row) => sum + row.debit, 0),
      credit: visibleRows.reduce((sum, row) => sum + row.credit, 0),
      balance: visibleRows.reduce((sum, row) => sum + row.debit - row.credit, 0)
    };
  }, [visibleRows]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
  }

  function resetFilters() {
    const reset = {
      fromDate: monthStartIso(),
      toDate: todayIso(),
      countryId: sessionInfo?.scopes.isSuperAdmin ? "all" : sessionInfo?.scopes.countryIds[0] ?? "all",
      branchId: sessionInfo?.scopes.isSuperAdmin
        ? "all"
        : sessionInfo?.scopes.cityBranchIds[0] ?? sessionInfo?.scopes.countryBranchIds[0] ?? "all",
      voucherType: "all",
      partySearch: ""
    };
    setDraftFilters(reset);
    setAppliedFilters(reset);
  }

  function exportCsv() {
    const headerRow = [
      "Date",
      "Country",
      "Branch Name",
      "Voucher Type",
      "Voucher No",
      "Account / Party",
      "Narration",
      "Currency",
      "Debit",
      "Credit",
      "Remaining Balance",
      "USD Rate",
      "Debit USD",
      "Credit USD",
      "Balance USD"
    ];

    const rowsCsv = [
      headerRow,
      ...visibleRows.map((row) => [
        row.entryDate,
        row.countryName,
        row.cityBranchId ? row.cityBranchName : row.countryBranchName,
        row.typeLabel,
        row.voucherNo,
        row.accountParty,
        row.narration,
        row.currency,
        fmtNumber(row.debit),
        fmtNumber(row.credit),
        fmtNumber(row.remainingBalance ?? row.debit - row.credit),
        fmtNumber(row.usdRate),
        fmtNumber(row.debitUsd),
        fmtNumber(row.creditUsd),
        fmtNumber(row.balanceUsd ?? row.debitUsd - row.creditUsd)
      ])
    ];

    const csv = rowsCsv
      .map((row) => row.map((value) => csvEscape(String(value ?? ""))).join(","))
      .join("\n");

    downloadTextFile(`super-admin-roznamcha_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  function buildSelectedRows(mode: "voucher" | "journal") {
    if (!selectedRow) return [];
    const rowsForPrint: { label: string; value: string }[] = [
      { label: "Voucher Type", value: selectedRow.typeLabel },
      { label: "Date", value: selectedRow.entryDate },
      { label: "Country", value: selectedRow.countryName },
      { label: "Branch", value: selectedRow.cityBranchId ? selectedRow.cityBranchName : selectedRow.countryBranchName },
      { label: "Voucher No", value: selectedRow.voucherNo },
      { label: "Journal No", value: selectedRow.journalNo },
      { label: "Account / Party", value: selectedRow.accountParty },
      { label: "Narration", value: selectedRow.narration },
      { label: "Currency", value: selectedRow.currency },
      { label: "Debit", value: fmtNumber(selectedRow.debit) },
      { label: "Credit", value: fmtNumber(selectedRow.credit) },
      { label: "Remaining Balance", value: fmtNumber(selectedRow.remainingBalance ?? 0) },
      { label: "USD Rate", value: fmtNumber(selectedRow.usdRate) },
      { label: "Debit USD", value: fmtNumber(selectedRow.debitUsd) },
      { label: "Credit USD", value: fmtNumber(selectedRow.creditUsd) },
      { label: "Balance USD", value: fmtNumber(selectedRow.balanceUsd ?? 0) },
      { label: "Status", value: selectedRow.status }
    ];

    const maxLines = mode === "journal" ? 12 : 6;
    selectedRow.lines.slice(0, maxLines).forEach((line, index) => {
      rowsForPrint.push({
        label: `Line ${index + 1}`,
        value: [
          line.payment_entry_type,
          line.ledgers ? `${line.ledgers.code} · ${line.ledgers.name}` : "",
          line.accounts ? `${line.accounts.code} · ${line.accounts.name}` : "",
          line.description,
          `Dr ${fmtNumber(line.debit)}`,
          `Cr ${fmtNumber(line.credit)}`,
          line.currency,
          `USD ${fmtNumber(line.usd_amount)}`
        ]
          .filter(Boolean)
          .join("  |  ")
      });
    });

    return rowsForPrint;
  }

  function openSelectedReport(autoPrint: boolean, mode: "voucher" | "journal") {
    if (!selectedRow) return;
    openA4ReportWindow({
      title: mode === "voucher" ? `${pageTitle} Voucher` : `${pageTitle} Journal`,
      subtitle: `${selectedRow.voucherNo} · ${selectedRow.entryDate} · ${selectedRow.countryName}`,
      rows: buildSelectedRows(mode),
      autoPrint
    });
  }

  function openSelectedLedger() {
    if (!selectedRow?.primaryLedgerId) return;
    router.push(`/dashboard/ledger/general-report?ledgerId=${encodeURIComponent(selectedRow.primaryLedgerId)}`);
  }

  function openSelectedAccount() {
    if (!selectedRow?.primaryAccountId) return;
    router.push(`/dashboard/new-entry/accounts/general-report?accountId=${encodeURIComponent(selectedRow.primaryAccountId)}`);
  }

  function openSelectedEntry() {
    const el = document.getElementById("super-admin-roznamcha-table");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeReportScope(nextType: RoznamchaType) {
    onTypeFilterChange?.(nextType);
    setMenuOpen(false);
  }

  function toggleFilters() {
    setFiltersOpen((value) => !value);
    setMenuOpen(false);
  }

  function expandView() {
    setFiltersOpen(false);
    setMenuOpen(false);
    document.getElementById("super-admin-roznamcha-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openFullScreen() {
    setMenuOpen(false);
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onMouseDown(e: MouseEvent) {
      const el = document.getElementById("roznamcha-actions-menu");
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

  const selectedCountryLabel = appliedFilters.countryId === "all"
    ? "All"
    : countryOptions.find((option) => option.value === appliedFilters.countryId)?.label ?? "All";
  const selectedBranchLabel = appliedFilters.branchId === "all"
    ? "All"
    : branchOptions.find((option) => option.value === appliedFilters.branchId)?.label ?? "All";
  const entryScopeTitle =
    typeFilter === "super_admin"
      ? "Roznamcha Entries (Super Admin)"
      : typeFilter === "country"
        ? "Roznamcha Entries (Country)"
        : "Roznamcha Entries (City)";

  return (
    <div className="mx-auto max-w-[1680px] space-y-2 bg-[#f7f8fb] px-2 py-2 text-[12.5px] md:px-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="m-0 text-xl font-bold tracking-tight text-slate-950">{pageTitle}</h1>
          <p className="m-0 text-xs text-slate-500">Country + Branch wise daily journal - USD rate used in table columns only (not in summary)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-950">
            Countries: <b className="text-blue-600">{selectedCountryLabel}</b>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-950">
            Branch: <b className="text-blue-600">{selectedBranchLabel}</b>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
            Generated Date: <b suppressHydrationWarning className="text-slate-950">{new Date(generatedAt).toLocaleString()}</b>
          </span>

          <div id="roznamcha-actions-menu" className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white"
              aria-label="Report actions"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {onTypeFilterChange ? (
                  <>
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="Super Admin View" active={typeFilter === "super_admin"} onClick={() => changeReportScope("super_admin")} />
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="Country Admin View" active={typeFilter === "country"} onClick={() => changeReportScope("country")} />
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="City Admin View" active={typeFilter === "branch"} onClick={() => changeReportScope("branch")} />
                    <MenuDivider />
                  </>
                ) : null}
                <MenuAction icon={<Filter className="h-4 w-4" />} label={filtersOpen ? "Hide Filters" : "Filters"} onClick={toggleFilters} />
                <MenuAction icon={<Maximize2 className="h-4 w-4" />} label="Expand View" onClick={expandView} />
                <MenuAction icon={<Maximize2 className="h-4 w-4" />} label="Full Screen" onClick={openFullScreen} />
                <MenuAction icon={<RefreshCcw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />} label={refreshing ? "Refreshing" : "Refresh"} onClick={() => void loadReport()} />
                <MenuDivider />
                <MenuAction icon={<Download className="h-4 w-4" />} label="Export PDF" onClick={() => openSelectedReport(false, "journal")} />
                <MenuAction icon={<Printer className="h-4 w-4" />} label="Print Report" onClick={() => openSelectedReport(true, "journal")} />
                <MenuAction icon={<Download className="h-4 w-4" />} label="Excel Export" onClick={exportCsv} />
                <MenuDivider />
                <MenuAction icon={<Eye className="h-4 w-4" />} label="View Voucher" onClick={() => openSelectedReport(false, "voucher")} />
                <MenuAction icon={<BookOpen className="h-4 w-4" />} label="Open Ledger" onClick={openSelectedLedger} />
                <MenuAction icon={<FileText className="h-4 w-4" />} label="View Journal" onClick={() => openSelectedReport(true, "journal")} />
                <MenuAction icon={<Link2 className="h-4 w-4" />} label="Open Roznamcha Entry" onClick={openSelectedEntry} />
                <MenuAction icon={<Search className="h-4 w-4" />} label="View Account" onClick={openSelectedAccount} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <Card className="rounded-[10px] border-slate-200 shadow-[0_8px_18px_rgba(17,24,39,.06)]">
        <CardHeader className="border-b bg-white py-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[12.5px] font-bold text-slate-950">Filters</CardTitle>
            <p className="m-0 text-[11px] text-slate-500">Select date + country/branch and USD rates</p>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid gap-2 xl:grid-cols-[140px_140px_200px_200px_170px_minmax(240px,1fr)_auto_auto] xl:items-end">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.from_date")}</Label>
              <Input
                className="h-8 text-xs"
                type="date"
                value={draftFilters.fromDate}
                onChange={(e) => setDraftFilters((cur) => ({ ...cur, fromDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t(lang, "ledger.to_date")}</Label>
              <Input
                className="h-8 text-xs"
                type="date"
                value={draftFilters.toDate}
                onChange={(e) => setDraftFilters((cur) => ({ ...cur, toDate: e.target.value }))}
              />
            </div>

            <SearchSelect
              label={t(lang, "roz.country")}
              value={draftFilters.countryId}
              placeholder={t(lang, "roz.all")}
              options={[{ value: "all", label: t(lang, "roz.all") }, ...countryOptions]}
              disabled={loading || !sessionInfo?.scopes.isSuperAdmin}
              onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, countryId: value, branchId: "all" }))}
            />

            <SearchSelect
              label={t(lang, "roz.branch")}
              value={draftFilters.branchId}
              placeholder={t(lang, "roz.all")}
              options={[{ value: "all", label: t(lang, "roz.all") }, ...branchOptions]}
              disabled={loading}
              onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, branchId: value }))}
            />

            <SearchSelect
              label="Voucher Type"
              value={draftFilters.voucherType}
              placeholder={t(lang, "roz.all")}
              options={[{ value: "all", label: t(lang, "roz.all") }, ...voucherTypeOptions]}
              disabled={loading}
              onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, voucherType: value }))}
            />

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Account / Party Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-9 text-xs"
                  value={draftFilters.partySearch}
                  onChange={(e) => setDraftFilters((cur) => ({ ...cur, partySearch: e.target.value }))}
                  placeholder={t(lang, "roz.search_placeholder")}
                />
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

      <Card className="rounded-[10px] border-slate-200 shadow-[0_8px_18px_rgba(17,24,39,.06)]">
        <CardHeader className="border-b bg-white py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-[12.5px] font-bold text-slate-950">Super Admin Summary</CardTitle>
              <p className="mt-1 text-[11px] text-slate-500">Local totals per country. USD columns are shown inside the table after Remaining Balance.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {countryOverview.length ? (
              countryOverview.map((item) => (
                <div key={item.name} className="rounded-[10px] border border-slate-200 bg-white p-2 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <div className="text-[12px] font-bold text-slate-950">{item.name} Summary</div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.entries} entries</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <MiniMetric label="Entries" value={String(item.entries)} />
                    <MiniMetric label="Debit" value={fmtNumber(item.debit)} tone="text-rose-600" />
                    <MiniMetric label="Credit" value={fmtNumber(item.credit)} tone="text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xs font-semibold">Balance (Local): <span className="text-rose-600">{fmtNumber(item.balance)}</span></div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">No data for selected filters.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card id="super-admin-roznamcha-table" className="rounded-[10px] border-slate-200 shadow-[0_8px_18px_rgba(17,24,39,.06)]">
          <CardHeader className="space-y-1 border-b bg-white py-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-[12.5px] font-bold text-slate-950">{entryScopeTitle}</CardTitle>
                <p className="mt-1 text-[11px] text-slate-500">Each row shows Country, Branch and USD rate after Remaining Balance</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Entries: <b className="text-foreground">{visibleRows.length}</b>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1700px] border-separate border-spacing-0 text-xs">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white dark:bg-slate-800">
                  <tr className="whitespace-nowrap">
                    {[
                      "Date",
                      "Country",
                      "Branch Name",
                      "Voucher Type",
                      "Voucher No",
                      "Account / Party",
                      "Narration",
                      "Currency",
                      "Debit",
                      "Credit",
                      "Remaining Balance",
                      "USD Rate",
                      "Debit USD",
                      "Credit USD",
                      "Balance USD"
                    ].map((label) => (
                      <ReportTh key={label} className={label === "Narration" || label === "Account / Party" ? "text-left" : "text-center"}>
                        {label}
                      </ReportTh>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : visibleRows.length ? (
                    visibleRows.map((row, index) => {
                      const active = row.id === selectedId;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "cursor-pointer border-b transition hover:bg-slate-50 dark:hover:bg-slate-900/40",
                            index % 2 === 0 ? "bg-background" : "bg-muted/20",
                            active ? "bg-primary/5 dark:bg-primary/10" : ""
                          )}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <ReportTd className="whitespace-nowrap text-center font-medium">{row.entryDate}</ReportTd>
                          <ReportTd className="whitespace-nowrap">{row.countryName}</ReportTd>
                          <ReportTd className="whitespace-nowrap">{row.cityBranchId ? row.cityBranchName : row.countryBranchName}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-center">{row.typeLabel}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-center font-mono">{row.voucherNo}</ReportTd>
                          <ReportTd className="max-w-[260px] text-left">
                            <div className="truncate font-medium">{row.accountParty}</div>
                          </ReportTd>
                          <ReportTd className="max-w-[260px] text-left">
                            <div className="truncate">{row.narration}</div>
                          </ReportTd>
                          <ReportTd className="whitespace-nowrap text-center font-mono">{row.currency}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums font-semibold text-rose-600">{fmtNumber(row.debit)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums font-semibold text-emerald-600">{fmtNumber(row.credit)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums font-semibold">{fmtNumber(row.remainingBalance ?? 0)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums">{fmtNumber(row.usdRate)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums text-rose-600">{fmtNumber(row.debitUsd)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums text-emerald-600">{fmtNumber(row.creditUsd)}</ReportTd>
                          <ReportTd className="whitespace-nowrap text-right tabular-nums font-semibold">{fmtNumber(row.balanceUsd ?? 0)}</ReportTd>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={15} className="px-4 py-10 text-center text-sm text-muted-foreground">
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

function MenuAction({
  icon,
  label,
  onClick,
  active = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50",
        active ? "bg-emerald-50 text-emerald-700" : ""
      )}
    >
      <span className={cn("text-slate-400", active ? "text-emerald-600" : "")}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-2 text-2xl font-semibold tracking-tight", tone)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", tone)}>{value}</div>
    </div>
  );
}

function KeyValue({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-2 rounded-md border bg-background px-3 py-2 text-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("min-w-0 truncate font-semibold text-slate-950 dark:text-slate-100", tone)}>{safeText(value)}</div>
    </div>
  );
}
