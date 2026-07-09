/**
 * Boost Track Builder — pure model (Set 3 · game 1 · "mastery through making").
 *
 * Everything here is a pure function or constant so the game rules are
 * unit-testable without React: grid/connectivity walking, ride physics
 * (curve tolerance, wobble, spin-out, boost, finish), piece unlocks,
 * the name kit, the pattern book, the reflect-prompt pool, and scoring.
 *
 * The kid's track persists as a `Creation` with `type: "race_track"`;
 * `RaceTrackContent` below IS the `content` JSON shape. The backend twin of
 * `validateRaceTrackContent` lives in `backend/src/services/raceTrack.ts`
 * (the security boundary) — keep the schema + rideability rules in sync,
 * mirroring how Data Dash duplicates its card pool across the boundary.
 */
import { z } from "zod";
import type { GameResult } from "./shared/GameShell";
import type { GradeBand } from "./gradeBandContent";

// ── Content shape ───────────────────────────────────────────────────────────

export const PIECE_TYPES = [
  "start",
  "straight",
  "gentleCurve",
  "sharpCurve",
  "boost",
  "finish",
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];
export type Rot = 0 | 90 | 180 | 270;

export interface TrackPiece {
  x: number;
  y: number;
  type: PieceType;
  rot: Rot;
}

export interface RaceTrackContent {
  v: 1;
  name: string;
  grid: { w: number; h: number };
  pieces: TrackPiece[];
}

export const GRID_MIN = 4;
export const GRID_MAX = 12;
export const PIECES_MIN = 2;
export const PIECES_MAX = 64;
export const NAME_MAX = 24;

// Strict-parsed from day one: unknown keys are REJECTED at every level.
// This deliberately diverges from the Data Dash validator, which reads only
// known keys and lets extras through (#668) — do not replicate that gap.
const pieceSchema = z
  .object({
    x: z.number().int().min(0).max(GRID_MAX - 1),
    y: z.number().int().min(0).max(GRID_MAX - 1),
    type: z.enum(PIECE_TYPES),
    rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  })
  .strict();

export const raceTrackSchema = z
  .object({
    v: z.literal(1),
    name: z.string().min(1).max(NAME_MAX),
    grid: z
      .object({
        w: z.number().int().min(GRID_MIN).max(GRID_MAX),
        h: z.number().int().min(GRID_MIN).max(GRID_MAX),
      })
      .strict(),
    pieces: z.array(pieceSchema).min(PIECES_MIN).max(PIECES_MAX),
  })
  .strict();

// ── Grid connectivity ───────────────────────────────────────────────────────

export type Dir = "N" | "E" | "S" | "W";
const DIRS: Dir[] = ["N", "E", "S", "W"];
const DELTA: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};
const OPPOSITE: Record<Dir, Dir> = { N: "S", E: "W", S: "N", W: "E" };

function rotateDir(d: Dir, rot: Rot): Dir {
  return DIRS[(DIRS.indexOf(d) + rot / 90) % 4];
}

/**
 * Which cell sides a piece connects to. Curves join two adjacent sides
 * (base rot 0 = N↔E); straights/boosts join opposite sides; the start has
 * a single exit; the finish accepts entry from ANY side (K-2 friendliness:
 * a kid never has to rotate the finish flag to make their track work).
 */
export function pieceConnections(piece: TrackPiece): Dir[] {
  switch (piece.type) {
    case "straight":
    case "boost":
      return piece.rot % 180 === 0 ? ["W", "E"] : ["N", "S"];
    case "gentleCurve":
    case "sharpCurve":
      return [rotateDir("N", piece.rot), rotateDir("E", piece.rot)];
    case "start":
      return [rotateDir("E", piece.rot)];
    case "finish":
      return ["N", "E", "S", "W"];
  }
}

export type WalkResult =
  | { ok: true; path: TrackPiece[] }
  | {
      ok: false;
      reason: "noStart" | "multipleStarts" | "brokenPath" | "loop";
      at?: { x: number; y: number };
    };

/**
 * Rideability walk: from the start's exit, follow piece connections cell by
 * cell until a finish is reached. Broken/dangling roads, wrong-way joins,
 * and closed loops that never reach a finish all fail with the offending
 * cell so the build UI can point at it kindly.
 */
