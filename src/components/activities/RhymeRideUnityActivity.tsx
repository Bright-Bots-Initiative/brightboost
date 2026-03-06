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

interface RhymeRideResult {
  gameKey: string;
  score: number;
  total: number;
  streakMax: number;
  roundsCompleted: number;
}

interface RhymeRideUnityActivityProps {
  config: RhymeRideConfig;
  onComplete: (result?: RhymeRideResult) => void;
}

export default function RhymeRideUnityActivity({
  config,
  onComplete,
}: RhymeRideUnityActivityProps) {
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
      promptWord: resolveText(t, round.promptWord),
      correctWord: resolveText(t, round.correctWord),
      distractors: round.distractors.map((d) => resolveText(t, d)),
    }));
  }, [config.rounds, t]);

  // Build the config object to send to Unity
  const unityConfig = useMemo(() => ({
    sessionId,
    settings: {
      lives: config.settings?.lives ?? 3,
      roundTimeS: config.settings?.roundTimeS ?? 10,
      speed: config.settings?.speed ?? 3,
    },
    rounds: resolvedRounds,
  }), [sessionId, resolvedRounds, config.settings]);

  // Send config exactly once, when both instance AND ready are true
  const sendConfig = useCallback(() => {
    if (!unityReadyRef.current || !unityInstanceRef.current || configSentRef.current) return;
    configSentRef.current = true;
    console.log("[RhymeRide] Both ready and instance available — sending config");
    try {
      unityInstanceRef.current.SendMessage(
        "WebBridge",
        "InitFromJson",
        JSON.stringify(unityConfig),
      );
    } catch (err) {
      console.warn("[RhymeRide] Failed to send config to Unity:", err);
      configSentRef.current = false; // allow retry
    }
  }, [unityConfig]);

  // Listen for Unity ready + completion events
  useEffect(() => {
    const handleReady = () => {
      console.log("[RhymeRide] unityRhymeRideReady received");
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
        console.warn("[RhymeRide] Ignoring completion event with mismatched sessionId");
        return;
      }
      if (alreadyCompletedRef.current) {
        console.warn("[RhymeRide] Ignoring duplicate completion event");
        return;
      }
      alreadyCompletedRef.current = true;
      onComplete({
        gameKey: "rhyme_ride_unity",
        score: e.detail.score,
        total: e.detail.total,
        streakMax: e.detail.streakMax,
        roundsCompleted: e.detail.roundsCompleted,
      });
    };

    window.addEventListener("unityRhymeRideReady", handleReady);
    window.addEventListener(
      "unityRhymeRideComplete",
      handleComplete as EventListener,
    );
    return () => {
      window.removeEventListener("unityRhymeRideReady", handleReady);
      window.removeEventListener(
        "unityRhymeRideComplete",
        handleComplete as EventListener,
      );
    };
  }, [sessionId, onComplete, sendConfig]);

  // Store instance ref when Unity is loaded, then attempt to send config
  const handleInstanceReady = useCallback(
    (instance: any) => {
      console.log("[RhymeRide] onInstanceReady received");
      unityInstanceRef.current = instance;
      sendConfig();
    },
    [sendConfig],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ActivityHeader title={t("gameInstructions.rhymeRide.title")} visualKey="game" />

      {/* Instructions Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-full">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-1">{t("gameInstructions.rhymeRide.howToPlay")}</h3>
              <p className="text-sm text-indigo-700">
                {t("gameInstructions.rhymeRide.howToPlayDesc")}
              </p>
            </div>
            <Dialog open={showHelp} onOpenChange={setShowHelp}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("gameInstructions.rhymeRide.moreDetails")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{t("gameInstructions.rhymeRide.dialogTitle")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-1">{t("gameInstructions.rhymeRide.objective")}</h4>
                    <p className="text-gray-600">{t("gameInstructions.rhymeRide.objectiveDesc")}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-600 mb-1">{t("gameInstructions.rhymeRide.howToPlayLong")}</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>{t("gameInstructions.rhymeRide.tip1")}</li>
                      <li>{t("gameInstructions.rhymeRide.tip2")}</li>
                      <li>{t("gameInstructions.rhymeRide.tip3")}</li>
                      <li>{t("gameInstructions.rhymeRide.tip4")}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-1">{t("gameInstructions.rhymeRide.tips")}</h4>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>{t("gameInstructions.rhymeRide.tipTricky")}</li>
                      <li>{t("gameInstructions.rhymeRide.tipScroll")}</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={() => setShowHelp(false)} className="mt-4 w-full">
                  {t("gameInstructions.rhymeRide.gotIt")}
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
