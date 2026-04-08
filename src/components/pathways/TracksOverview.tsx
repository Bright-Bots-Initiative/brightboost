/**
 * All Tracks browse page — grid of 5 track cards.
 */
import { useNavigate } from "react-router-dom";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { Shield, Rocket, DollarSign, Cpu, Film, Lock, ArrowRight } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-8 h-8" />,
  Rocket: <Rocket className="w-8 h-8" />,
  DollarSign: <DollarSign className="w-8 h-8" />,
  Cpu: <Cpu className="w-8 h-8" />,
  Film: <Film className="w-8 h-8" />,
};

export default function TracksOverview() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">All Tracks</h1>
        <p className="text-sm text-slate-400 mt-1">Choose your pathway. Build real skills.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PATHWAY_TRACKS.map((track) => {
          const isActive = track.status === "active";
          return (
            <div
              key={track.slug}
              className={`rounded-2xl border p-6 transition-all flex flex-col ${
                isActive
                  ? "border-slate-700 bg-slate-800/80 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer"
                  : "border-slate-800 bg-slate-900/50 opacity-60"
              }`}
              onClick={isActive ? () => navigate(`/pathways/tracks/${track.slug}`) : undefined}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: track.color + "15", color: track.color }}>
                  {ICONS[track.icon] ?? <Shield className="w-8 h-8" />}
                </div>
                {!isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                    <Lock className="w-3 h-3" /> Coming Soon
                  </span>
                )}
              </div>

              <h3 className="font-bold text-lg text-slate-100 mb-1">{track.name}</h3>
              <p className="text-sm text-slate-400 mb-1">{track.tagline}</p>

              <div className="flex gap-1 mt-2 mb-4">
                {track.bands.map((b) => (
                  <span key={b} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 capitalize">
                    {b}
                  </span>
                ))}
              </div>

              <p className="text-xs text-slate-500 mb-4 flex-1">{track.description}</p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{track.modules.length} modules</span>
                {isActive && (
                  <span className="flex items-center gap-1 text-indigo-400 font-medium">
                    Start <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
