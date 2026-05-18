/**
 * Pathways Profile — learner character sheet.
 *
 * 1.5: surfaces level + tier, streak (current/best), full badge catalog with
 * locked badges greyed out, and the last 20 XP events as a lightweight
 * activity feed. The original module-completion list stays underneath as
 * the portfolio surface.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Clock, Star, Flame, Trophy } from "lucide-react";
import { useGamification } from "./gamification/useGamification";

interface BadgeCatalogEntry {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  earnedAt: string | null;
}

interface XpEvent {
  id: string;
  amount: number;
  source: string;
  sourceRefId: string | null;
  createdAt: string;
}

interface Milestone {
  id: string;
  trackSlug: string;
  moduleSlug: string;
  status: string;
  score: number | null;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function sourceLabel(source: string, refId: string | null): string {
  switch (source) {
    case "section":
      return refId ? `Section in ${refId}` : "Section completed";
    case "quiz":
      return refId ? `Quiz · ${refId}` : "Quiz completed";
    case "homework":
      return refId ? `Homework · ${refId}` : "Homework submitted";
    case "module_complete":
      return refId ? `Module complete · ${refId}` : "Module complete";
    case "lab_complete":
      return refId ? `Lab complete · ${refId}` : "Lab complete";
    case "lab_high_score":
      return refId ? `Lab high score · ${refId}` : "Lab high score";
    case "daily_goal":
      return "Daily goals — bonus";
    case "streak_bonus":
      return `Streak milestone (${refId ?? "—"})`;
    case "badge_earned":
      return refId ? `Badge · ${refId}` : "Badge";
    default:
      return source;
  }
}

export default function PathwaysProfile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { state } = useGamification();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [badges, setBadges] = useState<BadgeCatalogEntry[]>([]);
  const [events, setEvents] = useState<XpEvent[]>([]);

  useEffect(() => {
    fetch("/api/pathways/student/milestones", { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setMilestones(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/pathways/gamification/me/badges", { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setBadges(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/pathways/gamification/me/events", { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const completed = milestones.filter((m) => m.status === "completed");
  const inProgress = milestones.filter((m) => m.status === "in_progress");
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length,
        )
      : 0;

  const pct =
    state?.xpProgress.needed && state.xpProgress.needed > 0
      ? Math.min(
          100,
          Math.round((state.xpProgress.current / state.xpProgress.needed) * 100),
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center text-xl sm:text-2xl text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {user?.name ?? t("pathways.profile.learner")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
              {user?.email}
            </p>
            {state && (
              <p className="mt-1 text-[11px] sm:text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                Level {state.currentLevel} · {state.levelTier.tier}
              </p>
            )}
          </div>
        </div>

        {/* Level + XP bar */}
        {state && (
          <div className="mt-4 sm:mt-5">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                XP this level
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {state.xpProgress.current}/{state.xpProgress.needed}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
              Total: {state.totalXp.toLocaleString()} XP
            </p>
          </div>
        )}

        {/* Streak row */}
        {state && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Flame
                className={`w-4 h-4 ${state.currentStreak > 0 ? "text-orange-500" : "text-slate-400"}`}
              />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {state.currentStreak}
              </span>
              <span className="text-xs text-slate-500">current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {state.longestStreak}
              </span>
              <span className="text-xs text-slate-500">best</span>
            </div>
          </div>
        )}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatBlock
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="text-emerald-600 dark:text-emerald-400"
          value={completed.length}
          label={t("pathways.profile.completed")}
        />
        <StatBlock
          icon={<Clock className="w-5 h-5" />}
          iconColor="text-indigo-600 dark:text-indigo-400"
          value={inProgress.length}
          label={t("pathways.profile.inProgress")}
        />
        <StatBlock
          icon={<Star className="w-5 h-5" />}
          iconColor="text-amber-600 dark:text-amber-400"
          value={`${avgScore}%`}
          label={t("pathways.profile.avgScore")}
        />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200">
              Badges
            </h2>
            <span className="text-xs text-slate-500">
              ({badges.filter((b) => b.earnedAt).length}/{badges.length})
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {badges.map((b) => {
              const earned = !!b.earnedAt;
              return (
                <div
                  key={b.slug}
                  className={`rounded-xl p-3 text-center border ${
                    earned
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30"
                      : "bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/40 opacity-50"
                  }`}
                  title={b.description}
                >
                  <div className="text-2xl sm:text-3xl mb-1" aria-hidden>
                    {earned ? b.icon : "🔒"}
                  </div>
                  <p
                    className={`text-[10px] sm:text-xs font-semibold leading-tight ${
                      earned
                        ? "text-amber-900 dark:text-amber-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {b.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {events.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-3">
            Recent activity
          </h2>
          <div className="space-y-1.5">
            {events.slice(0, 10).map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-sm"
              >
                <span className="w-12 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                  +{e.amount}
                </span>
                <span className="flex-1 min-w-0 text-slate-800 dark:text-slate-200 truncate">
                  {sourceLabel(e.source, e.sourceRefId)}
                </span>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(e.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Modules */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-3">
            {t("pathways.profile.completedModules")}
          </h2>
          <div className="space-y-2">
            {completed.map((m) => {
              const moduleName = t(
                `pathways.tracks.modules.${m.moduleSlug}.name`,
                m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              ) as string;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/20"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 dark:text-slate-200">{moduleName}</p>
                    <p className="text-[10px] text-slate-500">
                      {m.trackSlug} {m.score ? t("pathways.profile.scoreFmt", { score: m.score }) : ""}
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

function StatBlock({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 text-center shadow-sm">
      <div className={`flex justify-center mb-1 ${iconColor}`}>{icon}</div>
      <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 leading-tight">{label}</p>
    </div>
  );
}
