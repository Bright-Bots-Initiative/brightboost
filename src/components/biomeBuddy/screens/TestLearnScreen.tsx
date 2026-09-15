/**
 * Test & Learn (Play) — popup over the Buddy in its home. Page 1: all four
 * bars before → after. Then one card per CHANGED bar: what moved, why in this
 * biome (one kid sentence per part, "Tell me more" for the deeper science)
 * and a wondering nudge — never an instruction. "Got it!" closes.
 *
 * Three shapes, all with a next step and none a dead end:
 *   - bars moved            → one card per moved bar;
 *   - a part changed but no bar moved here → one "nothing moved" card that
 *     says what that means (looks / built-for changed, not these four bars);
 *   - nothing changed at all → one "same parts, same home" card.
 */
import { useEffect, useId, useRef, useState } from "react";
import {
  BIOME_EMOJI,
  PICKERS,
  recipeKey,
  STAT_EMOJI,
  TRAITS,
  type BuddyRecipe,
  type Contribution,
  type TestSummary,
  type TraitOption,
} from "../biomeBuddyModel";
import {
  BIOME_INFO,
  STAT_LABEL,
  scienceFor,
  renderBuddyName,
  whyFor,
  type Localized,
} from "../biomeBuddyContent";
import BiomeScene from "../BiomeScene";
import BuddySprite from "../BuddySprite";
import Overlay from "../Overlay";
import StatBars from "../StatBars";
import WaterExperiment from "../WaterExperiment";
import { useBuddyLocale } from "../useBuddyLocale";

export interface TestLearnScreenProps {
  summary: TestSummary;
  wonder: Localized;
  onGotIt: () => void;
  onRestoreBefore: () => void;
  reduced: boolean;
}

function ExperimentVersion({
  recipe,
  label,
}: {
  recipe: BuddyRecipe;
  label: string;
}) {
  const { lang, L } = useBuddyLocale();
  return (
    <div
      className="min-w-0 flex flex-col gap-2"
      data-testid="experiment-version"
    >
      <p className="font-extrabold text-[#3a2e22]">{label}</p>
      <BiomeScene biome={recipe.biome} minHeight={128}>
        <div className="flex justify-center">
          <BuddySprite recipe={recipe} size="md" animate={false} />
        </div>
      </BiomeScene>
      <p className="text-sm font-extrabold text-[#3a2e22]">
        {renderBuddyName(recipe.name, lang)} ·{" "}
        {L(BIOME_INFO[recipe.biome].label)}
      </p>
      <p className="text-xs font-medium text-[#5a4c38]">
        {PICKERS.map((picker) =>
          L(
            scienceFor(
              picker,
              (picker === "pattern"
                ? recipe.pattern
                : recipe.traits[picker]) as never,
            ).label,
          ),
        ).join(" · ")}
      </p>
    </div>
  );
}

