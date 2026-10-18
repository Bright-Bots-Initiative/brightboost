/** One portable assertion suite, registered by Vitest and by the offline Node runner. */
import * as E from "../index";
import * as T from "../tick";
import type {
  Bond,
  ElementId,
  GlyphKind,
  Instruction,
  MachineSpec,
  Molecule,
  Part,
  SimState,
} from "../types";
import {
  arm,
  at,
  bondedThree,
  blank,
  collide,
  glyph,
  GOLDENS,
  grown,
  hold,
  level,
  program,
  serialize,
  simplified,
  single,
  sink,
  source,
  target,
  traceBytes,
  transfer,
  withAtoms,
} from "./fixtures";
export interface ContractCase {
  name: string;
  run: () => void;
}
export const cases: ContractCase[] = [];
const check = (name: string, run: () => void) => cases.push({ name, run });
function ok(value: unknown, message = "assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function eq(a: unknown, b: unknown) {
  if (serialize(a) !== serialize(b))
    throw new Error(`Expected ${serialize(b)}, received ${serialize(a)}`);
}
function invalid(l: unknown, p: unknown, code: string) {
  ok(
    E.validateMachine(l, p).some((f) => f.code === code),
    `Expected ${code}`,
  );
}
const states = (chips: Instruction[], part = arm()) => [
  ...E.simulate(level(), program([part], chips)),
];
// RESET and reaction rules are first, per #720.
check("RESET at the first chip consumes one tick and continues", () => {
  const s = states(["RESET", "WAIT"]);
  eq(s[0].tick, 1);
  eq(s[0].tapePointers.get(1), 1);
  eq(s[0].arms.get(1)!.facing, 0);
});
check("RESET in the middle consumes each implied 60-degree substep", () => {
  const s = states(["ROTATE_CW", "ROTATE_CW", "RESET", "WAIT"]);
  eq(
    s.slice(0, 5).map((x) => [x.arms.get(1)!.facing, x.tapePointers.get(1)]),
    [
      [1, 1],
      [2, 2],
      [1, 2],
      [0, 3],
      [0, 4],
    ],
  );
});
check("RESET last chip, opposite direction, deterministic CW tie", () => {
  const s = states(["ROTATE_CW", "ROTATE_CW", "ROTATE_CW", "RESET"]);
  eq(
    s.slice(0, 6).map((x) => x.arms.get(1)!.facing),
    [1, 2, 3, 4, 5, 0],
  );
  eq(s[5].tapePointers.get(1), 4);
});
check("RESET uses CCW rather than taking the long way", () => {
  const s = states(["ROTATE_CW", "RESET", "WAIT"]);
  eq(
    s.slice(0, 2).map((x) => x.arms.get(1)!.facing),
    [1, 0],
  );
});
check(
  "RESET while holding carries the whole transitive bonded molecule",
  () => {
    let s = withAtoms(
      E.createSimState(
        level(),
        program([arm()], ["GRAB", "ROTATE_CW", "ROTATE_CW", "RESET", "DROP"]),
      ),
      [
        [1, "fire", 1, 0],
        [2, "water", 2, 0],
        [3, "earth", 3, 0],
      ],
      [
        { a: 1, b: 2, order: 1 },
        { a: 2, b: 3, order: 1 },
      ],
    );
    for (let i = 0; i < 5; i++) s = E.step(s);
    eq(
      [...s.atoms.values()].map((a) => a.at),
      [at(1, 0), at(2, 0), at(3, 0)],
    );
    eq(s.bonds.length, 2);
    eq(s.arms.get(1)!.held, [1]);
  },
);
check(
  "REPEAT is a real one-tick instruction and never teleports orientation",
  () => {
    const s = states(["ROTATE_CW", "REPEAT"]);
    eq(
      s.slice(0, 4).map((x) => [x.arms.get(1)!.facing, x.tapePointers.get(1)]),
      [
        [1, 1],
        [1, 0],
        [2, 1],
        [2, 0],
      ],
    );
  },
);
check("Exhausted tape halts; no implicit REPEAT or RESET", () => {
  const s = states(["ROTATE_CW"]);
  eq(s.length, 2);
  eq(s[1].error, { kind: "stall", tick: 2 });
  eq(s[1].arms.get(1)!.facing, 1);
});
const reactionExamples: [E.ReactionId, ElementId[], ElementId[]][] = [
  ["simplify", ["fire"], ["essence"]],
  ["duplicate", ["essence", "water"], ["water", "water"]],
  ["growth", ["water", "earth"], ["grass"]],
  ["affect_death", ["grass", "fire"], ["death"]],
  ["affect_life", ["grass", "air"], ["life"]],
  ["realize", ["death", "life"], ["balance", "balance"]],
  ["unification", ["water", "fire", "earth", "air"], ["omni"]],
  ["compression", ["copper", "copper"], ["silver"]],
  ["refinement", ["gold", "catalyst"], ["platinum"]],
  ["destroy", ["omni"], []],
];
for (const [id, ins, out] of reactionExamples) {
  check(`Reaction ${id} follows the ten-row table`, () =>
    eq(E.resolveReaction(id, ins), out),
  );
  check(`Reaction ${id} is multiset based`, () =>
    eq(E.resolveReaction(id, [...ins].reverse()), out),
  );
}
for (const cardinal of ["fire", "water", "air", "earth"] as ElementId[])
  check(`Duplicate preserves the selected ${cardinal} kind`, () =>
    eq(E.resolveReaction("duplicate", [cardinal, "essence"]), [
      cardinal,
      cardinal,
    ]),
  );
