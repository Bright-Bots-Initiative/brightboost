import { describe, expect, it } from "vitest";
import {
  BUMP_TIME_COST_SECONDS,
  BUMP_ZONE,
  CONE_VISIBLE_LEAD,
  cleanLapSeconds,
  createRaceEngine,
  FIXED_STEP_SECONDS,
  GRIP_BUMP_ZONE_FACTOR,
  MAX_CLEAN_SMOOTHNESS,
  MAX_FRAME_SECONDS,
  maxCleanSmoothness,
  minCleanLaneChanges,
  OBSTACLES,
  SCROLL_UNITS_PER_SECOND,
  SIMULATION_HZ,
  SPEED_MULTIPLIER,
  START_LANE,
  STEERING_TRANSITION_PENALTY,
  TRACK_LENGTH,
  upgradeTuning,
  type RaceEngine,
  type RunResult,
  type Upgrade,
} from "../qualifyTuneRaceEngine";
import { calculateQualifyTuneRaceScore } from "../QualifyTuneRaceGame";

// ═══════════════════════════════════════════════════════════════════════════
// Deterministic driver harness
//
// A "play" is a list of steering inputs pinned to positions on the track, not
// to frames or clock time — the same thing a student's hands do. The harness
// then replays that play through the real engine at whatever refresh rate the
// test asks for, so "identical play, different display" is a thing that can be
// asserted instead of argued about (#806).
// ═══════════════════════════════════════════════════════════════════════════

interface SteerEvent {
  atScroll: number;
  dir: -1 | 1;
}

const UPGRADES = [null, "grip", "speed", "steering"] as const;
/** Refresh rates a classroom actually meets, plus a jittered stand-in. */
const REFRESH_RATES = [60, 75, 90, 120, 144] as const;

/**
 * Turn a per-obstacle lane plan into steering inputs issued `lead` units
 * before each cone. The stock lead sits in the clear: the tightest obstacle
 * gap is 200 units and a pass window is ±28, so 100 units before a cone is
 * after the previous window closes and before this one opens.
 */
const CLEAR_LEAD = 100;
function planFromLanes(lanes: number[], lead = CLEAR_LEAD): SteerEvent[] {
  let lane = START_LANE;
  const steers: SteerEvent[] = [];
  OBSTACLES.forEach((obs, index) => {
    const target = lanes[index];
    while (lane !== target) {
      const dir: -1 | 1 = target > lane ? 1 : -1;
      steers.push({ atScroll: obs.y - lead, dir });
      lane += dir;
    }
  });
  return steers;
}

/** Steer inputs are issued the moment the car reaches each trigger position. */
function drive(
  upgrade: Upgrade | null,
  steers: SteerEvent[],
  nextFrameSeconds: () => number,
): RaceEngine {
  const engine = createRaceEngine(upgrade);
  const queue = [...steers];
  let guard = 0;
  while (!engine.finished) {
    if ((guard += 1) > 2_000_000) throw new Error("lap never finished");
    while (queue.length > 0 && engine.scroll >= queue[0].atScroll) {
      engine.steer(queue.shift()!.dir);
    }
    engine.advance(nextFrameSeconds());
  }
  return engine;
}

const atHz = (hz: number) => () => 1 / hz;

/** Deterministic frame jitter: 30–240 Hz plus an occasional stall. */
function jitteredFrames(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    const unit = state / 2147483648;
    if (unit > 0.97) return 0.4; // dropped frames / tab regains focus
    return 1 / 30 + unit * (1 / 240 - 1 / 30);
  };
}

/** Every lane plan that dodges every cone, cheapest first — brute force. */
function optimalLine(): number[] {
  let best = Number.POSITIVE_INFINITY;
  let bestLanes: number[] = [];
  const walk = (index: number, lane: number, cost: number, lanes: number[]) => {
    if (cost >= best) return;
    if (index === OBSTACLES.length) {
      best = cost;
      bestLanes = [...lanes];
      return;
    }
    for (const next of [0, 1, 2]) {
      if (next === OBSTACLES[index].lane) continue;
      walk(index + 1, next, cost + Math.abs(next - lane), [...lanes, next]);
    }
  };
  walk(0, START_LANE, 0, []);
  return bestLanes;
}

