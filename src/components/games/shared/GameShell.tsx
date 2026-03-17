/**
 * GameShell — shared wrapper for all BrightBoost mini-games.
 *
 * Provides:
 * - Mission briefing / story panel before gameplay
 * - Results / reward screen after gameplay
 * - Loading and error states
 * - Consistent layout and BrightBoost styling
 * - Touch-friendly, accessible controls
 */
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Trophy, ArrowRight, RotateCcw, Home, Sparkles, ChevronRight } from "lucide-react";
import ActivityHeader from "@/components/activities/ActivityHeader";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GameResult {
  gameKey: string;
  score: number;
  total: number;
  streakMax: number;
  roundsCompleted: number;
  // Extended fields for Set 2 games
  starsEarned?: number;
  accuracy?: number;
  levelReached?: number;
  hintsUsed?: number;
  firstTryClear?: boolean;
  achievements?: string[];
  gameSpecific?: Record<string, unknown>;
}

export interface MissionBriefing {
  title: string;
  story: string;
  icon: string; // emoji
  tips?: string[];
}

export interface StarRating {
  stars: number; // 1-3
  thresholds: [number, number, number]; // score % thresholds for 1, 2, 3 stars
}

interface GameShellProps {
  gameKey: string;
  title: string;
  briefing?: MissionBriefing;
  children: (props: { onFinish: (result: GameResult) => void }) => React.ReactNode;
  onComplete: (result: GameResult) => void;
  starThresholds?: [number, number, number]; // % for 1, 2, 3 stars
}

// ── Star display helper ────────────────────────────────────────────────────

function StarDisplay({ earned, total = 3 }: { earned: number; total?: number }) {
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          className={`w-10 h-10 transition-all duration-500 ${
            i < earned
              ? "text-yellow-400 fill-yellow-400 scale-110"
              : "text-gray-300"
          }`}
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GameShell({
  gameKey: _gameKey,
  title,
  briefing,
  children,
  onComplete,
  starThresholds = [30, 60, 90],
}: GameShellProps) {
  void _gameKey; // reserved for future analytics
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">(
    briefing ? "briefing" : "playing",
  );
  const [result, setResult] = useState<GameResult | null>(null);

  const handleFinish = useCallback(
    (gameResult: GameResult) => {
      // Calculate stars
      const pct = gameResult.total > 0 ? (gameResult.score / gameResult.total) * 100 : 0;
      const stars = pct >= starThresholds[2] ? 3 : pct >= starThresholds[1] ? 2 : pct >= starThresholds[0] ? 1 : 0;
      const enriched = { ...gameResult, starsEarned: stars, accuracy: Math.round(pct) };
      setResult(enriched);
      setPhase("results");
    },
    [starThresholds],
  );

  // ── Briefing Screen ──────────────────────────────────────────────────

  if (phase === "briefing" && briefing) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ActivityHeader title={title} visualKey="game" />
        <Card className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-indigo-200 shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-6xl mb-2">{briefing.icon}</div>
            <h2 className="text-2xl font-bold text-indigo-900">{briefing.title}</h2>
            <p className="text-base text-indigo-700 leading-relaxed max-w-md mx-auto">
              {briefing.story}
            </p>
            {briefing.tips && briefing.tips.length > 0 && (
              <div className="bg-white/60 rounded-lg p-4 text-left max-w-sm mx-auto">
                <h3 className="font-semibold text-indigo-800 text-sm mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> {t("games.shared.tips")}
                </h3>
                <ul className="space-y-1">
                  {briefing.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-indigo-600 flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6 rounded-xl shadow-lg"
              onClick={() => setPhase("playing")}
            >
              {t("games.shared.startMission")} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Results Screen ───────────────────────────────────────────────────

  if (phase === "results" && result) {
    const pct = result.accuracy ?? 0;
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ActivityHeader title={title} visualKey="game" />
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-200 shadow-lg overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="text-5xl">
              {(result.starsEarned ?? 0) >= 3 ? "🏆" : (result.starsEarned ?? 0) >= 2 ? "🌟" : "⭐"}
            </div>
            <h2 className="text-2xl font-bold text-amber-900">
              {(result.starsEarned ?? 0) >= 3
                ? t("games.shared.amazing")
                : (result.starsEarned ?? 0) >= 2
                  ? t("games.shared.greatJob")
                  : (result.starsEarned ?? 0) >= 1
                    ? t("games.shared.goodWork")
                    : t("games.shared.keepTrying")}
            </h2>

            <StarDisplay earned={result.starsEarned ?? 0} />

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-2xl font-bold text-indigo-700">{result.score}/{result.total}</p>
                <p className="text-xs text-slate-500">{t("games.shared.score")}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-2xl font-bold text-emerald-600">{pct}%</p>
                <p className="text-xs text-slate-500">{t("games.shared.accuracy")}</p>
              </div>
            </div>

            {result.achievements && result.achievements.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {result.achievements.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3" /> {a}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setPhase(briefing ? "briefing" : "playing");
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> {t("games.shared.playAgain")}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onComplete(result)}
              >
                <Home className="w-4 h-4 mr-1" /> {t("games.shared.finish")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Game Phase ───────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ActivityHeader title={title} visualKey="game" />
      {children({ onFinish: handleFinish })}
    </div>
  );
}