for (let i = 0; i < E.LADDER.length; i++)
  check(`Ladder rung ${i + 1} promotion and Diamond cap`, () => {
    eq(E.promote(E.LADDER[i]), E.LADDER[Math.min(i + 1, 5)]);
    eq(E.resolveReaction("compression", [E.LADDER[i], E.LADDER[i]]), [
      E.LADDER[Math.min(i + 1, 5)],
    ]);
    eq(E.resolveReaction("refinement", ["catalyst", E.LADDER[i]]), [
      E.LADDER[Math.min(i + 1, 5)],
    ]);
  });
check("Compression never accepts two different ladder rungs", () =>
  eq(E.resolveReaction("compression", ["silver", "gold"]), null),
);
check("Unification requires four distinct cardinals", () =>
  eq(E.resolveReaction("unification", ["water", "water", "fire", "air"]), null),
);
check("Missing input does not fire", () =>
  eq(E.resolveReaction("growth", ["water"]), null),
);
check("Extra input does not fire", () =>
  eq(E.resolveReaction("growth", ["water", "earth", "air"]), null),
);
check("Catalog is exactly seventeen elements and ten reactions", () => {
  eq(Object.keys(E.ELEMENTS).length, 17);
  eq(E.REACTIONS.length, 10);
  eq(
    E.REACTIONS.filter((x) => x.capsAtDiamond).map((x) => x.id),
    ["compression", "refinement"],
  );
});
check(
  "Every nested reaction predicate, output, glyph offset and slot list is frozen",
  () => {
    function visit(x: unknown) {
      if (x && typeof x === "object") {
        ok(Object.isFrozen(x));
        for (const v of Object.values(x)) visit(v);
      }
    }
    visit(E.ELEMENTS);
    visit(E.LADDER);
    visit(E.REACTIONS);
    visit(E.GLYPHS);
  },
);
check("All ten glyph kinds have a defined footprint", () => {
  eq(Object.keys(E.GLYPHS).length, 10);
  eq(
    Object.values(E.GLYPHS).map((g) => g.cellOffsets.length),
    [1, 2, 3, 3, 2, 2, 4, 5, 1, 2],
  );
  for (const g of Object.values(E.GLYPHS)) {
    eq(g.cellOffsets[0], at(0, 0));
    for (const slot of [...g.inputSlots, ...g.outputSlots, ...g.consumeSlots])
      ok(slot >= 0 && slot < g.cellOffsets.length);
  }
});
check(
  "In-place input/output slot overlap is legal, not a placement defect",
  () => {
    for (const name of [
      "simplify",
      "duplicate",
      "refinement",
      "affect",
    ] as GlyphKind[])
      ok(
        E.GLYPHS[name].inputSlots.some((i) =>
          E.GLYPHS[name].outputSlots.includes(i),
        ),
      );
  },
);
check("Bond glyph has no chemical reaction rows or reaction slots", () => {
  eq(E.GLYPHS.bond_single.reactionIds, []);
  eq(E.GLYPHS.bond_single.inputSlots, []);
});
for (const [kind, ins, out] of [
  ["simplify", ["fire"], ["essence"]],
  ["duplicate", ["fire", "essence"], ["fire", "fire"]],
  ["growth", ["water", "earth"], ["grass"]],
  ["compression", ["silver", "silver"], ["gold"]],
  ["refinement", ["gold", "catalyst"], ["platinum"]],
  ["affect", ["grass", "air"], ["life"]],
  ["realize", ["death", "life"], ["balance", "balance"]],
  ["unification", ["air", "earth", "fire", "water"], ["omni"]],
  ["destroy", ["omni"], []],
] as [GlyphKind, ElementId[], ElementId[]][])
  check(`Actual reaction phase: ${kind}`, () => {
    const part = glyph(1, kind) as Extract<
      Part,
      {
        kind: "glyph";
      }
    >;
    const def = E.GLYPHS[kind],
      cells = E.glyphCells(part.glyph);
    let s = E.createSimState(level(), program([part]));
    s = withAtoms(
      s,
      ins.map((el, i) => [
        i + 1,
        el,
        cells[def.inputSlots[i]].q,
        cells[def.inputSlots[i]].r,
      ]),
    );
    const f = T.createTickFrame(s);
    T.reactionPhase(f);
    eq(
      def.outputSlots.map(
        (i) =>
          [...f.atoms.values()].find((a) => E.equal(a.at, cells[i]))?.element,
      ),
      out,
    );
    eq(f.atoms.size, out.length);
    ok([...f.transformed].length >= ins.length);
  });
