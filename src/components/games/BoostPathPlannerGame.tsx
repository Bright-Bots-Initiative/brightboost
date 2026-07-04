import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LearningGameFrame } from "./shared/LearningGameFrame";
import type { GameResult } from "./shared/GameShell";
import { getGradeBand, BOOST_PATH_LEVELS } from "./gradeBandContent";

type Dir = "N" | "E" | "S" | "W";
type Cmd = "F" | "L" | "R";
type Cell = { x: number; y: number };
type Level = {
  titleKey: string;
  size: number;
  start: Cell;
  goal: Cell;
  dir: Dir;
  walls: Cell[];
  maxSteps: number;
};

const LEVELS: Level[] = [
  {
    titleKey: "games.boostPath.level1",
    size: 4,
    start: { x: 0, y: 3 },
    goal: { x: 3, y: 0 },
    dir: "E",
    walls: [
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ],
    maxSteps: 6,
  },
  {
    titleKey: "games.boostPath.level2",
    size: 5,
    start: { x: 0, y: 4 },
    goal: { x: 4, y: 1 },
    dir: "E",
    walls: [
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    maxSteps: 7,
  },
  {
    titleKey: "games.boostPath.level3",
    size: 5,
    start: { x: 0, y: 4 },
    goal: { x: 4, y: 0 },
    dir: "N",
    walls: [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    maxSteps: 8,
  },
];

const TURN_LEFT: Record<Dir, Dir> = { N: "W", W: "S", S: "E", E: "N" };
const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };

// Compact glyphs for the step chips (the build buttons carry the full labels).
const CMD_GLYPH: Record<Cmd, string> = { F: "↑", L: "↺", R: "↻" };

function sameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

function nextCell(cell: Cell, dir: Dir): Cell {
  if (dir === "N") return { x: cell.x, y: cell.y - 1 };
  if (dir === "S") return { x: cell.x, y: cell.y + 1 };
  if (dir === "E") return { x: cell.x + 1, y: cell.y };
  return { x: cell.x - 1, y: cell.y };
}

function isBlocked(cell: Cell, size: number, walls: Cell[]) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size)
    return true;
  return walls.some((wall) => sameCell(wall, cell));
}

export function runBoostProgram(level: Pick<Level, "dir" | "start" | "goal" | "size" | "walls">, program: Cmd[]) {
  let dir = level.dir;
  let pos = { ...level.start };

  for (let i = 0; i < program.length; i++) {
    const cmd = program[i];
    if (cmd === "L") {
      dir = TURN_LEFT[dir];
      continue;
    }
    if (cmd === "R") {
      dir = TURN_RIGHT[dir];
      continue;
    }

    const candidate = nextCell(pos, dir);
    if (isBlocked(candidate, level.size, level.walls)) {
      // failedAt = the step where Boost first collided — the "bug" to fix.
      return { success: false, pos, dir, crashed: true, failedAt: i };
    }
    pos = candidate;
  }

  return {
    success: sameCell(pos, level.goal),
    pos,
    dir,
    crashed: false,
    failedAt: null,
  };
}

