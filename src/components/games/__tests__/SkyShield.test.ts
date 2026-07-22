import { describe, expect, it } from "vitest";
import {
  buildSkyShieldCompletionPayload,
  mkChallenge,
  mkPattern,
} from "../SkyShieldGame";
import { SKY_SHIELD_CONTENT } from "../gradeBandContent";

const TEST_BANDS = [
  ["k2", SKY_SHIELD_CONTENT.k2],
  ["g3_5", SKY_SHIELD_CONTENT.g3_5],
] as const;

describe("Sky Shield helpers", () => {
  it.each(TEST_BANDS)(
    "creates valid repeating base pattern for %s",
    (_band, content) => {
      const pattern = mkPattern(content);

      expect(pattern.base).toHaveLength(content.patternLength / 2);
      expect(pattern.sequence).toHaveLength(content.patternLength);

      expect(pattern.sequence).toEqual([...pattern.base, ...pattern.base]);
    },
  );

  it.each(TEST_BANDS)(
    "creates challenge with mystery constraints",
    (_band, content) => {
      const pattern = mkPattern(content);
      const challenge = mkChallenge(content, pattern);
      const mysteries = challenge
        .map((drop, idx) => ({ drop, idx }))
        .filter(({ drop }) => drop.kind === "mystery");

      expect(challenge).toHaveLength(content.challengeRounds);
      expect(mysteries).toHaveLength(content.mysteryDrops);
      expect(mysteries.every(({ idx }) => idx >= 2)).toBe(true);
      expect(
        mysteries.every(({ drop }) => drop.hiddenColor === drop.lane),
      ).toBe(true);
      expect(challenge.every((drop) => drop.lane >= 0 && drop.lane <= 2)).toBe(
        true,
      );
    },
  );

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
