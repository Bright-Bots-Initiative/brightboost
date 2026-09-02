/**
 * Biome Buddy — the science card that pops when an option is picked
 * (design §4): one kid sentence up front, the formal term in parentheses,
 * what THIS part changes in THIS biome (in words, not just bars), and a
 * "Tell me more" expander with the deeper seven-part science. Bottom-sheet
 * on phones so the live stat bars stay visible behind it.
 */
import { useId, useState } from "react";
import {
  BIOME_EMOJI,
  STAT_EMOJI,
  STATS,
  optionEffect,
  type AnyOptionId,
  type Biome,
  type Category,
  type Pattern,
} from "./biomeBuddyModel";
import { BIOME_INFO, STAT_LABEL, scienceFor } from "./biomeBuddyContent";
import Overlay from "./Overlay";
import { useBuddyLocale } from "./useBuddyLocale";

export interface ScienceCardProps {
  category: Category | "pattern";
  option: AnyOptionId | Pattern;
  biome: Biome;
  emoji: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

export default function ScienceCard({
  category,
  option,
  biome,
  emoji,
  onClose,
  returnFocusTo = null,
}: ScienceCardProps) {
  const { t, L } = useBuddyLocale();
  const [more, setMore] = useState(false);
  const headingId = useId();
  const moreId = useId();
  const card = scienceFor(category, option);
  const biomeLabel = L(BIOME_INFO[biome].label);
  const effect =
    category === "pattern"
      ? {}
      : optionEffect(category, option as AnyOptionId, biome);
  const effectRows = STATS.filter((stat) => (effect[stat] ?? 0) !== 0);

  return (
    <Overlay
      labelledBy={headingId}
      onClose={onClose}
      sheet
      wide
      returnFocusTo={returnFocusTo}
    >
      <div className="flex items-center gap-3 w-full text-left">
        <span className="text-5xl" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0">
          <h3
            id={headingId}
            className="text-xl font-extrabold text-[#3a2e22] leading-tight"
          >
            {L(card.label)}
          </h3>
          {L(card.term).trim().toLowerCase() !==
            L(card.label).trim().toLowerCase() && (
            <p className="text-xs font-bold text-[#7d6c52]">
              {t("biomeBuddy.science.term", {
                defaultValue: "also called: {{term}}",
                term: L(card.term),
              })}
            </p>
          )}
        </div>
      </div>

      <p className="text-lg font-bold text-[#3a2e22] text-left w-full">
        {L(card.what)}
      </p>

      <div
        className="w-full rounded-2xl bg-white p-3 text-left"
        data-testid="science-effect"
      >
        <p className="text-sm font-extrabold text-[#3a2e22]">
          <span aria-hidden>{BIOME_EMOJI[biome]} </span>
          {effectRows.length > 0
            ? t("biomeBuddy.science.effect", {
                defaultValue: "What this part does in the {{biome}}:",
                biome: biomeLabel,
              })
            : t("biomeBuddy.science.noEffect", {
                defaultValue:
                  "In the {{biome}} this changes how your Buddy looks, not the bars.",
                biome: biomeLabel,
              })}
        </p>
        {effectRows.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-2">
            {effectRows.map((stat) => {
              const v = effect[stat] ?? 0;
              return (
                <li
                  key={stat}
                  className={`rounded-full px-3 py-1 text-sm font-extrabold ${v > 0 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}
                >
                  <span aria-hidden>{STAT_EMOJI[stat]} </span>
                  {L(STAT_LABEL[stat])}{" "}
                  {v > 0
                    ? t("biomeBuddy.stat.up", {
                        defaultValue: "up {{n}}",
                        n: v,
                      })
                    : t("biomeBuddy.stat.down", {
                        defaultValue: "down {{n}}",
                        n: Math.abs(v),
                      })}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        aria-controls={moreId}
        className="min-h-11 px-5 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95"
      >
        {more
          ? t("biomeBuddy.science.less", { defaultValue: "Show less" })
          : t("biomeBuddy.science.more", { defaultValue: "Tell me more 🔬" })}
      </button>

      {more && (
        <dl
          id={moreId}
          className="w-full text-left text-sm text-[#3a2e22] flex flex-col gap-2"
        >
          {(
            [
              ["usedFor", "What it's for"],
              ["evolved", "How it came to be"],
              ["animals", "Animals that have it"],
              ["where", "Where in the world"],
              ["affects", "What else it changes"],
            ] as const
          ).map(([key, fallback]) => (
            <div key={key}>
              <dt className="font-extrabold text-[#7d6c52] text-xs uppercase tracking-wide">
                {t(`biomeBuddy.science.${key}`, { defaultValue: fallback })}
              </dt>
              <dd className="font-bold">{L(card[key])}</dd>
            </div>
          ))}
          <div>
            <dt className="font-extrabold text-[#7d6c52] text-xs uppercase tracking-wide">
              {t("biomeBuddy.science.deeper", {
                defaultValue: "The deeper science",
              })}
            </dt>
            <dd className="font-medium leading-relaxed">{L(card.more)}</dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={onClose}
        className="bb-primary min-h-14 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95"
      >
        {t("biomeBuddy.science.gotIt", { defaultValue: "Got it!" })}
      </button>
    </Overlay>
  );
}
