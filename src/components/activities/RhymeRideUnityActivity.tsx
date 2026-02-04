// src/components/activities/RhymeRideUnityActivity.tsx
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
  const [showHelp, setShowHelp] = useState(false);

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

      {/* Instructions Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-full">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-1">How to Play</h3>
              <p className="text-sm text-indigo-700">
                Words scroll across the screen. Tap or click the word that rhymes with the prompt word shown at the top!
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
                  <DialogTitle className="text-xl font-bold">Rhyme & Ride Instructions</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-1">Objective</h4>
                    <p className="text-gray-600">Find the word that rhymes with the prompt word before time runs out!</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600 mb-1">How to Play</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Look at the prompt word at the top of the screen</li>
                      <li>Words will scroll across in different lanes</li>
                      <li>Tap/click the word that rhymes with the prompt</li>
                      <li>Avoid clicking wrong words - you'll lose a life!</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-1">Tips</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Watch out for tricky words that look similar but don't rhyme</li>
                      <li>Don't let the correct answer scroll off-screen!</li>
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
          basePath="/games/rhyme-ride"
          buildName="rhyme_ride"
          onInstanceReady={handleInstanceReady}
        />
      </div>
    </div>
  );
}
