/**
 * Shared behaviour and action styling for the public entry surfaces
 * (`/for-teachers`, `/for-families`, and the public header/footer).
 *
 * Two things live here because both entry pages need them identically and a
 * second copy is a second thing to drift:
 *
 *  1. the language a page is ACTUALLY rendering, and the document metadata
 *     that has to describe it;
 *  2. the three action treatments, as Tailwind class strings, so a link on one
 *     page cannot quietly become a different size or weight from the same link
 *     on the other.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * The languages the public entry copy exists in. Everything else resolves
 * through i18next's `fallbackLng: "en"`, so the page renders English — which
 * is what `<html lang>` and the language control then have to say, without
 * touching the visitor's saved preference.
 */
export const PUBLIC_ENTRY_LANGUAGES = ["en", "es"] as const;
export type PublicEntryLanguage = (typeof PUBLIC_ENTRY_LANGUAGES)[number];

/** The language the page is rendering, not the one the visitor prefers. */
export function useRenderedLanguage(): PublicEntryLanguage {
  const { i18n } = useTranslation();
  const raw = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  return raw.startsWith("es") ? "es" : "en";
}

/**
 * Document title, meta description and `<html lang>` for a public entry page.
 *
 * Everything is restored on unmount (and re-applied on a language change), so
 * navigating away never leaves a stale title or a `lang` attribute claiming a
 * language the next page is not rendering.
 */
export function usePublicPageMeta(
  title: string,
  description: string,
  lang: PublicEntryLanguage,
): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta = document.head.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    const metaWasCreated = meta === null;
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    const root = document.documentElement;
    const previousLang = root.getAttribute("lang");
    root.setAttribute("lang", lang);

    return () => {
      document.title = previousTitle;
      if (metaWasCreated) {
        meta?.remove();
      } else if (previousDescription === null) {
        meta?.removeAttribute("content");
      } else {
        meta?.setAttribute("content", previousDescription);
      }
      if (previousLang === null) {
        root.removeAttribute("lang");
      } else {
        root.setAttribute("lang", previousLang);
      }
    };
  }, [title, description, lang]);
}

/**
 * The dominant action. The pressed-depth drop is the shipped `.button-shadow`
 * idiom (`src/App.css`) expressed with the navy-deep step so it stays visible
 * against the navy fill; the collapse is instantaneous, so it is a press
 * affordance rather than motion.
 */
export const PUBLIC_ACTION_PRIMARY =
  "bb-public-action inline-flex min-h-[var(--bb-control-height-lg)] items-center justify-center rounded-[var(--bb-radius-md)] border-2 border-brightboost-navy bg-brightboost-navy px-6 py-2 text-base font-bold text-white shadow-[0_4px_0_var(--bb-navy-deep)] transition-colors hover:bg-[color:var(--bb-navy-deep)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--bb-navy-deep)]";

/** The alternative action: same size, obviously not the dominant one. */
export const PUBLIC_ACTION_SECONDARY =
  "bb-public-action inline-flex min-h-[var(--bb-control-height-lg)] items-center justify-center rounded-[var(--bb-radius-md)] border-2 border-[color:var(--bb-color-border-strong)] bg-white px-6 py-2 text-base font-bold text-brightboost-navy transition-colors hover:border-brightboost-navy hover:bg-[color:var(--bb-color-accent-soft)]";

/** A text-weight action that still holds a 44px hit area. */
export const PUBLIC_ACTION_QUIET =
  "bb-public-action inline-flex min-h-[var(--bb-control-height)] items-center justify-center rounded-[var(--bb-radius-md)] px-3 py-2 text-base font-semibold text-[color:var(--bb-blue-deep)] underline underline-offset-[3px] transition-colors hover:bg-[color:var(--bb-color-accent-soft)] hover:text-brightboost-navy";

/**
 * The entry band. Inline rather than a Tailwind arbitrary value because that
 * is how the shipped homepage hero paints its gradient (`src/pages/Index.tsx`).
 */
export const PUBLIC_SKY_BAND = {
  background:
    "linear-gradient(180deg, var(--bb-color-sky) 0%, var(--bb-color-sky-soft) 60%, #ffffff 100%)",
} as const;
