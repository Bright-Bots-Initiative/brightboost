// src/components/activities/RhymeRideUnityActivity.tsx
import { useEffect, useRef, useCallback, useMemo } from "react";
import UnityWebGL from "../unity/UnityWebGL";
import { useTranslation } from "react-i18next";
import { LocalizedField, resolveText } from "@/utils/localizedContent";
import ActivityHeader from "@/components/activities/ActivityHeader";

interface RhymeRideRound {
  promptWord: LocalizedField;
  correctWord: LocalizedField;
  distractors: LocalizedField[];
}

interface RhymeRideSettings {
  lives?: number;
  roundTimeS?: number;
  speed?: number;
}

interface RhymeRideConfig {
  gameKey: "rhyme_ride_unity";
  settings?: RhymeRideSettings;
  rounds: RhymeRideRound[];
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
  const alreadyCompletedRef = useRef(false);

  // Generate stable sessionId for this activity instance
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  // Resolve localized fields before sending to Unity
  const resolvedRounds = useMemo(() => {
    return config.rounds.map((round) => ({
      promptWord: resolveText(t, round.promptWord),
      correctWord: resolveText(t, round.correctWord),
      distractors: round.distractors.map((d) => resolveText(t, d)),
    }));
  }, [config.rounds, t]);

  // Listen for completion event from Unity
  useEffect(() => {
    const handleComplete = (
      e: CustomEvent<{
        sessionId: string;
        score: number;
        total: number;
        streakMax: number;
      }>,
    ) => {
      // Validate sessionId to prevent stale/cross-tab events
      if (e.detail.sessionId !== sessionId) {
        console.warn(
          "[RhymeRide] Ignoring completion event with mismatched sessionId",
        );
        return;
      }

      // Prevent duplicate completion signals
      if (alreadyCompletedRef.current) {
        console.warn("[RhymeRide] Ignoring duplicate completion event");
        return;
      }

      alreadyCompletedRef.current = true;
      onComplete();
    };

    window.addEventListener(
      "unityRhymeRideComplete",
      handleComplete as EventListener,
    );
    return () => {
      window.removeEventListener(
        "unityRhymeRideComplete",
        handleComplete as EventListener,
      );
    };
  }, [sessionId, onComplete]);

  const handleInstanceReady = useCallback(
    (instance: any) => {
      unityInstanceRef.current = instance;

      // Send game config to Unity using InitFromJson
      try {
        const unityConfig = {
          sessionId,
          settings: {
            lives: config.settings?.lives ?? 3,
            roundTimeS: config.settings?.roundTimeS ?? 10,
            speed: config.settings?.speed ?? 3,
          },
          rounds: resolvedRounds,
        };
        instance.SendMessage(
          "WebBridge",
          "InitFromJson",
          JSON.stringify(unityConfig),
        );
      } catch (err) {
        console.warn("[RhymeRide] Failed to send config to Unity:", err);
      }
    },
    [sessionId, resolvedRounds, config.settings],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ActivityHeader title="Rhyme & Ride" visualKey="game" />
      <div className="w-full h-[60vh]">
        <UnityWebGL
          basePath="/games/rhyme-ride"
          buildName="rhyme_ride"
          onInstanceReady={handleInstanceReady}
        />
      </div>
    </div>
  );
}
