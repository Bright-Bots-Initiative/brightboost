/**
 * 都江堰水利工坊 · Waterworks — pure simulation engine.
 *
 * Every rule here is specified in docs/games/waterworks-design.md §2 and is
 * the behavior the pod leads reviewed in the prototype. All functions are
 * pure (grid in → grid out) so the water physics, the unlock ladder, and the
 * flood-is-feedback invariants are unit-testable without React.
 *
 * The one non-negotiable invariant: THERE IS NO GAME-OVER. A flood never
 * halts the sim, never locks editing — it is information about the river.
 */

// ── Types & constants ───────────────────────────────────────────────────────

export type PartType =
  | "channel"
  | "gate"
  | "fishmouth"
  | "sandweir"
  | "bottleneck"
  | "field";
export type CellType = PartType | "land" | "source" | "house";
export type Band = "k2" | "g35" | "g68";

export interface Cell {
  type: CellType;
  water: number; // 0..4
  wTicks: number; // consecutive ticks a field has held water ≥ 1
  watered: boolean; // field: sustained flow (wTicks ≥ 2) → 🌾
  flooded: boolean; // field: water ≥ 4; house: a neighbor holds ≥ 4
  gateOpen: boolean;
  draining: boolean; // sandweir shed excess this tick (💦)
}

export const COLS = 14;
export const ROWS = 9;
export const SOURCE_ROWS = [3, 4, 5] as const;
export const HOUSES: ReadonlyArray<readonly [number, number]> = [
  [1, 10],
  [7, 11],
  [8, 3],
];
export const MAX_WATER = 4;
export const TICKS_PER_RUN = 16;
export const TICK_MS = 180;

export const PART_ORDER: PartType[] = [
  "channel",
  "gate",
  "fishmouth",
  "sandweir",
  "bottleneck",
  "field",
];

const CONDUCTORS = new Set<CellType>([
  "source",
  "channel",
  "fishmouth",
  "sandweir",
  "bottleneck",
]);

// ── Grid construction ───────────────────────────────────────────────────────

export function blankCell(type: CellType): Cell {
  return {
    type,
    water: 0,
    wTicks: 0,
    watered: false,
    flooded: false,
    gateOpen: true,
    draining: false,
  };
}

/**
 * A fresh board for a band. Guided (k2) and 3–5 open with a starter channel
 * already dug (the supported floor — never a blank void); 6–8 opens blank
 * (the open ceiling). Sources and houses are fixed on every band.
 */
export function freshGrid(band: Band): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) row.push(blankCell("land"));
    grid.push(row);
  }
  for (const r of SOURCE_ROWS) grid[r][0] = blankCell("source");
  if (band !== "g68") {
    for (const c of [1, 2, 3]) grid[4][c] = blankCell("channel");
  }
  for (const [r, c] of HOUSES) grid[r][c] = blankCell("house");
  return grid;
}

// ── Editing (tap rules) ─────────────────────────────────────────────────────

export type Tool = PartType | "erase";

/**
 * One predictable tap grammar (prototype behavior, leads-reviewed):
 * sources/houses are fixed · erase → land · a gate toggles open/closed on tap
 * (erase to remove it) · tapping a cell that already holds the selected part
 * removes it · otherwise the selected part is placed.
 */
export function tapCell(
  grid: Cell[][],
  r: number,
  c: number,
  tool: Tool,
): Cell[][] {
  const cell = grid[r]?.[c];
  if (!cell) return grid;
  if (cell.type === "source" || cell.type === "house") return grid;

  const next = grid.map((row) => row.slice());
  if (tool === "erase") {
    next[r][c] = blankCell("land");
    return next;
  }
  if (cell.type === "gate") {
    next[r][c] = { ...cell, gateOpen: !cell.gateOpen };
    return next;
  }
  if (cell.type === tool) {
    next[r][c] = blankCell("land");
    return next;
  }
  next[r][c] = blankCell(tool);
  return next;
}

