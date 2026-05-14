/**
 * Facilitator Dashboard — simplified for non-technical program staff.
 * Answers three questions: Who needs attention? How is the cohort doing? What do I do next?
 * i18n + light/dark.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ChevronRight,
  ArrowLeft,
  StickyNote,
  RefreshCw,
  BookOpen,
} from "lucide-react";

const NOTES_STORAGE_KEY = "brightboost.pathways.facilitator.notes";

function loadStoredNotes(): Record<string, string> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistNotes(notes: Record<string, string>): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* localStorage unavailable — notes will not persist across sessions */
  }
}

const TOTAL_MODULES = 7;

type Learner = {
  id: string;
  name: string;
  ageBand: string | null;
  completedCount: number;
  totalModules: number;
  lastActive: string | null;
  milestones: any[];
};

type StatusKey = "onTrack" | "needsCheckIn" | "notStarted";

function getStatusKey(learner: Learner): StatusKey {
  if (learner.completedCount === 0 && !learner.lastActive) return "notStarted";
  if (learner.lastActive) {
    const daysSince = Math.floor((Date.now() - new Date(learner.lastActive).getTime()) / 86400000);
    if (daysSince >= 5) return "needsCheckIn";
  }
  return "onTrack";
}

const STATUS_PRESENT = {
  onTrack: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-700 dark:text-emerald-400",
  },
  needsCheckIn: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-amber-700 dark:text-amber-400",
  },
  notStarted: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-700 dark:text-red-400",
  },
} as const;

