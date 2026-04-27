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

  for (const cmd of program) {
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
      return { success: false, pos, dir, crashed: true };
    }
    pos = candidate;
  }

  return {
    success: sameCell(pos, level.goal),
    pos,
    dir,
    crashed: false,
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
  const [feedbackKey, setFeedbackKey] = useState("games.boostPath.buildPlan");
  const [score, setScore] = useState(0);
  const level = activeLevels[levelIndex];

  const result = useMemo(
    () => runBoostProgram(level, program),
    [level, program],
  );

  function addCommand(cmd: Cmd) {
    setProgram((prev) =>
      prev.length >= level.maxSteps ? prev : [...prev, cmd],
    );
  }

  function clearProgram() {
    setProgram([]);
    setFeedbackKey("games.boostPath.tryNewPlan");
  }

  function runProgram() {
    if (program.length === 0) {
      setFeedbackKey("games.boostPath.addSteps");
      return;
    }

    if (result.success) {
      const nextScore = score + 1;
      setScore(nextScore);

      if (levelIndex === activeLevels.length - 1) {
        setFeedbackKey("games.boostPath.allDone");
        onComplete?.({
          gameKey: "boost_path_planner",
          score: nextScore,
          total: activeLevels.length,
          streakMax: nextScore,
          roundsCompleted: activeLevels.length,
        });
      } else {
        setFeedbackKey("games.boostPath.niceJob");
        setLevelIndex((n) => n + 1);
        setProgram([]);
      }
      return;
    }

    if (result.crashed) {
      setFeedbackKey("games.boostPath.crashed");
      return;
    }

    setFeedbackKey("games.boostPath.didntReach");
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
      feedback={t(feedbackKey)}
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
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("F")}
              >
                {t("games.boostPath.forward")}
              </button>
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("L")}
              >
                {t("games.boostPath.turnLeft")}
              </button>
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("R")}
              >
                {t("games.boostPath.turnRight")}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">{t("games.boostPath.yourSteps")}</p>
            <div className="min-h-16 rounded-lg bg-slate-50 p-3 text-sm">
              {program.length
                ? program.join(" \u2192 ")
                : t("games.boostPath.noSteps")}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-white"
              onClick={runProgram}
            >
              {t("games.boostPath.run")}
            </button>
            <button
              className="rounded-lg border px-4 py-2"
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
