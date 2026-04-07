/**
 * Maze Maps & Smart Paths — Set 2 Game 1 (AI strand).
 *
 * Turn-based maze game: the learner moves Byte Bot one tile at a time
 * to collect Idea Orbs while avoiding deterministic Sweepers.
 * After each learner move, sweepers advance one step on their loop.
 *
 * Phases: intro → tutorial → guided → main → exitTicket → celebration
 *
 * Keyboard: Arrow keys to move, Space to wait
 * Touch: on-screen D-pad buttons
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { type GameResult, type MissionBriefing } from "./shared/GameShell";
import "./shared/game-effects.css";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type Dir = "up" | "down" | "left" | "right" | "wait";

interface SweepConfig {
  id: string;
  loop: [number, number][];
  startIndex: number;
}

interface MazeMapConfig {
  id: string;
  rows: number;
  cols: number;
  start: [number, number];
  goal: [number, number];
  walls: [number, number][];
  orbs: [number, number][];
  safePads: [number, number][];
  sweepers: SweepConfig[];
}

type GamePhase = "intro" | "tutorial" | "watchPattern" | "guided" | "main" | "exitTicket" | "celebration";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const CELL = 52;
const MAX_COLLISIONS_FOR_HINT = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Map Data
// ═══════════════════════════════════════════════════════════════════════════

const MAPS: Record<string, MazeMapConfig> = {
  tutorial: {
    id: "tutorial", rows: 4, cols: 4,
    start: [3, 0], goal: [0, 3],
    walls: [[1, 1], [2, 2]],
    orbs: [[0, 1], [2, 0], [3, 3]],
    safePads: [],
    sweepers: [],
  },
  guided: {
    id: "guided", rows: 5, cols: 5,
    start: [4, 0], goal: [0, 4],
    walls: [[1, 1], [1, 2], [3, 3], [2, 4]],
    orbs: [[0, 2], [2, 0], [4, 3], [3, 1]],
    safePads: [[2, 2]],
    sweepers: [
      { id: "s1", loop: [[1, 3], [1, 4], [2, 4], [2, 3], [1, 3]], startIndex: 0 },
    ],
  },
  main: {
    id: "main", rows: 7, cols: 7,
    start: [6, 0], goal: [0, 6],
    walls: [[1, 1], [1, 2], [2, 4], [3, 1], [3, 5], [4, 3], [5, 5], [5, 1]],
    orbs: [[0, 2], [1, 5], [2, 0], [4, 6], [5, 3], [6, 5]],
    safePads: [[3, 3], [1, 4]],
    sweepers: [
      { id: "s1", loop: [[2, 2], [2, 3], [3, 3], [3, 2], [2, 2]], startIndex: 0 },
      { id: "s2", loop: [[4, 4], [4, 5], [5, 5], [5, 4], [4, 4]], startIndex: 0 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function isWall(r: number, c: number, map: MazeMapConfig): boolean {
  return r < 0 || c < 0 || r >= map.rows || c >= map.cols || map.walls.some(([wr, wc]) => wr === r && wc === c);
}

function cellAt(r: number, c: number, arr: [number, number][]): boolean {
  return arr.some(([ar, ac]) => ar === r && ac === c);
}

function applyDir(r: number, c: number, dir: Dir): [number, number] {
  if (dir === "up") return [r - 1, c];
  if (dir === "down") return [r + 1, c];
  if (dir === "left") return [r, c - 1];
  if (dir === "right") return [r, c + 1];
  return [r, c]; // wait
}

// ═══════════════════════════════════════════════════════════════════════════
// Briefing
// ═══════════════════════════════════════════════════════════════════════════

const BRIEFING: MissionBriefing = {
  title: "Maze Maps & Smart Paths",
  story: "Help Byte Bot collect the Idea Orbs! Watch the Sweepers and choose a smart path through the maze.",
  icon: "🗺️",
  tips: [
    "Move one step at a time",
    "Watch the Sweepers before you move",
    "Safe Pads protect you from Sweepers",
  ],
  chapterLabel: "AI Lab",
  themeColor: "cyan",
};

// ═══════════════════════════════════════════════════════════════════════════
// Maze Board — renders the grid + entities
// ═══════════════════════════════════════════════════════════════════════════

function MazeBoard({
  map,
  playerPos,
  collectedOrbs,
  sweeperPositions,
  showHintPath,
  flashCell,
}: {
  map: MazeMapConfig;
  playerPos: [number, number];
  collectedOrbs: Set<string>;
  sweeperPositions: Record<string, [number, number]>;
  showHintPath?: [number, number][];
  flashCell?: string | null;
}) {
  const w = map.cols * CELL;
  const h = map.rows * CELL;

  return (
    <div className="relative mx-auto rounded-xl overflow-hidden border-2 border-cyan-300 shadow-lg select-none"
      style={{ width: w, height: h, maxWidth: "100%" }}>

      {/* Grid cells */}
      {Array.from({ length: map.rows * map.cols }, (_, i) => {
        const r = Math.floor(i / map.cols);
        const c = i % map.cols;
        const key = `${r}-${c}`;
        const isW = map.walls.some(([wr, wc]) => wr === r && wc === c);
        const isGoal = map.goal[0] === r && map.goal[1] === c;
        const isSafe = cellAt(r, c, map.safePads);
        const isOrb = cellAt(r, c, map.orbs) && !collectedOrbs.has(key);
        const isFlash = flashCell === key;

        let bg = "bg-cyan-50";
        if (isW) bg = "bg-slate-600";
        else if (isGoal) bg = "bg-emerald-200";
        else if (isSafe) bg = "bg-amber-100";

        return (
          <div
            key={key}
            className={`absolute flex items-center justify-center ${bg} ${isFlash ? "ring-2 ring-red-400" : ""}`}
            style={{
              left: c * CELL, top: r * CELL, width: CELL, height: CELL,
              borderRight: "1px solid rgba(0,0,0,0.06)",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {isW && <span className="text-xl">🧱</span>}
            {isGoal && <span className="text-2xl float-idle">🏁</span>}
            {isSafe && !isW && <span className="text-lg">🛡️</span>}
            {isOrb && <span className="text-xl float-idle">💡</span>}
          </div>
        );
      })}

      {/* Hint path dots */}
      {showHintPath?.map(([r, c], i) => (
        <div key={`hint-${i}`} className="absolute w-2 h-2 rounded-full bg-cyan-400/40 z-5"
          style={{ left: c * CELL + CELL / 2 - 4, top: r * CELL + CELL / 2 - 4 }} />
      ))}

      {/* Sweepers */}
      {Object.entries(sweeperPositions).map(([id, [sr, sc]]) => (
        <div key={id} className="absolute flex items-center justify-center z-10 transition-all duration-200"
          style={{ left: sc * CELL, top: sr * CELL, width: CELL, height: CELL }}>
          <span className="text-2xl">🔴</span>
        </div>
      ))}

      {/* Player */}
      <div className="absolute flex items-center justify-center z-20 transition-all duration-200"
        style={{ left: playerPos[1] * CELL, top: playerPos[0] * CELL, width: CELL, height: CELL }}>
        <span className="text-2xl">🤖</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// D-Pad Controls
// ═══════════════════════════════════════════════════════════════════════════

function MazeControls({ onMove, disabled }: { onMove: (dir: Dir) => void; disabled?: boolean }) {
  const btn = "w-14 h-14 rounded-xl bg-white border-2 border-cyan-200 text-2xl font-bold shadow active:scale-90 disabled:opacity-40 transition-transform flex items-center justify-center";
  return (
    <div className="flex flex-col items-center gap-1">
      <button className={btn} onClick={() => onMove("up")} disabled={disabled} aria-label="Move up">↑</button>
      <div className="flex gap-1">
        <button className={btn} onClick={() => onMove("left")} disabled={disabled} aria-label="Move left">←</button>
        <button className={`${btn} text-base`} onClick={() => onMove("wait")} disabled={disabled} aria-label="Wait">⏸️</button>
        <button className={btn} onClick={() => onMove("right")} disabled={disabled} aria-label="Move right">→</button>
      </div>
      <button className={btn} onClick={() => onMove("down")} disabled={disabled} aria-label="Move down">↓</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Game Component
// ═══════════════════════════════════════════════════════════════════════════

function MazeMapsCore({ onFinish }: { onFinish: (result: GameResult) => void }) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [mapKey, setMapKey] = useState<string>("tutorial");
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 0]);
  const [collectedOrbs, setCollectedOrbs] = useState<Set<string>>(new Set());
  const [sweeperIndices, setSweeperIndices] = useState<Record<string, number>>({});
  const [checkpoint, setCheckpoint] = useState<[number, number]>([0, 0]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [collisions, setCollisions] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [, setShowHint] = useState(false);
  const [exitAnswer, setExitAnswer] = useState<number | null>(null);
  const [levelComplete, setLevelComplete] = useState(false);
  const [animating, setAnimating] = useState(false);

  const map = MAPS[mapKey];

  // ── Initialize map ──
  const initMap = useCallback((key: string) => {
    const m = MAPS[key];
    setMapKey(key);
    setPlayerPos([...m.start]);
    setCheckpoint([...m.start]);
    setCollectedOrbs(new Set());
    setLevelComplete(false);
    setFeedback(null);
    setFlashCell(null);
    setShowHint(false);
    // Initialize sweeper indices
    const indices: Record<string, number> = {};
    m.sweepers.forEach((s) => { indices[s.id] = s.startIndex; });
    setSweeperIndices(indices);
  }, []);

  // Init on phase change
  useEffect(() => {
    if (phase === "tutorial") initMap("tutorial");
    else if (phase === "watchPattern" || phase === "guided") initMap("guided");
    else if (phase === "main") initMap("main");
  }, [phase, initMap]);

  // ── Compute sweeper positions ──
  const sweeperPositions: Record<string, [number, number]> = {};
  map.sweepers.forEach((s) => {
    const idx = sweeperIndices[s.id] ?? s.startIndex;
    sweeperPositions[s.id] = s.loop[idx % (s.loop.length - 1)];
  });

  // ── Keyboard input ──
  useEffect(() => {
    if (phase !== "tutorial" && phase !== "guided" && phase !== "main" && phase !== "watchPattern") return;
    if (levelComplete || animating) return;

    const onKey = (e: KeyboardEvent) => {
      const dirMap: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right", " ": "wait",
      };
      const dir = dirMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, levelComplete, animating, playerPos, sweeperIndices, collectedOrbs]);

  // ── Handle one move (turn-based) ──
  const handleMove = useCallback((dir: Dir) => {
    if (levelComplete || animating) return;
    if (phase === "watchPattern") return; // observing only

    setAnimating(true);
    setFeedback(null);
    setFlashCell(null);

    // 1. Compute player's next position
    const [nr, nc] = applyDir(playerPos[0], playerPos[1], dir);

    // Check wall
    if (dir !== "wait" && isWall(nr, nc, map)) {
      setAnimating(false);
      return;
    }

    const newPos: [number, number] = dir === "wait" ? [...playerPos] : [nr, nc];
    setPlayerPos(newPos);
    setMoves((m) => m + 1);

    // 2. Collect orb
    const orbKey = `${newPos[0]}-${newPos[1]}`;
    const newCollected = new Set(collectedOrbs);
    if (cellAt(newPos[0], newPos[1], map.orbs) && !newCollected.has(orbKey)) {
      newCollected.add(orbKey);
      setCollectedOrbs(newCollected);
      setScore((s) => s + 10);
    }

    // 3. Update checkpoint if on safe pad or start
    if (cellAt(newPos[0], newPos[1], map.safePads) || (newPos[0] === map.start[0] && newPos[1] === map.start[1])) {
      setCheckpoint([...newPos]);
    }

    // 4. Advance sweepers
    const newIndices: Record<string, number> = {};
    const newSweeperPos: Record<string, [number, number]> = {};
    map.sweepers.forEach((s) => {
      const idx = (sweeperIndices[s.id] ?? s.startIndex) + 1;
      const loopLen = s.loop.length - 1; // last element duplicates first for wrap
      newIndices[s.id] = idx % loopLen;
      newSweeperPos[s.id] = s.loop[idx % loopLen];
    });
    setSweeperIndices(newIndices);

    // 5. Check collision (player on sweeper OR sweeper on player)
    const collided = Object.values(newSweeperPos).some(
      ([sr, sc]) => sr === newPos[0] && sc === newPos[1],
    );

    if (collided) {
      setCollisions((c) => c + 1);
      setFlashCell(orbKey);
      setFeedback(t("games.mazeMaps.collisionHint", { defaultValue: "Oops! Back to safety. Watch the pattern first." }));

      // Soft reset to checkpoint — preserve collected orbs
      setTimeout(() => {
        setPlayerPos([...checkpoint]);
        setFlashCell(null);
        setAnimating(false);

        // Show hint after repeated collisions
        if (collisions + 1 >= MAX_COLLISIONS_FOR_HINT) {
          setShowHint(true);
          setHintsUsed((h) => h + 1);
          setFeedback(t("games.mazeMaps.hintSafePad", { defaultValue: "Try the Safe Pad before moving past the Sweeper." }));
        }
      }, 600);
      return;
    }

    // 6. Check win
    const allOrbs = map.orbs.every(([or, oc]) => newCollected.has(`${or}-${oc}`));
    const atGoal = newPos[0] === map.goal[0] && newPos[1] === map.goal[1];

    if (allOrbs && atGoal) {
      setLevelComplete(true);
      setFeedback(t("games.mazeMaps.levelComplete", { defaultValue: "All orbs collected! Great path!" }));
    } else if (atGoal && !allOrbs) {
      setFeedback(t("games.mazeMaps.collectAll", { defaultValue: "Collect all the Idea Orbs first!" }));
    }

    setAnimating(false);
  }, [playerPos, map, sweeperIndices, collectedOrbs, checkpoint, collisions, levelComplete, animating, phase, t]);

  // ── Phase transitions ──
  const advancePhase = useCallback(() => {
    if (phase === "intro") setPhase("tutorial");
    else if (phase === "tutorial") setPhase("watchPattern");
    else if (phase === "watchPattern") setPhase("guided");
    else if (phase === "guided") setPhase("main");
    else if (phase === "main") setPhase("exitTicket");
    else if (phase === "exitTicket") setPhase("celebration");
    else if (phase === "celebration") {
      onFinish({
        gameKey: "maze_maps",
        score,
        total: 60, // max: 6 orbs × 10 pts
        streakMax: Math.max(0, 6 - collisions),
        roundsCompleted: 3,
        hintsUsed,
        firstTryClear: collisions === 0,
        achievements: collisions === 0 ? ["Perfect Explorer"] : [],
      });
    }
  }, [phase, score, collisions, hintsUsed, onFinish]);

  // Auto-advance on level complete
  useEffect(() => {
    if (levelComplete) {
      const t = setTimeout(advancePhase, 1500);
      return () => clearTimeout(t);
    }
  }, [levelComplete, advancePhase]);

  // ── Watch Pattern phase: auto-cycle sweeper ──
  const watchTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [watchCycles, setWatchCycles] = useState(0);

  useEffect(() => {
    if (phase !== "watchPattern") return;
    watchTimerRef.current = setInterval(() => {
      setSweeperIndices((prev) => {
        const next: Record<string, number> = {};
        MAPS.guided.sweepers.forEach((s) => {
          const idx = (prev[s.id] ?? s.startIndex) + 1;
          next[s.id] = idx % (s.loop.length - 1);
        });
        return next;
      });
      setWatchCycles((c) => c + 1);
    }, 800);
    return () => clearInterval(watchTimerRef.current);
  }, [phase]);

  // ── Render ──

  // Intro phase
  if (phase === "intro") {
    return (
      <div className="text-center space-y-6 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">🗺️</div>
        <h2 className="text-2xl font-extrabold text-cyan-800">
          {t("games.mazeMaps.introTitle", { defaultValue: "Maze Maps & Smart Paths" })}
        </h2>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          {t("games.mazeMaps.introDesc", { defaultValue: "Help Byte Bot collect the Idea Orbs. Watch the Sweepers and choose a smart path!" })}
        </p>
        <button
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={advancePhase}
        >
          {t("games.mazeMaps.letsGo", { defaultValue: "Let's Go!" })}
        </button>
      </div>
    );
  }

  // Watch Pattern phase
  if (phase === "watchPattern") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-center">
          <p className="text-lg font-bold text-amber-800">
            {t("games.mazeMaps.watchFirst", { defaultValue: "Watch the Sweeper's pattern first!" })}
          </p>
          <p className="text-sm text-amber-600 mt-1">
            {t("games.mazeMaps.watchDesc", { defaultValue: "See how it moves in a loop? Watch one more cycle..." })}
          </p>
        </div>
        <MazeBoard
          map={MAPS.guided}
          playerPos={MAPS.guided.start}
          collectedOrbs={new Set()}
          sweeperPositions={sweeperPositions}
        />
        {watchCycles >= 4 && (
          <div className="text-center">
            <button
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow hover:scale-105 active:scale-95 transition-transform"
              onClick={advancePhase}
            >
              {t("games.mazeMaps.readyToTry", { defaultValue: "I see the pattern! Let me try." })}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Exit Ticket phase
  if (phase === "exitTicket") {
    const options = [
      { id: 0, label: t("games.mazeMaps.exitA", { defaultValue: "Run straight through as fast as possible" }), correct: false },
      { id: 1, label: t("games.mazeMaps.exitB", { defaultValue: "Watch the pattern, wait at a safe spot, then move" }), correct: true },
      { id: 2, label: t("games.mazeMaps.exitC", { defaultValue: "Close your eyes and hope for the best" }), correct: false },
    ];
    return (
      <div className="text-center space-y-6 py-8 slide-up-fade max-w-lg mx-auto">
        <div className="text-5xl">🤔</div>
        <h3 className="text-xl font-extrabold text-cyan-800">
          {t("games.mazeMaps.exitQuestion", { defaultValue: "Which path is smartest?" })}
        </h3>
        <div className="space-y-3">
          {options.map((o) => (
            <button
              key={o.id}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all ${
                exitAnswer === null
                  ? "border-slate-200 hover:border-cyan-300 bg-white"
                  : exitAnswer === o.id && o.correct
                    ? "border-green-500 bg-green-50 text-green-800"
                    : exitAnswer === o.id && !o.correct
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 opacity-60"
              }`}
              onClick={() => {
                if (exitAnswer !== null) return;
                setExitAnswer(o.id);
                if (o.correct) {
                  setScore((s) => s + 10);
                  setTimeout(advancePhase, 1200);
                } else {
                  setTimeout(() => setExitAnswer(null), 1500);
                }
              }}
              disabled={exitAnswer !== null}
            >
              {o.label}
            </button>
          ))}
        </div>
        {exitAnswer !== null && !options[exitAnswer].correct && (
          <p className="text-sm text-red-600">
            {t("games.mazeMaps.exitRetry", { defaultValue: "Not quite — try again!" })}
          </p>
        )}
      </div>
    );
  }

  // Celebration phase
  if (phase === "celebration") {
    return (
      <div className="text-center space-y-6 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">🎉</div>
        <h3 className="text-2xl font-extrabold text-cyan-800">
          {t("games.mazeMaps.celebTitle", { defaultValue: "You used a smart path!" })}
        </h3>
        <p className="text-lg text-slate-600">
          {t("games.mazeMaps.celebDesc", { defaultValue: "You watched, planned, and chose a smart path. Smart systems look for patterns before they act." })}
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full font-bold">
            {t("games.mazeMaps.orbsCollected", { defaultValue: "Orbs" })}: {Math.floor(score / 10)}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold">
            {t("games.mazeMaps.movesUsed", { defaultValue: "Moves" })}: {moves}
          </span>
        </div>
        <button
          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={advancePhase}
        >
          {t("games.shared.finish", { defaultValue: "Finish" })}
        </button>
      </div>
    );
  }

  // ── Playing phases (tutorial / guided / main) ──
  const orbsInMap = map.orbs.length;
  const orbsCollectedCount = [...collectedOrbs].filter((k) => {
    const [r, c] = k.split("-").map(Number);
    return cellAt(r, c, map.orbs);
  }).length;

  const phaseLabel = phase === "tutorial"
    ? t("games.mazeMaps.phaseTutorial", { defaultValue: "Tutorial" })
    : phase === "guided"
      ? t("games.mazeMaps.phaseGuided", { defaultValue: "Guided Play" })
      : t("games.mazeMaps.phaseMain", { defaultValue: "Main Challenge" });

  return (
    <div className="space-y-3">
      {/* Phase banner */}
      <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-3 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">{phaseLabel}</p>
        <p className="text-sm text-slate-700 mt-1">
          {phase === "tutorial" && t("games.mazeMaps.tutorialHint", { defaultValue: "Collect all Idea Orbs and reach the Goal!" })}
          {phase === "guided" && t("games.mazeMaps.guidedHint", { defaultValue: "Watch the Sweeper. Use the Safe Pad!" })}
          {phase === "main" && t("games.mazeMaps.mainHint", { defaultValue: "Two Sweepers! Plan a smart path." })}
        </p>
      </div>

      {/* HUD */}
      <div className="flex items-center justify-between px-2 text-sm font-bold">
        <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full">
          💡 {orbsCollectedCount}/{orbsInMap}
        </span>
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
          {t("games.mazeMaps.movesLabel", { defaultValue: "Moves" })}: {moves}
        </span>
        {score > 0 && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
            ⭐ {score}
          </span>
        )}
      </div>

      {/* Board */}
      <MazeBoard
        map={map}
        playerPos={playerPos}
        collectedOrbs={collectedOrbs}
        sweeperPositions={sweeperPositions}
        flashCell={flashCell}
      />

      {/* Controls */}
      <div className="flex justify-center pt-2">
        <MazeControls onMove={handleMove} disabled={levelComplete || animating} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-center py-2 rounded-xl font-bold text-sm ${
          levelComplete ? "bg-green-100 text-green-800 bounce-in" : "bg-amber-100 text-amber-800"
        }`}>
          {feedback}
        </div>
      )}

      {/* Controls hint */}
      <p className="text-center text-xs text-slate-400">
        {t("games.mazeMaps.controlsHint", { defaultValue: "Arrow keys to move \u2022 Space to wait" })}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════

export default function MazeMapsGame({
  onComplete,
}: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) {
  return (
    <GameShell
      gameKey="maze_maps"
      title="Maze Maps & Smart Paths"
      briefing={BRIEFING}
      onComplete={onComplete ?? (() => {})}
    >
      {({ onFinish }) => <MazeMapsCore onFinish={onFinish} />}
    </GameShell>
  );
}
