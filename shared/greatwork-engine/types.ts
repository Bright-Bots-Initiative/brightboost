/** #720: pure ES2019 contracts. No DOM, Node or persistence dependencies. */
// board
export interface Axial {
  readonly q: number; // §8.1: integers only, never a float
  readonly r: number;
}
export type HexDir = 0 | 1 | 2 | 3 | 4 | 5; // indexes NEIGHBOURS; ROTATE steps by 1 (§7)
export type CellKey = string; // canonical "q,r" (§8.1: never a bare number key)
export interface Cell {
  // [P]
  readonly at: Axial;
  readonly atomId: AtomId | null;
  readonly glyphId: GlyphId | null;
  readonly staticId: PartId | null;
}
export interface Board {
  // [P]
  readonly cells: ReadonlyMap<CellKey, Cell>;
  readonly bounds: {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
  };
}
// chemistry (§4)
export type ElementId =
  | "essence"
  | "fire"
  | "water"
  | "air"
  | "earth" // the four cardinals
  | "grass"
  | "life"
  | "death"
  | "balance"
  | "omni" // the five derived
  | "copper"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "diamond" // ladder rungs 1 to 6
  | "catalyst"; // seventeen in total (§4.1), and the count is asserted
export type ElementClass =
  | "base"
  | "cardinal"
  | "derived"
  | "ladder"
  | "special";
export interface ElementDef {
  readonly id: ElementId;
  readonly cls: ElementClass;
  readonly icon: string;
  readonly shape: string; // §4.1 and §19.2: identity never depends on colour alone
  readonly rung?: 1 | 2 | 3 | 4 | 5 | 6; // §4.2, ladder members only
}
// matter
export type AtomId = number; // fresh, monotonic, never reused (§8.2 step 4)
export interface Atom {
  readonly id: AtomId;
  readonly element: ElementId;
  readonly at: Axial;
}
export type BondOrder = 1 | 3; // [P]; single is [MVP] and triple is [P2] per §6.3
export interface Bond {
  readonly a: AtomId;
  readonly b: AtomId;
  readonly order: BondOrder;
}
export interface Molecule {
  // one connected component, relative to its own canonical origin (§8.4)
  readonly atoms: ReadonlyArray<{
    readonly element: ElementId;
    readonly at: Axial;
  }>;
  readonly bonds: ReadonlyArray<{
    readonly a: number; // indexes into atoms, not AtomIds
    readonly b: number;
    readonly order: BondOrder;
  }>;
}
// glyphs (§5, §6.3)
export type GlyphKind =
  | "simplify"
  | "duplicate"
  | "growth"
  | "compression"
  | "refinement"
  | "affect"
  | "realize"
  | "unification"
  | "destroy" // the nine of §5
  | "bond_single"; // §6.3
export interface GlyphDef {
  readonly kind: GlyphKind;
  readonly cellOffsets: ReadonlyArray<Axial>; // glyph-local space, index 0 at the origin
  readonly inputSlots: ReadonlyArray<number>; // indexes into cellOffsets, never coordinates
  readonly outputSlots: ReadonlyArray<number>;
  readonly consumeSlots: ReadonlyArray<number>; // [P]; §5's "any consumable cell"
  readonly cost: number;
  readonly reactionIds: ReadonlyArray<ReactionId>; // [P]; NOT singular, see below
}
// reactionIds is a list because the mapping is not one-to-one in either direction. "affect" fires two
// rows, affect_death and affect_life, chosen by which reagent is present. "bond_single" fires none: it
// changes bond topology, not elements, so it has no §4.3 row at all and its list is empty. A singular
// mandatory field cannot express either case, and GLYPHS below is total over all ten GlyphKinds.
export type GlyphId = number;
export type PartId = number;
export interface Glyph {
  readonly id: GlyphId;
  readonly kind: GlyphKind;
  readonly anchor: Axial;
  readonly facing: HexDir; // [P]; the open placement-orientation call in §5
}
// reactions (§4.3)
export type ReactionId =
  | "simplify"
  | "duplicate"
  | "growth"
  | "affect_death"
  | "affect_life"
  | "realize"
  | "unification"
  | "compression"
  | "refinement"
  | "destroy"; // exactly ten, matching §4.3 row for row