export function walkTrack(content: {
  grid: { w: number; h: number };
  pieces: TrackPiece[];
}): WalkResult {
  const starts = content.pieces.filter((p) => p.type === "start");
  if (starts.length === 0) return { ok: false, reason: "noStart" };
  if (starts.length > 1) return { ok: false, reason: "multipleStarts" };

  const byCell = new Map<string, TrackPiece>();
  for (const p of content.pieces) byCell.set(`${p.x},${p.y}`, p);

  const start = starts[0];
  const path: TrackPiece[] = [start];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  let cur = start;
  let dir = pieceConnections(start)[0];

  for (let step = 0; step <= content.pieces.length; step++) {
    const [dx, dy] = DELTA[dir];
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    if (nx < 0 || ny < 0 || nx >= content.grid.w || ny >= content.grid.h) {
      return { ok: false, reason: "brokenPath", at: { x: cur.x, y: cur.y } };
    }
    const next = byCell.get(`${nx},${ny}`);
    if (!next) {
      return { ok: false, reason: "brokenPath", at: { x: nx, y: ny } };
    }
    if (next.type === "finish") {
      path.push(next);
      return { ok: true, path };
    }
    const entry = OPPOSITE[dir];
    const conns = pieceConnections(next);
    if (next.type === "start" || !conns.includes(entry)) {
      return { ok: false, reason: "brokenPath", at: { x: nx, y: ny } };
    }
    if (visited.has(`${nx},${ny}`)) {
      return { ok: false, reason: "loop", at: { x: nx, y: ny } };
    }
    visited.add(`${nx},${ny}`);
    const exit = conns.find((c) => c !== entry);
    if (!exit) {
      return { ok: false, reason: "brokenPath", at: { x: nx, y: ny } };
    }
    path.push(next);
    cur = next;
    dir = exit;
  }
  return { ok: false, reason: "loop", at: { x: cur.x, y: cur.y } };
}

// ── Client-side validator (mirror of backend/src/services/raceTrack.ts) ────

export type TrackValidation =
  | { ok: true; content: RaceTrackContent }
  | { ok: false; error: string; at?: { x: number; y: number } };

export function validateRaceTrackContent(content: unknown): TrackValidation {
  const parsed = raceTrackSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `${issue.path.join(".") || "content"}: ${issue.message}`,
    };
  }
  const track = parsed.data as RaceTrackContent;
  const seen = new Set<string>();
  for (const p of track.pieces) {
    if (p.x >= track.grid.w || p.y >= track.grid.h) {
      return { ok: false, error: "piece outside the grid", at: { x: p.x, y: p.y } };
    }
    const key = `${p.x},${p.y}`;
    if (seen.has(key)) {
      return { ok: false, error: "two pieces on the same cell", at: { x: p.x, y: p.y } };
    }
    seen.add(key);
  }
  if (!track.pieces.some((p) => p.type === "finish")) {
    return { ok: false, error: "track needs a finish flag" };
  }
  const walk = walkTrack(track);
  if (!walk.ok) {
    return { ok: false, error: `track is not rideable (${walk.reason})`, at: walk.at };
  }
  return { ok: true, content: track };
}

// ── Ride physics (tuned for feel; all constants in one place) ──────────────

/**
 * Curve tolerance = the max throttle (0..1) at which a curve is guaranteed
 * survivable, per grade band. K-2 Guided: sharp curves survive at ≤40%
 * throttle; higher bands tighten to ~25% (band-scaled difficulty).
 * A small grace band above tolerance wobbles-but-survives so K-2 riders
 * don't hit a knife-edge cliff; beyond the grace it's a spin-out.
 */
export const CURVE_TOLERANCE: Record<
  GradeBand,
  { gentleCurve: number; sharpCurve: number }
> = {
  k2: { gentleCurve: 0.7, sharpCurve: 0.4 },
  g3_5: { gentleCurve: 0.6, sharpCurve: 0.25 },
};

export interface RideTuning {
  /** cells/second at throttle 0 (the bike always creeps forward) */
  minAdvance: number;
  /** cells/second at throttle 1 */
  maxAdvance: number;
  /** throttle gain per second when NOT leaning */
  accel: number;
  /** throttle loss per second while leaning (brakes bite fast) */
  leanDecel: number;
  /** throttle the bike settles at while leaning — below every sharp
   *  tolerance, so "hold to lean" through a curve always works */
  leanTarget: number;
  /** wobble-but-survive band above a curve's tolerance */
  wobbleGrace: number;
}

export const DEFAULT_RIDE_TUNING: RideTuning = {
  minAdvance: 0.6,
  maxAdvance: 2.4,
  accel: 0.45,
  leanDecel: 1.3,
  leanTarget: 0.2,
  wobbleGrace: 0.1,
};

