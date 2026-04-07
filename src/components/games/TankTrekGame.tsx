/**
 * Tank Trek — Premium robotics puzzle adventure (polished v2).
 *
 * Upgrades: chapter themes, robot expressions, execution highlight,
 * richer maze tiles, level progress strip, collectible tracking,
 * improved story snippets.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import {
  ArrowUp, ArrowLeft, ArrowRight, RotateCcw, Play, Trash2, ChevronRight,
  Lightbulb, Sparkles,
} from "lucide-react";
import { pickLocale } from "@/utils/localizedContent";
import "./shared/game-effects.css";

// ── Types ──────────────────────────────────────────────────────────────────

type Dir = "N" | "E" | "S" | "W";
type Command = "FWD" | "LEFT" | "RIGHT";
type CellType = "floor" | "wall" | "goal" | "start" | "chip" | "switch" | "gate";

interface TankTrekLevel {
  id: string;
  names: Record<string, string>;
  cols: number;
  rows: number;
  grid: CellType[][];
  startRow: number;
  startCol: number;
  startDir: Dir;
  maxCommands?: number;
  par?: number;
  storySnippets?: Record<string, string>;
  hints?: Record<string, string>;
}

interface ChapterDef {
  id: string;
  titles: Record<string, string>;
  theme: "lab" | "factory" | "core";
  levels: TankTrekLevel[];
}

interface TankTrekConfig {
  gameKey: "tank_trek";
  chapters: ChapterDef[];
}

interface TankTrekGameProps {
  config: TankTrekConfig;
  onComplete: (result?: GameResult) => void;
}

// ── Chapter Theme System ───────────────────────────────────────────────────

const THEMES: Record<string, { wallGrad: string; floorGrad: string; goalGrad: string; chipGrad: string; accent: string; labels: Record<string, string>; icon: string }> = {
  lab: {
    wallGrad: "linear-gradient(135deg, #475569, #334155)",
    floorGrad: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    goalGrad: "linear-gradient(135deg, #bbf7d0, #86efac)",
    chipGrad: "linear-gradient(135deg, #e9d5ff, #c4b5fd)",
    accent: "indigo",
    labels: { en: "Training Lab", es: "Laboratorio", vi: "Phòng thực hành", "zh-CN": "训练室" },
    icon: "🔬",
  },
  factory: {
    wallGrad: "linear-gradient(135deg, #92400e, #78350f)",
    floorGrad: "linear-gradient(135deg, #fef3c7, #fde68a)",
    goalGrad: "linear-gradient(135deg, #86efac, #4ade80)",
    chipGrad: "linear-gradient(135deg, #bfdbfe, #93c5fd)",
    accent: "amber",
    labels: { en: "Logic Factory", es: "Fábrica Lógica", vi: "Nhà máy Logic", "zh-CN": "逻辑工厂" },
    icon: "⚙️",
  },
  core: {
    wallGrad: "linear-gradient(135deg, #581c87, #4c1d95)",
    floorGrad: "linear-gradient(135deg, #faf5ff, #f3e8ff)",
    goalGrad: "linear-gradient(135deg, #a5f3fc, #67e8f9)",
    chipGrad: "linear-gradient(135deg, #fecaca, #fca5a5)",
    accent: "violet",
    labels: { en: "Smart Maze Core", es: "Núcleo Inteligente", vi: "Lõi Mê Cung", "zh-CN": "智能迷宫核心" },
    icon: "🧠",
  },
};

// ── Robot Expressions ──────────────────────────────────────────────────────

const ROBOT_FACES: Record<string, string> = {
  idle: "🤖",
  happy: "🥳",
  thinking: "🤔",
  oops: "😵",
  celebrate: "🎉",
};

const DIR_DELTA: Record<Dir, [number, number]> = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const TURN_LEFT: Record<Dir, Dir> = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };
const DIR_ROTATION: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

const CELL_SIZE = 56;

// ── Built-in Levels ────────────────────────────────────────────────────────

const BUILTIN_LEVELS: TankTrekConfig = {
  gameKey: "tank_trek",
  chapters: [
    {
      id: "ch1", titles: { en: "Learning to Move", es: "Aprender a Moverse", vi: "Học Di Chuyển", "zh-CN": "学习移动" }, theme: "lab",
      levels: [
        // Level 1: straight line — just Forward x2
        { id: "1-1", names: { en: "Go Straight!", es: "¡Ve Recto!", vi: "Đi Thẳng!", "zh-CN": "直走！" }, cols: 3, rows: 3, startRow: 2, startCol: 1, startDir: "N", par: 2,
          storySnippets: { en: "Bolt just powered on! Press Forward to reach the green goal!", es: "¡Bolt acaba de encenderse! ¡Presiona Adelante para llegar a la meta!", vi: "Bolt vừa bật! Nhấn Tiến để đến đích xanh!", "zh-CN": "Bolt启动了！按前进到达绿色目标！" },
          hints: { en: "Tap Forward two times!", es: "¡Toca Adelante dos veces!", vi: "Nhấn Tiến hai lần!", "zh-CN": "点两次前进！" },
          grid: [["wall","goal","wall"],["wall","floor","wall"],["wall","start","wall"]] },
        // Level 2: one right turn
        { id: "1-2", names: { en: "First Turn", es: "Primer Giro", vi: "Rẽ Đầu Tiên", "zh-CN": "第一次转弯" }, cols: 3, rows: 3, startRow: 2, startCol: 0, startDir: "N", par: 4,
          storySnippets: { en: "The path turns! Go forward, then turn right and go forward again.", es: "¡El camino gira! Avanza, gira a la derecha y avanza de nuevo.", vi: "Đường rẽ! Tiến lên, rẽ phải rồi tiến tiếp.", "zh-CN": "路转弯了！先前进，然后右转再前进。" },
          hints: { en: "Forward, Turn Right, Forward, Forward", es: "Adelante, Girar Derecha, Adelante, Adelante", vi: "Tiến, Rẽ phải, Tiến, Tiến", "zh-CN": "前进、右转、前进、前进" },
          grid: [["wall","floor","goal"],["wall","floor","floor"],["start","floor","wall"]] },
        // Level 3: gentle L-shape with left turn
        { id: "1-3", names: { en: "Turn Left", es: "Gira Izquierda", vi: "Rẽ Trái", "zh-CN": "左转" }, cols: 3, rows: 3, startRow: 2, startCol: 2, startDir: "N", par: 4,
          storySnippets: { en: "Now try turning left! The goal is on the other side.", es: "¡Ahora gira a la izquierda! La meta está al otro lado.", vi: "Bây giờ thử rẽ trái! Đích ở bên kia.", "zh-CN": "现在试试左转！目标在另一边。" },
          hints: { en: "Forward, Turn Left, Forward, Forward", es: "Adelante, Girar Izquierda, Adelante, Adelante", vi: "Tiến, Rẽ trái, Tiến, Tiến", "zh-CN": "前进、左转、前进、前进" },
          grid: [["goal","floor","wall"],["floor","floor","wall"],["wall","floor","start"]] },
      ],
    },
    {
      id: "ch2", titles: { en: "Think Ahead", es: "Piensa Adelante", vi: "Suy Nghĩ Trước", "zh-CN": "提前思考" }, theme: "factory",
      levels: [
        // Level 4: short zig-zag on a small grid
        { id: "2-1", names: { en: "Zig-Zag", es: "Zigzag", vi: "Ngoằn Ngoèo", "zh-CN": "之字形" }, cols: 3, rows: 4, startRow: 3, startCol: 0, startDir: "N", par: 6,
          storySnippets: { en: "A wiggly path! Go forward, turn, forward, turn...", es: "¡Un camino en zigzag! Adelante, gira, adelante, gira...", vi: "Đường ngoằn ngoèo! Tiến, rẽ, tiến, rẽ...", "zh-CN": "弯弯的路！前进、转弯、前进、转弯..." },
          hints: { en: "Forward, Right, Forward, Left, Forward, Forward", es: "Adelante, Derecha, Adelante, Izquierda, Adelante, Adelante", vi: "Tiến, Phải, Tiến, Trái, Tiến, Tiến", "zh-CN": "前进、右转、前进、左转、前进、前进" },
          grid: [["wall","wall","goal"],["wall","floor","floor"],["floor","floor","wall"],["start","wall","wall"]] },
        // Level 5: grab a chip on the way
        { id: "2-2", names: { en: "Grab a Chip!", es: "¡Agarra un Chip!", vi: "Nhặt Chip!", "zh-CN": "抓芯片！" }, cols: 3, rows: 4, startRow: 3, startCol: 0, startDir: "E", par: 5,
          storySnippets: { en: "A glowing chip! Pick it up on your way to the goal.", es: "¡Un chip brillante! Recógelo en tu camino a la meta.", vi: "Chip sáng! Nhặt nó trên đường đến đích.", "zh-CN": "发光的芯片！在去目标的路上捡起来。" },
          hints: { en: "Go right past the chip, then turn up to the goal", es: "Pasa el chip, luego gira hacia la meta", vi: "Đi qua chip, rồi rẽ lên đích", "zh-CN": "经过芯片，然后转向目标" },
          grid: [["wall","wall","goal"],["wall","floor","floor"],["floor","chip","wall"],["start","floor","wall"]] },
      ],
    },
    {
      id: "ch3", titles: { en: "Maze Explorer", es: "Explorador de Laberintos", vi: "Khám Phá Mê Cung", "zh-CN": "迷宫探险家" }, theme: "core",
      levels: [
        // Level 6: small 4x3 with a wall to go around
        { id: "3-1", names: { en: "Around the Wall", es: "Alrededor del Muro", vi: "Đi Quanh Tường", "zh-CN": "绕过墙壁" }, cols: 4, rows: 3, startRow: 2, startCol: 0, startDir: "E", par: 6,
          storySnippets: { en: "A wall is blocking the way! Find a path around it.", es: "¡Un muro bloquea el camino! Encuentra cómo rodearlo.", vi: "Tường chặn đường! Tìm cách đi vòng.", "zh-CN": "墙挡住了路！找到绕过去的路。" },
          hints: { en: "Go forward, turn to go around the wall, then reach the goal", es: "Avanza, gira para rodear el muro, luego alcanza la meta", vi: "Tiến, rẽ để đi vòng tường, rồi đến đích", "zh-CN": "前进，转弯绕过墙壁，然后到达目标" },
          grid: [["wall","wall","floor","goal"],["floor","wall","floor","floor"],["start","floor","floor","wall"]] },
        // Level 7: small maze with a chip
        { id: "3-2", names: { en: "Chip Hunt", es: "Busca el Chip", vi: "Tìm Chip", "zh-CN": "找芯片" }, cols: 4, rows: 4, startRow: 3, startCol: 0, startDir: "E", par: 8, maxCommands: 10,
          storySnippets: { en: "A tiny maze! Grab the chip and find the goal.", es: "¡Un laberinto pequeño! Agarra el chip y encuentra la meta.", vi: "Mê cung nhỏ! Nhặt chip và tìm đích.", "zh-CN": "小迷宫！抓住芯片找到目标。" },
          hints: { en: "Pick up the chip first, then find the goal", es: "Recoge el chip primero, luego encuentra la meta", vi: "Nhặt chip trước, rồi tìm đích", "zh-CN": "先捡芯片，再找目标" },
          grid: [["wall","wall","floor","goal"],["floor","floor","floor","floor"],["floor","wall","chip","wall"],["start","floor","floor","wall"]] },
      ],
    },
  ],
};

// ── Maze Renderer ──────────────────────────────────────────────────────────

function MazeView({
  grid, rows, cols, robotRow, robotCol, robotDir, collected, animating, robotFace, theme,
}: {
  grid: CellType[][];
  rows: number;
  cols: number;
  robotRow: number;
  robotCol: number;
  robotDir: Dir;
  collected: Set<string>;
  animating: boolean;
  robotFace: string;
  theme: typeof THEMES[string];
}) {
  const w = cols * CELL_SIZE;
  const h = rows * CELL_SIZE;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg mx-auto border-2"
      style={{ width: w, height: h, maxWidth: "100%", borderColor: `var(--tw-shadow-color, #94a3b8)` }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r}-${c}`;
          const isCollected = collected.has(key);
          let bg = theme.floorGrad;
          let content: React.ReactNode = null;
          let extra = "";

          if (cell === "wall") { bg = theme.wallGrad; extra = "shadow-inner"; }
          else if (cell === "goal") { bg = theme.goalGrad; content = <span className="text-2xl float-idle">🎯</span>; }
          else if (cell === "chip" && !isCollected) { bg = theme.chipGrad; content = <span className="text-xl float-idle">💎</span>; }
          else if (cell === "chip" && isCollected) { content = <span className="text-lg opacity-30">✓</span>; }

          return (
            <div
              key={key}
              className={`absolute flex items-center justify-center select-none ${extra}`}
              style={{
                left: c * CELL_SIZE, top: r * CELL_SIZE,
                width: CELL_SIZE, height: CELL_SIZE,
                background: bg,
                borderRight: "1px solid rgba(0,0,0,0.06)",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {content}
            </div>
          );
        }),
      )}
      {/* Robot */}
      <div
        className={`absolute flex items-center justify-center z-10 ${animating ? "transition-all duration-300 ease-in-out" : ""}`}
        style={{
          left: robotCol * CELL_SIZE, top: robotRow * CELL_SIZE,
          width: CELL_SIZE, height: CELL_SIZE,
          transform: `rotate(${DIR_ROTATION[robotDir]}deg)`,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}
      >
        <span className="text-3xl">{robotFace}</span>
      </div>
    </div>
  );
}

