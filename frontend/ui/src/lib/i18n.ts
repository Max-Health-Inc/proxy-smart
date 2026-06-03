import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationsRaw from "../i18n/translations/translations.json";

/**
 * DRY i18n: Single translations.json file.
 * Format: { "_languages": ["de", ...], "English key": ["DE translation", ...] }
 * English is never stored — i18next returns the key itself as fallback.
 */
const { _languages, ...entries } = translationsRaw as Record<string, string[] | null[]>;
const languages = _languages as unknown as string[];

export const supportedLanguages: string[] = ['en', ...languages];

const resources: Record<string, { translation: Record<string, string> }> = {};
for (const lang of languages) {
  resources[lang] = { translation: {} };
}

const langIndex = Object.fromEntries(languages.map((l, i) => [l, i]));
for (const [key, values] of Object.entries(entries)) {
  if (!Array.isArray(values)) continue;
  for (const lang of languages) {
    const val = values[langIndex[lang]];
    if (val) {
      resources[lang].translation[key] = val;
    }
  }
}

export const i18nInit = (async () => {
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      debug: false,
    });
})();

export default i18n;