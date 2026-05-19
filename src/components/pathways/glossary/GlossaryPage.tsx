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
import {
  GLOSSARY,
  CATEGORY_META,
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
    for (const term of GLOSSARY) {
      if (!map.has(term.category)) map.set(term.category, []);
      map.get(term.category)!.push(term);
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Glossary</h1>
        </div>
        <p className="text-white/80 text-sm mt-2">
          Every term you'll see across Pathways, with plain-language definitions.
          Open a term anywhere in the platform and we'll mark it viewed here.
        </p>
        {!loading && (
          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-white font-mono">
                  {totalViewed}
                  <span className="text-white/60 text-lg font-normal"> / {totalTerms}</span>
                </p>
                <p className="text-xs text-white/80">terms learned</p>
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

      {/* Categories */}
      {Array.from(byCategory.entries()).map(([cat, terms]) => {
        const meta = CATEGORY_META[cat];
        const seen = terms.filter((t) => viewed.has(t.slug)).length;
        return (
          <section key={cat}>
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {meta.label}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {seen}/{terms.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {meta.description}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              {terms.map((t) => {
                const isSeen = viewed.has(t.slug);
                return (
                  <div
                    key={t.slug}
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
                          {t.term}
                        </p>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isSeen
                              ? "text-emerald-800/80 dark:text-emerald-300/90"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {t.shortDef}
                        </p>
                      </div>
                      {isSeen && (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-label="viewed"
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
