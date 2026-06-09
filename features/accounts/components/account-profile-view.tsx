"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Landmark, Phone, Mail, Printer, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api/client";
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
  summary: any;
  workspace: {
    companyId: string | null;
    companyName: string;
    companyCode: string;
    companyOwner: string;
  };
  rows: AccountGeneralReportRow[];
  generatedAt: string;
};

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

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rowTone(balance: number) {
  if (!Number.isFinite(balance) || balance === 0) return "text-foreground";
  return balance < 0 ? "text-red-600" : "text-emerald-600";
}

function PreviewRow({ label, value, tone }: { label: string; value?: string | null; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 text-sm last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-right font-semibold", tone ?? "text-foreground")}>{value || "-"}</span>
    </div>
  );
}

export function AccountProfileView({
  lang,
  accountId
}: {
  lang: SupportedLanguage;
  accountId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AccountGeneralReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<AccountGeneralReportResponse>("/api/erp/accounting/reports/accounts/general?limit=500");
        if (!cancelled) {
          setData(res);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load account details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const selectedRow = useMemo(() => {
    if (!data?.rows || !accountId) return null;
    return data.rows.find((row) => row.accountId === accountId) ?? null;
  }, [data, accountId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground">
        Loading account view profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        <Button asChild variant="outline">
          <Link href="/dashboard/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account Register
          </Link>
        </Button>
      </div>
    );
  }

  if (!selectedRow) {
    return (
      <div className="space-y-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Account profile not found or invalid account ID.
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account Register
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Print-only styles */}
      <style>{`
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="no-print shrink-0">
            <Link href="/dashboard/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Accounts</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Account View Profile</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedRow.accountName} &mdash; {selectedRow.accountCode}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 no-print">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => {
              const t = document.title;
              document.title = `Account_${selectedRow.accountCode}_${selectedRow.accountName}`;
              window.print();
              document.title = t;
            }}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => {
              const sub = encodeURIComponent(`Account: ${selectedRow.accountName} (${selectedRow.accountCode})`);
              const body = encodeURIComponent(
                `Account Number: ${selectedRow.accountCode}\nName: ${selectedRow.accountName}\n` +
                `Journal: ${selectedRow.journalCode}\nType: ${selectedRow.accountCategory}\n` +
                `Branch: ${selectedRow.branchName}\nCountry: ${selectedRow.countryName}\n` +
                `Balance: ${fmtNumber(selectedRow.currentBalance)} ${selectedRow.currency}\n\n` +
                `View: ${window.location.href}`
              );
              window.open(`mailto:?subject=${sub}&body=${body}`);
            }}
            className="gap-1.5"
          >
            <Mail className="h-4 w-4" /> Email
          </Button>
          <Button
            type="button" size="sm"
            onClick={() => {
              const text = encodeURIComponent(
                `*Account Profile*\n*Name:* ${selectedRow.accountName}\n*Account #:* ${selectedRow.accountCode}\n` +
                `*Journal:* ${selectedRow.journalCode}\n*Type:* ${selectedRow.accountCategory}\n` +
                `*Branch:* ${selectedRow.branchName} (${selectedRow.branchCode})\n` +
                `*Country:* ${selectedRow.countryName} | ${selectedRow.currency}\n` +
                `*Balance:* ${fmtNumber(selectedRow.currentBalance)}\n*Status:* ${selectedRow.status}\n\n` +
                `View: ${window.location.href}`
              );
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
            className="gap-1.5 bg-[#25D366] hover:bg-[#20b558] text-white border-0"
          >
            <Phone className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => router.push(`/dashboard/accounts/setup?accountId=${selectedRow.accountId}`)}
          >
            Edit Account
          </Button>
        </div>
      </div>

      {/* ── Premium Account Header Card ────────────────────────────────── */}
      <div className="rounded-xl border bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] px-6 py-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Account Master Record</p>
            <h2 className="text-2xl font-extrabold tracking-tight">{selectedRow.accountName}</h2>
            <p className="mt-1 text-sm font-mono font-semibold text-white/80">
              {selectedRow.journalCode} / {selectedRow.accountCode}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              (selectedRow.status ?? "").toLowerCase() === "active"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {selectedRow.status || "Active"}
            </div>
            <p className="text-[10px] text-white/50 font-mono">{selectedRow.accountCategory} — {selectedRow.subType}</p>
            <p className="text-[10px] text-white/50">{selectedRow.currency} · {selectedRow.countryName}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          {[
            { label: "Opening", value: fmtNumber(selectedRow.openingBalance) },
            { label: "Total Debit", value: fmtNumber(selectedRow.debitTotal) },
            { label: "Total Credit", value: fmtNumber(selectedRow.creditTotal) },
            { label: "Net Balance", value: fmtNumber(selectedRow.currentBalance), highlight: true },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{item.label}</p>
              <p className={`text-lg font-extrabold font-mono mt-0.5 ${
                item.highlight
                  ? selectedRow.currentBalance < 0 ? "text-red-300" : "text-emerald-300"
                  : "text-white"
              }`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>


        {/* Left column */}
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Workspace</h2>
              <div className="space-y-1 text-sm">
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

          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Account Information</h2>
              <PreviewRow label="Account Number" value={selectedRow.accountCode} />
              <PreviewRow label="Manual Reference" value={selectedRow.manualReferenceNumber ?? undefined} />
              <PreviewRow label="Country Serial" value={selectedRow.countrySerialNumber} />
              <PreviewRow label="Branch Serial" value={selectedRow.branchSerialNumber} />
              <PreviewRow label="Customer Number" value={selectedRow.customerNumber} />
              <PreviewRow label="Account Name" value={selectedRow.accountName} />
              <PreviewRow label="Journal Code" value={selectedRow.journalCode} />
              <PreviewRow label="Account Category" value={selectedRow.accountCategory} />
              <PreviewRow label="Sub Type" value={selectedRow.subType} />
              <PreviewRow label="Status" value={selectedRow.status ? titleCase(selectedRow.status) : "-"} />
              <PreviewRow label="Created Date" value={fmtDateTime(selectedRow.createdAt)} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Branch & Country Details</h2>
              <PreviewRow label="Main Branch" value={selectedRow.mainBranchName ?? selectedRow.branchName} />
              <PreviewRow label="City Branch" value={selectedRow.cityBranchName ?? selectedRow.cityName} />
              <PreviewRow label="Branch Code" value={selectedRow.branchCode} />
              <PreviewRow label="Branch Type" value={selectedRow.branchType} />
              <PreviewRow label="Country" value={selectedRow.countryName} />
              <PreviewRow label="Country Code" value={selectedRow.countryCode} />
              <PreviewRow label="State / Province" value={selectedRow.stateName} />
              <PreviewRow label="City" value={selectedRow.cityName} />
              <PreviewRow label="Currency" value={selectedRow.currency} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Financial Summary</h2>
              <PreviewRow label="Opening Balance" value={fmtNumber(selectedRow.openingBalance)} />
              <PreviewRow label="Debit Total" value={fmtNumber(selectedRow.debitTotal)} />
              <PreviewRow label="Credit Total" value={fmtNumber(selectedRow.creditTotal)} />
              <PreviewRow
                label="Current Balance"
                value={fmtNumber(selectedRow.currentBalance)}
                tone={rowTone(selectedRow.currentBalance)}
              />
              <PreviewRow label="Linked Ledger Entries" value={String(selectedRow.linkedLedgerCount)} />
              <PreviewRow label="Journal Activity" value={String(selectedRow.journalActivityCount)} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Audit Information</h2>
              <PreviewRow label="Latest Journal" value={selectedRow.latestJournalNo ?? "-"} />
              <PreviewRow label="Recent Activity" value={selectedRow.recentActivityLabel ?? "-"} />
              <PreviewRow label="Recent Activity At" value={fmtDateTime(selectedRow.recentActivityAt)} />
              <PreviewRow label="Last Ledger Activity" value={fmtDateTime(selectedRow.latestActivityAt)} />
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold border-b pb-2 text-slate-900">Journal Preview</h2>
              {selectedRow.recentMovements.length ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedRow.recentMovements.map((movement, index) => (
                    <div key={`${movement.source}-${movement.referenceNo ?? index}`} className="rounded-lg border p-3 text-xs bg-slate-50">
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
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground text-center">
                  No journal activity found for this account yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