check("Growth blocked output is a no-op, not atom deletion", () => {
  const s = withAtoms(
    E.createSimState(level(), program([glyph(1, "growth")])),
    [
      [1, "water", 1, 0],
      [2, "earth", 0, 1],
      [3, "fire", 0, 0],
    ],
  );
  const f = T.createTickFrame(s);
  T.reactionPhase(f);
  eq(serialize(f.atoms), serialize(s.atoms));
});
check(
  "A transformed atom cannot undergo a second transformation that tick",
  () => {
    const s = withAtoms(
      E.createSimState(level(), program([glyph(1, "simplify")])),
      [[1, "fire", 0, 0]],
    );
    const f = T.createTickFrame(s);
    f.transformed.add(1);
    T.reactionPhase(f);
    eq(f.atoms.get(1)!.element, "fire");
  },
);
check(
  "New output IDs are monotonic and do not recycle consumed input IDs",
  () => {
    const s = withAtoms(
      E.createSimState(level(), program([glyph(1, "growth")])),
      [
        [6, "earth", 0, 1],
        [5, "water", 1, 0],
      ],
    );
    const f = T.createTickFrame(s);
    T.reactionPhase(f);
    eq([...f.atoms.keys()], [7]);
    eq(f.nextAtomId, 8);
  },
);
check("In-place conversion preserves identity, bonds and held grip", () => {
  let s = withAtoms(
    E.createSimState(level(), program([arm(2, -1, 0), glyph(1, "simplify")])),
    [
      [1, "fire", 0, 0],
      [2, "air", 0, 1],
    ],
    [{ a: 1, b: 2, order: 1 }],
  );
  s = hold(s, 2, [1]);
  const f = T.createTickFrame(s);
  T.reactionPhase(f);
  eq(f.atoms.get(1)!.element, "essence");
  eq(f.arms.get(2)!.held, [1]);
  eq(f.bonds, s.bonds);
});
check("Consumed atoms release stale grip and incident bonds", () => {
  let s = withAtoms(
    E.createSimState(level(), program([arm(2, -1, 0), glyph(1, "destroy")])),
    [
      [1, "fire", 0, 0],
      [2, "air", 0, 1],
    ],
    [{ a: 1, b: 2, order: 1 }],
  );
  s = hold(s, 2, [1]);
  const f = T.createTickFrame(s);
  T.reactionPhase(f);
  eq(f.arms.get(2)!.held, []);
  eq(f.bonds, []);
});
check(
  "Single bond works even on transformed atoms without duplicate edges",
  () => {
    const s = withAtoms(
      E.createSimState(level(), program([glyph(1, "bond_single")])),
      [
        [1, "fire", 0, 0],
        [2, "water", 1, 0],
      ],
    );
    const f = T.createTickFrame(s);
    f.transformed.add(1);
    T.reactionPhase(f);
    T.reactionPhase(f);
    eq(f.bonds, [{ a: 1, b: 2, order: 1 }]);
  },
);
for (const n of [-6, -1, 0, 1, 6, 7])
  check(`Integer axial rotation ${n}`, () => {
    const p = at(3, -1);
    eq(E.rotate(E.rotate(p, n), -n), p);
  });
check("CW and CCW have pinned asymmetric hand-computed vectors", () => {
  eq(E.rotate(at(3, -1), 1), at(1, 2));
  eq(E.rotate(at(3, -1), -1), at(2, -3));
});
check("Mirror: non-identity, involution, and hand-computed vectors", () => {
  eq(E.reflect(at(3, -1)), at(3, -2));
  eq(E.reflect(at(1, 2)), at(1, -3));
  eq(E.reflect(E.reflect(at(3, -1))), at(3, -1));
  ok(!E.equal(E.reflect(at(3, -1)), at(3, -1)));
});
check("Six directions and their rotation order agree", () => {
  eq(E.NEIGHBOURS.length, 6);
  for (let i = 0; i < 6; i++) eq(E.rotate(at(1, 0), i), E.NEIGHBOURS[i]);
});
check("Cell keys cannot collide through bare numeric coercion", () => {
  ok(E.key(at(1, 23)) !== E.key(at(12, 3)));
  eq(E.key(at(-0, 0)), "0,0");
});
check("Reach-three sweep includes intermediate cells, not just endpoints", () =>
  eq(E.sweep(at(3, 0), at(0, 0), 1), [at(3, 0), at(2, 1), at(1, 2), at(0, 3)]),
);
check("Arbitrary bonded-atom sweep follows the same integer ring", () => {
  const path = E.sweep(at(2, 1), at(0, 0), 1);
  eq(path[0], at(2, 1));
  eq(path[path.length - 1], E.rotate(at(2, 1), 1));
  eq(path.length, 4);
});
check("Reverse sweep traverses the same cells backwards", () => {
  const a = E.sweep(at(3, 0), at(0, 0), 1);
  eq(E.sweep(at(0, 3), at(0, 0), -1), [...a].reverse());
});
for (const grabbers of [1, 2, 3, 6] as const)
  for (const reach of [1, 2, 3] as const)
    check(`All ${grabbers} grabbers operate at fixed reach ${reach}`, () => {
      const p = arm(1, 0, 0, 0, reach, grabbers) as Extract<
        Part,
        {
          kind: "arm";
        }
      >;
      const ts = E.tips(p);
      let s = withAtoms(
        E.createSimState(level(), program([p], ["GRAB", "ROTATE_CW", "DROP"])),
        ts.map((c, i) => [i + 1, "fire", c.q, c.r]),
      );
      s = E.step(s);
      eq(s.arms.get(1)!.held.length, grabbers);
      s = E.step(s);
      eq(
        [...s.atoms.values()].map((a) => a.at),
        ts.map((c) => E.rotate(c, 1)),
      );
      s = E.step(s);
      eq(s.arms.get(1)!.held, []);
      eq(s.arms.get(1)!.reach, reach);
    });
