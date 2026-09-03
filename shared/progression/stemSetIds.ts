/**
 * Canonical STEM set activity IDs — ONE source for the React app and the
 * Express backend (#855).
 *
 * These are **activity IDs** (`Activity.id`, e.g. `"track-maker"`), which are a
 * different naming space from module slugs (`"k2-stem-track-maker"`) and from
 * `Activity.content.gameKey` (`"track_maker"`). Progress rows store activity
 * IDs, so these are the values every set-completion check must compare against.
 *
 * Consumed by:
 *  - frontend: `src/constants/stemSets.ts` re-exports these (via `@shared/...`)
 *  - backend:  `@brightboost/greatwork-engine/dist/progression/stemSetIds`
 *              (the `file:../shared` dependency's emitted artifact)
 *
 * Pure data. No imports, no I/O — must survive both emit targets.
 */

// ---------------------------------------------------------------------------
// Set 1 — Foundation
// ---------------------------------------------------------------------------
export const STEM_SET_1_IDS = [
  "bounce-buds",
  "gotcha-gears",
  "rhyme-ride",
  "tank-trek",
  "quantum-quest",
] as const;

export type StemSet1GameId = (typeof STEM_SET_1_IDS)[number];

// ---------------------------------------------------------------------------
// Set 2 — Exploration
// ---------------------------------------------------------------------------
export const STEM_SET_2_IDS = [
  "maze-maps",
  "move-measure",
  "sky-shield",
  "fast-lane",
  "qualify-tune-race",
] as const;

export type StemSet2GameId = (typeof STEM_SET_2_IDS)[number];

// ---------------------------------------------------------------------------
// Set 3 — Mastery
// ---------------------------------------------------------------------------
/**
 * Reserved Set 3 slots that no seeded activity fills yet. They are deliberate
 * placeholders, NOT activity IDs: nothing seeds them, so no student can ever
 * complete them.
 *
 * Consequence (intended, see #676): Set 3 is unsatisfiable — and therefore
 * specialization stays locked — until each placeholder below is REPLACED by
 * the real activity ID of a shipped game. Replacing them here unlocks the
 * frontend progress meter and the backend `POST /avatar/select-archetype`
 * gate at the same time, because both read this array.
 */
export const STEM_SET_3_PLACEHOLDER_IDS = [
  "set3-game-2",
  "set3-game-4",
  "set3-game-5",
] as const;

export const STEM_SET_3_IDS = [
  "track-maker",
  "set3-game-2",
  "echo-avenue",
  "set3-game-4",
  "set3-game-5",
] as const;

export type StemSet3GameId = (typeof STEM_SET_3_IDS)[number];

/** True when `id` is a reserved Set 3 slot rather than a real seeded game. */
export function isStemSet3Placeholder(id: string): boolean {
  return (STEM_SET_3_PLACEHOLDER_IDS as readonly string[]).includes(id);
}
