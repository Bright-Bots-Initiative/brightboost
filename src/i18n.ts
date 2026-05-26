import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import enPathways from "./locales/en/pathways.json";
import esPathways from "./locales/es/pathways.json";

// Lazy-loaded locales (vi, zh-CN) are fetched on demand below.
// This keeps the main bundle lean for the common EN/ES case.
// Pathways content is merged into the same `translation` namespace so
// existing `useTranslation()` calls pick up `pathways.*` keys without
// extra namespace wiring. Missing translations in vi/zh-CN fall through
// to en via the fallbackLng config.

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
    en: { translation: { ...enCommon, ...enPathways } },
    es: { translation: { ...esCommon, ...esPathways } },
    // vi and zh-CN added lazily below
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Lazy-load vi and zh-CN bundles when first needed.
// Both common.json and pathways.json are merged into the single `translation`
// namespace so existing `useTranslation()` callers see all keys.
async function ensureLocaleLoaded(lng: string) {
  if (i18n.hasResourceBundle(lng, "translation")) return;
  try {
    if (lng === "vi") {
      const [common, pathways] = await Promise.all([
        import("./locales/vi/common.json"),
        import("./locales/vi/pathways.json"),
      ]);
      i18n.addResourceBundle(
        "vi",
        "translation",
        { ...common.default, ...pathways.default },
        true,
        true,
      );
    } else if (lng === "zh-CN") {
      const [common, pathways] = await Promise.all([
        import("./locales/zh-CN/common.json"),
        import("./locales/zh-CN/pathways.json"),
      ]);
      i18n.addResourceBundle(
        "zh-CN",
        "translation",
        { ...common.default, ...pathways.default },
        true,
        true,
      );
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
