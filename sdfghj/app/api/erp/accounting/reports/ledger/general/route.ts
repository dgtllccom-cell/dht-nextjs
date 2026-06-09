import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, handleApiError } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/erp-validation";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { ledgerReportService } from "@/lib/services/ledger-report-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestLanguage } from "@/lib/i18n/server";

const querySchema = z.object({
  reportScope: z.enum(["super_admin", "country", "branch"]).default("super_admin"),
  q: z.string().trim().max(200).optional(),
  scope: z.string().trim().max(50).optional(),
  countryId: uuidSchema.optional(),
  countryBranchId: uuidSchema.optional(),
  cityBranchId: uuidSchema.optional(),
  ledgerId: uuidSchema.optional(),
  fromDate: z.string().trim().min(8).optional(),
  toDate: z.string().trim().min(8).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(250)
});

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const language = await getRequestLanguage();
    const query = querySchema.parse({
      reportScope: request.nextUrl.searchParams.get("reportScope") ?? undefined,
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      scope: request.nextUrl.searchParams.get("scope") ?? undefined,
      countryId: request.nextUrl.searchParams.get("countryId") ?? undefined,
      countryBranchId: request.nextUrl.searchParams.get("countryBranchId") ?? undefined,
      cityBranchId: request.nextUrl.searchParams.get("cityBranchId") ?? undefined,
      ledgerId: request.nextUrl.searchParams.get("ledgerId") ?? undefined,
      fromDate: request.nextUrl.searchParams.get("fromDate") ?? undefined,
      toDate: request.nextUrl.searchParams.get("toDate") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    authorizeApiScope(session, {
      resource: "reports",
      action: "read",
      countryId: query.countryId ?? null,
      countryBranchId: query.countryBranchId ?? null,
      cityBranchId: query.cityBranchId ?? null
    });

    const fromDate = query.fromDate ?? monthStartIso();
    const toDate = query.toDate ?? todayIso();
    const admin = createSupabaseAdminClient() as any;

    const rawLedgers = await ledgerReportService.listLedgers({
      session,
      reportScope: query.reportScope,
      ledgerId: query.ledgerId ?? null,
      countryId: query.countryId ?? null,
      countryBranchId: query.countryBranchId ?? null,
      cityBranchId: query.cityBranchId ?? null,
      limit: query.limit,
      language
    });

    let rows = query.scope ? rawLedgers.filter((row) => row.scope === query.scope) : rawLedgers;
    const qText = normalizeForSearch(query.q ?? "");
    if (qText) {
      rows = rows.filter((row) => {
        const hay = normalizeForSearch(
          [
            row.ledgerCode,
            row.ledgerName,
            row.accountCode,
            row.accountName,
            row.accountKind,
            row.companyName,
            row.countryName,
            row.stateName,
            row.cityName,
            row.countryBranchName,
            row.cityBranchName,
            row.address,
            row.ledgerCurrency
          ]
            .filter(Boolean)
            .join(" ")
        );
        return hay.includes(qText);
      });
    }

    const ledgerIds = rows.map((row) => row.ledgerId);
    const balanceMap = new Map<
      string,
      { debit: number; credit: number; balance: number; updatedAt: string; balanceDate: string }
    >();

    if (ledgerIds.length) {
      const { data: balanceRows, error: balanceError } = await admin
        .from("ledger_balances")
        .select("ledger_id, balance_date, debit_total, credit_total, closing_balance, updated_at")
        .in("ledger_id", ledgerIds)
        .order("balance_date", { ascending: false });
      if (balanceError) throw new Error(balanceError.message);

      for (const row of balanceRows ?? []) {
        const ledgerId = (row as any).ledger_id as string;
        if (balanceMap.has(ledgerId)) continue;
        balanceMap.set(ledgerId, {
          debit: toNumber((row as any).debit_total),
          credit: toNumber((row as any).credit_total),
          balance: toNumber((row as any).closing_balance),
          updatedAt: String((row as any).updated_at ?? ""),
          balanceDate: String((row as any).balance_date ?? "")
        });
      }
    }

    const [batchLinesRes, rozLinesRes] = ledgerIds.length
      ? await Promise.all([
          admin
            .from("ledger_posting_lines")
            .select(
              "ledger_id, description, debit, credit, currency, usd_rate, usd_amount, created_at, ledger_posting_batches!inner(entry_date, reference_no, created_by, created_at)"
            )
            .in("ledger_id", ledgerIds)
            .gte("ledger_posting_batches.entry_date", fromDate)
            .lte("ledger_posting_batches.entry_date", toDate)
            .order("created_at", { ascending: true }),
          admin
            .from("roznamcha_lines")
            .select(
              "ledger_id, description, debit, credit, currency, usd_rate, usd_amount, created_at, roznamcha_entries!inner(entry_date, voucher_no, created_by, created_at)"
            )
            .in("ledger_id", ledgerIds)
            .gte("roznamcha_entries.entry_date", fromDate)
            .lte("roznamcha_entries.entry_date", toDate)
            .order("created_at", { ascending: true })
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if ((batchLinesRes as any).error) throw new Error((batchLinesRes as any).error.message);
    if ((rozLinesRes as any).error) throw new Error((rozLinesRes as any).error.message);

    type AggRow = {
      entries: number;
      debit: number;
      credit: number;
      lastActivityAt: string | null;
      lastReferenceNo: string | null;
      lastSource: "ledger" | "roznamcha" | null;
      lastDescription: string | null;
      lastEntryDate: string | null;
    };

    const agg = new Map<string, AggRow>();
    function ensure(id: string): AggRow {
      if (!agg.has(id)) {
        agg.set(id, {
          entries: 0,
          debit: 0,
          credit: 0,
          lastActivityAt: null,
          lastReferenceNo: null,
          lastSource: null,
          lastDescription: null,
          lastEntryDate: null
        });
      }
      return agg.get(id)!;
    }

    for (const row of (batchLinesRes as any).data ?? []) {
      const ledgerId = String(row.ledger_id);
      const entry = ensure(ledgerId);
      entry.entries += 1;
      entry.debit += toNumber(row.debit);
      entry.credit += toNumber(row.credit);
      const header = row.ledger_posting_batches ?? {};
      const activityAt = String(header.created_at ?? row.created_at ?? header.entry_date ?? "");
      if (!entry.lastActivityAt || activityAt > entry.lastActivityAt) {
        entry.lastActivityAt = activityAt;
        entry.lastReferenceNo = header.reference_no ?? null;
        entry.lastSource = "ledger";
        entry.lastDescription = row.description ?? null;
        entry.lastEntryDate = header.entry_date ?? null;
      }
    }

    for (const row of (rozLinesRes as any).data ?? []) {
      const ledgerId = String(row.ledger_id);
      const entry = ensure(ledgerId);
      entry.entries += 1;
      entry.debit += toNumber(row.debit);
      entry.credit += toNumber(row.credit);
      const header = row.roznamcha_entries ?? {};
      const activityAt = String(header.created_at ?? row.created_at ?? header.entry_date ?? "");
      if (!entry.lastActivityAt || activityAt > entry.lastActivityAt) {
        entry.lastActivityAt = activityAt;
        entry.lastReferenceNo = header.voucher_no ?? null;
        entry.lastSource = "roznamcha";
        entry.lastDescription = row.description ?? null;
        entry.lastEntryDate = header.entry_date ?? null;
      }
    }

    const rowsWithTotals = rows.map((row) => {
      const totals = agg.get(row.ledgerId) ?? { entries: 0, debit: 0, credit: 0, lastActivityAt: null, lastReferenceNo: null, lastSource: null, lastDescription: null, lastEntryDate: null };
      const balance = balanceMap.get(row.ledgerId);
      const branch = row.cityBranchName || row.countryBranchName || row.countryName || "-";
      return {
        ...row,
        branch,
        status: row.isActive ? "active" : "inactive",
        entries: totals.entries,
        debit: totals.debit,
        credit: totals.credit,
        balance: balance?.balance ?? totals.debit - totals.credit,
        balanceDate: balance?.balanceDate ?? null,
        lastActivityAt: totals.lastActivityAt,
        lastReferenceNo: totals.lastReferenceNo,
        lastSource: totals.lastSource,
        lastDescription: totals.lastDescription,
        lastEntryDate: totals.lastEntryDate
      };
    });

    const summary = rowsWithTotals.reduce(
      (acc, row) => {
        acc.totalLedgers += 1;
        if (row.status === "active") acc.activeLedgers += 1;
        else acc.inactiveLedgers += 1;
        acc.entries += row.entries;
        acc.debit += row.debit;
        acc.credit += row.credit;
        acc.balance += row.balance;
        return acc;
      },
      { totalLedgers: 0, activeLedgers: 0, inactiveLedgers: 0, entries: 0, debit: 0, credit: 0, balance: 0 }
    );

    const selectedLedger = query.ledgerId ? rowsWithTotals.find((row) => row.ledgerId === query.ledgerId) ?? null : null;

    const statement =
      query.ledgerId && selectedLedger
        ? await ledgerReportService.getLedgerStatement({
            session,
            ledgerId: query.ledgerId,
            fromDate,
            toDate,
            limit: 5000,
            language
          })
        : null;

    return apiOk({
      reportScope: query.reportScope,
      generatedAt: new Date().toISOString(),
      filters: {
        q: query.q ?? null,
        scope: query.scope ?? null,
        countryId: query.countryId ?? null,
        countryBranchId: query.countryBranchId ?? null,
        cityBranchId: query.cityBranchId ?? null,
        ledgerId: query.ledgerId ?? null,
        fromDate,
        toDate
      },
      summary,
      rows: rowsWithTotals,
      selectedLedger,
      statement
    });
  } catch (error) {
    return handleApiError(error);
  }
}
