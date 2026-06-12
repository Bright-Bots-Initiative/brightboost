/**
 * Banded word-family integrity guard for Rhyme & Ride.
 *
 * Contract: the HUD shows the family's letter pattern as the cue, so every
 * correct word must literally end with the pattern, and NO distractor may —
 * a distractor that matches the pattern (e.g. "cement" for -ment) marks an
 * honest answer wrong. This guard caught "cement" (-ment) and "silence"
 * (-ence) in the originally authored g3_5 data.
 */
import { describe, expect, it } from "vitest";
import { getWorldsForBand } from "../RhymeRideGame";

const BANDS = ["k2", "g3_5"] as const;

describe("Rhyme & Ride banded worlds", () => {
  it.each(BANDS)("%s: 3 worlds, each family big enough for a round", (band) => {
    const worlds = getWorldsForBand(band);
    expect(worlds).toHaveLength(3);
    for (const world of worlds) {
      expect(world.families.length).toBeGreaterThanOrEqual(2);
      for (const fam of world.families) {
        // spawnRound needs a prompt word + a different correct word…
        expect(fam.words.length, `${fam.pattern} words`).toBeGreaterThanOrEqual(4);
        // …plus 2 distractors per round, drawn without replacement.
        expect(fam.distractors.length, `${fam.pattern} distractors`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each(BANDS)("%s: every word matches its pattern, no distractor does", (band) => {
    for (const world of getWorldsForBand(band)) {
      for (const fam of world.families) {
        const suffix = fam.pattern.replace(/^-/, "");
        for (const word of fam.words) {
          expect(
            word.endsWith(suffix),
            `"${word}" should end with "${suffix}" (${fam.pattern})`,
          ).toBe(true);
        }
        for (const d of fam.distractors) {
          expect(
            d.endsWith(suffix),
            `distractor "${d}" must NOT end with "${suffix}" (${fam.pattern})`,
          ).toBe(false);
        }
        expect(
          fam.words.filter((w) => fam.distractors.includes(w)),
          `${fam.pattern} word doubles as its own distractor`,
        ).toEqual([]);
      }
    }
  });

  it("g3_5 uses ending patterns, fully disjoint from the K-2 CVC rimes", () => {
    const g35Patterns = getWorldsForBand("g3_5").flatMap((w) =>
      w.families.map((f) => f.pattern),
    );
    expect(g35Patterns).toEqual(["-tion", "-ment", "-ight", "-ound", "-ence", "-ain"]);
    const k2Patterns = getWorldsForBand("k2").flatMap((w) => w.families.map((f) => f.pattern));
    for (const p of g35Patterns) {
      expect(k2Patterns).not.toContain(p);
    }
  });
});
