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

/**
 * #876 — result-key compatibility.
 *
 * An activity declares the game it runs in `Activity.content.gameKey`; the
 * frontend registry (src/components/games/gameRegistry.ts) routes that key to
 * a component, and the component reports its own key in `result.gameKey`.
 * Legacy content keys are routed to the current implementation of the same
 * game, so a submitted key is compatible with the declared key when the two
 * are equal or sit in the same alias group. The groups below are a guarded
 * duplicate of the registry's alias section (docs/architecture/shared-code.md:
 * similar data, different purpose, so guarded rather than shared);
 * `validation/__tests__/gameKeyAliases.test.ts` fails when the two drift.
 */
export const GAME_KEY_ALIASES: ReadonlyArray<ReadonlyArray<string>> = [
  ["boost_path_planner", "sequence_drag_drop"],
  ["rhymo_rhyme_rocket", "rhyme_ride_unity"],
  ["buddy_garden_sort", "bounce_buds_unity"],
];

export function isCompatibleGameKey(
  declared: string,
  submitted: string,
): boolean {
  if (declared === submitted) return true;
  return GAME_KEY_ALIASES.some(
    (group) => group.includes(declared) && group.includes(submitted),
  );
}

/**
 * The game an activity declares, read from its stored content JSON;
 * `undefined` when the activity declares none (INFO, quiz, legacy text).
 */
export function declaredGameKey(
  content: string | null | undefined,
): string | undefined {
  if (!content) return undefined;
  try {
    const parsed: unknown = JSON.parse(content);
    const key =
      parsed && typeof parsed === "object"
        ? (parsed as { gameKey?: unknown }).gameKey
        : undefined;
    return typeof key === "string" ? key : undefined;
  } catch {
    return undefined;
  }
}
