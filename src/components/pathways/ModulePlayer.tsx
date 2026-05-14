/**
 * Module Player — wrapper that loads and renders a Cyber Launch module.
 * Handles progress saving and completion callbacks. i18n + light/dark.
 */
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTrackBySlug } from "@/constants/pathwayTracks";
import { ArrowLeft } from "lucide-react";

const CyberLaunchModules = lazy(() => import("./modules/CyberLaunchModules"));

export default function ModulePlayer() {
  const { trackSlug, moduleSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const track = getTrackBySlug(trackSlug ?? "");
  const mod = track?.modules.find((m) => m.slug === moduleSlug);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (trackSlug && moduleSlug) {
      fetch("/api/pathways/student/milestones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("bb_access_token")}`,
        },
        body: JSON.stringify({ trackSlug, moduleSlug, status: "in_progress" }),
      }).catch(() => {});
    }
  }, [trackSlug, moduleSlug]);

  const handleComplete = useCallback(
    async (score: number) => {
      try {
        await fetch("/api/pathways/student/milestones", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("bb_access_token")}`,
          },
          body: JSON.stringify({ trackSlug, moduleSlug, status: "completed", score }),
        });
      } catch {
        /* ignore */
      }
      setCompleted(true);
    },
    [trackSlug, moduleSlug],
  );

  const handleBack = useCallback(() => {
    navigate(`/pathways/tracks/${trackSlug}`);
  }, [navigate, trackSlug]);

  if (!track || !mod) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 dark:text-slate-400">{t("pathways.modulePlayer.notFound")}</p>
        <button
          onClick={() => navigate("/pathways/tracks")}
          className="mt-4 text-indigo-700 dark:text-indigo-400 text-sm"
        >
          {t("pathways.modulePlayer.backToTracks")}
        </button>
      </div>
    );
  }

  const trackName = t(`pathways.tracks.items.${track.slug}.name`, track.name);
  const modName = t(`pathways.tracks.modules.${mod.slug}.name`, mod.name);

  if (completed) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.modulePlayer.moduleComplete")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {t("pathways.modulePlayer.finishedFmt", { moduleName: modName })}
        </p>
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          {t("pathways.modulePlayer.backToTrackCta")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" /> {t("pathways.modulePlayer.backToTrack", { trackName })}
      </button>

      <Suspense
        fallback={
          <div className="text-center py-20 text-slate-600 dark:text-slate-400">
            {t("pathways.modulePlayer.loading")}
          </div>
        }
      >
        <CyberLaunchModules moduleSlug={moduleSlug ?? ""} onComplete={handleComplete} onBack={handleBack} />
      </Suspense>
    </div>
  );
}