// ── The tick ────────────────────────────────────────────────────────────────

function isReceiver(cell: Cell): boolean {
  if (cell.type === "gate") return cell.gateOpen;
  return CONDUCTORS.has(cell.type) || cell.type === "field";
}
function canEmit(cell: Cell): boolean {
  if (cell.type === "land" || cell.type === "house") return false;
  if (cell.type === "gate") return cell.gateOpen;
  return true;
}
function isConductor(cell: Cell): boolean {
  if (cell.type === "gate") return cell.gateOpen;
  return CONDUCTORS.has(cell.type);
}
/** 鱼嘴 emits N, S, E only (never back west) — that's the split. */
function dirsFor(type: CellType): ReadonlyArray<readonly [number, number]> {
  return type === "fishmouth"
    ? [
        [-1, 0],
        [1, 0],
        [0, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
}

/**
 * Advance the water one tick. Order (design §2): source inflow → spread
 * (max offer, field loss 1) → rain (+1 conductors, +2 fields) → part rules
 * AFTER rain (宝瓶口 caps 2, 飞沙堰 caps 1 + drains, blockers pinned 0) →
 * commit + field/house feedback. Pure: returns a new grid.
 */
export function simulateTick(grid: Cell[][], raining: boolean): Cell[][] {
  const next: number[][] = grid.map((row) => row.map(() => 0));

  // 1. source inflow
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].type === "source") next[r][c] = MAX_WATER;

  // 2. spread from current state (max of offers; fields lose 1 either side)
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.water <= 0 || !canEmit(cell)) continue;
      for (const [dr, dc] of dirsFor(cell.type)) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const n = grid[nr][nc];
        if (!isReceiver(n)) continue;
        const loss = cell.type === "field" || n.type === "field" ? 1 : 0;
        const give = cell.water - loss;
        if (give > next[nr][nc]) next[nr][nc] = give;
      }
    }

  // 3. rain inflow (storm test)
  if (raining) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell.type === "field")
          next[r][c] = Math.min(MAX_WATER, next[r][c] + 2);
        else if (isConductor(cell))
          next[r][c] = Math.min(MAX_WATER, next[r][c] + 1);
      }
  }

  // 4. part rules AFTER rain, so the protectors keep protecting
  const draining: boolean[][] = grid.map((row) => row.map(() => false));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.type === "source") next[r][c] = MAX_WATER;
      else if (cell.type === "bottleneck") next[r][c] = Math.min(next[r][c], 2);
      else if (cell.type === "sandweir") {
        draining[r][c] = next[r][c] > 1;
        next[r][c] = Math.min(next[r][c], 1);
      } else if (
        cell.type === "land" ||
        cell.type === "house" ||
        (cell.type === "gate" && !cell.gateOpen)
      ) {
        next[r][c] = 0;
      }
      next[r][c] = Math.max(0, Math.min(MAX_WATER, next[r][c]));
    }

  // 5. commit + feedback (fields water/flood; houses flood by adjacency)
  const out: Cell[][] = grid.map((row, r) =>
    row.map((cell, c) => {
      const water = next[r][c];
      const updated: Cell = { ...cell, water, draining: draining[r][c] };
      if (cell.type === "field") {
        updated.wTicks = water >= 1 ? cell.wTicks + 1 : 0;
        updated.watered = updated.wTicks >= 2;
        updated.flooded = water >= MAX_WATER;
      }
      return updated;
    }),
  );
  for (const [r, c] of HOUSES) {
    if (out[r][c].type !== "house") continue;
    let flooded = false;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < ROWS &&
        nc >= 0 &&
        nc < COLS &&
        out[nr][nc].water >= MAX_WATER
      )
        flooded = true;
    }
    out[r][c] = { ...out[r][c], flooded };
  }
  return out;
}

export function resetWater(grid: Cell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      water: 0,
      wTicks: 0,
      watered: false,
      flooded: false,
      draining: false,
    })),
  );
}

