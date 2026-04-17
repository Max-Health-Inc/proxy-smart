/**
 * ValueSet: languages
 * URL: http://hl7.org/fhir/ValueSet/languages
 * Size: 56 concepts
 */
export const LanguagesConcepts = [
    { code: "ar", system: "urn:ietf:bcp:47", display: "Arabic" },
    { code: "bn", system: "urn:ietf:bcp:47", display: "Bengali" },
    { code: "cs", system: "urn:ietf:bcp:47", display: "Czech" },
    { code: "da", system: "urn:ietf:bcp:47", display: "Danish" },
    { code: "de", system: "urn:ietf:bcp:47", display: "German" },
    { code: "de-AT", system: "urn:ietf:bcp:47", display: "German (Austria)" },
    { code: "de-CH", system: "urn:ietf:bcp:47", display: "German (Switzerland)" },
    { code: "de-DE", system: "urn:ietf:bcp:47", display: "German (Germany)" },
    { code: "el", system: "urn:ietf:bcp:47", display: "Modern Greek (1453-)" },
    { code: "en", system: "urn:ietf:bcp:47", display: "English" },
    { code: "en-AU", system: "urn:ietf:bcp:47", display: "English (Australia)" },
    { code: "en-CA", system: "urn:ietf:bcp:47", display: "English (Canada)" },
    { code: "en-GB", system: "urn:ietf:bcp:47", display: "English (United Kingdom)" },
    { code: "en-IN", system: "urn:ietf:bcp:47", display: "English (India)" },
    { code: "en-NZ", system: "urn:ietf:bcp:47", display: "English (New Zealand)" },
    { code: "en-SG", system: "urn:ietf:bcp:47", display: "English (Singapore)" },
    { code: "en-US", system: "urn:ietf:bcp:47", display: "English (United States)" },
    { code: "es", system: "urn:ietf:bcp:47", display: "Spanish" },
    { code: "es-AR", system: "urn:ietf:bcp:47", display: "Spanish (Argentina)" },
    { code: "es-ES", system: "urn:ietf:bcp:47", display: "Spanish (Spain)" },
    { code: "es-UY", system: "urn:ietf:bcp:47", display: "Spanish (Uruguay)" },
    { code: "fi", system: "urn:ietf:bcp:47", display: "Finnish" },
    { code: "fr", system: "urn:ietf:bcp:47", display: "French" },
    { code: "fr-BE", system: "urn:ietf:bcp:47", display: "French (Belgium)" },
    { code: "fr-CH", system: "urn:ietf:bcp:47", display: "French (Switzerland)" },
    { code: "fr-FR", system: "urn:ietf:bcp:47", display: "French (France)" },
    { code: "fy", system: "urn:ietf:bcp:47", display: "Western Frisian" },
    { code: "fy-NL", system: "urn:ietf:bcp:47", display: "Western Frisian (Netherlands)" },
    { code: "hi", system: "urn:ietf:bcp:47", display: "Hindi" },
    { code: "hr", system: "urn:ietf:bcp:47", display: "Croatian" },
    { code: "it", system: "urn:ietf:bcp:47", display: "Italian" },
    { code: "it-CH", system: "urn:ietf:bcp:47", display: "Italian (Switzerland)" },
    { code: "it-IT", system: "urn:ietf:bcp:47", display: "Italian (Italy)" },
    { code: "ja", system: "urn:ietf:bcp:47", display: "Japanese" },
    { code: "ko", system: "urn:ietf:bcp:47", display: "Korean" },
    { code: "nl", system: "urn:ietf:bcp:47", display: "Dutch" },
    { code: "nl-BE", system: "urn:ietf:bcp:47", display: "Dutch (Belgium)" },
    { code: "nl-NL", system: "urn:ietf:bcp:47", display: "Dutch (Netherlands)" },
    { code: "no", system: "urn:ietf:bcp:47", display: "Norwegian" },
    { code: "no-NO", system: "urn:ietf:bcp:47", display: "Norwegian (Norway)" },
    { code: "pa", system: "urn:ietf:bcp:47", display: "Panjabi" },
    { code: "pl", system: "urn:ietf:bcp:47", display: "Polish" },
    { code: "pt", system: "urn:ietf:bcp:47", display: "Portuguese" },
    { code: "pt-BR", system: "urn:ietf:bcp:47", display: "Portuguese (Brazil)" },
    { code: "ru", system: "urn:ietf:bcp:47", display: "Russian" },
    { code: "ru-RU", system: "urn:ietf:bcp:47", display: "Russian (Russian Federation)" },
    { code: "sr", system: "urn:ietf:bcp:47", display: "Serbian" },
    { code: "sr-RS", system: "urn:ietf:bcp:47", display: "Serbian (Serbia)" },
    { code: "sv", system: "urn:ietf:bcp:47", display: "Swedish" },
    { code: "sv-SE", system: "urn:ietf:bcp:47", display: "Swedish (Sweden)" },
    { code: "te", system: "urn:ietf:bcp:47", display: "Telugu" },
    { code: "zh", system: "urn:ietf:bcp:47", display: "Chinese" },
    { code: "zh-CN", system: "urn:ietf:bcp:47", display: "Chinese (China)" },
    { code: "zh-HK", system: "urn:ietf:bcp:47", display: "Chinese (Hong Kong)" },
    { code: "zh-SG", system: "urn:ietf:bcp:47", display: "Chinese (Singapore)" },
    { code: "zh-TW", system: "urn:ietf:bcp:47", display: "Chinese (Taiwan, Province of China)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidLanguagesCode(code) {
    return LanguagesConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getLanguagesConcept(code) {
    return LanguagesConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const LanguagesCodes = LanguagesConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomLanguagesCode() {
    return LanguagesCodes[Math.floor(Math.random() * LanguagesCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomLanguagesConcept() {
    return LanguagesConcepts[Math.floor(Math.random() * LanguagesConcepts.length)];
}
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export const LanguagesDisplays = {
    "ar": { "de": "Arabisch", "fr": "Arabe", "es": "Árabe" },
    "bn": { "de": "Bengalisch", "es": "Bengalí" },
    "cs": { "de": "Tschechisch", "fr": "Tchèque", "es": "Checo" },
    "da": { "de": "Dänisch", "fr": "Danois", "es": "Danés" },
    "de": { "de": "Deutsch", "fr": "Allemand", "es": "Alemán" },
    "de-AT": { "de": "Deutsch (Österreich)", "fr": "Allemand (Autriche)", "es": "Alemán (Austria)" },
    "de-CH": { "de": "Deutsch (Schweiz)", "fr": "Allemand (Suisse)", "es": "Alemán (Suiza)" },
    "de-DE": { "de": "Deutsch (Deutschland)", "fr": "Allemand (Allemagne)", "es": "Alemán (Alemania)" },
    "el": { "de": "Neugriechisch (ab 1453)", "fr": "Grec moderne (après 1453)", "es": "Griego moderno (después de 1453)" },
    "en": { "de": "Englisch", "fr": "Anglais", "es": "Inglés" },
    "en-AU": { "de": "Englisch (Australien)", "fr": "Anglais (Australie)", "es": "Inglés (Australia)" },
    "en-CA": { "de": "Englisch (Kanada)", "fr": "Anglais (Canada)", "es": "Inglés (Canadá)" },
    "en-GB": { "de": "Englisch (Vereinigtes Königreich)", "fr": "Anglais (Royaume-Uni)", "es": "Inglés (Reino Unido)" },
    "en-IN": { "de": "Englisch (Indien)", "fr": "Anglais (Inde)", "es": "Inglés (India)" },
    "en-NZ": { "de": "Englisch (Neuseeland)", "fr": "Anglais (Nouvelle-Zélande)", "es": "Inglés (Nueva Zelanda)" },
    "en-SG": { "de": "Englisch (Singapur)", "fr": "Anglais (Singapour)", "es": "Inglés (Singapur)" },
    "en-US": { "de": "Englisch (Vereinigte Staaten)", "fr": "Anglais (États-Unis)", "es": "Inglés (Estados Unidos)" },
    "es": { "de": "Spanisch", "fr": "Espagnol", "es": "Español" },
    "es-AR": { "de": "Spanisch (Argentinien)", "fr": "Espagnol (Argentine)", "es": "Español (Argentina)" },
    "es-ES": { "de": "Spanisch (Spanien)", "fr": "Espagnol (Espagne)", "es": "Español (España)" },
    "es-UY": { "de": "Spanisch (Uruguay)", "fr": "Espagnol (Uruguay)", "es": "Español (Uruguay)" },
    "fi": { "de": "Finnisch", "fr": "Finnois", "es": "Finlandés" },
    "fr": { "de": "Französisch", "fr": "Français", "es": "Francés" },
    "fr-BE": { "de": "Französisch (Belgien)", "fr": "Français (Belgique)", "es": "Francés (Bélgica)" },
    "fr-CH": { "de": "Französisch (Schweiz)", "fr": "Français (Suisse)", "es": "Francés (Suiza)" },
    "fr-FR": { "de": "Französisch (Frankreich)", "fr": "Français (France)", "es": "Francés (Francia)" },
    "fy": { "de": "Westfriesisch", "fr": "Frison occidental", "es": "Frisón occidental" },
    "fy-NL": { "de": "Westfriesisch (Niederlande)", "fr": "Frison occidental (Pays-Bas)", "es": "Frisón occidental (Países Bajos)" },
    "hr": { "de": "Kroatisch", "fr": "Croate", "es": "Croata" },
    "it": { "de": "Italienisch", "fr": "Italien", "es": "Italiano" },
    "it-CH": { "de": "Italienisch (Schweiz)", "fr": "Italien (Suisse)", "es": "Italiano (Suiza)" },
    "it-IT": { "de": "Italienisch (Italien)", "fr": "Italien (Italie)", "es": "Italiano (Italia)" },
    "ja": { "de": "Japanisch", "fr": "Japonais", "es": "Japonés" },
    "ko": { "de": "Koreanisch", "fr": "Coréen", "es": "Coreano" },
    "nl": { "de": "Niederländisch", "fr": "Néerlandais", "es": "Neerlandés" },
    "nl-BE": { "de": "Niederländisch (Belgien)", "fr": "Néerlandais (Belgique)", "es": "Neerlandés (Bélgica)" },
    "nl-NL": { "de": "Niederländisch (Niederlande)", "fr": "Néerlandais (Pays-Bas)", "es": "Neerlandés (Países Bajos)" },
    "no": { "de": "Norwegisch", "fr": "Norvégien", "es": "Noruego" },
    "no-NO": { "de": "Norwegisch (Norwegen)", "fr": "Norvégien (Norvège)", "es": "Noruego (Noruega)" },
    "pa": { "fr": "Pendjabi", "es": "Panyabí" },
    "pl": { "de": "Polnisch", "fr": "Polonais", "es": "Polaco" },
    "pt": { "de": "Portugiesisch", "fr": "Portugais", "es": "Portugués" },
    "pt-BR": { "de": "Portugiesisch (Brasilien)", "fr": "Portugais (Brésil)", "es": "Portugués (Brasil)" },
    "ru": { "de": "Russisch", "fr": "Russe", "es": "Ruso" },
    "ru-RU": { "de": "Russisch (Russische Föderation)", "fr": "Russe (Fédération de Russie)", "es": "Ruso (Federación de Rusia)" },
    "sr": { "de": "Serbisch", "fr": "Serbe", "es": "Serbio" },
    "sr-RS": { "de": "Serbisch (Serbien)", "fr": "Serbe (Serbie)", "es": "Serbio (Serbia)" },
    "sv": { "de": "Schwedisch", "fr": "Suédois", "es": "Sueco" },
    "sv-SE": { "de": "Schwedisch (Schweden)", "fr": "Suédois (Suède)", "es": "Sueco (Suecia)" },
    "te": { "fr": "Télougou" },
    "zh": { "de": "Chinesisch", "fr": "Chinois", "es": "Chino" },
    "zh-CN": { "de": "Chinesisch (China)", "fr": "Chinois (Chine)", "es": "Chino (China)" },
    "zh-HK": { "de": "Chinesisch (Hongkong)", "fr": "Chinois (Hong Kong)", "es": "Chino (Hong Kong)" },
    "zh-SG": { "de": "Chinesisch (Singapur)", "fr": "Chinois (Singapour)", "es": "Chino (Singapur)" },
    "zh-TW": { "de": "Chinesisch (Taiwan, Provinz Chinas)", "fr": "Chinois (Taïwan, province de Chine)", "es": "Chino (Taiwán, provincia de China)" },
};
/**
 * Get the display string for a code in a specific language
 */
export function getLanguagesDisplay(code, lang) {
    return LanguagesDisplays[code]?.[lang];
}
