/**
 * Facilitator Dashboard — cohort management for Pathways facilitators.
 */
import { useEffect, useState } from "react";
import { Users, BarChart3, Clock, CheckCircle2 } from "lucide-react";

export default function FacilitatorDashboard() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  useEffect(() => {
    fetch("/api/pathways/cohorts", { headers })
      .then((r) => r.json())
      .then((data) => {
        setCohorts(data);
        if (data.length > 0) loadCohort(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadCohort = async (id: string) => {
    const [cohortRes, progressRes] = await Promise.all([
      fetch(`/api/pathways/cohorts/${id}`, { headers }).then((r) => r.json()),
      fetch(`/api/pathways/facilitator/cohort/${id}/progress`, { headers }).then((r) => r.json()),
    ]);
    setSelectedCohort(cohortRes);
    setProgress(progressRes);
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading dashboard...</div>;
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <Users className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-200">No Cohorts Yet</h2>
        <p className="text-slate-400 text-sm">Create a cohort to get started.</p>
      </div>
    );
  }

  const learners = progress?.learners ?? [];
  const totalCompleted = learners.reduce((s: number, l: any) => s + l.completedCount, 0);
  const activeThisWeek = learners.filter((l: any) => {
    if (!l.lastActive) return false;
    const week = Date.now() - 7 * 86400000;
    return new Date(l.lastActive).getTime() > week;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Facilitator Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your cohorts and track learner progress.</p>
        </div>
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
      </div>

      {/* Cohort Header */}
      {selectedCohort && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">{selectedCohort.name}</h2>
              <p className="text-xs text-slate-400">
                Join code: <span className="font-mono text-indigo-400">{selectedCohort.joinCode}</span>
                {selectedCohort.sitePartner && ` • ${selectedCohort.sitePartner}`}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 capitalize font-medium">
              {selectedCohort.band} band
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <MiniStat icon={<Users className="w-4 h-4" />} label="Enrolled" value={learners.length} />
            <MiniStat icon={<Clock className="w-4 h-4" />} label="Active This Week" value={activeThisWeek} />
            <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label="Modules Done" value={totalCompleted} />
            <MiniStat icon={<BarChart3 className="w-4 h-4" />} label="Avg Completion" value={learners.length > 0 ? `${Math.round(totalCompleted / learners.length)}` : "0"} />
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">Learner Roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-700/50 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-200 font-medium">{l.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
                      {l.ageBand ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{l.completedCount} modules</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {l.lastActive ? new Date(l.lastActive).toLocaleDateString() : "Not yet"}
                  </td>
                </tr>
              ))}
              {learners.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No learners enrolled yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-900/50 text-center">
      <div className="flex justify-center text-slate-400 mb-1">{icon}</div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