export default function BoostPathPlannerGame({
  config,
  onComplete,
}: {
  config?: any;
  onComplete?: (result: GameResult) => void;
}) {
  const { t } = useTranslation();
  const band = getGradeBand(config);
  const activeLevels = BOOST_PATH_LEVELS[band] ?? LEVELS;
  const [levelIndex, setLevelIndex] = useState(0);
  const [program, setProgram] = useState<Cmd[]>([]);
  // Debug-loop state. `bugStep` is the step Boost first collided on (the bug to
  // fix); `levelAttempts`/`totalAttempts` are retry counters, NOT losses. None
  // of this touches scoring/stars — it only powers the bugs-not-failure framing.
  const [feedback, setFeedback] = useState<{
    key: string;
    params?: Record<string, unknown>;
  }>({ key: "games.boostPath.buildPlan" });
  const [bugStep, setBugStep] = useState<number | null>(null);
  const [levelAttempts, setLevelAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const level = activeLevels[levelIndex];

  const result = useMemo(
    () => runBoostProgram(level, program),
    [level, program],
  );

  // Editing the sequence clears the bug highlight — the kid is fixing it.
  function addCommand(cmd: Cmd) {
    setProgram((prev) =>
      prev.length >= level.maxSteps ? prev : [...prev, cmd],
    );
    setBugStep(null);
  }

  function removeStep(index: number) {
    setProgram((prev) => prev.filter((_, i) => i !== index));
    setBugStep(null);
    setFeedback({ key: "games.boostPath.buildPlan" });
  }

  function clearProgram() {
    setProgram([]);
    setBugStep(null);
    setFeedback({ key: "games.boostPath.tryNewPlan" });
  }

  function runProgram() {
    if (program.length === 0) {
      setFeedback({ key: "games.boostPath.addSteps" });
      return;
    }

    if (result.success) {
      const nextScore = score + 1;
      setScore(nextScore);
      setBugStep(null);
      const tries = levelAttempts + 1;

      if (levelIndex === activeLevels.length - 1) {
        setFeedback({ key: "games.boostPath.allDone" });
        // Scoring/stars are computed from score/total exactly as before; the
        // attempt counts are additive, non-scoring telemetry.
        onComplete?.({
          gameKey: "boost_path_planner",
          score: nextScore,
          total: activeLevels.length,
          streakMax: nextScore,
          roundsCompleted: activeLevels.length,
          firstTryClear: totalAttempts === 0,
          gameSpecific: { attempts: totalAttempts },
        });
      } else {
        setFeedback(
          tries === 1
            ? { key: "games.boostPath.solvedFirstTry" }
            : { key: "games.boostPath.debuggedIn", params: { count: tries } },
        );
        setLevelIndex((n) => n + 1);
        setProgram([]);
        setLevelAttempts(0);
      }
      return;
    }

    // A failed run is a debug iteration, not a loss: count it, and point at the
    // step where Boost first collided so the kid can fix that step and re-run.
    setLevelAttempts((n) => n + 1);
    setTotalAttempts((n) => n + 1);

    if (result.crashed && result.failedAt !== null) {
      setBugStep(result.failedAt);
      setFeedback({
        key: "games.boostPath.foundBug",
        params: { step: result.failedAt + 1 },
      });
      return;
    }

    setBugStep(null);
    setFeedback({ key: "games.boostPath.notYet" });
  }

  return (
    <LearningGameFrame
      title={t("games.boostPath.title")}
      objective={t(level.titleKey)}
      vocabulary={[
        t("games.boostPath.vocabPlan"),
        t("games.boostPath.vocabSequence"),
        t("games.boostPath.vocabTurn"),
        t("games.boostPath.vocabGoal"),
      ]}
      progressLabel={`${t("games.boostPath.levelLabel")} ${levelIndex + 1}/${activeLevels.length}`}
      feedback={t(feedback.key, feedback.params)}
      controlInstructions={{
        keyboard: [
          "Use Tab to move through cards and buttons. Use Enter or Space to choose.",
        ],
        buttons: ["Put steps in the correct order."],
      }}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div
          className="grid gap-2 rounded-xl border bg-slate-50 p-3"
          style={{
            gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: level.size * level.size }).map((_, index) => {
            const x = index % level.size;
            const y = Math.floor(index / level.size);
            const cell = { x, y };
            const isStart = sameCell(cell, level.start);
            const isGoal = sameCell(cell, level.goal);
            const isWall = level.walls.some((w) => sameCell(w, cell));

            return (
              <div
                key={`${x}-${y}`}
                className={`flex aspect-square items-center justify-center rounded-lg border text-xl font-bold ${
                  isWall
                    ? "bg-slate-400 text-white"
                    : isGoal
                      ? "bg-emerald-200"
                      : isStart
                        ? "bg-sky-200"
                        : "bg-white"
                }`}
              >
                {isWall ? "\u25A0" : isGoal ? "\u2B50" : isStart ? "\uD83E\uDD16" : ""}
              </div>
            );
          })}
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <p className="mb-2 text-sm font-semibold">{t("games.boostPath.buildProgram")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border bg-white px-3 py-2 text-slate-900 hover:bg-slate-100"
                onClick={() => addCommand("F")}
              >
                {t("games.boostPath.forward")}
              </button>
              <button
                className="rounded-lg border bg-white px-3 py-2 text-slate-900 hover:bg-slate-100"
                onClick={() => addCommand("L")}
              >
                {t("games.boostPath.turnLeft")}
              </button>
              <button
                className="rounded-lg border bg-white px-3 py-2 text-slate-900 hover:bg-slate-100"
                onClick={() => addCommand("R")}
              >
                {t("games.boostPath.turnRight")}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">{t("games.boostPath.yourSteps")}</p>
            <div className="min-h-16 rounded-lg bg-slate-50 p-3 text-sm">
              {program.length ? (
                <ol className="flex flex-wrap gap-2">
                  {program.map((cmd, i) => {
                    const isBug = i === bugStep;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          aria-label={t("games.boostPath.removeStep", { step: i + 1 })}
                          className={`flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-2 font-semibold transition-colors ${
                            isBug
                              ? "border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-400"
                              : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-xs text-slate-400">{i + 1}</span>
                          <span aria-hidden="true">{CMD_GLYPH[cmd]}</span>
                          {isBug && <span aria-hidden="true">\ud83d\udc1b</span>}
                          <span aria-hidden="true" className="text-slate-400">
                            \u00d7
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                t("games.boostPath.noSteps")
              )}
            </div>
            {levelAttempts > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {t("games.boostPath.tries", { count: levelAttempts })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-white"
              onClick={runProgram}
            >
              {t("games.boostPath.run")}
            </button>
            <button
              className="rounded-lg border bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
              onClick={clearProgram}
            >
              {t("games.boostPath.clear")}
            </button>
          </div>
        </div>
      </div>
    </LearningGameFrame>
  );
}
