import { z } from "zod";

/** Belt-and-braces serialized size cap for `result.gameSpecific` (#672). */
export const GAME_SPECIFIC_MAX_BYTES = 4096;

const smallInt = (max: number) => z.number().int().nonnegative().max(max);

const runResultSchema = z
  .object({
    // Wall-clock seconds from QualifyTuneRaceGame (performance.now), not scroll-time.
    // Cap matches timeSpentSchema (24h) so AFK/tab-switch mid-lap cannot 400 a completion (§5.3.5).
    time: z.number().min(0).max(86400),
    bumps: z.number().int().nonnegative().max(10),
    smoothness: z.number().int().nonnegative().max(100),
  })
  .strict();

/**
 * Per-game telemetry allowlist. Every schema ends in `.strict()`.
 * Shapes derived from A2-01 inventory — not speculative.
 */
export const GAME_SPECIFIC_SCHEMAS = {
  move_measure: z
    .object({
      dash: smallInt(10),
      jump: smallInt(10),
      toss: smallInt(10),
      impEvent: z.enum(["dash", "jump", "toss"]).nullable(),
      impScore: smallInt(10),
      exitCorrect: z.boolean(),
    })
    .strict(),
  quantum_quest: z
    .object({
      maxStreak: smallInt(200),
      totalAttempted: smallInt(10000),
      sectorsCleared: smallInt(50),
      powerUpsUsed: smallInt(10000),
    })
    .strict(),
  tank_trek: z
    .object({
      totalChips: smallInt(10000),
      retries: smallInt(10000),
    })
    .strict(),
  qualify_tune_race: z
    .object({
      upgrade: z.enum(["grip", "speed", "steering"]).nullable(),
      run1: runResultSchema.nullable(),
      run2: runResultSchema.nullable(),
      exitCorrect: z.boolean(),
    })
    .strict(),
  boost_path_planner: z
    .object({
      attempts: smallInt(10000),
    })
    .strict(),
} as const satisfies Record<string, z.ZodTypeAny>;

export type RegisteredGameKey = keyof typeof GAME_SPECIFIC_SCHEMAS;

export function isRegisteredGameKey(k: string): k is RegisteredGameKey {
  return Object.prototype.hasOwnProperty.call(GAME_SPECIFIC_SCHEMAS, k);
}
