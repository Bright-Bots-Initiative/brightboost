/**
 * Facilitator Resources page — entry component for /pathways/facilitator/resources.
 *
 * Six tabs:
 *   1. Program Overview      — high-level for partners and new facilitators
 *   2. Module Guides         — detailed guide for each Cyber Launch module
 *   3. Session Guide         — 6-week pacing
 *   4. FAQs                  — youth, parents/guardians, partners
 *   5. Worksheets            — printable activity sheets
 *   6. Facilitation Tips     — situational guidance for facilitators
 *
 * Each tab is a self-contained component in ./tabs/, backed by data in ./data/.
 * Tab labels are i18n'd; tab contents are i18n'd where keys exist and fall back
 * to English-from-TS otherwise (see ./data/ — those files keep English content).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Calendar,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
} from "lucide-react";
import OverviewTab from "./tabs/OverviewTab";
import ModuleGuidesTab from "./tabs/ModuleGuidesTab";
import SessionGuideTab from "./tabs/SessionGuideTab";
import FaqsTab from "./tabs/FaqsTab";
import WorksheetsTab from "./tabs/WorksheetsTab";
import FacilitationTipsTab from "./tabs/FacilitationTipsTab";

type TabKey = "overview" | "modules" | "sessions" | "faqs" | "worksheets" | "tips";

export default function ProgramOverview() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("overview");

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("pathways.resources.tabs.overview"), icon: <BookOpen className="w-4 h-4" /> },
    { key: "modules", label: t("pathways.resources.tabs.modules"), icon: <Layers className="w-4 h-4" /> },
    { key: "sessions", label: t("pathways.resources.tabs.sessions"), icon: <Calendar className="w-4 h-4" /> },
    { key: "faqs", label: t("pathways.resources.tabs.faqs"), icon: <HelpCircle className="w-4 h-4" /> },
    { key: "worksheets", label: t("pathways.resources.tabs.worksheets"), icon: <FileText className="w-4 h-4" /> },
    { key: "tips", label: t("pathways.resources.tabs.tips"), icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.resources.title")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t("pathways.resources.subtitle")}
        </p>
      </div>

      {/* Tab nav — horizontally scrollable on mobile */}
      <div
        role="tablist"
        aria-label={t("pathways.resources.title")}
        className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px -mx-1 px-1"
      >
        {tabs.map((tt) => {
          const active = tab === tt.key;
          return (
            <button
              key={tt.key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tt.key}`}
              id={`tab-${tt.key}`}
              onClick={() => setTab(tt.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                active
                  ? "text-indigo-700 border-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:border-indigo-500 dark:bg-indigo-600/10"
                  : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
            >
              {tt.icon}
              <span>{tt.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="focus:outline-none"
        tabIndex={0}
      >
        {tab === "overview" && <OverviewTab />}
        {tab === "modules" && <ModuleGuidesTab />}
        {tab === "sessions" && <SessionGuideTab />}
        {tab === "faqs" && <FaqsTab />}
        {tab === "worksheets" && <WorksheetsTab />}
        {tab === "tips" && <FacilitationTipsTab />}
      </div>
    </div>
  );
}
