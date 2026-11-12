import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { Button } from "@/components/ui/button";
import type { GameResult } from "./shared/GameShell";
const SparBotsGame = lazy(() => import("./sparbots/SparBotsGame"));
export default function SparBotsActivity({
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
  if (!user || !data?.unlocked || data.specialty !== "AI")
    return (
      <p>
        <Link to="/student/specialty">{t("sparbots.gameLocked")}</Link>
      </p>
    );
  return (
    <Suspense fallback={<p role="status">{t("specialty.loading")}</p>}>
      <SparBotsGame
        key={user.id}
        storageScope={user.id}
        config={config}
        onComplete={onComplete}
      />
    </Suspense>
  );
}
