import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../services/api";
import {
  BookOpen,
  CheckSquare,
  MessageCircle,
  Clock,
  Printer,
  ChevronLeft,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";

interface PrepData {
  moduleSlug: string;
  objectives: string[];
  vocabulary: { term: string; definition: string }[];
  prerequisites: string[];
  estimatedMinutes: number;
  misconceptions: string[];
  discussionBefore: string[];
  discussionAfter: string[];
  turnAndTalk: string[];
  materials: string[];
  pacingGuide: { label: string; minutes: number }[];
  checklist: { items: Record<string, boolean>; completedAt: string | null } | null;
}

const MODULE_TITLES: Record<string, string> = {
  "k2-stem-sequencing": "Boost's Lost Steps",
  "k2-stem-rhyme-ride": "Rhyme & Ride",
  "k2-stem-bounce-buds": "Bounce & Buds",
  "k2-stem-gotcha-gears": "Gotcha Gears",
};

const DEFAULT_CHECKLIST_ITEMS: Record<string, string> = {
  reviewModule: "Review the module content yourself",
  printQuestions: "Print discussion questions for group work",
  prepareMaterials: "Prepare any physical materials needed",
  setupDevices: "Set up devices/tablets for student access",
  shareJoinCode: "Share the class join code with any new students",
};

const TeacherModulePrep: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const api = useApi();
  const [prep, setPrep] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "discussion" | "pacing">(
    "overview",
  );
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [pacingGuide, setPacingGuide] = useState<{ label: string; minutes: number }[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get(`/teacher/prep/${slug}`)
      .then((data: PrepData) => {
        setPrep(data);
        setPacingGuide(data.pacingGuide);
        if (data.checklist?.items) {
          setChecklistItems(data.checklist.items as Record<string, boolean>);
        } else {
          const defaults: Record<string, boolean> = {};
          Object.keys(DEFAULT_CHECKLIST_ITEMS).forEach((k) => (defaults[k] = false));
          setChecklistItems(defaults);
        }
      })
      .catch(() => setError("Failed to load prep data for this module."))
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveChecklist = useCallback(
    async (items: Record<string, boolean>) => {
      if (!slug) return;
      setSavingChecklist(true);
      try {
        await api.put(`/teacher/prep/${slug}/checklist`, { items });
      } catch {
        // silent — non-critical
      } finally {
        setSavingChecklist(false);
      }
    },
    [slug], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const toggleChecklistItem = (key: string) => {
    const updated = { ...checklistItems, [key]: !checklistItems[key] };
    setChecklistItems(updated);
    saveChecklist(updated);
  };

  const handlePacingChange = (index: number, minutes: number) => {
    const updated = [...pacingGuide];
    updated[index] = { ...updated[index], minutes: Math.max(1, Math.min(60, minutes)) };
    setPacingGuide(updated);
  };

  const totalPacingMinutes = pacingGuide.reduce((sum, item) => sum + item.minutes, 0);
  const completedCount = Object.values(checklistItems).filter(Boolean).length;
  const totalChecklistCount = Object.keys(DEFAULT_CHECKLIST_ITEMS).length;

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading prep data...</span>
      </div>
    );
  }

  if (error || !prep) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || "Module prep data not found."}</p>
          <Link to="/teacher/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BookOpen },
    { key: "checklist" as const, label: `Checklist (${completedCount}/${totalChecklistCount})`, icon: CheckSquare },
    { key: "discussion" as const, label: "Discussion Guide", icon: MessageCircle },
    { key: "pacing" as const, label: "Pacing Guide", icon: Clock },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/teacher/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Teacher Prep: {MODULE_TITLES[slug || ""] || slug}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Estimated class time: {prep.estimatedMinutes} minutes
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="print:hidden inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="print:hidden flex border-b border-gray-200 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {/* ── Overview Tab ── */}
        {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "overview" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Learning Objectives
              </h2>
              <ul className="space-y-2">
                {prep.objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">&#8226;</span> {obj}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Vocabulary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prep.vocabulary.map((v, i) => (
                  <div key={i} className="bg-gray-50 rounded-md p-3">
                    <span className="font-semibold text-gray-900 text-sm">{v.term}</span>
                    <p className="text-xs text-gray-600 mt-0.5">{v.definition}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Prerequisite Knowledge</h2>
              <ul className="space-y-1">
                {prep.prerequisites.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700">&#8226; {p}</li>
                ))}
              </ul>
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
              <h2 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Common Misconceptions
              </h2>
              <ul className="space-y-2">
                {prep.misconceptions.map((m, i) => (
                  <li key={i} className="text-sm text-amber-800">&#8226; {m}</li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Materials Needed</h2>
              <ul className="space-y-1">
                {prep.materials.map((m, i) => (
                  <li key={i} className="text-sm text-gray-700">&#8226; {m}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ── Checklist Tab ── */}
        {activeTab === "checklist" && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" /> Before Class Checklist
              </h2>
              {savingChecklist && (
                <span className="text-xs text-gray-400">Saving...</span>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(DEFAULT_CHECKLIST_ITEMS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checklistItems[key]}
                    onChange={() => toggleChecklistItem(key)}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`text-sm ${
                      checklistItems[key] ? "text-gray-400 line-through" : "text-gray-700"
                    }`}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {completedCount === totalChecklistCount && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                All items complete! You're ready to launch this session.
              </div>
            )}
          </section>
        )}

        {/* ── Discussion Guide Tab ── */}
        {(activeTab === "discussion" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "discussion" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" /> Before the Activity
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Use these questions to prime student thinking before going on the platform.
              </p>
              <ol className="space-y-3">
                {prep.discussionBefore.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 pl-2 border-l-2 border-blue-200 py-1">
                    <span className="font-medium text-blue-700">Q{i + 1}:</span> {q}
                  </li>
                ))}
              </ol>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" /> After the Activity
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Use these questions to debrief and connect learning.
              </p>
              <ol className="space-y-3">
                {prep.discussionAfter.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 pl-2 border-l-2 border-green-200 py-1">
                    <span className="font-medium text-green-700">Q{i + 1}:</span> {q}
                  </li>
                ))}
              </ol>
            </section>

            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" /> Turn and Talk Prompts
              </h2>
              <p className="text-xs text-blue-700 mb-3">
                Quick pair-work prompts for partner discussions.
              </p>
              <ul className="space-y-2">
                {prep.turnAndTalk.map((t, i) => (
                  <li key={i} className="text-sm text-blue-800">&#8226; {t}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ── Pacing Guide Tab ── */}
        {(activeTab === "pacing" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "pacing" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Suggested Pacing
                </h2>
                <span className="text-sm text-gray-500">
                  Total: {totalPacingMinutes} min
                </span>
              </div>
              <div className="space-y-3">
                {pacingGuide.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-20">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={item.minutes}
                        onChange={(e) => handlePacingChange(i, parseInt(e.target.value) || 1)}
                        className="print:hidden w-full text-center border border-gray-300 rounded-md py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="hidden print:inline text-sm font-medium">{item.minutes} min</span>
                    </div>
                    <div className="flex-grow">
                      <div className="h-6 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (item.minutes / totalPacingMinutes) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-sm text-gray-700 w-48 text-right">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherModulePrep;
