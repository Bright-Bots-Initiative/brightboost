import type {
  Arm,
  Atom,
  Bond,
  ElementId,
  GrabberCount,
  HexDir,
  Instruction,
  LevelSpec,
  MachineSpec,
  Molecule,
  Part,
  Reach,
  SimState,
  TickResult,
} from "../types";
import { createSimState } from "../tick";
export const at = (q: number, r: number) => ({ q, r });
export const arm = (
  id = 1,
  q = 0,
  r = 0,
  facing: HexDir = 0,
  reach: Reach = 1,
  grabbers: GrabberCount = 1,
): Part => ({ kind: "arm", id, anchor: at(q, r), facing, reach, grabbers });
export const source = (
  id: number,
  q: number,
  r: number,
  element: ElementId = "fire",
): Part => ({ kind: "dispenser", id, at: at(q, r), element });
export const sink = (id: number, q: number, r: number): Part => ({
  kind: "acceptor",
  id,
  at: at(q, r),
});
export const glyph = (
  id: number,
  kind: Extract<
    Part,
    {
      kind: "glyph";
    }
  >["glyph"]["kind"],
  q = 0,
  r = 0,
  facing: HexDir = 0,
): Part => ({
  kind: "glyph",
  id,
  glyph: { id, kind, anchor: at(q, r), facing },
});
export const single = (element: ElementId = "fire"): Molecule => ({
  atoms: [{ element, at: at(0, 0) }],
  bonds: [],
});
export const level = (options: Partial<LevelSpec> = {}): LevelSpec => ({
  key: "fixture",
  mode: "open",
  fixedParts: [],
  maxTicks: 24,
  ...options,
});
export const target = (
  count = 1,
  element: ElementId = "fire",
  maxTicks = 40,
): LevelSpec =>
  level({
    mode: "target",
    targetProduct: single(element),
    targetCount: count,
    maxTicks,
  });
export const program = (
  parts: Part[],
  chips: Instruction[] = [],
  armId = 1,
): MachineSpec => ({
  parts,
  tapes: parts.some((p) => p.kind === "arm" && p.id === armId)
    ? [{ armId, chips }]
    : [],
});
export const transfer = (count = 1) => ({
  level: target(count),
  program: program(
    [arm(), source(2, 1, 0), sink(3, 0, 1)],
    ["GRAB", "ROTATE_CW", "DROP", "RESET", "REPEAT"],
  ),
});
export const simplified = () => ({
  level: target(1, "essence"),
  program: program(
    [arm(), source(2, 1, 0), glyph(3, "simplify", 0, 1), sink(4, -1, 1)],
    ["GRAB", "ROTATE_CW", "ROTATE_CW", "DROP"],
  ),
});
export const grown = () => ({
  level: target(1, "grass"),
  program: {
    parts: [
      arm(1, 1, -1, 0),
      arm(2, -1, 1, 1),
      arm(3, 0, -1, 1),
      source(4, 2, -1, "water"),
      source(5, -1, 2, "earth"),
      glyph(6, "growth"),
      sink(7, -1, 0),
    ],
    tapes: [
      { armId: 1, chips: ["GRAB", "ROTATE_CW", "RESET", "REPEAT"] },
      { armId: 2, chips: ["GRAB", "ROTATE_CCW", "RESET", "REPEAT"] },
      { armId: 3, chips: ["WAIT", "WAIT", "GRAB", "ROTATE_CW"] },
    ],
  } as MachineSpec,
});
export const collide = () => ({
  level: level(),
  program: {
    parts: [arm(1), arm(2, 1, 1, 2), source(3, 1, 0), source(4, 0, 2, "water")],
    tapes: [
      { armId: 1, chips: ["GRAB", "ROTATE_CW"] },
      { armId: 2, chips: ["GRAB", "ROTATE_CW"] },
    ],
  } as MachineSpec,
});
export const GOLDENS = (
  [
    ["bonded-output", bondedThree()],
    ["mirrored-output", bondedThree(true)],
    ["one-delivery", transfer(1)],
    ["three-deliveries", transfer(3)],
    ["six-deliveries", transfer(6)],
    ["simplify", simplified()],
    ["growth", grown()],
    ["simultaneous-collision", collide()],
    ["open-limit", { ...transfer(1), level: level({ maxTicks: 18 }) }],
    ["wrong-product", { ...transfer(1), level: target(1, "water", 15) }],
    [
      "wall",
      {
        level: level({ walls: [at(0, 1)] }),
        program: program([source(1, 1, 0), arm(2)], ["GRAB", "ROTATE_CW"], 2),
      },
    ],
    ["empty-stall", { level: level(), program: program([]) }],
    [
      "reset-three",
      {
        level: level(),
        program: program(
          [arm()],
          ["ROTATE_CW", "ROTATE_CW", "ROTATE_CW", "RESET"],
        ),
      },
    ],
    [
      "reach-three",
      {
        level: level(),
        program: program([arm(1, 0, 0, 0, 3, 6)], ["ROTATE_CW", "REPEAT"]),
      },
    ],
  ] as [
    string,
    {
      level: LevelSpec;
      program: MachineSpec;
    },
  ][]
).map(([name, f]) => ({ name, ...f }));
/** Engine tests seed a snapshot only when isolating one phase, never as a saved level format. */
export function withAtoms(
  s: SimState,
  entries: [number, ElementId, number, number][],
  bonds: Bond[] = [],
): SimState {
  const atoms = new Map<number, Atom>(
    entries.map(([id, element, q, r]) => [id, { id, element, at: at(q, r) }]),
  );
  return {
    ...s,
    atoms,
    bonds,
    nextAtomId: Math.max(0, ...atoms.keys()) + 1,
    areaClaimed: new Set([
      ...s.areaClaimed,
      ...[...atoms.values()].map((a) => `${a.at.q},${a.at.r}`),
    ]),
  };
}
export function hold(s: SimState, id: number, held: number[]): SimState {
  const arms = new Map(s.arms);
  arms.set(id, { ...arms.get(id)!, held } as Arm);
  return { ...s, arms };
}
export function serialize(value: unknown): string {
  return JSON.stringify(value, (_, x) =>
    x instanceof Map
      ? [...x.entries()]
      : x instanceof Set
        ? [...x.values()].sort()
        : x,
  );
}
export const traceBytes = (trace: Iterable<TickResult>): string =>
  serialize([...trace]);
