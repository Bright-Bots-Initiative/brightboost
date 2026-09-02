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
import {
  BUMP_SLOW_FACTOR,
  BUMP_SLOW_SECONDS,
  BUMP_SMOOTHNESS_PENALTY,
  BUMP_TIME_COST_SECONDS,
  BUMP_ZONE,
  cleanLapSeconds,
  SCROLL_UNITS_PER_SECOND,
  SPEED_MULTIPLIER,
  upgradeTuning,
  type RunResult,
  type Upgrade,
} from "../qualifyTuneRaceEngine";

/**
 * Build a run the engine can actually emit. Bumps and lane changes are the only
 * two things a student controls, and every metric falls out of them:
 * `time = clean lap for this car + BUMP_TIME_COST_SECONDS per cone`,
 * `smoothness = 100 − 15·cones − penalty·lane changes`. Fixtures are written
 * this way on purpose — the pre-repair suite carried states the engine cannot
 * produce (`{bumps: 3, smoothness: 100}`, a 14 s un-upgraded lap), which is how
 * a dead scoring clause survived review twice (#804 audit).
 */
function lap(
  upgrade: Upgrade | null,
  bumps: number,
  laneChanges: number,
): RunResult {
  return {
    time:
      Math.round(
        (cleanLapSeconds(upgrade) + bumps * BUMP_TIME_COST_SECONDS) * 10,
      ) / 10,
    bumps,
    smoothness: Math.max(
      0,
      100 -
        bumps * BUMP_SMOOTHNESS_PENALTY -
        laneChanges * upgradeTuning(upgrade).transitionPenalty,
    ),
  };
}

/** The fewest lane changes that dodge this track — a flawless line's cost. */
const CLEAN_CHANGES = minCleanLaneChanges(OBSTACLES, START_LANE);

