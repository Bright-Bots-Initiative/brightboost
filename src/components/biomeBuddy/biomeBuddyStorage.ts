/**
 * Biome Buddy — device-local persistence (localStorage), Waterworks contract.
 *
 * Standalone prototype: NOTHING touches the backend. Saved Buddies, the
 * working draft and Guided progress live on-device under namespaced,
 * versioned `biomebuddy:*` keys.
 *
 * Resilience contract (unit-tested in __tests__/biomeBuddyStorage.test.ts):
 * - a corrupt gallery ENTRY is skipped, never crashes the page;
 * - a corrupt whole blob reads as empty;
 * - a saved recipe is re-validated through the closed-enum validator on
 *   read, so a hand-edited or stale-version record can't reach the renderer;
 * - a quota/setItem failure degrades gracefully (caller keeps in-memory
 *   state and shows a gentle note) — saving never throws out of this module.
 *
 * Save-in-place contract: every Buddy has a stable local id; saving again
 * UPSERTS that entry — renaming or revising never forks a copy. A remix from
 * a share link gets a NEW id (the shared snapshot is never the same record).
 */
import {
  CATEGORIES,
  STATS,
  clampStat,
  isBand,
  isBiome,
  isCategory,
  isOptionOf,
  isStat,
  validateRecipe,
  type Band,
  type BuddyRecipe,
  type Contribution,
  type StatBlock,
  type StatChange,
  type TestSummary,
} from "./biomeBuddyModel";

export const GALLERY_KEY = "biomebuddy:gallery:v1";
export const DRAFT_KEY = "biomebuddy:draft:v1";
export const PROGRESS_KEY = "biomebuddy:progress:v1";

/** Minimal Storage-like surface so tests can inject a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage disabled (privacy mode) → in-memory only
  }
}

export interface SavedBuddy {
  id: string;
  recipe: BuddyRecipe;
  savedAt: number;
  /** Last Test & Learn walkthrough, so Revise can reopen it. Optional. */
  lastTest?: TestSummary | null;
}

export interface DraftState {
  id: string | null; // gallery id once first-saved; null = never saved
  band: Band;
  recipe: BuddyRecipe;
  /** The recipe as of the last Test & Learn (before/after baseline). */
  lastTested: Pick<BuddyRecipe, "biome" | "traits"> | null;
  lastTest: TestSummary | null;
  named: boolean;
}

export interface ProgressState {
  /** Tests run in 🐣 Guided — the unlock ladder counter (iteration, never
   *  correctness). */
  guidedTestsCompleted: number;
  /** Last band chosen, so a remix or resume lands where the child was. */
  band: Band | null;
}

const ID_PATTERN = /^bb-[a-z0-9-]{1,48}$/;

