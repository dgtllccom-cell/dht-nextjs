import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CompanyRow = {
  id: string;
  name: string;
  legal_name: string | null;
  base_currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function cleanQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export class CompaniesRepository {
  async search(input: { query?: string | null; limit?: number }) {
    const supabase = createSupabaseAdminClient() as any;
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

    let query = supabase
      .from("companies")
      .select("id,name,legal_name,base_currency,is_active,created_at,updated_at")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    const q = cleanQuery(input.query ?? "");
    if (q) {
      const like = `%${q}%`;
      query = query.or([`name.ilike.${like}`, `legal_name.ilike.${like}`].join(","));
    }

    const { data, error } = await query.limit(limit);
    if (error) throw new Error(error.message);
    return { companies: (data ?? []) as CompanyRow[], limit };
  }

  async getById(id: string) {
    const supabase = createSupabaseAdminClient() as any;
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,legal_name,base_currency,is_active,created_at,updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw new Error(error.message);
    return data as CompanyRow;
  }

  async create(input: { name: string; legalName?: string | null; baseCurrency: string }) {
    const supabase = createSupabaseAdminClient() as any;
    const now = new Date().toISOString();
    const payload = {
      name: input.name.trim(),
      legal_name: input.legalName?.trim() ? input.legalName.trim() : null,
      base_currency: input.baseCurrency.trim().toUpperCase(),
      is_active: true,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase.from("companies").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }

  async update(
    id: string,
    input: Partial<{ name: string; legalName: string | null; baseCurrency: string; isActive: boolean }>
  ) {
    const supabase = createSupabaseAdminClient() as any;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("name" in input) patch.name = (input.name ?? "").trim();
    if ("legalName" in input) patch.legal_name = input.legalName?.trim() ? input.legalName.trim() : null;
    if ("baseCurrency" in input) patch.base_currency = (input.baseCurrency ?? "").trim().toUpperCase();
    if ("isActive" in input) patch.is_active = Boolean(input.isActive);

    const { error } = await supabase.from("companies").update(patch).eq("id", id).is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  async softDelete(id: string) {
    const supabase = createSupabaseAdminClient() as any;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("companies")
      .update({ deleted_at: now, updated_at: now, is_active: false })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
}

export const companiesRepository = new CompaniesRepository();

