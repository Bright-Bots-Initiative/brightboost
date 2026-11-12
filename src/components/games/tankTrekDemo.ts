import type { TankTrekConfig } from "./TankTrekGame";
import { TANK_TREK_G35_LEVELS } from "./gradeBandContent";

export const DEMO_GAME_ID = "tank_trek_demo";

/**
 * Anonymous, demo-local best — localStorage only, never sent anywhere.
 * The key is VERSIONED: v2 marks the post-#605 star semantics. Any value
 * written under an older scheme is simply ignored (losing an anonymous
 * demo best is fine; displaying a stale one in dead units is not — that's
 * how "High Score: 55" happened on the logged-in path).
 */
const DEMO_BEST_KEY = "bb_try_demo_best_v2";

interface DemoBest {
  stars: number;
}

export function readDemoBest(): DemoBest | null {
  try {
    const raw = localStorage.getItem(DEMO_BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoBest;
    return typeof parsed?.stars === "number" &&
      parsed.stars >= 0 &&
      parsed.stars <= 3
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeDemoBest(stars: number) {
  try {
    const existing = readDemoBest();
    if (!existing || stars > existing.stars) {
      localStorage.setItem(DEMO_BEST_KEY, JSON.stringify({ stars }));
    }
  } catch {
    /* private-mode storage failures are fine — the best is a nicety */
  }
}

/**
 * Three short, winnable levels (mirrors Tank Trek chapter 1 "Learning to
 * Move"). Hardcoded so the route has zero data dependencies. Multilingual
 * fields follow the game's own content shape.
 */
// Exported for the Tank Trek solvability guard test — the demo levels are
// copies of chapter 1 and could drift; the guard keeps them honest too.
export const DEMO_CONFIG: TankTrekConfig = {
  gameKey: "tank_trek",
  chapters: [
    {
      id: "demo-ch1",
      titles: {
        en: "Learning to Move",
        es: "Aprender a Moverse",
        vi: "Học Di Chuyển",
        "zh-CN": "学习移动",
      },
      theme: "lab",
      levels: [
        {
          id: "demo-1",
          names: {
            en: "Go Straight!",
            es: "¡Ve Recto!",
            vi: "Đi Thẳng!",
            "zh-CN": "直走！",
          },
          cols: 3,
          rows: 3,
          startRow: 2,
          startCol: 1,
          startDir: "N",
          par: 2,
          storySnippets: {
            en: "Bolt just powered on! Press Forward to reach the green goal!",
            es: "¡Bolt acaba de encenderse! ¡Presiona Adelante para llegar a la meta!",
            vi: "Bolt vừa bật! Nhấn Tiến để đến đích xanh!",
            "zh-CN": "Bolt启动了！按前进到达绿色目标！",
          },
          hints: {
            en: "Tap Forward two times!",
            es: "¡Toca Adelante dos veces!",
            vi: "Nhấn Tiến hai lần!",
            "zh-CN": "点两次前进！",
          },
          grid: [
            ["wall", "goal", "wall"],
            ["wall", "floor", "wall"],
            ["wall", "start", "wall"],
          ],
        },
        {
          id: "demo-2",
          names: {
            en: "First Turn",
            es: "Primer Giro",
            vi: "Rẽ Đầu Tiên",
            "zh-CN": "第一次转弯",
          },
          cols: 3,
          rows: 3,
          startRow: 2,
          startCol: 0,
          startDir: "N",
          par: 4,
          // Mirrors builtin 1-2's corrected copy: a wall sits directly
          // ahead of the start, so the route begins with a turn. The hint
          // is the solver-verified optimal program.
          storySnippets: {
            en: "The path zigzags! Turn first, then plan your steps to the goal.",
            es: "¡El camino zigzaguea! Gira primero y planea tus pasos hasta la meta.",
            vi: "Đường đi ngoằn ngoèo! Rẽ trước, rồi lên kế hoạch các bước đến đích.",
            "zh-CN": "路是之字形的！先转弯，再计划走到目标的步数。",
          },
          hints: {
            en: "Right, Forward, Left, Forward, Forward, Right, Forward",
            es: "Derecha, Adelante, Izquierda, Adelante, Adelante, Derecha, Adelante",
            vi: "Phải, Tiến, Trái, Tiến, Tiến, Phải, Tiến",
            "zh-CN": "右转、前进、左转、前进、前进、右转、前进",
          },
          grid: [
            ["wall", "floor", "goal"],
            ["wall", "floor", "floor"],
            ["start", "floor", "wall"],
          ],
        },
        {
          id: "demo-3",
          names: {
            en: "Turn Left",
            es: "Gira Izquierda",
            vi: "Rẽ Trái",
            "zh-CN": "左转",
          },
          cols: 3,
          rows: 3,
          startRow: 2,
          startCol: 2,
          startDir: "N",
          par: 4,
          storySnippets: {
            en: "Now try turning left! The goal is on the other side.",
            es: "¡Ahora gira a la izquierda! La meta está al otro lado.",
            vi: "Bây giờ thử rẽ trái! Đích ở bên kia.",
            "zh-CN": "现在试试左转！目标在另一边。",
          },
          // Mirrors builtin 1-3's corrected hint (old one walked into the
          // wall directly ahead of the start). Solver-verified.
          hints: {
            en: "Left, Forward, Right, Forward, Forward, Left, Forward",
            es: "Izquierda, Adelante, Derecha, Adelante, Adelante, Izquierda, Adelante",
            vi: "Trái, Tiến, Phải, Tiến, Tiến, Trái, Tiến",
            "zh-CN": "左转、前进、右转、前进、前进、左转、前进",
          },
          grid: [
            ["goal", "floor", "wall"],
            ["floor", "floor", "wall"],
            ["wall", "floor", "start"],
          ],
        },
      ],
    },
  ],
};

/** Uses already-built grade 3–5 Tank Trek content: one selected demo, no alternate engine. */
export const G35_DEMO_CONFIG: TankTrekConfig = {
  gameKey: "tank_trek",
  gradeBand: "g3_5",
  chapters:
    TANK_TREK_G35_LEVELS.chapters as unknown as TankTrekConfig["chapters"],
};
