/**
 * race_track content validator — the security boundary for Boost Track
 * Builder creations (Set 3 · game 1).
 *
 * STRICT-PARSED FROM DAY ONE: every object level uses zod `.strict()`, so
 * unknown/extra JSON keys are REJECTED, not stored. This deliberately
 * diverges from the Data Dash validator, which reads only its known keys
 * and lets extras sail through into the persisted `content` (#668) — that
 * gap must not be replicated in new creation types.
 *
 * Frontend mirror (instant author-time feedback): keep the schema and the
 * rideability rules in sync with `src/components/games/trackMakerModel.ts`,
 * the same way Data Dash mirrors its card pool across the boundary.
 */
import { z } from "zod";
import type { ContentValidation } from "./creationContent";

export const RACE_TRACK_PIECE_TYPES = [
  "start",
  "straight",
  "gentleCurve",
  "sharpCurve",
  "boost",
  "finish",
] as const;
type PieceType = (typeof RACE_TRACK_PIECE_TYPES)[number];

const GRID_MIN = 4;
const GRID_MAX = 12;
const PIECES_MIN = 2;
const PIECES_MAX = 64;
const NAME_MAX = 24;

const pieceSchema = z
  .object({
    x: z.number().int().min(0).max(GRID_MAX - 1),
    y: z.number().int().min(0).max(GRID_MAX - 1),
    type: z.enum(RACE_TRACK_PIECE_TYPES),
    rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  })
  .strict();

const raceTrackSchema = z
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

type RaceTrack = z.infer<typeof raceTrackSchema>;
type Piece = RaceTrack["pieces"][number];

// ── Connectivity (must match the frontend model) ───────────────────────────

type Dir = "N" | "E" | "S" | "W";
const DIRS: Dir[] = ["N", "E", "S", "W"];
const DELTA: Record<Dir, [number, number]> = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};
const OPPOSITE: Record<Dir, Dir> = { N: "S", E: "W", S: "N", W: "E" };

function rotateDir(d: Dir, rot: number): Dir {
  return DIRS[(DIRS.indexOf(d) + rot / 90) % 4];
}

function pieceConnections(piece: Piece): Dir[] {
  switch (piece.type as PieceType) {
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

/**
 * Rideability guard: the walk from the start's exit must reach a finish.
 * A track that passes this can always be ridden by a classmate — the same
 * "peers can never open a broken creation" guarantee Data Dash's
 * solvability guard provides.
 */
function isRideable(track: RaceTrack): { ok: true } | { ok: false; error: string } {
  const byCell = new Map<string, Piece>();
  for (const p of track.pieces) byCell.set(`${p.x},${p.y}`, p);

  const start = track.pieces.find((p) => p.type === "start") as Piece;
  const visited = new Set<string>([`${start.x},${start.y}`]);
  let cur = start;
  let dir = pieceConnections(start)[0];

  for (let step = 0; step <= track.pieces.length; step++) {
    const [dx, dy] = DELTA[dir];
    const nx = cur.x + dx;
    const ny = cur.y + dy;
    if (nx < 0 || ny < 0 || nx >= track.grid.w || ny >= track.grid.h) {
      return { ok: false, error: "track is not rideable: the road leaves the grid" };
    }
    const next = byCell.get(`${nx},${ny}`);
    if (!next) {
      return { ok: false, error: "track is not rideable: the road ends before a finish" };
    }
    if (next.type === "finish") return { ok: true };
    const entry = OPPOSITE[dir];
    const conns = pieceConnections(next);
    if (next.type === "start" || !conns.includes(entry)) {
      return { ok: false, error: "track is not rideable: pieces do not connect" };
    }
    if (visited.has(`${nx},${ny}`)) {
      return { ok: false, error: "track is not rideable: the road loops without a finish" };
    }
    visited.add(`${nx},${ny}`);
    const exit = conns.find((c) => c !== entry);
    if (!exit) {
      return { ok: false, error: "track is not rideable: pieces do not connect" };
    }
    cur = next;
    dir = exit;
  }
  return { ok: false, error: "track is not rideable: the road loops without a finish" };
}

// ── The validator ───────────────────────────────────────────────────────────

export function validateRaceTrack(content: unknown): ContentValidation {
  const parsed = raceTrackSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.join(".") || "content";
    return { ok: false, error: `${path}: ${issue.message}` };
  }
  const track = parsed.data;

  const seen = new Set<string>();
  for (const p of track.pieces) {
    if (p.x >= track.grid.w || p.y >= track.grid.h) {
      return { ok: false, error: "piece outside the grid" };
    }
    const key = `${p.x},${p.y}`;
    if (seen.has(key)) {
      return { ok: false, error: "two pieces on the same cell" };
    }
    seen.add(key);
  }

  const starts = track.pieces.filter((p) => p.type === "start").length;
  if (starts === 0) return { ok: false, error: "track needs a start" };
  if (starts > 1) return { ok: false, error: "track can only have one start" };
  if (!track.pieces.some((p) => p.type === "finish")) {
    return { ok: false, error: "track needs a finish flag" };
  }

  const rideable = isRideable(track);
  if (!rideable.ok) return rideable;

  return { ok: true };
}

/** Server-authoritative title for a race_track creation: the kid's chosen
 *  name from the structured name-kit (already length-bounded by the schema). */
export function deriveRaceTrackTitle(content: unknown): string | null {
  if (typeof content !== "object" || content === null) return null;
  const name = (content as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
