// src/components/activities/RhymeRideUnityActivity.tsx
import { useEffect, useRef, useCallback, useMemo } from "react";
import UnityWebGL from "../unity/UnityWebGL";
import { useTranslation } from "react-i18next";
import { LocalizedField, resolveText } from "@/utils/localizedContent";

interface RhymeRideRound {
  promptWord: LocalizedField;
  correctWord: LocalizedField;
  distractors: LocalizedField[];
  lane?: number;
}

interface RhymeRideConfig {
  gameKey: "rhyme_ride_unity";
  rounds: RhymeRideRound[];
  targetScore?: number;
  timeLimit?: number;
}

interface RhymeRideUnityActivityProps {
  config: RhymeRideConfig;
  onComplete: () => void;
}

export default function RhymeRideUnityActivity({
  config,
  onComplete,
}: RhymeRideUnityActivityProps) {
  const { t } = useTranslation();
  const unityInstanceRef = useRef<any>(null);

  // Generate stable sessionId for this activity instance
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  // Resolve localized fields before sending to Unity
  const resolvedRounds = useMemo(() => {
    return config.rounds.map((round) => ({
      promptWord: resolveText(t, round.promptWord),
      correctWord: resolveText(t, round.correctWord),
      distractors: round.distractors.map((d) => resolveText(t, d)),
      lane: round.lane,
    }));
  }, [config.rounds, t]);

  // Listen for completion event from Unity
  useEffect(() => {
    const handleComplete = (e: CustomEvent<{ sessionId: string; score: number; accuracy: number }>) => {
      // Validate sessionId to prevent stale/cross-tab events
      if (e.detail.sessionId !== sessionId) {
        console.warn("[RhymeRide] Ignoring completion event with mismatched sessionId");
        return;
      }
      onComplete();
    };

    window.addEventListener("unityRhymeRideComplete", handleComplete as EventListener);
    return () => {
      window.removeEventListener("unityRhymeRideComplete", handleComplete as EventListener);
    };
  }, [sessionId, onComplete]);

  const handleInstanceReady = useCallback(
    (instance: any) => {
      unityInstanceRef.current = instance;

      // Send game config to Unity
      try {
        const unityConfig = {
          sessionId,
          rounds: resolvedRounds,
          targetScore: config.targetScore ?? resolvedRounds.length,
          timeLimit: config.timeLimit ?? 0,
        };
        instance.SendMessage("WebBridge", "InitRhymeRide", JSON.stringify(unityConfig));
      } catch (err) {
        console.warn("[RhymeRide] Failed to send config to Unity:", err);
      }
    },
    [sessionId, resolvedRounds, config.targetScore, config.timeLimit]
  );

  return (
    <div className="w-full h-[70vh] max-w-4xl mx-auto">
      <UnityWebGL
        basePath="/games/rhyme-ride"
        buildName="rhyme-ride"
        onInstanceReady={handleInstanceReady}
      />
    </div>
  );
}
