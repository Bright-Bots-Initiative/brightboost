import type {
  Axial,
  LevelSpec,
  MachineSpec,
  Part,
  ValidationFinding,
  Molecule,
} from "./types";
import { distance, key, subtract, within } from "./board";
import { ELEMENTS, GLYPHS, glyphCells, freezeTree } from "./reactions";
import { canonicalize } from "./matching";
/** Technical draft safety ceilings, not grade/progression or assessment settings. */
export const ENGINE_LIMITS = freezeTree({
  maxTicks: 10000,
  maxParts: 128,
  maxChips: 4096,
  maxCoordinate: 64,
  maxTargetAtoms: 128,
  maxSpawnBudget: 8192,
});
export class MachineValidationError extends Error {
  readonly findings: readonly ValidationFinding[];
  constructor(findings: readonly ValidationFinding[]) {
    super("GW_INVALID_MACHINE");
    this.name = "MachineValidationError";
    this.findings = freezeTree([...findings]);
  }
}
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const integer = (x: unknown, low: number, high: number): x is number =>
  typeof x === "number" && Number.isSafeInteger(x) && x >= low && x <= high;
const axial = (x: unknown): x is Axial =>
  record(x) &&
  Object.keys(x).every((k) => k === "q" || k === "r") &&
  integer(x.q, -64, 64) &&
  integer(x.r, -64, 64);
const owns = (o: object, k: unknown): boolean =>
  typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
