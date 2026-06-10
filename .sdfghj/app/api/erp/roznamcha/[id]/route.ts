import { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { authorizeApiScope } from "@/lib/api/scope-middleware";
import { uuidSchema } from "@/lib/api/erp-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RoznamchaHeader = {
  id: string;
  type: string;
  country_id: string | null;
  country_branch_id: string | null;
  city_branch_id: string | null;
  journal_no: string;
  voucher_no: string;
  entry_date: string;
  payment_method_id: string | null;
  reference_no: string | null;
  narration: string | null;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

type RoznamchaLine = {
  id: string;
  payment_entry_type: string;
  account_id: string | null;
  ledger_id: string | null;
  description: string | null;
  debit: number;
  credit: number;
  currency: string;
  usd_rate: number;
  usd_amount: number;
  accounts?: { id: string; code: string; name: string } | null;
  ledgers?: { id: string; code: string; name: string } | null;
};

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireErpSession();
    const params = await context.params;
    const id = uuidSchema.parse(params.id);

    const supabase = createSupabaseAdminClient() as any;

    const { data: header, error: headerError } = await supabase
      .from("roznamcha_entries")
      .select(
        // Disambiguate profiles embedding (created_by vs approved_by) by pinning to the FK.
        // We keep the `profiles` key in the response for backward compatibility with the UI types.
        "id, type, country_id, countries(name,currency_code), country_branch_id, country_branches(name,code), city_branch_id, city_branches(name,code), journal_no, voucher_no, entry_date, payment_method_id, payment_methods(name), reference_no, narration, status, created_by, profiles!roznamcha_entries_created_by_fkey(full_name), approved_by, approved_at, posted_at, created_at, updated_at"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (headerError) throw new Error(headerError.message);

    if (!header) {
      return apiOk({
        found: false,
        id,
        header: null,
        lines: [],
        totals: { debit: 0, credit: 0, lines: 0 }
      });
    }

    authorizeApiScope(session, {
      resource: "roznamcha",
      action: "read",
      countryId: (header.country_id as string | null) ?? null,
      countryBranchId: (header.country_branch_id as string | null) ?? null,
      cityBranchId: (header.city_branch_id as string | null) ?? null
    });

    const { data: lines, error: linesError } = await supabase
      .from("roznamcha_lines")
      .select(
        "id, payment_entry_type, account_id, ledger_id, description, debit, credit, currency, usd_rate, usd_amount, accounts(id,code,name), ledgers(id,code,name)"
      )
      .eq("roznamcha_entry_id", id)
      .order("id", { ascending: true });

    if (linesError) throw new Error(linesError.message);

    const safeLines = (lines ?? []) as RoznamchaLine[];
    const totals = safeLines.reduce(
      (acc, row) => {
        acc.lines += 1;
        acc.debit += Number(row.debit || 0);
        acc.credit += Number(row.credit || 0);
        return acc;
      },
      { lines: 0, debit: 0, credit: 0 }
    );

    return apiOk({
      found: true,
      id,
      header: header as RoznamchaHeader,
      lines: safeLines,
      totals
    });
  } catch (error) {
    return handleApiError(error);
  }
}
