/** A repeatable illustration of the existing agility model, not a speed score. */
import { useState, type CSSProperties } from "react";
import { computeStats, type BuddyRecipe } from "./biomeBuddyModel";
import { scienceFor, whyFor } from "./biomeBuddyContent";
import BuddySprite from "./BuddySprite";
import { useBuddyLocale } from "./useBuddyLocale";

export default function WaterExperiment({
  before,
  after,
  reduced,
}: {
  before: BuddyRecipe;
  after: BuddyRecipe;
  reduced: boolean;
}) {
  const { t, L } = useBuddyLocale();
  const [run, setRun] = useState(0);
  const [state, setState] = useState<"ready" | "playing" | "paused" | "done">(
    "ready",
  );
  const sameHome = before.biome === "water";
  const versions = sameHome ? [before, after] : [after];

  return (
    <section
      className="bb-water-experiment w-full rounded-2xl bg-[#e0f4fa] p-3 text-left"
      aria-label={t("biomeBuddy.water.title", { defaultValue: "Try the pond" })}
    >
      <h4 className="font-extrabold text-[#17435c]">
        {t("biomeBuddy.water.title", { defaultValue: "Try the pond" })}
      </h4>
      <p className="text-sm font-bold text-[#17435c] mb-3">
        {sameHome
          ? t("biomeBuddy.water.compare", {
              defaultValue:
                "Same pond, same time. What changes when your Buddy moves?",
            })
          : t("biomeBuddy.water.newHome", {
              defaultValue:
                "Your Buddy has a new home! Try one more change here to compare two pond swims.",
            })}
      </p>
      <div
        key={run}
        data-state={state}
        data-reduced={reduced}
        className="bb-water-lanes flex flex-col gap-3"
      >
        {versions.map((version, index) => {
          const isBefore = sameHome && index === 0;
          const label = isBefore
            ? t("biomeBuddy.test.beforeVersion", { defaultValue: "Before" })
            : t("biomeBuddy.test.afterVersion", { defaultValue: "This test" });
          const movement = version.traits.movement;
          const card = scienceFor("movement", movement);
          const agility = computeStats(version).agility;
          return (
            <div key={label}>
              <p className="text-sm font-extrabold text-[#17435c]">
                {label} · {L(card.label)}
              </p>
              <div className="bb-water-lane" aria-hidden="true">
                <div className="bb-water-track">
                  <div
                    className="bb-water-swimmer"
                    style={{ "--bb-swim-end": `${agility}%` } as CSSProperties}
                    onAnimationEnd={() => setState("done")}
                  >
                    <BuddySprite recipe={version} size="sm" animate={false} />
                  </div>
                </div>
                <span className="bb-water-reed">🌿</span>
              </div>
              <p className="text-sm font-medium text-[#17435c]">
                {t("biomeBuddy.water.observation", {
                  defaultValue: "Agility: {{n}}. {{why}}",
                  n: agility,
                  why: L(whyFor("movement", movement, "water") ?? card.what),
                })}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-medium text-[#17435c] mt-3">
        {t("biomeBuddy.water.model", {
          defaultValue:
            "This little swim shows your Buddy's Agility bar. All its parts can affect movement. Real animals move in many more ways!",
        })}
      </p>
      {!reduced && (
        <div className="bb-water-controls flex flex-wrap gap-2 mt-3">
          {state === "playing" || state === "paused" ? (
            <button
              type="button"
              className="min-h-11 px-5 rounded-full bg-teal-700 text-white font-bold"
              onClick={() =>
                setState(state === "playing" ? "paused" : "playing")
              }
            >
              {state === "playing"
                ? t("biomeBuddy.water.pause", { defaultValue: "Pause swim" })
                : t("biomeBuddy.water.resume", {
                    defaultValue: "Continue swim",
                  })}
            </button>
          ) : (
            <button
              type="button"
              className="min-h-11 px-5 rounded-full bg-teal-700 text-white font-bold"
              onClick={() => {
                setRun((n) => n + 1);
                setState("playing");
              }}
            >
              {state === "ready"
                ? t("biomeBuddy.water.watch", {
                    defaultValue: "Watch them move",
                  })
                : t("biomeBuddy.water.replay", { defaultValue: "Watch again" })}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
