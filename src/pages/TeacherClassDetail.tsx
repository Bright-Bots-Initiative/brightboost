import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../services/api";
import { api as directApi } from "../services/api";
import {
  Users,
  Zap,
  Copy,
  Check,
  Clock,
  TrendingUp,
} from "lucide-react";
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
        const [courseData, assignmentData, pulseData] = await Promise.all([
          api.get(`/teacher/courses/${id}`),
          api.get(`/teacher/courses/${id}/assignments`),
          api.get(`/teacher/courses/${id}/pulse/summary`),
        ]);
        setCourse(courseData);
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setPulse(pulseData);
      } catch {
        setError("Failed to load course details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, api]);

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
  // Launch session wizard helpers
  // -------------------------------------------------------------------

  const openLaunchWizard = async () => {
    setLaunchOpen(true);
    if (modules.length === 0) {
      try {
        const mods = await directApi.getModules();
        const modArray = Array.isArray(mods) ? mods : mods?.modules ?? [];
        // For each module, load its structure
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
        <h2 className="text-2xl font-bold text-red-600">
          {error ?? "Course not found"}
        </h2>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy flex items-center">
            <Zap className="w-7 h-7 mr-2 text-brightboost-blue" />
            {course.name}
          </h1>
          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {course.enrollmentCount} students
            </span>
            <span className="flex items-center font-mono bg-gray-100 px-2 py-1 rounded text-xs">
              Join Code: <strong className="ml-1 text-base">{course.joinCode}</strong>
              <button onClick={handleCopy} className="ml-2 text-brightboost-blue" title="Copy">
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </span>
          </div>
        </div>
        <button
          onClick={openLaunchWizard}
          className="px-4 py-2 bg-brightboost-blue text-white rounded-md hover:bg-brightboost-navy transition-colors focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
        >
          Launch Weekly Session
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sessions Launched</p>
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
              <p className="text-sm text-gray-500">Avg Completion</p>
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
              <p className="text-sm text-gray-500">Confidence Lift</p>
              <p className="text-2xl font-bold text-purple-600">
                {pulse?.delta !== null && pulse?.delta !== undefined
                  ? `${pulse.delta > 0 ? "+" : ""}${pulse.delta}`
                  : "—"}
              </p>
              <p className="text-xs text-gray-400">
                Pre {pulse?.avgPre ?? "—"} / Post {pulse?.avgPost ?? "—"} ({pulse?.preCount ?? 0}/{pulse?.postCount ?? 0} responses)
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
          Enrolled Students ({course.students.length})
        </h2>
        {course.students.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No students yet. Share the join code above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Email</th>
                  <th className="py-2 px-3 font-medium">Enrolled</th>
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

      {/* Sessions / Assignments */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Weekly Sessions
        </h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No sessions yet. Click "Launch Weekly Session" to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  <th className="py-2 px-3 font-medium">Session</th>
                  <th className="py-2 px-3 font-medium">Due</th>
                  <th className="py-2 px-3 font-medium">Completed</th>
                  <th className="py-2 px-3 font-medium">Avg Time</th>
                  <th className="py-2 px-3 font-medium">Status</th>
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

      {/* Launch Session Dialog */}
      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch Weekly Session</DialogTitle>
            <DialogDescription>
              Select an activity from the curriculum for students to complete this week.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Module picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module
              </label>
              {modules.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Loading modules...</p>
              ) : (
                <select
                  value={selModule}
                  onChange={(e) => {
                    setSelModule(e.target.value);
                    setSelActivity(null);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brightboost-blue"
                >
                  <option value="">Select a module</option>
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
                Prepare for this session &rarr;
              </Link>
            )}

            {/* Activity picker */}
            {selModule && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity
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
                      No activities in this module
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
                    Session Title
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
                    Due Date
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!selActivity || launching}
              className="px-4 py-2 text-sm text-white bg-brightboost-blue rounded-md hover:bg-brightboost-navy disabled:opacity-50"
            >
              {launching ? "Launching..." : "Launch Session"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherClassDetail;