// ── Whole-run helper (tests + pattern validation) ───────────────────────────

export interface RunStats {
  fieldsWatered: number;
  /** Number of fields on the board, used by "keep every field green" goals. */
  fieldsPlaced: number;
  fieldsFloodedEver: number;
  housesFloodedEver: number;
  /** Whether Rain was enabled for this run. Storm goals must never pass on a dry run. */
  stormTested: boolean;
  /** True only when water actually reached a Fish Mouth during the run. */
  fishmouthUsed: boolean;
  /** any field or house flooded at any tick — the unlock trigger ("first
   *  flood however caused") */
  anyFlood: boolean;
}

export function simulateRun(
  grid: Cell[][],
  raining: boolean,
  ticks: number = TICKS_PER_RUN,
): { grid: Cell[][]; stats: RunStats } {
  let g = resetWater(grid);
  const floodedFields = new Set<string>();
  const floodedHouses = new Set<string>();
  for (let i = 0; i < ticks; i++) {
    g = simulateTick(g, raining);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = g[r][c];
        if (cell.type === "field" && cell.flooded)
          floodedFields.add(`${r},${c}`);
        if (cell.type === "house" && cell.flooded)
          floodedHouses.add(`${r},${c}`);
      }
  }
  const fieldsWatered = g
    .flat()
    .filter((cell) => cell.type === "field" && cell.watered).length;
  const fieldsPlaced = g.flat().filter((cell) => cell.type === "field").length;
  return {
    grid: g,
    stats: {
      fieldsWatered,
      fieldsPlaced,
      fieldsFloodedEver: floodedFields.size,
      housesFloodedEver: floodedHouses.size,
      stormTested: raining,
      fishmouthUsed: g
        .flat()
        .some((cell) => cell.type === "fishmouth" && cell.water > 0),
      anyFlood: floodedFields.size > 0 || floodedHouses.size > 0,
    },
  };
}

// ── Unlock ladder (Guided band; announces itself in the UI) ─────────────────

export interface Progress {
  /** a field has been watered in some completed run */
  anyFieldWateredEver: boolean;
  /** 2+ fields watered within a single run */
  twoFieldsInOneRun: boolean;
  /** a flood happened, HOWEVER caused (Rain not required) */
  floodSeenEver: boolean;
  runsCompleted: number;
  /** Soft suggestions already achieved. Completion never regresses after a later run. */
  completedTargetIds: string[];
}

export const FRESH_PROGRESS: Progress = {
  anyFieldWateredEver: false,
  twoFieldsInOneRun: false,
  floodSeenEver: false,
  runsCompleted: 0,
  completedTargetIds: [],
};

export const GUIDED_BASE: PartType[] = ["channel", "field"];

export function advanceProgress(p: Progress, run: RunStats): Progress {
  return {
    anyFieldWateredEver: p.anyFieldWateredEver || run.fieldsWatered >= 1,
    twoFieldsInOneRun: p.twoFieldsInOneRun || run.fieldsWatered >= 2,
    floodSeenEver: p.floodSeenEver || run.anyFlood,
    runsCompleted: p.runsCompleted + 1,
    completedTargetIds: [...p.completedTargetIds],
  };
}

export function completeTarget(p: Progress, targetId: string): Progress {
  if (p.completedTargetIds.includes(targetId)) return p;
  return { ...p, completedTargetIds: [...p.completedTargetIds, targetId] };
}

/** Guided unlock ladder: 鱼嘴 (first watered field) → 水闸 (2 fields, one
 *  run) → 飞沙堰 + 宝瓶口 (first flood, however caused). Other bands: all. */
export function unlockedParts(band: Band, p: Progress): PartType[] {
  if (band !== "k2") return [...PART_ORDER];
  const parts: PartType[] = [...GUIDED_BASE];
  if (p.anyFieldWateredEver) parts.push("fishmouth");
  if (p.twoFieldsInOneRun) parts.push("gate");
  if (p.floodSeenEver) parts.push("sandweir", "bottleneck");
  return parts;
}

