import { describe, expect, it } from "vitest";
import {
  CURVE_TOLERANCE,
  DEFAULT_GRID,
  DEFAULT_RIDE_TUNING,
  PATTERN_BOOK,
  TRACK_MAKER_TOTAL,
  buildTrackMakerResult,
  initialRideState,
  newlyUnlocked,
  pickReflectPrompt,
  starterTrack,
  stepRide,
  suggestUniqueName,
  trackToPolylinePoints,
  unlockedPieceTypes,
  validateRaceTrackContent,
  walkTrack,
  type RideState,
  type TrackPiece,
} from "../trackMakerModel";

const K2_TOL = CURVE_TOLERANCE.k2;

function track(pieces: TrackPiece[], grid = DEFAULT_GRID) {
  return { v: 1 as const, name: "Test Track", grid, pieces };
}

// A straight run into a sharp curve, then a finish — the spin-out testbed.
const SHARP_RUN: TrackPiece[] = [
  { x: 1, y: 3, type: "start", rot: 0 },
  { x: 2, y: 3, type: "straight", rot: 0 },
  { x: 3, y: 3, type: "sharpCurve", rot: 180 }, // enter W, exit S
  { x: 3, y: 4, type: "finish", rot: 0 },
];

/** Drive the ride to completion (or a step cap) with a fixed lean policy. */
function rideToEnd(
  path: TrackPiece[],
  leaning: boolean,
  start: RideState = initialRideState(),
): RideState {
  let state = start;
  for (let i = 0; i < 2000 && !state.finished; i++) {
    state = stepRide(state, path, 1 / 60, leaning, K2_TOL).state;
  }
  return state;
}

// ── Connectivity walk ───────────────────────────────────────────────────────

describe("walkTrack", () => {
  it("walks the starter track start → finish", () => {
    const walk = walkTrack(track(starterTrack()));
    expect(walk.ok).toBe(true);
    if (walk.ok) {
      expect(walk.path[0].type).toBe("start");
      expect(walk.path[walk.path.length - 1].type).toBe("finish");
    }
  });

  it("fails with the offending cell when the road dangles", () => {
    const walk = walkTrack(
      track([
        { x: 1, y: 3, type: "start", rot: 0 },
        { x: 2, y: 3, type: "straight", rot: 0 },
        // nothing at (3,3) — the road ends
        { x: 6, y: 6, type: "finish", rot: 0 },
      ]),
    );
    expect(walk).toMatchObject({ ok: false, reason: "brokenPath", at: { x: 3, y: 3 } });
  });

  it("fails on a wrong-way join (touching pieces that do not connect)", () => {
    const walk = walkTrack(
      track([
        { x: 1, y: 3, type: "start", rot: 0 },
        { x: 2, y: 3, type: "straight", rot: 90 }, // N–S can't accept a W entry
        { x: 3, y: 3, type: "finish", rot: 0 },
      ]),
    );
    expect(walk).toMatchObject({ ok: false, reason: "brokenPath" });
  });
});