export type InputPred =
  | {
      readonly kind: "element";
      readonly element: ElementId;
    }
  | {
      readonly kind: "class";
      readonly cls: ElementClass;
    }
  | {
      readonly kind: "ladder";
      readonly bind: "n";
    } // Compression and Refinement
  | {
      readonly kind: "any";
    }; // Destroy: not an ElementClass, and typing it as one will not compile
export type OutputSpec =
  | {
      readonly kind: "element";
      readonly element: ElementId;
    }
  | {
      readonly kind: "promote";
      readonly from: "n";
    } // §4.2, caps at Diamond
  | {
      readonly kind: "copy";
      readonly fromInput: number;
    }; // [P]; Duplicate emits two of its Cardinal
// The third variant exists because Duplicate's §4.3 row is "Essence + 1 Cardinal -> 2 of that
// Cardinal". Its output is not a fixed element and not a promotion; it is whichever Cardinal arrived.
// Without it the ten-row table cannot be encoded, which a describe.each over REACTIONS would catch.
export interface ReactionDef {
  readonly id: ReactionId;
  readonly inputs: ReadonlyArray<InputPred>;
  readonly outputs: ReadonlyArray<OutputSpec>;
  readonly capsAtDiamond: boolean; // true on compression and refinement only
}
// machinery (§6.1, §6.2, §7)
export type GrabberCount = 1 | 2 | 3 | 6;
export type Reach = 1 | 2 | 3; // static at placement; there is no change-reach affordance
export interface Arm {
  readonly id: PartId;
  readonly anchor: Axial;
  readonly grabbers: GrabberCount;
  readonly reach: Reach;
  readonly facing: HexDir;
  readonly trackIndex: number; // [P2], §6.2
  readonly held: ReadonlyArray<AtomId>; // all grabbers act at once (§6.1)
}
export type Instruction =
  | "GRAB"
  | "DROP"
  | "ROTATE_CW"
  | "ROTATE_CCW"
  | "WAIT"
  | "RESET"
  | "REPEAT"
  // [P2], declared from Release 1 and left unimplemented:
  | "MOVE_PLUS"
  | "MOVE_MINUS"
  | "PIVOT_CW"
  | "PIVOT_CCW";
export interface Tape {
  readonly armId: PartId;
  readonly chips: ReadonlyArray<Instruction>; // one chip per tick, one lane per arm (§7)
}
// engine input
export interface MachineSpec {
  readonly parts: ReadonlyArray<Part>;
  readonly tapes: ReadonlyArray<Tape>;
} // and nothing else; §16.2 fixes its relationship to the persisted envelope
export type Part =
  | {
      readonly kind: "arm";
      readonly id: PartId;
      readonly anchor: Axial;
      readonly grabbers: GrabberCount;
      readonly reach: Reach;
      readonly facing: HexDir;
    }
  | {
      readonly kind: "glyph";
      readonly id: PartId;
      readonly glyph: Glyph;
    }
  | {
      readonly kind: "dispenser";
      readonly id: PartId;
      readonly at: Axial;
      readonly element: ElementId;
    }
  | {
      readonly kind: "acceptor";
      readonly id: PartId;
      readonly at: Axial;
    }
  | {
      readonly kind: "track";
      readonly id: PartId;
      readonly cells: ReadonlyArray<Axial>;
    }; // [P2]