/** Which parts just unlocked between two progress states — drives the
 *  announce beat (each one announces itself; silent unlocks are forbidden). */
export function newlyUnlockedParts(
  band: Band,
  before: Progress,
  after: Progress,
): PartType[] {
  const prev = new Set(unlockedParts(band, before));
  return unlockedParts(band, after).filter((part) => !prev.has(part));
}

/**
 * Reachability guarantee (approved amendment): if a Guided child has finished
 * ~3 runs and never seen a flood, Shíxī gently invites the storm so the
 * flood-then-tools beat is reachable by every kid.
 */
export function shouldInviteStorm(band: Band, p: Progress): boolean {
  return band === "k2" && p.runsCompleted >= 3 && !p.floodSeenEver;
}

// ── Shíxī's run-end wondering question (Reflect — separate from Save) ───────

export interface WonderContext {
  stats: RunStats;
  /** a part that was just unlocked earlier and is present on this run's grid
   *  for the first time */
  newPartUsed?: PartType;
  inviteStorm: boolean;
}

export interface WonderPrompt {
  key: string;
  params?: Record<string, unknown>;
}

/** Priority: storm invitation (reachability) > new part > flood > clean run
 *  > evergreen pair. Curious, never corrective. */
export function pickWonder(
  ctx: WonderContext,
  rand: () => number = Math.random,
): WonderPrompt {
  if (ctx.inviteStorm) return { key: "waterworks.wonder.stormInvite" };
  if (ctx.newPartUsed)
    return { key: `waterworks.wonder.newPart.${ctx.newPartUsed}` };
  if (ctx.stats.anyFlood) return { key: "waterworks.wonder.flood" };
  if (ctx.stats.fieldsWatered >= 1) {
    return rand() < 0.5
      ? {
          key: "waterworks.wonder.clean",
          params: { count: ctx.stats.fieldsWatered },
        }
      : { key: "waterworks.wonder.next" };
  }
  return rand() < 0.5
    ? { key: "waterworks.wonder.dry" }
    : { key: "waterworks.wonder.favorite" };
}

// ── Soft targets (dismissible suggestions, never requirements) ──────────────

export interface SoftTarget {
  id: string;
  band: Band;
  met: (p: Progress, last: RunStats | null) => boolean;
}

export const SOFT_TARGETS: SoftTarget[] = [
  { id: "k2Water1", band: "k2", met: (p) => p.anyFieldWateredEver },
  { id: "k2Water2", band: "k2", met: (p) => p.twoFieldsInOneRun },
  {
    id: "k2RainSafe",
    band: "k2",
    met: (_p, last) =>
      !!last &&
      last.stormTested &&
      last.fieldsPlaced > 0 &&
      last.fieldsWatered === last.fieldsPlaced &&
      !last.anyFlood,
  },
  {
    id: "g35Water3",
    band: "g35",
    met: (_p, last) => !!last && last.fieldsWatered >= 3 && last.fishmouthUsed,
  },
  {
    id: "g35RainZeroFlood",
    band: "g35",
    met: (_p, last) =>
      !!last && last.stormTested && last.fieldsWatered >= 1 && !last.anyFlood,
  },
  {
    id: "g35HousesDry",
    band: "g35",
    met: (_p, last) =>
      !!last &&
      last.stormTested &&
      last.fieldsWatered >= 1 &&
      last.housesFloodedEver === 0,
  },
  {
    id: "g68Storm",
    band: "g68",
    met: (_p, last) =>
      !!last &&
      last.stormTested &&
      last.fieldsPlaced > 0 &&
      last.fieldsWatered === last.fieldsPlaced &&
      !last.anyFlood,
  },
];

function targetAlreadyCompleted(targetId: string, p: Progress): boolean {
  if (p.completedTargetIds.includes(targetId)) return true;
  // Backward-compatible with drafts created before target IDs were stored.
  if (targetId === "k2Water1") return p.anyFieldWateredEver;
  if (targetId === "k2Water2") return p.twoFieldsInOneRun;
  return false;
}

