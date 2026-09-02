/**
 * /biome-buddy — Biome Buddy, a standalone reviewable prototype.
 *
 * ISOLATION CONTRACT (mirrors /waterworks and /try):
 *  - Public route, NO auth required, linked from NOTHING — the unlisted URL
 *    is the only access gate (unlisted is not authentication). Renders fully
 *    for a logged-out visitor.
 *  - Zero backend traffic: the game persists to device localStorage only
 *    (biomebuddy:* keys). No PII is collected on this page.
 *  - Unlinked from student progression, Creations, companions, analytics.
 *
 * Remix entry: `/biome-buddy#r=<share payload>` seeds a NEW build from a
 * validated COPY of a shared recipe ("Make my own version"). The fragment is
 * replaced out of the URL right away so a refresh or back-swipe does not
 * re-seed, and the shared snapshot itself is never touched. A scrambled
 * fragment falls back to a fresh start with a friendly note — never a crash.
 *
 * Language: content is complete in en + es, so the page-scoped toggle only
 * offers those, and the document language mirrors the language the page is
 * ACTUALLY rendering (an app set to vi/zh-CN reads this page in English, so
 * `lang` says "en", never a language the text is not in).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import BiomeBuddyGame from "@/components/biomeBuddy/BiomeBuddyGame";
import { BIOME_BUDDY_LOCALES } from "@/components/biomeBuddy/biomeBuddyContent";
import type { BuddyRecipe } from "@/components/biomeBuddy/biomeBuddyModel";
import {
  decodeShare,
  readShareParam,
} from "@/components/biomeBuddy/biomeBuddyShare";
import { resolveBuddyLang } from "@/components/biomeBuddy/useBuddyLocale";

export const BIOME_BUDDY_FONT_STACK =
  '"Baloo 2", "Comic Sans MS", system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

export function BiomeBuddyShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const prior = document.documentElement.lang;
    const apply = () => {
      document.documentElement.lang = resolveBuddyLang(
        i18n.resolvedLanguage || i18n.language,
      );
    };
    apply();
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
      document.documentElement.lang = prior;
    };
  }, [i18n]);

  return (
    <div
      className="bb-page min-h-screen text-[#3a2e22]"
      style={{
        fontFamily: BIOME_BUDDY_FONT_STACK,
        background: "radial-gradient(circle at 30% 10%, #f6f9ee, #e6efd8)",
      }}
    >
      <header className="bb-shell-header flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
        <span className="text-4xl" aria-hidden>
          🦎
        </span>
        <div className="bb-shell-title flex-1 min-w-0">
          <h1 className="text-xl font-black leading-tight tracking-wide">
            {t("biomeBuddy.shell.title", { defaultValue: "Biome Buddy" })}
          </h1>
          <p className="text-xs font-bold text-[#7d6c52]">
            {subtitle ??
              t("biomeBuddy.shell.tagline", {
                defaultValue:
                  "Build a Buddy for its home and see what it can do there",
              })}
          </p>
        </div>
        <div className="bb-language">
          <LanguageToggle languages={BIOME_BUDDY_LOCALES} />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

/** Reads a `#r=` remix fragment from the router location once, then strips
 *  it (replace, not push) so a refresh or back-swipe never re-seeds. */
function useRemixFromHash(): { recipe: BuddyRecipe | null; invalid: boolean } {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<{
    recipe: BuddyRecipe | null;
    invalid: boolean;
  }>({ recipe: null, invalid: false });
  useEffect(() => {
    const param = readShareParam(location.hash);
    if (!param) return;
    const result = decodeShare(param);
    setState(
      result.ok
        ? { recipe: result.recipe, invalid: false }
        : { recipe: null, invalid: true },
    );
    navigate(location.pathname + location.search, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);
  return state;
}

export default function BiomeBuddy() {
  const { t } = useTranslation();
  const remix = useRemixFromHash();
  // The live region exists from first paint so a later message is announced.
  const note = remix.recipe
    ? t("biomeBuddy.shell.remixNote", {
        defaultValue:
          "Starting from a shared Buddy — this copy is yours to change.",
      })
    : remix.invalid
      ? t("biomeBuddy.shell.remixInvalid", {
          defaultValue:
            "That share link got scrambled, so here's a fresh start.",
        })
      : "";
  return (
    <BiomeBuddyShell>
      <p
        role="status"
        aria-live="polite"
        className={`mx-auto max-w-3xl px-4 text-sm font-bold ${remix.invalid ? "text-orange-800" : "text-[#1c3d6c]"} ${note ? "pt-3" : "min-h-0"}`}
      >
        {note}
      </p>
      <BiomeBuddyGame remixRecipe={remix.recipe} />
    </BiomeBuddyShell>
  );
}
