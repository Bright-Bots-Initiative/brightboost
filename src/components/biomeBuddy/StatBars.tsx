/**
 * Biome Buddy — the four stat bars (Sight · Hearing · Smell · Agility).
 *
 * Meaning never depends on color alone: every bar carries its emoji, its
 * label, the number, a word band ("just a little / some / good / great") and,
 * when a "before" block is given, the delta as text with ▲ / ▼. Each bar is a
 * `role="meter"` with a full accessible name.
 */
import {
  STATS,
  STAT_EMOJI,
  type StatBlock,
  type Stat,
} from "./biomeBuddyModel";
import { STAT_LABEL } from "./biomeBuddyContent";
import { useBuddyLocale } from "./useBuddyLocale";

export type StatBand = "low" | "some" | "good" | "great";

export function statBand(value: number): StatBand {
  if (value >= 75) return "great";
  if (value >= 50) return "good";
  if (value >= 25) return "some";
  return "low";
}

const BAR_COLOR: Record<Stat, string> = {
  sight: "#46B1E6", // brightboost.blue
  hearing: "#69D681", // brightboost.green
  smell: "#c58cf0",
  agility: "#FF9C81", // brightboost.yellow token (coral)
};

export interface StatBarsProps {
  stats: StatBlock;
  before?: StatBlock | null;
  compact?: boolean;
  /** Animate width changes (disabled under reduced motion via CSS). */
  animate?: boolean;
  className?: string;
}

export default function StatBars({
  stats,
  before = null,
  compact = false,
  animate = true,
  className = "",
}: StatBarsProps) {
  const { t, L } = useBuddyLocale();
  return (
    <ul className={`bb-stats flex flex-col gap-2 w-full ${className}`}>
      {STATS.map((stat) => {
        const value = stats[stat];
        const band = t(`biomeBuddy.stat.band.${statBand(value)}`, {
          defaultValue: statBand(value),
        });
        const label = L(STAT_LABEL[stat]);
        const delta = before ? value - before[stat] : 0;
        const deltaText =
          before === null
            ? ""
            : delta > 0
              ? t("biomeBuddy.stat.up", { defaultValue: "up {{n}}", n: delta })
              : delta < 0
                ? t("biomeBuddy.stat.down", {
                    defaultValue: "down {{n}}",
                    n: Math.abs(delta),
                  })
                : t("biomeBuddy.stat.same", { defaultValue: "same" });
        const meterName = t("biomeBuddy.stat.meterAria", {
          defaultValue: "{{stat}}: {{value}} out of 100, {{band}}{{delta}}",
          stat: label,
          value,
          band,
          delta: before ? `, ${deltaText}` : "",
        });
        return (
          <li
            key={stat}
            className="bb-stat flex items-center gap-2"
            data-stat={stat}
          >
            <span
              className={`bb-stat-icon ${compact ? "text-lg" : "text-2xl"}`}
              aria-hidden
            >
              {STAT_EMOJI[stat]}
            </span>
            <span
              className={`bb-stat-label font-extrabold ${compact ? "text-xs w-16" : "text-sm w-20"} shrink-0`}
            >
              {label}
            </span>
            <div
              role="meter"
              aria-label={meterName}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              aria-valuetext={`${value}, ${band}`}
              className={`bb-meter relative flex-1 min-w-0 rounded-full bg-white/80 border-2 border-[#3a2e22]/20 overflow-hidden ${compact ? "h-4" : "h-6"}`}
            >
              {before && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#3a2e22]/15"
                  style={{ width: `${before[stat]}%` }}
                  aria-hidden
                />
              )}
              <div
                className={`bb-meter-fill absolute inset-y-0 left-0 rounded-full ${animate ? "bb-meter-fill--animate" : ""}`}
                style={{ width: `${value}%`, background: BAR_COLOR[stat] }}
                aria-hidden
              />
            </div>
            <span
              className={`bb-stat-value tabular-nums font-extrabold ${compact ? "text-xs w-7" : "text-sm w-8"} text-right shrink-0`}
              aria-hidden
            >
              {value}
            </span>
            {!compact && (
              <span
                className="bb-stat-band text-xs font-bold text-[#6f6048] w-16 shrink-0"
                aria-hidden
              >
                {band}
              </span>
            )}
            {before && (
              <span
                className={`bb-stat-delta text-xs font-extrabold shrink-0 ${delta > 0 ? "text-green-700" : delta < 0 ? "text-orange-700" : "text-[#6f6048]"}`}
                aria-hidden
              >
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {deltaText}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
