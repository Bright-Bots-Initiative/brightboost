import type {
  ElementId,
  ElementClass,
  ElementDef,
  InputPred,
  OutputSpec,
  ReactionDef,
  ReactionId,
  GlyphDef,
  GlyphKind,
  Axial,
  Glyph,
} from "./types";
import { add, rotate } from "./board";
/** Deep freezing includes every predicate, offset, slot and output descriptor. */
export function freezeTree<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value as Record<string, unknown>))
      freezeTree(item);
    Object.freeze(value);
  }
  return value;
}
export const LADDER: readonly ElementId[] = freezeTree([
  "copper",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
] as ElementId[]);
const elements: [ElementId, ElementClass, string, string][] = [
  ["essence", "base", "◇", "diamond-outline"],
  ["fire", "cardinal", "🔥", "flame"],
  ["water", "cardinal", "💧", "drop"],
  ["air", "cardinal", "💨", "spiral"],
  ["earth", "cardinal", "🪨", "rock"],
  ["grass", "derived", "🌱", "sprout"],
  ["life", "derived", "🌿", "leaf"],
  ["death", "derived", "✕", "cross"],
  ["balance", "derived", "⚖", "scales"],
  ["omni", "derived", "✧", "star"],
  ["copper", "ladder", "Cu", "square"],
  ["silver", "ladder", "Ag", "crescent"],
  ["gold", "ladder", "Au", "sun"],
  ["platinum", "ladder", "Pt", "shield"],
  ["emerald", "ladder", "Em", "gem-hex"],
  ["diamond", "ladder", "Di", "gem-kite"],
  ["catalyst", "special", "✦", "spark"],
];
export const ELEMENTS = freezeTree(
  Object.fromEntries(
    elements.map(([id, cls, icon, shape]) => [
      id,
      {
        id,
        cls,
        icon,
        shape,
        ...(cls === "ladder" ? { rung: LADDER.indexOf(id) + 1 } : {}),
      },
    ]),
  ),
) as Readonly<Record<ElementId, ElementDef>>;
const el = (element: ElementId): InputPred => ({ kind: "element", element });
const out = (element: ElementId): OutputSpec => ({ kind: "element", element });
const rung: InputPred = { kind: "ladder", bind: "n" };
const cardinal: InputPred = { kind: "class", cls: "cardinal" };
export const REACTIONS: readonly ReactionDef[] = freezeTree([
  {
    id: "simplify",
    inputs: [cardinal],
    outputs: [out("essence")],
    capsAtDiamond: false,
  },
  {
    id: "duplicate",
    inputs: [el("essence"), cardinal],
    outputs: [
      { kind: "copy", fromInput: 1 },
      { kind: "copy", fromInput: 1 },
    ],
    capsAtDiamond: false,
  },
  {
    id: "growth",
    inputs: [el("water"), el("earth")],
    outputs: [out("grass")],
    capsAtDiamond: false,
  },
  {
    id: "affect_death",
    inputs: [el("grass"), el("fire")],
    outputs: [out("death")],
    capsAtDiamond: false,
  },
  {
    id: "affect_life",
    inputs: [el("grass"), el("air")],
    outputs: [out("life")],
    capsAtDiamond: false,
  },
  {
    id: "realize",
    inputs: [el("death"), el("life")],
    outputs: [out("balance"), out("balance")],
    capsAtDiamond: false,
  },
  {
    id: "unification",
    inputs: [el("fire"), el("water"), el("air"), el("earth")],
    outputs: [out("omni")],
    capsAtDiamond: false,
  },
  {
    id: "compression",
    inputs: [rung, rung],
    outputs: [{ kind: "promote", from: "n" }],
    capsAtDiamond: true,
  },
  {
    id: "refinement",
    inputs: [rung, el("catalyst")],
    outputs: [{ kind: "promote", from: "n" }],
    capsAtDiamond: true,
  },
  {
    id: "destroy",
    inputs: [{ kind: "any" }],
    outputs: [],
    capsAtDiamond: false,
  },
] as ReactionDef[]);
const offsets = (...xy: [number, number][]): Axial[] =>
  xy.map(([q, r]) => ({ q, r }));