export interface RideState {
  /** index into the walked path */
  pieceIndex: number;
  /** 0..1 progress within the current piece */
  progress: number;
  /** throttle 0..1 */
  speed: number;
  spinOuts: number;
  boostsHit: number;
  wobbling: boolean;
  finished: boolean;
}

export interface RideEvents {
  entered?: PieceType;
  wobbled?: boolean;
  spunOut?: boolean;
  boosted?: boolean;
  finished?: boolean;
}

export function initialRideState(): RideState {
  return {
    pieceIndex: 0,
    progress: 0,
    speed: 0.4,
    spinOuts: 0,
    boostsHit: 0,
    wobbling: false,
    finished: false,
  };
}

/**
 * Advance the ride by dt seconds. Pure: returns the next state + events for
 * the frame. Spin-outs remount the bike at the START of the offending curve
 * with zero speed — the kid loses nothing, they just get to feel what their
 * design did (feedback, not failure).
 */
export function stepRide(
  state: RideState,
  path: TrackPiece[],
  dt: number,
  leaning: boolean,
  tolerance: { gentleCurve: number; sharpCurve: number },
  tuning: RideTuning = DEFAULT_RIDE_TUNING,
): { state: RideState; events: RideEvents } {
  if (state.finished) return { state, events: {} };
  const events: RideEvents = {};
  const next: RideState = { ...state };

  // Throttle: lean pulls speed down toward leanTarget, release accelerates.
  if (leaning) {
    next.speed = Math.max(tuning.leanTarget, next.speed - tuning.leanDecel * dt);
  } else {
    next.speed = Math.min(1, next.speed + tuning.accel * dt);
  }

  const advance =
    (tuning.minAdvance + next.speed * (tuning.maxAdvance - tuning.minAdvance)) * dt;
  next.progress += advance;

  while (next.progress >= 1 && !next.finished) {
    next.progress -= 1;
    next.pieceIndex += 1;
    const piece = path[next.pieceIndex];
    if (!piece) {
      // Defensive: walked path always ends in a finish, but never crash a ride.
      next.finished = true;
      events.finished = true;
      break;
    }
    events.entered = piece.type;
    next.wobbling = false;

    if (piece.type === "finish") {
      next.finished = true;
      next.progress = 0;
      events.finished = true;
      break;
    }
    if (piece.type === "boost") {
      next.speed = 1;
      next.boostsHit += 1;
      events.boosted = true;
      continue;
    }
    if (piece.type === "gentleCurve" || piece.type === "sharpCurve") {
      const tol = tolerance[piece.type];
      if (next.speed > tol + tuning.wobbleGrace) {
        // Spin-out: remount at the start of this curve, throttle zeroed.
        next.spinOuts += 1;
        next.progress = 0;
        next.speed = 0;
        next.wobbling = false;
        events.spunOut = true;
        break;
      }
      if (next.speed > tol) {
        next.wobbling = true;
        next.speed = tol;
        events.wobbled = true;
      }
    }
  }

  return { state: next, events };
}

// ── Starter track + palette unlocks ────────────────────────────────────────

export const DEFAULT_GRID = { w: 8, h: 8 };

/** The supported floor: the grid never opens blank — this already rides. */
export function starterTrack(): TrackPiece[] {
  return [
    { x: 1, y: 3, type: "start", rot: 0 },
    { x: 2, y: 3, type: "straight", rot: 0 },
    { x: 3, y: 3, type: "finish", rot: 0 },
  ];
}

/** Base palette available from the first tap. */
export const BASE_PALETTE: PieceType[] = ["straight", "gentleCurve", "finish"];

/**
 * Pieces unlock on COMPLETED rides only (crossed the finish — remounts
 * count, spin-outs never gate progress): one completed ride per unlock.
 */
export const PIECE_UNLOCKS: { type: PieceType; ridesRequired: number }[] = [
  { type: "sharpCurve", ridesRequired: 1 },
  { type: "boost", ridesRequired: 2 },
];

export function unlockedPieceTypes(ridesCompleted: number): PieceType[] {
  return [
    ...BASE_PALETTE,
    ...PIECE_UNLOCKS.filter((u) => ridesCompleted >= u.ridesRequired).map(
      (u) => u.type,
    ),
  ];
}

/** Which pieces unlocked between two ride counts — drives the announce beat. */
export function newlyUnlocked(
  ridesBefore: number,
  ridesAfter: number,
): PieceType[] {
  return PIECE_UNLOCKS.filter(
    (u) => ridesBefore < u.ridesRequired && ridesAfter >= u.ridesRequired,
  ).map((u) => u.type);
}

// ── Name kit (structured choices, no free text) ────────────────────────────

