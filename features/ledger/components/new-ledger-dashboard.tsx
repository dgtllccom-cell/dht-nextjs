"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Printer,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  getLedgerStatement,
  type LedgerLookupRow,
  type LedgerStatementLine
} from "@/features/reports/ledger-report/ledger-report-api";

type LookupResponse = {
  found: boolean;
  account: LedgerLookupRow | null;
  query: string;
};

type SessionInfo = {
  user?: {
    id?: string;
    email?: string | null;
    fullName?: string | null;
  };
  roles?: string[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function yearStartIso() {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

function fmtNumber(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function safeText(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v || "-";
}

function branchLabel(row: LedgerLookupRow | null) {
  if (!row) return "-";
  return row.cityBranchName || row.countryBranchName || row.countryName || "-";
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

export function NewLedgerDashboard({ initialAccount = "" }: { initialAccount?: string }) {
  const [query, setQuery] = useState(initialAccount);
  const [fromDate, setFromDate] = useState(yearStartIso());
  const [toDate, setToDate] = useState(todayIso());
  const [account, setAccount] = useState<LedgerLookupRow | null>(null);
  const [lines, setLines] = useState<LedgerStatementLine[]>([]);
  const [totals, setTotals] = useState({ entries: 0, debit: 0, credit: 0, balance: 0 });
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const openingBalance = useMemo(() => {
    const first = lines[0];
    if (!first) return account?.currentBalance ?? 0;
    return first.runningBalance - first.debit + first.credit;
  }, [account?.currentBalance, lines]);

  async function loadAccount(searchValue = query) {
    const q = searchValue.trim();
    if (!q) {
      setError("Please enter Account Number, Manual Reference, Customer Number, or Account Name.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const lookup = await apiGet<LookupResponse>(
        `/api/erp/accounting/accounts/lookup?q=${encodeURIComponent(q)}&limit=500`
      );

      if (!lookup.found || !lookup.account) {
        setAccount(null);
        setLines([]);
        setTotals({ entries: 0, debit: 0, credit: 0, balance: 0 });
        setError("Account not found in Account Master. Check Account Number, Manual Reference, Customer Number, or Account Name.");
        return;
      }

      setAccount(lookup.account);
      const statement = await getLedgerStatement({
        ledgerId: lookup.account.ledgerId,
        fromDate,
        toDate,
        limit: 5000
      });
      setLines(statement.lines);
      setTotals({
        entries: statement.totals.entries,
        debit: statement.totals.debit,
        credit: statement.totals.credit,
        balance: statement.totals.balance || lookup.account.currentBalance || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ledger lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setAccount(null);
    setLines([]);
    setTotals({ entries: 0, debit: 0, credit: 0, balance: 0 });
    setError(null);
  }

  function printLedger() {
    window.print();
  }

  function downloadCsv() {
    exportCsv("new-ledger-statement.csv", [
      ["Date", "Name", "No", "Serial", "Details", "Dr", "Cr", "Total", "Ex. Rate", "Dr. (USD)", "Cr. (USD)"],
      ...lines.map((line, index) => [
        line.entryDate,
        line.createdByName || account?.accountName || "-",
        line.referenceNo || "-",
        String(index + 1).padStart(2, "0"),
        line.description || "-",
        fmtNumber(line.debit),
        fmtNumber(line.credit),
        fmtNumber(line.runningBalance),
        fmtNumber(line.usdRate),
        line.debit > 0 ? fmtNumber(line.usdAmount) : "0.00",
        line.credit > 0 ? fmtNumber(line.usdAmount) : "0.00"
      ])
    ]);
  }

  useEffect(() => {
    fetch("/api/erp/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSession(data))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (initialAccount.trim()) {
      void loadAccount(initialAccount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAccount]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6 print:p-0">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadAccount();
              }}
              className="h-10 pl-9 pr-10"
              placeholder="Search full account no, manual ref, customer no, account name, ledger..."
            />
            {query ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[280px]">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 text-xs" />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 text-xs" />
          </div>
          <Button type="button" onClick={() => void loadAccount()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        <div className="relative">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setActionsOpen((value) => !value)}>
            <MoreVertical className="h-4 w-4" />
            Actions
          </Button>
          {actionsOpen ? (
            <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted" onClick={printLedger}>
                <Printer className="h-4 w-4" /> Print
              </button>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted" onClick={downloadCsv}>
                <Download className="h-4 w-4" /> Export CSV
              </button>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted" onClick={printLedger}>
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="border-b p-5">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-cyan-600 dark:text-cyan-300">
                  Country&apos;s Ledger Report
                </h1>
                <p className="text-xs text-muted-foreground">
                  Status: Active | Created: {account ? fmtDate(lines[0]?.createdAt) : "-"}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Account: <span className="font-semibold text-foreground">{safeText(account?.accountCode)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-b lg:grid-cols-4">
            <InfoPanel title="Account Details" accent="cyan">
              <InfoRow label="A/c Name" value={safeText(account?.accountName)} strong />
              <InfoRow label="A/c Number" value={safeText(account?.accountCode)} strong />
              <InfoRow label="Manual Ref" value={safeText(account?.manualReferenceNumber)} />
              <InfoRow label="Customer No" value={safeText(account?.customerNumber)} />
              <InfoRow label="Category" value={safeText(account?.accountKind)} />
              <InfoRow label="Currency" value={safeText(account?.ledgerCurrency)} strong />
              <InfoRow label="Ledger" value={safeText(account?.ledgerCode)} strong />
            </InfoPanel>

            <InfoPanel title="Company Details" accent="blue">
              <InfoRow label="Company Name" value={safeText(account?.companyName)} />
              <InfoRow label="Country" value={safeText(account?.countryName)} />
              <InfoRow label="Main Branch" value={safeText(account?.countryBranchName)} />
              <InfoRow label="City Branch" value={safeText(account?.cityBranchName)} />
              <InfoRow label="State / City" value={`${safeText(account?.stateName)} / ${safeText(account?.cityName)}`} />
              <InfoRow label="Address" value={safeText(account?.address)} />
            </InfoPanel>

            <InfoPanel title="Ledger Summary" accent="indigo">
              <InfoRow label="Entries" value={String(totals.entries)} />
              <InfoRow label="Dr" value={fmtNumber(totals.debit || account?.debitTotal)} danger />
              <InfoRow label="Cr" value={fmtNumber(totals.credit || account?.creditTotal)} success />
              <InfoRow label="Opening" value={fmtNumber(openingBalance)} />
              <InfoRow label="Balance" value={fmtNumber(totals.balance || account?.currentBalance)} strong />
              <InfoRow label="1 USD" value="Rate stored per posting" />
            </InfoPanel>

            <InfoPanel title="Session / Login Details" accent="violet">
              <InfoRow label="Session Branch" value={branchLabel(account)} strong />
              <InfoRow label="Login Date" value={new Date().toLocaleDateString()} />
              <InfoRow label="Login Time" value={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
              <InfoRow label="User Name" value={safeText(session?.user?.fullName ?? "Super Admin")} strong />
              <InfoRow label="User ID" value={safeText(session?.user?.id)} />
              <InfoRow label="System" value="ERP / FMS" />
            </InfoPanel>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-xs">
              <thead className="bg-slate-900 text-white dark:bg-slate-800">
                <tr>
                  {["Date", "Name", "No.", "Serial", "Details", "Dr.", "Cr.", "Total", "Ex. Rate", "Dr. (USD)", "Cr. (USD)"].map((head) => (
                    <th key={head} className="border-b border-slate-700 px-4 py-3 text-left font-semibold uppercase tracking-wide">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                      Loading ledger data...
                    </td>
                  </tr>
                ) : lines.length ? (
                  lines.map((line, index) => (
                    <tr key={`${line.sourceId}-${index}`} className={cn("border-b", index % 2 ? "bg-muted/20" : "bg-background")}>
                      <td className="px-4 py-3">{fmtDate(line.entryDate)}</td>
                      <td className="px-4 py-3 font-medium text-cyan-600 dark:text-cyan-300">{line.createdByName || account?.accountName || "-"}</td>
                      <td className="px-4 py-3">{line.referenceNo || "-"}</td>
                      <td className="px-4 py-3">{String(index + 1).padStart(2, "0")}</td>
                      <td className="max-w-[360px] px-4 py-3">{line.description || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-cyan-600 dark:text-cyan-300">{fmtNumber(line.debit)}</td>
                      <td className="px-4 py-3 text-right text-rose-500">{fmtNumber(line.credit)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmtNumber(line.runningBalance)}</td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-300">{fmtNumber(line.usdRate)}</td>
                      <td className="px-4 py-3 text-right">{line.debit > 0 ? fmtNumber(line.usdAmount) : "0.00"}</td>
                      <td className="px-4 py-3 text-right">{line.credit > 0 ? fmtNumber(line.usdAmount) : "0.00"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                      {account ? "No posted ledger entries found for this account." : "Search an account to load the full ledger statement."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoPanel({
  title,
  accent,
  children
}: {
  title: string;
  accent: "cyan" | "blue" | "indigo" | "violet";
  children: React.ReactNode;
}) {
  const accentClass = {
    cyan: "border-cyan-400 text-cyan-600 dark:text-cyan-300",
    blue: "border-blue-500 text-blue-600 dark:text-blue-300",
    indigo: "border-indigo-500 text-indigo-600 dark:text-indigo-300",
    violet: "border-violet-500 text-violet-600 dark:text-violet-300"
  }[accent];

  return (
    <section className="border-b p-5 lg:border-b-0 lg:border-r last:lg:border-r-0">
      <h2 className={cn("mb-3 border-l-4 pl-3 text-xs font-bold uppercase tracking-wide", accentClass)}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  strong,
  success,
  danger
}: {
  label: string;
  value: string;
  strong?: boolean;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span
        className={cn(
          "text-right text-foreground",
          strong && "font-semibold text-cyan-600 dark:text-cyan-300",
          success && "font-semibold text-emerald-600",
          danger && "font-semibold text-rose-500"
        )}
      >
        {value || "-"}
      </span>
    </div>
  );
}
