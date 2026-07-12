import { NextRequest } from "next/server";
import { z } from "zod";
import { apiCreated, apiOk, handleApiError } from "@/lib/api/response";
import { requireErpSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const rateSchema = z.object({
  countryId: z.string().uuid("Invalid country ID"),
  countryBranchId: z.string().uuid().nullable().optional(),
  rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  buyingRate: z.number().positive("Buying rate must be positive"),
  sellingRate: z.number().positive("Selling rate must be positive"),
  creditRate: z.number().positive("Credit rate must be positive"),
  debitRate: z.number().positive("Debit rate must be positive"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireErpSession();
    const countryId = request.nextUrl.searchParams.get("countryId");
    const rateDate = request.nextUrl.searchParams.get("date");
    const latest = request.nextUrl.searchParams.get("latest") === "true";

    const supabase = createSupabaseAdminClient() as any;

    // Scope restriction for non-super admins
    let countryIds: string[] | null = null;
    if (!session.isSuperAdmin) {
      countryIds = session.countryIds.length > 0 ? session.countryIds : ["00000000-0000-0000-0000-000000000000"];
    }

    let query = supabase
      .from("daily_usd_rates")
      .select(
        "id, country_id, country_branch_id, rate_date, buying_rate, selling_rate, credit_rate, debit_rate, entered_by, approved_by, approved_at, created_at, updated_at, countries(name, currency_code, iso2)"
      )
      .is("deleted_at", null)
      .order("rate_date", { ascending: false })
      .order("updated_at", { ascending: false });

    if (countryId) {
      query = query.eq("country_id", countryId);
    } else if (countryIds) {
      query = query.in("country_id", countryIds);
    }

    if (rateDate) {
      query = query.eq("rate_date", rateDate);
    }

    if (latest) {
      query = query.limit(50); // one per country, sorted by date desc
    } else {
      query = query.limit(500);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // If requesting latest, deduplicate to one per country (already sorted desc)
    let rates = (data ?? []) as any[];
    if (latest && !countryId) {
      const seen = new Set<string>();
      rates = rates.filter((row: any) => {
        const key = `${row.country_id}:${row.country_branch_id ?? "null"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return apiOk({ rates, total: rates.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireErpSession();

    // Only super admins and country admins can set exchange rates
    if (!session.isSuperAdmin && !session.roles?.includes("country_admin") && !session.roles?.includes("accountant")) {
      throw new Error("Permission denied: only Super Admin or Country Admin can set exchange rates");
    }

    const body = rateSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient() as any;

    // Upsert: insert or update for this country + date + branch combination
    const upsertData = {
      country_id: body.countryId,
      country_branch_id: body.countryBranchId ?? null,
      rate_date: body.rateDate,
      buying_rate: body.buyingRate,
      selling_rate: body.sellingRate,
      credit_rate: body.creditRate,
      debit_rate: body.debitRate,
      entered_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("daily_usd_rates")
      .select("id")
      .eq("country_id", body.countryId)
      .eq("rate_date", body.rateDate)
      .is("country_branch_id", body.countryBranchId ?? null)
      .is("deleted_at", null)
      .maybeSingle();

    let result: any;
    if (existing?.id) {
      // Update existing rate
      const { data, error } = await supabase
        .from("daily_usd_rates")
        .update(upsertData)
        .eq("id", existing.id)
        .select("id, country_id, rate_date, buying_rate, selling_rate, credit_rate, debit_rate, updated_at")
        .single();
      if (error) throw new Error(error.message);
      result = { ...data, action: "updated" };
    } else {
      // Insert new rate
      const { data, error } = await supabase
        .from("daily_usd_rates")
        .insert({ ...upsertData, created_at: new Date().toISOString() })
        .select("id, country_id, rate_date, buying_rate, selling_rate, credit_rate, debit_rate, created_at")
        .single();
      if (error) throw new Error(error.message);
      result = { ...data, action: "created" };
    }

    return apiCreated(result);
  } catch (error) {
    return handleApiError(error);
  }
}