export const blank = () => createSimState(level(), program([]));

/** A legal two-station assembly: bond Fire–Water, move the pair, bond Earth,
 * then carry all three to the acceptor. No atoms or bonds are seeded in state.
 * Hand-computed delivery cells at tick 6: (-1,-1), (-2,0), (-3,0).
 */
export function bondedThree(mirroredTarget = false): {
  level: LevelSpec;
  program: MachineSpec;
} {
  const delivered: Molecule = {
    atoms: [
      { element: "fire", at: at(-1, -1) },
      { element: "water", at: at(-2, 0) },
      { element: "earth", at: at(-3, 0) },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
    ],
  };
  const mirror: Molecule = {
    ...delivered,
    atoms: [
      { element: "fire", at: at(-1, 2) },
      { element: "water", at: at(-2, 2) },
      { element: "earth", at: at(-3, 3) },
    ],
  };
  return {
    level: level({
      mode: "target",
      targetCount: 1,
      targetProduct: mirroredTarget ? mirror : delivered,
    }),
    program: {
      parts: [
        arm(1, 0, -1, 0),
        arm(2, 2, 0, 2),
        arm(3, -3, 2, 5),
        source(4, 1, -1, "fire"),
        source(5, 1, 1, "water"),
        source(6, -2, 1, "earth"),
        glyph(7, "bond_single", 0, 0),
        glyph(8, "bond_single", -1, 1, 2),
        sink(9, -1, -1),
      ],
      tapes: [
        {
          armId: 1,
          chips: [
            "GRAB",
            "ROTATE_CW",
            "WAIT",
            "ROTATE_CW",
            "WAIT",
            "ROTATE_CW",
          ],
        },
        { armId: 2, chips: ["GRAB", "ROTATE_CW", "DROP"] },
        { armId: 3, chips: ["WAIT", "WAIT", "GRAB", "ROTATE_CW", "DROP"] },
      ],
    },
  };
}
