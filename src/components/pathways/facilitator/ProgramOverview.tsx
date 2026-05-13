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
 * The split keeps the entry file small and lets each tab be reviewed
 * independently as content evolves with partner feedback.
 */
import { useState } from "react";
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

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Program Overview", icon: <BookOpen className="w-4 h-4" /> },
  { key: "modules", label: "Module Guides", icon: <Layers className="w-4 h-4" /> },
  { key: "sessions", label: "Session Guide", icon: <Calendar className="w-4 h-4" /> },
  { key: "faqs", label: "FAQs", icon: <HelpCircle className="w-4 h-4" /> },
  { key: "worksheets", label: "Worksheets", icon: <FileText className="w-4 h-4" /> },
  { key: "tips", label: "Facilitation Tips", icon: <Lightbulb className="w-4 h-4" /> },
];

export default function ProgramOverview() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Facilitator Resources</h1>
        <p className="text-sm text-slate-400 mt-1">
          Everything you need to run a strong Cyber Launch cohort.
        </p>
      </div>

      {/* Tab nav — horizontally scrollable on mobile */}
      <div
        role="tablist"
        aria-label="Facilitator resources sections"
        className="flex gap-1 border-b border-slate-700 overflow-x-auto pb-px -mx-1 px-1"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                active
                  ? "text-indigo-300 border-indigo-500 bg-indigo-600/10"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
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