// Level definitions live in src/constants/greatWorkLevels.ts (§16.3); the TYPE lives here.
// This document specifies no level schema, so every field below is [P]. Do not read §16.2's
// payload example as one: those lines describe a saved machine's content, not a level.
export interface LevelSpec {
  readonly key: string; // T1 to T7 now, C1 to C12 later. NOT T8: §12 is explicit that T8 is not a
  // level and has no board, target, count, fail state or win check. Do not add it here.
  readonly mode: "target" | "open"; // §11.2
  // Grade band is deliberately absent. The game consumes the platform-injected value and resolves
  // it to this grade-agnostic engine input before calling the engine (§19.1).
  readonly targetProduct?: Molecule;
  readonly targetCount?: number; // §11.4 and R15: 3 for K-2 and the tutorial, 6 for grades 3-5
  readonly fixedParts: ReadonlyArray<Part>; // R11: levels fix inputs, the studio does not
  readonly allowedGlyphs?: ReadonlyArray<GlyphKind>; // §5's allow-list; absent in the studio
  readonly maxTicks: number; // mandatory: REPEAT makes every tape an infinite loop (§8.2)
  /** Draft #720 extension: explicit finite board and walls, absent in open layouts. */
  readonly bounds?: BoardBounds;
  readonly walls?: ReadonlyArray<Axial>;
}
// results
export type RunError =
  | {
      readonly kind: "collision";
      readonly at: Axial;
      readonly tick: number;
    } // §8.2 step 3
  | {
      readonly kind: "stall";
      readonly tick: number;
    } // §9
  | {
      readonly kind: "tick_limit";
      readonly tick: number;
    }; // [P]; a result, never a throw
export interface ProducedEntry {
  readonly canonical: string;
  readonly molecule: Molecule;
  readonly count: number;
  readonly firstTick: number; // §8.6: append order is the record
}
export type ProductReport = ReadonlyArray<ProducedEntry>;
export interface RunResult {
  // §8.5's field list verbatim: do not add to it and do not rename within it
  readonly solved: boolean;
  readonly cycles: number;
  readonly cost: number;
  readonly area: number;
  readonly instructions: number;
  readonly produced: ProductReport;
  readonly mirrored?: boolean; // §8.4 and R9
  readonly error?: RunError;
}
export interface TickResult {
  // [P]; the per-tick projection the build surface plays back
  readonly tick: number;
  readonly board: Board;
  readonly arms: ReadonlyArray<Arm>;
  readonly deliveredThisTick: ReadonlyArray<Molecule>;
  /** Draft addition: atom identities/elements and bonds needed for replay rendering. */
  readonly atoms: ReadonlyArray<Atom>;
  readonly bonds: ReadonlyArray<Bond>;
  readonly areaClaimed: ReadonlySet<CellKey>; // the same set §10's overlay draws
  readonly error?: RunError;
}
export interface SimState {
  // [P]; complete immutable snapshot consumed and returned by one step
  readonly level: LevelSpec;
  readonly program: MachineSpec;
  readonly tick: number;
  readonly board: Board;
  readonly atoms: ReadonlyMap<AtomId, Atom>;
  /** Draft addition: bond topology was absent from the proposed SimState. */
  readonly bonds: ReadonlyArray<Bond>;
  readonly arms: ReadonlyMap<PartId, Arm>;
  readonly tapePointers: ReadonlyMap<PartId, number>;
  readonly dispenserReadyAt: ReadonlyMap<PartId, number>;
  readonly produced: ProductReport;
  readonly areaClaimed: ReadonlySet<CellKey>;
  readonly nextAtomId: AtomId;
  /** Draft replay projection: preserve acceptor order, including repeated products. */
  readonly deliveredThisTick: ReadonlyArray<Molecule>;
  readonly error?: RunError;
}
/** Shared #730 diagnostics kept compatible until the UI/probe follow-up. */
export interface GreatWorkEngineMeta {
  id: string;
  version: string;
}
export interface BoardBounds {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
}
export interface ValidationFinding {
  readonly code: string;
  readonly path: string;
}
