import type { MachineSpec, Part } from "./types";
import { GLYPHS } from "./reactions";
export function partCost(p: Part): number {
  switch (p.kind) {
    case "arm":
      return { 1: 20, 2: 30, 3: 30, 6: 40 }[p.grabbers] + 10 * (p.reach - 1);
    case "glyph":
      return GLYPHS[p.glyph.kind].cost;
    case "track":
      return 5 * p.cells.length; // Cost surface exists; placement rejects P2 tracks.
    default:
      return 0;
  }
}
export function totalCost(program: MachineSpec): number {
  return program.parts.reduce((sum, p) => sum + partCost(p), 0);
}
export function countInstructions(program: MachineSpec): number {
  return program.tapes.reduce((sum, t) => sum + t.chips.length, 0);
}
