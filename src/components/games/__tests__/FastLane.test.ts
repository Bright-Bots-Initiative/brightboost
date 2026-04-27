import { describe, expect, it } from "vitest";
import {
  bestLane,
  buildFastLaneCompletionPayload,
  generateLanes,
  scorePick,
} from "../FastLaneGame";

describe("Fast Lane helpers", () => {
  it("generates lanes with at least one safe lane", () => {
    for (let i = 0; i < 20; i++) {
      const lanes = generateLanes(true);
      expect(lanes.filter((s) => s === "safe").length).toBeGreaterThan(0);
    }
  });

  it("selects best lane using look-ahead", () => {
    expect(bestLane({ current: ["safe", "blocked", "safe"], next: ["blocked", "safe", "safe"] })).toBe(2);
    expect(bestLane({ current: ["caution", "blocked", "blocked"] })).toBe(0);
  });

  it("scores picks and builds completion payload", () => {
    expect(scorePick("safe", true)).toBe(15);
    expect(scorePick("safe", false)).toBe(10);
    expect(scorePick("caution", false)).toBe(5);
    expect(scorePick("blocked", false)).toBe(0);

    const t = (key: string, options?: Record<string, unknown>) =>
      options?.defaultValue ? String(options.defaultValue) : key;
    const payload = buildFastLaneCompletionPayload({
      score: 90,
      maxStreak: 6,
      totalRounds: 8,
      correctCount: 8,
      t,
    });

    expect(payload).toMatchObject({
      gameKey: "fast_lane",
      total: 120,
      accuracy: 100,
      firstTryClear: true,
      roundsCompleted: 8,
    });
    expect(payload.achievements).toContain("Signal Streak x5");
  });
});
