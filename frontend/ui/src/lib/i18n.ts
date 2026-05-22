import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const translations = import.meta.glob("../i18n/translations/*.json", { eager: true });

const resources: Record<string, { translation: Record<string, unknown> }> = {};
export const supportedLanguages: string[] = [];

for (const path in translations) {
  const lang = path.split("/").pop()?.replace(".json", "");
  if (lang) {
    const translationModule = translations[path] as Record<string, unknown>;
    const translationContent = (translationModule.default || translationModule) as Record<string, unknown>;
    supportedLanguages.push(lang);
    resources[lang] = { translation: translationContent };
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