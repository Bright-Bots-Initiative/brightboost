import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  GAME_SPECIFIC_MAX_BYTES,
  GAME_SPECIFIC_SCHEMAS,
  isRegisteredGameKey,
  type RegisteredGameKey,
} from "../gameSpecific";

/** A2-01 inventoried gameKeys (remember.md). */
const INVENTORIED_KEYS = [
  "move_measure",
  "quantum_quest",
  "tank_trek",
  "qualify_tune_race",
  "boost_path_planner",
] as const satisfies readonly RegisteredGameKey[];

const validMoveMeasure = {
  dash: 5,
  jump: 7,
  toss: 3,
  impEvent: "dash" as const,
  impScore: 4,
  exitCorrect: true,
};

const validByKey: Record<RegisteredGameKey, unknown> = {
  move_measure: validMoveMeasure,
  quantum_quest: {
    maxStreak: 3,
    totalAttempted: 10,
    sectorsCleared: 2,
    powerUpsUsed: 1,
  },
  tank_trek: { totalChips: 4, retries: 1 },
  qualify_tune_race: {
    upgrade: "grip",
    run1: { time: 12.5, bumps: 2, smoothness: 70 },
    run2: null,
    exitCorrect: true,
  },
  boost_path_planner: { attempts: 2 },
};

/** Bounds match gameSpecific.ts (A2-04). */
const FIELD_BOUNDS: Array<{
  key: RegisteredGameKey;
  field: string;
  max: number;
  nest?: string;
}> = [
  { key: "move_measure", field: "dash", max: 10 },
  { key: "move_measure", field: "jump", max: 10 },
  { key: "move_measure", field: "toss", max: 10 },
  { key: "move_measure", field: "impScore", max: 10 },
  { key: "quantum_quest", field: "maxStreak", max: 200 },
  { key: "quantum_quest", field: "totalAttempted", max: 10000 },
  { key: "quantum_quest", field: "sectorsCleared", max: 50 },
  { key: "quantum_quest", field: "powerUpsUsed", max: 10000 },
  { key: "tank_trek", field: "totalChips", max: 10000 },
  { key: "tank_trek", field: "retries", max: 10000 },
  { key: "boost_path_planner", field: "attempts", max: 10000 },
  { key: "qualify_tune_race", field: "time", max: 86400, nest: "run1" },
  { key: "qualify_tune_race", field: "bumps", max: 10, nest: "run1" },
  { key: "qualify_tune_race", field: "smoothness", max: 100, nest: "run1" },
];

function withField(
  base: Record<string, unknown>,
  field: string,
  value: unknown,
  nest?: string,
): Record<string, unknown> {
  const clone = structuredClone(base);
  if (!nest) {
    clone[field] = value;
    return clone;
  }
  (clone[nest] as Record<string, unknown>)[field] = value;
  return clone;
}

// Resolve from repo root (vitest cwd). Avoid import.meta — backend tsconfig is CommonJS.
const moduleSourcePath = join(
  process.cwd(),
  "backend/src/validation/gameSpecific.ts",
);

