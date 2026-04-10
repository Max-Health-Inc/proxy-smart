import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// Dynamically import all translation files
const translations = import.meta.glob("../i18n/translations/*.json", { eager: true });

console.debug('🌐 Loading translations...');
console.debug('🌐 Found translation files:', Object.keys(translations));

// Extract supported languages and resources
const resources: Record<string, { translation: Record<string, unknown> }> = {};
export const supportedLanguages: string[] = [];

for (const path in translations) {
  const lang = path.split("/").pop()?.replace(".json", ""); // Extract language code from file name
  if (lang) {
    console.debug('🌐 Processing language:', lang, 'from file:', path);
    const translationModule = translations[path] as Record<string, unknown>;
    console.debug('🌐 Translation module:', translationModule);

    // Check if it's a module with default export
    const translationContent = (translationModule.default || translationModule) as Record<string, unknown>;
    console.debug('🌐 Translation content preview:', Object.keys(translationContent).slice(0, 5));
    console.debug('🌐 Sample translation:', translationContent['Healthcare Admin']);

    supportedLanguages.push(lang);
    resources[lang] = { translation: translationContent };
  }
}

console.debug('🌐 Supported languages:', supportedLanguages);
console.debug('🌐 Resources loaded:', Object.keys(resources));

// Initialize i18n
export const i18nInit = (async () => {
  console.debug('🔧 Initializing i18n...');
  console.debug('🔧 Resources structure:', JSON.stringify(resources, null, 2));
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en', // Default language, will be overridden by app store
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      // Turn off debug mode now that it's working
      debug: false,
    });
  console.debug('✅ i18n initialized successfully');
  console.debug('🌐 i18n current language:', i18n.language);
  console.debug('🌐 i18n available languages:', i18n.languages);
  console.debug('🌐 i18n resource languages:', Object.keys(i18n.store.data));
})();

export default i18n;