// ── Command Queue UI ───────────────────────────────────────────────────────

function CommandPanel({
  commands, activeIdx, onAdd, onClear, onRun, maxCommands, running, canRun,
}: {
  commands: Command[];
  activeIdx: number;
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
      <div className="flex gap-2 justify-center flex-wrap">
        {([
          { cmd: "FWD" as Command, icon: <ArrowUp className="w-5 h-5" />, label: t("games.tankTrek.forward"), color: "blue" },
          { cmd: "LEFT" as Command, icon: <ArrowLeft className="w-5 h-5" />, label: t("games.tankTrek.left"), color: "orange" },
          { cmd: "RIGHT" as Command, icon: <ArrowRight className="w-5 h-5" />, label: t("games.tankTrek.right"), color: "green" },
        ]).map(({ cmd, icon, label, color }) => (
          <button
            key={cmd}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-base transition-all
              border-${color}-300 bg-${color}-50 text-${color}-700
              hover:bg-${color}-100 hover:scale-105 active:scale-95
              disabled:opacity-40 disabled:hover:scale-100 shadow-sm`}
            onClick={() => onAdd(cmd)}
            disabled={running || atLimit}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Command queue strip */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 p-3 min-h-[56px] flex flex-wrap gap-1.5 items-center shadow-inner">
        {commands.length === 0 && (
          <span className="text-sm text-slate-400 italic">{t("games.tankTrek.addCommands")}</span>
        )}
        {commands.map((cmd, i) => {
          const isActive = running && i === activeIdx;
          return (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                cmd === "FWD" ? "bg-blue-100 text-blue-700" :
                cmd === "LEFT" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
              } ${isActive ? "ring-2 ring-indigo-500 scale-110 cmd-active" : ""}`}
            >
              {cmd === "FWD" ? "↑" : cmd === "LEFT" ? "↰" : "↱"}
            </span>
          );
        })}
        {maxCommands && (
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {commands.length}/{maxCommands}
          </span>
        )}
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" className="rounded-xl" onClick={onClear} disabled={running || commands.length === 0}>
          <Trash2 className="w-4 h-4 mr-1" /> {t("games.tankTrek.clear")}
        </Button>
        <Button
          className={`bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 rounded-xl shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform`}
          onClick={onRun}
          disabled={running || !canRun}
        >
          <Play className="w-4 h-4 mr-1" /> {t("games.tankTrek.run")}
        </Button>
      </div>
    </div>
  );
}

