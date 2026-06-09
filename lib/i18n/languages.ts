export const supportedLanguages = [
  {
    code: "en",
    englishName: "English",
    nativeName: "English",
    direction: "ltr",
    isDefault: true
  },
  {
    code: "ar",
    englishName: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    isDefault: false
  },
  {
    code: "ur",
    englishName: "Urdu",
    nativeName: "اردو",
    direction: "rtl",
    isDefault: false
  },
  {
    code: "fa",
    englishName: "Persian / Farsi",
    nativeName: "فارسی",
    direction: "rtl",
    isDefault: false
  },
  {
    code: "ps",
    englishName: "Pashto",
    nativeName: "پښتو",
    direction: "rtl",
    isDefault: false
  }
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["code"];
export type LanguageDirection = (typeof supportedLanguages)[number]["direction"];

export const rtlLanguages: SupportedLanguage[] = supportedLanguages
  .filter((language) => language.direction === "rtl")
  .map((language) => language.code);

export function getLanguageDirection(languageCode: SupportedLanguage): LanguageDirection {
  return supportedLanguages.find((language) => language.code === languageCode)?.direction ?? "ltr";
}

