import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupportedLanguage } from "@/lib/i18n/languages";
import { goodsRepository } from "@/lib/repositories/goods-repository";
import { multilingualService } from "@/lib/services/multilingual-service";

export type GoodsInput = {
  countryId: string;
  goodsName: string;
  productCode?: string | null;
  hsCode?: string | null;
  size?: string | null;
  brand?: string | null;
  originCountryId?: string | null;
  imageUrl?: string | null;
  originalLanguage: SupportedLanguage;
};

function translatableFields(input: GoodsInput) {
  return [
    ["goods_name", input.goodsName],
    ["size", input.size ?? ""],
    ["brand", input.brand ?? ""]
  ] as const;
}

export class GoodsService {
  async search(input: { query?: string | null; countryId?: string | null; limit?: number }) {
    return await goodsRepository.search(input);
  }

  async getById(id: string) {
    const goods = await goodsRepository.getById(id);
    return { goods };
  }

  async create(input: GoodsInput, actorId?: string | null) {
    const goodsId = await goodsRepository.create({
      countryId: input.countryId,
      goodsName: input.goodsName,
      productCode: input.productCode ?? null,
      hsCode: input.hsCode ?? null,
      size: input.size ?? null,
      brand: input.brand ?? null,
      originCountryId: input.originCountryId ?? null,
      imageUrl: input.imageUrl ?? null,
      originalLanguageCode: input.originalLanguage
    });

    await this.upsertTranslations(goodsId, input, actorId ?? null);
    return goodsId;
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
      originalLanguage: SupportedLanguage;
    },
    actorId?: string | null
  ) {
    await goodsRepository.update(id, {
      goodsName: input.goodsName,
      productCode: input.productCode,
      hsCode: input.hsCode,
      size: input.size,
      brand: input.brand,
      originCountryId: input.originCountryId,
      imageUrl: input.imageUrl
    });

    // Keep translations aligned with the latest "master" text.
    await this.upsertTranslations(
      id,
      {
        countryId: "", // not used for translations
        goodsName: input.goodsName ?? "",
        productCode: input.productCode ?? null,
        hsCode: input.hsCode ?? null,
        size: input.size ?? null,
        brand: input.brand ?? null,
        originCountryId: input.originCountryId ?? null,
        imageUrl: input.imageUrl ?? null,
        originalLanguage: input.originalLanguage
      },
      actorId ?? null
    );
  }

  async softDelete(id: string) {
    await goodsRepository.softDelete(id);
  }

  private async upsertTranslations(goodsId: string, input: GoodsInput, actorId: string | null) {
    const supabase = createSupabaseAdminClient() as any;

    const values = translatableFields(input)
      .filter(([, value]) => Boolean(value && value.trim()))
      .map(([fieldName, value]) => {
        const shell = multilingualService.createAutomaticTranslationShell(value, input.originalLanguage);
        const payload = multilingualService.createRecordTranslationPayload({
          recordTable: "goods",
          recordId: goodsId,
          fieldName,
          text: shell
        });
        return {
          record_table: payload.recordTable,
          record_id: payload.recordId,
          field_name: payload.fieldName,
          original_text: payload.originalText,
          original_language_code: payload.originalLanguageCode,
          english_text: payload.englishText,
          arabic_text: payload.arabicText,
          urdu_text: payload.urduText,
          persian_text: payload.persianText,
          pashto_text: payload.pashtoText,
          source: "manual",
          corrected_by: actorId,
          corrected_at: actorId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        };
      });

    if (!values.length) return;

    // record_translations has a partial unique index (WHERE deleted_at IS NULL) so do update-then-insert.
    for (const row of values) {
      const { data: updated, error: updateError } = await supabase
        .from("record_translations")
        .update({
          original_text: row.original_text,
          original_language_code: row.original_language_code,
          english_text: row.english_text,
          arabic_text: row.arabic_text,
          urdu_text: row.urdu_text,
          persian_text: row.persian_text,
          pashto_text: row.pashto_text,
          source: row.source,
          corrected_by: row.corrected_by,
          corrected_at: row.corrected_at,
          updated_at: row.updated_at
        })
        .eq("record_table", row.record_table)
        .eq("record_id", row.record_id)
        .eq("field_name", row.field_name)
        .is("deleted_at", null)
        .select("id");

      if (updateError) throw new Error(updateError.message);
      if (Array.isArray(updated) && updated.length) continue;

      const { error: insertError } = await supabase.from("record_translations").insert(row);
      if (insertError) throw new Error(insertError.message);
    }
  }
}

export const goodsService = new GoodsService();
