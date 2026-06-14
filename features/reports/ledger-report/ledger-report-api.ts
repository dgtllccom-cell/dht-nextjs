"use client";

import { apiGet } from "@/lib/api/client";

export type LedgerReportScope = "super_admin" | "country" | "branch";

export type LedgerLookupRow = {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  ledgerCurrency: string;
  normalBalance: "debit" | "credit";
  currentBalance: number;
  debitTotal: number;
  creditTotal: number;
  scope: string;
  countryId: string | null;
  countryName: string | null;
  countryBranchId: string | null;
  countryBranchName: string | null;
  cityBranchId: string | null;
  cityBranchName: string | null;
  accountId: string | null;
  accountCode: string | null;
  rawAccountCode?: string | null;
  manualReferenceNumber?: string | null;
  customerNumber?: string | null;
  countrySerialNumber?: string | null;
  branchSerialNumber?: string | null;
  accountName: string | null;
  accountKind: string | null;
  companyId: string | null;
  companyName: string | null;
  stateName: string | null;
  cityName: string | null;
  address: string | null;
  createdAt?: string | null;
};

export type LedgerStatementLine = {
  entryDate: string;
  sourceTable: "ledger_posting_batches" | "roznamcha_entries";
  sourceId: string;
  referenceNo: string | null;
  description: string | null;
  createdById: string | null;
  createdByName: string | null;
  debit: number;
  credit: number;
  currency: string;
  usdRate: number;
  usdAmount: number;
  createdAt: string;
  runningBalance: number;
  superAdminSerialNo?: string | null;
  countrySerialNo?: string | null;
  branchSerialNo?: string | null;
  branchName?: string | null;
};

export async function listLedgerReportLedgers(params: {
  reportScope: LedgerReportScope;
  q?: string | null;
  scope?: string | null;
  countryId?: string | null;
  countryBranchId?: string | null;
  cityBranchId?: string | null;
  limit?: number;
}) {
  const qp = new URLSearchParams();
  qp.set("reportScope", params.reportScope);
  if (params.q) qp.set("q", params.q);
  if (params.scope) qp.set("scope", params.scope);
  if (params.countryId) qp.set("countryId", params.countryId);
  if (params.countryBranchId) qp.set("countryBranchId", params.countryBranchId);
  if (params.cityBranchId) qp.set("cityBranchId", params.cityBranchId);
  if (params.limit) qp.set("limit", String(params.limit));

  return apiGet<{
    reportScope: LedgerReportScope;
    filters: {
      scope: string | null;
      countryId: string | null;
      countryBranchId: string | null;
      cityBranchId: string | null;
    };
    ledgers: LedgerLookupRow[];
    limit: number;
  }>(`/api/erp/accounting/reports/ledger/ledgers?${qp.toString()}`);
}

export async function getLedgerStatement(params: {
  ledgerId: string;
  fromDate: string;
  toDate: string;
  limit?: number;
}) {
  const qp = new URLSearchParams({
    ledgerId: params.ledgerId,
    fromDate: params.fromDate,
    toDate: params.toDate
  });
  if (params.limit) qp.set("limit", String(params.limit));

  return apiGet<{
    found: boolean;
    ledgerId: string;
    fromDate: string;
    toDate: string;
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
  }>(`/api/erp/accounting/reports/ledger/statement?${qp.toString()}`);
}
