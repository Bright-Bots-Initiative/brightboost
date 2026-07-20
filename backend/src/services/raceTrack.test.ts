import { describe, expect, it } from "vitest";
import { deriveRaceTrackTitle, validateRaceTrack } from "./raceTrack";

const valid = () => ({
  v: 1,
  name: "Super Loop",
  grid: { w: 8, h: 8 },
  pieces: [
    { x: 1, y: 3, type: "start", rot: 0 },
    { x: 2, y: 3, type: "straight", rot: 0 },
    { x: 3, y: 3, type: "finish", rot: 0 },
  ],
});

describe("validateRaceTrack — schema", () => {
  it("accepts a minimal rideable track", () => {
    expect(validateRaceTrack(valid())).toEqual({ ok: true });
  });

  it("rejects non-object content", () => {
    expect(validateRaceTrack("nope").ok).toBe(false);
    expect(validateRaceTrack(null).ok).toBe(false);
    expect(validateRaceTrack([valid()]).ok).toBe(false);
  });

  it("rejects an unsupported version", () => {
    expect(validateRaceTrack({ ...valid(), v: 2 }).ok).toBe(false);
  });

  it("rejects a missing or empty name", () => {
    const { name: _name, ...noName } = valid();
    expect(validateRaceTrack(noName).ok).toBe(false);
    expect(validateRaceTrack({ ...valid(), name: "" }).ok).toBe(false);
  });

  it("rejects a name over 24 chars", () => {
    expect(validateRaceTrack({ ...valid(), name: "x".repeat(25) }).ok).toBe(false);
  });

  it("rejects grid sizes outside 4..12", () => {
    expect(validateRaceTrack({ ...valid(), grid: { w: 3, h: 8 } }).ok).toBe(false);
    expect(validateRaceTrack({ ...valid(), grid: { w: 8, h: 13 } }).ok).toBe(false);
  });

  it("rejects too few pieces", () => {
    expect(
      validateRaceTrack({
        ...valid(),
        pieces: [{ x: 1, y: 3, type: "start", rot: 0 }],
      }).ok,
    ).toBe(false);
  });

  it("rejects an unknown piece type and bad rotation", () => {
    const t = valid();
    t.pieces[1] = { ...t.pieces[1], type: "rocket" as never };
    expect(validateRaceTrack(t).ok).toBe(false);
    const r = valid();
    r.pieces[1] = { ...r.pieces[1], rot: 45 as never };
    expect(validateRaceTrack(r).ok).toBe(false);
  });

  // ── The #668 divergence, tested explicitly: unknown keys are REJECTED ──

  it("STRICT: rejects unknown keys at the root level", () => {
    const r = validateRaceTrack({ ...valid(), evilExtra: "smuggled" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("evilExtra");
  });

  it("STRICT: rejects unknown keys inside grid", () => {
    expect(
      validateRaceTrack({ ...valid(), grid: { w: 8, h: 8, depth: 2 } }).ok,
    ).toBe(false);
  });

  it("STRICT: rejects unknown keys inside a piece", () => {
    const t = valid();
    t.pieces[1] = { ...t.pieces[1], freeText: "hi class!" } as never;
    expect(validateRaceTrack(t).ok).toBe(false);
  });
});

describe("validateRaceTrack — rideability guard", () => {
  it("rejects a piece outside the declared grid", () => {
    const t = valid();
    t.grid = { w: 4, h: 4 };
    t.pieces.push({ x: 6, y: 6, type: "straight", rot: 0 });
    expect(validateRaceTrack(t).ok).toBe(false);
  });

  it("rejects two pieces on the same cell", () => {
    const t = valid();
    t.pieces.push({ x: 2, y: 3, type: "straight", rot: 0 });
    expect(validateRaceTrack(t).ok).toBe(false);
  });

  it("rejects a track with no start / multiple starts", () => {
    const noStart = valid();
    noStart.pieces[0] = { ...noStart.pieces[0], type: "straight" };
    expect(validateRaceTrack(noStart).ok).toBe(false);

    const twoStarts = valid();
    twoStarts.pieces.push({ x: 5, y: 5, type: "start", rot: 0 });
    expect(validateRaceTrack(twoStarts).ok).toBe(false);
  });

  it("rejects a track with no finish", () => {
    const t = valid();
    t.pieces[2] = { ...t.pieces[2], type: "straight" };
    expect(validateRaceTrack(t).ok).toBe(false);
  });

  it("rejects a dangling road (start's road never reaches the finish)", () => {
    const t = valid();
    // Move the finish away from the road so the walk falls off the end.
    t.pieces[2] = { x: 6, y: 6, type: "finish", rot: 0 };
    const r = validateRaceTrack(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("not rideable");
  });

  it("rejects pieces that touch but do not connect (wrong-way join)", () => {
    const t = valid();
    // A N–S straight cannot accept an entry from the west.
    t.pieces[1] = { ...t.pieces[1], rot: 90 };
    expect(validateRaceTrack(t).ok).toBe(false);
  });

  it("accepts a track that rides through curves and a boost", () => {
    const t = {
      v: 1,
      name: "Curvy Rally",
      grid: { w: 8, h: 8 },
      pieces: [
        { x: 1, y: 2, type: "start", rot: 0 },
        { x: 2, y: 2, type: "boost", rot: 0 },
        { x: 3, y: 2, type: "gentleCurve", rot: 180 }, // W↔S: enter W, exit S
        { x: 3, y: 3, type: "sharpCurve", rot: 0 },    // N↔E: enter N, exit E
        { x: 4, y: 3, type: "finish", rot: 0 },
      ],
    };
    expect(validateRaceTrack(t)).toEqual({ ok: true });
  });

  it("allows decoration pieces off the ridden path", () => {
    // A disconnected extra piece doesn't break the start→finish ride.
    const t = valid();
    t.pieces.push({ x: 6, y: 6, type: "straight", rot: 0 });
    expect(validateRaceTrack(t)).toEqual({ ok: true });
  });
});

describe("deriveRaceTrackTitle", () => {
  it("returns the kid's chosen name, trimmed", () => {
    expect(deriveRaceTrackTitle({ ...valid(), name: "  Zippy Trail " })).toBe(
      "Zippy Trail",
    );
  });

  it("returns null for missing/blank/non-string names", () => {
    expect(deriveRaceTrackTitle({})).toBeNull();
    expect(deriveRaceTrackTitle({ name: "   " })).toBeNull();
    expect(deriveRaceTrackTitle({ name: 7 })).toBeNull();
    expect(deriveRaceTrackTitle(null)).toBeNull();
  });
});
