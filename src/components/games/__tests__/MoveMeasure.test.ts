import { describe, expect, it } from "vitest";
import {
  buildMoveMeasureCompletionPayload,
  tossScore,
  zoneScore,
} from "../MoveMeasureGame";

describe("Move, Measure & Improve helpers", () => {
  it("scores zones and tosses", () => {
    expect(zoneScore(0.35, 0.3, 0.4)).toBe(10);
    expect(zoneScore(0.9, 0.3, 0.4)).toBeLessThan(10);
    expect(tossScore(50)).toBe(10);
    expect(tossScore(0)).toBe(0);
  });

  it("builds completion payload with improvements and exit ticket", () => {
    const payload = buildMoveMeasureCompletionPayload({
      scores: { dash: 8, jump: 6, toss: 5 },
      impEvent: "jump",
      impScore: 9,
      exitAns: "correct",
    });

    expect(payload).toMatchObject({
      gameKey: "move_measure",
      total: 40,
      score: 29,
      roundsCompleted: 3,
      accuracy: 73,
      gameSpecific: { impEvent: "jump", impScore: 9, exitCorrect: true },
    });
  });
});
