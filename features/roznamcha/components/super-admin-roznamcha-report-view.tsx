"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Eye, FileText, Filter, Link2, Maximize2, MoreVertical, Printer, RefreshCcw, Search, Globe, Building2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
  user?: {
    id: string;
    email: string;
    fullName: string;
    preferredLanguage: string;
  };
  roles?: string[];
  permissions?: string[];
  scopes: {
    assignments?: any;
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
  currency: string;
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

function formatCompact(val: number) {
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return val.toFixed(0);
}

function fmtNumber(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRate(value: number) {
  if (value % 1 === 0) return value.toFixed(2);
  const str = value.toString();
  const decimals = str.split(".")[1]?.length ?? 2;
  return value.toFixed(Math.max(2, Math.min(4, decimals)));
}

function getEntryCountry(row: RoznamchaEntryRow) {
  return row.countries?.name ?? "-";
}

// Format type to title case
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

// Find primary account ID
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

function buildCurrencyOptions(rows: SuperAdminRoznamchaRow[]): SearchSelectOption[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.currency) {
      seen.add(row.currency.toUpperCase());
    }
  }
  return Array.from(seen).sort().map(cur => ({ value: cur, label: cur, keywords: cur }));
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
      if (filters.currency && filters.currency !== "all" && row.currency.toUpperCase() !== filters.currency.toUpperCase()) return false;
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
  const countries = ["Pakistan", "India", "UAE", "Afghanistan"];
  return countries.map((name) => {
    const matchingRows = rows.filter((r) => r.countryName.toLowerCase() === name.toLowerCase());
    const debit = matchingRows.reduce((sum, r) => sum + r.debit, 0);
    const credit = matchingRows.reduce((sum, r) => sum + r.credit, 0);
    const currency = matchingRows[0]?.currency ?? (name === "Pakistan" ? "PKR" : name === "India" ? "INR" : name === "UAE" ? "AED" : "AFN");
    return {
      name,
      currency,
      entries: matchingRows.length,
      debit,
      credit,
      balance: debit - credit
    };
  });
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
  const searchParams = useSearchParams();
  const entryIdParam = searchParams.get("entryId") ?? "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<SuperAdminRoznamchaRow[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toISOString());
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true); // Default open for filters
  
  // Filters State
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => ({
    fromDate: monthStartIso(),
    toDate: todayIso(),
    countryId: "all",
    branchId: "all",
    voucherType: "all",
    partySearch: "",
    currency: "all"
  }));
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() => ({
    fromDate: monthStartIso(),
    toDate: todayIso(),
    countryId: "all",
    branchId: "all",
    voucherType: "all",
    partySearch: "",
    currency: "all"
  }));

  // Exchange Rates State
  const [ratesDraft, setRatesDraft] = useState({
    pkr: 278.50,
    aed: 3.6725,
    afn: 72.30,
    inr: 83.10,
    showUsd: "No"
  });
  const [ratesApplied, setRatesApplied] = useState({
    pkr: 278.50,
    aed: 3.6725,
    afn: 72.30,
    inr: 83.10,
    showUsd: "No"
  });

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

      if (entryIdParam) {
        const match = cleanRows.find((r) => r.id === entryIdParam);
        if (match) setSelectedId(match.id);
      } else if (cleanRows.length) {
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
  const currencyOptions = useMemo(() => buildCurrencyOptions(scopedRows), [scopedRows]);
  const selectedRow = useMemo(() => visibleRows.find((row) => row.id === selectedId) ?? visibleRows[0] ?? null, [selectedId, visibleRows]);
  const countryOverview = useMemo(() => countryStats(visibleRows), [visibleRows]);

  const isFilteredToSingleCountry = appliedFilters.countryId !== "all";
  const targetCurrency = useMemo(() => {
    if (appliedFilters.currency !== "all") {
      return appliedFilters.currency.toUpperCase();
    }
    if (isFilteredToSingleCountry) {
      const matchedRow = visibleRows.find(r => r.countryId === appliedFilters.countryId);
      return matchedRow?.currency ?? "PKR";
    }
    return "USD";
  }, [visibleRows, appliedFilters, isFilteredToSingleCountry]);

  const totalDebitSum = useMemo(() => {
    if (appliedFilters.currency !== "all" || isFilteredToSingleCountry) {
      return visibleRows.reduce((sum, r) => sum + r.debit, 0);
    } else {
      return visibleRows.reduce((sum, r) => {
        const rowRate = getRowRate(r.currency);
        return sum + (r.debit > 0 ? r.debit / rowRate : 0);
      }, 0);
    }
  }, [visibleRows, appliedFilters, isFilteredToSingleCountry, ratesApplied]);

  const totalCreditSum = useMemo(() => {
    if (appliedFilters.currency !== "all" || isFilteredToSingleCountry) {
      return visibleRows.reduce((sum, r) => sum + r.credit, 0);
    } else {
      return visibleRows.reduce((sum, r) => {
        const rowRate = getRowRate(r.currency);
        return sum + (r.credit > 0 ? r.credit / rowRate : 0);
      }, 0);
    }
  }, [visibleRows, appliedFilters, isFilteredToSingleCountry, ratesApplied]);

  const branchesIncludedCount = useMemo(() => {
    const branches = new Set<string>();
    for (const r of visibleRows) {
      const key = r.cityBranchId ?? r.countryBranchId;
      if (key) branches.add(key);
    }
    return branches.size;
  }, [visibleRows]);

  // Client session & OS details
  const [clientSession, setClientSession] = useState({
    printDate: "",
    printTime: "",
    system: "Windows 11"
  });

  useEffect(() => {
    const now = new Date();
    const printDate = now.toISOString().slice(0, 10);
    const printTime = now.toTimeString().slice(0, 5);
    let system = "Windows 11";
    if (typeof window !== "undefined" && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("mac")) system = "macOS";
      else if (ua.includes("linux")) system = "Linux";
      else if (ua.includes("android")) system = "Android";
      else if (ua.includes("iphone") || ua.includes("ipad")) system = "iOS";
      else if (ua.includes("win")) system = "Windows 11";
    }
    setClientSession({ printDate, printTime, system });
  }, []);

  useEffect(() => {
    if (!visibleRows.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!visibleRows.some((row) => row.id === selectedId)) {
      setSelectedId(visibleRows[0]!.id);
    }
  }, [selectedId, visibleRows]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    setRatesApplied({ ...ratesDraft });
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
      partySearch: "",
      currency: "all"
    };
    setDraftFilters(reset);
    setAppliedFilters(reset);

    const ratesReset = {
      pkr: 278.50,
      aed: 3.6725,
      afn: 72.30,
      inr: 83.10,
      showUsd: "No"
    };
    setRatesDraft(ratesReset);
    setRatesApplied(ratesReset);
  }

  const getHeaderAlignment = (label: string) => {
    if (["Date", "Voucher Type", "Voucher No"].includes(label)) {
      return "text-center font-bold";
    }
    if (["Branch Name", "Account / Party", "Details / Narration"].includes(label)) {
      return "text-left font-bold";
    }
    return "text-right font-bold";
  };

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
      ...visibleRows.map((row) => {
        const rowRate = getRowRate(row.currency);
        return [
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
          fmtRate(rowRate),
          fmtNumber(row.debit / rowRate),
          fmtNumber(row.credit / rowRate),
          fmtNumber((row.remainingBalance ?? 0) / rowRate)
        ];
      })
    ];

    const csv = rowsCsv
      .map((row) => row.map((value) => csvEscape(String(value ?? ""))).join(","))
      .join("\n");

    downloadTextFile(`super-admin-roznamcha_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  function getRowRate(currency: string) {
    const cur = (currency || "").toUpperCase();
    if (cur === "PKR") return ratesApplied.pkr;
    if (cur === "AED") return ratesApplied.aed;
    if (cur === "AFN") return ratesApplied.afn;
    if (cur === "INR") return ratesApplied.inr;
    return 1.0;
  }

  function buildSelectedRows(mode: "voucher" | "journal") {
    if (!selectedRow) return [];
    const rowRate = getRowRate(selectedRow.currency);
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
      { label: "USD Rate", value: fmtRate(rowRate) },
      { label: "Debit USD", value: fmtNumber(selectedRow.debit / rowRate) },
      { label: "Credit USD", value: fmtNumber(selectedRow.credit / rowRate) },
      { label: "Balance USD", value: fmtNumber((selectedRow.remainingBalance ?? 0) / rowRate) },
      { label: "Status", value: selectedRow.status }
    ];

    const maxLines = mode === "journal" ? 12 : 6;
    selectedRow.lines.slice(0, maxLines).forEach((line, index) => {
      const lineRate = getRowRate(line.currency);
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
          `USD ${fmtNumber(line.debit > 0 ? line.debit / lineRate : line.credit > 0 ? line.credit / lineRate : 0)}`
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

  const showUsd = ratesApplied.showUsd === "Yes";

  return (
      <div className="mx-auto max-w-[1680px] space-y-3 bg-[#f7f8fb] px-3 py-3 text-[12.5px] md:px-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-bold tracking-tight text-slate-950">Roznamcha Report (Branch-wise)</h1>
            <p className="m-0 text-xs text-slate-500 font-semibold">Daily journal entries with branch summaries</p>
          </div>
  
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <Globe className="h-3.5 w-3.5 text-blue-500" />
              <span>Country: <strong className="text-blue-600 font-bold">{selectedCountryLabel}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Branch: <strong className="text-blue-600 font-bold">{selectedBranchLabel}</strong></span>
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 font-bold">
              Generated Date: <b suppressHydrationWarning className="text-slate-950">{new Date(generatedAt).toLocaleString()}</b>
            </span>
  
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openSelectedReport(true, "journal")}
              className="h-8 rounded-lg bg-white font-bold border-slate-200 hover:bg-slate-50 shadow-sm"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
  
            <div id="roznamcha-actions-menu" className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
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
          <Card className="rounded-[10px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(17,24,39,.03)]">
            <CardHeader className="border-b bg-slate-50/50 py-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-[12.5px] font-bold text-slate-950">Filters</CardTitle>
                <p className="m-0 text-[11px] text-slate-400">Use filters to generate branch-wise roznamcha</p>
              </div>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-semibold">From Date</Label>
                  <Input
                    className="h-8 text-xs rounded-lg"
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(e) => setDraftFilters((cur) => ({ ...cur, fromDate: e.target.value }))}
                  />
                </div>
  
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-semibold">To Date</Label>
                  <Input
                    className="h-8 text-xs rounded-lg"
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(e) => setDraftFilters((cur) => ({ ...cur, toDate: e.target.value }))}
                  />
                </div>
  
                <SearchSelect
                  label="Country"
                  value={draftFilters.countryId}
                  placeholder="All"
                  options={[{ value: "all", label: "All" }, ...countryOptions]}
                  disabled={loading || !sessionInfo?.scopes.isSuperAdmin}
                  onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, countryId: value, branchId: "all" }))}
                />
  
                <SearchSelect
                  label="Branch"
                  value={draftFilters.branchId}
                  placeholder="All"
                  options={[{ value: "all", label: "All" }, ...branchOptions]}
                  disabled={loading}
                  onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, branchId: value }))}
                />
              </div>
  
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                <SearchSelect
                  label="Voucher Type"
                  value={draftFilters.voucherType}
                  placeholder="All"
                  options={[{ value: "all", label: "All" }, ...voucherTypeOptions]}
                  disabled={loading}
                  onValueChange={(value) => setDraftFilters((cur) => ({ ...cur, voucherType: value }))}
                />
  
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-semibold">Account / Party</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-8 pl-9 text-xs rounded-lg"
                      value={draftFilters.partySearch}
                      onChange={(e) => setDraftFilters((cur) => ({ ...cur, partySearch: e.target.value }))}
                      placeholder="Search name / account no"
                    />
                  </div>
                </div>
  
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-semibold">Currency</Label>
                  <select
                    value={draftFilters.currency}
                    onChange={(e) => setDraftFilters((cur) => ({ ...cur, currency: e.target.value }))}
                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="all">All</option>
                    {currencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
  
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyFilters}
                    className="h-8 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={resetFilters}
                    className="h-8 flex-1 font-bold rounded-lg shadow-sm border border-slate-200"
                  >
                    Reset
                  </Button>
                </div>
              </div>
  
              <details className="mt-3 group border border-slate-200 rounded-lg bg-slate-50/50 p-3">
                <summary className="text-xs font-bold text-slate-700 cursor-pointer select-none outline-none hover:text-slate-900">
                  Advanced USD Rates / Columns Toggle
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-bold">PKR per 1 USD</Label>
                    <Input
                      className="h-8 text-xs font-mono rounded-lg border-slate-200 bg-white"
                      type="number"
                      step="0.01"
                      value={ratesDraft.pkr}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, pkr: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-bold">AED per 1 USD</Label>
                    <Input
                      className="h-8 text-xs font-mono rounded-lg border-slate-200 bg-white"
                      type="number"
                      step="0.0001"
                      value={ratesDraft.aed}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, aed: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-bold">AFN per 1 USD</Label>
                    <Input
                      className="h-8 text-xs font-mono rounded-lg border-slate-200 bg-white"
                      type="number"
                      step="0.01"
                      value={ratesDraft.afn}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, afn: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-bold">INR per 1 USD</Label>
                    <Input
                      className="h-8 text-xs font-mono rounded-lg border-slate-200 bg-white"
                      type="number"
                      step="0.01"
                      value={ratesDraft.inr}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, inr: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-bold">Show USD Columns</Label>
                    <select
                      value={ratesDraft.showUsd}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, showUsd: e.target.value }))}
                      className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 font-bold"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        ) : null}
  
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-[10px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(17,24,39,.03)]">
            <CardHeader className="border-b bg-slate-50/50 py-2">
              <CardTitle className="text-[12.5px] font-bold text-slate-950">Branch Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-[140px_1fr] gap-y-2 text-xs">
                <span className="text-slate-500 font-semibold">Total Entries:</span>
                <span className="font-bold text-slate-950">{visibleRows.length}</span>
  
                <span className="text-slate-500 font-semibold">Total Debit:</span>
                <span className="font-bold text-rose-600">{fmtNumber(totalDebitSum)} {targetCurrency}</span>
  
                <span className="text-slate-500 font-semibold">Total Credit:</span>
                <span className="font-bold text-emerald-600">{fmtNumber(totalCreditSum)} {targetCurrency}</span>
  
                <span className="text-slate-500 font-semibold">Net Balance:</span>
                <span className={cn("font-bold", (totalDebitSum - totalCreditSum) < 0 ? "text-rose-600" : "text-slate-950")}>
                  {fmtNumber(totalDebitSum - totalCreditSum)} {targetCurrency}
                </span>
  
                <span className="text-slate-500 font-semibold">Branches Included:</span>
                <span className="font-bold text-slate-950">{branchesIncludedCount}</span>
              </div>
            </CardContent>
          </Card>
  
          <Card className="rounded-[10px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(17,24,39,.03)]">
            <CardHeader className="border-b bg-slate-50/50 py-2">
              <CardTitle className="text-[12.5px] font-bold text-slate-950">Country-wise Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col justify-between h-[calc(100%-35px)]">
              <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
                {countryOverview.length ? (
                  countryOverview.map((item) => (
                    <Fragment key={item.name}>
                      <span className="text-slate-500 font-semibold">{item.name}:</span>
                      <span className="font-semibold text-slate-950">
                        Dr <b className="text-rose-600 font-bold">{formatCompact(item.debit)}</b> / Cr <b className="text-emerald-600 font-bold">{formatCompact(item.credit)}</b>
                      </span>
                    </Fragment>
                  ))
                ) : (
                  <span className="text-slate-400">No data for selected filters.</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold italic mt-2">
                (Demo values — connect your database later)
              </div>
            </CardContent>
          </Card>
  
          <Card className="rounded-[10px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(17,24,39,.03)]">
            <CardHeader className="border-b bg-slate-50/50 py-2">
              <CardTitle className="text-[12.5px] font-bold text-slate-950">Session / Print Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
                <span className="text-slate-500 font-semibold">Printed By:</span>
                <span className="font-bold text-slate-950">{sessionInfo?.user?.fullName ?? "Admin"}</span>
  
                <span className="text-slate-500 font-semibold">Print Date:</span>
                <span className="font-bold text-slate-950">{clientSession.printDate}</span>
  
                <span className="text-slate-500 font-semibold">Print Time:</span>
                <span className="font-bold text-slate-950">{clientSession.printTime}</span>
  
                <span className="text-slate-500 font-semibold">System:</span>
                <span className="font-bold text-slate-950">{clientSession.system}</span>
  
                <span className="text-slate-500 font-semibold">IP Address:</span>
                <span className="font-bold text-slate-950">192.168.1.10</span>
              </div>
            </CardContent>
          </Card>
        </div>
  
        <div className="space-y-4">
          <Card id="super-admin-roznamcha-table" className="rounded-[10px] border-slate-200 bg-white shadow-[0_8px_18px_rgba(17,24,39,.03)]">
            <CardHeader className="space-y-1 border-b bg-slate-50/50 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[12.5px] font-bold text-slate-950">{entryScopeTitle}</CardTitle>
                  <p className="mt-1 text-[11px] text-slate-500 font-semibold">Columns include Branch Name (as requested)</p>
                </div>
                <div className="text-xs text-muted-foreground font-bold">
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
                        "Voucher Type",
                        "Voucher No",
                        "Branch Name",
                        "Account / Party",
                        "Details / Narration",
                        "Dr.",
                        "Cr.",
                        "Running Balance",
                        ...(showUsd ? ["USD Rate", "Dr (USD)", "Cr (USD)", "Bal (USD)"] : [])
                      ].map((label) => (
                        <ReportTh key={label} className={getHeaderAlignment(label)}>
                          {label}
                        </ReportTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={showUsd ? 13 : 9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : visibleRows.length ? (
                      visibleRows.map((row, index) => {
                        const active = row.id === selectedId;
                        const rowRate = getRowRate(row.currency);
                        const drUsd = row.debit > 0 ? row.debit / rowRate : 0;
                        const crUsd = row.credit > 0 ? row.credit / rowRate : 0;
                        const balUsd = (row.remainingBalance ?? 0) / rowRate;
  
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
                            <ReportTd className="whitespace-nowrap text-center font-medium">{row.typeLabel}</ReportTd>
                            <ReportTd className="whitespace-nowrap text-center font-mono font-medium text-slate-800">{row.voucherNo}</ReportTd>
                            <ReportTd className="whitespace-nowrap text-left font-medium text-slate-600">{row.cityBranchId ? row.cityBranchName : row.countryBranchName}</ReportTd>
                            <ReportTd className="max-w-[260px] text-left">
                              <div className="truncate font-semibold text-blue-600 hover:underline">{row.accountParty}</div>
                            </ReportTd>
                            <ReportTd className="max-w-[260px] text-left">
                              <div className="truncate font-medium text-slate-600">{row.narration}</div>
                            </ReportTd>
                            <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-rose-600">{fmtNumber(row.debit)}</ReportTd>
                            <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-emerald-600">{fmtNumber(row.credit)}</ReportTd>
                            <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-slate-900">{fmtNumber(row.remainingBalance ?? 0)}</ReportTd>
                            {showUsd && (
                              <>
                                <ReportTd className="whitespace-nowrap text-right font-mono font-bold text-slate-500">{fmtRate(rowRate)}</ReportTd>
                                <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-rose-600">{fmtNumber(drUsd)}</ReportTd>
                                <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-emerald-600">{fmtNumber(crUsd)}</ReportTd>
                                <ReportTd className="whitespace-nowrap text-right tabular-nums font-bold text-slate-900">{fmtNumber(balUsd)}</ReportTd>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={showUsd ? 13 : 9} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
        active ? "bg-emerald-50 text-emerald-700 font-bold" : ""
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

