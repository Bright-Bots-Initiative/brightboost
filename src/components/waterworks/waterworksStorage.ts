/**
 * 石犀工坊 · Waterworks — device-local persistence (localStorage).
 *
 * This game is a standalone showcase: NOTHING touches the backend. Saved
 * rivers, the working draft, and first-run flags live on-device under
 * namespaced `waterworks:*` keys.
 *
 * Resilience contract (design §5, unit-tested):
 * - a corrupt gallery ENTRY is skipped, never crashes the page;
 * - a corrupt whole blob reads as empty;
 * - a quota/setItem failure degrades gracefully (caller keeps in-memory
 *   state and shows a gentle note) — saving never throws out of this module.
 *
 * Save-in-place contract (the leads' bug findings): every build has a stable
 * local id; saving again UPSERTS that entry — renaming never forks a copy.
 */
import type { Band, Cell, CellType } from "./waterworksSim";
import { blankCell, COLS, ROWS } from "./waterworksSim";

export const GALLERY_KEY = "waterworks:gallery:v1";
export const DRAFT_KEY = "waterworks:draft:v1";
export const SEEN_KEY = "waterworks:seen:v1";

/** Minimal Storage-like surface so tests can inject a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage disabled (privacy mode) → in-memory only
  }
}

// Compact persisted cell: parts + gate state only (water is never persisted).
export interface SavedCell {
  t: CellType;
  g?: boolean; // gateOpen, only meaningful for gates
}

export interface SavedRiver {
  id: string;
  name: string;
  band: Band;
  cells: SavedCell[][];
  savedAt: number;
}

export interface DraftState {
  id: string | null; // gallery id once first-saved; null = never saved
  name: string; // "" until named ("New River / 新河" shown in UI)
  band: Band;
  cells: SavedCell[][];
  progress: {
    anyFieldWateredEver: boolean;
    twoFieldsInOneRun: boolean;
    floodSeenEver: boolean;
    runsCompleted: number;
  };
}

export interface SeenFlags {
  help?: boolean;
  placedArrow?: boolean;
  flowArrow?: boolean;
  swipeHint?: boolean;
}

// ── snapshot / restore ──────────────────────────────────────────────────────

export function snapshotCells(grid: Cell[][]): SavedCell[][] {
  return grid.map((row) =>
    row.map((cell) =>
      cell.type === "gate" ? { t: cell.type, g: cell.gateOpen } : { t: cell.type },
    ),
  );
}

const CELL_TYPES = new Set<CellType>([
  "land",
  "source",
  "house",
  "channel",
  "gate",
  "fishmouth",
  "sandweir",
  "bottleneck",
  "field",
]);

export function restoreCells(cells: SavedCell[][]): Cell[][] {
  return cells.map((row) =>
    row.map((saved) => {
      const cell = blankCell(CELL_TYPES.has(saved?.t) ? saved.t : "land");
      if (cell.type === "gate") cell.gateOpen = saved.g !== false;
      return cell;
    }),
  );
}

function isValidCells(value: unknown): value is SavedCell[][] {
  return (
    Array.isArray(value) &&
    value.length === ROWS &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === COLS &&
        row.every((cell) => !!cell && typeof cell === "object" && "t" in cell),
    )
  );
}

function isValidRiver(value: unknown): value is SavedRiver {
  if (!value || typeof value !== "object") return false;
  const river = value as SavedRiver;
  return (
    typeof river.id === "string" &&
    river.id.length > 0 &&
    typeof river.name === "string" &&
    isValidCells(river.cells)
  );
}

// ── Gallery ─────────────────────────────────────────────────────────────────

/** Corrupt entries are SKIPPED (never crash); a corrupt blob reads empty. */
export function loadGallery(storage: StorageLike | null = defaultStorage()): SavedRiver[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRiver);
  } catch {
    return [];
  }
}

/**
 * UPSERT by id — save-in-place. Returns false when persisting failed (quota,
 * disabled storage); the caller keeps its in-memory copy and tells the child
 * gently. Never throws.
 */
export function saveRiver(
  river: SavedRiver,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const gallery = loadGallery(storage);
  const index = gallery.findIndex((entry) => entry.id === river.id);
  if (index >= 0) gallery[index] = river;
  else gallery.push(river);
  try {
    storage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    return true;
  } catch {
    return false; // quota — degrade to in-memory
  }
}

/** Duplicate-name guard: auto-suffix, never a blocking error ("小河" → "小河 2").
 *  The build's own entry (excludeId) doesn't count against itself. */
export function uniqueName(
  base: string,
  gallery: SavedRiver[],
  excludeId: string | null = null,
): string {
  const taken = new Set(
    gallery
      .filter((river) => river.id !== excludeId)
      .map((river) => river.name.trim().toLowerCase()),
  );
  const trimmed = base.trim().slice(0, 24);
  if (!trimmed || !taken.has(trimmed.toLowerCase())) return trimmed;
  for (let n = 2; n < 100; n++) {
    const candidate = `${trimmed} ${n}`.slice(0, 24);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return trimmed;
}

export function newRiverId(): string {
  return `wr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Draft (autosave-on-navigate: nothing is ever lost) ─────────────────────

export function loadDraft(storage: StorageLike | null = defaultStorage()): DraftState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (!isValidCells(parsed?.cells)) return null;
    if (parsed.band !== "k2" && parsed.band !== "g35" && parsed.band !== "g68") return null;
    return {
      id: typeof parsed.id === "string" ? parsed.id : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      band: parsed.band,
      cells: parsed.cells,
      progress: {
        anyFieldWateredEver: !!parsed.progress?.anyFieldWateredEver,
        twoFieldsInOneRun: !!parsed.progress?.twoFieldsInOneRun,
        floodSeenEver: !!parsed.progress?.floodSeenEver,
        runsCompleted: Number(parsed.progress?.runsCompleted) || 0,
      },
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

// ── First-run flags (tutorial arrows, help auto-open) ──────────────────────

export function loadSeen(storage: StorageLike | null = defaultStorage()): SeenFlags {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SEEN_KEY);
    return raw ? ((JSON.parse(raw) as SeenFlags) ?? {}) : {};
  } catch {
    return {};
  }
}

export function saveSeen(
  flags: SeenFlags,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SEEN_KEY, JSON.stringify(flags));
  } catch {
    // flags are a nicety — losing them just replays the arrows
  }
}
