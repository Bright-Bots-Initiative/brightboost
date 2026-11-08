import {
  validateMachine,
  glyphCells,
  armCells,
  key,
  add,
  NEIGHBOURS,
  GLYPHS,
  ELEMENTS,
} from "@shared/greatwork-engine";
import type {
  Axial,
  HexDir,
  Part,
  MachineSpec,
  LevelSpec,
  ElementId,
  GlyphKind,
  Instruction,
} from "@shared/greatwork-engine";
import type {
  GreatWorkBandConfig,
  PartAllowList,
  InstructionKind,
} from "./greatWorkBandConfig";
import { availableInstructions } from "./greatWorkBandConfig";
export type MachineProgram = MachineSpec;
export type PartChoice =
  | { kind: "arm" }
  | { kind: "dispenser"; element: ElementId }
  | { kind: "acceptor" }
  | { kind: "glyph"; glyph: GlyphKind };
export type EditorTool =
  | { kind: "select" }
  | { kind: "place"; choice: PartChoice; facing: HexDir }
  | { kind: "move"; partId: number };
export const BUILDER_BOUNDS = Object.freeze({
  minQ: -4,
  maxQ: 4,
  minR: -3,
  maxR: 3,
});
export function programKey(program: MachineSpec): string {
  return JSON.stringify(program);
}
export function partAnchor(part: Part): Axial {
  if (part.kind === "glyph") return part.glyph.anchor;
  if (part.kind === "arm") return part.anchor;
  if (part.kind === "track") return part.cells[0] ?? { q: 0, r: 0 };
  return part.at;
}
export function partFootprint(part: Part): readonly Axial[] {
  if (part.kind === "glyph") return glyphCells(part.glyph);
  if (part.kind === "arm") return armCells(part);
  if (part.kind === "track") return part.cells;
  return [part.at];
}
export function selectableAt(parts: readonly Part[], at: Axial): Part[] {
  const k = key(at);
  return parts.filter((p) =>
    p.kind === "arm"
      ? key(p.anchor) === k
      : partFootprint(p).some((c) => key(c) === k),
  );
}
export function choiceKey(choice: PartChoice): string {
  return choice.kind === "glyph"
    ? `glyph-${choice.glyph}`
    : choice.kind === "dispenser"
      ? `dispenser-${choice.element}`
      : choice.kind;
}
export function choiceAllowed(
  choice: PartChoice,
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
): boolean {
  return (
    config.parts.includes(choice.kind) &&
    (!allow?.parts || allow.parts.includes(choice.kind)) &&
    (choice.kind !== "glyph" ||
      (Object.prototype.hasOwnProperty.call(GLYPHS, choice.glyph) &&
        (!allow?.glyphs || allow.glyphs.includes(choice.glyph)))) &&
    (choice.kind !== "dispenser" ||
      Object.prototype.hasOwnProperty.call(ELEMENTS, choice.element))
  );
}
export function makePart(
  choice: PartChoice,
  id: number,
  at: Axial,
  facing: HexDir,
): Part {
  const cell = { q: at.q, r: at.r };
  switch (choice.kind) {
    case "arm":
      return { kind: "arm", id, anchor: cell, facing, reach: 1, grabbers: 1 };
    case "dispenser":
      return { kind: "dispenser", id, at: cell, element: choice.element };
    case "acceptor":
      return { kind: "acceptor", id, at: cell };
    case "glyph":
      return {
        kind: "glyph",
        id,
        glyph: { id, kind: choice.glyph, anchor: cell, facing },
      };
  }
}
function nextId(level: LevelSpec, program: MachineSpec): number {
  return (
    Math.max(
      0,
      ...level.fixedParts.map((p) => p.id),
      ...program.parts.map((p) => p.id),
    ) + 1
  );
}
function legal(level: LevelSpec, program: MachineSpec): boolean {
  return validateMachine(level, program).length === 0;
}
export function placePart(
  level: LevelSpec,
  program: MachineSpec,
  choice: PartChoice,
  at: Axial,
  facing: HexDir,
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
): MachineSpec | null {
  if (!choiceAllowed(choice, config, allow)) return null;
  const id = nextId(level, program);
  const part = makePart(choice, id, at, facing);
  const next: MachineSpec = {
    parts: [...program.parts, part],
    tapes:
      part.kind === "arm"
        ? [...program.tapes, { armId: id, chips: [] }]
        : program.tapes,
  };
  return legal(level, next) ? next : null;
}
export function movePart(
  level: LevelSpec,
  program: MachineSpec,
  id: number,
  at: Axial,
): MachineSpec | null {
  const old = program.parts.find((p) => p.id === id);
  if (!old || old.kind === "track") return null;
  const parts = program.parts.map((p) =>
    p.id !== id
      ? p
      : p.kind === "arm"
        ? { ...p, anchor: at }
        : p.kind === "glyph"
          ? { ...p, glyph: { ...p.glyph, anchor: at } }
          : { ...p, at },
  ) as Part[];
  const next = { ...program, parts };
  return legal(level, next) ? next : null;
}
export function turnPart(
  level: LevelSpec,
  program: MachineSpec,
  id: number,
  delta: -1 | 1,
): MachineSpec | null {
  const old = program.parts.find((p) => p.id === id);
  if (!old || (old.kind !== "arm" && old.kind !== "glyph")) return null;
  const dir = (f: number) => ((f + delta + 6) % 6) as HexDir;
  const parts = program.parts.map((p) =>
    p.id !== id
      ? p
      : p.kind === "arm"
        ? { ...p, facing: dir(p.facing) }
        : p.kind === "glyph"
          ? { ...p, glyph: { ...p.glyph, facing: dir(p.glyph.facing) } }
          : p,
  );
  const next = { ...program, parts };
  return legal(level, next) ? next : null;
}
export function removePart(program: MachineSpec, id: number): MachineSpec {
  return {
    parts: program.parts.filter((p) => p.id !== id),
    tapes: program.tapes.filter((t) => t.armId !== id),
  };
}
export type TapeEdit =
  | { type: "put"; index: number; instruction: InstructionKind }
  | { type: "remove"; index: number }
  | { type: "reorder"; from: number; to: number };
