import { describe, expect, it } from "vitest";
import {
  STEM_SET_1_IDS,
  STEM_SET_2_IDS,
  isSet1Complete,
  isSet2Locked,
} from "../stemSets";

describe("STEM set canon and gating", () => {
  it("has exactly 5 canonical Set 1 activity IDs", () => {
    expect(STEM_SET_1_IDS.length).toBe(5);
    expect(STEM_SET_1_IDS).toEqual([
      "bounce-buds",
      "gotcha-gears",
      "rhyme-ride",
      "tank-trek",
      "quantum-quest",
    ]);
  });

  it("has exactly 5 canonical Set 2 activity IDs", () => {
    expect(STEM_SET_2_IDS.length).toBe(5);
    expect(STEM_SET_2_IDS).toEqual([
      "maze-maps",
      "move-measure",
      "sky-shield",
      "fast-lane",
      "qualify-tune-race",
    ]);
  });

  it("returns false for Set 1 completion when only 4 canonical activities are completed", () => {
    expect(
      isSet1Complete(["bounce-buds", "gotcha-gears", "rhyme-ride", "tank-trek"]),
    ).toBe(false);
  });

  it("returns true for Set 1 completion only when all 5 canonical activities are completed", () => {
    expect(
      isSet1Complete([
        "bounce-buds",
        "gotcha-gears",
        "rhyme-ride",
        "tank-trek",
        "quantum-quest",
      ]),
    ).toBe(true);
  });

  it("keeps Set 2 locked before all 5 canonical Set 1 completions", () => {
    expect(
      isSet2Locked(["bounce-buds", "gotcha-gears", "rhyme-ride", "tank-trek"]),
    ).toBe(true);
  });

  it("unlocks Set 2 after all 5 canonical Set 1 completions", () => {
    expect(
      isSet2Locked([
        "bounce-buds",
        "gotcha-gears",
        "rhyme-ride",
        "tank-trek",
        "quantum-quest",
      ]),
    ).toBe(false);
  });

  it("does not let legacy lost-steps substitute for canonical Set 1 completion", () => {
    expect(
      isSet2Locked([
        "bounce-buds",
        "gotcha-gears",
        "rhyme-ride",
        "tank-trek",
        "lost-steps",
      ]),
    ).toBe(true);
  });
});
