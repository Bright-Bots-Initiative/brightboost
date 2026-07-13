/**
 * /waterworks — 石犀工坊 · Waterworks, a standalone showcase page.
 *
 * ISOLATION CONTRACT (mirrors /try):
 *  - Public route, NO auth required, linked from NOTHING — the unlinked URL
 *    is the access gate. Renders fully for a logged-out visitor.
 *  - Zero backend traffic: the game persists to device localStorage only
 *    (waterworks:* keys). No PII is collected on this page.
 *  - Permanent placement (Set 3 candidacy, #676) is decided later; this page
 *    must be relocatable without unwinding integrations.
 *
 * zh-CN is first-class here: the page follows the app language toggle,
 * mirrors it into document.documentElement.lang (the global changeLanguage()
 * doesn't set it — page-scoped fix, app-wide fix is a named follow-up), and
 * carries a Chinese-capable system font stack (no external font fetch).
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/LanguageToggle";
import WaterworksGame from "@/components/waterworks/WaterworksGame";

const FONT_STACK =
  '"Baloo 2", "Comic Sans MS", system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

export default function Waterworks() {
  const { t, i18n } = useTranslation();

  // Keep the document language honest while this page is open (zh-CN glyph
  // correctness); restore whatever was there when the visitor leaves.
  useEffect(() => {
    const prior = document.documentElement.lang;
    const apply = () => {
      document.documentElement.lang =
        i18n.resolvedLanguage || i18n.language || "en";
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
      className="ww-page min-h-screen text-[#3a2e22]"
      style={{
        fontFamily: FONT_STACK,
        background: "radial-gradient(circle at 30% 10%, #fdf3dc, #f3e6c4)",
      }}
    >
      <header className="ww-shell-header flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
        <span className="text-4xl" aria-hidden>
          🦏
        </span>
        <div className="ww-shell-title flex-1 min-w-0">
          <h1 className="text-xl font-black leading-tight tracking-wide">
            石犀工坊 · Waterworks
          </h1>
          <p className="text-xs font-bold text-[#7d6c52]">
            {t("waterworks.shell.credit", {
              defaultValue:
                "Inspired by the 2,300-year-old Dujiangyan waterworks of Chengdu",
            })}
          </p>
        </div>
        <div className="ww-language">
          <LanguageToggle />
        </div>
      </header>
      <main>
        <WaterworksGame />
      </main>
    </div>
  );
}
