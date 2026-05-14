import { useTranslation } from "react-i18next";
import { FileText, Printer } from "lucide-react";
import { WORKSHEETS, openWorksheetPrint } from "../data/worksheets";
import Section from "./Section";

export default function WorksheetsTab() {
  const { t } = useTranslation();
  const printTips = t("pathways.resources.worksheets.printTips", { returnObjects: true }) as string[];

  return (
    <div className="space-y-6">
      <Section
        title={t("pathways.resources.worksheets.title")}
        subtitle={t("pathways.resources.worksheets.sub")}
      >
        <p className="text-sm text-slate-700 dark:text-slate-400">{t("pathways.resources.worksheets.body")}</p>
      </Section>

      <div className="grid gap-3 md:grid-cols-2">
        {WORKSHEETS.map((w) => (
          <WorksheetCard key={w.id} {...w} />
        ))}
      </div>

      <Section title={t("pathways.resources.worksheets.printTipsTitle")}>
        <ul className="text-sm text-slate-700 dark:text-slate-400 list-disc list-inside space-y-1">
          {printTips?.map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </Section>
    </div>
  );
}

function WorksheetCard({
  number,
  title,
  description,
  duration,
  buildHtml,
}: {
  number: number;
  title: string;
  description: string;
  duration: string;
  buildHtml: () => string;
}) {
  const { t } = useTranslation();
  const handlePrint = () => {
    openWorksheetPrint(buildHtml());
  };

  return (
    <div className="p-4 rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600 dark:text-slate-500">
          {t("pathways.resources.worksheets.worksheetLabel", { n: number })}
        </p>
        <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">{title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
        <p className="text-xs text-slate-500 mt-1">{duration}</p>
      </div>
      <button
        onClick={handlePrint}
        aria-label={t("pathways.resources.worksheets.printLabel") + " " + title}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-xs font-medium transition-colors shrink-0"
      >
        <Printer className="w-3.5 h-3.5" />
        {t("pathways.resources.worksheets.printLabel")}
      </button>
    </div>
  );
}
