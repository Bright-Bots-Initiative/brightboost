import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useApi } from "../services/api";
import DataDashSortDiscoverGame from "../components/games/DataDashSortDiscoverGame";

// Phase 0 — play a saved (group-shared) Data Dash challenge. Fetches the single
// creation (group-scoped + visibility enforced server-side) and renders the
// game with config.challenge. Playing a peer challenge is for fun, so the
// completion result is not recorded as module progress — Finish and the
// "View My Gallery" affordance both return the player to /student/gallery,
// where they launched from (see #680).
export default function ChallengePlayer() {
  const { id } = useParams();
  const api = useApi();
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const goToGallery = () => navigate("/student/gallery");

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
    <DataDashSortDiscoverGame
      config={{ challenge: content }}
      onComplete={goToGallery}
      secondaryAction={{
        label: t("challengePlayer.viewMyGallery", { defaultValue: "View My Gallery" }),
        icon: <Sparkles className="w-4 h-4 mr-1" />,
        onClick: goToGallery,
      }}
    />
  );
}