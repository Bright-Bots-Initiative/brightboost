import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useApi, ApiError } from "../services/api";
import { api as directApi } from "../services/api";
import {
  Users,
  Zap,
  Copy,
  Check,
  Clock,
  TrendingUp,
  Printer,
  Smile,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import PrintLoginCards from "@/components/teacher/PrintLoginCards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CourseDetail {
  id: string;
  name: string;
  joinCode: string;
  enrollmentCount: number;
  students: { id: string; name: string; email: string; enrolledAt: string }[];
  createdAt: string;
}

interface AssignmentWithStats {
  id: string;
  title: string;
  description?: string;
  activityId?: string;
  dueDate: string;
  status: string;
  enrolledCount: number;
  completedCount: number;
  avgTimeSpentS: number;
  createdAt: string;
}

interface PulseSummary {
  preCount: number;
  postCount: number;
  avgPre: number | null;
  avgPost: number | null;
  delta: number | null;
}

interface BenchmarkTemplate {
  id: string;
  title: string;
  gradeRange: string;
  subject: string;
}

interface BenchmarkSummary {
  id: string;
  kind: string;
  status: string;
  template: BenchmarkTemplate;
  enrolledCount: number;
  completedCount: number;
  avgScore: number | null;
  avgPercent: number | null;
}

