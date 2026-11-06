import { key, canonicalize } from "@shared/greatwork-engine";
import type {
  Axial,
  BoardBounds,
  Molecule,
  RunResult,
  SimState,
} from "@shared/greatwork-engine";
export interface Point {
  x: number;
  y: number;
}
export interface Camera {
  width: number;
  height: number;
  size: number;
  x: number;
  y: number;
}
export function axialToPixel(at: Axial, c: Camera): Point {
  return {
    x: c.x + c.size * Math.sqrt(3) * (at.q + at.r / 2),
    y: c.y + c.size * 1.5 * at.r,
  };
}
export function pixelToAxial(p: Point, c: Camera): Axial {
  const x = (p.x - c.x) / c.size,
    y = (p.y - c.y) / c.size;
  const q = (Math.sqrt(3) / 3) * x - y / 3,
    r = (2 / 3) * y,
    z = -q - r;
  let rq = Math.round(q),
    rr = Math.round(r);
  const rz = Math.round(z);
  if (
    Math.abs(rq - q) > Math.abs(rr - r) &&
    Math.abs(rq - q) > Math.abs(rz - z)
  )
    rq = -rr - rz;
  else if (Math.abs(rr - r) > Math.abs(rz - z)) rr = -rq - rz;
  return { q: Object.is(rq, -0) ? 0 : rq, r: Object.is(rr, -0) ? 0 : rr };
}
export function fitCamera(
  bounds: BoardBounds,
  width: number,
  height: number,
  zoom = 1,
  offset: Point = { x: 0, y: 0 },
): Camera {
  const w = Math.max(1, width),
    h = Math.max(1, height);
  const spanX =
    Math.sqrt(3) *
    (bounds.maxQ - bounds.minQ + (bounds.maxR - bounds.minR) / 2 + 1.4);
  const spanY = 1.5 * (bounds.maxR - bounds.minR) + 2.5;
  const size =
    Math.max(1, Math.min((w - 32) / spanX, (h - 36) / spanY)) *
    Math.max(1, Math.min(3, zoom));
  const q = (bounds.maxQ + bounds.minQ) / 2,
    r = (bounds.maxR + bounds.minR) / 2;
  return {
    width: w,
    height: h,
    size,
    x: w / 2 - size * Math.sqrt(3) * (q + r / 2) + offset.x,
    y: h / 2 - size * 1.5 * r + offset.y,
  };
}
export function hexVertices(at: Axial, camera: Camera, scale = 1): Point[] {
  const p = axialToPixel(at, camera);
  return Array.from({ length: 6 }, (_, i) => ({
    x: p.x + camera.size * scale * Math.cos((Math.PI / 3) * i - Math.PI / 6),
    y: p.y + camera.size * scale * Math.sin((Math.PI / 3) * i - Math.PI / 6),
  }));
}
export function cellInBounds(at: Axial, b: BoardBounds): boolean {
  return at.q >= b.minQ && at.q <= b.maxQ && at.r >= b.minR && at.r <= b.maxR;
}
export function clientPoint(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  camera: Camera,
): Point {
  return {
    x: ((x - rect.left) * camera.width) / rect.width,
    y: ((y - rect.top) * camera.height) / rect.height,
  };
}
export function engineArea(state: SimState): ReadonlySet<string> {
  return state.areaClaimed;
}
export type RunNoteKind =
  | "ready"
  | "made"
  | "solved"
  | "wrongProduct"
  | "mirror"
  | "collision"
  | "stall"
  | "limit";
export function classifyRun(
  result: RunResult | null,
  target: { molecule: Molecule; count: number } | null,
): RunNoteKind {
  if (!result) return "ready";
  if (result.mirrored) return "mirror";
  if (result.error?.kind === "collision") return "collision";
  if (target && result.solved) return "solved";
  if (result.produced.length) {
    if (!target) return "made";
    if (
      result.produced.some((p) => p.canonical !== canonicalize(target.molecule))
    )
      return "wrongProduct";
    return "made";
  }
  return result.error?.kind === "tick_limit" ? "limit" : "stall";
}
export function collisionKey(result: RunResult | null): string | null {
  return result?.error?.kind === "collision" ? key(result.error.at) : null;
}
