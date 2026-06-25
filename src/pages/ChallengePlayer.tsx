import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import DataDashSortDiscoverGame from "../components/games/DataDashSortDiscoverGame";

// Phase 0 — play a saved (group-shared) Data Dash challenge. Fetches the single
// creation (group-scoped + visibility enforced server-side) and renders the
// game with config.challenge. Playing a peer challenge is for fun, so the
// completion result is not recorded as module progress.

export default function ChallengePlayer() {
  const { id } = useParams();
  const api = useApi();
  const { t } = useTranslation();
  const [content, setContent] = useState<unknown | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/creations/${id}`)
      .then((res: { content?: unknown } | null) => {
        setContent(res?.content ?? null);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [api, id]);

  if (state === "loading") {
    return <div className="p-6 text-center text-gray-500">{t("challengePlayer.loading")}</div>;
  }
  if (state === "error" || !content) {
    return (
      <div className="p-6 text-center text-gray-600">
        {t("challengePlayer.notFound")}
      </div>
    );
  }

  return (
    <DataDashSortDiscoverGame config={{ challenge: content }} onComplete={() => {}} />
  );
}
