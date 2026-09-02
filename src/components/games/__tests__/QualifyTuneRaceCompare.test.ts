import { describe, expect, it } from "vitest";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import vi from "@/locales/vi/common.json";
import zhCN from "@/locales/zh-CN/common.json";
import {
  BAND_LABELS,
  asksWhatGotBetter,
  calculateQualifyTuneRaceScore,
  compareRowState,
  metricCredit,
  minCleanLaneChanges,
  OBSTACLES,
  START_LANE,
  type CompareRowState,
} from "../QualifyTuneRaceGame";
import {
  BUMP_SMOOTHNESS_PENALTY,
  BUMP_TIME_COST_SECONDS,
  cleanLapSeconds,
  MAX_CLEAN_SMOOTHNESS,
  upgradeTuning,
  type RunResult,
  type Upgrade,
} from "../qualifyTuneRaceEngine";

/**
 * Same fixture builder as QualifyTuneRace.test.ts: only engine-reachable states.
 * `time = this car's clean lap + BUMP_TIME_COST_SECONDS per cone`,
 * `smoothness = 100 − 15·cones − penalty·lane changes`.
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

const CLEAN_CHANGES = minCleanLaneChanges(OBSTACLES, START_LANE);
const UPGRADES = ["grip", "speed", "steering"] as const;
/** Enough lane-change counts to cross the smoothness ceiling in both cars. */
const LANE_CHANGES = [
  CLEAN_CHANGES,
  CLEAN_CHANGES + 1,
  CLEAN_CHANGES + 2,
  15,
  24,
];
const BUMP_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function statesFor(upgrade: Upgrade | null): RunResult[] {
  const out: RunResult[] = [];
  for (const bumps of BUMP_COUNTS) {
    for (const changes of LANE_CHANGES) out.push(lap(upgrade, bumps, changes));
  }
  return out;
}

/**
 * Every (qualifying lap, race lap) pair the grid covers. The qualifying lap is
 * never upgraded — the engine drives it in the stock car — so run 1 is always
 * `null` and run 2 carries the student's one change.
 */
function* pairs() {
  const qualifying = statesFor(null);
  for (const upgrade of UPGRADES) {
    for (const run1 of qualifying) {
      for (const run2 of statesFor(upgrade)) yield { upgrade, run1, run2 };
    }
  }
}

/** How many points a row in this state claims the student earned. */
const ROW_WEIGHT = { bumps: 2, time: 2, smoothness: 1 } as const;
const claims = (state: CompareRowState) =>
  state === "improved" || state === "held";

function rowStates(run1: RunResult, run2: RunResult) {
  const credit = metricCredit(run1, run2);
  return {
    bumps: compareRowState(credit.bumps, run1.bumps, run2.bumps),
    time: compareRowState(credit.time, run1.time, run2.time),
    smoothness: compareRowState(
      credit.smoothness,
      run1.smoothness,
      run2.smoothness,
    ),
  };
}

/** What the three rows, read as a student reads them, add up to. */
function pointsClaimedByRows(run1: RunResult, run2: RunResult) {
  const states = rowStates(run1, run2);
  return (
    (claims(states.bumps) ? ROW_WEIGHT.bumps : 0) +
    (claims(states.time) ? ROW_WEIGHT.time : 0) +
    (claims(states.smoothness) ? ROW_WEIGHT.smoothness : 0)
  );
}

/**
 * What the scorer actually awarded for the three metrics, read only from its
 * PUBLIC output: with no exit answer the score is `3 + 2·bumps + 2·time +
 * 1·smoothness`, so subtracting the base leaves the metric points. Deriving it
 * this way is the point — the property below never asks the scorer's internals
 * whether it agrees with itself.
 */
function pointsAwardedByScorer(run1: RunResult, run2: RunResult) {
  return calculateQualifyTuneRaceScore(run1, run2, null).score - 3;
}

