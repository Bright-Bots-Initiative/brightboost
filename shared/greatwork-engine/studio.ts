import type { LevelSpec, MachineSpec, Molecule } from "./types";
import { validateMachine, MachineValidationError } from "./validation";
import { matches } from "./matching";
import { isStudioNameSeed, newStudioName } from "./studioNames";
import type { StudioNameSeed } from "./studioNames";

/** Editable payload only. Verified results and database revisions travel separately. */
export interface StudioDraft {
  v: 1;
  mode: "open" | "target";
  levelKey: null | "first-drop";
  targetProduct?: Molecule;
  targetCount?: number;
  program: MachineSpec;
  nameSeed: StudioNameSeed;
  iterations: number;
}

const bounds = Object.freeze({ minQ: -4, maxQ: 4, minR: -3, maxR: 3 });
const waterDrop = (): Molecule => ({
  atoms: [{ element: "water", at: { q: 0, r: 0 } }],
  bonds: [],
});
const source = {
  kind: "dispenser",
  id: 2,
  at: { q: 1, r: 0 },
  element: "water",
} as const;
const output = { kind: "acceptor", id: 3, at: { q: 0, r: 1 } } as const;

export function studioLevel(
  draft: Pick<
    StudioDraft,
    "mode" | "levelKey" | "targetProduct" | "targetCount"
  >,
): LevelSpec {
  const lesson = draft.levelKey === "first-drop";
  return {
    key: draft.levelKey ?? "studio",
    mode: draft.mode,
    ...(draft.mode === "target"
      ? { targetProduct: draft.targetProduct, targetCount: draft.targetCount }
      : {}),
    fixedParts: lesson ? [source, output] : [],
    ...(lesson ? { allowedGlyphs: [] } : {}),
    maxTicks: 64,
    bounds,
  };
}

export function starterStudioDraft(
  language: string,
  lesson = false,
): StudioDraft {
  const arm: MachineSpec["parts"][number] = {
    kind: "arm",
    id: 1,
    anchor: { q: 0, r: 0 },
    facing: 0,
    reach: 1,
    grabbers: 1,
  };
  return {
    v: 1,
    mode: lesson ? "target" : "open",
    levelKey: lesson ? "first-drop" : null,
    ...(lesson ? { targetProduct: waterDrop(), targetCount: 1 } : {}),
    program: {
      parts: lesson
        ? [arm]
        : [
            arm,
            { ...source, at: { ...source.at } },
            { ...output, at: { ...output.at } },
          ],
      tapes: [
        {
          armId: 1,
          chips: lesson
            ? ["GRAB", "DROP", "DROP"]
            : ["GRAB", "ROTATE_CW", "DROP"],
        },
      ],
    },
    nameSeed: newStudioName(language),
    iterations: 0,
  };
}

export const STUDIO_LESSON_COPY = {
  en: {
    title: "First Drop",
    goal: "Move one water drop to the output.",
    hint: "Tap step 2. Choose Turn right, then press Run to send water to the output.",
    reflection: "Which step moved the water to the output?",
  },
  es: {
    title: "La primera gota",
    goal: "Lleva una gota de agua a la salida.",
    hint: "Toca el paso 2. Elige Girar a la derecha y pulsa Ejecutar para llevar el agua a la salida.",
    reflection: "¿En qué paso llegó el agua a la salida?",
  },
} as const;
export function studioLessonCopy(language: string) {
  return STUDIO_LESSON_COPY[
    language.toLowerCase().split(/[-_]/)[0] === "es" ? "es" : "en"
  ];
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const fields = new Set([
  "v",
  "mode",
  "levelKey",
  "targetProduct",
  "targetCount",
  "program",
  "nameSeed",
  "iterations",
]);
function invalid(code: string): never {
  throw new Error(code);
}

/** Bound sizes before engine validation. The engine owns geometric and chemical validity. */
export function parseStudioDraft(value: unknown): StudioDraft {
  if (
    !object(value) ||
    Object.keys(value).some((key) => !fields.has(key)) ||
    value.v !== 1 ||
    (value.mode !== "open" && value.mode !== "target") ||
    (value.levelKey !== null && value.levelKey !== "first-drop") ||
    !Number.isSafeInteger(value.iterations) ||
    Number(value.iterations) < 0 ||
    Number(value.iterations) > 100000 ||
    !isStudioNameSeed(value.nameSeed)
  )
    return invalid("GW_STUDIO_DRAFT");

  const program = value.program;
  if (
    !object(program) ||
    !Array.isArray(program.parts) ||
    program.parts.length > 64 ||
    !Array.isArray(program.tapes) ||
    program.tapes.length > 64
  )
    return invalid("GW_STUDIO_PROGRAM");
  for (const p of program.parts) {
    if (!object(p) || (p.kind === "arm" && (p.reach !== 1 || p.grabbers !== 1)))
      return invalid("GW_STUDIO_PART");
  }
  for (const tape of program.tapes) {
    if (
      !object(tape) ||
      !Array.isArray(tape.chips) ||
      tape.chips.length > 3 ||
      tape.chips.some(
        (chip: unknown) =>
          chip !== "GRAB" && chip !== "ROTATE_CW" && chip !== "DROP",
      )
    )
      return invalid("GW_STUDIO_TAPE");
  }

  if (value.mode === "open") {
    if (
      value.levelKey !== null ||
      "targetProduct" in value ||
      "targetCount" in value
    )
      return invalid("GW_STUDIO_TARGET");
  } else {
    const target = value.targetProduct;
    if (
      !object(target) ||
      !Array.isArray(target.atoms) ||
      target.atoms.length > 4 ||
      !Array.isArray(target.bonds) ||
      target.bonds.length > 12 ||
      !Number.isSafeInteger(value.targetCount) ||
      Number(value.targetCount) < 1 ||
      Number(value.targetCount) > 3
    )
      return invalid("GW_STUDIO_TARGET");
  }

  // The checks above bound an untrusted JSON object. The existing engine then
  // validates every nested field, ID, binding, board coordinate and target bond.
  const draft = value as unknown as StudioDraft;
  const findings = validateMachine(studioLevel(draft), program);
  if (findings.length) throw new MachineValidationError(findings);
  if (
    draft.levelKey === "first-drop" &&
    (draft.targetCount !== 1 ||
      !matches(draft.targetProduct!, waterDrop()) ||
      draft.program.parts.some((part) => part.kind !== "arm") ||
      draft.program.parts.length > 1)
  )
    return invalid("GW_STUDIO_LESSON");
  return draft;
}
