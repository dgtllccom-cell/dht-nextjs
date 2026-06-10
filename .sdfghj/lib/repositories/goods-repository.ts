import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GoodsRow = {
  id: string;
  country_id: string;
  goods_name: string;
  product_code: string | null;
  hs_code: string | null;
  size: string | null;
  brand: string | null;
  origin_country_id: string | null;
  image_url: string | null;
  original_language_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function cleanQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export class GoodsRepository {
  async search(input: { query?: string | null; countryId?: string | null; limit?: number }) {
    const supabase = createSupabaseAdminClient() as any;
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

    let query = supabase
      .from("goods")
      .select(
        "id, country_id, goods_name, product_code, hs_code, size, brand, origin_country_id, image_url, original_language_code, is_active, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("goods_name", { ascending: true });

    if (input.countryId) query = query.eq("country_id", input.countryId);

    const q = cleanQuery(input.query ?? "");
    if (q) {
      const like = `%${q}%`;
      query = query.or(
        [
          `goods_name.ilike.${like}`,
          `product_code.ilike.${like}`,
          `hs_code.ilike.${like}`,
          `brand.ilike.${like}`
        ].join(",")
      );
    }

    const { data, error } = await query.limit(limit);
    if (error) throw new Error(error.message);
    return { goods: (data ?? []) as GoodsRow[], limit };
  }

  async getById(id: string) {
    const supabase = createSupabaseAdminClient() as any;
    const { data, error } = await supabase
      .from("goods")
      .select(
        "id, country_id, goods_name, product_code, hs_code, size, brand, origin_country_id, image_url, original_language_code, is_active, created_at, updated_at"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw new Error(error.message);
    return data as GoodsRow;
  }

  async create(input: {
    countryId: string;
    goodsName: string;
    productCode?: string | null;
    hsCode?: string | null;
    size?: string | null;
    brand?: string | null;
    originCountryId?: string | null;
    imageUrl?: string | null;
    originalLanguageCode: string;
  }) {
    const supabase = createSupabaseAdminClient() as any;
    const { data, error } = await supabase.rpc("create_goods", {
      p_country_id: input.countryId,
      p_goods_name: input.goodsName,
      p_product_code: input.productCode ?? null,
      p_hs_code: input.hsCode ?? null,
      p_size: input.size ?? null,
      p_brand: input.brand ?? null,
      p_origin_country_id: input.originCountryId ?? null,
      p_image_url: input.imageUrl ?? null,
      p_original_language_code: input.originalLanguageCode
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async update(
    id: string,
    input: {
      goodsName?: string;
      productCode?: string | null;
      hsCode?: string | null;
      size?: string | null;
      brand?: string | null;
      originCountryId?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
    }
  ) {
    const supabase = createSupabaseAdminClient() as any;
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (typeof input.goodsName === "string") patch.goods_name = input.goodsName;
    if (input.productCode !== undefined) patch.product_code = input.productCode;
    if (input.hsCode !== undefined) patch.hs_code = input.hsCode;
    if (input.size !== undefined) patch.size = input.size;
    if (input.brand !== undefined) patch.brand = input.brand;
    if (input.originCountryId !== undefined) patch.origin_country_id = input.originCountryId;
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
    if (typeof input.isActive === "boolean") patch.is_active = input.isActive;

    const { error } = await supabase.from("goods").update(patch).eq("id", id).is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  async softDelete(id: string) {
    const supabase = createSupabaseAdminClient() as any;
    const { error } = await supabase
      .from("goods")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
}

export const goodsRepository = new GoodsRepository();

