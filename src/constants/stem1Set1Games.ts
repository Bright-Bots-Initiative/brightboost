// src/constants/stem1Set1Games.ts
// Canonical activity IDs for STEM-1 Set 1 games
// These must match progress.activityId values in the database

/**
 * STEM-1 Set 1 game activity IDs
 * Completing these games grants Spacewar perks
 */
export const STEM1_SET1_IDS = [
  "bounce-buds",
  "tank-trek",
  "quantum-quest",
  "gotcha-gears",
  "rhyme-ride",
] as const;

export type Stem1Set1GameId = (typeof STEM1_SET1_IDS)[number];

/**
 * Human-readable names for each game
 */
export const STEM1_SET1_NAMES: Record<Stem1Set1GameId, string> = {
  "bounce-buds": "Bounce & Buds",
  "tank-trek": "Tank Trek",
  "quantum-quest": "Quantum Quest",
  "gotcha-gears": "Gotcha Gears",
  "rhyme-ride": "Rhyme & Ride",
};

/**
 * Perk descriptions for each game (for UI display)
 */
export const STEM1_SET1_PERKS: Record<Stem1Set1GameId, string> = {
  "bounce-buds": "Reduced gravity pull (×0.90)",
  "tank-trek": "Faster thrust (×1.06) and rotation (×1.08)",
  "quantum-quest":
    "Shorter hyperspace cooldown (×0.85) and safer jumps (×0.80 risk)",
  "gotcha-gears": "Faster fire rate (×0.90 cooldown)",
  "rhyme-ride": "Faster projectiles (×1.10)",
};

/**
 * Check if an activity ID is a STEM-1 Set 1 game
 */
export function isStem1Set1Game(
  activityId: string,
): activityId is Stem1Set1GameId {
  return STEM1_SET1_IDS.includes(activityId as Stem1Set1GameId);
}
