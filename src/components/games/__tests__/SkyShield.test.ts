import { describe, expect, it } from "vitest";
import {
  buildSkyShieldCompletionPayload,
  mkChallenge,
  mkPattern,
} from "../SkyShieldGame";
import { SKY_SHIELD_CONTENT } from "../gradeBandContent";

describe("Sky Shield helpers", () => {
  it("creates valid repeating base pattern", () => {
    const pattern = mkPattern(SKY_SHIELD_CONTENT.k2);

    expect(pattern.base).toHaveLength(3);
    expect(pattern.sequence).toHaveLength(6);

    expect(pattern.sequence.slice(0, 3).sort()).toEqual([0, 1, 2]);
    expect(pattern.sequence.slice(3).sort()).toEqual([0, 1, 2]);
  });

  it("creates challenge with mystery constraints", () => {
    const pattern = mkPattern(SKY_SHIELD_CONTENT.k2);
    const challenge = mkChallenge(SKY_SHIELD_CONTENT.k2, pattern);
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
        exitAnswer: 1,
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
