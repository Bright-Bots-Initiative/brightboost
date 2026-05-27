/**
 * DailyGoalsCard — small daily-goal checklist surfaced above the Next Task CTA.
 *
 * Designed to feel light: three small goals, refresh every UTC day. The
 * all-complete bonus chip pops once and stays — celebrates the streak of the
 * good day, not a comparison against peers.
 */
import { Check, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DailyGoalsPayload } from "./useGamification";

const BONUS_XP = 25;

export default function DailyGoalsCard({ goals }: { goals: DailyGoalsPayload | null }) {
  const { t } = useTranslation();
  if (!goals) {
    return (
      <div className="rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 h-[140px] animate-pulse" />
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("pathways.dailyGoals.heading")}
          </h3>
        </div>
        {goals.allComplete && (
          <span className="shrink-0 text-[10px] sm:text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">
            {t("pathways.dailyGoals.bonus", { xp: BONUS_XP })}
          </span>
        )}
      </div>
      <ul className="space-y-1.5 sm:space-y-2">
        {goals.goals.map((g) => (
          <li key={g.slug} className="flex items-center gap-2 sm:gap-3 text-sm">
            <span
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 ${
                g.completed
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400"
              }`}
            >
              {g.completed && <Check className="w-3 h-3" />}
            </span>
            <span
              className={`flex-1 truncate ${
                g.completed
                  ? "text-slate-500 dark:text-slate-500 line-through"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {g.label}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 font-mono shrink-0">
              {g.current}/{g.target}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
