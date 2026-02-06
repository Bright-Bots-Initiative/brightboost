// src/components/activities/BounceBudsUnityActivity.tsx
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import UnityWebGL from "../unity/UnityWebGL";
import { useTranslation } from "react-i18next";
import { LocalizedField, resolveText } from "@/utils/localizedContent";
import ActivityHeader from "@/components/activities/ActivityHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

interface BounceBudsRound {
  clueText: LocalizedField;
  correctLabel: LocalizedField;
  distractors: LocalizedField[];
  hint?: LocalizedField;
}

interface BounceBudsSettings {
  lives?: number;
  roundTimeS?: number;
  ballSpeed?: number;
  paddleSpeed?: number;
  obstacleCount?: number;
}

interface BounceBudsConfig {
  gameKey: "bounce_buds_unity";
  settings?: BounceBudsSettings;
  rounds: BounceBudsRound[];
}

interface BounceBudsResult {
  gameKey: string;
  score: number;
  total: number;
  streakMax: number;
  roundsCompleted: number;
}

interface BounceBudsUnityActivityProps {
  config: BounceBudsConfig;
  onComplete: (result?: BounceBudsResult) => void;
}

export default function BounceBudsUnityActivity({
  config,
  onComplete,
}: BounceBudsUnityActivityProps) {
  const { t } = useTranslation();
  const unityInstanceRef = useRef<any>(null);
  const alreadyCompletedRef = useRef(false);
  const unityReadyRef = useRef(false);
  const configSentRef = useRef(false);
  const [showHelp, setShowHelp] = useState(false);

  // Generate stable sessionId for this activity instance
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  // Resolve localized fields before sending to Unity
  const resolvedRounds = useMemo(() => {
    return config.rounds.map((round) => ({
      clueText: resolveText(t, round.clueText),
      correctLabel: resolveText(t, round.correctLabel),
      distractors: round.distractors.map((d) => resolveText(t, d)),
      hint: round.hint ? resolveText(t, round.hint) : undefined,
    }));
  }, [config.rounds, t]);

  // Build the config object to send to Unity
  const unityConfig = useMemo(() => ({
    sessionId,
    settings: {
      lives: config.settings?.lives ?? 3,
      roundTimeS: config.settings?.roundTimeS ?? 12,
      ballSpeed: config.settings?.ballSpeed ?? 7,
      paddleSpeed: config.settings?.paddleSpeed ?? 12,
      obstacleCount: config.settings?.obstacleCount ?? 4,
    },
    rounds: resolvedRounds,
  }), [sessionId, resolvedRounds, config.settings]);

  // Send config exactly once, when both instance AND ready are true
  const sendConfig = useCallback(() => {
    if (!unityReadyRef.current || !unityInstanceRef.current || configSentRef.current) return;
    configSentRef.current = true;
    console.log("[BounceBuds] Both ready and instance available — sending config");
    try {
      unityInstanceRef.current.SendMessage(
        "WebBridge",
        "InitFromJson",
        JSON.stringify(unityConfig),
      );
    } catch (err) {
      console.warn("[BounceBuds] Failed to send config to Unity:", err);
      configSentRef.current = false; // allow retry
    }
  }, [unityConfig]);

  // Listen for Unity ready + completion events
  useEffect(() => {
    const handleReady = () => {
      console.log("[BounceBuds] unityBounceBudsReady received");
      unityReadyRef.current = true;
      sendConfig();
      // Retry in case instance arrives slightly after ready
      setTimeout(sendConfig, 250);
      setTimeout(sendConfig, 500);
      setTimeout(sendConfig, 1000);
    };

    const handleComplete = (
      e: CustomEvent<{
        sessionId: string;
        score: number;
        total: number;
        streakMax: number;
        roundsCompleted: number;
      }>,
    ) => {
      if (e.detail.sessionId !== sessionId) {
        console.warn("[BounceBuds] Ignoring completion event with mismatched sessionId");
        return;
      }
      if (alreadyCompletedRef.current) {
        console.warn("[BounceBuds] Ignoring duplicate completion event");
        return;
      }
      alreadyCompletedRef.current = true;
      onComplete({
        gameKey: "bounce_buds_unity",
        score: e.detail.score,
        total: e.detail.total,
        streakMax: e.detail.streakMax,
        roundsCompleted: e.detail.roundsCompleted,
      });
    };

    window.addEventListener("unityBounceBudsReady", handleReady);
    window.addEventListener(
      "unityBounceBudsComplete",
      handleComplete as EventListener,
    );
    return () => {
      window.removeEventListener("unityBounceBudsReady", handleReady);
      window.removeEventListener(
        "unityBounceBudsComplete",
        handleComplete as EventListener,
      );
    };
  }, [sessionId, onComplete, sendConfig]);

  // Store instance ref when Unity is loaded, then attempt to send config
  const handleInstanceReady = useCallback(
    (instance: any) => {
      console.log("[BounceBuds] onInstanceReady received");
      unityInstanceRef.current = instance;
      sendConfig();
    },
    [sendConfig],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ActivityHeader title="Bounce & Buds" visualKey="game" />

      {/* Instructions Card */}
      <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-green-100 rounded-full">
              <HelpCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">How to Play</h3>
              <p className="text-sm text-green-700">
                Use the paddle to bounce your Buddy through the correct gate! Read the clue and aim for the right answer.
              </p>
            </div>
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  More Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Bounce & Buds Instructions</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-1">Objective</h4>
                    <p className="text-gray-600">Bounce your Buddy ball through the gate that matches the clue!</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600 mb-1">Controls</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Use arrow keys (Left/Right) or A/D to move the paddle</li>
                      <li>On mobile: drag the paddle left and right</li>
                      <li>Bounce the ball off your paddle to keep it in play</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-600 mb-1">Scoring</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Hit the correct gate to score a point</li>
                      <li>Wrong gates or falling out costs a life</li>
                      <li>Build a streak for bonus points!</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-1">Tips</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Read the clue carefully before bouncing</li>
                      <li>Use the obstacles to guide your ball</li>
                      <li>Take your time - accuracy beats speed!</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={() => setShowHelp(false)} className="mt-4 w-full">
                  Got it!
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="w-full h-[60vh]">
        <UnityWebGL
          basePath="/games/bounce-buds"
          buildName="bounce_buds"
          onInstanceReady={handleInstanceReady}
        />
      </div>
    </div>
  );
}
