/**
 * Pathways Home — student landing page.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { Shield, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

export default function PathwaysHome() {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pathways/student/home", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then(setHomeData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const milestones = homeData?.milestones ?? [];
  const completed = milestones.filter((m: any) => m.status === "completed").length;
  const inProgress = milestones.filter((m: any) => m.status === "in_progress").length;
  const cohort = homeData?.enrollments?.[0];
  const band = homeData?.user?.ageBand ?? "explorer";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-800 rounded-2xl" />
        <div className="h-48 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 p-8">
        <div className="relative z-10">
          <p className="text-sm text-indigo-200 font-medium uppercase tracking-wider mb-2">
            {band === "launch" ? "Launch Band" : "Explorer Band"}
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">
            {band === "launch" ? "Build Your Launch Plan" : "Your Pathway Starts Here"}
          </h1>
          {cohort && (
            <p className="text-indigo-100 text-sm">
              {cohort.cohortName} {cohort.sitePartner && `• ${cohort.sitePartner}`}
            </p>
          )}
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
          <Shield className="w-full h-full" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Completed" value={completed} />
        <StatCard label="In Progress" value={inProgress} />
        <StatCard label="Streak" value={homeData?.user?.streak ?? 0} />
      </div>

      {/* Active Tracks */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-slate-200">Your Tracks</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PATHWAY_TRACKS.filter((t) => t.status === "active").map((track) => {
            const trackMilestones = milestones.filter((m: any) => m.trackSlug === track.slug);
            const trackCompleted = trackMilestones.filter((m: any) => m.status === "completed").length;
            const pct = track.modules.length > 0 ? Math.round((trackCompleted / track.modules.length) * 100) : 0;

            return (
              <button
                key={track.slug}
                onClick={() => navigate(`/pathways/tracks/${track.slug}`)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: track.color + "20" }}>
                  <Shield className="w-6 h-6" style={{ color: track.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 group-hover:text-white">{track.name}</p>
                  <p className="text-xs text-slate-400 truncate">{track.tagline}</p>
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: track.color }} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{trackCompleted}/{track.modules.length} modules • {pct}%</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Recent Activity</h2>
          <div className="space-y-2">
            {milestones.slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                {m.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{m.moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                  <p className="text-[10px] text-slate-500">{m.trackSlug} • {m.status}{m.score ? ` • ${m.score}%` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
