/**
 * Pathways Home — student landing page.
 *
 * Loads in three states (skeleton / error / data) so a slow or failed
 * backend can't strand the page on an indefinite "Loading…". Surfaces a
 * prominent "Next Task" CTA at the top derived client-side from the same
 * /api/pathways/student/home payload (no extra round-trip).
 *
 * i18n + light/dark mode aware (Tailwind `dark:` variants).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { Shield, Compass, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  NextTaskCard,
  computeNextTask,
  type NextTaskMilestone,
  type NextTaskEnrollment,
} from "./NextTaskCard";

interface HomeData {
  user?: { name?: string | null; ageBand?: string | null; userType?: string | null; streak?: number };
  enrollments?: Array<{
    cohortId: string;
    cohortName: string;
    band: string;
    trackIds: string[];
    sitePartner: string | null;
  }>;
  milestones?: Array<NextTaskMilestone & { id: string; score: number | null; createdAt?: string }>;
}

export default function PathwaysHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    // Hard 10s ceiling so a hung request surfaces as an error UI rather
    // than an indefinite loading state.
    const timeout = setTimeout(() => ac.abort(), 10000);

    (async () => {
      try {
        const res = await fetch("/api/pathways/student/home", {
          headers: { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` },
          signal: ac.signal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (body && (body.error || body.message)) || `${res.status} ${res.statusText}`,
          );
        }
        if (!cancelled) {
          setHomeData(body as HomeData);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error
          ? err.name === "AbortError" ? "timeout" : err.message
          : "fetch failed";
        setError(msg);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      ac.abort();
    };
  }, []);

  // Stabilize references so useMemo below isn't recomputed on every render.
  const milestones = useMemo(() => homeData?.milestones ?? [], [homeData]);
  const enrollments = useMemo(() => homeData?.enrollments ?? [], [homeData]);
  const completed = milestones.filter((m) => m.status === "completed").length;
  const inProgress = milestones.filter((m) => m.status === "in_progress").length;
  const cohort = enrollments[0];
  const band = homeData?.user?.ageBand ?? "explorer";

  const nextTask = useMemo(
    () => computeNextTask(milestones, enrollments as NextTaskEnrollment[]),
    [milestones, enrollments],
  );

  if (loading) return <PathwaysHomeSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Couldn't load your dashboard
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-1.5 rounded-lg border bg-white border-slate-200 text-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 p-5 sm:p-8">
        <div className="relative z-10 pr-16 sm:pr-0">
          <p className="text-xs sm:text-sm text-indigo-200 font-medium uppercase tracking-wider mb-2">
            {band === "launch"
              ? t("pathways.home.launchEyebrow")
              : t("pathways.home.explorerEyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {band === "launch"
              ? t("pathways.home.launchTitle")
              : t("pathways.home.explorerTitle")}
          </h1>
          {cohort && (
            <p className="text-indigo-100 text-xs sm:text-sm">
              {cohort.cohortName}
              {cohort.sitePartner && ` • ${cohort.sitePartner}`}
            </p>
          )}
        </div>
        <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 opacity-10">
          <Shield className="w-full h-full" />
        </div>
      </div>

      {/* Next Task — the single most important thing on the page */}
      <NextTaskCard task={nextTask} />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label={t("pathways.home.stats.completed")} value={completed} />
        <StatCard label={t("pathways.home.stats.inProgress")} value={inProgress} />
        <StatCard label={t("pathways.home.stats.streak")} value={homeData?.user?.streak ?? 0} />
      </div>

      {/* Active Tracks */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-200">
          {t("pathways.home.sections.yourTracks")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PATHWAY_TRACKS.filter((track) => track.status === "active").map((track) => {
            const trackMilestones = milestones.filter((m) => m.trackSlug === track.slug);
            const trackCompleted = trackMilestones.filter((m) => m.status === "completed").length;
            const pct =
              track.modules.length > 0
                ? Math.round((trackCompleted / track.modules.length) * 100)
                : 0;
            const trackName = t(`pathways.tracks.items.${track.slug}.name`, track.name);
            const trackTagline = t(`pathways.tracks.items.${track.slug}.tagline`, track.tagline);

            return (
              <button
                key={track.slug}
                onClick={() => navigate(`/pathways/tracks/${track.slug}`)}
                className="flex items-center gap-4 p-4 rounded-xl border bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors text-left group shadow-sm"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: track.color + "20" }}
                >
                  <Shield className="w-6 h-6" style={{ color: track.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-white">
                    {trackName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{trackTagline}</p>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: track.color }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {t("pathways.home.modulesProgress", {
                      done: trackCompleted,
                      total: track.modules.length,
                      pct,
                    })}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-200">
            {t("pathways.home.sections.recentActivity")}
          </h2>
          <div className="space-y-2">
            {milestones.slice(0, 5).map((m) => {
              const moduleName = t(
                `pathways.tracks.modules.${m.moduleSlug}.name`,
                m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              ) as string;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border-slate-200 border dark:bg-slate-800/50 dark:border-slate-700/50"
                >
                  {m.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  ) : (
                    <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-300">{moduleName}</p>
                    <p className="text-[10px] text-slate-500">
                      {m.trackSlug} • {m.status}
                      {m.score ? ` • ${m.score}%` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 text-center shadow-sm">
      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 leading-tight">{label}</p>
    </div>
  );
}

/** Skeleton matched to the final layout so perceived load is smoother than a blank "Loading…" block. */
function PathwaysHomeSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-700/60" />
        ))}
      </div>
    </div>
  );
}
