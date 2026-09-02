/** Create — the trait pickers, live stat bars and the Buddy in its home. */
import type { KeyboardEvent } from "react";
import {
  BIOME_EMOJI,
  CATEGORY_EMOJI,
  PATTERNS,
  PATTERN_EMOJI,
  PICKERS,
  TRAITS,
  TRAIT_OPTIONS,
  type Band,
  type BuddyRecipe,
  type Picker,
  type StatBlock,
  type TestSummary,
  type TraitOption,
} from "../biomeBuddyModel";
import {
  BIOME_INFO,
  CATEGORY_LABEL,
  PATTERN_SCIENCE,
  SCIENCE,
} from "../biomeBuddyContent";
import BiomeScene from "../BiomeScene";
import BuddySprite from "../BuddySprite";
import ProgressDots from "../ProgressDots";
import StatBars from "../StatBars";
import { useBuddyLocale } from "../useBuddyLocale";

export interface CreateScreenProps {
  recipe: BuddyRecipe;
  band: Band;
  unlocked: Picker[];
  stats: StatBlock;
  name: string;
  saved: boolean;
  onPick: (picker: Picker, option: string, opener: HTMLElement) => void;
  onTest: () => void;
  onName: () => void;
  onSave: () => void;
  onTitle: () => void;
  onChangeHome: () => void;
  lastTest: TestSummary | null;
  onReopenTest: () => void;
  reduced: boolean;
}

function optionsOf(picker: Picker): { id: string; emoji: string }[] {
  if (picker === "pattern")
    return PATTERNS.map((id) => ({ id, emoji: PATTERN_EMOJI[id] }));
  return TRAIT_OPTIONS[picker].map((id) => ({
    id,
    emoji: (TRAITS[picker] as Record<string, TraitOption>)[id].emoji,
  }));
}

function onArrowKeys(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  if (!keys.includes(event.key)) return;
  const chips = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not([aria-disabled="true"])',
    ),
  );
  const index = chips.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0 || chips.length === 0) return;
  event.preventDefault();
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
  chips[(index + (forward ? 1 : -1) + chips.length) % chips.length].focus();
}

