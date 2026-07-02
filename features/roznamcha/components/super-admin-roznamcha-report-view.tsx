"use client";

import { DownloadActionIcon } from "@/components/ui/download-action-icon";
import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { DetailDrawer } from "@/components/ui/detail-drawer";
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
  superAdminSerialNo: string;
  countrySerialNo: string;
  branchSerialNo: string;
  accountNo: string;
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

type QuickPeriod = "today" | "yesterday" | "last7" | "last30" | "month" | "year";

function isoDateFromOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function yearStartIso() {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

function quickPeriodRange(period: QuickPeriod) {
  if (period === "today") return { fromDate: todayIso(), toDate: todayIso() };
  if (period === "yesterday") return { fromDate: isoDateFromOffset(-1), toDate: isoDateFromOffset(-1) };
  if (period === "last7") return { fromDate: isoDateFromOffset(-6), toDate: todayIso() };
  if (period === "last30") return { fromDate: isoDateFromOffset(-29), toDate: todayIso() };
  if (period === "year") return { fromDate: yearStartIso(), toDate: todayIso() };
  return { fromDate: monthStartIso(), toDate: todayIso() };
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

function fmtCountryValue(value: number) {
  if (value === 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
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

/**
 * Returns the primary (counterparty) line from the transaction's lines.
 * By convention, the API always inserts the counterparty line first (index 0)
 * and the cash/bank line second (index 1). We fall back to the first line if
 * a counterparty-looking line cannot be found.
 */
function getPrimaryLine(lines: RoznamchaLineRow[]): RoznamchaLineRow | null {
  if (!lines.length) return null;
  // The counterparty line is the first line that has a non-zero debit or credit.
  // The cash line is the opposing entry. We identify the counterparty line as the
  // first line in the array (per API insertion order).
  return lines[0] ?? null;
}

function buildAccountPartyLabel(lines: RoznamchaLineRow[]) {
  const primary = getPrimaryLine(lines);
  if (!primary) return "-";
  if (primary.accounts) return `${primary.accounts.code} · ${primary.accounts.name}`;
  if (primary.ledgers) return `${primary.ledgers.code} · ${primary.ledgers.name}`;
  return safeText(primary.description);
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

type BranchOption = SearchSelectOption & { countryId?: string | null };

function buildBranchOptions(rows: SuperAdminRoznamchaRow[]): BranchOption[] {
  const seen = new Map<string, BranchOption>();
  for (const row of rows) {
    const key = row.cityBranchId ?? row.countryBranchId ?? "";
    if (!key) continue;
    if (!seen.has(key)) {
      const label = row.cityBranchId ? row.cityBranchName : row.countryBranchName;
      const keywords = [label, row.cityBranchCode, row.countryBranchCode, row.countryName].filter(Boolean).join(" ");
      seen.set(key, { value: key, label, keywords, countryId: row.countryId });
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
  // Isolate the primary (counterparty) line – index 0 per API insertion order.
  // The cash/bank line (index 1) is the balancing entry and should NOT be shown
  // in the report summary row to avoid duplicate debit/credit display.
  const primaryLine = getPrimaryLine(lines);

  const debit = Number(primaryLine?.debit || 0);
  const credit = Number(primaryLine?.credit || 0);
  const usdRate = Number(primaryLine?.usd_rate || 0) > 0 ? primaryLine!.usd_rate : 1;
  const debitUsd = debit > 0 ? Number(primaryLine?.usd_amount || 0) : 0;
  const creditUsd = credit > 0 ? Number(primaryLine?.usd_amount || 0) : 0;
  const currency = primaryLine?.currency ?? entry.countries?.currency_code ?? "-";
  const accountParty = buildAccountPartyLabel(lines);
  const primaryLedgerId = buildPrimaryLedgerId(lines);
  const primaryAccountId = buildPrimaryAccountId(lines);

  const superAdminSerialNo = entry.super_admin_serial_number ?? entry.journal_no ?? "-";
  const countrySerialNo = entry.country_transaction_serial_number ?? entry.journal_no ?? "-";
  const branchSerialNo = entry.branch_transaction_serial_number ?? entry.voucher_no ?? "-";
  const accountNo =
    primaryLine?.account_number ??
    primaryLine?.accounts?.code ??
    primaryLine?.ledgers?.code ??
    lines.find((l) => l.account_number)?.account_number ??
    lines.find((l) => l.accounts?.code)?.accounts?.code ??
    lines.find((l) => l.ledgers?.code)?.ledgers?.code ??
    "-";

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
    superAdminSerialNo,
    countrySerialNo,
    branchSerialNo,
    accountNo,
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

function lineToRow(
  entry: RoznamchaEntryRow,
  line: RoznamchaLineRow,
  allLines: RoznamchaLineRow[]
): SuperAdminRoznamchaRow {
  const debit = Number(line.debit || 0);
  const credit = Number(line.credit || 0);
  const usdRate = Number(line.usd_rate || 0) > 0 ? line.usd_rate : 1;
  const debitUsd = debit > 0 ? Number(line.usd_amount || 0) : 0;
  const creditUsd = credit > 0 ? Number(line.usd_amount || 0) : 0;
  const currency = line.currency ?? entry.countries?.currency_code ?? "-";

  const accountParty = line.accounts 
    ? `${line.accounts.code} · ${line.accounts.name}`
    : line.ledgers 
      ? `${line.ledgers.code} · ${line.ledgers.name}`
      : safeText(line.description || entry.narration);

  const primaryLedgerId = line.ledger_id;
  const primaryAccountId = line.account_id;

  const superAdminSerialNo = entry.super_admin_serial_number ?? entry.journal_no ?? "-";
  const countrySerialNo = entry.country_transaction_serial_number ?? entry.journal_no ?? "-";
  const branchSerialNo = entry.branch_transaction_serial_number ?? entry.voucher_no ?? "-";
  const accountNo = line.accounts?.code ?? line.ledgers?.code ?? line.account_number ?? "-";

  return {
    id: line.id,
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
    superAdminSerialNo,
    countrySerialNo,
    branchSerialNo,
    accountNo,
    referenceNo: safeText(entry.reference_no),
    narration: safeText(line.description || entry.narration),
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
    searchText: buildSearchText(entry, [line]),
    primaryLedgerId,
    primaryAccountId,
    lines: allLines,
    sourceEntry: entry
  };
}

function filterRows(
  rows: SuperAdminRoznamchaRow[],
  filters: FilterState,
  getRateFn: (currency: string) => number
) {
  const q = normalizeForSearch(filters.partySearch);
  const filtered = rows
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
      if (a.entryDate === b.entryDate) {
        if (a.voucherNo === b.voucherNo) {
          return b.debit - a.debit;
        }
        return a.voucherNo.localeCompare(b.voucherNo);
      }
      return a.entryDate.localeCompare(b.entryDate);
    });

  // Calculate country-wise running balance
  const countryBalances = new Map<string, number>();
  const countryBalancesUsd = new Map<string, number>();

  return filtered.map((row) => {
    const country = row.countryName || "Unknown";
    const currentBal = countryBalances.get(country) ?? 0;
    const currentBalUsd = countryBalancesUsd.get(country) ?? 0;

    const rowRate = getRateFn(row.currency);
    const debitVal = row.debit;
    const creditVal = row.credit;

    // Remaining Balance is Debit minus Credit in local currency
    const newBal = currentBal + debitVal - creditVal;

    // Remaining Balance USD is Debit USD minus Credit USD
    const debitUsd = debitVal > 0 ? debitVal / rowRate : 0;
    const creditUsd = creditVal > 0 ? creditVal / rowRate : 0;
    const newBalUsd = currentBalUsd + debitUsd - creditUsd;

    countryBalances.set(country, newBal);
    countryBalancesUsd.set(country, newBalUsd);

    return {
      ...row,
      remainingBalance: newBal,
      balanceUsd: newBalUsd
    };
  });
}

function countryStats(rows: SuperAdminRoznamchaRow[]) {
  const map = new Map<string, { name: string; currency: string; entries: number; debit: number; credit: number; balance: number }>();
  for (const row of rows) {
    const name = row.countryName && row.countryName !== "-" ? row.countryName : "Unknown Country";
    const currency = row.countryCurrency && row.countryCurrency !== "-" ? row.countryCurrency : row.currency || "-";
    const key = `${name.toLowerCase()}::${currency.toUpperCase()}`;
    const current = map.get(key) ?? { name, currency, entries: 0, debit: 0, credit: 0, balance: 0 };
    current.entries += 1;
    current.debit += row.debit;
    current.credit += row.credit;
    current.balance += row.debit - row.credit;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
type BranchSummaryRow = {
  key: string;
  branchName: string;
  branchCode: string;
  branchType: string;
  transactions: number;
  debit: number;
  credit: number;
  balance: number;
  status: string;
};

function branchStats(rows: SuperAdminRoznamchaRow[]): BranchSummaryRow[] {
  const map = new Map<string, BranchSummaryRow>();
  for (const row of rows) {
    const isCityBranch = Boolean(row.cityBranchId);
    const key = row.cityBranchId || row.countryBranchId || `${row.countryName}::main`;
    const current = map.get(key) ?? {
      key,
      branchName: isCityBranch ? (row.cityBranchName || "-") : (row.countryBranchName || row.countryName || "-"),
      branchCode: isCityBranch ? (row.cityBranchCode || "-") : (row.countryBranchCode || "-"),
      branchType: isCityBranch ? "City Branch" : "Main Branch",
      transactions: 0,
      debit: 0,
      credit: 0,
      balance: 0,
      status: "Active"
    };
    current.transactions += 1;
    current.debit += row.debit;
    current.credit += row.credit;
    current.balance += row.debit - row.credit;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => a.branchName.localeCompare(b.branchName));
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
  const [activeDrawerEntry, setActiveDrawerEntry] = useState<SuperAdminRoznamchaRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<SuperAdminRoznamchaRow[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<string>(new Date().toISOString());
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportRibbonOpen, setReportRibbonOpen] = useState(false);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  
  // Custom header popover states and refs
  const [dateOpen, setDateOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const dateRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  const exchangeRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  
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
    showUsd: "Yes"
  });
  const [ratesApplied, setRatesApplied] = useState({
    pkr: 278.50,
    aed: 3.6725,
    afn: 72.30,
    inr: 83.10,
    showUsd: "Yes"
  });

  const isSuperAdminOrCountryAdmin = useMemo(() => {
    return Boolean(
      sessionInfo?.scopes?.isSuperAdmin ||
      sessionInfo?.roles?.some((r) => r === "country_admin" || r === "accountant")
    );
  }, [sessionInfo]);

  async function loadReport(rangeFilters: FilterState = appliedFilters) {
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
        fromDate: rangeFilters.fromDate,
        toDate: rangeFilters.toDate,
        search: rangeFilters.partySearch,
        limit: 500
      });

      const detailed = await Promise.all(
        (response.entries ?? []).map(async (entry) => {
          try {
            const res = await getRoznamchaEntry(entry.id);
            if (!res.header) return [];
            const entryLines = res.lines ?? [];
            if (entryLines.length === 0) {
              return [toBaseRow(res.header, [])];
            }
            return entryLines.map(line => lineToRow(res.header!, line, entryLines));
          } catch {
            return [toBaseRow(entry, [])];
          }
        })
      );

      const cleanRows = detailed.flat();
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

    const handleSaved = () => {
      void loadReport();
    };

    window.addEventListener("erp:posting-saved", handleSaved);
    window.addEventListener("erp:posting-deleted", handleSaved);
    return () => {
      window.removeEventListener("erp:posting-saved", handleSaved);
      window.removeEventListener("erp:posting-deleted", handleSaved);
    };
  }, []);

  const scopedRows = useMemo(() => {
    return rows.filter((row) => {
      if (typeFilter === "super_admin") {
        return true;
      }
      if (typeFilter === "country") {
        return row.type === "country" || row.type === "branch";
      }
      return row.type === "branch";
    });
  }, [rows, typeFilter]);
  const visibleRows = useMemo(() => {
    return filterRows(scopedRows, appliedFilters, (currency) => {
      const cur = (currency || "").toUpperCase();
      if (cur === "PKR") return ratesApplied.pkr;
      if (cur === "AED") return ratesApplied.aed;
      if (cur === "AFN") return ratesApplied.afn;
      if (cur === "INR") return ratesApplied.inr;
      return 1.0;
    });
  }, [appliedFilters, scopedRows, ratesApplied]);

  const countryOptions = useMemo(() => buildCountryOptions(scopedRows), [scopedRows]);
  const branchOptions = useMemo(() => buildBranchOptions(scopedRows), [scopedRows]);
  const filteredBranchOptions = useMemo(() => {
    if (draftFilters.countryId === "all") return branchOptions;
    return branchOptions.filter((opt) => opt.countryId === draftFilters.countryId);
  }, [branchOptions, draftFilters.countryId]);
  const voucherTypeOptions = useMemo(() => buildVoucherTypeOptions(scopedRows), [scopedRows]);
  const currencyOptions = useMemo(() => buildCurrencyOptions(scopedRows), [scopedRows]);
  const selectedRow = useMemo(() => visibleRows.find((row) => row.id === selectedId) ?? visibleRows[0] ?? null, [selectedId, visibleRows]);
  const countryOverview = useMemo(() => countryStats(visibleRows), [visibleRows]);
  const branchSummaryRows = useMemo(() => branchStats(visibleRows), [visibleRows]);
  const branchGrandTotal = useMemo(() => {
    return branchSummaryRows.reduce(
      (total, row) => ({
        transactions: total.transactions + row.transactions,
        debit: total.debit + row.debit,
        credit: total.credit + row.credit,
        balance: total.balance + row.balance
      }),
      { transactions: 0, debit: 0, credit: 0, balance: 0 }
    );
  }, [branchSummaryRows]);

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

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [titlePortalNode, setTitlePortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.getElementById("erp-page-actions-slot"));
    setTitlePortalNode(document.getElementById("erp-page-title-slot"));
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
    const nextFilters = { ...draftFilters };
    setAppliedFilters(nextFilters);
    setRatesApplied({ ...ratesDraft });
    void loadReport(nextFilters);
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
    void loadReport(reset);

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

  function buildSelectedRows(mode: "voucher" | "journal", row: SuperAdminRoznamchaRow | null = null) {
    const targetRow = row || selectedRow;
    if (!targetRow) return [];
    const rowRate = getRowRate(targetRow.currency);
    const rowsForPrint: { label: string; value: string }[] = [
      { label: "Voucher Type", value: targetRow.typeLabel },
      { label: "Date", value: targetRow.entryDate },
      { label: "Country", value: targetRow.countryName },
      { label: "Branch", value: targetRow.cityBranchId ? targetRow.cityBranchName : targetRow.countryBranchName },
      { label: "Voucher No", value: targetRow.voucherNo },
      { label: "Journal No", value: targetRow.journalNo },
      { label: "Account / Party", value: targetRow.accountParty },
      { label: "Narration", value: targetRow.narration },
      { label: "Currency", value: targetRow.currency },
      { label: "Debit", value: fmtNumber(targetRow.debit) },
      { label: "Credit", value: fmtNumber(targetRow.credit) },
      { label: "Remaining Balance", value: fmtNumber(targetRow.remainingBalance ?? 0) },
      { label: "USD Rate", value: fmtRate(rowRate) },
      { label: "Debit USD", value: fmtNumber(targetRow.debit / rowRate) },
      { label: "Credit USD", value: fmtNumber(targetRow.credit / rowRate) },
      { label: "Balance USD", value: fmtNumber((targetRow.remainingBalance ?? 0) / rowRate) },
      { label: "Status", value: targetRow.status }
    ];

    const maxLines = mode === "journal" ? 12 : 6;
    targetRow.lines.slice(0, maxLines).forEach((line, index) => {
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

  function openSelectedReport(autoPrint: boolean, mode: "voucher" | "journal", row: SuperAdminRoznamchaRow | null = null) {
    const targetRow = row || selectedRow;
    if (!targetRow) return;
    openA4ReportWindow({
      title: mode === "voucher" ? `${pageTitle} Voucher` : `${pageTitle} Journal`,
      subtitle: `${targetRow.voucherNo} · ${targetRow.entryDate} · ${targetRow.countryName}`,
      rows: buildSelectedRows(mode, targetRow),
      autoPrint,
      lang
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
    if (onTypeFilterChange) {
      onTypeFilterChange(nextType);
    } else {
      if (nextType === "super_admin") {
        router.push("/dashboard/roznamcha/super-admin");
      } else if (nextType === "country") {
        router.push("/dashboard/roznamcha/country");
      } else if (nextType === "branch") {
        router.push("/dashboard/roznamcha/branch");
      }
    }
    setMenuOpen(false);
  }

  function expandView() {
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
      if (e.key === "Escape") {
        setMenuOpen(false);
        setReportRibbonOpen(false);
        setRowMenuOpenId(null);
        setDateOpen(false);
        setExchangeOpen(false);
      }
    }
    function onMouseDown(e: MouseEvent) {
      const el = document.getElementById("roznamcha-actions-menu");
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);

      const ribbonEl = document.getElementById("report-ribbon-menu-container");
      if (ribbonEl && !ribbonEl.contains(e.target as Node)) setReportRibbonOpen(false);

      const target = e.target as HTMLElement;
      if (!target.closest(".row-action-menu-relative")) {
        setRowMenuOpenId(null);
      }

      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
      if (exchangeRef.current && !exchangeRef.current.contains(e.target as Node)) {
        setExchangeOpen(false);
      }
    }
    if (menuOpen || reportRibbonOpen || rowMenuOpenId || dateOpen || exchangeOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("mousedown", onMouseDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("mousedown", onMouseDown);
      };
    }
  }, [menuOpen, reportRibbonOpen, rowMenuOpenId, dateOpen, exchangeOpen, dateRef, exchangeRef]);

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

  const showUsd = isSuperAdminOrCountryAdmin && ratesApplied.showUsd === "Yes";

  const pakVal = rows.filter(r => r.countryName.toLowerCase() === "pakistan").reduce((sum, r) => sum + r.debit - r.credit, 0);
  const uaeVal = rows.filter(r => r.countryName.toLowerCase() === "uae").reduce((sum, r) => sum + r.debit - r.credit, 0);
  const afgVal = rows.filter(r => r.countryName.toLowerCase() === "afghanistan").reduce((sum, r) => sum + r.debit - r.credit, 0);

  const pakStr = formatCompact(Math.abs(pakVal));
  const uaeStr = formatCompact(Math.abs(uaeVal));
  const afgStr = formatCompact(Math.abs(afgVal));

  const filtersContent = (
        <div className="flex flex-wrap items-center gap-1.5 ml-2 border-l pl-2 border-slate-200 dark:border-slate-800">
          {/* 1. Date Range Dropdown Popover */}
          <div className="relative" ref={(el) => { dateRef.current = el; }}>
            <button
              type="button"
              onClick={() => setDateOpen(!dateOpen)}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 outline-none"
            >
              <span>📅 {appliedFilters.fromDate} to {appliedFilters.toDate}</span>
            </button>
            {dateOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-2xl z-[80] p-3 space-y-3 text-left">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ["today", "Today"],
                    ["yesterday", "Yesterday"],
                    ["last7", "Last 7 Days"],
                    ["last30", "Last 30 Days"],
                    ["month", "This Month"],
                    ["year", "This Year"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                      onClick={() => setDraftFilters((cur) => ({ ...cur, ...quickPeriodRange(value as QuickPeriod) }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-bold">From Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs rounded-lg border-slate-200"
                    value={draftFilters.fromDate}
                    onChange={(e) => setDraftFilters((cur) => ({ ...cur, fromDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-bold">To Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs rounded-lg border-slate-200"
                    value={draftFilters.toDate}
                    onChange={(e) => setDraftFilters((cur) => ({ ...cur, toDate: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex-1"
                    onClick={() => {
                      applyFilters();
                      setDateOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold rounded-lg flex-1 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                    onClick={() => {
                      resetFilters();
                      setDateOpen(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Country Dropdown */}
          <SearchSelect
            label=""
            value={draftFilters.countryId}
            placeholder="Countries: All"
            options={[{ value: "all", label: "Countries: All" }, ...countryOptions]}
            disabled={loading || !sessionInfo?.scopes.isSuperAdmin}
            onValueChange={(val) => {
              setDraftFilters((cur) => ({ ...cur, countryId: val, branchId: "all" }));
              setAppliedFilters((cur) => ({ ...cur, countryId: val, branchId: "all" }));
            }}
            triggerClassName="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm outline-none focus:border-blue-500 w-[110px]"
          />

          {/* 3. Branch Dropdown */}
          <SearchSelect
            label=""
            value={draftFilters.branchId}
            placeholder="Branch: All"
            options={[{ value: "all", label: "Branch: All" }, ...filteredBranchOptions]}
            disabled={loading}
            onValueChange={(val) => {
              setDraftFilters((cur) => ({ ...cur, branchId: val }));
              setAppliedFilters((cur) => ({ ...cur, branchId: val }));
            }}
            triggerClassName="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm outline-none focus:border-blue-500 w-[110px]"
          />

          {/* 4. Voucher Type Dropdown */}
          <SearchSelect
            label=""
            value={draftFilters.voucherType}
            placeholder="Voucher: All"
            options={[{ value: "all", label: "Voucher: All" }, ...voucherTypeOptions]}
            disabled={loading}
            onValueChange={(val) => {
              setDraftFilters((cur) => ({ ...cur, voucherType: val }));
              setAppliedFilters((cur) => ({ ...cur, voucherType: val }));
            }}
            triggerClassName="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm outline-none focus:border-blue-500 w-[100px]"
          />

          {/* 5. Account / Party Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-7 pl-6 text-[10px] rounded-md border-slate-200 bg-white w-[130px]"
              value={draftFilters.partySearch}
              onChange={(e) => {
                const val = e.target.value;
                setDraftFilters((cur) => ({ ...cur, partySearch: val }));
                setAppliedFilters((cur) => ({ ...cur, partySearch: val }));
              }}
              placeholder="Search name / A/C"
            />
          </div>

          {/* 6. Exchange Rates Dropdown Popover */}
          <div className="relative" ref={(el) => { exchangeRef.current = el; }}>
            <button
              type="button"
              onClick={() => setExchangeOpen(!exchangeOpen)}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-blue-600 shadow-sm flex items-center gap-1 hover:bg-slate-50 outline-none"
            >
              <span>💱 Rates</span>
            </button>
            {exchangeOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-2xl z-[80] p-3 space-y-3 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 font-bold">PKR / 1 USD</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs font-mono rounded-lg border-slate-200"
                      value={ratesDraft.pkr}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, pkr: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 font-bold">AED / 1 USD</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      className="h-8 text-xs font-mono rounded-lg border-slate-200"
                      value={ratesDraft.aed}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, aed: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 font-bold">AFN / 1 USD</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs font-mono rounded-lg border-slate-200"
                      value={ratesDraft.afn}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, afn: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 font-bold">INR / 1 USD</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-xs font-mono rounded-lg border-slate-200"
                      value={ratesDraft.inr}
                      onChange={(e) => setRatesDraft((cur) => ({ ...cur, inr: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-bold">Show USD Columns</Label>
                  <select
                    value={ratesDraft.showUsd}
                    onChange={(e) => setRatesDraft((cur) => ({ ...cur, showUsd: e.target.value }))}
                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500 font-semibold text-slate-800"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex-1"
                    onClick={() => {
                      applyFilters();
                      setExchangeOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold rounded-lg flex-1 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                    onClick={() => {
                      resetFilters();
                      setExchangeOpen(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 7. Print Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openSelectedReport(true, "journal")}
            className="h-7 rounded-md bg-white text-[10px] font-bold border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Printer className="mr-1 h-3 w-3" />
            Print
          </Button>

          {/* 8. Action Menu Dropdown */}
          <div id="roznamcha-actions-menu" className="relative">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md bg-white border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center p-0"
              aria-label="Report actions"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical className="h-3 w-3" aria-hidden />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-[60] mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-left">
                {onTypeFilterChange ? (
                  <>
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="Super Admin View" active={typeFilter === "super_admin"} onClick={() => changeReportScope("super_admin")} />
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="Country Admin View" active={typeFilter === "country"} onClick={() => changeReportScope("country")} />
                    <MenuAction icon={<Eye className="h-4 w-4" />} label="City Admin View" active={typeFilter === "branch"} onClick={() => changeReportScope("branch")} />
                    <MenuDivider />
                  </>
                ) : null}
                <MenuAction icon={<Maximize2 className="h-4 w-4" />} label="Expand View" onClick={expandView} />
                <MenuAction icon={<Maximize2 className="h-4 w-4" />} label="Full Screen" onClick={openFullScreen} />
                <MenuAction icon={<RefreshCcw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />} label={refreshing ? "Refreshing" : "Refresh"} onClick={() => void loadReport()} />
                <MenuDivider />
                <MenuAction icon={<DownloadActionIcon className="h-4 w-4" />} label="Export PDF" onClick={() => openSelectedReport(false, "journal")} />
                <MenuAction icon={<Printer className="h-4 w-4" />} label="Print Report" onClick={() => openSelectedReport(true, "journal")} />
                <MenuAction icon={<DownloadActionIcon className="h-4 w-4" />} label="Excel Export" onClick={exportCsv} />
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
  );

  const titleContent = (
    <div className="flex items-center gap-2">
      <h1 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        {typeFilter === "super_admin"
          ? "Super Admin Roznamcha Report"
          : typeFilter === "country"
            ? "Country Roznamcha Report"
            : "City Roznamcha Report"}
      </h1>
      <span className="text-[10px] text-slate-400">•</span>
      <span className="hidden lg:block text-[10px] text-slate-500 font-semibold truncate max-w-[400px]">
        {typeFilter === "super_admin"
          ? "Country + Branch daily journal - USD rate used in table columns only (not in summary)"
          : typeFilter === "country"
            ? "Country wise daily Roznamcha details with account, branch, debit and credit activity."
            : "Branch wise daily Roznamcha details with account, debit and credit activity."}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-none space-y-5 bg-[#f8fafc] px-4 py-4 text-[13px] md:px-6 xl:px-8">
      {portalNode ? createPortal(filtersContent, portalNode) : null}
      {titlePortalNode ? createPortal(titleContent, titlePortalNode) : null}

      {/* KPI Cards (Top Level) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <SummaryCard 
          title="Total Debit" 
          value={appliedFilters.countryId !== "all" ? `${targetCurrency} ${fmtNumber(totalDebitSum)}` : `USD ${fmtNumber(totalDebitSum)}`} 
          tone="red" 
        />
        <SummaryCard 
          title="Total Credit" 
          value={appliedFilters.countryId !== "all" ? `${targetCurrency} ${fmtNumber(totalCreditSum)}` : `USD ${fmtNumber(totalCreditSum)}`} 
          tone="green" 
        />
        <SummaryCard 
          title="Total Balance" 
          value={appliedFilters.countryId !== "all" ? `${targetCurrency} ${fmtNumber(Math.abs(totalDebitSum - totalCreditSum))}` : `USD ${fmtNumber(Math.abs(totalDebitSum - totalCreditSum))}`} 
          tone="slate" 
        />
        <SummaryCard title="Total Transactions" value={String(visibleRows.length)} tone="blue" />
        <SummaryCard title="Active Branches" value={String(branchesIncludedCount)} tone="amber" />
        <SummaryCard title="Active Countries" value={String(new Set(visibleRows.map((row) => row.countryId || row.countryName).filter(Boolean)).size)} tone="blue" />
        <SummaryCard title="Exchange Rate" value={showUsd ? "USD Enabled" : "Local Currency"} tone="slate" />
      </div>

      {/* Middle Layout based on role */}
      {typeFilter === "super_admin" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">🌍 Country-Based Financial Summary</h2>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-md">Currency isolation enforced</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {countryOverview.map((item) => (
              <Card key={item.name} className="overflow-hidden rounded-2xl border-0 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white flex justify-between items-center">
                  <span className="font-black tracking-wide text-sm">{item.name}</span>
                  <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.entries} Trx</span>
                </div>
                <CardContent className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Currency</span>
                    <span className="text-base font-black text-slate-800">{item.currency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Total Debit</span>
                    <span className="font-black text-rose-600">{fmtNumber(item.debit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Total Credit</span>
                    <span className="font-black text-emerald-600">{fmtNumber(item.credit)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase">Balance</span>
                    <span className="text-lg font-black text-slate-900">{fmtNumber(Math.abs(item.balance))}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="border-b bg-slate-50/80 px-4 py-3 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-black text-slate-950 dark:text-slate-100">Branch Wise Summary</CardTitle>
            <p className="text-[11px] font-semibold text-slate-500">Every branch summary for the selected country and date range.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr className="whitespace-nowrap text-left">
                    <th className="border border-slate-200 px-3 py-2.5 font-black dark:border-slate-800">Branch Name</th>
                    <th className="border border-slate-200 px-3 py-2.5 font-black dark:border-slate-800">Branch Code</th>
                    <th className="border border-slate-200 px-3 py-2.5 font-black dark:border-slate-800">Branch Type</th>
                    <th className="border border-slate-200 px-3 py-2.5 text-right font-black dark:border-slate-800">Total Transactions</th>
                    <th className="border border-slate-200 px-3 py-2.5 text-right font-black dark:border-slate-800">Total Debit</th>
                    <th className="border border-slate-200 px-3 py-2.5 text-right font-black dark:border-slate-800">Total Credit</th>
                    <th className="border border-slate-200 px-3 py-2.5 text-right font-black dark:border-slate-800">Balance</th>
                    <th className="border border-slate-200 px-3 py-2.5 text-center font-black dark:border-slate-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branchSummaryRows.length ? branchSummaryRows.map((row, index) => (
                    <tr key={row.key} className={cn("hover:bg-slate-50 dark:hover:bg-slate-900/40", index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-slate-900/30")}>
                      <td className="border border-slate-200 px-3 py-2.5 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">{row.branchName}</td>
                      <td className="border border-slate-200 px-3 py-2.5 font-mono font-bold text-blue-700 dark:border-slate-800 dark:text-blue-300">{row.branchCode}</td>
                      <td className="border border-slate-200 px-3 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">{row.branchType}</td>
                      <td className="border border-slate-200 px-3 py-2.5 text-right font-black dark:border-slate-800">{row.transactions}</td>
                      <td className="border border-slate-200 px-3 py-2.5 text-right font-mono font-black text-rose-600 dark:border-slate-800 dark:text-rose-400">{fmtCountryValue(row.debit)}</td>
                      <td className="border border-slate-200 px-3 py-2.5 text-right font-mono font-black text-emerald-600 dark:border-slate-800 dark:text-emerald-400">{fmtCountryValue(row.credit)}</td>
                      <td className="border border-slate-200 px-3 py-2.5 text-right font-mono font-black text-slate-900 dark:border-slate-800 dark:text-slate-100">{fmtCountryValue(Math.abs(row.balance))}</td>
                      <td className="border border-slate-200 px-3 py-2.5 text-center dark:border-slate-800">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{row.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="border border-slate-200 px-3 py-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-800">No branch summary records found.</td>
                    </tr>
                  )}
                  <tr className="bg-slate-900 text-white">
                    <td className="border border-slate-800 px-3 py-3 font-black uppercase" colSpan={3}>Grand Total</td>
                    <td className="border border-slate-800 px-3 py-3 text-right font-black">{branchGrandTotal.transactions}</td>
                    <td className="border border-slate-800 px-3 py-3 text-right font-mono font-black text-rose-200">{fmtCountryValue(branchGrandTotal.debit)}</td>
                    <td className="border border-slate-800 px-3 py-3 text-right font-mono font-black text-emerald-200">{fmtCountryValue(branchGrandTotal.credit)}</td>
                    <td className="border border-slate-800 px-3 py-3 text-right font-mono font-black">{fmtCountryValue(Math.abs(branchGrandTotal.balance))}</td>
                    <td className="border border-slate-800 px-3 py-3 text-center font-black">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {typeFilter !== "country" && (
      <div className="space-y-4">
        <Card id="super-admin-roznamcha-table" className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="space-y-1 border-b bg-slate-50/50 dark:bg-slate-900/50 py-2 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-950 dark:text-slate-100">
              {typeFilter === "country" ? "Country Roznamcha Report" : "Roznamcha Entries (Super Admin)"}
            </CardTitle>
            <div className="text-[11px] text-slate-500 font-semibold">
              {typeFilter === "country"
                ? "Country wise daily Roznamcha details with account, branch, debit and credit activity."
                : "Each row shows Country, Branch and USD rate after Remaining Balance"}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {typeFilter === "country" ? (
                <table className="w-full min-w-[1200px] border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                  <thead className="bg-slate-900 text-white dark:bg-slate-800">
                    <tr className="whitespace-nowrap text-left">
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Date</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">General Serial No</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Country Serial No</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Branch Serial No</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">User Name</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Account No</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Details</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Debit</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Credit</th>
                      {showUsd && (
                        <>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">USD Rate</th>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Dr (USD)</th>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Cr (USD)</th>
                        </>
                      )}
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={showUsd ? 13 : 10} className="p-10 text-center text-sm text-slate-400 italic border border-slate-200 dark:border-slate-800">
                          Loading entries...
                        </td>
                      </tr>
                    ) : visibleRows.length ? (
                      visibleRows.map((row, index) => {
                        const active = row.id === selectedId;

                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/40",
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                              active ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                            )}
                            onClick={() => {
                              setSelectedId(row.id);
                              setActiveDrawerEntry(row);
                            }}
                          >
                            <td className="p-2.5 text-center whitespace-nowrap border border-slate-200 dark:border-slate-800">{row.entryDate}</td>
                            <td className="p-2.5 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 font-semibold text-slate-800">{row.superAdminSerialNo}</td>
                            <td className="p-2.5 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 font-semibold text-slate-800">{row.countrySerialNo}</td>
                            <td className="p-2.5 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 text-slate-700">{row.branchSerialNo}</td>
                            <td className="p-2.5 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 text-slate-700">{row.createdBy}</td>
                            <td className="p-2.5 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 font-semibold text-blue-600 hover:underline">{row.accountNo}</td>
                            <td className="p-2.5 text-left max-w-[300px] truncate border border-slate-200 dark:border-slate-800 text-slate-600" title={row.narration}>{row.narration}</td>
                            <td className={cn(
                              "p-2.5 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                              row.debit > 0 ? "text-red-600 dark:text-red-400 font-black" : "text-slate-400 font-normal"
                            )}>
                              {row.debit > 0 ? fmtCountryValue(row.debit) : "0"}
                            </td>
                            <td className={cn(
                              "p-2.5 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                              row.credit > 0 ? "text-emerald-600 dark:text-emerald-450 font-black" : "text-slate-400 font-normal"
                            )}>
                              {row.credit > 0 ? fmtCountryValue(row.credit) : "0"}
                            </td>
                            {showUsd && (
                              <>
                                <td className="p-2.5 text-right whitespace-nowrap font-medium text-[10px] text-slate-500 bg-slate-50/50 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                                  {fmtRate(getRowRate(row.currency))}
                                </td>
                                <td className="p-2.5 text-right whitespace-nowrap font-bold text-red-700 border border-slate-200 dark:border-slate-800">
                                  {row.debit > 0 ? fmtNumber(row.debitUsd > 0 ? row.debitUsd : row.debit / getRowRate(row.currency)) : "-"}
                                </td>
                                <td className="p-2.5 text-right whitespace-nowrap font-bold text-emerald-700 border border-slate-200 dark:border-slate-800">
                                  {row.credit > 0 ? fmtNumber(row.creditUsd > 0 ? row.creditUsd : row.credit / getRowRate(row.currency)) : "-"}
                                </td>
                              </>
                            )}
                            <td className="p-2.5 text-center whitespace-nowrap border border-slate-200 dark:border-slate-800 relative row-action-menu-relative">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center mx-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRowMenuOpenId(rowMenuOpenId === row.id ? null : row.id);
                                }}
                              >
                                <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              {rowMenuOpenId === row.id && (
                                <div className="absolute right-2 top-8 z-30 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-left text-slate-800">
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRowMenuOpenId(null);
                                      setSelectedId(row.id);
                                      openSelectedReport(false, "voucher");
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                                    <span>View Voucher</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRowMenuOpenId(null);
                                      setSelectedId(row.id);
                                      openSelectedLedger();
                                    }}
                                  >
                                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Open Ledger</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRowMenuOpenId(null);
                                      setSelectedId(row.id);
                                      openSelectedReport(true, "journal");
                                    }}
                                  >
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    <span>View Journal</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRowMenuOpenId(null);
                                      setSelectedId(row.id);
                                      openSelectedAccount();
                                    }}
                                  >
                                    <Search className="h-3.5 w-3.5 text-slate-400" />
                                    <span>View Account</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={showUsd ? 13 : 10} className="p-10 text-center text-slate-400 font-medium italic border border-slate-200 dark:border-slate-800">
                          {t(lang, "roz.no_entries")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[1700px] border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                  <thead className="bg-slate-900 text-white dark:bg-slate-800">
                    <tr className="whitespace-nowrap text-left">
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Date</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Country</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Branch Name</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Voucher Type</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Voucher No</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Account / Party</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-left">Details / Narration</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-center">Currency</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Dr.</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Cr.</th>
                      <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Remaining Balance</th>
                      {showUsd && (
                        <>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">USD Rate</th>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Dr (USD)</th>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Cr (USD)</th>
                          <th className="p-2.5 font-bold border border-slate-200 dark:border-slate-800 text-right">Bal (USD)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={showUsd ? 15 : 11} className="p-10 text-center text-sm text-slate-400 italic border border-slate-200 dark:border-slate-800">
                          Loading entries...
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
                              "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-900/40",
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                              active ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                            )}
                            onClick={() => {
                              setSelectedId(row.id);
                              setActiveDrawerEntry(row);
                            }}
                          >
                            <td className="p-2 text-center whitespace-nowrap border border-slate-200 dark:border-slate-800">{row.entryDate}</td>
                            <td className="p-2 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800 font-semibold">{row.countryName}</td>
                            <td className="p-2 text-left whitespace-nowrap border border-slate-200 dark:border-slate-800">{row.cityBranchId ? row.cityBranchName : row.countryBranchName}</td>
                            <td className="p-2 text-center whitespace-nowrap border border-slate-200 dark:border-slate-800 font-medium text-slate-600">{row.typeLabel}</td>
                            <td className="p-2 text-center whitespace-nowrap font-mono border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">{row.voucherNo}</td>
                            <td className="p-2 text-left max-w-[200px] truncate border border-slate-200 dark:border-slate-800">
                              <span className="font-semibold text-blue-600 hover:underline">{row.accountParty}</span>
                            </td>
                            <td className="p-2 text-left max-w-[300px] truncate border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350" title={row.narration}>{row.narration}</td>
                            <td className="p-2 text-center whitespace-nowrap border border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-slate-100">{row.countryCurrency || "PKR"}</td>
                            <td className={cn(
                              "p-2 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                              row.debit > 0 ? "text-red-600 dark:text-red-400 font-black" : "text-slate-400 font-normal"
                            )}>
                              {fmtNumber(row.debit)}
                            </td>
                            <td className={cn(
                              "p-2 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                              row.credit > 0 ? "text-emerald-600 dark:text-emerald-450 font-black" : "text-slate-400 font-normal"
                            )}>
                              {fmtNumber(row.credit)}
                            </td>
                            <td className="p-2 text-right whitespace-nowrap font-black border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                              {fmtNumber(row.remainingBalance ?? 0)}
                            </td>
                            {showUsd && (
                              <>
                                <td className="p-2 text-right whitespace-nowrap font-mono font-bold border border-slate-200 dark:border-slate-800 text-slate-500">{fmtRate(rowRate)}</td>
                                <td className={cn(
                                  "p-2 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                                  drUsd > 0 ? "text-red-600 dark:text-red-400 font-black" : "text-slate-400 font-normal"
                                )}>
                                  {fmtNumber(drUsd)}
                                </td>
                                <td className={cn(
                                  "p-2 text-right whitespace-nowrap font-bold border border-slate-200 dark:border-slate-800",
                                  crUsd > 0 ? "text-emerald-600 dark:text-emerald-450 font-black" : "text-slate-400 font-normal"
                                )}>
                                  {fmtNumber(crUsd)}
                                </td>
                                <td className="p-2 text-right whitespace-nowrap font-black border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                                  {fmtNumber(balUsd)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={showUsd ? 15 : 11} className="p-10 text-center text-slate-400 font-medium italic border border-slate-200 dark:border-slate-800">
                          {t(lang, "roz.no_entries")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      <DetailDrawer
        isOpen={activeDrawerEntry !== null}
        onClose={() => {
          setActiveDrawerEntry(null);
        }}
        title={`Voucher: ${activeDrawerEntry?.voucherNo || "Details"}`}
        subtitle={`Roznamcha entry · Date: ${activeDrawerEntry?.entryDate || "-"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => activeDrawerEntry && openSelectedReport(false, "voucher", activeDrawerEntry)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> PDF Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => activeDrawerEntry && openSelectedReport(true, "voucher", activeDrawerEntry)}
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
          </div>
        }
      >
        {activeDrawerEntry && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Voucher No</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.voucherNo || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Journal No</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.journalNo || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Voucher Type</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.typeLabel || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Entry Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.entryDate || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Country</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.countryName || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Branch Office</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {activeDrawerEntry.cityBranchId ? activeDrawerEntry.cityBranchName : activeDrawerEntry.countryBranchName}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.status || "-"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Created By</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{activeDrawerEntry.createdBy || "-"}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/20 space-y-1 dark:bg-slate-900/50 dark:border-slate-800">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Narration / Details</span>
              <p className="text-xs text-foreground font-medium leading-relaxed">{activeDrawerEntry.narration || "No narration provided."}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Transaction Ledger Postings</h3>
              <div className="overflow-x-auto rounded-lg border dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Account Code & Name</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">USD Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {activeDrawerEntry.lines.map((line, idx) => {
                      const lineRate = getRowRate(line.currency);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="px-3 py-2 font-medium capitalize">{line.payment_entry_type}</td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {line.accounts ? `${line.accounts.code} - ${line.accounts.name}` : line.account_id}
                            </div>
                            {line.ledgers && (
                              <div className="text-[10px] text-muted-foreground">Ledger: {line.ledgers.code} - {line.ledgers.name}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-rose-600">
                            {line.debit ? `${activeDrawerEntry.countryCurrency || "PKR"} ${fmtNumber(Number(line.debit))}` : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-600">
                            {line.credit ? `${activeDrawerEntry.countryCurrency || "PKR"} ${fmtNumber(Number(line.credit))}` : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {line.usd_amount ? `$${fmtNumber(Number(line.usd_amount))}` : line.debit ? `$${fmtNumber(Number(line.debit) / lineRate)}` : line.credit ? `$${fmtNumber(Number(line.credit) / lineRate)}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border dark:bg-slate-900/30 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Debit Total</span>
                <div className="text-sm font-extrabold text-rose-600 mt-0.5">
                  {activeDrawerEntry.countryCurrency || "PKR"} {fmtNumber(activeDrawerEntry.debit)}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Credit Total</span>
                <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                  {activeDrawerEntry.countryCurrency || "PKR"} {fmtNumber(activeDrawerEntry.credit)}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: string; tone: "blue" | "green" | "red" | "amber" | "slate" }) {
  const toneClass = {
    blue: "from-blue-50 to-blue-100/50 text-blue-800 border-blue-200 shadow-blue-900/5",
    green: "from-emerald-50 to-emerald-100/50 text-emerald-800 border-emerald-200 shadow-emerald-900/5",
    red: "from-rose-50 to-rose-100/50 text-rose-800 border-rose-200 shadow-rose-900/5",
    amber: "from-amber-50 to-amber-100/50 text-amber-800 border-amber-200 shadow-amber-900/5",
    slate: "from-slate-50 to-white text-slate-800 border-slate-200 shadow-slate-900/5"
  }[tone];
  
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition-transform hover:scale-[1.02]", toneClass)}>
      <div className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-1">{title}</div>
      <div className="truncate text-xl font-black tabular-nums">{value}</div>
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





