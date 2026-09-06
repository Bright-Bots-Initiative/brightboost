import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { Button } from "@/components/ui/button";
import type { GameResult } from "./shared/GameShell";
const BioTrailGame = lazy(() => import("./biotrail/BioTrailGame"));
export default function BioTrailActivity({
  config,
  onComplete,
}: {
  config?: { gradeBand?: string };
  onComplete?: (result: GameResult) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { status, data, refresh } = useSpecialty();
  if (status === "loading")
    return <p role="status">{t("specialty.loading")}</p>;
  if (status === "error")
    return (
      <div role="alert">
        <p>{t("specialty.loadError")}</p>
        <Button onClick={refresh}>{t("specialty.retry")}</Button>
      </div>
    );
  if (!user || !data?.unlocked || data.specialty !== "BIOTECH")
    return (
      <p>
        <Link to="/student/specialty">{t("specialty.gameLocked")}</Link>
      </p>
    );
  return (
    <Suspense fallback={<p role="status">{t("specialty.loading")}</p>}>
      <BioTrailGame
        key={user.id}
        config={config}
        storageScope={user.id}
        onComplete={onComplete}
      />
    </Suspense>
  );
}
