/**
 * Tank Trek — A robotics puzzle adventure.
 *
 * Kids guide a friendly robot through mazes by queuing movement commands.
 * Teaches sequencing, planning, pattern recognition, and intro AI concepts.
 *
 * Pure React/Canvas implementation following the SequenceDragDropGame pattern.
 * Can be upgraded to Unity WebGL later using the same integration bridge.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import {
  ArrowUp, ArrowLeft, ArrowRight, RotateCcw, Play, Trash2, ChevronRight,
  Lightbulb, Star,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type Dir = "N" | "E" | "S" | "W";
type Command = "FWD" | "LEFT" | "RIGHT";
type CellType = "floor" | "wall" | "goal" | "start" | "chip" | "switch" | "gate";

interface TankTrekLevel {
  id: string;
  name: string;
  nameEs?: string;
  cols: number;
  rows: number;
  grid: CellType[][]; // row-major: grid[row][col]
  startRow: number;
  startCol: number;
  startDir: Dir;
  maxCommands?: number;
  par?: number; // optimal command count for 3 stars
  storySnippet?: string;
  storySnippetEs?: string;
  hint?: string;
  hintEs?: string;
}

interface TankTrekConfig {
  gameKey: "tank_trek";
  chapters: {
    id: string;
    title: string;
    titleEs?: string;
    levels: TankTrekLevel[];
  }[];
}

interface TankTrekGameProps {
  config: TankTrekConfig;
  onComplete: (result?: GameResult) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CELL_SIZE = 56;
const ROBOT_EMOJI = "🤖";
const GOAL_EMOJI = "🎯";
const CHIP_EMOJI = "💎";
const WALL_COLOR = "#374151";
const FLOOR_COLOR = "#f0f9ff";
const GOAL_COLOR = "#d1fae5";
const SWITCH_COLOR = "#fef3c7";
const GATE_COLOR = "#fecaca";
const CHIP_COLOR = "#ede9fe";

const DIR_DELTA: Record<Dir, [number, number]> = {
  N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1],
};
const TURN_LEFT: Record<Dir, Dir> = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };
const DIR_ROTATION: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

// ── Built-in Levels ────────────────────────────────────────────────────────

const BUILTIN_LEVELS: TankTrekConfig = {
  gameKey: "tank_trek",
  chapters: [
    {
      id: "ch1", title: "Simple Pathfinding", titleEs: "Caminos Simples",
      levels: [
        {
          id: "1-1", name: "First Steps", nameEs: "Primeros Pasos",
          cols: 4, rows: 4, startRow: 3, startCol: 0, startDir: "N",
          par: 3,
          storySnippet: "Your robot friend just woke up! Help it reach the star.",
          storySnippetEs: "¡Tu robot amigo acaba de despertar! Ayúdalo a llegar a la estrella.",
          hint: "Try: Forward, Forward, Forward",
          hintEs: "Intenta: Adelante, Adelante, Adelante",
          grid: [
            ["floor", "floor", "floor", "goal"],
            ["wall",  "wall",  "wall",  "floor"],
            ["floor", "floor", "floor", "floor"],
            ["start", "floor", "wall",  "wall"],
          ],
        },
        {
          id: "1-2", name: "Turn Right", nameEs: "Gira a la Derecha",
          cols: 4, rows: 4, startRow: 3, startCol: 0, startDir: "N",
          par: 5,
          storySnippet: "Nice! Now let's learn to turn. The path goes right!",
          storySnippetEs: "¡Genial! Ahora aprendamos a girar. ¡El camino va a la derecha!",
          grid: [
            ["wall",  "wall",  "wall",  "wall"],
            ["goal",  "floor", "wall",  "wall"],
            ["floor", "floor", "wall",  "wall"],
            ["start", "floor", "wall",  "wall"],
          ],
        },
        {
          id: "1-3", name: "Zig-Zag", nameEs: "Zigzag",
          cols: 5, rows: 5, startRow: 4, startCol: 0, startDir: "N",
          par: 8,
          storySnippet: "A winding path! Plan your turns carefully.",
          storySnippetEs: "¡Un camino sinuoso! Planifica tus giros con cuidado.",
          grid: [
            ["wall",  "wall",  "wall",  "wall",  "goal"],
            ["wall",  "wall",  "wall",  "floor", "floor"],
            ["wall",  "wall",  "floor", "floor", "wall"],
            ["wall",  "floor", "floor", "wall",  "wall"],
            ["start", "floor", "wall",  "wall",  "wall"],
          ],
        },
      ],
    },
    {
      id: "ch2", title: "Obstacles & Collectibles", titleEs: "Obstáculos y Coleccionables",
      levels: [
        {
          id: "2-1", name: "Data Chips", nameEs: "Chips de Datos",
          cols: 5, rows: 4, startRow: 3, startCol: 0, startDir: "E",
          par: 7,
          storySnippet: "Collect the data chips on your way to the goal!",
          storySnippetEs: "¡Recoge los chips de datos en tu camino a la meta!",
          grid: [
            ["wall",  "wall",  "wall",  "wall",  "goal"],
            ["wall",  "wall",  "wall",  "floor", "floor"],
            ["floor", "chip",  "floor", "chip",  "wall"],
            ["start", "floor", "floor", "floor", "wall"],
          ],
        },
        {
          id: "2-2", name: "Two Paths", nameEs: "Dos Caminos",
          cols: 5, rows: 5, startRow: 4, startCol: 2, startDir: "N",
          par: 6,
          storySnippet: "There's more than one way! Which path is shorter?",
          storySnippetEs: "¡Hay más de un camino! ¿Cuál es más corto?",
          grid: [
            ["wall",  "floor", "goal",  "floor", "wall"],
            ["wall",  "floor", "wall",  "floor", "wall"],
            ["wall",  "floor", "wall",  "floor", "wall"],
            ["wall",  "floor", "chip",  "floor", "wall"],
            ["wall",  "floor", "start", "floor", "wall"],
          ],
        },
        {
          id: "2-3", name: "Maze Runner", nameEs: "Corredor del Laberinto",
          cols: 6, rows: 5, startRow: 4, startCol: 0, startDir: "E",
          par: 12,
          storySnippet: "A real maze! Think before you move.",
          storySnippetEs: "¡Un laberinto de verdad! Piensa antes de moverte.",
          grid: [
            ["wall",  "wall",  "wall",  "floor", "floor", "goal"],
            ["floor", "floor", "wall",  "floor", "wall",  "floor"],
            ["floor", "wall",  "chip",  "floor", "wall",  "floor"],
            ["floor", "floor", "floor", "floor", "floor", "floor"],
            ["start", "floor", "wall",  "wall",  "wall",  "wall"],
          ],
        },
      ],
    },
    {
      id: "ch3", title: "Pattern Thinking", titleEs: "Pensamiento de Patrones",
      levels: [
        {
          id: "3-1", name: "Repeat Pattern", nameEs: "Patrón Repetido",
          cols: 5, rows: 5, startRow: 4, startCol: 0, startDir: "N",
          par: 8, maxCommands: 10,
          storySnippet: "This path has a pattern — can you spot it?",
          storySnippetEs: "Este camino tiene un patrón, ¿puedes encontrarlo?",
          grid: [
            ["wall",  "wall",  "wall",  "wall",  "goal"],
            ["wall",  "wall",  "wall",  "floor", "floor"],
            ["wall",  "wall",  "floor", "floor", "wall"],
            ["wall",  "floor", "floor", "wall",  "wall"],
            ["start", "floor", "wall",  "wall",  "wall"],
          ],
        },
        {
          id: "3-2", name: "Smart Path", nameEs: "Camino Inteligente",
          cols: 6, rows: 6, startRow: 5, startCol: 0, startDir: "E",
          par: 10, maxCommands: 14,
          storySnippet: "Find the smartest path — fewer moves = more stars!",
          storySnippetEs: "Encuentra el camino más inteligente — ¡menos movimientos = más estrellas!",
          grid: [
            ["wall",  "wall",  "wall",  "wall",  "floor", "goal"],
            ["floor", "floor", "floor", "wall",  "floor", "wall"],
            ["floor", "wall",  "floor", "chip",  "floor", "wall"],
            ["floor", "wall",  "floor", "wall",  "floor", "wall"],
            ["floor", "floor", "floor", "wall",  "floor", "floor"],
            ["start", "wall",  "wall",  "wall",  "wall",  "wall"],
          ],
        },
      ],
    },
  ],
};

// ── Maze Renderer ──────────────────────────────────────────────────────────

function MazeView({
  grid, rows, cols, robotRow, robotCol, robotDir, collected, animating,
}: {
  grid: CellType[][];
  rows: number;
  cols: number;
  robotRow: number;
  robotCol: number;
  robotDir: Dir;
  collected: Set<string>;
  animating: boolean;
}) {
  const w = cols * CELL_SIZE;
  const h = rows * CELL_SIZE;

  return (
    <div
      className="relative border-2 border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100 mx-auto"
      style={{ width: w, height: h, maxWidth: "100%" }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r}-${c}`;
          const isCollected = collected.has(key);
          let bg = FLOOR_COLOR;
          let content = null;
          if (cell === "wall") bg = WALL_COLOR;
          else if (cell === "goal") { bg = GOAL_COLOR; content = GOAL_EMOJI; }
          else if (cell === "chip" && !isCollected) { bg = CHIP_COLOR; content = CHIP_EMOJI; }
          else if (cell === "switch") bg = SWITCH_COLOR;
          else if (cell === "gate") bg = GATE_COLOR;

          return (
            <div
              key={key}
              className="absolute flex items-center justify-center text-xl select-none"
              style={{
                left: c * CELL_SIZE,
                top: r * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: bg,
                border: "1px solid #e2e8f0",
              }}
            >
              {content}
            </div>
          );
        }),
      )}
      {/* Robot */}
      <div
        className={`absolute flex items-center justify-center text-3xl z-10 ${
          animating ? "transition-all duration-300 ease-in-out" : ""
        }`}
        style={{
          left: robotCol * CELL_SIZE,
          top: robotRow * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
          transform: `rotate(${DIR_ROTATION[robotDir]}deg)`,
        }}
      >
        {ROBOT_EMOJI}
      </div>
    </div>
  );
}

