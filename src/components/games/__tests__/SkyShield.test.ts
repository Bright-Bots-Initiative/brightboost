import { describe, expect, it } from "vitest";
import {
  buildSkyShieldCompletionPayload,
  mkChallenge,
  mkPattern,
  PT,
} from "../SkyShieldGame";
import { SKY_SHIELD_CONTENT } from "../gradeBandContent";

const TEST_BANDS = [
  ["k2", SKY_SHIELD_CONTENT.k2],
  ["g3_5", SKY_SHIELD_CONTENT.g3_5],
] as const;

/** GameShell's default star thresholds (see shared/GameShell.tsx). */
const STAR_THRESHOLDS = [30, 60, 90] as const;
const starsFor = (pct: number) =>
  pct >= STAR_THRESHOLDS[2]
    ? 3
    : pct >= STAR_THRESHOLDS[1]
      ? 2
      : pct >= STAR_THRESHOLDS[0]
        ? 1
        : 0;

/** Perfect-play score + exit ticket, per band — the numbers reported in #735. */
const PERFECT_TOTALS = { k2: 285, g3_5: 370 } as const;

const repeat = (times: number, points: number) =>
  Array.from({ length: times }, () => points);

/**
 * The point events a flawless run puts on the board, in play order. Mirrors the
 * phase schedule in SkyShieldGame: practice -> pattern -> scan -> challenge.
 * A flawless run hits every phase the minimum number of times, so this is also
 * the shortest possible run.
 */
function perfectRunPoints(band: keyof typeof SKY_SHIELD_CONTENT): number[] {
  const content = SKY_SHIELD_CONTENT[band];
  const normalDrops = content.challengeRounds - content.mysteryDrops;
  // K-2 reveals a fixed three-drop scan set; g3-5 scans one drop per pattern step.
  const scanDrops = band === "g3_5" ? content.patternLength / 2 : 3;

  return [
    ...repeat(content.practiceRounds, PT.catch),
    ...repeat(content.patternRounds, PT.predict),
    ...repeat(scanDrops, PT.scan),
    ...(band === "g3_5"
      ? // g3-5 challenge: predict then catch on each mystery drop, catch on the rest.
        [
          ...repeat(content.mysteryDrops, PT.predict),
          ...repeat(content.mysteryDrops, PT.catch),
          ...repeat(normalDrops, PT.catch),
        ]
      : // K-2 challenge: one scored action per drop, scan-valued on mystery drops.
        [
          ...repeat(content.mysteryDrops, PT.scan),
          ...repeat(normalDrops, PT.catch),
        ]),
  ];
}

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

  it("builds a completion payload whose total is the points actually offered", () => {
    expect(
      buildSkyShieldCompletionPayload({
        score: 85,
        exitAns: 1,
        exitAnswer: 1,
        // A full K-2 run offers 265 points across its 21 scored rounds; rounds
        // are worth 10 / 15 / 20 depending on the action, not a flat 20 each.
        maxScore: 265,
        totalRounds: 21,
        maxStreak: 4,
        streak: 3,
      }),
    ).toMatchObject({
      gameKey: "sky_shield",
      score: 105,
      total: 285,
      streakMax: 4,
      roundsCompleted: 22,
    });
  });

  it.each(TEST_BANDS)(
    "scores an all-correct %s run at 100%% (3 stars)",
    (band, content) => {
      const points = perfectRunPoints(band);
      const earned = points.reduce((sum, p) => sum + p, 0);

      const payload = buildSkyShieldCompletionPayload({
        score: earned,
        exitAns: content.exitAnswer,
        exitAnswer: content.exitAnswer,
        // bump() adds every scored round to the maximum, right or wrong; a
        // flawless run therefore banks every point it was offered.
        maxScore: earned,
        totalRounds: points.length,
        maxStreak: points.length,
        streak: points.length,
      });

      expect(payload.total).toBe(PERFECT_TOTALS[band]);
      expect(payload.score).toBe(payload.total);

      const pct = (payload.score / payload.total) * 100;
      expect(pct).toBe(100);
      expect(starsFor(pct)).toBe(3);
    },
  );
});