const glyph = (
  kind: GlyphKind,
  cellOffsets: Axial[],
  inputSlots: number[],
  outputSlots: number[],
  cost: number,
  reactionIds: ReactionId[],
  consumeSlots: number[] = [],
): GlyphDef => ({
  kind,
  cellOffsets,
  inputSlots,
  outputSlots,
  consumeSlots,
  cost,
  reactionIds,
});
/** Draft #720 footprint choices are recorded in ENGINE-POLICIES.md (not owner approval). */
export const GLYPHS: Readonly<Record<GlyphKind, GlyphDef>> = freezeTree({
  simplify: glyph("simplify", offsets([0, 0]), [0], [0], 20, ["simplify"]),
  duplicate: glyph("duplicate", offsets([0, 0], [1, 0]), [0, 1], [0, 1], 20, [
    "duplicate",
  ]),
  growth: glyph("growth", offsets([0, 0], [1, 0], [0, 1]), [1, 2], [0], 20, [
    "growth",
  ]),
  compression: glyph(
    "compression",
    offsets([0, 0], [-1, 0], [1, 0]),
    [1, 2],
    [0],
    20,
    ["compression"],
  ),
  refinement: glyph(
    "refinement",
    offsets([0, 0], [1, 0]),
    [0, 1],
    [0],
    20,
    ["refinement"],
    [1],
  ),
  affect: glyph("affect", offsets([0, 0], [1, 0]), [0, 1], [0], 20, [
    "affect_death",
    "affect_life",
  ]),
  realize: glyph(
    "realize",
    offsets([0, 0], [1, 0], [0, 1], [1, 1]),
    [0, 1],
    [2, 3],
    30,
    ["realize"],
  ),
  unification: glyph(
    "unification",
    offsets([0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0]),
    [1, 2, 3, 4],
    [0],
    40,
    ["unification"],
  ),
  destroy: glyph("destroy", offsets([0, 0]), [0], [], 10, ["destroy"]),
  // Provisional 10 currency: the design has no bond-glyph cost row.
  bond_single: glyph("bond_single", offsets([0, 0], [1, 0]), [], [], 10, []),
});
export function glyphCells(g: Glyph): Axial[] {
  return GLYPHS[g.kind].cellOffsets.map((v) =>
    add(g.anchor, rotate(v, g.facing)),
  );
}
export function promote(element: ElementId): ElementId {
  const at = LADDER.indexOf(element);
  if (at < 0) throw new Error("GW_NOT_LADDER_ELEMENT");
  return LADDER[Math.min(at + 1, LADDER.length - 1)];
}
/** Stable multiset assignment, preserving the binding shared by all [n] inputs. */
export function resolveReaction(
  id: ReactionId,
  inputs: readonly ElementId[],
): readonly ElementId[] | null {
  const def = REACTIONS.find((row) => row.id === id);
  if (
    !def ||
    def.inputs.length !== inputs.length ||
    inputs.some((x) => !Object.prototype.hasOwnProperty.call(ELEMENTS, x))
  )
    return null;
  const bound: ElementId[] = [];
  const used = new Set<number>();
  function assign(i: number, n: ElementId | null): boolean {
    if (i === def!.inputs.length) return true;
    const pred = def!.inputs[i];
    for (let j = 0; j < inputs.length; j++) {
      if (used.has(j)) continue;
      const value = inputs[j],
        meta = ELEMENTS[value];
      const ok =
        pred.kind === "any" ||
        (pred.kind === "element" && pred.element === value) ||
        (pred.kind === "class" && pred.cls === meta.cls) ||
        (pred.kind === "ladder" &&
          meta.cls === "ladder" &&
          (n === null || n === value));
      if (!ok) continue;
      used.add(j);
      bound[i] = value;
      if (assign(i + 1, pred.kind === "ladder" ? value : n)) return true;
      used.delete(j);
    }
    return false;
  }
  if (!assign(0, null)) return null;
  return def.outputs.map((spec) =>
    spec.kind === "element"
      ? spec.element
      : spec.kind === "copy"
        ? bound[spec.fromInput]
        : promote(bound[def.inputs.findIndex((p) => p.kind === "ladder")]),
  );
}