describe("validateRaceTrackContent (client mirror)", () => {
  it("accepts the starter track", () => {
    expect(validateRaceTrackContent(track(starterTrack())).ok).toBe(true);
  });

  it("STRICT: rejects unknown keys at root, grid, and piece level", () => {
    expect(
      validateRaceTrackContent({ ...track(starterTrack()), extra: 1 }).ok,
    ).toBe(false);
    expect(
      validateRaceTrackContent(track(starterTrack(), { w: 8, h: 8, deep: 1 } as never)).ok,
    ).toBe(false);
    const withExtraPieceKey = track(starterTrack());
    withExtraPieceKey.pieces[1] = {
      ...withExtraPieceKey.pieces[1],
      note: "hi",
    } as never;
    expect(validateRaceTrackContent(withExtraPieceKey).ok).toBe(false);
  });

  it("rejects a broken track and reports the broken cell for the UI hint", () => {
    const r = validateRaceTrackContent(
      track([
        { x: 1, y: 3, type: "start", rot: 0 },
        { x: 6, y: 6, type: "finish", rot: 0 },
      ]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.at).toEqual({ x: 2, y: 3 });
  });
});

// ── Ride physics ────────────────────────────────────────────────────────────

describe("stepRide", () => {
  it("finishes the starter track (finish detection)", () => {
    const walk = walkTrack(track(starterTrack()));
    if (!walk.ok) throw new Error("starter must walk");
    const end = rideToEnd(walk.path, false);
    expect(end.finished).toBe(true);
    expect(end.spinOuts).toBe(0);
  });

  it("spins out entering a sharp curve at full throttle", () => {
    const walk = walkTrack(track(SHARP_RUN));
    if (!walk.ok) throw new Error("sharp run must walk");
    // Never leaning: throttle climbs to 1.0 — far above the 0.4 tolerance.
    const end = rideToEnd(walk.path, false);
    expect(end.finished).toBe(true); // remounts mean the ride still finishes
    expect(end.spinOuts).toBeGreaterThanOrEqual(1);
  });

  it("survives the sharp curve when leaning (hold-to-lean always works)", () => {
    const walk = walkTrack(track(SHARP_RUN));
    if (!walk.ok) throw new Error("sharp run must walk");
    // Leaning the whole way: speed settles at leanTarget (0.2) ≤ 0.4 tolerance.
    const end = rideToEnd(walk.path, true);
    expect(end.finished).toBe(true);
    expect(end.spinOuts).toBe(0);
  });

  it("K-2 CONTRACT: a sharp curve is survivable at ≤40% throttle", () => {
    const walk = walkTrack(track(SHARP_RUN));
    if (!walk.ok) throw new Error("sharp run must walk");
    const state: RideState = {
      ...initialRideState(),
      pieceIndex: 1,
      progress: 0.99,
      speed: 0.4,
    };
    // Hold lean so throttle can't climb past 0.4 during the entry step.
    const { state: next, events } = stepRide(state, walk.path, 1 / 60, true, K2_TOL);
    expect(events.spunOut).toBeUndefined();
    expect(next.spinOuts).toBe(0);
  });

  it("g3_5 tolerance is tighter than K-2 (band-scaled difficulty)", () => {
    expect(CURVE_TOLERANCE.g3_5.sharpCurve).toBeLessThan(
      CURVE_TOLERANCE.k2.sharpCurve,
    );
    expect(CURVE_TOLERANCE.g3_5.gentleCurve).toBeLessThan(
      CURVE_TOLERANCE.k2.gentleCurve,
    );
    // The lean target must sit below every sharp tolerance so "hold to lean"
    // is always a valid survival strategy in every band.
    expect(DEFAULT_RIDE_TUNING.leanTarget).toBeLessThanOrEqual(
      CURVE_TOLERANCE.g3_5.sharpCurve,
    );
  });

  it("spin-out remounts at the start of the curve with zero speed — no lost progress", () => {
    const walk = walkTrack(track(SHARP_RUN));
    if (!walk.ok) throw new Error("sharp run must walk");
    const state: RideState = {
      ...initialRideState(),
      pieceIndex: 1,
      progress: 0.99,
      speed: 1,
    };
    const { state: next, events } = stepRide(state, walk.path, 1 / 60, false, K2_TOL);
    expect(events.spunOut).toBe(true);
    expect(next.pieceIndex).toBe(2); // at the curve, not sent back to start
    expect(next.progress).toBe(0);
    expect(next.speed).toBe(0);
    expect(next.spinOuts).toBe(1);
  });

  it("boost pads kick the throttle to full", () => {
    const boostRun: TrackPiece[] = [
      { x: 1, y: 3, type: "start", rot: 0 },
      { x: 2, y: 3, type: "boost", rot: 0 },
      { x: 3, y: 3, type: "straight", rot: 0 },
      { x: 4, y: 3, type: "finish", rot: 0 },
    ];
    const walk = walkTrack(track(boostRun));
    if (!walk.ok) throw new Error("boost run must walk");
    const state: RideState = {
      ...initialRideState(),
      pieceIndex: 0,
      progress: 0.99,
      speed: 0.3,
    };
    const { state: next, events } = stepRide(state, walk.path, 1 / 60, true, K2_TOL);
    expect(events.boosted).toBe(true);
    expect(next.speed).toBe(1);
    expect(next.boostsHit).toBe(1);
  });

  it("boost placed right before a sharp curve teaches its lesson (spin-out)", () => {
    const trap: TrackPiece[] = [
      { x: 1, y: 3, type: "start", rot: 0 },
      { x: 2, y: 3, type: "boost", rot: 0 },
      { x: 3, y: 3, type: "sharpCurve", rot: 180 },
      { x: 3, y: 4, type: "finish", rot: 0 },
    ];
    const walk = walkTrack(track(trap));
    if (!walk.ok) throw new Error("trap must walk");
    const end = rideToEnd(walk.path, false);
    expect(end.spinOuts).toBeGreaterThanOrEqual(1);
  });
});

// ── Unlocks (one completed ride per unlock; spin-outs never gate) ──────────

describe("piece unlocks", () => {
  it("starts with the constrained palette (no sharp curve, no boost)", () => {
    const palette = unlockedPieceTypes(0);
    expect(palette).toContain("straight");
    expect(palette).toContain("gentleCurve");
    expect(palette).toContain("finish");
    expect(palette).not.toContain("sharpCurve");
    expect(palette).not.toContain("boost");
  });

  it("unlocks sharp curve after 1 completed ride, boost after 2", () => {
    expect(unlockedPieceTypes(1)).toContain("sharpCurve");
    expect(unlockedPieceTypes(1)).not.toContain("boost");
    expect(unlockedPieceTypes(2)).toContain("boost");
  });

  it("reports newly unlocked pieces exactly once (drives the announce beat)", () => {
    expect(newlyUnlocked(0, 1)).toEqual(["sharpCurve"]);
    expect(newlyUnlocked(1, 2)).toEqual(["boost"]);
    expect(newlyUnlocked(2, 3)).toEqual([]);
    expect(newlyUnlocked(0, 2)).toEqual(["sharpCurve", "boost"]);
  });
});

// ── Pattern book + starter: the solvability guard for authored content ─────

describe("pattern book", () => {
  it("PROGRAMMATIC GUARD: every pattern-book shape is rideable", () => {
    for (const pattern of PATTERN_BOOK) {
      const result = validateRaceTrackContent({
        v: 1,
        name: pattern.name.en,
        grid: pattern.grid,
        pieces: pattern.pieces,
      });
      expect(result.ok, `pattern "${pattern.id}" must be rideable`).toBe(true);
    }
  });

  it("every pattern has real EN + ES names", () => {
    for (const pattern of PATTERN_BOOK) {
      expect(pattern.name.en?.length).toBeGreaterThan(0);
      expect(pattern.name.es?.length).toBeGreaterThan(0);
      expect(pattern.name.es).not.toBe(pattern.name.en);
    }
  });

  it("the starter segment is rideable (the floor never opens broken)", () => {
    expect(validateRaceTrackContent(track(starterTrack())).ok).toBe(true);
  });
});

// ── Name kit ────────────────────────────────────────────────────────────────

describe("suggestUniqueName", () => {
  it("keeps a free name as-is", () => {
    expect(suggestUniqueName("Big Loop", ["Zippy Trail"])).toBe("Big Loop");
  });

  it("auto-suffixes duplicates (case-insensitive) instead of blocking", () => {
    expect(suggestUniqueName("Big Loop", ["big loop"])).toBe("Big Loop 2");
    expect(suggestUniqueName("Big Loop", ["Big Loop", "Big Loop 2"])).toBe(
      "Big Loop 3",
    );
  });

  it("ignores null/undefined titles from unnamed creations", () => {
    expect(suggestUniqueName("Big Loop", [null, undefined, ""])).toBe("Big Loop");
  });
});

// ── Reflect pool (context-aware, 6 keys) ────────────────────────────────────

describe("pickReflectPrompt", () => {
  it("prioritizes a newly ridden unlocked piece", () => {
    expect(
      pickReflectPrompt({ spinOuts: 3, boostsHit: 1, newPieceRidden: "sharpCurve" }).key,
    ).toBe("games.trackMaker.reflect.newPiece");
  });

  it("varies by spin-outs, boost, and clean rides", () => {
    expect(pickReflectPrompt({ spinOuts: 2, boostsHit: 0 })).toMatchObject({
      key: "games.trackMaker.reflect.spinOuts",
      params: { count: 2 },
    });
    expect(pickReflectPrompt({ spinOuts: 1, boostsHit: 0 }).key).toBe(
      "games.trackMaker.reflect.oneSpin",
    );
    expect(pickReflectPrompt({ spinOuts: 0, boostsHit: 2 }).key).toBe(
      "games.trackMaker.reflect.boost",
    );
    expect(pickReflectPrompt({ spinOuts: 0, boostsHit: 0 }, () => 0.1).key).toBe(
      "games.trackMaker.reflect.clean",
    );
    expect(pickReflectPrompt({ spinOuts: 0, boostsHit: 0 }, () => 0.9).key).toBe(
      "games.trackMaker.reflect.proud",
    );
  });
});

// ── Scoring: measures creation, never speed ────────────────────────────────

describe("buildTrackMakerResult", () => {
  const base = {
    rideable: true,
    ridesCompleted: 0,
    iterated: false,
    targetsMet: 0,
    bestCleanStreak: 0,
    spinOuts: 0,
    tweaks: 0,
    sharedToGallery: false,
  };

  it("scores creation milestones with integer score/total", () => {
    const r = buildTrackMakerResult({
      ...base,
      ridesCompleted: 3,
      iterated: true,
      targetsMet: 2,
      bestCleanStreak: 2,
      spinOuts: 4,
      tweaks: 9,
    });
    expect(r.gameKey).toBe("track_maker");
    expect(r.score).toBe(6); // 2 rideable + 2 rode + 1 iterated + 1 target
    expect(r.total).toBe(TRACK_MAKER_TOTAL);
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.roundsCompleted).toBe(3);
    expect(r.streakMax).toBe(2);
  });

  it("spin-outs never reduce the score (feedback, not failure)", () => {
    const clean = buildTrackMakerResult({ ...base, ridesCompleted: 1 });
    const messy = buildTrackMakerResult({
      ...base,
      ridesCompleted: 1,
      spinOuts: 12,
    });
    expect(messy.score).toBe(clean.score);
  });

  it("keeps maker telemetry in gameSpecific (not in the scored fields)", () => {
    const r = buildTrackMakerResult({ ...base, tweaks: 5, spinOuts: 2 });
    expect(r.gameSpecific).toMatchObject({ tweaks: 5, spinOuts: 2 });
  });
});

// ── Gallery thumbnail ───────────────────────────────────────────────────────

describe("trackToPolylinePoints", () => {
  it("produces points for a rideable track", () => {
    const points = trackToPolylinePoints(track(starterTrack()));
    expect(points.split(" ").length).toBeGreaterThanOrEqual(3);
  });

  it('returns "" for a broken track so the card falls back to 🏍️ + name', () => {
    expect(
      trackToPolylinePoints(
        track([
          { x: 1, y: 3, type: "start", rot: 0 },
          { x: 6, y: 6, type: "finish", rot: 0 },
        ]),
      ),
    ).toBe("");
  });
});
