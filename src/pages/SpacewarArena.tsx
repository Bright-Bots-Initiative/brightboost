// src/pages/SpacewarArena.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import UnityWebGL from "../components/unity/UnityWebGL";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AvatarData {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
}

type Difficulty = "easy" | "normal" | "hard";

// Detect touch device
const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
};

export default function SpacewarArena() {
  const [avatarConfig, setAvatarConfig] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [isTouch] = useState(isTouchDevice);
  const unityInstanceRef = useRef<any>(null);

  // Touch control state
  const [rotateLeft, setRotateLeft] = useState(false);
  const [rotateRight, setRotateRight] = useState(false);
  const [thrust, setThrust] = useState(false);
  const [fire, setFire] = useState(false);
  const hyperspaceTapRef = useRef(false);

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

  const handleInstanceReady = useCallback(
    (instance: any) => {
      unityInstanceRef.current = instance;
      // Set initial CPU mode and difficulty
      try {
        instance.SendMessage("WebBridge", "SetOpponentMode", "cpu");
        instance.SendMessage("WebBridge", "SetCpuDifficulty", difficulty);

        // Enable touch controls on touch devices
        if (isTouch) {
          instance.SendMessage("WebBridge", "EnableTouchControls", "true");
        }
      } catch (err) {
        console.warn("Failed to set initial config:", err);
      }
    },
    [difficulty, isTouch],
  );

  // Input pump for touch controls (30 fps)
  useEffect(() => {
    if (!isTouch || !unityInstanceRef.current) return;

    const interval = setInterval(() => {
      const instance = unityInstanceRef.current;
      if (!instance) return;

      // Calculate rotate: left = +1, right = -1
      const rotate = (rotateLeft ? 1 : 0) + (rotateRight ? -1 : 0);

      // Get hyperspace tap (consume it after sending)
      const hyperspace = hyperspaceTapRef.current;
      if (hyperspace) {
        hyperspaceTapRef.current = false;
      }

      try {
        instance.SendMessage(
          "WebBridge",
          "SetPlayer1Input",
          JSON.stringify({ rotate, thrust, fire, hyperspace }),
        );
      } catch (err) {
        // Silently ignore - instance may not be ready
      }
    }, 33); // ~30 fps

    return () => clearInterval(interval);
  }, [isTouch, rotateLeft, rotateRight, thrust, fire]);

  const handleHyperspaceTap = useCallback(() => {
    hyperspaceTapRef.current = true;
  }, []);

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
        unityInstanceRef.current.SendMessage(
          "WebBridge",
          "SetCpuDifficulty",
          newDifficulty,
        );
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
            onChange={(e) =>
              handleDifficultyChange(e.target.value as Difficulty)
            }
            className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>

          {/* How to Play button */}
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors">
                How to Play
              </button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-4">
                  How to Play
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-blue-400 font-semibold mb-1">
                    Objective
                  </h4>
                  <p className="text-slate-300">
                    First to 5 points wins the match!
                  </p>
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
                  <h4 className="text-green-400 font-semibold mb-1">
                    {isTouch ? "Mobile Controls" : "Controls"}
                  </h4>
                  {isTouch ? (
                    <div className="bg-slate-700 rounded p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-slate-400">◀ / ▶</span>
                        <span>Hold to rotate</span>
                        <span className="text-slate-400">THRUST</span>
                        <span>Hold to accelerate</span>
                        <span className="text-slate-400">FIRE</span>
                        <span>Hold to shoot</span>
                        <span className="text-slate-400">HYPER</span>
                        <span>Tap for hyperspace</span>
                      </div>
                      <p className="text-slate-400 mt-2 text-[10px]">
                        Touch controls appear at bottom of screen
                      </p>
                    </div>
                  ) : (
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
                  )}
                </div>

                <div>
                  <h4 className="text-yellow-400 font-semibold mb-1">Tips</h4>
                  <ul className="text-slate-300 list-disc list-inside">
                    <li>Use thrust sparingly - don't drift into the sun!</li>
                    <li>
                      Hyperspace teleports you randomly (15% explosion risk)
                    </li>
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
            </DialogContent>
          </Dialog>

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
      <div className="flex-1 w-full relative">
        <UnityWebGL
          basePath="/games/spacewar"
          config={avatarConfig ?? undefined}
          onInstanceReady={handleInstanceReady}
          onRestartRequest={handleRestart}
        />

        {/* Touch controls overlay (mobile only) */}
        {isTouch && (
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            {/* Left cluster: Rotate + Thrust */}
            <div className="absolute left-4 bottom-4 flex flex-col gap-2 pointer-events-auto">
              {/* Rotate buttons row */}
              <div className="flex gap-2">
                <button
                  className={`w-16 h-16 rounded-full text-2xl font-bold transition-colors select-none ${
                    rotateLeft
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700/80 text-slate-300"
                  }`}
                  style={{
                    touchAction: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setRotateLeft(true);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setRotateLeft(false);
                  }}
                  onPointerCancel={() => setRotateLeft(false)}
                >
                  ◀
                </button>
                <button
                  className={`w-16 h-16 rounded-full text-2xl font-bold transition-colors select-none ${
                    rotateRight
                      ? "bg-blue-500 text-white"
                      : "bg-slate-700/80 text-slate-300"
                  }`}
                  style={{
                    touchAction: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setRotateRight(true);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setRotateRight(false);
                  }}
                  onPointerCancel={() => setRotateRight(false)}
                >
                  ▶
                </button>
              </div>
              {/* Thrust button */}
              <button
                className={`w-full h-14 rounded-lg text-sm font-bold transition-colors select-none ${
                  thrust
                    ? "bg-orange-500 text-white"
                    : "bg-slate-700/80 text-slate-300"
                }`}
                style={{
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setThrust(true);
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  setThrust(false);
                }}
                onPointerCancel={() => setThrust(false)}
              >
                THRUST
              </button>
            </div>

            {/* Right cluster: Fire + Hyperspace */}
            <div className="absolute right-4 bottom-4 flex flex-col gap-2 pointer-events-auto">
              {/* Fire button */}
              <button
                className={`w-20 h-20 rounded-full text-sm font-bold transition-colors select-none ${
                  fire
                    ? "bg-red-500 text-white"
                    : "bg-slate-700/80 text-slate-300"
                }`}
                style={{
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setFire(true);
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  setFire(false);
                }}
                onPointerCancel={() => setFire(false)}
              >
                FIRE
              </button>
              {/* Hyperspace button (tap only) */}
              <button
                className="w-20 h-12 rounded-lg text-xs font-bold bg-purple-700/80 text-purple-200 active:bg-purple-500 active:text-white transition-colors select-none"
                style={{
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleHyperspaceTap();
                }}
              >
                HYPER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