function WhyRow({
  row,
  biome,
}: {
  row: Contribution;
  biome: TestSummary["biome"];
}) {
  const { t, L } = useBuddyLocale();
  const [more, setMore] = useState(false);
  const id = useId();
  const def = (TRAITS[row.category] as Record<string, TraitOption>)[row.option];
  const card = scienceFor(row.category, row.option);
  const why = whyFor(row.category, row.option, biome);
  return (
    <li className="rounded-2xl bg-white p-3 text-left flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-3xl" aria-hidden>
          {def.emoji}
        </span>
        <div className="min-w-0">
          <p className="font-extrabold text-[#3a2e22]">{L(card.label)}</p>
          <p className="text-sm font-bold text-[#3a2e22]">
            {why ? L(why) : L(card.what)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        aria-controls={id}
        className="self-start min-h-11 px-4 rounded-full bg-[#fbf7ee] border-2 border-[#e1d0a6] text-sm font-bold text-[#3a2e22] active:scale-95"
      >
        {more
          ? t("biomeBuddy.science.less", { defaultValue: "Show less" })
          : t("biomeBuddy.science.more", { defaultValue: "Tell me more 🔬" })}
      </button>
      {more && (
        <p
          id={id}
          className="text-sm font-medium leading-relaxed text-[#3a2e22]"
        >
          {L(card.more)}
        </p>
      )}
    </li>
  );
}

export default function TestLearnScreen({
  summary,
  wonder,
  onGotIt,
  onRestoreBefore,
  reduced,
}: TestLearnScreenProps) {
  const { t, L, lang } = useBuddyLocale();
  const [page, setPage] = useState(0);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const info = BIOME_INFO[summary.biome];
  const snapshot = summary.snapshot;
  const where = L(info.inPhrase);
  const noMovement = summary.changes.length === 0;
  const total = 1 + (noMovement ? 1 : summary.changes.length);
  const last = page === total - 1;
  const change = page > 0 && !noMovement ? summary.changes[page - 1] : null;
  const identityChanged =
    summary.unchanged &&
    snapshot &&
    recipeKey(snapshot.before) !== recipeKey(snapshot.after);

  useEffect(() => {
    if (page > 0) headingRef.current?.focus();
  }, [page]);

  return (
    <Overlay
      labelledBy={headingId}
      onClose={onGotIt}
      wide
      className="bb-testlearn"
    >
      {page === 0 && (
        <>
          <h3
            ref={headingRef}
            tabIndex={-1}
            data-autofocus
            id={headingId}
            className="text-xl font-extrabold text-[#3a2e22]"
          >
            {snapshot
              ? t("biomeBuddy.test.heading", {
                  defaultValue: "Here's how {{name}} does {{where}}!",
                  name: renderBuddyName(snapshot.after.name, lang),
                  where,
                })
              : t("biomeBuddy.test.legacyHeading", {
                  defaultValue: "Your saved test {{where}}",
                  where,
                })}
            <span aria-hidden> {BIOME_EMOJI[summary.biome]}</span>
          </h3>
          {snapshot ? (
            <>
              <div className="grid grid-cols-2 gap-3 w-full">
                <ExperimentVersion
                  recipe={snapshot.before}
                  label={t("biomeBuddy.test.beforeVersion", {
                    defaultValue: "Before",
                  })}
                />
                <ExperimentVersion
                  recipe={snapshot.after}
                  label={t("biomeBuddy.test.afterVersion", {
                    defaultValue: "This test",
                  })}
                />
              </div>
              {snapshot.after.biome === "water" && (
                <WaterExperiment
                  before={snapshot.before}
                  after={snapshot.after}
                  reduced={reduced}
                />
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-[#5a4c38]">
              {t("biomeBuddy.test.legacy", {
                defaultValue:
                  "This test saved the bars, but not the Buddy's exact look. Keep experimenting to save new comparisons.",
              })}
            </p>
          )}
          <p className="text-sm font-bold text-[#5a4c38]">
            {summary.unchanged
              ? t("biomeBuddy.test.introSame", {
                  defaultValue:
                    "Same parts, same home — the bars stayed put. Tap next.",
                })
              : noMovement
                ? t("biomeBuddy.test.introNoMove", {
                    defaultValue:
                      "You changed a part, but these four bars stayed put in this home. Tap next to see what that means.",
                  })
                : t("biomeBuddy.test.intro", {
                    defaultValue:
                      "The grey mark is before. The color is now. Tap next to see why each bar moved.",
                  })}
          </p>
          <div className="w-full rounded-2xl bg-white/80 p-3">
            <StatBars
              stats={summary.after}
              before={summary.before}
              animate={!reduced}
            />
          </div>
        </>
      )}

      {page > 0 && noMovement && (
        <>
          <h3
            ref={headingRef}
            tabIndex={-1}
            id={headingId}
            className="text-xl font-extrabold text-[#3a2e22]"
          >
            {t("biomeBuddy.test.unchangedTitle", {
              defaultValue: "Nothing moved this time",
            })}
          </h3>
          <p className="font-bold text-[#3a2e22]" data-testid="no-move-body">
            {identityChanged
              ? t("biomeBuddy.test.identityOnly", {
                  defaultValue:
                    "You gave your Buddy a new name or look! These four bars still work the same way.",
                })
              : summary.unchanged
                ? t("biomeBuddy.test.unchangedBody", {
                    defaultValue:
                      "That's useful to know too! Same parts in the same home do the same things.",
                  })
                : t("biomeBuddy.test.noMoveBody", {
                    defaultValue:
                      "Your new part didn't move these bars here — but it changed how your Buddy looks and what it's built for. I wonder which home would make it matter?",
                  })}
          </p>
        </>
      )}

      {change && (
        <>
          <h3
            ref={headingRef}
            tabIndex={-1}
            id={headingId}
            className="text-xl font-extrabold text-[#3a2e22]"
          >
            <span aria-hidden>{STAT_EMOJI[change.stat]} </span>
            {t(
              change.delta > 0
                ? "biomeBuddy.test.wentUp"
                : "biomeBuddy.test.wentDown",
              {
                defaultValue:
                  change.delta > 0
                    ? "{{stat}} went up by {{n}}!"
                    : "{{stat}} went down by {{n}}.",
                stat: L(STAT_LABEL[change.stat]),
                n: Math.abs(change.delta),
              },
            )}
          </h3>
          <p className="text-sm font-bold text-[#5a4c38]">
            {t("biomeBuddy.test.beforeAfter", {
              defaultValue: "Before: {{before}} · Now: {{after}}",
              before: change.before,
              after: change.after,
            })}
          </p>
          <p className="text-sm font-extrabold text-[#3a2e22] self-start">
            {t("biomeBuddy.test.whyIntro", {
              defaultValue: "Why, {{where}}?",
              where,
            })}
          </p>
          <ul className="w-full flex flex-col gap-2">
            {change.changedContributions.map((row) => (
              <WhyRow
                key={`${row.category}-${row.option}`}
                row={row}
                biome={summary.biome}
              />
            ))}
          </ul>
        </>
      )}

      {last && (
        <div className="flex items-start gap-3 text-left w-full">
          <div className="text-4xl" aria-hidden>
            🦉
          </div>
          <p
            className="flex-1 bg-white rounded-2xl p-3 font-bold text-[#3a2e22] shadow"
            data-testid="wonder"
          >
            {L(wonder)}
          </p>
        </div>
      )}

      {last &&
        snapshot &&
        recipeKey(snapshot.before) !== recipeKey(snapshot.after) && (
          <button
            type="button"
            onClick={onRestoreBefore}
            className="min-h-11 px-4 rounded-full bg-white border-2 border-[#e1d0a6] font-bold text-[#3a2e22]"
          >
            {t("biomeBuddy.test.restore", {
              defaultValue: "Go back to before",
            })}
          </button>
        )}

      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="min-h-11 px-4 rounded-full bg-white border-2 border-[#e1d0a6] font-bold text-[#3a2e22] active:scale-95 disabled:opacity-70"
        >
          {t("biomeBuddy.test.prev", { defaultValue: "◀ Back" })}
        </button>
        <span className="text-xs font-bold text-[#6b5a42]" aria-live="polite">
          {t("biomeBuddy.test.page", {
            defaultValue: "{{n}} of {{total}}",
            n: page + 1,
            total,
          })}
        </span>
        {last ? (
          <button
            type="button"
            onClick={onGotIt}
            className="bb-primary min-h-14 px-8 rounded-full bg-orange-700 text-white font-extrabold text-lg active:scale-95"
          >
            {t("biomeBuddy.test.gotIt", { defaultValue: "Got it!" })}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
            className="bb-primary min-h-14 px-8 rounded-full bg-teal-700 text-white font-extrabold text-lg active:scale-95"
          >
            {t("biomeBuddy.test.next", { defaultValue: "Next ▶" })}
          </button>
        )}
      </div>
    </Overlay>
  );
}
