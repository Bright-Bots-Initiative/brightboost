import { describe, expect, it } from "vitest";
import {
  applyTankCommand,
  buildTankTrekCompletionPayload,
  computeTankStars,
} from "../TankTrekGame";

describe("Tank Trek helpers", () => {
  it("computes stars from command count and par", () => {
    expect(computeTankStars(4, 4)).toBe(3);
    expect(computeTankStars(5, 4)).toBe(2);
    expect(computeTankStars(8, 4)).toBe(1);
  });

  it("applies turn commands deterministically", () => {
    expect(applyTankCommand("N", "LEFT")).toBe("W");
    expect(applyTankCommand("N", "RIGHT")).toBe("E");
    expect(applyTankCommand("S", "FWD")).toBe("S");
  });

  it("builds completion payload with expected metadata", () => {
    const payload = buildTankTrekCompletionPayload({
      totalScore: 12,
      totalPossible: 15,
      levelsCleared: 5,
      retries: 0,
      totalChips: 3,
      hintsUsed: 1,
      allLevelsLength: 5,
      achievements: ["No Hints"],
    });

    expect(payload).toMatchObject({
      gameKey: "tank_trek",
      score: 12,
      total: 15,
      roundsCompleted: 5,
      accuracy: 80,
      firstTryClear: true,
      hintsUsed: 1,
      gameSpecific: { totalChips: 3, retries: 0 },
    });
  });
});