const chiral: Molecule = {
  atoms: [
    { element: "fire", at: at(0, 0) },
    { element: "water", at: at(1, 0) },
    { element: "earth", at: at(0, 1) },
  ],
  bonds: [
    { a: 0, b: 1, order: 1 },
    { a: 0, b: 2, order: 1 },
  ],
};
check("Canonicalization explicitly considers six rotations", () =>
  eq(E.canonicalRotations(chiral).length, 6),
);
for (let n = 0; n < 6; n++)
  check(`Molecule matching under rotation ${n} and translation`, () => {
    const rotated = {
      atoms: chiral.atoms.map((a) => ({
        ...a,
        at: E.add(E.rotate(a.at, n), at(9, -7)),
      })),
      bonds: chiral.bonds,
    };
    ok(E.matches(rotated, chiral));
  });
check("Reflection is diagnosed but never accepted as rotation", () => {
  ok(E.isMirrorOf(E.reflectMolecule(chiral), chiral));
  ok(!E.matches(E.reflectMolecule(chiral), chiral));
  ok(!E.isMirrorOf(chiral, chiral));
});
check("Reflecting preserves chemistry and bond order", () => {
  const reflected = E.reflectMolecule(chiral);
  eq(
    reflected.atoms.map((a) => a.element),
    chiral.atoms.map((a) => a.element),
  );
  eq(reflected.bonds, chiral.bonds);
});
check("Identical positions with different bonds do not match", () => {
  const altered = {
    ...chiral,
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
    ] as Bond[],
  };
  ok(!E.matches(altered, chiral));
});
check("Bond order is part of molecular identity", () => {
  const altered = {
    ...chiral,
    bonds: [
      { a: 0, b: 1, order: 3 },
      { a: 0, b: 2, order: 1 },
    ] as Bond[],
  };
  ok(!E.matches(altered, chiral));
});
check(
  "Atom array and edge orientation/order do not alter the canonical key",
  () => {
    const perm: Molecule = {
      atoms: [chiral.atoms[2], chiral.atoms[0], chiral.atoms[1]],
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 2, b: 1, order: 1 },
      ],
    };
    eq(E.canonicalize(perm), E.canonicalize(chiral));
  },
);
check("Mirror diagnosis cannot coexist with a solved result", () => {
  const s = {
    ...blank(),
    level: target(),
    produced: [
      {
        canonical: E.canonicalize(single()),
        molecule: single(),
        count: 1,
        firstTick: 1,
      },
    ],
  };
  const result = E.resultOf(s);
  ok(result.solved);
  eq(result.mirrored, undefined);
});
check("Wrong chiral output sets the result mirror flag", () => {
  const molecule = E.reflectMolecule(chiral);
  const s = {
    ...blank(),
    level: { ...target(), targetProduct: chiral },
    produced: [
      { canonical: E.canonicalize(molecule), molecule, count: 1, firstTick: 1 },
    ],
  };
  ok(E.resultOf(s).mirrored);
  ok(!E.resultOf(s).solved);
});
check("All seven named phases execute in the specified order", () => {
  const f = T.createTickFrame(blank());
  T.applyTickPhases(f);
  eq(f.phaseLog, E.TICK_PHASES);
});
check("Input precedes GRAB in the same tick", () => {
  const f = transfer();
  const s = E.step(E.createSimState(f.level, f.program));
  eq(s.arms.get(1)!.held, [1]);
});
check("Input-before-instruction order is behaviorally load-bearing", () => {
  const f = transfer();
  const s = E.createSimState(f.level, f.program);
  const normal = T.createTickFrame(s),
    wrong = T.createTickFrame(s);
  T.inputPhase(normal);
  T.instructionPhase(normal);
  T.instructionPhase(wrong);
  T.inputPhase(wrong);
  eq(normal.arms.get(1)!.held, [1]);
  eq(wrong.arms.get(1)!.held, []);
});
check("Delivery and win share their tick, with no N+1 delay", () => {
  const f = transfer();
  const r = E.runMachine(f.level, f.program);
  eq(r.cycles, 2);
  eq(r.produced[0].firstTick, 2);
});
check("Delivery on the last allowed tick is a win, not a limit error", () => {
  const f = transfer();
  const r = E.runMachine({ ...f.level, maxTicks: 2 }, f.program);
  ok(r.solved);
  eq(r.error, undefined);
});
check("Open mode reports products without a win", () => {
  const f = transfer();
  const r = E.runMachine(level({ maxTicks: 12 }), f.program);
  ok(!r.solved);
  eq(r.produced[0].count, 3);
  eq(r.produced[0].firstTick, 2);
  eq(r.error, { kind: "tick_limit", tick: 12 });
});
check("No target achievement is manufactured for the wrong product", () => {
  const f = transfer();
  const r = E.runMachine(target(1, "water", 8), f.program);
  ok(!r.solved);
  eq(r.error!.kind, "tick_limit");
});
check(
  "Blocked dispenser uses per-source cooldown, not a global even-tick gate",
  () => {
    let s = E.createSimState(level(), program([source(1, 0, 0)]));
    s = E.step(s);
    eq(s.dispenserReadyAt.get(1), 3);
    s = { ...s, tick: 3, atoms: new Map(), error: undefined };
    s = E.step(s);
    eq(s.tick, 4);
    eq([...s.atoms.values()][0].id, 2);
    eq(s.dispenserReadyAt.get(1), 6);
  },
);
check("Cadence prevents a second spawn one tick after the first", () => {
  let s = E.step(E.createSimState(level(), program([source(1, 0, 0)])));
  s = { ...s, atoms: new Map() };
  s = E.step(s);
  eq(s.atoms.size, 0);
  eq(s.error, undefined);
});
check(
  "Two distinct dispensers spawn in declared order from one snapshot",
  () => {
    const s = E.step(
      E.createSimState(
        level(),
        program([source(2, 1, 0, "water"), source(1, 0, 0, "fire")]),
      ),
    );
    eq(
      [...s.atoms.values()].map((a) => [a.id, a.element]),
      [
        [1, "water"],
        [2, "fire"],
      ],
    );
  },
);
check("Simultaneous atom collision occurs at the shared destination", () => {
  const f = collide();
  eq(E.runMachine(f.level, f.program).error, {
    kind: "collision",
    at: at(0, 1),
    tick: 2,
  });
});
check("Motion result does not depend on arm declaration ordering", () => {
  const f = collide();
  const swapped = {
    ...f.program,
    parts: [
      f.program.parts[1],
      f.program.parts[0],
      ...f.program.parts.slice(2),
    ],
  };
  eq(E.runMachine(f.level, f.program), E.runMachine(f.level, swapped));
});
check("Vacated cells are free after simultaneous movement", () => {
  const p: MachineSpec = {
    parts: [arm(1), arm(2, 0, 2, 4)],
    tapes: [
      { armId: 1, chips: ["ROTATE_CW"] },
      { armId: 2, chips: ["ROTATE_CW"] },
    ],
  };
  let s = withAtoms(E.createSimState(level(), p), [
    [1, "fire", 1, 0],
    [2, "water", 0, 1],
  ]);
  s = hold(hold(s, 1, [1]), 2, [2]);
  s = E.step(s);
  eq(s.error, undefined);
  eq(s.atoms.get(1)!.at, at(0, 1));
  eq(s.atoms.get(2)!.at, at(1, 1));
});
check("Two holders cannot impose conflicting motions on one molecule", () => {
  const p: MachineSpec = {
    parts: [arm(1), arm(2, 0, 2, 4)],
    tapes: [
      { armId: 1, chips: ["ROTATE_CW"] },
      { armId: 2, chips: ["WAIT"] },
    ],
  };
  let s = withAtoms(
    E.createSimState(level(), p),
    [
      [1, "fire", 1, 0],
      [2, "water", 0, 1],
    ],
    [{ a: 1, b: 2, order: 1 }],
  );
  s = hold(hold(s, 1, [1]), 2, [2]);
  s = E.step(s);
  eq(s.error!.kind, "collision");
});
check("Wall collisions use the actual post-motion atom location", () => {
  let s = withAtoms(
    E.createSimState(
      level({ walls: [at(0, 1)] }),
      program([arm()], ["ROTATE_CW"]),
    ),
    [[1, "fire", 1, 0]],
  );
  s = E.step(hold(s, 1, [1]));
  eq(s.error, { kind: "collision", at: at(0, 1), tick: 1 });
});
check("Finite board edge is a deterministic collision", () => {
  let s = withAtoms(
    E.createSimState(
      level({ bounds: { minQ: 0, maxQ: 2, minR: 0, maxR: 2 } }),
      program([arm()], ["ROTATE_CCW"]),
    ),
    [[1, "fire", 1, 0]],
  );
  s = E.step(hold(s, 1, [1]));
  eq(s.error, { kind: "collision", at: at(1, -1), tick: 1 });
});
check("Multiple collision locations sort numerically by q then r", () => {
  const s = withAtoms(blank(), [
    [1, "fire", 2, 0],
    [2, "water", 2, 0],
    [3, "earth", -1, 0],
    [4, "air", -1, 0],
  ]);
  const f = T.createTickFrame(s);
  T.collisionPhase(f);
  eq(f.error, { kind: "collision", at: at(-1, 0), tick: 1 });
});
check(
  "Collision suppresses reaction/output and cannot become a false win",
  () => {
    let s = withAtoms(E.createSimState(target(), program([sink(1, 0, 0)])), [
      [1, "fire", 0, 0],
      [2, "water", 0, 0],
    ]);
    s = E.step(s);
    eq(s.error!.kind, "collision");
    eq(s.produced, []);
    ok(!E.resultOf(s).solved);
  },
);
check("Acceptor consumes the entire bonded molecule only once", () => {
  const s = withAtoms(
    E.createSimState(level(), program([sink(1, 0, 0), sink(2, 1, 0)])),
    [
      [1, "fire", 0, 0],
      [2, "water", 1, 0],
    ],
    [{ a: 1, b: 2, order: 1 }],
  );
  const f = T.createTickFrame(s);
  T.outputPhase(f);
  eq(f.atoms.size, 0);
  eq(f.produced.length, 1);
  eq(f.produced[0].molecule.atoms.length, 2);
  eq(f.produced[0].count, 1);
});
check("Acceptor order controls first appearance report order", () => {
  const s = withAtoms(
    E.createSimState(level(), program([sink(1, 1, 0), sink(2, 0, 0)])),
    [
      [1, "fire", 0, 0],
      [2, "water", 1, 0],
    ],
  );
  const f = T.createTickFrame(s);
  T.outputPhase(f);
  eq(
    f.produced.map((p) => p.molecule.atoms[0].element),
    ["water", "fire"],
  );
});
check(
  "Existing same-product deliveries increment count without rewriting firstTick",
  () => {
    const f = transfer(3);
    const r = E.runMachine(f.level, f.program);
    eq(r.produced.length, 1);
    eq(r.produced[0].count, 3);
    eq(r.produced[0].firstTick, 2);
    eq(r.cycles, 12);
  },
);
check("Area includes an unused static glyph at tick zero", () => {
  const s = E.createSimState(level(), program([glyph(1, "growth")]));
  eq([...s.areaClaimed].sort(), ["0,0", "0,1", "1,0"]);
});
check(
  "Reach-three arm sweep claims every hand-computed triangular sector cell",
  () => {
    const s = E.step(
      E.createSimState(level(), program([arm(1, 0, 0, 0, 3)], ["ROTATE_CW"])),
    );
    eq([...s.areaClaimed].sort(), [
      "0,0",
      "0,1",
      "0,2",
      "0,3",
      "1,0",
      "1,1",
      "1,2",
      "2,0",
      "2,1",
      "3,0",
    ]);
  },
);
check(
  "Carried molecule intermediate sweep adds area outside the arm body",
  () => {
    let s = withAtoms(
      E.createSimState(level(), program([arm()], ["ROTATE_CW"])),
      [
        [1, "fire", 1, 0],
        [2, "water", 2, 0],
        [3, "earth", 3, 0],
      ],
      [
        { a: 1, b: 2, order: 1 },
        { a: 2, b: 3, order: 1 },
      ],
    );
    s = E.step(hold(s, 1, [1]));
    ok(s.areaClaimed.has("2,1"));
    ok(s.areaClaimed.has("1,2"));
    eq(s.areaClaimed.size, 10);
  },
);
check("Every multigrabber body contributes to area", () => {
  const s = E.step(
    E.createSimState(level(), program([arm(1, 0, 0, 0, 3, 6)], ["ROTATE_CW"])),
  );
  eq(s.areaClaimed.size, 37);
});
check("Consumed atoms remain in accumulated area", () => {
  const f = transfer();
  const trace = [...E.runMachineTraced(f.level, f.program)];
  ok(trace[1].areaClaimed.has("1,0"));
  ok(trace[1].areaClaimed.has("0,1"));
  eq(E.runMachine(f.level, f.program).area, trace[1].areaClaimed.size);
});
check("Cost includes each placed part and fixed reach, not run counts", () => {
  eq(E.partCost(arm(1, 0, 0, 0, 3, 6)), 60);
  eq(E.partCost(source(2, 1, 0)), 0);
  eq(E.partCost(sink(3, 0, 1)), 0);
  eq(E.partCost(glyph(4, "unification")), 40);
});
check(
  "Result counts instructions without adding scoring or progression fields",
  () => {
    const f = transfer();
    const r = E.runMachine(f.level, f.program);
    eq(Object.keys(r).sort(), [
      "area",
      "cost",
      "cycles",
      "instructions",
      "produced",
      "solved",
    ]);
    eq(r.instructions, 5);
  },
);
check(
  "Real three-arm growth machine makes Grass through two inputs and a new output",
  () => {
    const f = grown();
    const r = E.runMachine(f.level, f.program);
    ok(r.solved);
    eq(r.cycles, 4);
    eq(r.cost, 80);
    eq(r.produced[0].molecule, single("grass"));
  },
);
check("Real in-place conversion can be carried to the next acceptor", () => {
  const f = simplified();
  const r = E.runMachine(f.level, f.program);
  ok(r.solved);
  eq(r.cycles, 3);
  eq(r.produced[0].molecule, single("essence"));
});
for (const f of GOLDENS) {
  check(`Golden ${f.name}: repeated run is byte identical`, () => {
    const a = JSON.stringify(f);
    const first = JSON.stringify(E.runMachine(f.level, f.program));
    for (let i = 0; i < 5; i++)
      eq(JSON.stringify(E.runMachine(f.level, f.program)), first);
    eq(JSON.stringify(f), a);
  });
  check(
    `Golden ${f.name}: traced and untraced delegate to the same state loop`,
    () => {
      const s = [...E.simulate(f.level, f.program)];
      const traces = [...E.runMachineTraced(f.level, f.program)];
      eq(E.resultOf(s[s.length - 1]), E.runMachine(f.level, f.program));
      eq(traces.length, s.length);
      eq(
        traces.map((t) => t.tick),
        s.map((t) => t.tick),
      );
      eq(
        traces.map((t) => t.deliveredThisTick),
        s.map((t) => t.deliveredThisTick),
      );
      eq(
        traces.map((t) => serialize(t.areaClaimed)),
        s.map((t) => serialize(t.areaClaimed)),
      );
      eq(
        traceBytes(traces),
        traceBytes(E.runMachineTraced(f.level, f.program)),
      );
    },
  );
}
check("step never mutates any preceding snapshot", () => {
  const f = transfer(3);
  let s = E.createSimState(f.level, f.program);
  const old: SimState[] = [];
  const bytes: string[] = [];
  for (let i = 0; i < 8; i++) {
    old.push(s);
    bytes.push(serialize(s));
    s = E.step(s);
    for (let j = 0; j < old.length; j++) eq(serialize(old[j]), bytes[j]);
  }
});
check("Copy-before-freeze leaves caller machine editable", () => {
  const f = transfer();
  E.createSimState(f.level, f.program);
  ok(!Object.isFrozen(f.program));
  ok(!Object.isFrozen(f.program.parts));
});
check(
  "Changing caller inputs after creation cannot rewrite simulation history",
  () => {
    const f = transfer();
    const s = E.createSimState(f.level, f.program);
    (f.program.parts as Part[]).push(sink(99, 8, 8));
    eq(s.program.parts.length, 3);
  },
);
check("Terminal state is idempotent", () => {
  const f = transfer();
  const all = [...E.simulate(f.level, f.program)];
  const last = all[all.length - 1];
  ok(E.step(last) === last);
});
for (const opcode of ["MOVE_PLUS", "MOVE_MINUS", "PIVOT_CW", "PIVOT_CCW"])
  check(`P2 ${opcode} is rejected rather than ignored`, () =>
    invalid(
      level(),
      program([arm()], [opcode as Instruction]),
      "GW_P2_UNSUPPORTED",
    ),
  );
