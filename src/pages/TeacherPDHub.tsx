import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../services/api";
import {
  GraduationCap,
  Plus,
  Clock,
  CalendarDays,
  FileText,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pin,
  Send,
  BookOpen,
  Pencil,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface PDSession {
  id: string;
  teacherId: string;
  date: string;
  durationMinutes: number;
  topic: string;
  facilitator: string | null;
  notes: string | null;
  actionItems: string[] | null;
  relatedModuleSlugs: string[] | null;
  isTemplate: boolean;
  reflections: PDReflection[];
}

interface PDReflection {
  id: string;
  pdSessionId: string;
  moduleSlug: string | null;
  whatWorked: string | null;
  whatToChange: string | null;
  studentObservations: string | null;
  createdAt: string;
  pdSession?: { topic: string; date: string };
}

interface FacultyPost {
  id: string;
  authorId: string;
  author: { id: string; name: string };
  moduleSlug: string | null;
  title: string | null;
  content: string;
  isPinned: boolean;
  parentId: string | null;
  createdAt: string;
  replies: FacultyPost[];
}

interface PDHours {
  totalMinutes: number;
  totalHours: number;
  sessionCount: number;
}

const MODULE_LABELS: Record<string, string> = {
  "k2-stem-rhyme-ride": "Module 1 — Rhyme & Ride",
  "k2-stem-bounce-buds": "Module 2 — Bounce & Buds",
  "k2-stem-gotcha-gears": "Module 3 — Gotcha Gears",
};

// ── Component ────────────────────────────────────────────────────────────

const TeacherPDHub: React.FC = () => {
  const api = useApi();
  const [activeTab, setActiveTab] = useState<"sessions" | "reflections" | "resources" | "board">(
    "sessions",
  );
  const [sessions, setSessions] = useState<PDSession[]>([]);
  const [reflections, setReflections] = useState<PDReflection[]>([]);
  const [posts, setPosts] = useState<FacultyPost[]>([]);
  const [pdHours, setPdHours] = useState<PDHours | null>(null);
  const [loading, setLoading] = useState(true);

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: "",
    durationMinutes: "90",
    topic: "",
    facilitator: "",
    notes: "",
    actionItems: "",
    relatedModuleSlugs: [] as string[],
  });

  // Reflection form
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [reflectionForm, setReflectionForm] = useState({
    pdSessionId: "",
    moduleSlug: "",
    whatWorked: "",
    whatToChange: "",
    studentObservations: "",
  });

  // Board form
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Expanded sessions
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, reflectionsData, hoursData] = await Promise.all([
        api.get("/teacher/pd-sessions?includeTemplates=true"),
        api.get("/teacher/pd-reflections"),
        api.get("/teacher/pd-sessions/hours"),
      ]);
      setSessions(sessionsData);
      setReflections(reflectionsData);
      setPdHours(hoursData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.get("/teacher/faculty-board");
      setPosts(data);
    } catch {
      // silent
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
    loadPosts();
  }, [loadData, loadPosts]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/teacher/pd-sessions", {
        date: sessionForm.date,
        durationMinutes: parseInt(sessionForm.durationMinutes),
        topic: sessionForm.topic,
        facilitator: sessionForm.facilitator || null,
        notes: sessionForm.notes || null,
        actionItems: sessionForm.actionItems
          ? sessionForm.actionItems.split("\n").filter(Boolean)
          : null,
        relatedModuleSlugs:
          sessionForm.relatedModuleSlugs.length > 0
            ? sessionForm.relatedModuleSlugs
            : null,
      });
      setShowSessionForm(false);
      setSessionForm({
        date: "",
        durationMinutes: "90",
        topic: "",
        facilitator: "",
        notes: "",
        actionItems: "",
        relatedModuleSlugs: [],
      });
      loadData();
    } catch {
      // handled by api hook
    }
  };

  const handleCreateReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/teacher/pd-reflections", {
        pdSessionId: reflectionForm.pdSessionId,
        moduleSlug: reflectionForm.moduleSlug || null,
        whatWorked: reflectionForm.whatWorked || null,
        whatToChange: reflectionForm.whatToChange || null,
        studentObservations: reflectionForm.studentObservations || null,
      });
      setShowReflectionForm(false);
      setReflectionForm({
        pdSessionId: "",
        moduleSlug: "",
        whatWorked: "",
        whatToChange: "",
        studentObservations: "",
      });
      loadData();
    } catch {
      // handled by api hook
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    try {
      await api.post("/teacher/faculty-board", {
        title: newPostTitle || null,
        content: newPostContent,
      });
      setNewPostTitle("");
      setNewPostContent("");
      loadPosts();
    } catch {
      // handled by api hook
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;
    try {
      await api.post(`/teacher/faculty-board/${postId}/reply`, {
        content: replyContent,
      });
      setReplyTo(null);
      setReplyContent("");
      loadPosts();
    } catch {
      // handled by api hook
    }
  };

  const mySessions = sessions.filter((s) => !s.isTemplate);
  const templates = sessions.filter((s) => s.isTemplate);

  const tabs = [
    { key: "sessions" as const, label: "My PD Sessions", icon: CalendarDays },
    { key: "reflections" as const, label: "Reflections", icon: Pencil },
    { key: "resources" as const, label: "PD Resources", icon: FileText },
    { key: "board" as const, label: "Faculty Board", icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading PD Hub...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-600" /> Professional Development Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your PD sessions, write reflections, and collaborate with fellow educators
        </p>
      </div>

      {/* PD Hours Summary */}
      {pdHours && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{pdHours.totalHours}</div>
            <div className="text-xs text-gray-500">PD Hours Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <CalendarDays className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{pdHours.sessionCount}</div>
            <div className="text-xs text-gray-500">Sessions Attended</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <Pencil className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{reflections.length}</div>
            <div className="text-xs text-gray-500">Reflections Written</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
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

      {/* ── Sessions Tab ── */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My PD Sessions</h2>
            <button
              onClick={() => setShowSessionForm(!showSessionForm)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log PD Session
            </button>
          </div>

          {showSessionForm && (
            <form onSubmit={handleCreateSession} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Log a New PD Session</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                  <input
                    type="number"
                    required
                    min="15"
                    max="480"
                    value={sessionForm.durationMinutes}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, durationMinutes: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic *</label>
                <input
                  type="text"
                  required
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  placeholder="e.g., Introduction to BrightBoost"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facilitator</label>
                <input
                  type="text"
                  value={sessionForm.facilitator}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, facilitator: e.target.value })
                  }
                  placeholder="Who facilitated the session?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  placeholder="Key takeaways, observations, ideas..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Items (one per line)
                </label>
                <textarea
                  rows={3}
                  value={sessionForm.actionItems}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, actionItems: e.target.value })
                  }
                  placeholder="Create a class on BrightBoost&#10;Preview Module 1&#10;Share join code with students"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Modules
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MODULE_LABELS).map(([slug, label]) => (
                    <label
                      key={slug}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs cursor-pointer border transition-colors ${
                        sessionForm.relatedModuleSlugs.includes(slug)
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={sessionForm.relatedModuleSlugs.includes(slug)}
                        onChange={() => {
                          const updated = sessionForm.relatedModuleSlugs.includes(slug)
                            ? sessionForm.relatedModuleSlugs.filter((s) => s !== slug)
                            : [...sessionForm.relatedModuleSlugs, slug];
                          setSessionForm({ ...sessionForm, relatedModuleSlugs: updated });
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowSessionForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {mySessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No PD sessions logged yet. Click "Log PD Session" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedSession(expandedSession === session.id ? null : session.id)
                    }
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{session.topic}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(session.date).toLocaleDateString()} &middot;{" "}
                        {session.durationMinutes} min
                        {session.facilitator && ` &middot; ${session.facilitator}`}
                      </p>
                    </div>
                    {expandedSession === session.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {expandedSession === session.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {session.notes && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-0.5">{session.notes}</p>
                        </div>
                      )}
                      {session.actionItems && (session.actionItems as string[]).length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Action Items:</span>
                          <ul className="mt-1 space-y-0.5">
                            {(session.actionItems as string[]).map((item, i) => (
                              <li key={i} className="text-sm text-gray-700">
                                &#8226; {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {session.relatedModuleSlugs &&
                        (session.relatedModuleSlugs as string[]).length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              Related Modules:
                            </span>
                            <div className="flex gap-1 mt-1">
                              {(session.relatedModuleSlugs as string[]).map((slug) => (
                                <span
                                  key={slug}
                                  className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                                >
                                  {MODULE_LABELS[slug] || slug}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reflections Tab ── */}
      {activeTab === "reflections" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Reflections</h2>
            <button
              onClick={() => setShowReflectionForm(!showReflectionForm)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Reflection
            </button>
          </div>

          {showReflectionForm && (
            <form
              onSubmit={handleCreateReflection}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
            >
              <h3 className="font-semibold text-gray-900">Write a Reflection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PD Session *
                  </label>
                  <select
                    required
                    value={reflectionForm.pdSessionId}
                    onChange={(e) =>
                      setReflectionForm({ ...reflectionForm, pdSessionId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a session...</option>
                    {mySessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.topic} ({new Date(s.date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Module
                  </label>
                  <select
                    value={reflectionForm.moduleSlug}
                    onChange={(e) =>
                      setReflectionForm({ ...reflectionForm, moduleSlug: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {Object.entries(MODULE_LABELS).map(([slug, label]) => (
                      <option key={slug} value={slug}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What worked well?
                </label>
                <textarea
                  rows={2}
                  value={reflectionForm.whatWorked}
                  onChange={(e) =>
                    setReflectionForm({ ...reflectionForm, whatWorked: e.target.value })
                  }
                  placeholder="What strategies or activities were most effective?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What would you change?
                </label>
                <textarea
                  rows={2}
                  value={reflectionForm.whatToChange}
                  onChange={(e) =>
                    setReflectionForm({ ...reflectionForm, whatToChange: e.target.value })
                  }
                  placeholder="What would you do differently next time?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student observations
                </label>
                <textarea
                  rows={2}
                  value={reflectionForm.studentObservations}
                  onChange={(e) =>
                    setReflectionForm({
                      ...reflectionForm,
                      studentObservations: e.target.value,
                    })
                  }
                  placeholder="How did students react? What did you notice?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Reflection
                </button>
                <button
                  type="button"
                  onClick={() => setShowReflectionForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {reflections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Pencil className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No reflections yet. Write one after using a module with students.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reflections.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {r.pdSession?.topic || "Reflection"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                        {r.moduleSlug && ` \u00b7 ${MODULE_LABELS[r.moduleSlug] || r.moduleSlug}`}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    {r.whatWorked && (
                      <div>
                        <span className="font-medium text-green-700">What worked:</span>{" "}
                        {r.whatWorked}
                      </div>
                    )}
                    {r.whatToChange && (
                      <div>
                        <span className="font-medium text-amber-700">What to change:</span>{" "}
                        {r.whatToChange}
                      </div>
                    )}
                    {r.studentObservations && (
                      <div>
                        <span className="font-medium text-blue-700">Student observations:</span>{" "}
                        {r.studentObservations}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PD Resources Tab ── */}
      {activeTab === "resources" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">PD Session Templates</h2>
          <p className="text-sm text-gray-500">
            Pre-designed PD session guides for the BrightBoost pilot. Use these as a starting point
            for your professional development.
          </p>
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No PD templates available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t.topic}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.durationMinutes} min
                        {t.facilitator && ` \u00b7 ${t.facilitator}`}
                      </p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      Template
                    </span>
                  </div>
                  {t.notes && (
                    <p className="text-sm text-gray-600 mt-2">{t.notes}</p>
                  )}
                  {t.actionItems && (t.actionItems as string[]).length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-medium text-gray-500">Follow-up Checklist:</span>
                      <ul className="mt-1 space-y-0.5">
                        {(t.actionItems as string[]).map((item, i) => (
                          <li key={i} className="text-sm text-gray-700">
                            &#9744; {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.relatedModuleSlugs && (t.relatedModuleSlugs as string[]).length > 0 && (
                    <div className="flex gap-1 mt-3">
                      {(t.relatedModuleSlugs as string[]).map((slug) => (
                        <span
                          key={slug}
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                        >
                          {MODULE_LABELS[slug] || slug}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Faculty Board Tab ── */}
      {activeTab === "board" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Faculty Discussion Board</h2>
          <p className="text-sm text-gray-500">
            Share tips, ask questions, and collaborate with other pilot teachers.
          </p>

          {/* New Post Form */}
          <form
            onSubmit={handleCreatePost}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <input
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full border-0 border-b border-gray-200 px-0 py-2 text-sm font-medium focus:ring-0 focus:border-blue-500 placeholder-gray-400"
            />
            <textarea
              rows={2}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share a tip, question, or observation..."
              className="w-full border-0 px-0 py-2 text-sm focus:ring-0 placeholder-gray-400 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3" /> Post
              </button>
            </div>
          </form>

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No posts yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                      {post.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {post.author.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        {post.isPinned && (
                          <Pin className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      {post.title && (
                        <h4 className="text-sm font-medium text-gray-800 mt-0.5">{post.title}</h4>
                      )}
                      <p className="text-sm text-gray-700 mt-1">{post.content}</p>

                      {/* Replies */}
                      {post.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-2">
                          {post.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                                {reply.author.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-700">
                                  {reply.author.name}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                                <p className="text-sm text-gray-600">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      {replyTo === post.id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-grow border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleReply(post.id)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => {
                              setReplyTo(null);
                              setReplyContent("");
                            }}
                            className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyTo(post.id)}
                          className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherPDHub;