export default function CreateScreen({
  recipe,
  band,
  unlocked,
  stats,
  name,
  saved,
  onPick,
  onTest,
  onName,
  onSave,
  onTitle,
  onChangeHome,
  lastTest,
  onReopenTest,
  reduced,
}: CreateScreenProps) {
  const { t, L } = useBuddyLocale();
  const biomeLabel = L(BIOME_INFO[recipe.biome].label);
  const spriteLabel = t("biomeBuddy.create.spriteAria", {
    defaultValue: "{{name}}, a {{biome}} Buddy",
    name,
    biome: biomeLabel,
  });

  return (
    <div className="bb-create flex flex-col items-center gap-3 py-3 px-2 sm:px-4 w-full max-w-6xl mx-auto">
      <ProgressDots current="create" />

      {/* Top bar */}
      <div className="w-full flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onName}
          className="min-h-11 min-w-0 px-4 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95 flex items-center gap-1 max-w-full"
          aria-label={t("biomeBuddy.create.renameAria", {
            defaultValue: "Buddy name: {{name}} — tap to change",
            name,
          })}
        >
          <span aria-hidden>🏷️</span>
          <span className="truncate">{name}</span>
        </button>
        <button
          type="button"
          onClick={onChangeHome}
          className="min-h-11 px-4 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95 flex items-center gap-1"
          aria-label={t("biomeBuddy.create.changeHomeAria", {
            defaultValue: "Home: {{biome}} — tap to change",
            biome: biomeLabel,
          })}
        >
          <span aria-hidden>{BIOME_EMOJI[recipe.biome]}</span>
          <span>{biomeLabel}</span>
        </button>
        <div className="flex-1" />
        {saved && (
          <button
            type="button"
            onClick={onSave}
            className="min-h-11 px-4 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95"
          >
            <span aria-hidden>💾 </span>
            {t("biomeBuddy.create.save", { defaultValue: "Save" })}
          </button>
        )}
        <button
          type="button"
          onClick={onTitle}
          className="min-h-11 px-4 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95"
        >
          {t("biomeBuddy.common.myBuddies", { defaultValue: "My Buddies" })}
        </button>
      </div>

      <div className="bb-create-layout w-full">
        {/* Side: the Buddy in its home + live bars */}
        <div className="bb-create-side flex flex-col gap-3">
          <BiomeScene biome={recipe.biome} minHeight={200}>
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <BuddySprite
                recipe={recipe}
                size="lg"
                label={spriteLabel}
                animate={!reduced}
              />
            </div>
          </BiomeScene>
          <div className="rounded-2xl bg-white/80 p-3">
            <h3 className="text-sm font-extrabold text-[#3a2e22] mb-2">
              {t("biomeBuddy.create.statsHeading", {
                defaultValue: "How {{name}} does in the {{biome}}",
                name,
                biome: biomeLabel,
              })}
            </h3>
            <StatBars stats={stats} animate={!reduced} />
          </div>
        </div>

        {/* Main: pickers */}
        <div className="flex flex-col gap-4 min-w-0">
          {PICKERS.map((picker) => {
            const open = unlocked.includes(picker);
            const label = L(CATEGORY_LABEL[picker]);
            const current =
              picker === "pattern" ? recipe.pattern : recipe.traits[picker];
            const emoji = picker === "pattern" ? "🎨" : CATEGORY_EMOJI[picker];
            const cardFor = (id: string) =>
              picker === "pattern"
                ? PATTERN_SCIENCE[id as keyof typeof PATTERN_SCIENCE]
                : (
                    SCIENCE[picker] as Record<
                      string,
                      (typeof SCIENCE)["eyes"]["no_eyes"]
                    >
                  )[id];
            return (
              <section
                key={picker}
                className="rounded-2xl bg-white/70 p-3"
                aria-labelledby={`bb-picker-${picker}`}
              >
                <h3
                  id={`bb-picker-${picker}`}
                  className="text-base font-extrabold text-[#3a2e22] flex items-center gap-2 mb-2"
                >
                  <span aria-hidden>{emoji}</span>
                  {label}
                  {!open && (
                    <span className="text-xs font-bold text-[#7d6c52] flex items-center gap-1">
                      <span aria-hidden>🔒</span>
                      {t("biomeBuddy.create.locked", {
                        defaultValue: "opens after you test a Buddy",
                      })}
                    </span>
                  )}
                </h3>
                <div
                  role="radiogroup"
                  aria-label={t("biomeBuddy.create.groupAria", {
                    defaultValue: "{{category}} choices",
                    category: label,
                  })}
                  className="bb-option-grid"
                  onKeyDown={onArrowKeys}
                >
                  {(open
                    ? optionsOf(picker)
                    : optionsOf(picker).filter((o) => o.id === current)
                  ).map((option) => {
                    const selected = option.id === current;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={open ? undefined : true}
                        onClick={(event) =>
                          open && onPick(picker, option.id, event.currentTarget)
                        }
                        className="bb-chip min-h-14 rounded-2xl bg-white border-[3px] border-[#e1d0a6] shadow-[0_3px_0_#0002] font-extrabold text-[#3a2e22] flex items-center gap-2 px-3 text-left active:translate-y-0.5"
                        aria-label={t("biomeBuddy.create.pickAria", {
                          defaultValue: "{{category}}: {{option}}",
                          category: label,
                          option: L(cardFor(option.id).label),
                        })}
                      >
                        <span className="text-2xl" aria-hidden>
                          {option.emoji}
                        </span>
                        <span className="text-sm leading-tight">
                          {L(cardFor(option.id).label)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {band === "k2" && unlocked.length < PICKERS.length && (
            <p className="text-xs font-bold text-[#7d6c52] text-center">
              {t("biomeBuddy.create.guidedHint", {
                defaultValue:
                  "Change a part, then test your Buddy to open more parts.",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bb-actions-sticky w-full flex flex-wrap items-center justify-center gap-3 relative">
        <button
          type="button"
          onClick={onTest}
          className="bb-primary min-h-14 px-10 rounded-full bg-teal-500 text-white text-xl font-extrabold shadow-[0_5px_0_#1d8a7d] active:translate-y-1 active:shadow-none"
        >
          {t("biomeBuddy.create.test", { defaultValue: "Test it! 🔬" })}
        </button>
        <button
          type="button"
          onClick={onName}
          className="min-h-11 px-5 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95"
        >
          {t("biomeBuddy.create.nameSave", { defaultValue: "Name & Save" })}
        </button>
        {lastTest && (
          <button
            type="button"
            onClick={onReopenTest}
            className="min-h-11 px-4 rounded-full bg-[#fff4c2] border-2 border-[#e1d0a6] font-bold text-[#3a2e22] shadow active:scale-95 sm:absolute sm:right-0 sm:bottom-0"
            aria-label={t("biomeBuddy.create.lastTestAria", {
              defaultValue: "Reopen the last Test & Learn",
            })}
          >
            <span aria-hidden>💡 </span>
            {t("biomeBuddy.create.lastTest", { defaultValue: "Last test" })}
          </button>
        )}
      </div>
    </div>
  );
}
