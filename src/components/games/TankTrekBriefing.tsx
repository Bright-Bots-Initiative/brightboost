import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { pickLocale } from "@/utils/localizedContent";
import type { TankTrekConfig } from "./TankTrekGame";
import GameShell, {
  type GameResult,
  type MissionBriefing,
} from "./shared/GameShell";

// The homepage can show the same real briefing without downloading the maze engine.
export function TankTrekBriefing({
  config,
  publicDemo,
  onComplete,
  children,
}: {
  config: TankTrekConfig;
  publicDemo?: boolean;
  onComplete?: (result: GameResult) => void;
  children: (finish: (result: GameResult) => void) => ReactNode;
}) {
  const { t } = useTranslation();
  const briefing: MissionBriefing = {
    title: pickLocale(
      {
        en: "Robot Mission!",
        es: "¡Misión del Robot!",
        vi: "Nhiệm Vụ Robot!",
        "zh-CN": "机器人任务！",
      },
      "Robot Mission!",
    ),
    story: pickLocale(
      {
        en: "Bolt needs YOUR help to navigate the mazes. Program its moves and guide it to the goal!",
        es: "Bolt necesita TU ayuda para navegar por los laberintos. ¡Programa sus movimientos y guíalo hasta la meta!",
        vi: "Bolt cần sự giúp đỡ của BẠN để đi qua mê cung. Lập trình các bước và dẫn nó đến đích!",
        "zh-CN": "Bolt需要你的帮助来穿越迷宫。编排它的动作，引导它到达目标！",
      },
      "Bolt needs YOUR help to navigate the mazes. Program its moves and guide it to the goal!",
    ),
    icon: "🤖",
    chapterLabel: "Tank Trek",
    themeColor: "indigo",
    tips: pickLocale(
      {
        en: [
          "Plan before you run",
          "Fewer steps = more stars — turns are free!",
          "Collect the data chips!",
        ],
        es: [
          "Planifica antes de ejecutar",
          "Menos pasos = más estrellas — ¡los giros son gratis!",
          "¡Recoge los chips de datos!",
        ],
        vi: [
          "Lên kế hoạch trước khi chạy",
          "Ít bước hơn = nhiều sao hơn — rẽ không tính!",
          "Thu thập chip dữ liệu!",
        ],
        "zh-CN": [
          "跑之前先计划",
          "步数越少 = 星星越多——转弯不算！",
          "收集数据芯片！",
        ],
      },
      [
        "Plan before you run",
        "Fewer steps = more stars — turns are free!",
        "Collect the data chips!",
      ],
    ),

    controlInstructions: {
      keyboard: [
        "Use Tab to move through controls. Use Enter or Space to add commands.",
      ],
      buttons: [
        "Choose Forward, Turn Left, or Turn Right to build a path.",
        "Use fewer steps when possible — turns are free.",
      ],
    },
  };

  // Tank Trek's score unit IS stars (sum of per-level stars), so the
  // personal-best chip renders in the units a kid earns: "⭐ 16/21".
  const maxStars =
    config.chapters.reduce((n, ch) => n + ch.levels.length, 0) * 3;

  return (
    <GameShell
      gameKey="tank_trek"
      publicDemo={publicDemo}
      title={t("games.tankTrek.title")}
      briefing={briefing}
      onComplete={onComplete ?? (() => {})}
      formatBest={(best) => `⭐ ${best.bestScore}/${maxStars}`}
    >
      {({ onFinish }) => children(onFinish)}
    </GameShell>
  );
}