export default function FacilitatorDashboard() {
  const { t } = useTranslation();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() => loadStoredNotes());

  const updateNote = (learnerId: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [learnerId]: value };
      persistNotes(next);
      return next;
    });
  };

  const headers = { Authorization: `Bearer ${localStorage.getItem("bb_access_token")}` };

  useEffect(() => {
    fetch("/api/pathways/cohorts", { headers })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setCohorts(arr);
        if (arr.length > 0) loadCohort(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCohort = async (id: string) => {
    try {
      const [cohortRes, progressRes] = await Promise.all([
        fetch(`/api/pathways/cohorts/${id}`, { headers }).then((r) => r.json()),
        fetch(`/api/pathways/facilitator/cohort/${id}/progress`, { headers }).then((r) => r.json()),
      ]);
      setSelectedCohort(cohortRes);
      setProgress(progressRes);
      setSelectedLearner(null);
    } catch {
      /* ignore */
    }
  };

  const bandLabel = (band: string | null) =>
    band === "explorer"
      ? t("pathways.facilitator.band.explorer")
      : band === "launch"
        ? t("pathways.facilitator.band.launch")
        : "—";

  const exportProgress = () => {
    if (!selectedCohort || !learners.length) return;
    const rows = [
      ["Name", "Band", "Modules Completed", "Out of", "Status", "Last Active"],
      ...learners.map((l) => [
        l.name,
        bandLabel(l.ageBand),
        String(l.completedCount),
        String(TOTAL_MODULES),
        t(`pathways.facilitator.status.${getStatusKey(l)}`),
        l.lastActive ? new Date(l.lastActive).toLocaleDateString() : "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCohort.name.replace(/[^a-zA-Z0-9]/g, "_")}_progress.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-600 dark:text-slate-400">
        {t("pathways.facilitator.loading")}
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">
          {t("pathways.facilitator.noGroups")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {t("pathways.facilitator.noGroupsDesc")}
        </p>
      </div>
    );
  }

  const learners: Learner[] = progress?.learners ?? [];
  const onTrack = learners.filter((l) => getStatusKey(l) === "onTrack").length;
  const needsCheckIn = learners.filter((l) => getStatusKey(l) === "needsCheckIn").length;
  const notStarted = learners.filter((l) => getStatusKey(l) === "notStarted").length;

  // ── Learner Detail View ──
  if (selectedLearner) {
    const statusKey = getStatusKey(selectedLearner);
    const statusPresent = STATUS_PRESENT[statusKey];
    const slugs = [
      "cyber-foundations",
      "digital-safety-sim",
      "network-basics",
      "threat-detective",
      "career-map",
      "cisco-netacad-link",
      "capstone-security-plan",
    ];
    const moduleStatuses = slugs.map((slug, i) => {
      const m = selectedLearner.milestones?.find((ms: any) => ms.moduleSlug === slug);
      return {
        name: t(`pathways.tracks.modules.${slug}.name`),
        status: m?.status ?? "not_started",
        score: m?.score,
        idx: i,
      };
    });

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedLearner(null)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> {t("pathways.facilitator.backToRoster")}
        </button>

        <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedLearner.name}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {bandLabel(selectedLearner.ageBand)}
                {" • "}
                {t("pathways.facilitator.modulesCompletedFmt", {
                  done: selectedLearner.completedCount,
                  total: TOTAL_MODULES,
                })}
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-medium ${statusPresent.color}`}>
              {statusPresent.icon} {t(`pathways.facilitator.status.${statusKey}`)}
            </span>
          </div>
        </div>

        {/* Module Progress */}
        <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-200">
              {t("pathways.facilitator.moduleProgress")}
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {moduleStatuses.map((m) => (
              <div key={m.idx} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    m.status === "completed"
                      ? "bg-emerald-600 text-white"
                      : m.status === "in_progress"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {m.status === "completed" ? "✓" : m.idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{m.name}</p>
                </div>
                <span
                  className={`text-xs ${
                    m.status === "completed"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : m.status === "in_progress"
                        ? "text-indigo-700 dark:text-indigo-400"
                        : "text-slate-500"
                  }`}
                >
                  {m.status === "not_started"
                    ? t("pathways.facilitator.module.notStarted")
                    : m.status === "in_progress"
                      ? t("pathways.facilitator.module.inProgress")
                      : m.score
                        ? t("pathways.facilitator.module.doneScoreFmt", { score: m.score })
                        : t("pathways.facilitator.module.done")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Facilitator Notes */}
        <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
              {t("pathways.facilitator.notes.title")}
            </h3>
          </div>
          <textarea
            value={notes[selectedLearner.id] ?? ""}
            onChange={(e) => updateNote(selectedLearner.id, e.target.value)}
            placeholder={t("pathways.facilitator.notes.placeholder")}
            className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1">
            {t("pathways.facilitator.notes.disclaimer")}
          </p>
        </div>
      </div>
    );
  }

  // ── Primary Dashboard View ──
  return (
    <div className="space-y-6">
      {/* Cohort Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {selectedCohort?.name ?? t("pathways.facilitator.yourCohort")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {t("pathways.facilitator.learnersEnrolled", { count: learners.length })}
            {selectedCohort?.sitePartner && ` • ${selectedCohort.sitePartner}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cohorts.length > 1 && (
            <select
              className="bg-white border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-2"
              value={selectedCohort?.id}
              onChange={(e) => loadCohort(e.target.value)}
            >
              {cohorts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <Link
            to="/pathways/facilitator/resources"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 text-sm transition-colors"
            title={t("pathways.facilitator.resourcesTitle")}
          >
            <BookOpen className="w-4 h-4" /> {t("pathways.layout.nav.resources")}
          </Link>
          <button
            onClick={() => loadCohort(selectedCohort?.id)}
            className="p-2 rounded-lg border bg-white border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title={t("pathways.common.refresh")}
            aria-label={t("pathways.common.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Join Code */}
      {selectedCohort?.joinCode && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/30">
          <span className="text-xs text-indigo-800 dark:text-indigo-300">
            {t("pathways.facilitator.joinCodeLabel")}
          </span>
          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-lg tracking-wider">
            {selectedCohort.joinCode}
          </span>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label={t("pathways.facilitator.status.onTrack")}
          count={onTrack}
          color="text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/30"
        />
        <StatusCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label={t("pathways.facilitator.status.needsCheckIn")}
          count={needsCheckIn}
          color="text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/30"
        />
        <StatusCard
          icon={<XCircle className="w-5 h-5" />}
          label={t("pathways.facilitator.status.notStarted")}
          count={notStarted}
          color="text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/30"
        />
      </div>

      {/* Learner List */}
      <div className="rounded-2xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.learnersHeading")}
          </h3>
          <button
            onClick={exportProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 text-xs transition-colors"
          >
            <Download className="w-3 h-3" /> {t("pathways.common.exportCsv")}
          </button>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {learners.map((l: Learner) => {
            const sk = getStatusKey(l);
            const sp = STATUS_PRESENT[sk];
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLearner(l)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <span className={sp.color}>{sp.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{l.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500">
                    {bandLabel(l.ageBand)} •{" "}
                    {t("pathways.facilitator.modulesCompletedFmt", {
                      done: l.completedCount,
                      total: TOTAL_MODULES,
                    })}
                    {l.lastActive && ` • ${new Date(l.lastActive).toLocaleDateString()}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              </button>
            );
          })}
          {learners.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              {t("pathways.facilitator.noLearners")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${color}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}