// ── Level Progress Strip ───────────────────────────────────────────────────

function LevelStrip({ total, current, stars }: { total: number; current: number; stars: Record<number, number> }) {
  return (
    <div className="flex items-center gap-1 justify-center">
      {Array.from({ length: total }, (_, i) => {
        const s = stars[i] ?? 0;
        const isCurrent = i === current;
        return (
          <div key={i} className={`flex flex-col items-center ${isCurrent ? "scale-110" : "opacity-60"} transition-all`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              isCurrent ? "border-indigo-500 bg-indigo-50 text-indigo-700" :
              s > 0 ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-slate-200 bg-slate-50 text-slate-400"
            }`}>
              {s > 0 ? "⭐".slice(0, 1) : i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Game Component ────────────────────────────────────────────────────

function TankTrekCore({ config, onFinish }: { config: TankTrekConfig; onFinish: (result: GameResult) => void }) {
  const { t } = useTranslation();
  const allLevels = useMemo(() => config.chapters.flatMap((ch) => ch.levels), [config]);
  const chapterForLevel = useMemo(() => {
    const map: Record<number, ChapterDef> = {};
    let idx = 0;
    for (const ch of config.chapters) { for (let i = 0; i < ch.levels.length; i++) { map[idx++] = ch; } }
    return map;
  }, [config]);

  const [levelIdx, setLevelIdx] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);
  const [activeCommandIdx, setActiveCommandIdx] = useState(-1);
  const [robotRow, setRobotRow] = useState(0);
  const [robotCol, setRobotCol] = useState(0);
  const [robotDir, setRobotDir] = useState<Dir>("N");
  const [robotFace, setRobotFace] = useState(ROBOT_FACES.idle);
  const [running, setRunning] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [levelComplete, setLevelComplete] = useState(false);
  const [starsThisLevel, setStarsThisLevel] = useState(0);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});

  const [totalScore, setTotalScore] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);
  const [retries, setRetries] = useState(0);
  const [totalChips, setTotalChips] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [levelsCleared, setLevelsCleared] = useState(0);

  const level = allLevels[levelIdx];
  const chapter = chapterForLevel[levelIdx];
  const theme = THEMES[chapter?.theme ?? "lab"];

  const resetLevel = useCallback(() => {
    if (!level) return;
    setRobotRow(level.startRow);
    setRobotCol(level.startCol);
    setRobotDir(level.startDir);
    setRobotFace(ROBOT_FACES.idle);
    setCommands([]);
    setActiveCommandIdx(-1);
    setCollected(new Set());
    setFeedback(null);
    setLevelComplete(false);
    setShowHint(false);
    setRunning(false);
    setAnimating(false);
  }, [level]);

  useEffect(() => { resetLevel(); }, [resetLevel]);

  const runCommands = useCallback(async () => {
    if (!level || commands.length === 0) return;
    setRunning(true);
    setAnimating(true);
    setFeedback(null);
    setRobotFace(ROBOT_FACES.thinking);

    let r = level.startRow, c = level.startCol, d: Dir = level.startDir;
    const chips = new Set<string>();
    let reachedGoal = false, hitWall = false;

    // Reset position for fresh run
    setRobotRow(r); setRobotCol(c); setRobotDir(d);
    await new Promise((res) => setTimeout(res, 200));

    for (let i = 0; i < commands.length; i++) {
      setActiveCommandIdx(i);
      const cmd = commands[i];

      if (cmd === "LEFT") { d = TURN_LEFT[d]; setRobotDir(d); }
      else if (cmd === "RIGHT") { d = TURN_RIGHT[d]; setRobotDir(d); }
      else {
        const [dr, dc] = DIR_DELTA[d];
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols || level.grid[nr][nc] === "wall") {
          hitWall = true;
          setRobotFace(ROBOT_FACES.oops);
          setFeedback({ text: t("games.tankTrek.hitWall"), success: false });
          break;
        }
        r = nr; c = nc;
        setRobotRow(r); setRobotCol(c);
        if (level.grid[r][c] === "chip") chips.add(`${r}-${c}`);
        if (level.grid[r][c] === "goal") reachedGoal = true;
      }
      setCollected(new Set(chips));
      await new Promise((res) => setTimeout(res, 350));
    }

    setActiveCommandIdx(-1);

    if (reachedGoal) {
      const par = level.par ?? commands.length;
      const stars = commands.length <= par ? 3 : commands.length <= par + 2 ? 2 : 1;
      setStarsThisLevel(stars);
      setLevelStars((prev) => ({ ...prev, [levelIdx]: Math.max(prev[levelIdx] ?? 0, stars) }));
      setTotalScore((s) => s + stars);
      setTotalPossible((s) => s + 3);
      setTotalChips((s) => s + chips.size);
      setLevelsCleared((s) => s + 1);
      setLevelComplete(true);
      setRobotFace(stars === 3 ? ROBOT_FACES.celebrate : ROBOT_FACES.happy);
      setFeedback({
        text: stars === 3 ? t("games.tankTrek.perfect") : stars === 2 ? t("games.tankTrek.great") : t("games.tankTrek.cleared"),
        success: true,
      });
    } else if (!hitWall) {
      setRobotFace(ROBOT_FACES.oops);
      setFeedback({ text: t("games.tankTrek.didntReach"), success: false });
    }
    setRunning(false);
  }, [level, commands, levelIdx, t]);

  const handleNext = useCallback(() => {
    if (levelIdx + 1 < allLevels.length) {
      setLevelIdx(levelIdx + 1);
    } else {
      const achievements: string[] = [];
      if (retries === 0) achievements.push(t("games.tankTrek.achFirstTry"));
      if (totalChips > 0) achievements.push(t("games.tankTrek.achCollector"));
      if (totalScore >= totalPossible * 0.9) achievements.push(t("games.tankTrek.achMaster"));
      if (hintsUsed === 0) achievements.push(t("games.tankTrek.achNoHints"));
      onFinish({
        gameKey: "tank_trek", score: totalScore, total: totalPossible,
        streakMax: levelsCleared, roundsCompleted: levelsCleared,
        starsEarned: Math.round(totalScore / Math.max(1, allLevels.length)),
        accuracy: totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0,
        levelReached: allLevels.length, hintsUsed,
        firstTryClear: retries === 0, achievements,
        gameSpecific: { totalChips, retries },
      });
    }
  }, [levelIdx, allLevels, totalScore, totalPossible, levelsCleared, retries, totalChips, hintsUsed, onFinish, t]);

  const handleRetry = useCallback(() => { setRetries((r) => r + 1); resetLevel(); }, [resetLevel]);

  if (!level || !chapter) return null;

  const levelName = pickLocale(level.names, level.names.en);
  const snippet = level.storySnippets ? pickLocale(level.storySnippets, level.storySnippets.en) : undefined;
  const hintText = level.hints ? pickLocale(level.hints, level.hints.en) : undefined;
  const themeLabel = pickLocale(theme.labels, theme.labels.en);

  return (
    <div className="space-y-4">
      {/* Chapter + Level header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{theme.icon}</span>
            <span className={`text-xs font-bold uppercase tracking-wider text-${theme.accent}-600`}>{themeLabel}</span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">
            {t("games.tankTrek.level")} {levelIdx + 1}: {levelName}
          </h3>
          {snippet && <p className="text-sm text-slate-500 mt-0.5">{snippet}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {level.par && (
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 font-medium">
              ⭐×3 = {level.par} {t("games.tankTrek.movesOrLess")}
            </span>
          )}
        </div>
      </div>

      {/* Level progress strip */}
      <LevelStrip total={allLevels.length} current={levelIdx} stars={levelStars} />

      {/* Maze */}
      <div className="flex justify-center overflow-auto py-1">
        <MazeView
          grid={level.grid} rows={level.rows} cols={level.cols}
          robotRow={robotRow} robotCol={robotCol} robotDir={robotDir}
          collected={collected} animating={animating} robotFace={robotFace}
          theme={theme}
        />
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`text-center py-3 px-4 rounded-xl font-bold text-sm ${
          feedback.success
            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 bounce-in"
            : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 shake"
        }`}>
          {feedback.text}
          {levelComplete && (
            <span className="ml-2">{"⭐".repeat(starsThisLevel)}</span>
          )}
        </div>
      )}

      {/* Controls */}
      {!levelComplete ? (
        <div className="space-y-3">
          <CommandPanel
            commands={commands} activeIdx={activeCommandIdx}
            onAdd={(cmd) => setCommands((prev) => [...prev, cmd])}
            onClear={() => setCommands([])}
            onRun={runCommands}
            maxCommands={level.maxCommands} running={running} canRun={commands.length > 0}
          />
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={handleRetry} disabled={running}>
              <RotateCcw className="w-4 h-4 mr-1" /> {t("games.tankTrek.reset")}
            </Button>
            {hintText && (
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => { setShowHint(true); setHintsUsed((h) => h + 1); }}>
                <Lightbulb className="w-4 h-4 mr-1" /> {t("games.tankTrek.hintBtn")}
              </Button>
            )}
          </div>
          {showHint && hintText && (
            <div className="slide-up-fade text-center text-sm text-amber-700 bg-amber-50 rounded-xl py-2 px-4 border border-amber-200">
              💡 {hintText}
            </div>
          )}
        </div>
      ) : (
        <div className="slide-up-fade flex justify-center gap-3">
          <Button variant="outline" className="rounded-xl" onClick={handleRetry}>
            <RotateCcw className="w-4 h-4 mr-1" /> {t("games.tankTrek.tryAgain")}
          </Button>
          <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform" onClick={handleNext}>
            {levelIdx + 1 < allLevels.length
              ? <>{t("games.tankTrek.nextLevel")} <ChevronRight className="w-4 h-4 ml-1" /></>
              : <>{t("games.tankTrek.finishGame")} <Sparkles className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────

export default function TankTrekGame({ config, onComplete }: TankTrekGameProps) {
  const { t } = useTranslation();
  const gameConfig = config?.chapters?.length ? config : BUILTIN_LEVELS;

  const briefing: MissionBriefing = {
    title: pickLocale({ en: "Robot Mission!", es: "¡Misión del Robot!", vi: "Nhiệm Vụ Robot!", "zh-CN": "机器人任务！" }, "Robot Mission!"),
    story: pickLocale({
      en: "Bolt needs YOUR help to navigate the mazes. Program its moves and guide it to the goal!",
      es: "Bolt necesita TU ayuda para navegar por los laberintos. ¡Programa sus movimientos y guíalo hasta la meta!",
      vi: "Bolt cần sự giúp đỡ của BẠN để đi qua mê cung. Lập trình các bước và dẫn nó đến đích!",
      "zh-CN": "Bolt需要你的帮助来穿越迷宫。编排它的动作，引导它到达目标！",
    }, "Bolt needs YOUR help to navigate the mazes. Program its moves and guide it to the goal!"),
    icon: "🤖",
    chapterLabel: "Tank Trek",
    themeColor: "indigo",
    tips: pickLocale({
      en: ["Plan before you run", "Fewer moves = more stars", "Collect the data chips!"],
      es: ["Planifica antes de ejecutar", "Menos movimientos = más estrellas", "¡Recoge los chips de datos!"],
      vi: ["Lên kế hoạch trước khi chạy", "Ít bước hơn = nhiều sao hơn", "Thu thập chip dữ liệu!"],
      "zh-CN": ["跑之前先计划", "步数越少 = 星星越多", "收集数据芯片！"],
    }, ["Plan before you run", "Fewer moves = more stars", "Collect the data chips!"]),
  };

  return (
    <GameShell gameKey="tank_trek" title={t("games.tankTrek.title")} briefing={briefing} onComplete={onComplete}>
      {({ onFinish }) => <TankTrekCore config={gameConfig} onFinish={onFinish} />}
    </GameShell>
  );
}
