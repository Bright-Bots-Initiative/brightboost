// src/constants/stemSets.ts
// Canonical STEM set definitions and progression utilities

// ---------------------------------------------------------------------------
// Set 1 — Foundation (5 K-2 STEM games)
// ---------------------------------------------------------------------------
export const STEM_SET_1_IDS = [
  "bounce-buds",
  "gotcha-gears",
  "lost-steps",
  "rhyme-ride",
  "tank-trek",
] as const;

export type StemSet1GameId = (typeof STEM_SET_1_IDS)[number];

export const STEM_SET_1_NAMES: Record<StemSet1GameId, string> = {
  "bounce-buds": "Bounce & Buds",
  "gotcha-gears": "Gotcha Gears",
  "lost-steps": "Fix the Order",
  "rhyme-ride": "Rhyme & Ride",
  "tank-trek": "Tank Trek",
};

export const STEM_SET_1_PERKS: Record<StemSet1GameId, string> = {
  "bounce-buds": "Reduced gravity pull (\u00d70.90)",
  "gotcha-gears": "Faster fire rate (\u00d70.90 cooldown)",
  "lost-steps": "Better shield regen (\u00d71.08)",
  "rhyme-ride": "Faster projectiles (\u00d71.10)",
  "tank-trek": "Faster thrust (\u00d71.06) and rotation (\u00d71.08)",
};

// ---------------------------------------------------------------------------
// Set 2 — Exploration (5 K-2 STEM games, unlocked after Set 1 complete)
// ---------------------------------------------------------------------------
export const STEM_SET_2_IDS = [
  "maze-maps",
  "move-measure",
  "sky-shield",
  "fast-lane",
  "qualify-tune-race",
] as const;

export type StemSet2GameId = (typeof STEM_SET_2_IDS)[number];

export const STEM_SET_2_NAMES: Record<StemSet2GameId, string> = {
  "maze-maps": "Maze Maps & Smart Paths",
  "move-measure": "Move, Measure & Improve",
  "sky-shield": "Sky Shield Patterns",
  "fast-lane": "Fast Lane Signals",
  "qualify-tune-race": "Qualify, Tune, Race",
};

export const STEM_SET_2_STRANDS: Record<StemSet2GameId, string> = {
  "maze-maps": "AI",
  "move-measure": "Biotech",
  "sky-shield": "Quantum",
  "fast-lane": "AI + Biotech",
  "qualify-tune-race": "Capstone",
};

export const STEM_SET_2_PERKS: Record<StemSet2GameId, string> = {
  "maze-maps": "Enhanced radar range (\u00d71.15)",
  "move-measure": "HP regen boost (\u00d71.10)",
  "sky-shield": "Shield duration (\u00d71.12)",
  "fast-lane": "Dodge speed (\u00d71.08)",
  "qualify-tune-race": "All stats (\u00d71.04)",
};

// ---------------------------------------------------------------------------
// Set 3 — Mastery (placeholder, gates specialization)
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

/** A set is complete when all its IDs are completed. */
function isSetComplete(completedIds: string[], setIds: readonly string[]): boolean {
  return countCompletedInSet(completedIds, setIds) >= setIds.length;
}

/** Count how many full sets the player has completed. */
export function countCompletedSets(completedIds: string[]): number {
  return ALL_STEM_SETS.filter(
    (setIds) => isSetComplete(completedIds, setIds),
  ).length;
}

/** True when all Set 1 activities are completed. */
export function isSet1Complete(completedIds: string[]): boolean {
  return isSetComplete(completedIds, STEM_SET_1_IDS);
}

/** True when Set 2 is still locked (Set 1 not yet complete). */
export function isSet2Locked(completedIds: string[]): boolean {
  return !isSet1Complete(completedIds);
}

/** Type guard: is this activity ID a Set 1 game? */
export function isStemSet1Game(activityId: string): activityId is StemSet1GameId {
  return (STEM_SET_1_IDS as readonly string[]).includes(activityId);
}

/** Type guard: is this activity ID a Set 2 game? */
export function isStemSet2Game(activityId: string): activityId is StemSet2GameId {
  return (STEM_SET_2_IDS as readonly string[]).includes(activityId);
}

/** Module slugs for Set 2. */
export const STEM_SET_2_MODULE_SLUGS = [
  "k2-stem-maze-maps",
  "k2-stem-move-measure",
  "k2-stem-sky-shield",
  "k2-stem-fast-lane",
  "k2-stem-qualify-tune-race",
] as const;
