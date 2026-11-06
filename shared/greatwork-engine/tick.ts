import type {
  Atom,
  AtomId,
  Axial,
  Arm,
  Bond,
  Cell,
  CellKey,
  LevelSpec,
  MachineSpec,
  Molecule,
  Part,
  ProducedEntry,
  RunError,
  SimState,
} from "./types";
import {
  add,
  armCells,
  compareAxial,
  direction,
  equal,
  key,
  resetTurn,
  rotate,
  subtract,
  sweep,
  tips,
  within,
} from "./board";
import { GLYPHS, freezeTree, glyphCells, resolveReaction } from "./reactions";
import { canonicalize, connectedIds, moleculeFrom } from "./matching";
import { assertMachine } from "./validation";
interface CollisionCandidate {
  readonly at: Axial;
  readonly partId: number;
  readonly atomId: number;
}
export const TICK_PHASES = Object.freeze([
  "input",
  "instruction",
  "collision",
  "reaction",
  "output",
  "tapeAdvance",
  "winCheck",
] as const);
/** Internal mutable transaction, never shared with a caller's immutable snapshot. */
export interface TickFrame {
  readonly before: SimState;
  readonly tick: number;
  readonly parts: readonly Part[];
  readonly atoms: Map<AtomId, Atom>;
  bonds: Bond[];
  readonly arms: Map<number, Arm>;
  readonly pointers: Map<number, number>;
  readonly readyAt: Map<number, number>;
  readonly area: Set<CellKey>;
  produced: ProducedEntry[];
  delivered: Molecule[];
  nextAtomId: number;
  readonly transformed: Set<AtomId>;
  readonly motionOwners: Map<AtomId, number>;
  readonly candidates: CollisionCandidate[];
  readonly phaseLog: string[];
  changed: boolean;
  error?: RunError;
}
export function partsOf(
  state: Pick<SimState, "level" | "program">,
): readonly Part[] {
  return [...state.level.fixedParts, ...state.program.parts];
}
function footprint(p: Part): readonly Axial[] {
  switch (p.kind) {
    case "arm":
      return armCells(p);
    case "glyph":
      return glyphCells(p.glyph);
    case "track":
      return p.cells;
    default:
      return [p.at];
  }
}
function makeBoard(
  level: LevelSpec,
  parts: readonly Part[],
  atoms: ReadonlyMap<AtomId, Atom>,
): SimState["board"] {
  const cells = new Map<CellKey, Cell>();
  const place = (at: Axial, patch: Partial<Cell>) => {
    const old = cells.get(key(at));
    cells.set(key(at), {
      at: { ...at },
      atomId: null,
      glyphId: null,
      staticId: null,
      ...old,
      ...patch,
    });
  };
  // Static cells contain arm anchors only. Current spoke geometry comes from
  // the arm snapshots; recording its initial spokes here creates ghost arms.
  for (const p of parts)
    for (const at of p.kind === "arm" ? [p.anchor] : footprint(p))
      place(at, p.kind === "glyph" ? { glyphId: p.id } : { staticId: p.id });
  for (const a of [...atoms.values()].sort((x, y) => x.id - y.id))
    place(a.at, { atomId: a.id });
  const sorted = new Map(
    [...cells.entries()].sort(([, a], [, b]) => compareAxial(a.at, b.at)),
  );
  return {
    cells: sorted,
    bounds: {
      ...(level.bounds ?? { minQ: -256, maxQ: 256, minR: -256, maxR: 256 }),
    },
  };
}
export function createSimState(
  level: LevelSpec,
  program: MachineSpec,
): SimState {
  assertMachine(level, program);
  // Accepted inputs are bounded JSON data. Copy BEFORE freezing: caller data stays editable.
  const l = freezeTree(JSON.parse(JSON.stringify(level)) as LevelSpec);
  const p = freezeTree(JSON.parse(JSON.stringify(program)) as MachineSpec);
  const parts = [...l.fixedParts, ...p.parts];
  const arms = new Map<number, Arm>(),
    pointers = new Map<number, number>(),
    readyAt = new Map<number, number>();
  const area = new Set<CellKey>();
  for (const part of parts) {
    for (const c of footprint(part)) area.add(key(c));
    if (part.kind === "arm") {
      arms.set(part.id, {
        id: part.id,
        anchor: part.anchor,
        grabbers: part.grabbers,
        reach: part.reach,
        facing: part.facing,
        trackIndex: 0,
        held: [],
      });
      pointers.set(part.id, 0);
    }
    if (part.kind === "dispenser") readyAt.set(part.id, 1);
  }
  return {
    level: l,
    program: p,
    tick: 0,
    board: makeBoard(l, parts, new Map()),
    atoms: new Map(),
    bonds: [],
    arms,
    tapePointers: pointers,
    dispenserReadyAt: readyAt,
    produced: [],
    areaClaimed: area,
    nextAtomId: 1,
    deliveredThisTick: [],
  };
}
export function createTickFrame(before: SimState): TickFrame {
  return {
    before,
    tick: before.tick + 1,
    parts: partsOf(before),
    atoms: new Map(before.atoms),
    bonds: before.bonds.map((b) => ({ ...b })),
    arms: new Map(before.arms),
    pointers: new Map(before.tapePointers),
    readyAt: new Map(before.dispenserReadyAt),
    area: new Set(before.areaClaimed),
    produced: before.produced.map((p) => ({ ...p })),
    delivered: [],
    nextAtomId: before.nextAtomId,
    transformed: new Set(),
    motionOwners: new Map(),
    candidates: [],
    phaseLog: [],
    changed: false,
  };
}
const atomAt = (f: Pick<TickFrame, "atoms">, at: Axial): Atom | undefined =>
  [...f.atoms.values()].find((a) => equal(a.at, at));
