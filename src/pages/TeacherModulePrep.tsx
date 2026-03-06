import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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

const MODULE_TITLE_KEYS: Record<string, string> = {
  "k2-stem-rhyme-ride": "teacher.modulePrep.module1",
  "k2-stem-bounce-buds": "teacher.modulePrep.module2",
  "k2-stem-gotcha-gears": "teacher.modulePrep.module3",
};

const CHECKLIST_KEYS: Record<string, string> = {
  reviewModule: "teacher.modulePrep.checklistReviewModule",
  printQuestions: "teacher.modulePrep.checklistPrintQuestions",
  prepareMaterials: "teacher.modulePrep.checklistPrepareMaterials",
  setupDevices: "teacher.modulePrep.checklistSetupDevices",
  shareJoinCode: "teacher.modulePrep.checklistShareJoinCode",
};

const TeacherModulePrep: React.FC = () => {
  const { t } = useTranslation();
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
          Object.keys(CHECKLIST_KEYS).forEach((k) => (defaults[k] = false));
          setChecklistItems(defaults);
        }
      })
      .catch(() => setError(t("teacher.modulePrep.failedLoad")))
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
  const totalChecklistCount = Object.keys(CHECKLIST_KEYS).length;

  const handlePrint = () => window.print();

  const moduleTitle = t(MODULE_TITLE_KEYS[slug || ""] || slug || "");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t("teacher.modulePrep.loadingPrep")}</span>
      </div>
    );
  }

  if (error || !prep) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || t("teacher.modulePrep.notFound")}</p>
          <Link to="/teacher/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            {t("teacher.modulePrep.backToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: t("teacher.modulePrep.overview"), icon: BookOpen },
    { key: "checklist" as const, label: t("teacher.modulePrep.checklist", { completed: completedCount, total: totalChecklistCount }), icon: CheckSquare },
    { key: "discussion" as const, label: t("teacher.modulePrep.discussionGuide"), icon: MessageCircle },
    { key: "pacing" as const, label: t("teacher.modulePrep.pacingGuide"), icon: Clock },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/teacher/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {t("teacher.modulePrep.backToDashboard")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("teacher.modulePrep.title", { module: moduleTitle })}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("teacher.modulePrep.estimatedTime", { minutes: prep.estimatedMinutes })}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="print:hidden inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> {t("teacher.modulePrep.print")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="print:hidden flex border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
        {/* Overview Tab */}
        {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "overview" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> {t("teacher.modulePrep.learningObjectives")}
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
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("teacher.modulePrep.keyVocabulary")}</h2>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("teacher.modulePrep.prerequisiteKnowledge")}</h2>
              <ul className="space-y-1">
                {prep.prerequisites.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700">&#8226; {p}</li>
                ))}
              </ul>
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
              <h2 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> {t("teacher.modulePrep.commonMisconceptions")}
              </h2>
              <ul className="space-y-2">
                {prep.misconceptions.map((m, i) => (
                  <li key={i} className="text-sm text-amber-800">&#8226; {m}</li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("teacher.modulePrep.materialsNeeded")}</h2>
              <ul className="space-y-1">
                {prep.materials.map((m, i) => (
                  <li key={i} className="text-sm text-gray-700">&#8226; {m}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* Checklist Tab */}
        {activeTab === "checklist" && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" /> {t("teacher.modulePrep.beforeClassChecklist")}
              </h2>
              {savingChecklist && (
                <span className="text-xs text-gray-400">{t("teacher.modulePrep.savingChecklist")}</span>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(CHECKLIST_KEYS).map(([key, i18nKey]) => (
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
                    {t(i18nKey)}
                  </span>
                </label>
              ))}
            </div>
            {completedCount === totalChecklistCount && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                {t("teacher.modulePrep.allComplete")}
              </div>
            )}
          </section>
        )}

        {/* Discussion Guide Tab */}
        {(activeTab === "discussion" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "discussion" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" /> {t("teacher.modulePrep.beforeActivity")}
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                {t("teacher.modulePrep.beforeActivityDesc")}
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
                <MessageCircle className="w-5 h-5 text-green-600" /> {t("teacher.modulePrep.afterActivity")}
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                {t("teacher.modulePrep.afterActivityDesc")}
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
                <Lightbulb className="w-5 h-5 text-blue-600" /> {t("teacher.modulePrep.turnAndTalk")}
              </h2>
              <p className="text-xs text-blue-700 mb-3">
                {t("teacher.modulePrep.turnAndTalkDesc")}
              </p>
              <ul className="space-y-2">
                {prep.turnAndTalk.map((item, i) => (
                  <li key={i} className="text-sm text-blue-800">&#8226; {item}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* Pacing Guide Tab */}
        {(activeTab === "pacing" || typeof window !== "undefined" && window.matchMedia?.("print")?.matches) && (
          <div className={activeTab !== "pacing" ? "hidden print:block" : ""}>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> {t("teacher.modulePrep.suggestedPacing")}
                </h2>
                <span className="text-sm text-gray-500">
                  {t("teacher.modulePrep.totalMinutes", { minutes: totalPacingMinutes })}
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
