import { describe, expect, it } from "vitest";
import {
  buildSkyShieldCompletionPayload,
  mkChallenge,
  mkPattern,
} from "../SkyShieldGame";

describe("Sky Shield helpers", () => {
  it("creates valid repeating base pattern", () => {
    const pattern = mkPattern();
    expect(pattern).toHaveLength(6);
    expect(pattern.slice(0, 3).sort()).toEqual([0, 1, 2]);
    expect(pattern.slice(3).sort()).toEqual([0, 1, 2]);
  });

  it("creates challenge with mystery constraints", () => {
    const challenge = mkChallenge();
    const mysteries = challenge
      .map((drop, idx) => ({ drop, idx }))
      .filter(({ drop }) => drop.kind === "mystery");

    expect(challenge).toHaveLength(10);
    expect(mysteries).toHaveLength(2);
    expect(mysteries.every(({ idx }) => idx >= 2)).toBe(true);
    expect(mysteries.every(({ drop }) => drop.hiddenColor === 0 || drop.hiddenColor === 1)).toBe(true);
    expect(challenge.every((drop) => drop.lane >= 0 && drop.lane <= 2)).toBe(true);
  });

  it("builds completion payload", () => {
    expect(
      buildSkyShieldCompletionPayload({
        score: 85,
        exitAns: 1,
        totalRounds: 20,
        maxStreak: 4,
        streak: 3,
      }),
    ).toMatchObject({
      gameKey: "sky_shield",
      score: 105,
      total: 420,
      streakMax: 4,
      roundsCompleted: 21,
    });
  });
});
