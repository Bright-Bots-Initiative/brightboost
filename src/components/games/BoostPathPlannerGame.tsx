import { useMemo, useState } from "react";
import { LearningGameFrame } from "./shared/LearningGameFrame";
import type { GameResult } from "./shared/GameShell";

type Dir = "N" | "E" | "S" | "W";
type Cmd = "F" | "L" | "R";
type Cell = { x: number; y: number };
type Level = {
  title: string;
  size: number;
  start: Cell;
  goal: Cell;
  dir: Dir;
  walls: Cell[];
  maxSteps: number;
};

const LEVELS: Level[] = [
  {
    title: "Reach the solar charger",
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
    title: "Find the helper tool",
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
    title: "Deliver the tiny battery",
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

export function runBoostProgram(level: Level, program: Cmd[]) {
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
  onComplete,
}: {
  onComplete?: (result: GameResult) => void;
}) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [program, setProgram] = useState<Cmd[]>([]);
  const [feedback, setFeedback] = useState(
    "Build a plan to help Boost reach the goal.",
  );
  const [score, setScore] = useState(0);
  const level = LEVELS[levelIndex];

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
    setFeedback("Try a new plan.");
  }

  function runProgram() {
    if (program.length === 0) {
      setFeedback("Add some steps first.");
      return;
    }

    if (result.success) {
      const nextScore = score + 1;
      setScore(nextScore);

      if (levelIndex === LEVELS.length - 1) {
        setFeedback(
          "You did it! Boost followed your plan all the way to the goal.",
        );
        onComplete?.({
          gameKey: "boost_path_planner",
          score: nextScore,
          total: LEVELS.length,
          streakMax: nextScore,
          roundsCompleted: LEVELS.length,
        });
      } else {
        setFeedback(
          "Nice job! That plan worked. Get ready for the next map.",
        );
        setLevelIndex((n) => n + 1);
        setProgram([]);
      }
      return;
    }

    if (result.crashed) {
      setFeedback(
        "Oops! Boost bumped into a wall. Check your turns and try again.",
      );
      return;
    }

    setFeedback("Good try. Boost did not reach the goal yet.");
  }

  return (
    <LearningGameFrame
      title="Boost's Path Planner"
      objective={level.title}
      vocabulary={["plan", "sequence", "turn", "goal"]}
      progressLabel={`Level ${levelIndex + 1}/${LEVELS.length}`}
      feedback={feedback}
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
            <p className="mb-2 text-sm font-semibold">Build the program</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("F")}
              >
                Forward
              </button>
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("L")}
              >
                Turn Left
              </button>
              <button
                className="rounded-lg border px-3 py-2"
                onClick={() => addCommand("R")}
              >
                Turn Right
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Your steps</p>
            <div className="min-h-16 rounded-lg bg-slate-50 p-3 text-sm">
              {program.length
                ? program.join(" \u2192 ")
                : "No steps yet"}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-white"
              onClick={runProgram}
            >
              Run
            </button>
            <button
              className="rounded-lg border px-4 py-2"
              onClick={clearProgram}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </LearningGameFrame>
  );
}
