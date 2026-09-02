/**
 * Qualify, Tune, Race — headless race engine.
 *
 * Split out of `QualifyTuneRaceGame.tsx` so the simulation can be driven
 * deterministically from tests. The component still owns rendering and phase
 * flow; this module owns the world: scrolling, cone collisions, lane changes,
 * and the three measured metrics (time, bumps, smoothness).
 *
 * Two defects shaped it.
 *
 * **#806 — hardware-fair timing.** The old loop advanced the world once per
 * animation frame (`scrollRef.current += SCROLL_SPEED * speedMult`), so a lap
 * lasted `frames / refreshRate` seconds: 21.3 s on a 60 Hz classroom display
 * and 14.2 s on a 90 Hz laptop for byte-identical play. The world now advances
 * in whole fixed simulation steps consumed from elapsed wall-clock time, and
 * the reported lap time is *simulated* time, so the same driving produces the
 * same time, bumps and smoothness on any display and under frame jitter.
 * 60 Hz is the anchor: `SCROLL_SPEED` 2.5 px/frame × 60 fps = 150 units/s, so
 * an un-upgraded clean lap is still 3200 / 150 = 21.3 s, as it was.
 *
 * **#820 — three upgrades, three levers, three metrics.** Previously only
 * `speed` touched anything measured, `grip`'s narrower cone window was
 * invisible to a driver who never bumped, and `steering` had no engine effect
 * at all. Each upgrade now owns exactly one lever, and each lever owns exactly
 * one metric — which is also the lesson the exit ticket asks about:
 *
 * | Upgrade      | Lever                              | Metric it moves |
 * | ------------ | ---------------------------------- | --------------- |
 * | ⚡ speed     | world speed ×1.45                  | ⏱️ time         |
 * | 🛞 grip      | cone window 28 → 15.4 units        | 💥 bumps        |
 * | 🎯 steering  | lane-change smoothness cost 2 → 1  | 🌊 smoothness   |
 *
 * None of them is free, and none is dominant. Speed shortens the distance a
 * cone is visible before it can be hit (136 − bumpZone units) into far less
 * *time* to react, so a late-reacting driver takes MORE cones with it. Grip
 * widens that same margin by 11.7 %, and does nothing at all for a driver who
 * was never going to touch a cone. Steering halves the cost of weaving but
 * moves neither time nor bumps. Cones — and only cones — cost lap time
 * (`BUMP_SLOW_SECONDS` at `BUMP_SLOW_FACTOR` speed ⇒
 * `BUMP_TIME_COST_SECONDS` per hit), which is what lets the scorer treat a
 * cone-free lap as "this car's floor" without handing the point to anyone who
 * merely picked an upgrade.
 */

// ── Types ─────────────────────────────────────────────────────────────────
export type Upgrade = "grip" | "speed" | "steering";

export interface RunResult {
  time: number;
  bumps: number;
  smoothness: number;
}

export interface Obstacle {
  lane: number;
  y: number;
}

export interface UpgradeTuning {
  speedMultiplier: number;
  bumpZone: number;
  transitionPenalty: number;
}

// ── Track geometry ────────────────────────────────────────────────────────
export const TRACK_W = 360,
  TRACK_H = 480,
  LANE_W = TRACK_W / 3;
export const CAR_W = 48,
  CAR_H = 64,
  CONE_SIZE = 36;
export const TRACK_LENGTH = 3200;
export const BUMP_ZONE = 28;
/** Every run starts here; the smoothness ceiling derives from it. */
export const START_LANE = 1;

export const OBSTACLES: readonly Obstacle[] = [
  { lane: 1, y: 300 },
  { lane: 0, y: 600 },
  { lane: 2, y: 900 },
  { lane: 1, y: 1200 },
  { lane: 0, y: 1500 },
  { lane: 2, y: 1700 },
  { lane: 1, y: 2000 },
  { lane: 0, y: 2300 },
  { lane: 2, y: 2600 },
  { lane: 1, y: 2900 },
];

// ── Timing model (#806) ───────────────────────────────────────────────────
/**
 * World speed. The pre-#806 loop moved 2.5 px per animation frame; at the
 * 60 Hz that the game was tuned on that is 150 units per second, so this
 * number keeps the old 60 Hz feel while making every other display agree.
 */
export const SCROLL_UNITS_PER_SECOND = 150;
/**
 * Simulation rate. Real frames are accumulated and consumed in whole steps of
 * `1 / SIMULATION_HZ`, so the sequence of world states — and therefore lap
 * time, bumps and smoothness — depends only on how much time has passed, never
 * on how the display chopped it up. Chosen above every common refresh rate
 * (60/75/90/120/144) so a slow display sub-steps rather than skipping detail.
 */