interface ModuleSummary {
  slug: string;
  title: string;
  units: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      activities: { id: string; title: string; kind: string }[];
    }[];
  }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TeacherClassDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const api = useApi();

  // Course data
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Assignments with stats
  const [assignments, setAssignments] = useState<AssignmentWithStats[]>([]);

  // Pulse summary
  const [pulse, setPulse] = useState<PulseSummary | null>(null);

  // Icon assignment
  const [iconAssignments, setIconAssignments] = useState<Record<string, string>>({});
  const [savingIcons, setSavingIcons] = useState(false);
  const [showPrintCards, setShowPrintCards] = useState(false);
  const [printCardsData, setPrintCardsData] = useState<{
    className: string;
    joinCode: string;
    cards: { name: string; icon: string; hasPin: boolean }[];
  } | null>(null);

  // Benchmarks
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([]);
  const [benchmarkTemplates, setBenchmarkTemplates] = useState<BenchmarkTemplate[]>([]);
  const [assigningBenchmark, setAssigningBenchmark] = useState(false);

  // Launch session wizard
  const [launchOpen, setLaunchOpen] = useState(false);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [selModule, setSelModule] = useState<string>("");
  const [selActivity, setSelActivity] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const [launching, setLaunching] = useState(false);

  // -------------------------------------------------------------------
  // Load course detail + assignments + pulse
  // -------------------------------------------------------------------

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [courseData, assignmentData, pulseData, benchmarkData, templateData] = await Promise.all([
          api.get(`/teacher/courses/${id}`),
          api.get(`/teacher/courses/${id}/assignments`),
          api.get(`/teacher/courses/${id}/pulse/summary`),
          api.get(`/teacher/courses/${id}/benchmarks`).catch(() => []),
          api.get(`/teacher/benchmark-templates`).catch(() => []),
        ]);
        setCourse(courseData);
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setPulse(pulseData);
        setBenchmarks(Array.isArray(benchmarkData) ? benchmarkData : []);
        setBenchmarkTemplates(Array.isArray(templateData) ? templateData : []);
      } catch (err) {
        const is404 = (err instanceof ApiError && err.status === 404) ||
          (err instanceof Error && (/404/.test(err.message) || /not found/i.test(err.message)));
        setError(is404 ? t("teacher.classDetail.notFound") : t("teacher.classDetail.failedLoad"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api, t]);

  // -------------------------------------------------------------------
  // Copy join code
  // -------------------------------------------------------------------

  const handleCopy = () => {
    if (!course) return;
    navigator.clipboard.writeText(course.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // -------------------------------------------------------------------
  // Icon assignment helpers
  // -------------------------------------------------------------------

  const AVAILABLE_ICONS = [
    "🐱", "🐶", "🦊", "🐸", "🦁", "🐰", "🐼", "🦄", "🐢", "🦋",
    "🐧", "🐨", "🦉", "🐙", "🦈", "🐝", "🦜", "🐳", "🦒", "🐞",
  ];

  const assignIcon = useCallback((studentId: string, icon: string) => {
    setIconAssignments((prev) => ({ ...prev, [studentId]: icon }));
  }, []);

  const autoAssignIcons = useCallback(() => {
    if (!course) return;
    const newAssignments: Record<string, string> = {};
    course.students.forEach((s, i) => {
      newAssignments[s.id] = AVAILABLE_ICONS[i % AVAILABLE_ICONS.length];
    });
    setIconAssignments(newAssignments);
  }, [course]);

  const saveIcons = useCallback(async () => {
    if (!id || Object.keys(iconAssignments).length === 0) return;
    setSavingIcons(true);
    try {
      const students = Object.entries(iconAssignments).map(([studentId, icon]) => ({
        studentId,
        icon,
      }));
      await api.post(`/teacher/courses/${id}/setup-icons`, { students } as Record<string, unknown>);
      const updatedCourse = await api.get(`/teacher/courses/${id}`);
      setCourse(updatedCourse);
    } catch {
      // error toast from useApi
    } finally {
      setSavingIcons(false);
    }
  }, [id, iconAssignments, api]);

  const handlePrintCards = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get(`/teacher/courses/${id}/login-cards`);
      setPrintCardsData(data);
      setShowPrintCards(true);
    } catch {
      // error toast from useApi
    }
  }, [id, api]);

  // -------------------------------------------------------------------
  // Launch session wizard helpers
  // -------------------------------------------------------------------

  const openLaunchWizard = async () => {
    setLaunchOpen(true);
    if (modules.length === 0) {
      try {
        const mods = await directApi.getModules();
        const modArray = Array.isArray(mods) ? mods : mods?.modules ?? [];
        const detailed = await Promise.all(
          modArray.map((m: any) =>
            directApi.getModule(m.slug, { structureOnly: true }),
          ),
        );
        setModules(detailed);
      } catch {
        // modules will stay empty
      }
    }
  };

  const activitiesForModule = (slug: string) => {
    const mod = modules.find((m) => m.slug === slug);
    if (!mod) return [];
    const acts: { id: string; title: string; breadcrumb: string }[] = [];
    for (const u of mod.units ?? []) {
      for (const l of u.lessons ?? []) {
        for (const a of l.activities ?? []) {
          acts.push({
            id: a.id,
            title: a.title,
            breadcrumb: `${u.title} > ${l.title}`,
          });
        }
      }
    }
    return acts;
  };

  const assignBenchmark = async (templateId: string, kind: "PRE" | "POST") => {
    if (!id) return;
    setAssigningBenchmark(true);
    try {
      await api.post(`/teacher/courses/${id}/benchmarks`, { templateId, kind });
      const updated = await api.get(`/teacher/courses/${id}/benchmarks`);
      setBenchmarks(Array.isArray(updated) ? updated : []);
    } catch { /* toast handles error */ }
    finally { setAssigningBenchmark(false); }
  };

  const toggleBenchmarkStatus = async (benchmarkId: string, currentStatus: string) => {
    if (!id) return;
    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
    try {
      await api.patch(`/teacher/courses/${id}/benchmarks/${benchmarkId}`, { status: newStatus });
      setBenchmarks((prev) => prev.map((b) => b.id === benchmarkId ? { ...b, status: newStatus } : b));
    } catch { /* toast handles error */ }
  };

  const handleLaunch = async () => {
    if (!selActivity || !id) return;
    setLaunching(true);
    try {
      const created = await api.post(
        `/teacher/courses/${id}/assignments`,
        {
          title: sessionTitle || selActivity.title,
          activityId: selActivity.id,
          dueDate,
        } as Record<string, unknown>,
      );
      setAssignments((prev) => [
        { ...created, enrolledCount: course?.enrollmentCount ?? 0, completedCount: 0, avgTimeSpentS: 0 },
        ...prev,
      ]);
      setLaunchOpen(false);
      setSelModule("");
      setSelActivity(null);
      setSessionTitle("");
    } catch {
      // error toast from useApi
    } finally {
      setLaunching(false);
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  if (loading) {
    return (
      <div className="w-full p-6">
        <div className="h-8 bg-gray-300 animate-pulse w-1/3 mb-4 rounded" />
        <div className="h-4 bg-gray-200 animate-pulse w-2/3 rounded" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="w-full p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          {error ?? t("teacher.classDetail.courseNotFound")}
        </h2>
        <Link
          to="/teacher/classes"
          className="inline-block px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors"
        >
          {t("teacher.classDetail.backToClasses")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            {course.name}
          </h1>
          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600 flex-wrap gap-y-2">
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {t("teacher.classDetail.students", { count: course.enrollmentCount })}
            </span>
            <span className="flex items-center font-mono bg-gray-100 px-2 py-1 rounded text-xs">
              {t("teacher.classDetail.joinCode")} <strong className="ml-1 text-base">{course.joinCode}</strong>
              <button onClick={handleCopy} className="ml-2 text-brightboost-blue" title={t("teacher.classDetail.copy")}>
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </span>
          </div>
        </div>
        <button
          onClick={openLaunchWizard}
          className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue whitespace-nowrap"
        >
          {t("teacher.classDetail.launchSession")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("teacher.classDetail.sessionsLaunched")}</p>
              <p className="text-2xl font-bold text-brightboost-navy">
                {assignments.length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-brightboost-blue opacity-40" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("teacher.classDetail.avgCompletion")}</p>
              <p className="text-2xl font-bold text-brightboost-green">
                {assignments.length > 0 && course.enrollmentCount > 0
                  ? Math.round(
                      (assignments.reduce((s, a) => s + a.completedCount, 0) /
                        (assignments.length * course.enrollmentCount)) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-brightboost-green opacity-40" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("teacher.classDetail.confidenceLift")}</p>
              <p className="text-2xl font-bold text-purple-600">
                {pulse?.delta !== null && pulse?.delta !== undefined
                  ? `${pulse.delta > 0 ? "+" : ""}${pulse.delta}`
                  : "—"}
              </p>
              <p className="text-xs text-gray-400">
                {t("teacher.classDetail.pre")} {pulse?.avgPre ?? "—"} / {t("teacher.classDetail.post")} {pulse?.avgPost ?? "—"} ({pulse?.preCount ?? 0}/{pulse?.postCount ?? 0} {t("teacher.classDetail.responses")})
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400 opacity-40" />
          </div>
        </div>
      </div>

      {/* Enrolled Students */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          {t("teacher.classDetail.enrolledStudents", { count: course.students.length })}
        </h2>
        {course.students.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            {t("teacher.classDetail.noStudents")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.name")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.email")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.enrolled")}</th>
                </tr>
              </thead>
              <tbody>
                {course.students.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{s.name}</td>
                    <td className="py-2 px-3">{s.email}</td>
                    <td className="py-2 px-3 text-xs text-gray-400">
                      {new Date(s.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* K-2 Login Icons Setup */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-4 flex items-center">
          <Smile className="w-5 h-5 mr-2" />
          {t("teacher.classDetail.k2Icons")}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {t("teacher.classDetail.k2IconsDesc")}
        </p>

        {course.students.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {t("teacher.classDetail.enrollFirst")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={autoAssignIcons}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
              >
                {t("teacher.classDetail.autoAssign")}
              </button>
              <button
                onClick={saveIcons}
                disabled={savingIcons || Object.keys(iconAssignments).length === 0}
                className="px-3 py-1.5 text-sm bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy disabled:opacity-50 transition-colors"
              >
                {savingIcons ? t("teacher.classDetail.saving") : t("teacher.classDetail.saveIcons")}
              </button>
              <button
                onClick={handlePrintCards}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <Printer className="w-4 h-4" />
                {t("teacher.classDetail.printCards")}
              </button>
            </div>

            <div className="space-y-3">
              {course.students.map((s) => {
                const currentIcon = iconAssignments[s.id] || "";
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className="text-3xl w-10 text-center">
                      {currentIcon || "❓"}
                    </span>
                    <span className="font-medium text-sm text-slate-700 w-32 truncate">
                      {s.name}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => assignIcon(s.id, icon)}
                          className={`text-xl w-8 h-8 rounded transition-all ${
                            currentIcon === icon
                              ? "bg-blue-100 ring-2 ring-blue-400 scale-110"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Print cards overlay */}
      {showPrintCards && printCardsData && (
        <PrintLoginCards
          className={printCardsData.className}
          joinCode={printCardsData.joinCode}
          cards={printCardsData.cards}
          onClose={() => setShowPrintCards(false)}
        />
      )}

      {/* Sessions / Assignments */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          {t("teacher.classDetail.weeklySessions")}
        </h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            {t("teacher.classDetail.noSessions")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.session")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.due")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.completed")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.avgTime")}</th>
                  <th className="py-2 px-3 font-medium">{t("teacher.classDetail.statusLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{a.title}</td>
                    <td className="py-2 px-3">{a.dueDate}</td>
                    <td className="py-2 px-3">
                      {a.completedCount}/{a.enrolledCount}
                    </td>
                    <td className="py-2 px-3">
                      {a.avgTimeSpentS > 0
                        ? `${Math.round(a.avgTimeSpentS / 60)}m ${a.avgTimeSpentS % 60}s`
                        : "—"}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === "Open"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Benchmark Assessments */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-4 flex items-center">
          <ClipboardCheck className="w-5 h-5 mr-2" />
          {t("teacher.benchmark.title")}
        </h2>

        {benchmarks.length === 0 ? (
          <p className="text-sm text-gray-400 italic mb-4">{t("teacher.benchmark.noneYet")}</p>
        ) : (
          <div className="space-y-3 mb-4">
            {benchmarks.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    b.kind === "PRE" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {b.kind}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{b.template.title}</span>
                  <div className="text-xs text-slate-400 mt-1">
                    {b.completedCount}/{b.enrolledCount} {t("teacher.benchmark.completed")}
                    {b.avgPercent !== null && ` · ${t("teacher.benchmark.avg")} ${b.avgPercent}%`}
                  </div>
                </div>
                <button
                  onClick={() => toggleBenchmarkStatus(b.id, b.status)}
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    b.status === "OPEN"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {b.status === "OPEN" ? t("teacher.benchmark.open") : t("teacher.benchmark.closed")}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Assign buttons — show for each template × kind combo not yet assigned */}
        {benchmarkTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {benchmarkTemplates.map((tmpl) =>
              (["PRE", "POST"] as const).map((kind) => {
                const exists = benchmarks.some((b) => b.template.id === tmpl.id && b.kind === kind);
                if (exists) return null;
                return (
                  <button
                    key={`${tmpl.id}-${kind}`}
                    onClick={() => assignBenchmark(tmpl.id, kind)}
                    disabled={assigningBenchmark}
                    className="px-3 py-1.5 text-xs bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy disabled:opacity-50 flex items-center gap-1"
                  >
                    {assigningBenchmark && <Loader2 className="w-3 h-3 animate-spin" />}
                    {t("teacher.benchmark.assign")} {kind}
                  </button>
                );
              }),
            )}
          </div>
        )}
      </section>

      {/* Launch Session Dialog */}
      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teacher.classDetail.launchTitle")}</DialogTitle>
            <DialogDescription>
              {t("teacher.classDetail.launchDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Module picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("teacher.classDetail.module")}
              </label>
              {modules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{t("teacher.classDetail.loadingModules")}</p>
              ) : (
                <select
                  value={selModule}
                  onChange={(e) => {
                    setSelModule(e.target.value);
                    setSelActivity(null);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                >
                  <option value="">{t("teacher.classDetail.selectModule")}</option>
                  {modules.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Teacher Prep link */}
            {selModule && (
              <Link
                to={`/teacher/prep/${selModule}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                target="_blank"
              >
                {t("teacher.classDetail.prepareSession")} &rarr;
              </Link>
            )}

            {/* Activity picker */}
            {selModule && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("teacher.classDetail.activity")}
                </label>
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                  {activitiesForModule(selModule).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelActivity({ id: a.id, title: a.title });
                        setSessionTitle(a.title);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                        selActivity?.id === a.id ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      <div>
                        <span className="text-xs text-gray-400 block">{a.breadcrumb}</span>
                        {a.title}
                      </div>
                      {selActivity?.id === a.id && (
                        <Check className="w-4 h-4 text-brightboost-blue" />
                      )}
                    </button>
                  ))}
                  {activitiesForModule(selModule).length === 0 && (
                    <p className="text-sm text-gray-400 italic p-3">
                      {t("teacher.classDetail.noActivities")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Session title */}
            {selActivity && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("teacher.classDetail.sessionTitle")}
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("teacher.classDetail.dueDate")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setLaunchOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t("teacher.classDetail.cancel")}
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!selActivity || launching}
              className="px-4 py-2 text-sm text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy disabled:opacity-50"
            >
              {launching ? t("teacher.classDetail.launching") : t("teacher.classDetail.launchBtn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherClassDetail;