// ═══════════════════════════════════════════════════════════════════════════
describe("compare rows tell the truth the scorer told (#805)", () => {
  it("claims exactly the points the scorer awarded, on every reachable pair", () => {
    let checked = 0;
    for (const { upgrade, run1, run2 } of pairs()) {
      const claimed = pointsClaimedByRows(run1, run2);
      const awarded = pointsAwardedByScorer(run1, run2);
      if (claimed !== awarded) {
        throw new Error(
          `rows claim ${claimed} but scorer awarded ${awarded} for ` +
            `${upgrade}: run1=${JSON.stringify(run1)} run2=${JSON.stringify(run2)}`,
        );
      }
      checked += 1;
    }
    // Guard the guard with LITERAL counts (#844 review NB-3): deriving both
    // sides from the same generators detected an empty grid but not a
    // collapsed one — shrinking LANE_CHANGES to a single value passed all 18
    // tests while dropping every below-ceiling smoothness state.
    expect(statesFor(null)).toHaveLength(55);
    expect(checked).toBe(9075);
  });

  it("never renders a held row over a number that got worse", () => {
    // #844 review NB-9: compareRowState trusts the credit, so a future ceiling
    // clause that is not co-extensive with "identical or better" would show a
    // green ⭐ beside a ⬇️ arrow. Reachable frontier today: zero such cases —
    // pin that so the assumption breaks loudly instead of silently.
    for (const { run1, run2 } of pairs()) {
      const states = rowStates(run1, run2);
      if (states.bumps === "held") {
        expect(run2.bumps).toBeLessThanOrEqual(run1.bumps);
      }
      if (states.time === "held") {
        expect(run2.time).toBeLessThanOrEqual(run1.time);
      }
      if (states.smoothness === "held") {
        expect(run2.smoothness).toBeGreaterThanOrEqual(run1.smoothness);
      }
    }
  });

  it("swaps the heading only when everything earned was held (#844 review NB-1)", () => {
    // All held → the screen must not ask "What got better?" (nothing did).
    expect(asksWhatGotBetter(["held", "held", "held"])).toBe(false);
    expect(asksWhatGotBetter(["held", "none", "none"])).toBe(false);
    // Anything improved → the original question is fair, even beside helds.
    expect(asksWhatGotBetter(["improved", "held", "held"])).toBe(true);
    expect(asksWhatGotBetter(["improved", "none", "none"])).toBe(true);
    // Nothing earned at all → keep the original question; the amber rows
    // answer it truthfully ("nothing"), which is the incentive to retry.
    expect(asksWhatGotBetter(["none", "none", "none"])).toBe(true);
  });

  it("keeps the row state a pure re-spelling of the credit", () => {
    // `same` and `worse` are two ways of writing "no credit" and must never
    // appear for a metric that scored; `improved`/`held` must never appear for
    // one that did not. This is the contract the row colour depends on.
    for (const { run1, run2 } of pairs()) {
      const credit = metricCredit(run1, run2);
      const states = rowStates(run1, run2);
      for (const metric of ["bumps", "time", "smoothness"] as const) {
        expect(claims(states[metric])).toBe(credit[metric] !== "none");
        if (credit[metric] !== "none") {
          expect(states[metric]).toBe(credit[metric]);
        }
      }
    }
  });

  it("shows the flawless-Grip student three held rows, not three grey ones", () => {
    // The sharpened #805 defect, named. After #833 a flawless student who picks
    // Grip Tires drives an identical second lap — 21.3 s / 0 bumps / 86 — and
    // scores 10/10 · 3★. Every metric is held at its ceiling; none improved.
    const qualifying = lap(null, 0, CLEAN_CHANGES);
    const race = lap("grip", 0, CLEAN_CHANGES);
    expect(qualifying).toEqual({ time: 21.3, bumps: 0, smoothness: 86 });
    expect(race).toEqual(qualifying);
    expect(race.smoothness).toBe(MAX_CLEAN_SMOOTHNESS);
    expect(calculateQualifyTuneRaceScore(qualifying, race, "one").score).toBe(
      10,
    );
    expect(rowStates(qualifying, race)).toEqual({
      bumps: "held",
      time: "held",
      smoothness: "held",
    });
  });

  it("still says 'improved' when the number visibly moved", () => {
    // Speed Boost's cone-free lap is BOTH strictly faster and at its floor, so
    // both clauses fire. The row must report the one the student can see.
    const qualifying = lap(null, 0, CLEAN_CHANGES);
    const race = lap("speed", 0, CLEAN_CHANGES);
    expect(race.time).toBeLessThan(qualifying.time);
    expect(rowStates(qualifying, race).time).toBe("improved");

    // Steady Steering clears 86 outright (93), which is an improvement too.
    const steering = lap("steering", 0, CLEAN_CHANGES);
    expect(steering.smoothness).toBeGreaterThan(MAX_CLEAN_SMOOTHNESS);
    expect(rowStates(qualifying, steering).smoothness).toBe("improved");
  });

  it("still greys a repeat below the ceiling and reddens a slide", () => {
    const sloppy = lap(null, 3, 4);
    expect(rowStates(sloppy, lap(null, 3, 4))).toEqual({
      bumps: "same",
      time: "same",
      smoothness: "same",
    });
    expect(rowStates(lap(null, 0, CLEAN_CHANGES), lap("grip", 2, 9))).toEqual({
      bumps: "worse",
      time: "worse",
      smoothness: "worse",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("the pre-#805 row predicate is the thing that was wrong", () => {
  /**
   * Verbatim transcription of the compare-phase row predicate on 82a0ae5
   * (QualifyTuneRaceGame.tsx:636–637): `const better = m.lb ? m.v2 < m.v1 :
   * m.v2 > m.v1`. It knows nothing about ceilings, which is the whole defect.
   */
  const legacyRowEarned = (lowerIsBetter: boolean, v1: number, v2: number) =>
    lowerIsBetter ? v2 < v1 : v2 > v1;

  const legacyPointsClaimed = (run1: RunResult, run2: RunResult) =>
    (legacyRowEarned(true, run1.bumps, run2.bumps) ? ROW_WEIGHT.bumps : 0) +
    (legacyRowEarned(true, run1.time, run2.time) ? ROW_WEIGHT.time : 0) +
    (legacyRowEarned(false, run1.smoothness, run2.smoothness)
      ? ROW_WEIGHT.smoothness
      : 0);

  it("under-reports the score it was rendered beside — the executed RED", () => {
    // Measured on 82a0ae5 before this fix. Each line is a real screen a
    // flawless student sees: the rows add up to less than the score does.
    const qualifying = lap(null, 0, CLEAN_CHANGES);
    const witnesses: [string, RunResult, number, number][] = [
      ["grip, flawless both", lap("grip", 0, CLEAN_CHANGES), 0, 5],
      ["speed, flawless both", lap("speed", 0, CLEAN_CHANGES), 2, 5],
      ["steering, flawless both", lap("steering", 0, CLEAN_CHANGES), 1, 5],
    ];
    for (const [name, race, legacyPoints, realPoints] of witnesses) {
      expect(`${name}: ${legacyPointsClaimed(qualifying, race)}`).toBe(
        `${name}: ${legacyPoints}`,
      );
      expect(`${name}: ${pointsAwardedByScorer(qualifying, race)}`).toBe(
        `${name}: ${realPoints}`,
      );
      // …and the repaired rows now agree with the score.
      expect(pointsClaimedByRows(qualifying, race)).toBe(realPoints);
    }

    // Cone-free but weaving, twice: no ceiling smoothness, but bumps and time
    // are both held — 0 points on screen against 4 on the scoreboard.
    const weaving1 = lap(null, 0, 15);
    const weaving2 = lap(null, 0, 15);
    expect(legacyPointsClaimed(weaving1, weaving2)).toBe(0);
    expect(pointsAwardedByScorer(weaving1, weaving2)).toBe(4);
    expect(pointsClaimedByRows(weaving1, weaving2)).toBe(4);
  });

  it("was right whenever a number actually moved — only ceilings were lost", () => {
    // The fix is additive, not a rewrite: wherever the old predicate said
    // "better", the new one still does. It only ever under-reported.
    for (const { run1, run2 } of pairs()) {
      const legacy = legacyPointsClaimed(run1, run2);
      const now = pointsClaimedByRows(run1, run2);
      expect(now).toBeGreaterThanOrEqual(legacy);
      const states = rowStates(run1, run2);
      expect(legacyRowEarned(true, run1.bumps, run2.bumps)).toBe(
        states.bumps === "improved",
      );
      expect(legacyRowEarned(true, run1.time, run2.time)).toBe(
        states.time === "improved",
      );
      expect(legacyRowEarned(false, run1.smoothness, run2.smoothness)).toBe(
        states.smoothness === "improved",
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("#805 changes no score anywhere", () => {
  /**
   * The scorer body exactly as it stood on 82a0ae5 (the merged #833 behaviour),
   * transcribed rather than imported. If the refactor into `metricCredit`
   * shifted a single point in a single reachable state, this goes red.
   */
  function mergedBehaviourScore(
    run1: RunResult | null,
    run2: RunResult | null,
    exitAnswer: string | null,
  ) {
    if (!run1 || !run2) return { score: 0, total: 10 };
    const heldPerfectBumps = run1.bumps === 0 && run2.bumps === 0;
    const heldFloorTime = heldPerfectBumps;
    const heldMaxSmoothness =
      run1.smoothness >= MAX_CLEAN_SMOOTHNESS &&
      run2.smoothness >= MAX_CLEAN_SMOOTHNESS;
    let s = 3;
    if (run2.bumps < run1.bumps || heldPerfectBumps) s += 2;
    if (run2.time < run1.time || heldFloorTime) s += 2;
    if (run2.smoothness > run1.smoothness || heldMaxSmoothness) s += 1;
    if (exitAnswer === "one") s += 2;
    return { score: Math.min(s, 10), total: 10 };
  }

  it("returns byte-identical results across the whole reachable grid", () => {
    for (const { run1, run2 } of pairs()) {
      for (const exitAnswer of ["one", "two", "all", null]) {
        expect(calculateQualifyTuneRaceScore(run1, run2, exitAnswer)).toEqual(
          mergedBehaviourScore(run1, run2, exitAnswer),
        );
      }
    }
  });

  it("keeps the null guard and the pinned headline values", () => {
    expect(calculateQualifyTuneRaceScore(null, lap(null, 0, 7), "one")).toEqual(
      {
        score: 0,
        total: 10,
      },
    );
    expect(calculateQualifyTuneRaceScore(lap(null, 0, 7), null, "one")).toEqual(
      {
        score: 0,
        total: 10,
      },
    );
    // Flawless-both is 10/10 under every upgrade (#833's headline result).
    for (const upgrade of UPGRADES) {
      expect(
        calculateQualifyTuneRaceScore(
          lap(null, 0, CLEAN_CHANGES),
          lap(upgrade, 0, CLEAN_CHANGES),
          "one",
        ),
      ).toEqual({ score: 10, total: 10 });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("#805 copy is localized, not hardcoded", () => {
  const LOCALES = { en, es, vi, "zh-CN": zhCN } as const;
  /** Every key this fix introduced, including the band table's own keys. */
  const NEW_KEYS = [
    "games.qualifyTuneRace.heldBest",
    "games.qualifyTuneRace.whatStayedBest",
    ...Object.values(BAND_LABELS).map((band) => band.key),
  ];

  function getAtPath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== "object") {
        return undefined;
      }
      return (acc as Record<string, unknown>)[key];
    }, obj);
  }

  it("covers every band, so no display band can render as a raw id", () => {
    // If a band is added to timeBand()/smoothBand() without a label, this and
    // the locale sweep below both go red before it reaches a classroom.
    expect(NEW_KEYS).toHaveLength(7);
    expect(Object.keys(BAND_LABELS).sort()).toEqual([
      "fast",
      "medium",
      "rough",
      "slow",
      "smooth",
    ]);
  });

  it.each(NEW_KEYS)("defines %s in en, es, vi and zh-CN", (key) => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      const value = getAtPath(bundle, key);
      expect(value, `missing ${locale} ${key}`).toBeTypeOf("string");
      expect(
        (value as string).trim().length,
        `empty ${locale} ${key}`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps the band table's English fallbacks equal to en/common.json", () => {
    // The `defaultValue` a `t()` call falls back to must not drift from the
    // shipped English, or a missing-bundle render would silently change copy.
    for (const band of Object.values(BAND_LABELS)) {
      expect(getAtPath(en, band.key)).toBe(band.en);
    }
  });
});