const FLAWLESS_LINE = optimalLine();
const flawless = (upgrade: Upgrade | null, hz = 60) =>
  drive(upgrade, planFromLanes(FLAWLESS_LINE), atHz(hz));
/** Hands off the wheel: the car sits in lane 1 and collects every lane-1 cone. */
const neverSteers = (upgrade: Upgrade | null, hz = 60) =>
  drive(upgrade, [], atHz(hz));

/**
 * A driver who starts moving `reactionSeconds` after a cone is first drawn.
 * This is the only thing separating a clean lap from a scruffy one in the real
 * game, and it is where the upgrades trade against each other: the reaction
 * margin is `CONE_VISIBLE_LEAD − bumpZone` units, and Speed Boost eats through
 * those units 45 % faster.
 */
function reactionPlay(upgrade: Upgrade | null, reactionSeconds: number) {
  const unitsPerSecond =
    SCROLL_UNITS_PER_SECOND * upgradeTuning(upgrade).speedMultiplier;
  return planFromLanes(
    FLAWLESS_LINE,
    CONE_VISIBLE_LEAD - unitsPerSecond * reactionSeconds,
  );
}
const reactionDriver = (upgrade: Upgrade | null, reactionSeconds: number) =>
  drive(upgrade, reactionPlay(upgrade, reactionSeconds), atHz(60));

const round1 = (seconds: number) => Math.round(seconds * 10) / 10;
const scoreOf = (run1: RunResult, run2: RunResult) =>
  calculateQualifyTuneRaceScore(run1, run2, "one").score;

