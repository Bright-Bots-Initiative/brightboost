import { describe, expect, it } from "vitest";
import {
  BUMP_ZONE,
  cleanLapSeconds,
  createRaceEngine,
  FIXED_STEP_SECONDS,
  GRIP_BUMP_ZONE_FACTOR,
  MAX_FRAME_SECONDS,
  OBSTACLES,
  SCROLL_UNITS_PER_SECOND,
  SIMULATION_HZ,
  SPEED_MULTIPLIER,
  START_LANE,
  TRACK_LENGTH,
  upgradeTuning,
  type RaceEngine,
  type Upgrade,
} from "../qualifyTuneRaceEngine";

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

const round1 = (seconds: number) => Math.round(seconds * 10) / 10;

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
