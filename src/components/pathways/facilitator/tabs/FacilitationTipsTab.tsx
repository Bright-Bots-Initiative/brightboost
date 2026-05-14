import { useTranslation } from "react-i18next";
import { FACILITATION_TIPS } from "../data/facilitationTips";
import Section from "./Section";

export default function FacilitationTipsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Section title={t("pathways.resources.tips.title")} subtitle={t("pathways.resources.tips.sub")}>
        <p className="text-sm text-slate-700 dark:text-slate-400">{t("pathways.resources.tips.intro")}</p>
      </Section>

      {FACILITATION_TIPS.map((section) => (
        <Section key={section.id} title={section.title} subtitle={section.intro} id={section.id}>
          <div className="space-y-4 mt-3">
            {section.bullets.map((b, i) => (
              <div key={i} className="border-l-2 border-indigo-300 dark:border-indigo-700/50 pl-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{b.heading}</p>
                <p className="text-sm text-slate-700 dark:text-slate-400 mt-1 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
