/**
 * Module Player — wrapper that loads and renders a Cyber Launch module.
 * Handles progress saving and completion callbacks.
 */
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTrackBySlug } from "@/constants/pathwayTracks";
import { ArrowLeft } from "lucide-react";

// Lazy-load the module components
const CyberLaunchModules = lazy(() => import("./modules/CyberLaunchModules"));

export default function ModulePlayer() {
  const { trackSlug, moduleSlug } = useParams();
  const navigate = useNavigate();
  const track = getTrackBySlug(trackSlug ?? "");
  const mod = track?.modules.find((m) => m.slug === moduleSlug);
  const [completed, setCompleted] = useState(false);

  // Mark as in_progress on mount
  useEffect(() => {
    if (trackSlug && moduleSlug) {
      fetch("/api/pathways/student/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ trackSlug, moduleSlug, status: "in_progress" }),
      }).catch(() => {});
    }
  }, [trackSlug, moduleSlug]);

  const handleComplete = useCallback(async (score: number) => {
    try {
      await fetch("/api/pathways/student/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ trackSlug, moduleSlug, status: "completed", score }),
      });
    } catch { /* ignore */ }
    setCompleted(true);
  }, [trackSlug, moduleSlug]);

  const handleBack = useCallback(() => {
    navigate(`/pathways/tracks/${trackSlug}`);
  }, [navigate, trackSlug]);

  if (!track || !mod) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Module not found.</p>
        <button onClick={() => navigate("/pathways/tracks")} className="mt-4 text-indigo-400 text-sm">Back to Tracks</button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-slate-100">Module Complete</h2>
        <p className="text-slate-400">{mod.name} — finished!</p>
        <button onClick={handleBack} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
          Back to Track
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-4 h-4" /> Back to {track.name}
      </button>

      <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading module...</div>}>
        <CyberLaunchModules moduleSlug={moduleSlug ?? ""} onComplete={handleComplete} onBack={handleBack} />
      </Suspense>
    </div>
  );
}