export const SIMULATION_HZ = 120;
export const FIXED_STEP_SECONDS = 1 / SIMULATION_HZ;
/**
 * Longest real frame the engine will honour. A backgrounded tab hands back a
 * multi-second `requestAnimationFrame` gap; collisions are still checked per
 * fixed step, so nothing is ever skipped — the clamp exists so the world does
 * not race ahead (hitting cones) while the student is away. Beyond this the
 * race simply waits for them to come back.
 */
export const MAX_FRAME_SECONDS = 0.25;

// ── Cost model ────────────────────────────────────────────────────────────
export const BUMP_SMOOTHNESS_PENALTY = 15;
export const TRANSITION_PENALTY = 2;
/** Steady Steering: a lane change costs half the smoothness it used to. */
export const STEERING_TRANSITION_PENALTY = 1;
/** Grip Tires: the cone's pass window narrows to 55 % of its width. */
export const GRIP_BUMP_ZONE_FACTOR = 0.55;
/** Speed Boost: the world scrolls 45 % faster. */
export const SPEED_MULTIPLIER = 1.45;
/** Clipping a cone scrubs speed for a moment — the only thing that costs time. */
export const BUMP_SLOW_SECONDS = 1;
export const BUMP_SLOW_FACTOR = 0.5;
/**
 * Seconds a single cone costs, whatever car you are driving: during the
 * slowdown you cover `BUMP_SLOW_FACTOR` of the usual ground, so you finish
 * `BUMP_SLOW_SECONDS × (1 − BUMP_SLOW_FACTOR)` later than a clean lap.
 */
export const BUMP_TIME_COST_SECONDS =
  BUMP_SLOW_SECONDS * (1 - BUMP_SLOW_FACTOR);
const BUMP_SLOW_STEPS = Math.round(BUMP_SLOW_SECONDS * SIMULATION_HZ);

// ── Helpers ───────────────────────────────────────────────────────────────
export function laneX(lane: number) {
  return lane * LANE_W + LANE_W / 2;
}

export function upgradeTuning(upgrade: Upgrade | null): UpgradeTuning {
  return {
    speedMultiplier: upgrade === "speed" ? SPEED_MULTIPLIER : 1,
    bumpZone:
      upgrade === "grip" ? BUMP_ZONE * GRIP_BUMP_ZONE_FACTOR : BUMP_ZONE,
    transitionPenalty:
      upgrade === "steering" ? STEERING_TRANSITION_PENALTY : TRANSITION_PENALTY,
  };
}

/**
 * Fewest lane changes that dodge every obstacle starting from `startLane`.
 * `steer()` moves exactly one lane per input and counts one transition, so
 * moving a → b costs |a − b|. Exported so the tests can cross-check it with an
 * independent brute force instead of mirroring the number.
 */
export function minCleanLaneChanges(
  obstacles: readonly Obstacle[],
  startLane: number,
): number {
  const LANES = [0, 1, 2] as const;
  let costs = LANES.map((lane) => Math.abs(lane - startLane));
  for (const obs of obstacles) {
    costs = LANES.map((lane) =>
      lane === obs.lane
        ? Number.POSITIVE_INFINITY
        : Math.min(...LANES.map((prev) => costs[prev] + Math.abs(lane - prev))),
    );
  }
  return Math.min(...costs);
}

/**
 * The smoothness a flawless run can reach in a given car (#737 review, #806
 * item 2): `smoothness = 100 − 15·bumps − penalty·laneChanges`, and the
 * obstacle table forces lane changes from `START_LANE`, so 100 is unreachable
 * and a held-at-100 clause was dead code. Derived from the track and the car's
 * own transition penalty — the same DP for every configuration, never a
 * hardcoded number, so it moves with `OBSTACLES` and with the upgrade table.
 */
export function maxCleanSmoothness(upgrade: Upgrade | null): number {
  return (
    100 -
    upgradeTuning(upgrade).transitionPenalty *
      minCleanLaneChanges(OBSTACLES, START_LANE)
  );
}

/**
 * The ceiling the scorer compares against: the qualifying lap is always driven
 * un-upgraded, so 86 is the best smoothness a student can bring into the
 * comparison. An upgraded second run can only *exceed* it (Steady Steering
 * reaches 93), which the strict-improvement branch already credits — so one
 * ceiling is enough and the held clause never needs to know the upgrade.
 */
export const MAX_CLEAN_SMOOTHNESS = maxCleanSmoothness(null);

/**
 * Lap time with no cones touched, in the given car — the floor that
 * configuration can physically run. Derived from the same constants the engine
 * integrates (whole simulation steps, so it matches the simulated clock
 * exactly), never measured or hardcoded.
 */
export function cleanLapSeconds(upgrade: Upgrade | null): number {
  const unitsPerStep =
    (SCROLL_UNITS_PER_SECOND * upgradeTuning(upgrade).speedMultiplier) /
    SIMULATION_HZ;
  return Math.ceil(TRACK_LENGTH / unitsPerStep) / SIMULATION_HZ;
}

