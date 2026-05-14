/**
 * Tracks page — catalog of available tracks with per-track stats and
 * a "Request a Custom Track" stub for the Q3 2026 roadmap item.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { Shield, Rocket, DollarSign, Cpu, Film, Lock, ExternalLink, Sparkles, X } from "lucide-react";
import Card, { CardBody } from "../shared/Card";
import { StatusPill } from "../FacilitatorLayout";

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-6 h-6" />,
  Rocket: <Rocket className="w-6 h-6" />,
  DollarSign: <DollarSign className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />,
  Film: <Film className="w-6 h-6" />,
};

interface TrackUsage {
  cohorts: { id: string; name: string; status: string }[];
  learnerCount: number;
  completionCount: number;
}

export default function Tracks() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<Record<string, TrackUsage>>({});
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    fetch("/api/pathways/facilitator/tracks", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setUsage(data || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("pathways.facilitator.tracks.title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("pathways.facilitator.tracks.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" /> {t("pathways.facilitator.tracks.requestCustom")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PATHWAY_TRACKS.map((track) => {
          const u = usage[track.slug];
          const isActive = track.status === "active";
          return (
            <Card key={track.slug}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: track.color + "20", color: track.color }}
                  >
                    {ICONS[track.icon]}
                  </div>
                  {!isActive && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      <Lock className="w-3 h-3" /> {t("pathways.common.comingSoon")}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t(`pathways.tracks.items.${track.slug}.name`, track.name)}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t(`pathways.tracks.items.${track.slug}.tagline`, track.tagline)}
                  </p>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-500">
                  {track.modules.length} {t("pathways.facilitator.tracks.modules")}
                </p>

                {isActive && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Stat label={t("pathways.facilitator.tracks.cohorts")} value={u?.cohorts.length ?? 0} />
                      <Stat label={t("pathways.facilitator.tracks.learners")} value={u?.learnerCount ?? 0} />
                      <Stat label={t("pathways.facilitator.tracks.completions")} value={u?.completionCount ?? 0} />
                    </div>
                    {u && u.cohorts.length > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-500">
                        <p className="font-medium mb-1">{t("pathways.facilitator.tracks.usedBy")}</p>
                        <ul className="space-y-0.5">
                          {u.cohorts.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2">
                              <Link
                                to={`/pathways/facilitator/cohorts/${c.id}`}
                                className="truncate hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                {c.name}
                              </Link>
                              <StatusPill status={c.status} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link
                      to={`/pathways/tracks/${track.slug}`}
                      className="inline-flex items-center gap-1.5 mt-1 text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
                    >
                      {t("pathways.facilitator.tracks.preview")} <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Custom track request modal */}
      {requestOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setRequestOpen(false)}
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  {t("pathways.facilitator.tracks.customTitle")}
                </h3>
              </div>
              <button
                onClick={() => setRequestOpen(false)}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <span className="inline-block text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 mb-3">
              {t("pathways.facilitator.tracks.customRoadmap")}
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {t("pathways.facilitator.tracks.customBody")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRequestOpen(false)}
                className="px-3 py-1.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {t("pathways.facilitator.create.cancel")}
              </button>
              <a
                href="mailto:nwalker@brightbotsint.com?subject=Pathways%20Custom%20Track%20Request"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                {t("pathways.facilitator.tracks.contactUs")}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
