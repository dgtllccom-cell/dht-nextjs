"use client";

import { apiGet } from "@/lib/api/client";

export type GoodsListRow = {
  id: string;
  country_id: string;
  goods_name: string;
  product_code: string | null;
  hs_code: string | null;
  size: string | null;
  brand: string | null;
  origin_country_id: string | null;
  image_url: string | null;
  is_active: boolean;
};

export async function listGoods(input: { countryId?: string; q?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (input.countryId) params.set("countryId", input.countryId);
  if (input.q) params.set("q", input.q);
  if (input.limit) params.set("limit", String(input.limit));
  return await apiGet<{ goods: GoodsListRow[]; limit: number }>(`/api/erp/goods?${params.toString()}`);
}

