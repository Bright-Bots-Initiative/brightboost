/**
 * 都江堰水利工坊 · Waterworks — device-local persistence (localStorage).
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
import type { Band, Cell, CellType, Progress } from "./waterworksSim";
import { blankCell, COLS, HOUSES, ROWS, SOURCE_ROWS } from "./waterworksSim";

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
  progress: Progress;
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
      cell.type === "gate"
        ? { t: cell.type, g: cell.gateOpen }
        : { t: cell.type },
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
  const restored = cells.map((row) =>
    row.map((saved) => {
      const savedType = CELL_TYPES.has(saved?.t) ? saved.t : "land";
      // Sources and houses are structural landmarks, not placeable parts.
      // Normalize them below so a corrupt local entry cannot move or multiply
      // either landmark.
      const cell = blankCell(
        savedType === "source" || savedType === "house" ? "land" : savedType,
      );
      if (cell.type === "gate") cell.gateOpen = saved.g !== false;
      return cell;
    }),
  );
  for (const r of SOURCE_ROWS) restored[r][0] = blankCell("source");
  for (const [r, c] of HOUSES) restored[r][c] = blankCell("house");
  return restored;
}

function isBand(value: unknown): value is Band {
  return value === "k2" || value === "g35" || value === "g68";
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
    isBand(river.band) &&
    Number.isFinite(river.savedAt) &&
    river.savedAt >= 0 &&
    isValidCells(river.cells)
  );
}

// ── Gallery ─────────────────────────────────────────────────────────────────

/** Corrupt entries are SKIPPED (never crash); a corrupt blob reads empty. */
export function loadGallery(
  storage: StorageLike | null = defaultStorage(),
): SavedRiver[] {
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
  const truncate = (value: string, max: number) =>
    Array.from(value).slice(0, max).join("");
  const trimmed = truncate(base.trim(), 24);
  if (!trimmed || !taken.has(trimmed.toLowerCase())) return trimmed;
  for (let n = 2; n < 10_000; n++) {
    const suffix = ` ${n}`;
    const candidate = `${truncate(trimmed, 24 - Array.from(suffix).length)}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return trimmed;
}

export function newRiverId(): string {
  return `wr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Draft (autosave-on-navigate: nothing is ever lost) ─────────────────────

export function loadDraft(
  storage: StorageLike | null = defaultStorage(),
): DraftState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (!isValidCells(parsed?.cells)) return null;
    if (!isBand(parsed.band)) return null;
    const runsCompleted = Number(parsed.progress?.runsCompleted);
    return {
      id:
        typeof parsed.id === "string" && parsed.id.length > 0
          ? parsed.id
          : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      band: parsed.band,
      cells: parsed.cells,
      progress: {
        anyFieldWateredEver: !!parsed.progress?.anyFieldWateredEver,
        twoFieldsInOneRun: !!parsed.progress?.twoFieldsInOneRun,
        floodSeenEver: !!parsed.progress?.floodSeenEver,
        runsCompleted:
          Number.isFinite(runsCompleted) && runsCompleted > 0
            ? Math.floor(runsCompleted)
            : 0,
        completedTargetIds: Array.isArray(parsed.progress?.completedTargetIds)
          ? parsed.progress.completedTargetIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
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

export function loadSeen(
  storage: StorageLike | null = defaultStorage(),
): SeenFlags {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SEEN_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    const value = parsed as Record<string, unknown>;
    return {
      ...(typeof value.help === "boolean" ? { help: value.help } : {}),
      ...(typeof value.placedArrow === "boolean"
        ? { placedArrow: value.placedArrow }
        : {}),
      ...(typeof value.flowArrow === "boolean"
        ? { flowArrow: value.flowArrow }
        : {}),
      ...(typeof value.swipeHint === "boolean"
        ? { swipeHint: value.swipeHint }
        : {}),
    };
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
