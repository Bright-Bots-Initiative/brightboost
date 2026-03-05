// src/pages/SpacewarArena.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import UnityWebGL from "../components/unity/UnityWebGL";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STEM_SET_1_IDS } from "../constants/stemSets";

interface AvatarData {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
  stem1Set1Completed?: string[];
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

const LOADING_KEYS = [
  "loading.warmingRockets",
  "loading.feedingRobots",
  "loading.polishingStars",
  "loading.countdown",
  "loading.checkingFuel",
  "loading.askingAliens",
];

function useFunLoadingMessage() {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_KEYS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return t(LOADING_KEYS[msgIndex]);
}

export default function SpacewarArena() {
  const { t } = useTranslation();
  const [avatarConfig, setAvatarConfig] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const funMessage = useFunLoadingMessage();
  const [showHelp, setShowHelp] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => (localStorage.getItem("bb_spacewar_difficulty") as Difficulty) || "easy",
  );
  const [isTouch] = useState(isTouchDevice);
  const unityInstanceRef = useRef<any>(null);

  // Gesture control state (mobile)
  const [rotate, setRotate] = useState(0); // -1..1 (negative = right, positive = left per WebBridge doc)
  const [thrust, setThrust] = useState(false);
  const fireTapRef = useRef(false);
  const hyperspaceTapRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const lastTapTimeRef = useRef<number>(0);

  // Gesture sensitivity constants
  const ROTATE_SENS_PX = 80; // smaller = more sensitive
  const THRUST_SENS_PX = 35; // drag up beyond this = thrust
  const TAP_MAX_MOVE_PX = 12;
  const DOUBLE_TAP_MS = 260;

  useEffect(() => {
    const fetchAvatarAndProgress = async () => {
      try {
        // Fetch avatar and progress in parallel
        const [avatar, progressList] = await Promise.all([
          api.getAvatar(),
          api.getProgress().catch(() => []), // Gracefully handle missing progress
        ]);

        // Compute completed STEM-1 Set 1 games
        const completedSet1 = progressList
          .filter((p: { status: string }) => p.status === "COMPLETED")
          .map((p: { activityId: string }) => p.activityId)
          .filter((id: string) =>
            STEM_SET_1_IDS.includes(id as (typeof STEM_SET_1_IDS)[number]),
          );

        if (avatar) {
          // Use "explorer" for GENERAL stage avatars (no specialty selected)
          const archetypeForUnity =
            avatar.stage === "GENERAL" || !avatar.archetype
              ? "explorer"
              : avatar.archetype;

          setAvatarConfig({
            archetype: archetypeForUnity,
            level: avatar.level ?? 1,
            xp: avatar.xp ?? 0,
            avatarUrl: avatar.avatarUrl,
            stem1Set1Completed: completedSet1,
          });
        } else {
          // Fallback config if no avatar
          setAvatarConfig({
            archetype: "explorer",
            level: 1,
            xp: 0,
            stem1Set1Completed: completedSet1,
          });
        }
      } catch (err) {
        console.error("Failed to fetch avatar for Spacewar:", err);
        // Use default config on error
        setAvatarConfig({
          archetype: "explorer",
          level: 1,
          xp: 0,
          stem1Set1Completed: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvatarAndProgress();
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

      // Consume tap pulses (one-shot)
      const fire = fireTapRef.current;
      if (fire) fireTapRef.current = false;

      const hyperspace = hyperspaceTapRef.current;
      if (hyperspace) hyperspaceTapRef.current = false;

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
  }, [isTouch, rotate, thrust]);

  // Gesture handlers for mobile
  const handleGesturePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    startPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handleGesturePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current || !startPosRef.current)
        return;

      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;

      // Rotate: left swipe => positive, right swipe => negative (per WebBridge doc)
      setRotate(Math.max(-1, Math.min(1, -dx / ROTATE_SENS_PX)));
      // Thrust: drag up (negative dy) beyond threshold
      setThrust(dy < -THRUST_SENS_PX);
    },
    [ROTATE_SENS_PX, THRUST_SENS_PX],
  );

  const handleGesturePointerEnd = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current || !startPosRef.current)
        return;

      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      const movedDist = Math.sqrt(dx * dx + dy * dy);

