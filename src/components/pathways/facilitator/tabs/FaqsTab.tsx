import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { FAQ_CATEGORIES, type FaqCategory } from "../data/faqs";
import Section from "./Section";

export default function FaqsTab() {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState<FaqCategory["key"]>("youth");
  const active = FAQ_CATEGORIES.find((c) => c.key === activeKey)!;

  const localizedLabel = (key: FaqCategory["key"]) =>
    t(`pathways.resources.faqs.categories.${key}.label`, FAQ_CATEGORIES.find((c) => c.key === key)?.label ?? key) as string;
  const localizedDescription = (key: FaqCategory["key"]) =>
    t(`pathways.resources.faqs.categories.${key}.description`, FAQ_CATEGORIES.find((c) => c.key === key)?.description ?? "") as string;

  return (
    <div className="space-y-6">
      <Section
        title={t("pathways.resources.faqs.title")}
        subtitle={t("pathways.resources.faqs.sub")}
      >
        <div className="flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeKey === c.key
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-700/50"
                  : "bg-white text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {localizedLabel(c.key)}
              <span className="ml-2 text-xs text-slate-500">{c.items.length}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={localizedLabel(active.key)} subtitle={localizedDescription(active.key)}>
        <div className="space-y-2">
          {active.items.map((item, i) => (
            <FaqItemRow key={i} q={item.question} a={item.answer} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function FaqItemRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 mt-0.5 transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{q}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