/** Store every suggestion genuinely achieved by this run. This makes soft
 * target progress monotonic even when one ambitious build satisfies more
 * than one idea at once. */
export function completeMetTargets(
  band: Band,
  p: Progress,
  stats: RunStats,
): Progress {
  return SOFT_TARGETS.filter(
    (target) => target.band === band && target.met(p, stats),
  ).reduce((next, target) => completeTarget(next, target.id), p);
}

export function currentTarget(
  band: Band,
  p: Progress,
  _last: RunStats | null,
  dismissed: ReadonlySet<string>,
): SoftTarget | null {
  return (
    SOFT_TARGETS.find(
      (target) =>
        target.band === band &&
        !dismissed.has(target.id) &&
        !targetAlreadyCompleted(target.id, p),
    ) ?? null
  );
}

// ── Pattern book (possibility shown, solution never dictated) ───────────────

export interface TrackedPart {
  r: number;
  c: number;
  type: PartType;
}

export interface RiverPattern {
  id: string;
  /** locale-keyed names resolve via waterworks.pattern.<id> */
  parts: TrackedPart[];
}

/** Guided patterns may be previewed at any time, but cannot inject parts the
 * child has not earned yet. */
export function patternIsAvailable(
  pattern: RiverPattern,
  availableParts: readonly PartType[],
): boolean {
  const available = new Set(availableParts);
  return pattern.parts.every((part) => available.has(part.type));
}

export const PATTERN_BOOK: RiverPattern[] = [
  {
    id: "splitRiver", // 两条河 — one 鱼嘴, two branches, two fields
    parts: [
      { r: 4, c: 1, type: "channel" },
      { r: 4, c: 2, type: "channel" },
      { r: 4, c: 3, type: "channel" },
      { r: 4, c: 4, type: "channel" },
      { r: 4, c: 5, type: "fishmouth" },
      { r: 3, c: 5, type: "channel" },
      { r: 3, c: 6, type: "channel" },
      { r: 3, c: 7, type: "field" },
      { r: 5, c: 5, type: "channel" },
      { r: 5, c: 6, type: "channel" },
      { r: 5, c: 7, type: "field" },
    ],
  },
  {
    id: "safeFarm", // 平安农田 — 宝瓶口 throttles so the field never floods
    parts: [
      { r: 4, c: 1, type: "channel" },
      { r: 4, c: 2, type: "channel" },
      { r: 4, c: 3, type: "channel" },
      { r: 4, c: 4, type: "bottleneck" },
      { r: 4, c: 5, type: "field" },
    ],
  },
  {
    id: "stormProofVillage", // 防洪村 — split + 飞沙堰 bleed + throttled fields
    parts: [
      { r: 4, c: 1, type: "channel" },
      { r: 4, c: 2, type: "channel" },
      { r: 4, c: 3, type: "channel" },
      { r: 4, c: 4, type: "fishmouth" },
      { r: 3, c: 4, type: "channel" },
      { r: 3, c: 5, type: "sandweir" },
      { r: 4, c: 5, type: "bottleneck" },
      { r: 4, c: 6, type: "field" },
      { r: 5, c: 4, type: "channel" },
      { r: 5, c: 5, type: "channel" },
      { r: 5, c: 6, type: "bottleneck" },
      { r: 5, c: 7, type: "field" },
    ],
  },
];

/** Apply a pattern onto a fresh board of the given band. */
export function applyPattern(band: Band, pattern: RiverPattern): Cell[][] {
  let grid = freshGrid(band);
  grid = grid.map((row) => row.slice());
  for (const part of pattern.parts) {
    const cell = grid[part.r]?.[part.c];
    if (!cell || cell.type === "source" || cell.type === "house") continue;
    grid[part.r][part.c] = blankCell(part.type);
  }
  return grid;
}