type LocalizedLabel = Record<string, string>;

export const NAME_KIT_ADJECTIVES: { id: string; label: LocalizedLabel }[] = [
  { id: "super", label: { en: "Super", es: "Súper" } },
  { id: "zippy", label: { en: "Zippy", es: "Veloz" } },
  { id: "loopy", label: { en: "Loopy", es: "Rulera" } },
  { id: "mega", label: { en: "Mega", es: "Mega" } },
  { id: "wiggly", label: { en: "Wiggly", es: "Zigzagueante" } },
  { id: "turbo", label: { en: "Turbo", es: "Turbo" } },
];

export const NAME_KIT_NOUNS: { id: string; label: LocalizedLabel }[] = [
  { id: "track", label: { en: "Track", es: "Pista" } },
  { id: "loop", label: { en: "Loop", es: "Circuito" } },
  { id: "speedway", label: { en: "Speedway", es: "Autopista" } },
  { id: "trail", label: { en: "Trail", es: "Sendero" } },
  { id: "zigzag", label: { en: "Zigzag", es: "Zigzag" } },
  { id: "rally", label: { en: "Rally", es: "Rally" } },
];

/**
 * Duplicate-name guard: auto-suffix a number rather than blocking a K-2
 * kid with an error ("Big Loop" → "Big Loop 2").
 */
