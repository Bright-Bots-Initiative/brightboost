/**
 * GamificationStrip — three-card row pinned at the top of the Pathways home.
 *
 * Cards: Level + XP bar | Streak (with freeze indicator) | Badges count.
 * Loading state degrades gracefully into faint skeleton cells; the strip
 * never blocks the rest of the home page.
 */
import { Flame, Trophy, Shield } from "lucide-react";
import type { GamificationState } from "./useGamification";

export default function GamificationStrip({
  state,
  loading,
}: {
  state: GamificationState | null;
  loading: boolean;
}) {
  if (loading || !state) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 animate-pulse h-[88px] sm:h-[100px]"
          />
        ))}
      </div>
    );
  }

  const pct =
    state.xpProgress.needed === 0
      ? 100
      : Math.min(
          100,
          Math.round((state.xpProgress.current / state.xpProgress.needed) * 100),
        );

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Level + XP bar */}
      <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 shadow-sm">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          Level {state.currentLevel}
        </p>
        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
          {state.levelTier.tier}
        </p>
        <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 font-mono">
          {state.xpProgress.current}/{state.xpProgress.needed} XP
        </p>
      </div>

      {/* Streak */}
      <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 shadow-sm">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          Streak
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Flame
            className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
              state.currentStreak > 0
                ? "text-orange-500"
                : "text-slate-400 dark:text-slate-600"
            }`}
          />
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {state.currentStreak} {state.currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
        {state.streakFreezesAvailable > 0 && (
          <p className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-700 dark:text-cyan-300">
            <Shield className="w-3 h-3" />
            {state.streakFreezesAvailable} freeze
            {state.streakFreezesAvailable > 1 ? "s" : ""}
          </p>
        )}
        {state.longestStreak > state.currentStreak && (
          <p className="mt-1 text-[10px] text-slate-500">
            best: {state.longestStreak}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 shadow-sm">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          Badges
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {state.badgesEarned}
          </span>
        </div>
        {state.recentBadges.length > 0 && (
          <div className="flex -space-x-1 mt-2">
            {state.recentBadges.slice(0, 4).map((b) => (
              <div
                key={b.slug}
                title={b.name}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs"
              >
                {b.icon}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
