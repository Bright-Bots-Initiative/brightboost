/**
 * Pathways Profile — learner profile + portfolio.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Clock, Star } from "lucide-react";

export default function PathwaysProfile() {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/pathways/student/milestones", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setMilestones(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const completed = milestones.filter((m) => m.status === "completed");
  const inProgress = milestones.filter((m) => m.status === "in_progress");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center text-2xl">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{user?.name ?? "Learner"}</h1>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
          <div className="flex justify-center text-emerald-400 mb-1"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="text-xl font-bold text-white">{completed.length}</p>
          <p className="text-xs text-slate-400">Completed</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
          <div className="flex justify-center text-indigo-400 mb-1"><Clock className="w-5 h-5" /></div>
          <p className="text-xl font-bold text-white">{inProgress.length}</p>
          <p className="text-xs text-slate-400">In Progress</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
          <div className="flex justify-center text-amber-400 mb-1"><Star className="w-5 h-5" /></div>
          <p className="text-xl font-bold text-white">{avgScore}%</p>
          <p className="text-xs text-slate-400">Avg Score</p>
        </div>
      </div>

      {/* Completed Modules */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Completed Modules</h2>
          <div className="space-y-2">
            {completed.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-900/10 border border-emerald-800/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                  <p className="text-[10px] text-slate-500">{m.trackSlug} {m.score ? `• Score: ${m.score}%` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
