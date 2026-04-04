import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";

// Lazy-loaded locales (vi, zh-CN) are fetched on demand below.
// This keeps the main bundle lean for the common EN/ES case.

const LANGUAGE_KEY = "preferredLanguage";

/** Normalize locale aliases to our canonical keys. */
function normalizeLocale(code: string): string {
  const lc = code.toLowerCase().replace("_", "-");
  if (lc.startsWith("zh-hans") || lc === "zh") return "zh-CN";
  if (lc.startsWith("zh-cn")) return "zh-CN";
  if (lc.startsWith("vi")) return "vi";
  if (lc.startsWith("es")) return "es";
  return lc;
}

const stored = localStorage.getItem(LANGUAGE_KEY);
const initialLang = stored ? normalizeLocale(stored) : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enCommon },
    es: { translation: esCommon },
    // vi and zh-CN added lazily below
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Lazy-load vi and zh-CN bundles when first needed
async function ensureLocaleLoaded(lng: string) {
  if (i18n.hasResourceBundle(lng, "translation")) return;
  try {
    if (lng === "vi") {
      const mod = await import("./locales/vi/common.json");
      i18n.addResourceBundle("vi", "translation", mod.default, true, true);
    } else if (lng === "zh-CN") {
      const mod = await import("./locales/zh-CN/common.json");
      i18n.addResourceBundle("zh-CN", "translation", mod.default, true, true);
    }
  } catch (e) {
    console.warn(`Failed to load locale ${lng}:`, e);
  }
}

// Pre-load initial language if it's one of the lazy ones
if (initialLang === "vi" || initialLang === "zh-CN") {
  ensureLocaleLoaded(initialLang);
}

/** Change language, loading the bundle first if needed, then persist. */
export async function changeLanguage(lng: string) {
  const canonical = normalizeLocale(lng);
  await ensureLocaleLoaded(canonical);
  await i18n.changeLanguage(canonical);
  localStorage.setItem(LANGUAGE_KEY, canonical);
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh-CN", label: "简体中文" },
] as const;

export default i18n;