// ── Command Queue UI ───────────────────────────────────────────────────────

function CommandPanel({
  commands, onAdd, onClear, onRun, maxCommands, running, canRun,
}: {
  commands: Command[];
  onAdd: (cmd: Command) => void;
  onClear: () => void;
  onRun: () => void;
  maxCommands?: number;
  running: boolean;
  canRun: boolean;
}) {
  const { t } = useTranslation();
  const atLimit = maxCommands !== undefined && commands.length >= maxCommands;

  return (
    <div className="space-y-3">
      {/* Command buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <Button
          size="lg"
          variant="outline"
          className="text-lg px-6 py-4 border-2 border-blue-300 hover:bg-blue-50"
          onClick={() => onAdd("FWD")}
          disabled={running || atLimit}
        >
          <ArrowUp className="w-5 h-5 mr-1" /> {t("games.tankTrek.forward")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-lg px-6 py-4 border-2 border-orange-300 hover:bg-orange-50"
          onClick={() => onAdd("LEFT")}
          disabled={running || atLimit}
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> {t("games.tankTrek.left")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-lg px-6 py-4 border-2 border-green-300 hover:bg-green-50"
          onClick={() => onAdd("RIGHT")}
          disabled={running || atLimit}
        >
          <ArrowRight className="w-5 h-5 mr-1" /> {t("games.tankTrek.right")}
        </Button>
      </div>

      {/* Command queue display */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-3 min-h-[52px] flex flex-wrap gap-1 items-center">
        {commands.length === 0 && (
          <span className="text-sm text-slate-400 italic">{t("games.tankTrek.addCommands")}</span>
        )}
        {commands.map((cmd, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              cmd === "FWD"
                ? "bg-blue-100 text-blue-700"
                : cmd === "LEFT"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {cmd === "FWD" ? "↑" : cmd === "LEFT" ? "↰" : "↱"}
          </span>
        ))}
        {maxCommands && (
          <span className="ml-auto text-xs text-slate-400">
            {commands.length}/{maxCommands}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onClear} disabled={running || commands.length === 0}>
          <Trash2 className="w-4 h-4 mr-1" /> {t("games.tankTrek.clear")}
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 px-8"
          onClick={onRun}
          disabled={running || !canRun}
        >
          <Play className="w-4 h-4 mr-1" /> {t("games.tankTrek.run")}
        </Button>
      </div>
    </div>
  );
}

// ── Main Game Component ────────────────────────────────────────────────────

function TankTrekCore({ config, onFinish }: {
  config: TankTrekConfig;
  onFinish: (result: GameResult) => void;
}) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const allLevels = useMemo(() => config.chapters.flatMap((ch) => ch.levels), [config]);

  const [levelIdx, setLevelIdx] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);
  const [robotRow, setRobotRow] = useState(0);
  const [robotCol, setRobotCol] = useState(0);
  const [robotDir, setRobotDir] = useState<Dir>("N");
  const [running, setRunning] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [levelComplete, setLevelComplete] = useState(false);
  const [starsThisLevel, setStarsThisLevel] = useState(0);

  // Aggregate stats
  const [totalScore, setTotalScore] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);
  const [retries, setRetries] = useState(0);
  const [totalChips, setTotalChips] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [levelsCleared, setLevelsCleared] = useState(0);

  const level = allLevels[levelIdx];

  // Reset robot to level start
  const resetLevel = useCallback(() => {
    if (!level) return;
    setRobotRow(level.startRow);
    setRobotCol(level.startCol);
    setRobotDir(level.startDir);
    setCommands([]);
    setCollected(new Set());
    setFeedback(null);
    setLevelComplete(false);
    setShowHint(false);
    setRunning(false);
    setAnimating(false);
  }, [level]);

  useEffect(() => { resetLevel(); }, [resetLevel]);

  // Execute command sequence
  const runCommands = useCallback(async () => {
    if (!level || commands.length === 0) return;
    setRunning(true);
    setAnimating(true);
    setFeedback(null);

    let r = level.startRow;
    let c = level.startCol;
    let d: Dir = level.startDir;
    const chips = new Set<string>();
    let reachedGoal = false;
    let hitWall = false;

    for (const cmd of commands) {
      if (cmd === "LEFT") {
        d = TURN_LEFT[d];
        setRobotDir(d);
      } else if (cmd === "RIGHT") {
        d = TURN_RIGHT[d];
        setRobotDir(d);
      } else {
        const [dr, dc] = DIR_DELTA[d];
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols || level.grid[nr][nc] === "wall") {
          hitWall = true;
          setFeedback(t("games.tankTrek.hitWall"));
          break;
        }
        r = nr;
        c = nc;
        setRobotRow(r);
        setRobotCol(c);

        if (level.grid[r][c] === "chip") chips.add(`${r}-${c}`);
        if (level.grid[r][c] === "goal") { reachedGoal = true; }
      }
      setCollected(new Set(chips));
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    if (reachedGoal) {
      const par = level.par ?? commands.length;
      const stars = commands.length <= par ? 3 : commands.length <= par + 2 ? 2 : 1;
      setStarsThisLevel(stars);
      setTotalScore((s) => s + stars);
      setTotalPossible((s) => s + 3);
      setTotalChips((s) => s + chips.size);
      setLevelsCleared((s) => s + 1);
      setLevelComplete(true);
      setFeedback(
        stars === 3 ? t("games.tankTrek.perfect") :
        stars === 2 ? t("games.tankTrek.great") :
        t("games.tankTrek.cleared"),
      );
    } else if (!hitWall) {
      setFeedback(t("games.tankTrek.didntReach"));
    }

    setRunning(false);
  }, [level, commands, t]);

  const handleNext = useCallback(() => {
    if (levelIdx + 1 < allLevels.length) {
      setLevelIdx(levelIdx + 1);
    } else {
      // All levels done
      const achievements: string[] = [];
      if (retries === 0) achievements.push("First Try Fixer");
      if (totalChips > 0) achievements.push("Chip Collector");
      if (totalScore >= totalPossible * 0.9) achievements.push("Maze Master");

      onFinish({
        gameKey: "tank_trek",
        score: totalScore,
        total: totalPossible,
        streakMax: levelsCleared,
        roundsCompleted: levelsCleared,
        starsEarned: Math.round(totalScore / Math.max(1, allLevels.length)),
        accuracy: totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0,
        levelReached: allLevels.length,
        hintsUsed,
        firstTryClear: retries === 0,
        achievements,
        gameSpecific: { totalChips, retries },
      });
    }
  }, [levelIdx, allLevels, totalScore, totalPossible, levelsCleared, retries, totalChips, hintsUsed, onFinish]);

  const handleRetry = useCallback(() => {
    setRetries((r) => r + 1);
    resetLevel();
  }, [resetLevel]);

  if (!level) return null;

  const levelName = isEs ? (level.nameEs ?? level.name) : level.name;
  const snippet = isEs ? (level.storySnippetEs ?? level.storySnippet) : level.storySnippet;
  const hintText = isEs ? (level.hintEs ?? level.hint) : level.hint;

  return (
    <div className="space-y-4">
      {/* Level header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-indigo-900">
            {t("games.tankTrek.level")} {levelIdx + 1}: {levelName}
          </h3>
          {snippet && <p className="text-sm text-indigo-600">{snippet}</p>}
        </div>
        <span className="text-sm bg-slate-100 px-3 py-1 rounded-full text-slate-600">
          {levelIdx + 1} / {allLevels.length}
        </span>
      </div>

      {/* Maze */}
      <div className="flex justify-center overflow-auto py-2">
        <MazeView
          grid={level.grid}
          rows={level.rows}
          cols={level.cols}
          robotRow={robotRow}
          robotCol={robotCol}
          robotDir={robotDir}
          collected={collected}
          animating={animating}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-center py-2 px-4 rounded-lg font-medium text-sm ${
          levelComplete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
        }`}>
          {feedback}
          {levelComplete && (
            <span className="ml-2">
              {"⭐".repeat(starsThisLevel)}
            </span>
          )}
        </div>
      )}

      {/* Controls */}
      {!levelComplete ? (
        <div className="space-y-3">
          <CommandPanel
            commands={commands}
            onAdd={(cmd) => setCommands((prev) => [...prev, cmd])}
            onClear={() => setCommands([])}
            onRun={runCommands}
            maxCommands={level.maxCommands}
            running={running}
            canRun={commands.length > 0}
          />
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRetry} disabled={running}>
              <RotateCcw className="w-4 h-4 mr-1" /> {t("games.tankTrek.reset")}
            </Button>
            {hintText && (
              <Button variant="ghost" size="sm" onClick={() => { setShowHint(true); setHintsUsed((h) => h + 1); }}>
                <Lightbulb className="w-4 h-4 mr-1" /> {t("games.tankTrek.hintBtn")}
              </Button>
            )}
          </div>
          {showHint && hintText && (
            <p className="text-center text-sm text-amber-600 bg-amber-50 rounded-lg py-2 px-4">
              💡 {hintText}
            </p>
          )}
        </div>
      ) : (
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="w-4 h-4 mr-1" /> {t("games.tankTrek.tryAgain")}
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleNext}>
            {levelIdx + 1 < allLevels.length
              ? <>{t("games.tankTrek.nextLevel")} <ChevronRight className="w-4 h-4 ml-1" /></>
              : <>{t("games.tankTrek.finishGame")} <Star className="w-4 h-4 ml-1" /></>
            }
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Exported Wrapper ───────────────────────────────────────────────────────

export default function TankTrekGame({ config, onComplete }: TankTrekGameProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const gameConfig = config?.chapters?.length ? config : BUILTIN_LEVELS;

  const briefing: MissionBriefing = {
    title: isEs ? "¡Misión del Robot!" : "Robot Mission!",
    story: isEs
      ? "Tu pequeño robot necesita tu ayuda para navegar por los laberintos. ¡Programa sus movimientos y guíalo hasta la meta!"
      : "Your little robot needs your help to navigate the mazes. Program its movements and guide it to the goal!",
    icon: "🤖",
    tips: isEs
      ? ["Planifica antes de correr", "Menos movimientos = más estrellas", "¡Recoge los chips de datos!"]
      : ["Plan before you run", "Fewer moves = more stars", "Collect the data chips!"],
  };

  return (
    <GameShell
      gameKey="tank_trek"
      title={t("games.tankTrek.title")}
      briefing={briefing}
      onComplete={onComplete}
    >
      {({ onFinish }) => <TankTrekCore config={gameConfig} onFinish={onFinish} />}
    </GameShell>
  );
}
