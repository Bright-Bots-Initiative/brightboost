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
import { useLocation } from "react-router-dom";

export const PUBLIC_SITE_ORIGIN = "https://brightboost.org";
const SHARE_IMAGE_URL = `${PUBLIC_SITE_ORIGIN}/bright-boost-share-v2.png`;

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
 * Update the static title, description, share tags, canonical and document
 * language in place. No duplicate tags on hydration or language/route changes.
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
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const imageAlt = t("home.meta.imageAlt");
  // Keep the production origin even in previews, without query/hash attribution.
  const canonicalHref = `${PUBLIC_SITE_ORIGIN}${pathname}`;
  useEffect(() => {
    // Public routes open at their introduction; homepage fragment handling
    // owns the scroll position when a visitor follows a section link.
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const restore: Array<() => void> = [];
    const upsertMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      const existing = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${name}"]`,
      );
      if (existing) {
        const previous = existing.getAttribute("content");
        existing.setAttribute("content", content);
        restore.push(() => {
          if (previous === null) existing.removeAttribute("content");
          else existing.setAttribute("content", previous);
        });
      } else {
        const created = document.createElement("meta");
        created.setAttribute(attr, name);
        created.setAttribute("content", content);
        document.head.appendChild(created);
        restore.push(() => created.remove());
      }
    };

    upsertMeta("description", description);
    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:url", canonicalHref, true);
    upsertMeta("og:type", "website", true);
    upsertMeta("og:image", SHARE_IMAGE_URL, true);
    upsertMeta("og:image:width", "1200", true);
    upsertMeta("og:image:height", "630", true);
    upsertMeta("og:image:alt", imageAlt, true);
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", SHARE_IMAGE_URL);
    upsertMeta("twitter:image:alt", imageAlt);

    const existingCanonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (existingCanonical) {
      const previous = existingCanonical.getAttribute("href");
      existingCanonical.setAttribute("href", canonicalHref);
      restore.push(() => {
        if (previous === null) existingCanonical.removeAttribute("href");
        else existingCanonical.setAttribute("href", previous);
      });
    } else {
      const canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      canonical.setAttribute("href", canonicalHref);
      document.head.appendChild(canonical);
      restore.push(() => canonical.remove());
    }

    const root = document.documentElement;
    const previousLang = root.getAttribute("lang");
    root.setAttribute("lang", lang);

    return () => {
      document.title = previousTitle;
      for (const undo of restore.reverse()) undo();
      if (previousLang === null) {
        root.removeAttribute("lang");
      } else {
        root.setAttribute("lang", previousLang);
      }
    };
  }, [title, description, lang, canonicalHref, imageAlt]);
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
