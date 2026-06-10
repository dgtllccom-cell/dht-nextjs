import {
  getLanguageDirection,
  supportedLanguages,
  type SupportedLanguage
} from "@/lib/i18n/languages";

export type MultilingualText = {
  originalText: string;
  originalLanguage: SupportedLanguage;
  en?: string;
  ar?: string;
  ur?: string;
  fa?: string;
  ps?: string;
};

export type RecordTranslationPayload = {
  recordTable: string;
  recordId: string;
  fieldName: string;
  originalText: string;
  originalLanguageCode: SupportedLanguage;
  englishText: string | null;
  arabicText: string | null;
  urduText: string | null;
  persianText: string | null;
  pashtoText: string | null;
};

const languageFieldMap: Record<SupportedLanguage, keyof MultilingualText> = {
  en: "en",
  ar: "ar",
  ur: "ur",
  fa: "fa",
  ps: "ps"
};

export class MultilingualService {
  supportedLanguages = supportedLanguages;

  isRtl(languageCode: SupportedLanguage) {
    return getLanguageDirection(languageCode) === "rtl";
  }

  resolveText(text: MultilingualText, languageCode: SupportedLanguage) {
    const field = languageFieldMap[languageCode];
    return text[field] || text.en || text.originalText;
  }

  createRecordTranslationPayload(input: {
    recordTable: string;
    recordId: string;
    fieldName: string;
    text: MultilingualText;
  }): RecordTranslationPayload {
    return {
      recordTable: input.recordTable,
      recordId: input.recordId,
      fieldName: input.fieldName,
      originalText: input.text.originalText,
      originalLanguageCode: input.text.originalLanguage,
      englishText: input.text.en ?? null,
      arabicText: input.text.ar ?? null,
      urduText: input.text.ur ?? null,
      persianText: input.text.fa ?? null,
      pashtoText: input.text.ps ?? null
    };
  }

  createAutomaticTranslationShell(originalText: string, originalLanguage: SupportedLanguage): MultilingualText {
    return {
      originalText,
      originalLanguage,
      en: originalLanguage === "en" ? originalText : undefined,
      ar: originalLanguage === "ar" ? originalText : undefined,
      ur: originalLanguage === "ur" ? originalText : undefined,
      fa: originalLanguage === "fa" ? originalText : undefined,
      ps: originalLanguage === "ps" ? originalText : undefined
    };
  }
}

export const multilingualService = new MultilingualService();

