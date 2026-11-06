import type { Axial, CellKey, HexDir, Arm, BoardBounds } from "./types";
/** Direction 0 points along +q; increasing indexes follow the documented CW transform. */
export const NEIGHBOURS: readonly Axial[] = Object.freeze(
  [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ].map((c) => Object.freeze(c)),
);
export const add = (a: Axial, b: Axial): Axial => ({
  q: a.q + b.q,
  r: a.r + b.r,
});
export const subtract = (a: Axial, b: Axial): Axial => ({
  q: a.q - b.q,
  r: a.r - b.r,
});
export const key = (a: Axial): CellKey =>
  `${a.q === 0 ? 0 : a.q},${a.r === 0 ? 0 : a.r}`;
export const equal = (a: Axial, b: Axial): boolean =>
  a.q === b.q && a.r === b.r;
export const compareAxial = (a: Axial, b: Axial): number =>
  a.q - b.q || a.r - b.r;
export const distance = (a: Axial): number =>
  Math.max(Math.abs(a.q), Math.abs(a.r), Math.abs(a.q + a.r));
export function direction(n: number): HexDir {
  return (((n % 6) + 6) % 6) as HexDir;
}
export function neighbour(a: Axial, d: HexDir): Axial {
  return add(a, NEIGHBOURS[d]);
}
export function rotate(a: Axial, steps: number): Axial {
  if (!Number.isSafeInteger(steps)) throw new Error("GW_ROTATION_NOT_INTEGER");
  let q = a.q,
    r = a.r;
  for (let i = 0; i < direction(steps); i++) [q, r] = [-r, q + r];
  return { q: q === 0 ? 0 : q, r: r === 0 ? 0 : r };
}
export function reflect(a: Axial): Axial {
  return { q: a.q, r: -a.q - a.r };
}
export function within(a: Axial, b: BoardBounds): boolean {
  return a.q >= b.minQ && a.q <= b.maxQ && a.r >= b.minR && a.r <= b.maxR;
}
export function tips(
  arm: Pick<Arm, "anchor" | "reach" | "grabbers" | "facing">,
): Axial[] {
  return Array.from({ length: arm.grabbers }, (_, i) => {
    const d = NEIGHBOURS[direction(arm.facing + i * (6 / arm.grabbers))];
    return add(arm.anchor, { q: d.q * arm.reach, r: d.r * arm.reach });
  });
}
export function armCells(
  arm: Pick<Arm, "anchor" | "reach" | "grabbers" | "facing">,
): Axial[] {
  const cells = [arm.anchor];
  for (let i = 0; i < arm.grabbers; i++) {
    const d = NEIGHBOURS[direction(arm.facing + i * (6 / arm.grabbers))];
    for (let r = 1; r <= arm.reach; r++)
      cells.push(add(arm.anchor, { q: d.q * r, r: d.r * r }));
  }
  return cells;
}
/**
 * Draft lattice sweep policy: walk the hex-distance ring, not a floating-point
 * circle or endpoint-only chord. A 60-degree turn covers exactly radius edges.
 * The rings of every spoke cell cover the arm body; carried atoms use this same
 * function. Example: (3,0) -> (2,1) -> (1,2) -> (0,3).
 */
export function sweep(a: Axial, anchor: Axial, turn: -1 | 0 | 1): Axial[] {
  const v = subtract(a, anchor),
    radius = distance(v);
  if (!turn || !radius) return [a];
  const ring: Axial[] = [];
  let p = { q: radius, r: 0 };
  for (let side = 0; side < 6; side++) {
    const d = NEIGHBOURS[direction(side + 2)];
    for (let i = 0; i < radius; i++) {
      ring.push(p);
      p = add(p, d);
    }
  }
  const start = ring.findIndex((c) => equal(c, v));
  if (start < 0) throw new Error("GW_SWEEP_OFF_RING");
  return Array.from({ length: radius + 1 }, (_, i) =>
    add(anchor, ring[(start + turn * i + ring.length) % ring.length]),
  );
}
/** Shortest return; exactly opposite orientations choose CW deterministically. */
export function resetTurn(current: HexDir, initial: HexDir): -1 | 0 | 1 {
  const delta = direction(initial - current);
  return delta === 0 ? 0 : delta <= 3 ? 1 : -1;
}
