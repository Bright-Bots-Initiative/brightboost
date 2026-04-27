import { describe, expect, it } from "vitest";
import {
  buildGotchaCompletionPayload,
  calculateGotchaCatchScore,
} from "../GotchaGearsGame";

describe("Gotcha Gears helpers", () => {
  it("calculates streak-based catch score", () => {
    expect(calculateGotchaCatchScore(0)).toBe(10);
    expect(calculateGotchaCatchScore(2)).toBe(30);
  });

  it("builds completion payload shape", () => {
    expect(
      buildGotchaCompletionPayload({
        score: 80,
        roundsLength: 6,
        maxStreak: 4,
        roundIdx: 5,
      }),
    ).toMatchObject({
      gameKey: "gotcha_gears_unity",
      score: 80,
      total: 6,
      streakMax: 4,
      roundsCompleted: 6,
    });
  });
});
