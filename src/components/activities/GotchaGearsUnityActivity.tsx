// src/components/activities/GotchaGearsUnityActivity.tsx
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

interface GotchaGearsRound {
  clue: LocalizedField;
  correctAnswer: LocalizedField;
  distractors: LocalizedField[];
}

interface GotchaGearsSettings {
  lives?: number;
  roundTimeS?: number;
  speed?: number;
  kidModeWrongNoLife?: boolean;
  kidModeWhiffNoLife?: boolean;
}

interface GotchaGearsConfig {
  gameKey: "gotcha_gears_unity";
  settings?: GotchaGearsSettings;
  rounds: GotchaGearsRound[];
}

interface GotchaGearsResult {
  gameKey: string;
  score: number;
  total: number;
  streakMax: number;
  roundsCompleted: number;
}

interface GotchaGearsUnityActivityProps {
  config: GotchaGearsConfig;
  onComplete: (result?: GotchaGearsResult) => void;
}

export default function GotchaGearsUnityActivity({
  config,
  onComplete,
}: GotchaGearsUnityActivityProps) {
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
      clue: resolveText(t, round.clue),
      correctAnswer: resolveText(t, round.correctAnswer),
      distractors: round.distractors.map((d) => resolveText(t, d)),
    }));
  }, [config.rounds, t]);

  // Build the config object to send to Unity
  const unityConfig = useMemo(() => ({
    sessionId,
    settings: {
      lives: config.settings?.lives ?? 3,
      roundTimeS: config.settings?.roundTimeS ?? 12,
      speed: config.settings?.speed ?? 2.5,
      kidModeWrongNoLife: config.settings?.kidModeWrongNoLife ?? true,
      kidModeWhiffNoLife: config.settings?.kidModeWhiffNoLife ?? true,
    },
    rounds: resolvedRounds,
  }), [sessionId, resolvedRounds, config.settings]);

  // Send config exactly once, when both instance AND ready are true
  const sendConfig = useCallback(() => {
    if (!unityReadyRef.current || !unityInstanceRef.current || configSentRef.current) return;
    configSentRef.current = true;
    console.log("[GotchaGears] Both ready and instance available — sending config");
    try {
      unityInstanceRef.current.SendMessage(
        "WebBridge",
        "InitFromJson",
        JSON.stringify(unityConfig),
      );
    } catch (err) {
      console.warn("[GotchaGears] Failed to send config to Unity:", err);
      configSentRef.current = false; // allow retry
    }
  }, [unityConfig]);

  // Listen for Unity ready + completion events
  useEffect(() => {
    const handleReady = () => {
      console.log("[GotchaGears] unityGotchaGearsReady received");
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
        console.warn("[GotchaGears] Ignoring completion event with mismatched sessionId");
        return;
      }
      if (alreadyCompletedRef.current) {
        console.warn("[GotchaGears] Ignoring duplicate completion event");
        return;
      }
      alreadyCompletedRef.current = true;
      onComplete({
        gameKey: "gotcha_gears_unity",
        score: e.detail.score,
        total: e.detail.total,
        streakMax: e.detail.streakMax,
        roundsCompleted: e.detail.roundsCompleted,
      });
    };

    window.addEventListener("unityGotchaGearsReady", handleReady);
    window.addEventListener(
      "unityGotchaGearsComplete",
      handleComplete as EventListener,
    );
    return () => {
      window.removeEventListener("unityGotchaGearsReady", handleReady);
      window.removeEventListener(
        "unityGotchaGearsComplete",
        handleComplete as EventListener,
      );
    };
  }, [sessionId, onComplete, sendConfig]);

  // Store instance ref when Unity is loaded, then attempt to send config
  const handleInstanceReady = useCallback(
    (instance: any) => {
      console.log("[GotchaGears] onInstanceReady received");
      unityInstanceRef.current = instance;
      sendConfig();
    },
    [sendConfig],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ActivityHeader title="Gotcha Gears" visualKey="game" />

      {/* Instructions Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-orange-100 rounded-full">
              <HelpCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">How to Play</h3>
              <p className="text-sm text-orange-700">
                Read the clue, then catch the correct gear! Use arrow keys or tap the lanes to move your catcher.
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
                  <DialogTitle className="text-xl font-bold">Gotcha Gears Instructions</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold text-orange-600 mb-1">Objective</h4>
                    <p className="text-gray-600">Catch the gear with the correct answer before it scrolls off screen!</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600 mb-1">How to Play</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li><strong>Planning Phase:</strong> Read the clue and watch the gears appear</li>
                      <li><strong>Action Phase:</strong> Move your catcher to the right lane</li>
                      <li>Use ↑/↓ arrow keys (or W/S) or tap a lane</li>
                      <li>Press CATCH or click when the gear reaches the catcher zone</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-1">Scoring</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Correct catch = +1 point</li>
                      <li>Wrong catch = Try again (no life lost in kid mode)</li>
                      <li>Missed correct gear = Try again</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-1">Tips</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Watch for gears scrolling on all three lanes</li>
                      <li>Position early and wait for the right moment!</li>
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
          basePath="/games/gotcha-gears"
          buildName="gotcha_gears"
          onInstanceReady={handleInstanceReady}
        />
      </div>
    </div>
  );
}
