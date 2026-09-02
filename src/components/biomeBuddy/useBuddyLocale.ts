/**
 * Page-local locale picker for Biome Buddy content data.
 *
 * Mirrors `pickLocale()` (src/utils/localizedContent.ts) but reads the
 * language from the `useTranslation()` instance instead of the module-level
 * i18n singleton, so the game components stay testable with a mocked
 * react-i18next (Waterworks precedent) and re-render on language change.
 * Content is complete in en + es (BIOME_BUDDY_LOCALES); any other active
 * language renders English content rather than a raw id.
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { BIOME_BUDDY_LOCALES, type Localized } from "./biomeBuddyContent";

export type BuddyLang = (typeof BIOME_BUDDY_LOCALES)[number];

export function resolveBuddyLang(language: string | undefined): BuddyLang {
  const base = (language ?? "en").toLowerCase().split("-")[0];
  return (BIOME_BUDDY_LOCALES as readonly string[]).includes(base)
    ? (base as BuddyLang)
    : "en";
}

export function useBuddyLocale() {
  const { t, i18n } = useTranslation();
  const lang = resolveBuddyLang(i18n?.resolvedLanguage || i18n?.language);
  const L = useCallback((value: Localized) => value[lang] ?? value.en, [lang]);
  return { t, lang, L };
}
