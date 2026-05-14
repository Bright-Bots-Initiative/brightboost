import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import Section from "./Section";

export default function OverviewTab() {
  const { t } = useTranslation();
  const cyberTrack = PATHWAY_TRACKS.find((track) => track.slug === "cyber-launch");
  const howSteps = t("pathways.resources.overview.howSteps", { returnObjects: true }) as string[];
  const talkingPoints = t("pathways.resources.overview.talkingPoints", { returnObjects: true }) as string[];
  const newFacilitatorSteps = t("pathways.resources.overview.newFacilitatorSteps", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <Section title={t("pathways.resources.overview.whatIsTitle")}>
        <p>{t("pathways.resources.overview.whatIsBody1")}</p>
        <p>{t("pathways.resources.overview.whatIsBody2")}</p>
      </Section>

      <Section title={t("pathways.resources.overview.bandsTitle")}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/30 dark:bg-indigo-900/10">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-300">
              {t("pathways.resources.overview.explorerLabel")}
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-400 mt-1">
              {t("pathways.resources.overview.explorerDesc")}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50 dark:border-cyan-800/30 dark:bg-cyan-900/10">
            <h4 className="font-semibold text-cyan-700 dark:text-cyan-300">
              {t("pathways.resources.overview.launchLabel")}
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-400 mt-1">
              {t("pathways.resources.overview.launchDesc")}
            </p>
          </div>
        </div>
      </Section>

      <Section title={t("pathways.resources.overview.howTitle")}>
        <div className="flex flex-wrap gap-3 text-sm">
          {howSteps?.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400 text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span className="text-slate-800 dark:text-slate-300">{step}</span>
              {i < howSteps.length - 1 && <span className="text-slate-400 dark:text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </Section>

      {cyberTrack && (
        <Section
          title={t("pathways.resources.overview.trackActiveTitle")}
          subtitle={t(`pathways.tracks.items.${cyberTrack.slug}.description`, cyberTrack.description) as string}
        >
          <div className="space-y-2">
            {cyberTrack.modules.map((m, i) => {
              const name = t(`pathways.tracks.modules.${m.slug}.name`, m.name) as string;
              const description = t(`pathways.tracks.modules.${m.slug}.description`, m.description) as string;
              return (
                <div
                  key={m.slug}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-500">
                      {description} • {m.duration}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t("pathways.resources.overview.talkingPointsTitle")}>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-400 list-disc list-inside">
          {talkingPoints?.map((point, i) => <li key={i}>{point}</li>)}
        </ul>
      </Section>

      <Section title={t("pathways.resources.overview.newFacilitatorTitle")}>
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-400 list-decimal list-inside">
          {newFacilitatorSteps?.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </Section>
    </div>
  );
}
