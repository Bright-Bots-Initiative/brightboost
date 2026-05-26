/**
 * ToolboxIntro — one-time overlay shown the first time a student opens a
 * CTF challenge. Frames the toolbox + scratch pad + hints so they don't
 * think they're supposed to do everything in their head.
 *
 * Dismissal flips PathwayOnboarding.toolboxIntroSeen so future visits skip
 * it. Re-openable via the help icon on the Toolbox header.
 */
import { Wrench, Edit3, Lightbulb, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ToolboxIntroProps {
  onAcknowledge: () => void;
  /** When true, shows a small × close button (used when the intro is
   *  re-opened from the help icon and the user is just browsing the
   *  reference rather than completing first-run). */
  showClose?: boolean;
}

export default function ToolboxIntro({
  onAcknowledge,
  showClose,
}: ToolboxIntroProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {t("pathways.challenges.toolboxIntro.heading")}
          </h2>
          {showClose && (
            <button
              type="button"
              onClick={onAcknowledge}
              aria-label={t("pathways.challenges.toolboxIntro.close")}
              className="p-1 -m-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <p>{t("pathways.challenges.toolboxIntro.intro")}</p>

          <IntroBlock
            Icon={Wrench}
            tint="indigo"
            title={t("pathways.challenges.toolboxIntro.toolboxTitle")}
            body={t("pathways.challenges.toolboxIntro.toolboxBody", {
              toolsButton: t("pathways.challenges.toolboxIntro.toolsButton"),
            })}
          />

          <IntroBlock
            Icon={Edit3}
            tint="emerald"
            title={t("pathways.challenges.toolboxIntro.scratchPadTitle")}
            body={t("pathways.challenges.toolboxIntro.scratchPadBody")}
          />

          <IntroBlock
            Icon={Lightbulb}
            tint="amber"
            title={t("pathways.challenges.toolboxIntro.hintsTitle")}
            body={t("pathways.challenges.toolboxIntro.hintsBody")}
          />

          <p className="text-center text-slate-600 dark:text-slate-400 italic text-xs sm:text-sm pt-2">
            {t("pathways.challenges.toolboxIntro.outro")}
          </p>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onAcknowledge}
            className="w-full px-5 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
          >
            {t("pathways.challenges.toolboxIntro.ackCta")}
          </button>
        </div>
      </div>
    </div>
  );
}

type Tint = "indigo" | "emerald" | "amber";

function IntroBlock({
  Icon,
  tint,
  title,
  body,
}: {
  Icon: typeof Wrench;
  tint: Tint;
  title: string;
  body: React.ReactNode;
}) {
  const ring = {
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
    amber:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
  }[tint];
  const iconColor = {
    indigo: "text-indigo-700 dark:text-indigo-300",
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-400",
  }[tint];
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${ring}`}>
      <p className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </span>
      </p>
      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {body}
      </div>
    </div>
  );
}
