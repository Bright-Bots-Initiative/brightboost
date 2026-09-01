import { describe, expect, it } from "vitest";
import {
  arrow,
  buildQualifyTuneRaceCompletionPayload,
  calculateQualifyTuneRaceScore,
  laneX,
  MAX_CLEAN_SMOOTHNESS,
  minCleanLaneChanges,
  OBSTACLES,
  smoothLabel,
  START_LANE,
  timeLabel,
} from "../QualifyTuneRaceGame";

describe("Qualify, Tune, Race helpers", () => {
  it("scores compare results", () => {
    const result = calculateQualifyTuneRaceScore(
      { time: 20, bumps: 4, smoothness: 55 },
      { time: 18, bumps: 2, smoothness: 70 },
      "one",
    );
    expect(result).toEqual({ score: 10, total: 10 });
  });

  it("exports deterministic label helpers", () => {
    expect(laneX(0)).toBeLessThan(laneX(2));
    expect(timeLabel(14)).toBe("Fast");
    expect(smoothLabel(80)).toBe("Smooth");
    expect(arrow(10, 8)).toBe("⬇️");
  });

  it("builds completion payload", () => {
    const payload = buildQualifyTuneRaceCompletionPayload({
      run1: { time: 20, bumps: 4, smoothness: 55 },
      run2: { time: 19, bumps: 3, smoothness: 65 },
      exitAnswer: "one",
      upgrade: "grip",
    });

    expect(payload).toMatchObject({
      gameKey: "qualify_tune_race",
      total: 10,
      roundsCompleted: 2,
      gameSpecific: { upgrade: "grip", exitCorrect: true },
    });
  });
});

// Mirrors GameShell's accuracy + default star thresholds
// (`starThresholds = [30, 60, 90]` in shared/GameShell.tsx); the game does not
// override them, so score/total is what the child actually sees as % and stars.
const STAR_THRESHOLDS = [30, 60, 90];
function accuracyFor(score: number, total: number): number {
  return Math.round(Math.min(100, (score / total) * 100));
}
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

// A run at the ceiling of all three compared metrics: Fast band time
// (`timeLabel` < 15s — reachable on high-refresh displays today; per-frame
// time normalization is #806), no bumps, and smoothness at the track's true
// ceiling — NOT 100, which the obstacle table makes unreachable (#737 review).
const PERFECT_RUN = { time: 14, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS };

describe("Qualify, Tune, Race — improvement bonus at the ceiling (#737)", () => {
  it("awards full credit when both runs are already perfect", () => {
    const { score, total } = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      { ...PERFECT_RUN },
      "one",
    );

    expect({ score, total }).toEqual({ score: 10, total: 10 });
    expect(accuracyFor(score, total)).toBe(100);
    expect(starsFor(score, total)).toBe(3);
  });

  it("awards the bumps point when a clean run stays clean", () => {
    // 3 base + 2 bumps held at zero + 2 exit ticket
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 0, smoothness: 70 },
        { time: 20, bumps: 0, smoothness: 70 },
        "one",
      ).score,
    ).toBe(7);
  });

  it("awards the smoothness point when the reachable ceiling is held", () => {
    // A flawless line both laps: 0 bumps, minimum lane changes. The pre-repair
    // suite asserted this with { bumps: 3, smoothness: 100 } — a state the
    // engine cannot produce (any bump caps smoothness at 85, below the
    // ceiling). 3 base + 2 bumps held + 1 smoothness held + 2 exit ticket.
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS },
        { time: 20, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS },
        "one",
      ).score,
    ).toBe(8);
  });

  it("does not award the smoothness point for repeating a below-ceiling result", () => {
    // One avoidable wobble below the ceiling, repeated identically: the
    // incentive to trim it stays. 3 base + 2 bumps held + 2 exit ticket.
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS - 2 },
        { time: 20, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS - 2 },
        "one",
      ).score,
    ).toBe(7);
  });

  it("gives a sandbagged qualifying lap no edge over flawless-both laps", () => {
    // The review's blocking inversion: wobble twice on purpose in run 1
    // (ceiling − 4), tidy up in run 2, and strict improvement fires. A student
    // flawless in BOTH laps must never score below that student.
    const flawless = calculateQualifyTuneRaceScore(
      { time: 21.3, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS },
      { time: 21.3, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS },
      "one",
    );
    const sandbagged = calculateQualifyTuneRaceScore(
      { time: 21.3, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS - 4 },
      { time: 21.3, bumps: 0, smoothness: MAX_CLEAN_SMOOTHNESS },
      "one",
    );
    expect(flawless.score).toBeGreaterThanOrEqual(sandbagged.score);
  });

  it("awards the time point when a Fast run stays inside the Fast band", () => {
    // 3 base + 2 time held in the Fast band + 2 exit ticket
    expect(
      calculateQualifyTuneRaceScore(
        { time: 12, bumps: 2, smoothness: 60 },
        { time: 13, bumps: 2, smoothness: 60 },
        "one",
      ).score,
    ).toBe(7);
  });

  it("does not award bonuses for repeating a non-ceiling result", () => {
    // 3 base + 2 exit ticket only — nothing improved and nothing was maxed out
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 3, smoothness: 60 },
        { time: 20, bumps: 3, smoothness: 60 },
        "one",
      ).score,
    ).toBe(5);
  });

  it("does not award bonuses when a ceiling result gets worse", () => {
    // Bumps appear, the Fast band is lost, smoothness drops: 3 base + 2 exit
    expect(
      calculateQualifyTuneRaceScore(
        PERFECT_RUN,
        { time: 16, bumps: 2, smoothness: 80 },
        null,
      ).score,
    ).toBe(3);
    expect(
      calculateQualifyTuneRaceScore(
        PERFECT_RUN,
        { time: 16, bumps: 2, smoothness: 80 },
        "one",
      ).score,
    ).toBe(5);
  });

  it("still rewards a genuine improvement from a sloppy first run", () => {
    expect(
      calculateQualifyTuneRaceScore(
        { time: 20, bumps: 4, smoothness: 55 },
        { time: 18, bumps: 2, smoothness: 70 },
        "one",
      ).score,
    ).toBe(10);
  });

  it("never scores a perfect pair below a sloppy run that improved", () => {
    const perfect = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      { ...PERFECT_RUN },
      "one",
    );
    const improved = calculateQualifyTuneRaceScore(
      { time: 20, bumps: 4, smoothness: 55 },
      { time: 18, bumps: 2, smoothness: 70 },
      "one",
    );

    expect(perfect.score).toBeGreaterThanOrEqual(improved.score);
  });
});

describe("smoothness ceiling derivation (#737 review / #806 item 2)", () => {
  it("matches an independent brute force over every dodging line", () => {
    // Enumerate every lane assignment that dodges each obstacle; steer()
    // moves one lane per input, so a → b costs |a − b| transitions. This is a
    // cross-check, not a mirror: it shares no code with minCleanLaneChanges.
    let best = Number.POSITIVE_INFINITY;
    const walk = (index: number, lane: number, cost: number) => {
      if (cost >= best) return;
      if (index === OBSTACLES.length) {
        best = cost;
        return;
      }
      for (const next of [0, 1, 2]) {
        if (next === OBSTACLES[index].lane) continue;
        walk(index + 1, next, cost + Math.abs(next - lane));
      }
    };
    walk(0, START_LANE, 0);

    expect(minCleanLaneChanges(OBSTACLES, START_LANE)).toBe(best);
    expect(MAX_CLEAN_SMOOTHNESS).toBe(100 - 2 * best);
  });

  it("pins today's track ceiling — update deliberately when OBSTACLES change", () => {
    // 7 forced lane changes from the lane-1 start → 100 − 14 = 86. If this
    // fails, the track changed: re-tune the ceiling-dependent fixtures and
    // compare copy consciously rather than editing the number blindly.
    expect(minCleanLaneChanges(OBSTACLES, START_LANE)).toBe(7);
    expect(MAX_CLEAN_SMOOTHNESS).toBe(86);
  });

  it("keeps the held-smoothness clause exclusive to clean runs", () => {
    // A single bump costs 15, and 100 − 15 = 85 sits below the ceiling, so no
    // run with bumps can claim held-ceiling smoothness (the pre-repair suite
    // asserted exactly that impossible state).
    expect(100 - 15).toBeLessThan(MAX_CLEAN_SMOOTHNESS);
  });
});