describe("GAME_SPECIFIC_SCHEMAS", () => {
  it("R-1: valid move_measure payload parses", () => {
    const parsed = GAME_SPECIFIC_SCHEMAS.move_measure.safeParse(validMoveMeasure);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(validMoveMeasure);
    }
  });

  it("R-1: every inventoried game parses a valid payload", () => {
    for (const [key, payload] of Object.entries(validByKey)) {
      const schema = GAME_SPECIFIC_SCHEMAS[key as RegisteredGameKey];
      const parsed = schema.safeParse(payload);
      expect(parsed.success, key).toBe(true);
    }
  });

  it("R-2: each bounded field passes at its max and fails at max+1", () => {
    for (const { key, field, max, nest } of FIELD_BOUNDS) {
      const base = validByKey[key] as Record<string, unknown>;
      // qualify_tune_race needs a non-null run1 for nested bounds
      const fixture =
        key === "qualify_tune_race"
          ? {
              upgrade: null,
              run1: { time: 1, bumps: 0, smoothness: 50 },
              run2: null,
              exitCorrect: false,
            }
          : { ...base };

      expect(
        GAME_SPECIFIC_SCHEMAS[key].safeParse(withField(fixture, field, max, nest))
          .success,
        `${key}.${nest ? `${nest}.` : ""}${field}@max`,
      ).toBe(true);

      expect(
        GAME_SPECIFIC_SCHEMAS[key].safeParse(
          withField(fixture, field, max + 1, nest),
        ).success,
        `${key}.${nest ? `${nest}.` : ""}${field}@max+1`,
      ).toBe(false);
    }
  });

  it("R-3: nullable fields (impEvent: null, upgrade: null, run*: null) accepted", () => {
    const mm = GAME_SPECIFIC_SCHEMAS.move_measure.safeParse({
      ...validMoveMeasure,
      impEvent: null,
    });
    expect(mm.success).toBe(true);

    const qtr = GAME_SPECIFIC_SCHEMAS.qualify_tune_race.safeParse({
      upgrade: null,
      run1: null,
      run2: null,
      exitCorrect: false,
    });
    expect(qtr.success).toBe(true);
  });

  it("R-4: every registry schema rejects an unknown key", () => {
    for (const [key, schema] of Object.entries(GAME_SPECIFIC_SCHEMAS)) {
      const base = validByKey[key as RegisteredGameKey] as Record<string, unknown>;
      const parsed = schema.safeParse({ ...base, smuggle: "nope" });
      expect(parsed.success, key).toBe(false);
    }
  });

  it("R-5: gameSpecific.ts source has no z.any, z.record, z.unknown, or .passthrough(", () => {
    const source = readFileSync(moduleSourcePath, "utf8");
    expect(source).not.toMatch(/z\.any\b/);
    expect(source).not.toMatch(/z\.record\b/);
    expect(source).not.toMatch(/z\.unknown\b/);
    expect(source).not.toContain(".passthrough(");
  });

  it("E-10: registry keys unique, snake_case, and match A2-01 inventory", () => {
    const keys = Object.keys(GAME_SPECIFIC_SCHEMAS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
      expect(isRegisteredGameKey(key)).toBe(true);
    }
    expect(isRegisteredGameKey("not_a_game")).toBe(false);
    expect(keys.sort()).toEqual([...INVENTORIED_KEYS].sort());
  });

  it("G-102: registry module does not import prisma, routes, or express", () => {
    const source = readFileSync(moduleSourcePath, "utf8");
    expect(source).not.toMatch(/from\s+["'].*prisma/);
    expect(source).not.toMatch(/from\s+["'].*routes/);
    expect(source).not.toMatch(/from\s+["']express["']/);
  });

  it("exports GAME_SPECIFIC_MAX_BYTES = 4096", () => {
    expect(GAME_SPECIFIC_MAX_BYTES).toBe(4096);
  });
});

/**
 * T1-2-06 / G-202: temporarily add a loose entry to a *local copy* of the
 * registry, confirm R-4/R-5 go red, then discard the copy (never touch prod).
 */
describe("R-4/R-5 guard bite (local loose copy)", () => {
  it("T1-2-06: loose entry on a local registry copy makes R-4 and R-5 go red", () => {
    // Local copy of the real registry + one deliberately loose entry
    const localCopy: Record<string, z.ZodTypeAny> = {
      ...GAME_SPECIFIC_SCHEMAS,
      loose_game: z.object({ score: z.any() }).passthrough(),
    };

    // R-4 against the local copy: production keys still reject; loose accepts → overall red
    const r4AllRejectUnknown = Object.entries(localCopy).every(([key, schema]) => {
      const base =
        key === "loose_game"
          ? { score: 1 }
          : (validByKey[key as RegisteredGameKey] as Record<string, unknown>);
      return !schema.safeParse({ ...base, smuggle: "nope" }).success;
    });
    expect(r4AllRejectUnknown).toBe(false);

    // R-5 against a source string that includes the loose entry → red
    const localSource = `
      ${readFileSync(moduleSourcePath, "utf8")}
      // sabotaged local addition:
      loose_game: z.object({ score: z.any() }).passthrough(),
    `;
    const r5Clean =
      !/\bz\.any\b/.test(localSource) &&
      !/\bz\.record\b/.test(localSource) &&
      !/\bz\.unknown\b/.test(localSource) &&
      !/\.passthrough\s*\(/.test(localSource);
    expect(r5Clean).toBe(false);

    // Production registry itself remains clean (revert = discard localCopy)
    for (const [key, schema] of Object.entries(GAME_SPECIFIC_SCHEMAS)) {
      const base = validByKey[key as RegisteredGameKey] as Record<string, unknown>;
      expect(schema.safeParse({ ...base, smuggle: "nope" }).success, key).toBe(
        false,
      );
    }
    const prodSource = readFileSync(moduleSourcePath, "utf8");
    // Full R-5 set (overview.md §14.2 + T1-1-03)
    expect(prodSource).not.toMatch(/z\.any\b/);
    expect(prodSource).not.toMatch(/z\.record\b/);
    expect(prodSource).not.toMatch(/z\.unknown\b/);
    expect(prodSource).not.toContain(".passthrough(");
  });
});
