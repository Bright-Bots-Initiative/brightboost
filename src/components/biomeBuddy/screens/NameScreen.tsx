/** Name & Save (Share beat) — closed name kit, no free text; save-in-place. */
import {
  NAME_ADJECTIVES,
  NAME_NOUNS,
  type BuddyRecipe,
  type NameAdjective,
  type NameNoun,
} from "../biomeBuddyModel";
import { NAME_ADJECTIVE_LABEL, NAME_NOUN_LABEL } from "../biomeBuddyContent";
import BuddySprite from "../BuddySprite";
import ProgressDots from "../ProgressDots";
import ShareButton from "../ShareButton";
import { onRadioArrowKeys, radioTabIndex } from "../radioKeys";
import { useBuddyLocale } from "../useBuddyLocale";

export type SaveNote = "saved" | "local" | null;

export interface NameScreenProps {
  recipe: BuddyRecipe;
  name: string;
  onAdjective: (id: NameAdjective) => void;
  onNoun: (id: NameNoun) => void;
  onSave: () => void;
  saved: boolean;
  saveNote: SaveNote;
  onKeepBuilding: () => void;
  onTitle: () => void;
  reduced: boolean;
}

export default function NameScreen({
  recipe,
  name,
  onAdjective,
  onNoun,
  onSave,
  saved,
  saveNote,
  onKeepBuilding,
  onTitle,
  reduced,
}: NameScreenProps) {
  const { t, L } = useBuddyLocale();
  return (
    <div className="flex flex-col items-center gap-4 py-4 px-3 w-full max-w-3xl mx-auto">
      <ProgressDots current="name" />
      <h2 className="text-2xl font-extrabold text-[#3a2e22] text-center">
        {t("biomeBuddy.name.heading", { defaultValue: "Name your Buddy!" })}
      </h2>

      <div className="flex flex-col items-center gap-1">
        <BuddySprite recipe={recipe} size="lg" animate={!reduced} />
        <p
          className="text-2xl font-extrabold text-[#1c3d6c]"
          aria-live="polite"
          data-testid="name-preview"
        >
          {name}
        </p>
      </div>

      <section className="w-full" aria-labelledby="bb-name-adj">
        <h3
          id="bb-name-adj"
          className="text-base font-extrabold text-[#3a2e22] mb-2"
        >
          {t("biomeBuddy.name.pickWord1", { defaultValue: "Pick a word" })}
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="bb-name-adj"
          className="flex flex-wrap gap-2"
          onKeyDown={onRadioArrowKeys}
        >
          {NAME_ADJECTIVES.map((id) => {
            const selected = recipe.name.adjective === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={radioTabIndex(selected)}
                onClick={() => onAdjective(id)}
                className="bb-chip min-h-12 px-4 rounded-2xl bg-white border-[3px] border-[#e1d0a6] font-extrabold text-[#3a2e22] active:scale-95"
              >
                {L(NAME_ADJECTIVE_LABEL[id])}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full" aria-labelledby="bb-name-noun">
        <h3
          id="bb-name-noun"
          className="text-base font-extrabold text-[#3a2e22] mb-2"
        >
          {t("biomeBuddy.name.pickWord2", {
            defaultValue: "Pick a creature word",
          })}
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="bb-name-noun"
          className="flex flex-wrap gap-2"
          onKeyDown={onRadioArrowKeys}
        >
          {NAME_NOUNS.map((id) => {
            const selected = recipe.name.noun === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={radioTabIndex(selected)}
                onClick={() => onNoun(id)}
                className="bb-chip min-h-12 px-4 rounded-2xl bg-white border-[3px] border-[#e1d0a6] font-extrabold text-[#3a2e22] active:scale-95"
              >
                {L(NAME_NOUN_LABEL[id])}
              </button>
            );
          })}
        </div>
      </section>

      {/* Only the primary action is sticky; everything else flows below it so
          the bar never grows past one control on a phone. */}
      <div className="bb-actions-sticky w-full flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onSave}
          className="bb-primary min-h-14 px-10 rounded-full bg-teal-600 text-white text-xl font-extrabold shadow-[0_5px_0_#0f6f66] active:translate-y-1 active:shadow-none"
        >
          {saved
            ? t("biomeBuddy.name.saveAgain", { defaultValue: "Save it! 💾" })
            : t("biomeBuddy.name.save", { defaultValue: "Save it! 💾" })}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-bold text-green-800 min-h-5 text-center"
        >
          {saveNote === "saved" &&
            t("biomeBuddy.name.saved", {
              defaultValue: "Saved on this device! ✓",
            })}
          {saveNote === "local" &&
            t("biomeBuddy.name.savedLocal", {
              defaultValue:
                "Saved for now — this device is out of room, so it may not stick.",
            })}
        </p>
      </div>
      {saved && <ShareButton recipe={recipe} name={name} />}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onKeepBuilding}
          className="min-h-11 px-5 rounded-full bg-white font-extrabold text-[#3a2e22] shadow active:scale-95"
        >
          {t("biomeBuddy.name.keepBuilding", {
            defaultValue: "Keep building 🔧",
          })}
        </button>
        <button
          type="button"
          onClick={onTitle}
          className="min-h-11 px-5 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95"
        >
          {t("biomeBuddy.common.myBuddies", { defaultValue: "My Buddies" })}
        </button>
      </div>
    </div>
  );
}
