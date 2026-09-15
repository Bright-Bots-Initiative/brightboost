import { diffBuilds, type BuddyRecipe, type Picker } from "./biomeBuddyModel";
import { scienceFor, STAT_LABEL } from "./biomeBuddyContent";
import { useBuddyLocale } from "./useBuddyLocale";

export interface TraitChange {
  picker: Picker;
  option: string;
  before: BuddyRecipe;
  after: BuddyRecipe;
}

/** A selection is a change to the whole Buddy, not an isolated contribution. */
export default function TraitFeedback({ change }: { change: TraitChange }) {
  const { t, L } = useBuddyLocale();
  const card = scienceFor(change.picker, change.option as never);
  const summary = diffBuilds(change.before, change.after);
  return (
    <div
      className="bb-trait-feedback rounded-2xl bg-[#fff4c2] p-3 text-[#3a2e22]"
      data-testid="trait-feedback"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="font-extrabold">{L(card.label)}</p>
      <p className="text-sm font-bold">{L(card.what)}</p>
      {summary.changes.length > 0 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm font-extrabold">
          {summary.changes.map((change) => (
            <li key={change.stat}>
              {L(STAT_LABEL[change.stat])}{" "}
              {change.delta > 0
                ? t("biomeBuddy.stat.up", {
                    defaultValue: "up {{n}}",
                    n: change.delta,
                  })
                : t("biomeBuddy.stat.down", {
                    defaultValue: "down {{n}}",
                    n: -change.delta,
                  })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-bold mt-2">
          {t("biomeBuddy.create.sameBars", {
            defaultValue: "A new look — these four bars stayed the same.",
          })}
        </p>
      )}
    </div>
  );
}