check("P2 track placement rejected", () =>
  invalid(
    level(),
    program([{ kind: "track", id: 1, cells: [at(0, 0)] }]),
    "GW_P2_UNSUPPORTED",
  ),
);
check("No grade-band inference or within-band stage field accepted", () =>
  invalid(
    { ...level(), gradeBand: "g3_5" },
    program([]),
    "GW_LEVEL_EXTRA_FIELD",
  ),
);
check("Missing, zero, fractional and infinite tick budgets fail closed", () => {
  for (const maxTicks of [undefined, 0, -1, 0.5, Infinity, 10001])
    invalid({ ...level(), maxTicks }, program([]), "GW_TICK_BUDGET");
});
check("Invalid axial coordinate cannot reach simulation", () =>
  invalid(level(), program([source(1, NaN, 0)]), "GW_PART_SHAPE"),
);
check("Duplicate part IDs fail closed", () =>
  invalid(
    level(),
    program([source(1, 0, 0), sink(1, 1, 0)]),
    "GW_DUPLICATE_PART_ID",
  ),
);
check("Two different passive footprints cannot overlap", () =>
  invalid(
    level(),
    program([source(1, 0, 0), glyph(2, "simplify")]),
    "GW_PART_OVERLAP",
  ),
);
check("Internal in/out slot overlap still validates", () =>
  eq(E.validateMachine(level(), program([glyph(1, "simplify")])), []),
);
check("Unknown glyph name fails closed before template access", () =>
  invalid(
    level(),
    {
      parts: [
        {
          kind: "glyph",
          id: 1,
          glyph: { id: 1, kind: "__proto__", anchor: at(0, 0), facing: 0 },
        },
      ],
      tapes: [],
    },
    "GW_GLYPH_SHAPE",
  ),
);
check("Glyph allowlist applies to placed parts", () =>
  invalid(
    level({ allowedGlyphs: ["simplify"] }),
    program([glyph(1, "growth")]),
    "GW_GLYPH_NOT_ALLOWED",
  ),
);
check("Fixed lesson glyphs need not be in the learner parts tray", () =>
  eq(
    E.validateMachine(
      level({ allowedGlyphs: [], fixedParts: [glyph(1, "growth")] }),
      program([]),
    ),
    [],
  ),
);
check("Unknown tape owner and duplicate tape rejected", () => {
  invalid(
    level(),
    { parts: [], tapes: [{ armId: 1, chips: [] }] },
    "GW_TAPE_SHAPE",
  );
  invalid(
    level(),
    {
      parts: [arm()],
      tapes: [
        { armId: 1, chips: [] },
        { armId: 1, chips: [] },
      ],
    },
    "GW_DUPLICATE_TAPE",
  );
});
check("Invalid instruction rejected before first tick", () =>
  invalid(level(), program([arm()], ["WIN" as Instruction]), "GW_INSTRUCTION"),
);
check("Target molecules must be connected", () =>
  invalid(
    {
      ...target(),
      targetProduct: {
        atoms: [
          { element: "fire", at: at(0, 0) },
          { element: "water", at: at(1, 0) },
        ],
        bonds: [],
      },
    },
    program([]),
    "GW_TARGET_MOLECULE",
  ),
);
check("Open mode cannot carry hidden target fields", () =>
  invalid({ ...level(), targetCount: 3 }, program([]), "GW_OPEN_TARGET_FIELDS"),
);
check("T8 is studio handoff, not an engine level", () =>
  invalid(level({ key: "T8" }), program([]), "GW_T8_IS_STUDIO"),
);
check(
  "Invalid machine throws typed validation, while tick limit is a returned outcome",
  () => {
    let thrown: unknown;
    try {
      E.runMachine({ ...level(), maxTicks: 0 }, program([]));
    } catch (e) {
      thrown = e;
    }
    ok(thrown instanceof E.MachineValidationError);
    const r = E.runMachine(
      level({ maxTicks: 3 }),
      program([arm()], ["REPEAT"]),
    );
    eq(r.error, { kind: "tick_limit", tick: 3 });
  },
);
check("static board records anchors, not ghost initial arm spokes", () => {
  let state = E.createSimState(
    target(),
    program(
      [arm(1, 0, 0, 0, 2), source(2, 2, 0), sink(3, 0, 2)],
      ["GRAB", "ROTATE_CW"],
    ),
  );
  state = E.step(E.step(state));
  ok(state.arms.get(1)?.facing === 1);
  ok(!state.board.cells.get("1,0")?.staticId);
  ok(state.areaClaimed.has("1,0"));
});
check(
  "unknown elements and extra recursive fields are rejected before copying",
  () => {
    let threw = false;
    try {
      E.canonicalize({
        atoms: [{ element: "unknown" as ElementId, at: at(0, 0) }],
        bonds: [],
      });
    } catch {
      threw = true;
    }
    ok(threw);
    const f = transfer(1),
      extra = { ...f.level, targetProduct: { ...single(), extra: true } };
    ok(E.validateMachine(extra, f.program).length > 0);
  },
);
check("malformed JSON instructions are rejected without coercion", () => {
  const f = transfer();
  const bad = {
    parts: f.program.parts,
    tapes: [{ armId: 1, chips: [{ toString: null, valueOf: null }] }],
  };
  invalid(f.level, bad, "GW_INSTRUCTION");
});
check("malformed arm counts are rejected without coercion", () => {
  const p = {
    parts: [
      {
        kind: "arm",
        id: 1,
        anchor: at(0, 0),
        facing: 0,
        reach: 1,
        grabbers: { toString: null, valueOf: null },
      },
    ],
    tapes: [],
  };
  invalid(level(), p, "GW_ARM_SHAPE");
});
check("collision ordering uses actual contributing arm IDs", () => {
  const p: MachineSpec = {
    parts: [
      arm(100),
      arm(200, 1, 1, 2),
      source(3, 1, 0),
      source(4, 0, 2, "water"),
    ],
    tapes: [
      { armId: 100, chips: ["GRAB", "ROTATE_CW"] },
      { armId: 200, chips: ["GRAB", "ROTATE_CW"] },
    ],
  };
  const s = E.step(E.createSimState(level(), p));
  const f = T.createTickFrame(s);
  T.inputPhase(f);
  T.instructionPhase(f);
  T.collisionPhase(f);
  eq(f.candidates[0].partId, 100);
  eq(f.error, { kind: "collision", at: at(0, 1), tick: 2 });
});