export function newBuddyId(): string {
  return `bb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function coerceStatBlock(value: unknown): StatBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const out = {} as StatBlock;
  for (const stat of STATS) {
    const n = raw[stat];
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[stat] = clampStat(n);
  }
  return out;
}

function coerceContribution(value: unknown): Contribution | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!isCategory(raw.category) || !isOptionOf(raw.category, raw.option))
    return null;
  const base = Number(raw.base);
  const mod = Number(raw.mod);
  if (!Number.isFinite(base) || !Number.isFinite(mod)) return null;
  return { category: raw.category, option: raw.option, base, mod };
}

function coerceChange(value: unknown): StatChange | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!isStat(raw.stat)) return null;
  const before = Number(raw.before);
  const after = Number(raw.after);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  if (!Array.isArray(raw.changedContributions)) return null;
  const rows: Contribution[] = [];
  for (const entry of raw.changedContributions) {
    const row = coerceContribution(entry);
    if (!row) return null;
    rows.push(row);
  }
  return {
    stat: raw.stat,
    before: clampStat(before),
    after: clampStat(after),
    delta: clampStat(after) - clampStat(before),
    changedContributions: rows,
  };
}

/**
 * A stored Test & Learn walkthrough is re-validated field by field — every
 * biome / stat / category / option must be a closed-enum id, every number
 * finite — so a hand-edited record can never reach the renderer and throw
 * from a `TRAITS[category][option]` lookup. Anything off → null (the Buddy
 * is kept, only its "Last test" chip is dropped).
 */
export function coerceTestSummary(value: unknown): TestSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!isBiome(raw.biome)) return null;
  const before = coerceStatBlock(raw.before);
  const after = coerceStatBlock(raw.after);
  if (!before || !after) return null;
  if (!Array.isArray(raw.changes) || raw.changes.length > STATS.length)
    return null;
  const changes: StatChange[] = [];
  const seen = new Set<string>();
  for (const entry of raw.changes) {
    const change = coerceChange(entry);
    if (!change || seen.has(change.stat)) return null;
    seen.add(change.stat);
    if (change.changedContributions.length > CATEGORIES.length) return null;
    changes.push(change);
  }
  return {
    biome: raw.biome,
    before,
    after,
    changes,
    unchanged: raw.unchanged === true,
  };
}

function coerceSaved(value: unknown): SavedBuddy | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isId(raw.id)) return null;
  const validated = validateRecipe(raw.recipe);
  if (!validated.ok) return null;
  const savedAt = Number(raw.savedAt);
  if (!Number.isFinite(savedAt) || savedAt < 0) return null;
  return {
    id: raw.id,
    recipe: validated.recipe,
    savedAt,
    lastTest: coerceTestSummary(raw.lastTest),
  };
}

// ── Gallery ─────────────────────────────────────────────────────────────────

/** Corrupt entries are SKIPPED (never crash); a corrupt blob reads empty. */
export function loadGallery(
  storage: StorageLike | null = defaultStorage(),
): SavedBuddy[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SavedBuddy[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      const buddy = coerceSaved(entry);
      if (buddy && !seen.has(buddy.id)) {
        seen.add(buddy.id);
        out.push(buddy);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeGallery(gallery: SavedBuddy[], storage: StorageLike): boolean {
  try {
    storage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    return true;
  } catch {
    return false; // quota — degrade to in-memory
  }
}

/**
 * UPSERT by id — save-in-place. Returns false when persisting failed (quota,
 * disabled storage); the caller keeps its in-memory copy and tells the child
 * gently. Never throws.
 */
export function saveBuddy(
  buddy: SavedBuddy,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const gallery = loadGallery(storage);
  const index = gallery.findIndex((entry) => entry.id === buddy.id);
  if (index >= 0) gallery[index] = buddy;
  else gallery.push(buddy);
  return writeGallery(gallery, storage);
}

export function deleteBuddy(
  id: string,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const gallery = loadGallery(storage).filter((entry) => entry.id !== id);
  return writeGallery(gallery, storage);
}

// ── Draft (autosave-on-navigate: nothing is ever lost) ─────────────────────

export function loadDraft(
  storage: StorageLike | null = defaultStorage(),
): DraftState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const validated = validateRecipe(parsed.recipe);
    if (!validated.ok) return null;
    if (!isBand(parsed.band)) return null;
    let lastTested: DraftState["lastTested"] = null;
    if (parsed.lastTested && typeof parsed.lastTested === "object") {
      const candidate = validateRecipe({
        ...validated.recipe,
        ...(parsed.lastTested as object),
      });
      if (candidate.ok)
        lastTested = {
          biome: candidate.recipe.biome,
          traits: candidate.recipe.traits,
        };
    }
    return {
      id: isId(parsed.id) ? parsed.id : null,
      band: parsed.band,
      recipe: validated.recipe,
      lastTested,
      lastTest: coerceTestSummary(parsed.lastTest),
      named: parsed.named === true,
    };
  } catch {
    return null;
  }
}

export function saveDraft(
  draft: DraftState,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    if (storage.removeItem) storage.removeItem(DRAFT_KEY);
    else storage.setItem(DRAFT_KEY, "");
  } catch {
    // losing a cleared draft is harmless
  }
}

// ── Progress (Guided unlock ladder + last band) ────────────────────────────

export function loadProgress(
  storage: StorageLike | null = defaultStorage(),
): ProgressState {
  const empty: ProgressState = { guidedTestsCompleted: 0, band: null };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return empty;
    const value = parsed as Record<string, unknown>;
    const count = Number(value.guidedTestsCompleted);
    return {
      guidedTestsCompleted:
        Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
      band: isBand(value.band) ? value.band : null,
    };
  } catch {
    return empty;
  }
}

export function saveProgress(
  progress: ProgressState,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // progress is a nicety — losing it replays a Guided unlock
  }
}