const chipsFor = (s: SimState, id: number) =>
  s.program.tapes.find((t) => t.armId === id)?.chips ?? [];
const chipFor = (s: SimState, id: number) =>
  chipsFor(s, id)[s.tapePointers.get(id) ?? 0];
const cleanupHolds = (f: TickFrame) => {
  for (const [id, arm] of f.arms) {
    const held = arm.held.filter((a) => f.atoms.has(a));
    if (held.length !== arm.held.length) f.arms.set(id, { ...arm, held });
  }
};
export function inputPhase(f: TickFrame): void {
  f.phaseLog.push("input");
  const occupied = new Set([...f.before.atoms.values()].map((a) => key(a.at)));
  // Per-dispenser cooldown: a blocked source spawns immediately when clear and due.
  for (const p of f.parts)
    if (
      p.kind === "dispenser" &&
      !occupied.has(key(p.at)) &&
      f.tick >= (f.before.dispenserReadyAt.get(p.id) ?? 1)
    ) {
      const a: Atom = {
        id: f.nextAtomId++,
        element: p.element,
        at: { ...p.at },
      };
      f.atoms.set(a.id, a);
      f.motionOwners.set(a.id, p.id);
      f.area.add(key(a.at));
      f.readyAt.set(p.id, f.tick + 2);
      f.changed = true;
    }
}
export function instructionPhase(f: TickFrame): void {
  f.phaseLog.push("instruction");
  // This snapshot includes phase-1 inputs, and never observes another arm's move.
  const snapshot = new Map(f.atoms),
    proposals = new Map<
      AtomId,
      {
        at: Axial;
        owner: number;
      }[]
    >();
  for (const p of f.parts)
    if (p.kind === "arm") {
      const arm = f.before.arms.get(p.id)!;
      const chip = chipFor(f.before, p.id);
      let held = [...arm.held].filter((id) => snapshot.has(id));
      let turn: -1 | 0 | 1 = 0;
      if (chip === "GRAB") {
        for (const tip of tips(arm)) {
          const a = [...snapshot.values()].find((x) => equal(x.at, tip));
          if (a && !held.includes(a.id)) held.push(a.id);
        }
      }
      if (chip === "DROP") held = [];
      if (chip === "ROTATE_CW") turn = 1;
      if (chip === "ROTATE_CCW") turn = -1;
      if (chip === "RESET") turn = resetTurn(arm.facing, p.facing);
      const next: Arm = { ...arm, facing: direction(arm.facing + turn), held };
      f.arms.set(p.id, next);
      if (turn || held.join(",") !== arm.held.join(",")) f.changed = true;
      for (const c of armCells(arm))
        for (const crossed of sweep(c, arm.anchor, turn))
          f.area.add(key(crossed));
      for (const c of armCells(next)) f.area.add(key(c));
      const carried = new Set<AtomId>();
      for (const id of held)
        for (const member of connectedIds(id, snapshot, f.before.bonds))
          carried.add(member);
      for (const id of carried) {
        const old = snapshot.get(id)!;
        const at = add(arm.anchor, rotate(subtract(old.at, arm.anchor), turn));
        proposals.set(id, [...(proposals.get(id) ?? []), { at, owner: p.id }]);
        for (const crossed of sweep(old.at, arm.anchor, turn))
          f.area.add(key(crossed));
      }
    }
  for (const [id, choices] of proposals) {
    choices.sort((a, b) => a.owner - b.owner);
    const first = choices[0];
    f.motionOwners.set(id, first.owner);
    if (choices.some((c) => !equal(c.at, first.at)))
      for (const c of choices)
        f.candidates.push({ at: c.at, partId: c.owner, atomId: id });
    f.atoms.set(id, { ...snapshot.get(id)!, at: first.at });
  }
  for (const a of f.atoms.values()) f.area.add(key(a.at));
}
export function collisionPhase(f: TickFrame): void {
  f.phaseLog.push("collision");
  const occupied = new Map<CellKey, Atom>(),
    walls = new Set((f.before.level.walls ?? []).map(key));
  for (const a of [...f.atoms.values()].sort((x, y) => x.id - y.id)) {
    const collision = occupied.get(key(a.at));
    if (collision)
      f.candidates.push({
        at: a.at,
        partId: Math.min(
          f.motionOwners.get(a.id) ?? Number.MAX_SAFE_INTEGER,
          f.motionOwners.get(collision.id) ?? Number.MAX_SAFE_INTEGER,
        ),
        atomId: a.id,
      });
    if (!within(a.at, f.before.board.bounds) || walls.has(key(a.at)))
      f.candidates.push({
        at: a.at,
        partId: f.motionOwners.get(a.id) ?? Number.MAX_SAFE_INTEGER,
        atomId: a.id,
      });
    occupied.set(key(a.at), a);
  }
  // Real contributing part IDs order ties. Unowned stationary atoms sort
  // after placed parts; atom ID is a final tie-break, never a fake part ID.
  f.candidates.sort(
    (a, b) =>
      compareAxial(a.at, b.at) || a.partId - b.partId || a.atomId - b.atomId,
  );
  const first = f.candidates[0];
  if (first) f.error = { kind: "collision", at: { ...first.at }, tick: f.tick };
}
export function reactionPhase(f: TickFrame): void {
  f.phaseLog.push("reaction");
  if (f.error) return;
  for (const p of f.parts)
    if (p.kind === "glyph") {
      const def = GLYPHS[p.glyph.kind],
        cells = glyphCells(p.glyph);
      const inputSlots =
        p.glyph.kind === "bond_single" ? [0, 1] : def.inputSlots;
      const inputs = inputSlots.map((i) => atomAt(f, cells[i]));
      if (inputs.some((x) => !x)) continue;
      const atoms = inputs as Atom[];
      if (p.glyph.kind === "bond_single") {
        const [a, b] = atoms;
        if (
          a.id !== b.id &&
          !f.bonds.some(
            (edge) =>
              (edge.a === a.id && edge.b === b.id) ||
              (edge.b === a.id && edge.a === b.id),
          )
        ) {
          f.bonds.push({
            a: Math.min(a.id, b.id),
            b: Math.max(a.id, b.id),
            order: 1,
          });
          f.changed = true;
        }
        continue; // Bonding is explicitly exempt from the transformed-atom set.
      }
      if (atoms.some((a) => f.transformed.has(a.id))) continue;
      const consumed = new Set(atoms.map((a) => a.id));
      if (
        def.outputSlots.some((i) => {
          const a = atomAt(f, cells[i]);
          return !!a && !consumed.has(a.id);
        })
      )
        continue;
      let outputs: readonly import("./types").ElementId[] | null = null;
      for (const reaction of def.reactionIds) {
        outputs = resolveReaction(
          reaction,
          atoms.map((a) => a.element),
        );
        if (outputs !== null) break;
      }
      if (outputs === null) continue;
      const survivors = new Set<AtomId>();
      const emitted: Atom[] = outputs.map((element, i) => {
        const at = cells[def.outputSlots[i]],
          old = atoms.find((a) => equal(a.at, at));
        // In-place transformations retain identity/bonds/grip; atoms born on a new
        // output cell get a fresh monotonically increasing ID, never a recycled ID.
        const id = old ? old.id : f.nextAtomId++;
        survivors.add(id);
        return { id, element, at: { ...at } };
      });
      for (const a of atoms) {
        f.atoms.delete(a.id);
        f.transformed.add(a.id);
      }
      f.bonds = f.bonds.filter(
        (b) =>
          (!consumed.has(b.a) || survivors.has(b.a)) &&
          (!consumed.has(b.b) || survivors.has(b.b)),
      );
      for (const a of emitted) {
        f.atoms.set(a.id, a);
        f.transformed.add(a.id);
        f.area.add(key(a.at));
      }
      f.changed = true;
      cleanupHolds(f);
    }
  f.bonds.sort((a, b) => a.a - b.a || a.b - b.b || a.order - b.order);
}
export function outputPhase(f: TickFrame): void {
  f.phaseLog.push("output");
  if (f.error) return;
  for (const p of f.parts)
    if (p.kind === "acceptor") {
      const at = atomAt(f, p.at);
      if (!at) continue;
      const ids = connectedIds(at.id, f.atoms, f.bonds),
        memberSet = new Set(ids);
      const molecule = freezeTree(moleculeFrom(ids, f.atoms, f.bonds)),
        canonical = canonicalize(molecule);
      const old = f.produced.findIndex((x) => x.canonical === canonical);
      if (old < 0)
        f.produced.push({ canonical, molecule, count: 1, firstTick: f.tick });
      else
        f.produced[old] = {
          ...f.produced[old],
          count: f.produced[old].count + 1,
        };
      f.delivered.push(molecule);
      for (const id of ids) f.atoms.delete(id);
      f.bonds = f.bonds.filter(
        (b) => !memberSet.has(b.a) && !memberSet.has(b.b),
      );
      cleanupHolds(f);
      f.changed = true;
    }
}
export function tapeAdvancePhase(f: TickFrame): void {
  f.phaseLog.push("tapeAdvance");
  if (f.error) return;
  for (const p of f.parts)
    if (p.kind === "arm") {
      const chips = chipsFor(f.before, p.id),
        pointer = f.before.tapePointers.get(p.id) ?? 0,
        chip = chips[pointer];
      let next = pointer;
      if (chip === "REPEAT") next = 0;
      else if (chip === "RESET") {
        if (f.arms.get(p.id)!.facing === p.facing)
          next = Math.min(pointer + 1, chips.length);
      } else if (chip !== undefined) next = Math.min(pointer + 1, chips.length);
      if (next !== pointer) f.changed = true;
      f.pointers.set(p.id, next);
    }
}
export function solved(state: Pick<SimState, "level" | "produced">): boolean {
  if (state.level.mode !== "target" || !state.level.targetProduct) return false;
  const target = canonicalize(state.level.targetProduct);
  return (
    (state.produced.find((p) => p.canonical === target)?.count ?? 0) >=
    (state.level.targetCount ?? 1)
  );
}
export function winCheckPhase(f: TickFrame): void {
  f.phaseLog.push("winCheck");
  if (f.error) return;
  if (solved({ level: f.before.level, produced: f.produced })) return; // Win on N takes priority over limit N.
  if (f.tick >= f.before.level.maxTicks) {
    f.error = { kind: "tick_limit", tick: f.tick };
    return;
  }
  const halted = [...f.arms.keys()].every(
    (id) => (f.pointers.get(id) ?? 0) >= chipsFor(f.before, id).length,
  );
  const possibleInput = f.parts.some(
    (p) => p.kind === "dispenser" && !atomAt(f, p.at),
  );
  if (halted && !possibleInput && !f.changed)
    f.error = { kind: "stall", tick: f.tick };
}
export function applyTickPhases(f: TickFrame): void {
  inputPhase(f);
  instructionPhase(f);
  collisionPhase(f);
  reactionPhase(f);
  outputPhase(f);
  tapeAdvancePhase(f);
  winCheckPhase(f);
}
export function finishTick(f: TickFrame): SimState {
  return {
    level: f.before.level,
    program: f.before.program,
    tick: f.tick,
    board: makeBoard(f.before.level, f.parts, f.atoms),
    atoms: f.atoms,
    bonds: f.bonds,
    arms: f.arms,
    tapePointers: f.pointers,
    dispenserReadyAt: f.readyAt,
    produced: f.produced,
    areaClaimed: f.area,
    nextAtomId: f.nextAtomId,
    deliveredThisTick: f.delivered,
    ...(f.error ? { error: f.error } : {}),
  };
}
export function step(state: SimState): SimState {
  if (state.error || solved(state)) return state;
  const f = createTickFrame(state);
  applyTickPhases(f);
  return finishTick(f);
}