check(
  "Legal machine creates two bonds and delivers its whole three-atom product",
  () => {
    const f = bondedThree();
    const r = E.runMachine(f.level, f.program);
    ok(r.solved);
    eq(r.cycles, 6);
    eq(r.produced[0].molecule.atoms.length, 3);
    eq(r.produced[0].molecule.bonds.length, 2);
    ok(E.matches(r.produced[0].molecule, f.level.targetProduct!));
  },
);
check(
  "Legal mirrored-target run diagnoses reflection without a false success",
  () => {
    const f = bondedThree(true);
    const r = E.runMachine(f.level, f.program);
    ok(!r.solved);
    eq(r.mirrored, true);
    eq(r.produced[0].firstTick, 6);
    eq(r.produced[0].count, 1);
  },
);
check("Sequential bond creation remains visible in the real trace", () => {
  const f = bondedThree();
  const t = [...E.runMachineTraced(f.level, f.program)];
  eq(t[1].bonds.length, 1);
  eq(t[3].bonds.length, 2);
  eq(t[5].deliveredThisTick[0].atoms.length, 3);
  eq(t[5].bonds.length, 0);
});

check("legacy metadata probe keeps its existing label", () => {
  eq(E.GREAT_WORK_ENGINE_STUB_ID, "greatwork-engine-stub-730");
  eq(
    E.describeGreatWorkEngine({
      id: E.GREAT_WORK_ENGINE_STUB_ID,
      version: "0.0.0",
    }),
    "greatwork-engine-stub-730@0.0.0",
  );
});
check(
  "real engine version is distinguishable from the compatibility probe",
  () => eq(E.GREAT_WORK_ENGINE_VERSION, "0.1.0-draft.720"),
);
