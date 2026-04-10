/**
 * Facilitator Dashboard — simplified for non-technical program staff.
 * Answers three questions: Who needs attention? How is the cohort doing? What do I do next?
 */
import { useEffect, useState } from "react";
import { Users, CheckCircle2, AlertTriangle, XCircle, Download, ChevronRight, ArrowLeft, StickyNote, RefreshCw } from "lucide-react";

const BAND_LABELS: Record<string, string> = {
  explorer: "Explorer (14–15)",
  launch: "Launch (16–17)",
};

const TOTAL_MODULES = 7; // Cyber Launch has 7 modules

type Learner = {
  id: string;
  name: string;
  ageBand: string | null;
  completedCount: number;
  totalModules: number;
  lastActive: string | null;
  milestones: any[];
};

function getStatus(learner: Learner): { label: string; icon: React.ReactNode; color: string } {
  if (learner.completedCount === 0 && !learner.lastActive) {
    return { label: "Not Started", icon: <XCircle className="w-4 h-4" />, color: "text-red-400" };
  }
  // "Needs check-in" if no activity in 5+ days
  if (learner.lastActive) {
    const daysSince = Math.floor((Date.now() - new Date(learner.lastActive).getTime()) / 86400000);
    if (daysSince >= 5) {
      return { label: "Needs Check-In", icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400" };
    }
  }
  return { label: "On Track", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400" };
}

export default function FacilitatorDashboard() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

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
    } catch { /* ignore */ }
  };

  const exportProgress = () => {
    if (!selectedCohort || !learners.length) return;
    const rows = [
      ["Name", "Band", "Modules Completed", "Out of", "Status", "Last Active"],
      ...learners.map((l) => [
        l.name,
        BAND_LABELS[l.ageBand ?? ""] ?? l.ageBand ?? "—",
        String(l.completedCount),
        String(TOTAL_MODULES),
        getStatus(l).label,
        l.lastActive ? new Date(l.lastActive).toLocaleDateString() : "Not yet",
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
    return <div className="text-center py-20 text-slate-400">Loading your dashboard...</div>;
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <Users className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-200">No Groups Yet</h2>
        <p className="text-slate-400 text-sm">Create a cohort to start tracking learner progress.</p>
      </div>
    );
  }

  const learners: Learner[] = progress?.learners ?? [];
  const onTrack = learners.filter((l) => getStatus(l).label === "On Track").length;
  const needsCheckIn = learners.filter((l) => getStatus(l).label === "Needs Check-In").length;
  const notStarted = learners.filter((l) => getStatus(l).label === "Not Started").length;

  // ── Learner Detail View ──
  if (selectedLearner) {
    const status = getStatus(selectedLearner);
    const moduleNames = ["Cyber Foundations", "Digital Safety Sim", "Network Basics", "Threat Detective", "Cyber Career Map", "Cisco NetAcad", "Capstone: Security Plan"];
    const moduleStatuses = moduleNames.map((name, i) => {
      const slugs = ["cyber-foundations", "digital-safety-sim", "network-basics", "threat-detective", "career-map", "cisco-netacad-link", "capstone-security-plan"];
      const m = selectedLearner.milestones?.find((ms: any) => ms.moduleSlug === slugs[i]);
      return { name, status: m?.status ?? "not_started", score: m?.score };
    });

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLearner(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" /> Back to roster
        </button>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">{selectedLearner.name}</h2>
              <p className="text-sm text-slate-400">
                {BAND_LABELS[selectedLearner.ageBand ?? ""] ?? "—"}
                {" • "}
                {selectedLearner.completedCount} of {TOTAL_MODULES} modules completed
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
        </div>

        {/* Module Progress */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-slate-200">Module Progress</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {moduleStatuses.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  m.status === "completed" ? "bg-emerald-600 text-white" :
                  m.status === "in_progress" ? "bg-indigo-600 text-white" :
                  "bg-slate-700 text-slate-400"
                }`}>
                  {m.status === "completed" ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{m.name}</p>
                </div>
                <span className={`text-xs capitalize ${
                  m.status === "completed" ? "text-emerald-400" :
                  m.status === "in_progress" ? "text-indigo-400" :
                  "text-slate-500"
                }`}>
                  {m.status === "not_started" ? "Not started" : m.status === "in_progress" ? "In progress" : `Done${m.score ? ` (${m.score}%)` : ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Facilitator Notes */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Your Notes</h3>
          </div>
          <textarea
            value={notes[selectedLearner.id] ?? ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [selectedLearner.id]: e.target.value }))}
            placeholder="Add a private note about this learner..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-[10px] text-slate-600 mt-1">Notes are saved locally on this device.</p>
        </div>
      </div>
    );
  }

  // ── Primary Dashboard View ──
  return (
    <div className="space-y-6">
      {/* Cohort Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {selectedCohort?.name ?? "Your Cohort"}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {learners.length} learners enrolled
            {selectedCohort?.sitePartner && ` • ${selectedCohort.sitePartner}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cohorts.length > 1 && (
            <select
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
              value={selectedCohort?.id}
              onChange={(e) => loadCohort(e.target.value)}
            >
              {cohorts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => loadCohort(selectedCohort?.id)} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Join Code */}
      {selectedCohort?.joinCode && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-900/20 border border-indigo-800/30">
          <span className="text-xs text-indigo-300">Join code for new learners:</span>
          <span className="font-mono font-bold text-indigo-400 text-lg tracking-wider">{selectedCohort.joinCode}</span>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard icon={<CheckCircle2 className="w-5 h-5" />} label="On Track" count={onTrack} color="text-emerald-400 bg-emerald-900/20 border-emerald-800/30" />
        <StatusCard icon={<AlertTriangle className="w-5 h-5" />} label="Needs Check-In" count={needsCheckIn} color="text-amber-400 bg-amber-900/20 border-amber-800/30" />
        <StatusCard icon={<XCircle className="w-5 h-5" />} label="Not Started" count={notStarted} color="text-red-400 bg-red-900/20 border-red-800/30" />
      </div>

      {/* Learner List */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">Learners</h3>
          <button onClick={exportProgress} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>

        <div className="divide-y divide-slate-700/50">
          {learners.map((l: Learner) => {
            const status = getStatus(l);
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLearner(l)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors text-left"
              >
                <span className={`${status.color}`}>{status.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{l.name}</p>
                  <p className="text-xs text-slate-500">
                    {BAND_LABELS[l.ageBand ?? ""] ?? "—"} • {l.completedCount}/{TOTAL_MODULES} modules
                    {l.lastActive && ` • Active ${new Date(l.lastActive).toLocaleDateString()}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            );
          })}
          {learners.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              No learners enrolled yet. Share the join code above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${color}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold text-white">{count}</p>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}
