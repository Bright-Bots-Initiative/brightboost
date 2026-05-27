/**
 * Glossary page at /pathways/glossary.
 *
 * Terms grouped by category. Each term shows its short definition with a
 * "viewed" checkmark when the student has opened the tooltip somewhere
 * else in the app (tracked in PathwayGlossaryView).
 *
 * No live search box in 2.1 — categories serve as filters. Search can
 * land in a follow-up PR when the catalog grows past ~60 terms.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  GLOSSARY,
  CATEGORY_ORDER,
  type GlossaryCategory,
} from "@/data/glossary";

interface StatsResponse {
  totalViewed: number;
  viewedSlugs: string[];
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function GlossaryPage() {
  const { t } = useTranslation();
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pathways/glossary/me/stats", {
          headers: authHeader(),
        });
        if (!res.ok) return;
        const body = (await res.json()) as StatsResponse;
        if (!cancelled) setViewed(new Set(body.viewedSlugs));
      } catch {
        /* fall back to empty Set — terms render without checkmarks */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<GlossaryCategory, typeof GLOSSARY>();
    for (const entry of GLOSSARY) {
      if (!map.has(entry.category)) map.set(entry.category, []);
      map.get(entry.category)!.push(entry);
    }
    return map;
  }, []);

  const totalTerms = GLOSSARY.length;
  const totalViewed = viewed.size;
  const pct = totalTerms > 0 ? Math.round((totalViewed / totalTerms) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header card with progress */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-700 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-white shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {t("pathways.glossary.page.title")}
          </h1>
        </div>
        <p className="text-white/80 text-sm mt-2">
          {t("pathways.glossary.page.subtitle")}
        </p>
        {!loading && (
          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-white font-mono">
                  {totalViewed}
                  <span className="text-white/60 text-lg font-normal"> / {totalTerms}</span>
                </p>
                <p className="text-xs text-white/80">
                  {t("pathways.glossary.page.progressFooter")}
                </p>
              </div>
              <p className="text-white/80 text-sm font-mono">{pct}%</p>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Categories — rendered in CATEGORY_ORDER */}
      {CATEGORY_ORDER.map((cat) => {
        const terms = byCategory.get(cat);
        if (!terms || terms.length === 0) return null;
        const seen = terms.filter((entry) => viewed.has(entry.slug)).length;
        return (
          <section key={cat}>
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {t(`pathways.glossary.categories.${cat}.label`)}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {seen}/{terms.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {t(`pathways.glossary.categories.${cat}.description`)}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              {terms.map((entry) => {
                const isSeen = viewed.has(entry.slug);
                return (
                  <div
                    key={entry.slug}
                    className={`rounded-xl border p-3 sm:p-4 ${
                      isSeen
                        ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/40"
                        : "border-slate-200 bg-white dark:bg-slate-800/50 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            isSeen
                              ? "text-emerald-900 dark:text-emerald-200"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {t(`pathways.glossary.terms.${entry.slug}.term`)}
                        </p>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isSeen
                              ? "text-emerald-800/80 dark:text-emerald-300/90"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {t(`pathways.glossary.terms.${entry.slug}.shortDef`)}
                        </p>
                      </div>
                      {isSeen && (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-label={t("pathways.glossary.page.seenLabel")}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
