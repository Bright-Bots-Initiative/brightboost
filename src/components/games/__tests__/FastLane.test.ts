import { describe, expect, it } from "vitest";
import {
  bestLane,
  bestLanes,
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
    expect(
      bestLane({
        current: ["safe", "blocked", "safe"],
        next: ["blocked", "safe", "safe"],
      }),
    ).toBe(2);
    expect(bestLane({ current: ["caution", "blocked", "blocked"] })).toBe(0);
  });

  it("returns every equally optimal lane, so tied picks earn equal credit", () => {
    // All three lanes safe now and next: no lane is better than another.
    const allTied = bestLanes({
      current: ["safe", "safe", "safe"],
      next: ["safe", "safe", "safe"],
    });
    expect(allTied).toEqual([0, 1, 2]);
    expect(
      [0, 1, 2].map((i) => scorePick("safe", allTied.includes(i))),
    ).toEqual([15, 15, 15]);

    // Two lanes safe now and next.
    const twoTied = bestLanes({
      current: ["safe", "blocked", "safe"],
      next: ["safe", "caution", "safe"],
    });
    expect(twoTied).toEqual([0, 2]);
    expect([0, 2].map((i) => scorePick("safe", twoTied.includes(i)))).toEqual([
      15, 15,
    ]);

    // Tie inside the safe-now tier (neither next lane is blocked).
    expect(
      bestLanes({
        current: ["safe", "safe", "blocked"],
        next: ["caution", "caution", "safe"],
      }),
    ).toEqual([0, 1]);

    // Phases without look-ahead (practice, signals, some challenge rounds).
    const noLookAhead = bestLanes({ current: ["safe", "safe", "blocked"] });
    expect(noLookAhead).toEqual([0, 1]);
    expect(
      [0, 1].map((i) => scorePick("safe", noLookAhead.includes(i))),
    ).toEqual([15, 15]);
  });

  it("still ranks a genuinely worse safe lane below the best lane", () => {
    const optimal = bestLanes({
      current: ["safe", "blocked", "safe"],
      next: ["safe", "blocked", "blocked"],
    });
    expect(optimal).toEqual([0]);
    expect(scorePick("safe", optimal.includes(2))).toBe(10);
  });

  it("keeps bestLane as the first equally optimal lane", () => {
    const states: Parameters<typeof bestLanes>[0][] = [
      { current: ["safe", "safe", "safe"], next: ["safe", "safe", "safe"] },
      {
        current: ["safe", "blocked", "safe"],
        next: ["blocked", "safe", "safe"],
      },
      { current: ["caution", "blocked", "blocked"] },
    ];
    for (const state of states) {
      expect(bestLane(state)).toBe(bestLanes(state)[0]);
    }
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
