import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { TankTrekBriefing } from "./TankTrekBriefing";
import type { TankTrekConfig } from "./TankTrekGame";
import type { GameResult } from "./shared/GameShell";

// GameShell mounts the maze only when the visitor starts the mission.
export default function PublicTankTrek({
  config,
  onComplete,
}: {
  config: TankTrekConfig;
  onComplete: (result: GameResult) => void;
}) {
  const { t } = useTranslation();
  const [Maze] = useState(() =>
    lazy(() =>
      import("./TankTrekGame").then(({ TankTrekCore }) => ({
        default: TankTrekCore,
      })),
    ),
  );
  return (
    <TankTrekBriefing config={config} onComplete={onComplete} publicDemo>
      {(onFinish) => (
        <Suspense
          fallback={
            <p role="status" className="bb-demo-status">
              {t("home.demo.loading")}
            </p>
          }
        >
          <Maze config={config} onFinish={onFinish} />
        </Suspense>
      )}
    </TankTrekBriefing>
  );
}
