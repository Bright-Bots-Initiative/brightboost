// src/pages/SpacewarArena.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import UnityWebGL from "../components/unity/UnityWebGL";

interface AvatarData {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
}

type Difficulty = "easy" | "normal" | "hard";

export default function SpacewarArena() {
  const [avatarConfig, setAvatarConfig] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const unityInstanceRef = useRef<any>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const avatar = await api.getAvatar();
        if (avatar) {
          setAvatarConfig({
            archetype: avatar.archetype,
            level: avatar.level ?? 1,
            xp: avatar.xp ?? 0,
            avatarUrl: avatar.avatarUrl,
          });
        } else {
          // Fallback config if no avatar
          setAvatarConfig({
            archetype: "explorer",
            level: 1,
            xp: 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch avatar for Spacewar:", err);
        // Use default config on error
        setAvatarConfig({
          archetype: "explorer",
          level: 1,
          xp: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvatar();
  }, []);

  const handleInstanceReady = useCallback((instance: any) => {
    unityInstanceRef.current = instance;
    // Set initial CPU mode and difficulty
    try {
      instance.SendMessage("WebBridge", "SetOpponentMode", "cpu");
      instance.SendMessage("WebBridge", "SetCpuDifficulty", difficulty);
    } catch (err) {
      console.warn("Failed to set initial CPU config:", err);
    }
  }, [difficulty]);

  const handleRestart = useCallback(() => {
    if (unityInstanceRef.current) {
      try {
        unityInstanceRef.current.SendMessage("WebBridge", "RestartGame");
      } catch (err) {
        console.warn("Failed to restart game:", err);
      }
    }
  }, []);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    if (unityInstanceRef.current) {
      try {
        unityInstanceRef.current.SendMessage("WebBridge", "SetCpuDifficulty", newDifficulty);
      } catch (err) {
        console.warn("Failed to set difficulty:", err);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600">Preparing arena...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] w-full">
      {/* Control bar */}
      <div className="flex items-center justify-between bg-slate-800 rounded-t-xl px-4 py-2">
        <h2 className="text-white font-semibold text-lg">Spacewar (vs CPU)</h2>
        <div className="flex items-center gap-3">
          {/* Difficulty selector */}
          <select
            value={difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
            className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>

          {/* How to Play button */}
          <button
            onClick={() => setShowHelp(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            How to Play
          </button>

          {/* Restart button */}
          <button
            onClick={handleRestart}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            Restart
          </button>
        </div>
      </div>

      {/* Game container */}
      <div className="flex-1 w-full">
        <UnityWebGL
          basePath="/games/spacewar"
          config={avatarConfig ?? undefined}
          onInstanceReady={handleInstanceReady}
          onRestartRequest={handleRestart}
        />
      </div>

      {/* How to Play Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-slate-800 rounded-xl p-6 max-w-lg mx-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">How to Play</h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-blue-400 font-semibold mb-1">Objective</h4>
                <p className="text-slate-300">First to 5 points wins the match!</p>
              </div>

              <div>
                <h4 className="text-blue-400 font-semibold mb-1">Scoring</h4>
                <ul className="text-slate-300 list-disc list-inside">
                  <li>Destroy your opponent with missiles</li>
                  <li>Your opponent falls into the sun</li>
                </ul>
              </div>

              <div>
                <h4 className="text-red-400 font-semibold mb-1">Hazards</h4>
                <ul className="text-slate-300 list-disc list-inside">
                  <li>The Sun kills on contact - avoid it!</li>
                  <li>Gravity constantly pulls you toward the sun</li>
                </ul>
              </div>

              <div>
                <h4 className="text-green-400 font-semibold mb-1">Controls</h4>
                <div className="bg-slate-700 rounded p-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-slate-400">A / D</span>
                    <span>Rotate left / right</span>
                    <span className="text-slate-400">W</span>
                    <span>Thrust forward</span>
                    <span className="text-slate-400">Space</span>
                    <span>Fire missile</span>
                    <span className="text-slate-400">S</span>
                    <span>Hyperspace (risky!)</span>
                    <span className="text-slate-400">R</span>
                    <span>Restart match</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-yellow-400 font-semibold mb-1">Tips</h4>
                <ul className="text-slate-300 list-disc list-inside">
                  <li>Use thrust sparingly - don't drift into the sun!</li>
                  <li>Hyperspace teleports you randomly (15% explosion risk)</li>
                  <li>Lead your shots - missiles travel in straight lines</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
