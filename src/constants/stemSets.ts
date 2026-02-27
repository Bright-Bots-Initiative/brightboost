// src/constants/stemSets.ts
// Canonical STEM set definitions and progression utilities

// ---------------------------------------------------------------------------
// Set 1 — Foundation (5 games, 4 playable + 1 in-dev for pilot)
// ---------------------------------------------------------------------------
export const STEM_SET_1_IDS = [
  "bounce-buds",
  "gotcha-gears",
  "lost-steps",
  "rhyme-ride",
  "build-a-bot",
] as const;

export type StemSet1GameId = (typeof STEM_SET_1_IDS)[number];

export const STEM_SET_1_NAMES: Record<StemSet1GameId, string> = {
  "bounce-buds": "Bounce & Buds",
  "gotcha-gears": "Gotcha Gears",
  "lost-steps": "Fix the Order",
  "rhyme-ride": "Rhyme & Ride",
  "build-a-bot": "Build a Bot",
};

export const STEM_SET_1_PERKS: Record<StemSet1GameId, string> = {
  "bounce-buds": "Reduced gravity pull (\u00d70.90)",
  "gotcha-gears": "Faster fire rate (\u00d70.90 cooldown)",
  "lost-steps": "Better shield regen (\u00d71.08)",
  "rhyme-ride": "Faster projectiles (\u00d71.10)",
  "build-a-bot": "Faster thrust (\u00d71.06) and rotation (\u00d71.08)",
};

// ---------------------------------------------------------------------------
// Set 2 — Placeholder (coming soon)
// ---------------------------------------------------------------------------
export const STEM_SET_2_IDS = [
  "set2-game-1",
  "set2-game-2",
  "set2-game-3",
  "set2-game-4",
  "set2-game-5",
] as const;

// ---------------------------------------------------------------------------
// Set 3 — Placeholder (coming soon)
// ---------------------------------------------------------------------------
export const STEM_SET_3_IDS = [
  "set3-game-1",
  "set3-game-2",
  "set3-game-3",
  "set3-game-4",
  "set3-game-5",
] as const;

// ---------------------------------------------------------------------------
// Aggregate constants
// ---------------------------------------------------------------------------
export const ALL_STEM_SETS = [STEM_SET_1_IDS, STEM_SET_2_IDS, STEM_SET_3_IDS] as const;
export const TOTAL_SETS = 3;
export const GAMES_PER_SET = 5;

export const SET_LABELS = ["Set 1: Foundation", "Set 2: Exploration", "Set 3: Mastery"] as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Count how many games in a given set the player has completed. */
export function countCompletedInSet(
  completedIds: string[],
  setIds: readonly string[],
): number {
  return completedIds.filter((id) => setIds.includes(id)).length;
}

/** Count how many full sets (all GAMES_PER_SET games) the player has completed. */
export function countCompletedSets(completedIds: string[]): number {
  return ALL_STEM_SETS.filter(
    (setIds) => countCompletedInSet(completedIds, setIds) >= GAMES_PER_SET,
  ).length;
}

/** Type guard: is this activity ID a Set 1 game? */
export function isStemSet1Game(activityId: string): activityId is StemSet1GameId {
  return (STEM_SET_1_IDS as readonly string[]).includes(activityId);
}
