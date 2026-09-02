import { describe, expect, it } from "vitest";
import {
  buildMoveMeasureCompletionPayload,
  improvementCredit,
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

// Mirrors GameShell's default star thresholds (`starThresholds = [30, 60, 90]`
// in shared/GameShell.tsx); MoveMeasureGame does not override them.
const STAR_THRESHOLDS = [30, 60, 90];
function starsFor(score: number, total: number): number {
  const pct = Math.min(100, (score / total) * 100);
  return pct >= STAR_THRESHOLDS[2]
    ? 3
    : pct >= STAR_THRESHOLDS[1]
      ? 2
      : pct >= STAR_THRESHOLDS[0]
        ? 1
        : 0;
}

describe("Move, Measure & Improve — improvement bonus at the ceiling (#734)", () => {
  it("awards the bonus when an already-perfect event is held at the ceiling", () => {
    const payload = buildMoveMeasureCompletionPayload({
      scores: { dash: 10, jump: 10, toss: 10 },
      impEvent: "dash",
      impScore: 10,
      exitAns: "correct",
    });

    expect(payload.score).toBe(40);
    expect(payload.accuracy).toBe(100);
    expect(starsFor(payload.score, payload.total)).toBe(3);
  });

  it("withholds the bonus when a perfect event gets worse on the retry", () => {
    const payload = buildMoveMeasureCompletionPayload({
      scores: { dash: 10, jump: 10, toss: 10 },
      impEvent: "dash",
      impScore: 8,
      exitAns: "correct",
    });

    expect(payload.score).toBe(35);
  });

  it("still awards the bonus for a genuine improvement", () => {
    const payload = buildMoveMeasureCompletionPayload({
      scores: { dash: 9, jump: 9, toss: 9 },
      impEvent: "dash",
      impScore: 10,
      exitAns: "correct",
    });

    expect(payload.score).toBe(37);
  });

  it("does not award the bonus for repeating a non-perfect score", () => {
    const payload = buildMoveMeasureCompletionPayload({
      scores: { dash: 9, jump: 9, toss: 9 },
      impEvent: "dash",
      impScore: 9,
      exitAns: "correct",
    });

    expect(payload.score).toBe(32);
  });

  it("never scores a perfect run below a near-perfect one", () => {
    const perfect = buildMoveMeasureCompletionPayload({
      scores: { dash: 10, jump: 10, toss: 10 },
      impEvent: "dash",
      impScore: 10,
      exitAns: "correct",
    });
    const nearPerfect = buildMoveMeasureCompletionPayload({
      scores: { dash: 9, jump: 9, toss: 9 },
      impEvent: "dash",
      impScore: 10,
      exitAns: "correct",
    });

    expect(perfect.score).toBeGreaterThanOrEqual(nearPerfect.score);
  });
});

describe("improvement credit — one predicate for scorer and screen (#803)", () => {
  it("classifies improved, held-at-ceiling, and none", () => {
    expect(improvementCredit(9, 10)).toBe("improved");
    expect(improvementCredit(0, 1)).toBe("improved");
    expect(improvementCredit(10, 10)).toBe("held_ceiling");
    expect(improvementCredit(9, 9)).toBe("none"); // repeating non-perfect
    expect(improvementCredit(10, 8)).toBe("none"); // perfect got worse
    expect(improvementCredit(8, 3)).toBe("none");
  });

  it("agrees with the scorer's bonus on every (before, after) pair", () => {
    // The #803 defect: the exit-ticket screen ran its own strict-improvement
    // predicate (`impScore > before`) while the scorer awarded held-at-ceiling
    // credit — a perfect 10 → 10 earned the +5 and was told to keep
    // practicing. Both surfaces now consume improvementCredit; this pins the
    // scorer side of that agreement across the whole reachable grid.
    for (let before = 0; before <= 10; before++) {
      for (let after = 0; after <= 10; after++) {
        const payload = buildMoveMeasureCompletionPayload({
          scores: { dash: before, jump: 0, toss: 0 },
          impEvent: "dash",
          impScore: after,
          exitAns: null,
        });
        const bonus = payload.score - (before + 0 + 0);
        const earned = improvementCredit(before, after) !== "none";
        expect(bonus, `before=${before} after=${after}`).toBe(earned ? 5 : 0);
      }
    }
  });
});