export function suggestUniqueName(
  base: string,
  existingTitles: (string | null | undefined)[],
): string {
  const taken = new Set(
    existingTitles.filter((t): t is string => !!t).map((t) => t.trim().toLowerCase()),
  );
  const trimmed = base.trim().slice(0, NAME_MAX);
  if (!taken.has(trimmed.toLowerCase())) return trimmed;
  for (let n = 2; n < 100; n++) {
    const candidate = `${trimmed} ${n}`.slice(0, NAME_MAX);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return trimmed;
}

// ── Pattern book (examples show possibility, never dictate solutions) ──────

export interface TrackPattern {
  id: string;
  name: LocalizedLabel;
  grid: { w: number; h: number };
  pieces: TrackPiece[];
}

export const PATTERN_BOOK: TrackPattern[] = [
  {
    id: "bigLoop",
    name: { en: "The Big Loop", es: "El Gran Circuito" },
    grid: { ...DEFAULT_GRID },
    pieces: [
      { x: 2, y: 1, type: "start", rot: 0 },
      { x: 3, y: 1, type: "straight", rot: 0 },
      { x: 4, y: 1, type: "straight", rot: 0 },
      { x: 5, y: 1, type: "gentleCurve", rot: 180 },
      { x: 5, y: 2, type: "straight", rot: 90 },
      { x: 5, y: 3, type: "straight", rot: 90 },
      { x: 5, y: 4, type: "gentleCurve", rot: 270 },
      { x: 4, y: 4, type: "straight", rot: 0 },
      { x: 3, y: 4, type: "straight", rot: 0 },
      { x: 2, y: 4, type: "gentleCurve", rot: 0 },
      { x: 2, y: 3, type: "straight", rot: 90 },
      { x: 2, y: 2, type: "finish", rot: 0 },
    ],
  },
  {
    id: "zigZag",
    name: { en: "The Zigzag", es: "El Zigzag" },
    grid: { ...DEFAULT_GRID },
    pieces: [
      { x: 1, y: 2, type: "start", rot: 0 },
      { x: 2, y: 2, type: "straight", rot: 0 },
      { x: 3, y: 2, type: "gentleCurve", rot: 180 },
      { x: 3, y: 3, type: "gentleCurve", rot: 0 },
      { x: 4, y: 3, type: "straight", rot: 0 },
      { x: 5, y: 3, type: "gentleCurve", rot: 180 },
      { x: 5, y: 4, type: "gentleCurve", rot: 0 },
      { x: 6, y: 4, type: "finish", rot: 0 },
    ],
  },
  {
    id: "speedway",
    name: { en: "The Speedway", es: "La Autopista" },
    grid: { ...DEFAULT_GRID },
    pieces: [
      { x: 0, y: 3, type: "start", rot: 0 },
      { x: 1, y: 3, type: "straight", rot: 0 },
      { x: 2, y: 3, type: "straight", rot: 0 },
      { x: 3, y: 3, type: "straight", rot: 0 },
      { x: 4, y: 3, type: "straight", rot: 0 },
      { x: 5, y: 3, type: "straight", rot: 0 },
      { x: 6, y: 3, type: "gentleCurve", rot: 180 },
      { x: 6, y: 4, type: "finish", rot: 0 },
    ],
  },
];

// ── Soft targets (suggestions, never requirements) ─────────────────────────

export interface SoftTargetContext {
  path: TrackPiece[];
  boostsHit: number;
  piecesOnTrack: number;
}

export const SOFT_TARGETS: {
  id: string;
  met: (ctx: SoftTargetContext) => boolean;
}[] = [
  {
    id: "twoCurves",
    met: (ctx) =>
      ctx.path.filter(
        (p) => p.type === "gentleCurve" || p.type === "sharpCurve",
      ).length >= 2,
  },
  {
    id: "useBoost",
    met: (ctx) => ctx.boostsHit >= 1,
  },
  {
    id: "eightPieces",
    met: (ctx) => ctx.piecesOnTrack >= 8,
  },
];

// ── Reflect pool (context-aware; curious, never corrective) ────────────────

export interface ReflectContext {
  spinOuts: number;
  boostsHit: number;
  /** a piece type ridden for the first time since its unlock, if any */
  newPieceRidden?: PieceType;
}

export interface ReflectPrompt {
  key: string;
  params?: Record<string, unknown>;
}

/**
 * Pick ONE wondering question for the post-ride Reflect beat. Priority:
 * a just-unlocked piece that shaped the ride > repeated spin-outs > a single
 * spin-out > a boost moment > a clean ride > the evergreen fallback.
 * All six keys live under games.trackMaker.reflect.* with EN + ES copy.
 */
export function pickReflectPrompt(
  ctx: ReflectContext,
  rand: () => number = Math.random,
): ReflectPrompt {
  if (ctx.newPieceRidden) {
    return { key: "games.trackMaker.reflect.newPiece" };
  }
  if (ctx.spinOuts >= 2) {
    return {
      key: "games.trackMaker.reflect.spinOuts",
      params: { count: ctx.spinOuts },
    };
  }
  if (ctx.spinOuts === 1) {
    return { key: "games.trackMaker.reflect.oneSpin" };
  }
  if (ctx.boostsHit >= 1) {
    return { key: "games.trackMaker.reflect.boost" };
  }
  return rand() < 0.5
    ? { key: "games.trackMaker.reflect.clean" }
    : { key: "games.trackMaker.reflect.proud" };
}

// ── Scoring (measures creation, not completion — and never speed) ──────────

export interface TrackMakerSummary {
  rideable: boolean;
  ridesCompleted: number;
  /** edited the track after a ride, then completed another ride */
  iterated: boolean;
  targetsMet: number;
  /** longest run of completed rides with zero spin-outs */
  bestCleanStreak: number;
  spinOuts: number;
  tweaks: number;
  sharedToGallery: boolean;
}

export const TRACK_MAKER_TOTAL = 6;

/**
 * Creation-milestone score (integer, byte-compatible with the platform
 * contract): built a rideable track (+2), completed a ride (+2), iterated
 * after riding (+1), met a soft target (+1). No time, no ranking.
 */
export function buildTrackMakerResult(s: TrackMakerSummary): GameResult {
  const score =
    (s.rideable ? 2 : 0) +
    (s.ridesCompleted > 0 ? 2 : 0) +
    (s.iterated ? 1 : 0) +
    (s.targetsMet > 0 ? 1 : 0);
  return {
    gameKey: "track_maker",
    score,
    total: TRACK_MAKER_TOTAL,
    streakMax: s.bestCleanStreak,
    roundsCompleted: s.ridesCompleted,
    // Maker telemetry (iteration signals, not rankings). NOTE: the server
    // currently strips gameSpecific from complete-activity payloads (#672);
    // the durable artifact is the Creation row, so nothing here depends on
    // this persisting.
    gameSpecific: {
      ridesCompleted: s.ridesCompleted,
      tweaks: s.tweaks,
      spinOuts: s.spinOuts,
      targetsMet: s.targetsMet,
      sharedToGallery: s.sharedToGallery,
    },
  };
}

// ── Gallery thumbnail (mini SVG polyline; "" = caller falls back to 🏍️) ───

export function trackToPolylinePoints(
  content: { grid: { w: number; h: number }; pieces: TrackPiece[] },
  size = 48,
): string {
  const walk = walkTrack(content);
  if (!walk.ok || walk.path.length < 2) return "";
  const pad = 4;
  const scale = (size - pad * 2) / Math.max(content.grid.w, content.grid.h);
  return walk.path
    .map(
      (p) =>
        `${(pad + (p.x + 0.5) * scale).toFixed(1)},${(pad + (p.y + 0.5) * scale).toFixed(1)}`,
    )
    .join(" ");
}