/** The car sits this far up the track; cones are hit as they reach it. */
export const CAR_TRACK_Y = TRACK_H - 100;
/**
 * How far ahead of the car a cone is first drawn. The playfield draws a cone
 * while its screen position is within `TRACK_H + CONE_SIZE`, so it appears
 * `TRACK_H − CAR_TRACK_Y + CONE_SIZE` = 136 units before the car reaches it,
 * and the pass window opens `bumpZone` units before that. The difference is
 * the reaction margin the upgrades trade in: 108 units stock, 120.6 with grip
 * — and those units go by 45 % faster with Speed Boost.
 */
export const CONE_VISIBLE_LEAD = TRACK_H - CAR_TRACK_Y + CONE_SIZE;

// ── Engine ────────────────────────────────────────────────────────────────
export interface RaceEngine {
  readonly upgrade: Upgrade | null;
  readonly tuning: UpgradeTuning;
  readonly scroll: number;
  readonly lane: number;
  readonly bumps: number;
  readonly transitions: number;
  readonly steps: number;
  readonly elapsedSeconds: number;
  readonly smoothness: number;
  readonly finished: boolean;
  hasHit(index: number): boolean;
  /** Move one lane. Returns true when the car actually changed lanes. */
  steer(dir: -1 | 1): boolean;
  /** Feed one real animation frame; the world moves in whole fixed steps. */
  advance(frameSeconds: number): void;
  result(): RunResult;
}

export function createRaceEngine(upgrade: Upgrade | null): RaceEngine {
  const tuning = upgradeTuning(upgrade);
  const unitsPerStep =
    (SCROLL_UNITS_PER_SECOND * tuning.speedMultiplier) / SIMULATION_HZ;
  const hits = new Set<number>();

  let scroll = 0;
  let lane = START_LANE;
  let bumps = 0;
  let transitions = 0;
  let steps = 0;
  let finished = false;
  let slowStepsLeft = 0;
  /** Real time handed in but not yet worth a whole simulation step. */
  let carrySeconds = 0;

  const smoothnessNow = () =>
    Math.round(
      Math.max(
        0,
        100 -
          bumps * BUMP_SMOOTHNESS_PENALTY -
          transitions * tuning.transitionPenalty,
      ),
    );

  const step = () => {
    steps += 1;
    const slowed = slowStepsLeft > 0;
    if (slowed) slowStepsLeft -= 1;
    scroll += slowed ? unitsPerStep * BUMP_SLOW_FACTOR : unitsPerStep;

    // The playfield draws the car at y = TRACK_H − 100 and the cone at
    // `obs.y − scroll + TRACK_H − 100`, so the vertical hit test reduces
    // exactly to |scroll − obs.y| < bumpZone. Lanes are LANE_W = 120 apart and
    // bumpZone ≤ 28, so the horizontal test is "same lane" and nothing else.
    const carX = laneX(lane);
    for (let i = 0; i < OBSTACLES.length; i++) {
      if (hits.has(i)) continue;
      const obs = OBSTACLES[i];
      if (
        Math.abs(carX - laneX(obs.lane)) < tuning.bumpZone &&
        Math.abs(scroll - obs.y) < tuning.bumpZone
      ) {
        hits.add(i);
        bumps += 1;
        slowStepsLeft = BUMP_SLOW_STEPS;
      }
    }

    if (scroll >= TRACK_LENGTH) {
      scroll = TRACK_LENGTH;
      finished = true;
    }
  };

  return {
    upgrade,
    tuning,
    get scroll() {
      return scroll;
    },
    get lane() {
      return lane;
    },
    get bumps() {
      return bumps;
    },
    get transitions() {
      return transitions;
    },
    get steps() {
      return steps;
    },
    get elapsedSeconds() {
      return steps / SIMULATION_HZ;
    },
    get smoothness() {
      return smoothnessNow();
    },
    get finished() {
      return finished;
    },
    hasHit: (index) => hits.has(index),
    steer(dir) {
      if (finished) return false;
      const next = Math.max(0, Math.min(2, lane + dir));
      if (next === lane) return false;
      lane = next;
      transitions += 1;
      return true;
    },
    advance(frameSeconds) {
      if (finished) return;
      const usable = Math.min(
        Math.max(frameSeconds, 0) || 0,
        MAX_FRAME_SECONDS,
      );
      carrySeconds += usable;
      while (!finished && carrySeconds >= FIXED_STEP_SECONDS) {
        carrySeconds -= FIXED_STEP_SECONDS;
        step();
      }
      if (finished) carrySeconds = 0;
    },
    result() {
      return {
        time: Math.round((steps / SIMULATION_HZ) * 10) / 10,
        bumps,
        smoothness: smoothnessNow(),
      };
    },
  };
}