export function editTape(
  program: MachineSpec,
  armId: number,
  edit: TapeEdit,
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
): MachineSpec | null {
  if (!program.parts.some((p) => p.kind === "arm" && p.id === armId))
    return null;
  const old = program.tapes.find((t) => t.armId === armId)?.chips ?? [];
  const chips: Instruction[] = [...old];
  if (edit.type === "put") {
    if (
      !availableInstructions(config, allow).includes(edit.instruction) ||
      !Number.isInteger(edit.index) ||
      edit.index < 0 ||
      edit.index > chips.length ||
      edit.index >= (config.maxTapeSlots ?? 256)
    )
      return null;
    chips[edit.index] = edit.instruction;
  } else if (edit.type === "remove") {
    if (
      !Number.isInteger(edit.index) ||
      edit.index < 0 ||
      edit.index >= chips.length
    )
      return null;
    chips.splice(edit.index, 1);
  } else {
    if (
      ![edit.from, edit.to].every(
        (n) => Number.isInteger(n) && n >= 0 && n < chips.length,
      )
    )
      return null;
    if (edit.from === edit.to) return program;
    const [chip] = chips.splice(edit.from, 1);
    chips.splice(edit.to, 0, chip);
  }
  const tape = { armId, chips };
  return {
    ...program,
    tapes: program.tapes.some((t) => t.armId === armId)
      ? program.tapes.map((t) => (t.armId === armId ? tape : t))
      : [...program.tapes, tape],
  };
}
/** A lower-band update never truncates an existing machine or silently executes hidden chips. */
export function programFitsConfig(
  program: MachineSpec,
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
): boolean {
  return (
    program.parts.every(
      (p) =>
        p.kind !== "track" &&
        config.parts.includes(p.kind) &&
        (!allow?.parts || allow.parts.includes(p.kind)),
    ) &&
    program.parts.every(
      (p) => p.kind !== "arm" || (p.reach === 1 && p.grabbers === 1),
    ) &&
    program.parts.every(
      (p) =>
        p.kind !== "glyph" ||
        !allow?.glyphs ||
        allow.glyphs.includes(p.glyph.kind),
    ) &&
    program.tapes.every(
      (t) =>
        t.chips.length <= (config.maxTapeSlots ?? 256) &&
        t.chips.every((i) =>
          availableInstructions(config, allow).includes(i as InstructionKind),
        ),
    )
  );
}
/** The floor uses an existing three-chip machine; no implicit looping or invented output. */
export function starterMachine(): MachineSpec {
  return {
    parts: [
      makePart({ kind: "arm" }, 1, { q: 0, r: 0 }, 0),
      makePart({ kind: "dispenser", element: "fire" }, 2, { q: 1, r: 0 }, 0),
      makePart({ kind: "acceptor" }, 3, { q: 0, r: 1 }, 0),
    ],
    tapes: [{ armId: 1, chips: ["GRAB", "ROTATE_CW", "DROP"] }],
  };
}
export function cursorNeighbour(
  at: Axial,
  dir: number,
  bounds: LevelSpec["bounds"],
): Axial {
  const next = add(at, NEIGHBOURS[((dir % 6) + 6) % 6]);
  return bounds &&
    (next.q < bounds.minQ ||
      next.q > bounds.maxQ ||
      next.r < bounds.minR ||
      next.r > bounds.maxR)
    ? at
    : next;
}
