/**
 * Tank Trek solvability solver — TEST UTILITY ONLY (never import from game
 * code; lives under src/test so it stays out of the app bundle).
 *
 * Mirrors the game's exact execution mechanics
 * (src/components/games/TankTrekGame.tsx run loop):
 *  - Commands: FWD (move one cell in facing direction), LEFT, RIGHT.
 *    Every command — including turns — counts toward maxCommands.
 *  - FWD into a wall or off-grid ends the run as a failure, so valid
 *    solutions only ever make legal moves.
 *  - Chips collect when the robot ENTERS their cell (latched in a set).
 *  - Crossing the goal LATCHES reachedGoal but does NOT stop execution —
 *    so chips may be collected before or after the goal crossing. The
 *    solver therefore tracks goal-visited as a latch bit, not a terminal.
 *  - "switch"/"gate" cell types exist in the type union but have no
 *    handling in the executor — the game treats them as floor, so the
 *    solver does too.
 *
 * Completion objective verified: ALL chips collected AND goal visited.
 *
 * Two metrics per level:
 *  - minimal TOTAL commands (BFS, every command costs 1)
 *      → must be ≤ maxCommands (when a cap exists)
 *  - minimal FORWARD moves over complete solutions (0-1 BFS: turns cost 0)
 *      → must be ≤ par, i.e. 3 stars must be reachable while doing the
 *        full objective (extends PR #605's star contract to all content)
 */

type Dir = "N" | "E" | "S" | "W";

export interface SolvableLevel {
  id: string;
  cols: number;
  rows: number;
  grid: string[][];
  startRow: number;
  startCol: number;
  startDir: Dir;
  maxCommands?: number;
  par?: number;
}

export interface SolveResult {
  /** Minimal total command count (forwards + turns) for the full objective. */
  minTotalCommands: number;
  /** Minimal forward-move count over all complete solutions. */
  minForwardMoves: number;
}

const DIR_DELTA: Record<Dir, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};
const TURN_LEFT: Record<Dir, Dir> = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };
const DIRS: Dir[] = ["N", "E", "S", "W"];

interface Searched {
  r: number;
  c: number;
  d: Dir;
  mask: number;
  goal: boolean;
}

function encode(s: Searched, chipCount: number): number {
  // r,c ≤ 7 bits is plenty for our grids; mask up to chipCount bits; goal 1 bit.
  const dirIdx = DIRS.indexOf(s.d);
  return (
    (((s.r * 32 + s.c) * 4 + dirIdx) * (1 << chipCount) + s.mask) * 2 +
    (s.goal ? 1 : 0)
  );
}

export type Objective = "goal" | "full";

/**
 * Generic shortest-path over the level's state space with a configurable
 * cost per command type. cost=1/1 → minimal total commands (plain BFS);
 * cost fwd=1, turn=0 → minimal forwards (0-1 BFS via deque).
 *
 * objective "goal" = the game's hard completion semantics (chips optional);
 * objective "full" = all chips collected AND goal visited (the level's
 * stated objective for chip levels — chips must never be a trap).
 */
function shortestPath(
  level: SolvableLevel,
  fwdCost: number,
  turnCost: number,
  objective: Objective,
): number | null {
  const chips: Array<[number, number]> = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      if (level.grid[r][c] === "chip") chips.push([r, c]);
    }
  }
  const chipCount = chips.length;
  const chipIndex = new Map<string, number>(
    chips.map(([r, c], i) => [`${r}-${c}`, i]),
  );
  const fullMask = (1 << chipCount) - 1;

  const start: Searched = {
    r: level.startRow,
    c: level.startCol,
    d: level.startDir,
    mask: 0,
    goal: level.grid[level.startRow][level.startCol] === "goal",
  };

  // 0-1 BFS deque: states with 0-cost edges go to the front. Relaxation
  // re-enqueues on improvement (SPFA-style), so we run to exhaustion and
  // take the best satisfying distance rather than early-returning — state
  // spaces here are tiny (≤ ~800 states), correctness over micro-speed.
  const dist = new Map<number, number>();
  const deque: Searched[] = [start];
  dist.set(encode(start, chipCount), 0);
  let best: number | null = null;

  while (deque.length > 0) {
    const cur = deque.shift()!;
    const curKey = encode(cur, chipCount);
    const curDist = dist.get(curKey)!;

    const satisfied =
      cur.goal && (objective === "goal" || cur.mask === fullMask);
    if (satisfied) {
      if (best === null || curDist < best) best = curDist;
      continue;
    }
    if (best !== null && curDist >= best) continue;

    // Turns
    for (const nd of [TURN_LEFT[cur.d], TURN_RIGHT[cur.d]]) {
      const next: Searched = { ...cur, d: nd };
      const key = encode(next, chipCount);
      const nDist = curDist + turnCost;
      if (!dist.has(key) || dist.get(key)! > nDist) {
        dist.set(key, nDist);
        if (turnCost === 0) deque.unshift(next);
        else deque.push(next);
      }
    }

    // Forward
    const [dr, dc] = DIR_DELTA[cur.d];
    const nr = cur.r + dr;
    const nc = cur.c + dc;
    if (
      nr >= 0 &&
      nr < level.rows &&
      nc >= 0 &&
      nc < level.cols &&
      level.grid[nr][nc] !== "wall"
    ) {
      const cell = level.grid[nr][nc];
      const chipIdx = chipIndex.get(`${nr}-${nc}`);
      const next: Searched = {
        r: nr,
        c: nc,
        d: cur.d,
        mask: chipIdx !== undefined ? cur.mask | (1 << chipIdx) : cur.mask,
        goal: cur.goal || cell === "goal",
      };
      const key = encode(next, chipCount);
      const nDist = curDist + fwdCost;
      if (!dist.has(key) || dist.get(key)! > nDist) {
        dist.set(key, nDist);
        deque.push(next);
      }
    }
  }

  return best; // null = objective unreachable
}

/**
 * Solve a level for the given objective. Returns null when the objective
 * is unreachable regardless of program length.
 */
export function solveTankLevel(
  level: SolvableLevel,
  objective: Objective = "full",
): SolveResult | null {
  const minTotalCommands = shortestPath(level, 1, 1, objective);
  if (minTotalCommands === null) return null;
  const minForwardMoves = shortestPath(level, 1, 0, objective);
  if (minForwardMoves === null) return null;
  return { minTotalCommands, minForwardMoves };
}