const p2 = ["MOVE_PLUS", "MOVE_MINUS", "PIVOT_CW", "PIVOT_CCW"];
const r1 = [
  "GRAB",
  "DROP",
  "ROTATE_CW",
  "ROTATE_CCW",
  "WAIT",
  "RESET",
  "REPEAT",
];
export function validateMachine(
  level: unknown,
  program: unknown,
): readonly ValidationFinding[] {
  const issues: ValidationFinding[] = [];
  const fail = (code: string, path: string) => {
    if (issues.length < 64) issues.push({ code, path });
  };
  if (!record(level) || !record(program)) {
    fail("GW_INPUT_SHAPE", "$");
    return issues;
  }
  if (
    !Array.isArray(program.parts) ||
    !Array.isArray(program.tapes) ||
    !Array.isArray(level.fixedParts)
  ) {
    fail("GW_INPUT_SHAPE", "$.parts/tapes/fixedParts");
    return issues;
  }
  if (
    Object.keys(level).some(
      (k) =>
        ![
          "key",
          "mode",
          "targetProduct",
          "targetCount",
          "fixedParts",
          "allowedGlyphs",
          "maxTicks",
          "bounds",
          "walls",
        ].includes(k),
    )
  )
    fail("GW_LEVEL_EXTRA_FIELD", "level");
  if (Object.keys(program).some((k) => k !== "parts" && k !== "tapes"))
    fail("GW_MACHINE_EXTRA_FIELD", "program");
  if (!integer(level.maxTicks, 1, ENGINE_LIMITS.maxTicks))
    fail("GW_TICK_BUDGET", "level.maxTicks");
  if (
    typeof level.key !== "string" ||
    level.key.length < 1 ||
    level.key.length > 96
  )
    fail("GW_LEVEL_KEY", "level.key");
  if (level.key === "T8") fail("GW_T8_IS_STUDIO", "level.key");
  if (level.mode !== "open" && level.mode !== "target")
    fail("GW_LEVEL_MODE", "level.mode");
  if (level.mode === "target") {
    if (!integer(level.targetCount, 1, 1024))
      fail("GW_TARGET_COUNT", "level.targetCount");
    try {
      const m = level.targetProduct as Molecule;
      if (
        !m ||
        !Array.isArray(m.atoms) ||
        m.atoms.length > ENGINE_LIMITS.maxTargetAtoms
      )
        throw Error();
      canonicalize(m);
      if (
        m.atoms.length > ENGINE_LIMITS.maxTargetAtoms ||
        m.atoms.some((a) => !axial(a.at) || !owns(ELEMENTS, a.element))
      )
        throw Error();
      const visited = new Set([0]);
      let again = true;
      while (again) {
        again = false;
        for (const b of m.bonds) {
          if (distance(subtract(m.atoms[b.a].at, m.atoms[b.b].at)) !== 1)
            throw Error();
          if (visited.has(b.a) && !visited.has(b.b)) {
            visited.add(b.b);
            again = true;
          }
          if (visited.has(b.b) && !visited.has(b.a)) {
            visited.add(b.a);
            again = true;
          }
        }
      }
      if (visited.size !== m.atoms.length) throw Error();
    } catch {
      fail("GW_TARGET_MOLECULE", "level.targetProduct");
    }
  } else if (
    level.mode === "open" &&
    (level.targetProduct !== undefined || level.targetCount !== undefined)
  )
    fail("GW_OPEN_TARGET_FIELDS", "level");
  let bounds = { minQ: -256, maxQ: 256, minR: -256, maxR: 256 };
  if (level.bounds !== undefined) {
    const b = level.bounds;
    if (
      !record(b) ||
      Object.keys(b).some(
        (k) => !["minQ", "maxQ", "minR", "maxR"].includes(k),
      ) ||
      !["minQ", "maxQ", "minR", "maxR"].every((k) =>
        integer(b[k], -256, 256),
      ) ||
      Number(b.minQ) > Number(b.maxQ) ||
      Number(b.minR) > Number(b.maxR)
    )
      fail("GW_BOUNDS", "level.bounds");
    else bounds = b as typeof bounds;
  }
  const walls = new Set<string>();
  if (level.walls !== undefined) {
    if (!Array.isArray(level.walls) || level.walls.length > 1024)
      fail("GW_WALLS", "level.walls");
    else
      for (const w of level.walls) {
        if (!axial(w) || !within(w, bounds) || walls.has(key(w)))
          fail("GW_WALLS", "level.walls");
        else walls.add(key(w));
      }
  }
  if (
    level.allowedGlyphs !== undefined &&
    (!Array.isArray(level.allowedGlyphs) ||
      level.allowedGlyphs.length > 10 ||
      level.allowedGlyphs.some((g) => !owns(GLYPHS, g)))
  )
    fail("GW_ALLOWED_GLYPHS", "level.allowedGlyphs");
  if (
    level.fixedParts.length + program.parts.length > ENGINE_LIMITS.maxParts ||
    program.tapes.length > ENGINE_LIMITS.maxParts
  ) {
    fail("GW_PART_BUDGET", "program");
    return issues;
  }
  const all = [...level.fixedParts, ...program.parts];
  if (
    all.length > ENGINE_LIMITS.maxParts ||
    program.tapes.length > ENGINE_LIMITS.maxParts
  ) {
    fail("GW_PART_BUDGET", "program");
    return issues;
  }
  const ids = new Set<number>(),
    arms = new Set<number>(),
    footprints = new Map<string, number>();
  let dispensers = 0;
  for (let i = 0; i < all.length; i++) {
    const p = all[i],
      at = `parts[${i}]`;
    if (!record(p) || !integer(p.id, 0, 1000000)) {
      fail("GW_PART_SHAPE", at);
      continue;
    }
    const fields: Record<string, string[]> = {
      arm: ["kind", "id", "anchor", "grabbers", "reach", "facing"],
      dispenser: ["kind", "id", "at", "element"],
      acceptor: ["kind", "id", "at"],
      glyph: ["kind", "id", "glyph"],
      track: ["kind", "id", "cells"],
    };
    if (
      typeof p.kind === "string" &&
      owns(fields, p.kind) &&
      Object.keys(p).some((k) => !fields[p.kind as string].includes(k))
    )
      fail("GW_PART_EXTRA_FIELD", at);
    if (ids.has(p.id)) fail("GW_DUPLICATE_PART_ID", at);
    ids.add(p.id);
    let cells: Axial[] = [];
    if (p.kind === "arm") {
      if (
        !axial(p.anchor) ||
        !integer(p.grabbers, 1, 6) ||
        ![1, 2, 3, 6].includes(p.grabbers) ||
        !integer(p.reach, 1, 3) ||
        !integer(p.facing, 0, 5)
      )
        fail("GW_ARM_SHAPE", at);
      else {
        arms.add(p.id);
        if (!within(p.anchor, bounds) || walls.has(key(p.anchor)))
          fail("GW_PLACEMENT_BOUNDS", at);
      }
    } else if (p.kind === "dispenser" || p.kind === "acceptor") {
      if (
        !axial(p.at) ||
        (p.kind === "dispenser" && !owns(ELEMENTS, p.element))
      )
        fail("GW_PART_SHAPE", at);
      else {
        cells = [p.at];
        if (p.kind === "dispenser") dispensers++;
      }
    } else if (p.kind === "glyph") {
      const g = p.glyph;
      if (
        !record(g) ||
        Object.keys(g).some(
          (k) => !["id", "kind", "anchor", "facing"].includes(k),
        ) ||
        g.id !== p.id ||
        !owns(GLYPHS, g.kind) ||
        !axial(g.anchor) ||
        !integer(g.facing, 0, 5)
      )
        fail("GW_GLYPH_SHAPE", at);
      else {
        cells = glyphCells(
          g as unknown as Extract<
            Part,
            {
              kind: "glyph";
            }
          >["glyph"],
        );
        if (
          i >= level.fixedParts.length &&
          Array.isArray(level.allowedGlyphs) &&
          !level.allowedGlyphs.includes(g.kind)
        )
          fail("GW_GLYPH_NOT_ALLOWED", at);
      }
    } else if (p.kind === "track") fail("GW_P2_UNSUPPORTED", at);
    else fail("GW_PART_KIND", at);
    for (const c of cells) {
      if (!within(c, bounds) || walls.has(key(c)))
        fail("GW_PLACEMENT_BOUNDS", at);
      if (footprints.has(key(c))) fail("GW_PART_OVERLAP", at);
      footprints.set(key(c), p.id);
    }
  }
  let chipCount = 0;
  const tapes = new Set<number>();
  for (let i = 0; i < program.tapes.length; i++) {
    const t = program.tapes[i],
      at = `tapes[${i}]`;
    if (
      !record(t) ||
      !integer(t.armId, 0, 1000000) ||
      !arms.has(t.armId) ||
      !Array.isArray(t.chips)
    ) {
      fail("GW_TAPE_SHAPE", at);
      continue;
    }
    if (Object.keys(t).some((k) => k !== "armId" && k !== "chips"))
      fail("GW_TAPE_EXTRA_FIELD", at);
    if (tapes.has(t.armId)) fail("GW_DUPLICATE_TAPE", at);
    tapes.add(t.armId);
    chipCount += t.chips.length;
    if (t.chips.length > ENGINE_LIMITS.maxChips) {
      fail("GW_TAPE_BUDGET", at);
      continue;
    }
    for (const chip of t.chips) {
      if (typeof chip !== "string") fail("GW_INSTRUCTION", at);
      else if (p2.includes(chip)) fail("GW_P2_UNSUPPORTED", at);
      else if (!r1.includes(chip)) fail("GW_INSTRUCTION", at);
    }
  }
  if (chipCount > ENGINE_LIMITS.maxChips)
    fail("GW_TAPE_BUDGET", "program.tapes");
  if (
    typeof level.maxTicks === "number" &&
    dispensers * Math.ceil(level.maxTicks / 2) > ENGINE_LIMITS.maxSpawnBudget
  )
    fail("GW_SPAWN_BUDGET", "level.maxTicks");
  return issues;
}
export function assertMachine(level: LevelSpec, program: MachineSpec): void {
  const findings = validateMachine(level, program);
  if (findings.length) throw new MachineValidationError(findings);
}
