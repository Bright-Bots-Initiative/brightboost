/**
 * Track Detail — module list as a vertical timeline with status indicators.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTrackBySlug } from "@/constants/pathwayTracks";
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, ExternalLink, BookOpen, Wrench, FolderOpen, Lock } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  lesson: <BookOpen className="w-4 h-4" />,
  activity: <Wrench className="w-4 h-4" />,
  project: <FolderOpen className="w-4 h-4" />,
  external: <ExternalLink className="w-4 h-4" />,
  assessment: <CheckCircle2 className="w-4 h-4" />,
};

export default function TrackDetail() {
  const { trackSlug } = useParams();
  const navigate = useNavigate();
  const track = getTrackBySlug(trackSlug ?? "");
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/pathways/student/milestones", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => setMilestones(data.filter((m: any) => m.trackSlug === trackSlug)))
      .catch(() => {});
  }, [trackSlug]);

  if (!track) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Track not found.</p>
        <button onClick={() => navigate("/pathways/tracks")} className="mt-4 text-indigo-400 text-sm">Back to Tracks</button>
      </div>
    );
  }

  const getStatus = (moduleSlug: string) => {
    const m = milestones.find((ms) => ms.moduleSlug === moduleSlug);
    return m?.status ?? "not_started";
  };

  const completedCount = track.modules.filter((m) => getStatus(m.slug) === "completed").length;
  const pct = Math.round((completedCount / track.modules.length) * 100);

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/pathways/tracks")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-4 h-4" /> All Tracks
      </button>

      {/* Track Hero */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: track.color + "20", color: track.color }}>
            <span className="text-3xl">{track.icon === "Shield" ? "🛡" : track.icon === "Rocket" ? "🚀" : "📦"}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-100">{track.name}</h1>
            <p className="text-sm text-slate-400 mt-1">{track.description}</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-xs">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: track.color }} />
              </div>
              <span className="text-xs text-slate-400">{completedCount}/{track.modules.length} completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Timeline */}
      <div className="space-y-3">
        {track.modules.map((mod, i) => {
          const status = getStatus(mod.slug);
          const isExternal = mod.type === "external";
          const isComingSoon = mod.status === "coming_soon";

          return (
            <div
              key={mod.slug}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                isComingSoon
                  ? "border-slate-800 bg-slate-900/50 opacity-50"
                  : status === "completed"
                    ? "border-emerald-800/30 bg-emerald-900/10"
                    : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer"
              }`}
              onClick={() => {
                if (isComingSoon) return;
                if (isExternal && mod.externalUrl) {
                  window.open(mod.externalUrl, "_blank");
                  // Mark as completed
                  fetch("/api/pathways/student/milestones", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: JSON.stringify({ trackSlug: track.slug, moduleSlug: mod.slug, status: "completed", score: 100 }),
                  }).then(() => setMilestones((prev) => [...prev, { moduleSlug: mod.slug, status: "completed", score: 100, trackSlug: track.slug }]));
                  return;
                }
                navigate(`/pathways/tracks/${track.slug}/${mod.slug}`);
              }}
            >
              {/* Step number / status */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                status === "completed" ? "bg-emerald-600 text-white" :
                status === "in_progress" ? "bg-indigo-600 text-white" :
                "bg-slate-700 text-slate-400"
              }`}>
                {status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{TYPE_ICONS[mod.type]}</span>
                  <h3 className="font-medium text-slate-200 text-sm">{mod.name}</h3>
                  {isExternal && <ExternalLink className="w-3 h-3 text-slate-500" />}
                  {isComingSoon && <Lock className="w-3 h-3 text-slate-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mod.duration}</span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-slate-700/50">{mod.type}</span>
                  {status === "completed" && <span className="text-emerald-400">Completed</span>}
                  {status === "in_progress" && <span className="text-indigo-400">In Progress</span>}
                </div>
              </div>

              {/* Action */}
              {!isComingSoon && status !== "completed" && (
                <PlayCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