// ═══════════════════════════════════════════════════════════════════════════
describe("race engine — hardware-fair timing (#806)", () => {
  it("returns identical time, bumps and smoothness at 60/75/90/120/144 Hz", () => {
    for (const upgrade of UPGRADES) {
      const results = REFRESH_RATES.map((hz) => flawless(upgrade, hz).result());
      for (const result of results) expect(result).toEqual(results[0]);
    }
  });

  it("is unmoved by frame jitter, dropped frames and a backgrounded tab", () => {
    for (const upgrade of UPGRADES) {
      const steady = flawless(upgrade, 60).result();
      for (const seed of [1, 7, 99]) {
        const shaky = drive(
          upgrade,
          planFromLanes(FLAWLESS_LINE),
          jitteredFrames(seed),
        ).result();
        expect(shaky).toEqual(steady);
      }
    }
  });

  it("scores a scruffy lap identically at every rate, not just a clean one", () => {
    for (const upgrade of UPGRADES) {
      const results = REFRESH_RATES.map((hz) => neverSteers(upgrade, hz));
      for (const engine of results) {
        expect(engine.bumps).toBe(results[0].bumps);
        expect(engine.result()).toEqual(results[0].result());
      }
      expect(results[0].bumps).toBeGreaterThan(0);
    }
  });

  it("no longer reports frames ÷ refresh rate — the #806 defect", () => {
    // Pre-repair the loop did `scroll += 2.5` once per animation frame, so a
    // clean lap was a fixed 1280 FRAMES and its "seconds" were whatever the
    // display divided that by. Identical play, two different scores:
    const legacyFrames = Math.ceil(TRACK_LENGTH / 2.5);
    expect(legacyFrames).toBe(1280);
    expect(round1(legacyFrames / 60)).toBe(21.3);
    expect(round1(legacyFrames / 90)).toBe(14.2);
    expect(round1(legacyFrames / 120)).toBe(10.7);

    // 60 Hz stays the anchor and every other display now agrees with it.
    expect(SCROLL_UNITS_PER_SECOND).toBe(2.5 * 60);
    for (const hz of REFRESH_RATES) {
      expect(flawless(null, hz).result().time).toBe(21.3);
    }
  });

  it("cannot step over a cone window that a slower display would hit", () => {
    // Rate invariance of collision detection is structural, not lucky: the
    // world only ever moves one fixed simulation step at a time, and that step
    // is far shorter than the narrowest pass window (2 × the grip bump zone),
    // so no sequence of frame lengths can jump a car past a cone.
    const fastestUnitsPerStep =
      (SCROLL_UNITS_PER_SECOND * SPEED_MULTIPLIER) / SIMULATION_HZ;
    const narrowestWindow = 2 * BUMP_ZONE * GRIP_BUMP_ZONE_FACTOR;
    expect(fastestUnitsPerStep).toBeLessThan(narrowestWindow);

    // …and behaviourally: a 5 fps potato and a 240 Hz panel collect the same
    // cones on the same play.
    for (const upgrade of UPGRADES) {
      const potato = drive(upgrade, [], atHz(5)).result();
      const panel = drive(upgrade, [], atHz(240)).result();
      expect(potato).toEqual(panel);
    }
  });

  it("waits out a backgrounded tab instead of teleporting through the track", () => {
    const engine = createRaceEngine(null);
    engine.advance(30);
    expect(engine.finished).toBe(false);
    expect(engine.scroll).toBeLessThanOrEqual(
      SCROLL_UNITS_PER_SECOND * MAX_FRAME_SECONDS,
    );
    expect(engine.steps).toBe(
      Math.floor(MAX_FRAME_SECONDS / FIXED_STEP_SECONDS),
    );
  });

  it("keeps the un-upgraded clean lap on its pre-repair 60 Hz value", () => {
    expect(cleanLapSeconds(null)).toBeCloseTo(
      TRACK_LENGTH / SCROLL_UNITS_PER_SECOND,
      6,
    );
    expect(flawless(null).result().time).toBe(round1(cleanLapSeconds(null)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("race engine — every upgrade moves a measured metric (#820)", () => {
  it("gives each upgrade exactly one lever on exactly one metric", () => {
    const base = flawless(null).result();

    const speed = flawless("speed").result();
    expect(speed.time).toBeLessThan(base.time);
    expect(speed.bumps).toBe(base.bumps);
    expect(speed.smoothness).toBe(base.smoothness);

    // Grip narrows the cone's pass window, so a late lane change still clears
    // it. Same inputs, same positions — one car brushes the cone, one does not.
    const lateLine = planFromLanes(FLAWLESS_LINE, 20);
    const lateStock = drive(null, lateLine, atHz(60)).result();
    const lateGrip = drive("grip", lateLine, atHz(60)).result();
    expect(lateStock.bumps).toBeGreaterThan(0);
    expect(lateGrip.bumps).toBe(0);
    expect(lateGrip.time).toBeLessThan(lateStock.time);
    expect(lateGrip.smoothness).toBeGreaterThan(lateStock.smoothness);

    const steering = flawless("steering").result();
    expect(steering.smoothness).toBeGreaterThan(base.smoothness);
    expect(steering.bumps).toBe(base.bumps);
    expect(steering.time).toBe(base.time);

    // #833 review NB-4a: the behavioural probes above run on lines where a
    // second lever can hide (a flawless line never nears a cone, so a
    // steering car that ALSO narrowed the bump zone would pass them). Pin
    // one-lever-per-upgrade at the tuning table itself.
    const stock = upgradeTuning(null);
    expect(upgradeTuning("speed")).toEqual({
      ...stock,
      speedMultiplier: SPEED_MULTIPLIER,
    });
    expect(upgradeTuning("grip")).toEqual({
      ...stock,
      bumpZone: BUMP_ZONE * GRIP_BUMP_ZONE_FACTOR,
    });
    expect(upgradeTuning("steering")).toEqual({
      ...stock,
      transitionPenalty: STEERING_TRANSITION_PENALTY,
    });
  });

  it("lets flawless play reach 10/10 under every upgrade", () => {
    // The defect #820 reported: flawless driving scored 10/10 with Speed Boost
    // and 8/10 with either of the other two, because lap time was a pure
    // function of the upgrade and the student had no input that touched it.
    const qualifying = flawless(null).result();
    expect(qualifying).toEqual({ time: 21.3, bumps: 0, smoothness: 86 });

    for (const upgrade of ["grip", "speed", "steering"] as const) {
      const race = flawless(upgrade).result();
      expect(scoreOf(qualifying, race)).toBe(10);
    }
  });

  it("charges every cone the same lap time, in every car", () => {
    // This is what stops the time point from being free: a lap loses time only
    // to cones, so "cone-free" and "at this car's floor" are the same state,
    // and the scorer's held-time clause has to be driven rather than chosen.
    for (const upgrade of UPGRADES) {
      const clean = flawless(upgrade);
      expect(clean.bumps).toBe(0);
      expect(clean.result().time).toBe(round1(cleanLapSeconds(upgrade)));

      const scruffy = neverSteers(upgrade);
      expect(scruffy.bumps).toBe(4); // the four lane-1 cones
      expect(scruffy.elapsedSeconds).toBeCloseTo(
        cleanLapSeconds(upgrade) + scruffy.bumps * BUMP_TIME_COST_SECONDS,
        4,
      );
      expect(scruffy.result().time).toBeGreaterThan(clean.result().time);
    }
  });

  it("makes Speed Boost cost reaction margin, so no upgrade wins for everyone", () => {
    // The margin between a cone appearing and its window opening is fixed in
    // UNITS (CONE_VISIBLE_LEAD − bumpZone); Speed Boost spends those units 45 %
    // faster, Grip Tires buys 11.7 % more of them.
    const marginSeconds = (upgrade: Upgrade | null) =>
      (CONE_VISIBLE_LEAD - upgradeTuning(upgrade).bumpZone) /
      (SCROLL_UNITS_PER_SECOND * upgradeTuning(upgrade).speedMultiplier);
    expect(marginSeconds("speed")).toBeLessThan(marginSeconds(null));
    expect(marginSeconds("grip")).toBeGreaterThan(marginSeconds(null));

    // A driver who is comfortably inside the stock margin but not the boosted
    // one: same reflexes, more cones, only because of the upgrade.
    const reaction = 0.6;
    expect(reaction).toBeLessThan(marginSeconds(null));
    expect(reaction).toBeGreaterThan(marginSeconds("speed"));
    expect(reactionDriver(null, reaction).bumps).toBe(0);
    expect(reactionDriver("speed", reaction).bumps).toBeGreaterThan(0);

    // And one who is just outside the stock margin but inside grip's.
    const late = 0.76;
    expect(late).toBeGreaterThan(marginSeconds(null));
    expect(late).toBeLessThan(marginSeconds("grip"));
    expect(reactionDriver(null, late).bumps).toBeGreaterThan(0);
    expect(reactionDriver("grip", late).bumps).toBe(0);
  });

  it("has no upgrade that is best for every driver, and none that is dead", () => {
    const bestFor = (reaction: number) => {
      const qualifying = reactionDriver(null, reaction).result();
      const scores = (["grip", "speed", "steering"] as const).map(
        (upgrade) => ({
          upgrade,
          score: scoreOf(
            qualifying,
            reactionDriver(upgrade, reaction).result(),
          ),
        }),
      );
      const top = Math.max(...scores.map((s) => s.score));
      return {
        top,
        winners: scores.filter((s) => s.score === top).map((s) => s.upgrade),
        scores,
      };
    };

    // Sharp reflexes: every upgrade holds the ceiling, the choice is free.
    expect(bestFor(0.3).winners).toEqual(["grip", "speed", "steering"]);
    // Slightly late: Grip Tires are the only thing that saves the lap.
    expect(bestFor(0.76).winners).toEqual(["grip"]);
    // Far off the pace: cones are unavoidable, and only Speed Boost moves a
    // metric at all.
    expect(bestFor(0.95).winners).toEqual(["speed"]);
    // Every upgrade wins outright somewhere, so none of the three is a decoy.
    for (const upgrade of ["grip", "speed", "steering"] as const) {
      const everWins = [0.3, 0.6, 0.76, 0.85, 0.95].some((reaction) =>
        bestFor(reaction).winners.includes(upgrade),
      );
      expect(everWins).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("race engine — ceilings stay derived (#737 / #804)", () => {
  it("derives every configuration's smoothness ceiling from the same DP", () => {
    const forcedChanges = minCleanLaneChanges(OBSTACLES, START_LANE);
    for (const upgrade of UPGRADES) {
      const ceiling = maxCleanSmoothness(upgrade);
      expect(ceiling).toBe(
        100 - upgradeTuning(upgrade).transitionPenalty * forcedChanges,
      );
      // …and the engine actually reaches it on the optimal line.
      expect(flawless(upgrade).result().smoothness).toBe(ceiling);
    }
    expect(MAX_CLEAN_SMOOTHNESS).toBe(maxCleanSmoothness(null));
  });

  it("keeps the scorer's ceiling at the qualifying lap's, which is the strict one", () => {
    // The qualifying lap is always un-upgraded, so 86 is the best smoothness a
    // student can carry into the comparison. Steady Steering's 93 can only be
    // an improvement, which the strict branch already credits — which is why
    // the held clause never needs to know the upgrade.
    expect(MAX_CLEAN_SMOOTHNESS).toBe(86);
    expect(maxCleanSmoothness("steering")).toBe(93);
    expect(maxCleanSmoothness("steering")).toBeGreaterThan(
      MAX_CLEAN_SMOOTHNESS,
    );
  });

  it("never lets a reachable pair outscore flawless-both, on any upgrade", () => {
    // The #804 audit's sweep, re-run against the repaired engine and widened
    // to cover every upgrade. States are a superset of what the engine can
    // emit (up to every cone hit, up to 24 lane changes), which makes the
    // claim strictly stronger than an exact enumeration.
    const forcedChanges = minCleanLaneChanges(OBSTACLES, START_LANE);
    const stateFor = (
      upgrade: Upgrade | null,
      bumps: number,
      transitions: number,
    ): RunResult => ({
      time: round1(cleanLapSeconds(upgrade) + bumps * BUMP_TIME_COST_SECONDS),
      bumps,
      smoothness: Math.round(
        Math.max(
          0,
          100 -
            bumps * 15 -
            transitions * upgradeTuning(upgrade).transitionPenalty,
        ),
      ),
    });

    for (const upgrade of ["grip", "speed", "steering"] as const) {
      for (const exitAnswer of ["one", "two"]) {
        const flawlessBoth = calculateQualifyTuneRaceScore(
          stateFor(null, 0, forcedChanges),
          stateFor(upgrade, 0, forcedChanges),
          exitAnswer,
        ).score;
        for (let b1 = 0; b1 <= OBSTACLES.length; b1++) {
          for (let t1 = 0; t1 <= 24; t1++) {
            for (let b2 = 0; b2 <= OBSTACLES.length; b2++) {
              for (let t2 = 0; t2 <= 24; t2++) {
                const score = calculateQualifyTuneRaceScore(
                  stateFor(null, b1, t1),
                  stateFor(upgrade, b2, t2),
                  exitAnswer,
                ).score;
                if (score > flawlessBoth) {
                  throw new Error(
                    `inversion: ${upgrade} run1(${b1},${t1}) run2(${b2},${t2}) scored ${score} > flawless ${flawlessBoth}`,
                  );
                }
              }
            }
          }
        }
        expect(flawlessBoth).toBe(exitAnswer === "one" ? 10 : 8);
      }
    }
  });
});