describe("Qualify, Tune, Race helpers", () => {
  it("scores compare results", () => {
    const result = calculateQualifyTuneRaceScore(
      lap(null, 4, 4),
      lap("grip", 2, 6),
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
      run1: lap(null, 4, 4),
      run2: lap("grip", 3, 5),
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

// A flawless qualifying lap: no cones, the minimum lane changes the obstacle
// table allows, and therefore this car's fastest possible time. 21.3 s / 0 / 86
// on every display since #806 — the old fixture's 14 s was reachable only on a
// ≥85.4 Hz panel, and its smoothness of 100 was reachable nowhere.
const PERFECT_RUN = lap(null, 0, CLEAN_CHANGES);

describe("Qualify, Tune, Race — improvement bonus at the ceiling (#737)", () => {
  it("awards full credit when both runs are already perfect", () => {
    const { score, total } = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      lap("grip", 0, CLEAN_CHANGES),
      "one",
    );

    expect({ score, total }).toEqual({ score: 10, total: 10 });
    expect(accuracyFor(score, total)).toBe(100);
    expect(starsFor(score, total)).toBe(3);
  });

  it("awards the bumps and time points when a clean run stays clean", () => {
    // Cone-free twice, but weaving: 3 base + 2 bumps held at zero + 2 time held
    // at this car's floor + 2 exit ticket = 9, and the smoothness point is
    // still on the table. Pre-#806 this pair scored 7 because the time point
    // was gated on the "Fast" display band, which an un-upgraded lap could only
    // enter on a ≥85.4 Hz display — so it was 7 in a classroom and 9 on a
    // gaming laptop for the same driving.
    expect(
      calculateQualifyTuneRaceScore(lap(null, 0, 15), lap(null, 0, 15), "one")
        .score,
    ).toBe(9);
  });

  it("awards the smoothness point only at the reachable ceiling", () => {
    // A flawless line both laps reaches 86 — NOT 100, which the obstacle table
    // makes unreachable. One avoidable wobble below the ceiling, repeated
    // identically, still earns nothing for smoothness, so the incentive to trim
    // it stays. The pair of assertions isolates the one point between them.
    const atCeiling = lap(null, 0, CLEAN_CHANGES);
    const belowCeiling = lap(null, 0, CLEAN_CHANGES + 1);
    expect(atCeiling.smoothness).toBe(MAX_CLEAN_SMOOTHNESS);
    expect(
      calculateQualifyTuneRaceScore(atCeiling, atCeiling, "one").score,
    ).toBe(10);
    expect(
      calculateQualifyTuneRaceScore(belowCeiling, belowCeiling, "one").score,
    ).toBe(9);
  });

  it("gives a sandbagged qualifying lap no edge over flawless-both laps", () => {
    // The review's blocking inversion: wobble twice on purpose in run 1
    // (ceiling − 4), tidy up in run 2, and strict improvement fires. A student
    // flawless in BOTH laps must never score below that student.
    const flawless = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      lap(null, 0, CLEAN_CHANGES),
      "one",
    );
    const sandbagged = calculateQualifyTuneRaceScore(
      lap(null, 0, CLEAN_CHANGES + 2),
      lap(null, 0, CLEAN_CHANGES),
      "one",
    );
    expect(flawless.score).toBeGreaterThanOrEqual(sandbagged.score);
  });

  it("no longer reads the display band for the time point", () => {
    // The pre-#806 clause was `timeLabel(run1) === "Fast" && timeLabel(run2)
    // === "Fast"`, and this exact fixture — two laps inside the Fast band, two
    // cones each — used to buy 2 points. It buys nothing now: the pair
    // improved nothing and neither lap was at its car's floor.
    // (These 12s/13s laps are ENGINE-UNREACHABLE ON PURPOSE — no car can
    // finish under 14.7s — kept verbatim as the regression witness for the
    // old display-band clause, which awarded them the time point.)
    expect(timeLabel(12)).toBe("Fast");
    expect(timeLabel(13)).toBe("Fast");
    expect(
      calculateQualifyTuneRaceScore(
        { time: 12, bumps: 2, smoothness: 60 },
        { time: 13, bumps: 2, smoothness: 60 },
        "one",
      ).score,
    ).toBe(5);

    // The clause was also unreachable by construction after #806: a qualifying
    // lap is never upgraded, so it cannot finish inside the Fast band at all.
    const qualifyingFloor = Math.round(cleanLapSeconds(null) * 10) / 10;
    expect(timeLabel(qualifyingFloor)).not.toBe("Fast");
  });

  it("does not award bonuses for repeating a non-ceiling result", () => {
    // 3 base + 2 exit ticket only — nothing improved and nothing was maxed out
    expect(
      calculateQualifyTuneRaceScore(lap(null, 3, 4), lap(null, 3, 4), "one")
        .score,
    ).toBe(5);
  });

  it("does not award bonuses when a ceiling result gets worse", () => {
    // Cones appear, the lap slows, smoothness drops: 3 base + 2 exit
    const worse = lap("grip", 2, 9);
    expect(worse.bumps).toBeGreaterThan(PERFECT_RUN.bumps);
    expect(worse.time).toBeGreaterThan(PERFECT_RUN.time);
    expect(worse.smoothness).toBeLessThan(PERFECT_RUN.smoothness);
    expect(calculateQualifyTuneRaceScore(PERFECT_RUN, worse, null).score).toBe(
      3,
    );
    expect(calculateQualifyTuneRaceScore(PERFECT_RUN, worse, "one").score).toBe(
      5,
    );
  });

  it("still rewards a genuine improvement from a sloppy first run", () => {
    expect(
      calculateQualifyTuneRaceScore(lap(null, 4, 4), lap("grip", 2, 6), "one")
        .score,
    ).toBe(10);
  });

  it("never scores a perfect pair below a sloppy run that improved", () => {
    const perfect = calculateQualifyTuneRaceScore(
      PERFECT_RUN,
      lap("speed", 0, CLEAN_CHANGES),
      "one",
    );
    const improved = calculateQualifyTuneRaceScore(
      lap(null, 4, 4),
      lap("grip", 2, 6),
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

  it("scores literal ceiling-held pairs independently of the derivation", () => {
    // Literal values on purpose: every other behavioural fixture is built from
    // the derivation and would move with it, so a wrong derived ceiling would
    // only be caught by the pin test. 86/86 holds the ceiling (10); 84/84 is
    // one wobble below it — clean un-upgraded smoothness is 100 − 2·changes,
    // always even, so 84 is the nearest reachable below-ceiling state — and
    // loses exactly the smoothness point (9).
    expect(
      calculateQualifyTuneRaceScore(
        { time: 21.3, bumps: 0, smoothness: 86 },
        { time: 21.3, bumps: 0, smoothness: 86 },
        "one",
      ).score,
    ).toBe(10);
    expect(
      calculateQualifyTuneRaceScore(
        { time: 21.3, bumps: 0, smoothness: 84 },
        { time: 21.3, bumps: 0, smoothness: 84 },
        "one",
      ).score,
    ).toBe(9);
  });

  it("holds the layout invariants the lane-change DP relies on", () => {
    // minCleanLaneChanges treats OBSTACLES as sequential gates: rows must be
    // strictly y-ordered with disjoint pass windows so the optimal line is
    // executable between windows. A future overlapping or unclearable row
    // would otherwise silently corrupt the ceiling (an unclearable table
    // would drive it to -Infinity and make the held clause free for
    // everyone). The gap floor is DERIVED (#833 review NB-2): the bump
    // slowdown RESETS rather than extends, so "every cone costs exactly
    // 0.5s" — the invariant heldFloorTime and every lap() fixture rest on —
    // additionally needs consecutive cones farther apart than one slowdown's
    // ground cover in the fastest car.
    const slowdownCoverUnits =
      BUMP_SLOW_SECONDS *
      SCROLL_UNITS_PER_SECOND *
      SPEED_MULTIPLIER *
      BUMP_SLOW_FACTOR;
    const minGap = Math.max(2 * BUMP_ZONE, slowdownCoverUnits);
    for (let i = 1; i < OBSTACLES.length; i++) {
      expect(OBSTACLES[i].y - OBSTACLES[i - 1].y).toBeGreaterThan(minGap);
    }
    expect(Number.isFinite(MAX_CLEAN_SMOOTHNESS)).toBe(true);
    expect(MAX_CLEAN_SMOOTHNESS).toBeGreaterThan(0);
    expect(MAX_CLEAN_SMOOTHNESS).toBeLessThanOrEqual(100);
  });

  it("keeps the held-smoothness clause exclusive to clean runs", () => {
    // A single bump costs 15, and 100 − 15 = 85 sits below the ceiling, so no
    // run with bumps can claim held-ceiling smoothness (the pre-repair suite
    // asserted exactly that impossible state).
    expect(100 - BUMP_SMOOTHNESS_PENALTY).toBeLessThan(MAX_CLEAN_SMOOTHNESS);
  });
});