      // Check if it was a tap (minimal movement)
      if (movedDist < TAP_MAX_MOVE_PX) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < DOUBLE_TAP_MS) {
          // Double-tap = hyperspace
          hyperspaceTapRef.current = true;
          lastTapTimeRef.current = 0;
        } else {
          // Single tap = fire
          fireTapRef.current = true;
          lastTapTimeRef.current = now;
        }
      }

      // Reset state
      setRotate(0);
      setThrust(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      activePointerIdRef.current = null;
      startPosRef.current = null;
    },
    [TAP_MAX_MOVE_PX, DOUBLE_TAP_MS],
  );

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
    localStorage.setItem("bb_spacewar_difficulty", newDifficulty);
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
        <div className="text-5xl mb-4 animate-bounce">🚀</div>
        <p className="text-lg font-semibold text-slate-700 transition-all duration-300">{funMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] w-full">
      {/* Control bar */}
      <div className="flex items-center justify-between bg-slate-800 rounded-t-xl px-4 py-2">
        <h2 className="text-white font-semibold text-lg">{t("spacewar.title")}</h2>
        <div className="flex items-center gap-3">
          {/* Difficulty selector — kid-friendly buttons */}
          <div className="flex gap-1" role="radiogroup" aria-label={t("spacewar.controls")}>
            {([
              { value: "easy" as Difficulty, emoji: "🐣", label: t("spacewar.easy") },
              { value: "normal" as Difficulty, emoji: "🎮", label: t("spacewar.medium") },
              { value: "hard" as Difficulty, emoji: "🔥", label: t("spacewar.hard") },
            ]).map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={difficulty === opt.value}
                onClick={() => handleDifficultyChange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-sm font-medium transition-all ${
                  difficulty === opt.value
                    ? "bg-blue-500 text-white shadow-md scale-105"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>

          {/* How to Play button */}
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                {t("spacewar.howToPlay")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-4">
                  {t("spacewar.howToPlay")}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-blue-400 font-semibold mb-1">
                    {t("spacewar.objective")}
                  </h4>
                  <p className="text-slate-300">
                    {t("spacewar.objectiveDesc")}
                  </p>
                </div>

                <div>
                  <h4 className="text-blue-400 font-semibold mb-1">{t("spacewar.scoring")}</h4>
                  <ul className="text-slate-300 list-disc list-inside">
                    <li>{t("spacewar.scoringMissile")}</li>
                    <li>{t("spacewar.scoringSun")}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-red-400 font-semibold mb-1">{t("spacewar.hazards")}</h4>
                  <ul className="text-slate-300 list-disc list-inside">
                    <li>{t("spacewar.hazardSun")}</li>
                    <li>{t("spacewar.hazardGravity")}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-green-400 font-semibold mb-1">
                    {isTouch ? t("spacewar.mobileControls") : t("spacewar.controls")}
                  </h4>
                  {isTouch ? (
                    <div className="bg-slate-700 rounded p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-slate-400">{"◀ / ▶"}</span>
                        <span>{t("spacewar.rotateLabel")}</span>
                        <span className="text-slate-400">THRUST</span>
                        <span>{t("spacewar.thrustLabel")}</span>
                        <span className="text-slate-400">FIRE</span>
                        <span>{t("spacewar.fireLabel")}</span>
                        <span className="text-slate-400">HYPER</span>
                        <span>{t("spacewar.hyperspaceLabel")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-700 rounded p-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-slate-400">A / D</span>
                        <span>{t("spacewar.rotateLabel")}</span>
                        <span className="text-slate-400">W</span>
                        <span>{t("spacewar.thrustLabel")}</span>
                        <span className="text-slate-400">Space</span>
                        <span>{t("spacewar.fireLabel")}</span>
                        <span className="text-slate-400">S</span>
                        <span>{t("spacewar.hyperspaceLabel")}</span>
                        <span className="text-slate-400">R</span>
                        <span>{t("spacewar.restartLabel")}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-yellow-400 font-semibold mb-1">{t("spacewar.tips")}</h4>
                  <ul className="text-slate-300 list-disc list-inside">
                    <li>{t("spacewar.tipSpeed")}</li>
                    <li>{t("spacewar.tipHyperspace")}</li>
                    <li>{t("spacewar.tipAim")}</li>
                    <li>{t("spacewar.tipDifficulty")}</li>
                  </ul>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full"
              >
                {t("spacewar.gotIt")}
              </Button>
            </DialogContent>
          </Dialog>

          {/* Restart button */}
          <Button
            onClick={handleRestart}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {t("spacewar.restart")}
          </Button>
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

        {/* Gesture control layer (mobile only) */}
        {isTouch && (
          <>
            {/* Full-screen gesture capture */}
            <div
              className="absolute inset-0 z-30"
              style={{
                touchAction: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              onPointerDown={handleGesturePointerDown}
              onPointerMove={handleGesturePointerMove}
              onPointerUp={handleGesturePointerEnd}
              onPointerCancel={handleGesturePointerEnd}
            />
            {/* Hint text at bottom */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-20">
              <p className="text-white/70 text-xs bg-black/40 px-3 py-1 rounded-full select-none">
                {t("spacewar.gestureHint")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
