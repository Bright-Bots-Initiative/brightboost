/**
 * GameShell — premium shared wrapper for BrightBoost mini-games.
 *
 * Provides animated mission briefing, gameplay frame, and celebratory
 * results screen with staggered star reveal, achievement toasts, and
 * score count-up.
 */
import { useState, useCallback, useEffect, useRef, useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, RotateCcw, Home, Sparkles, ChevronRight, Award, Trophy, Flame, Check } from "lucide-react";
import ActivityHeader from "@/components/activities/ActivityHeader";
import { usePersonalBest } from "@/hooks/usePersonalBest";
import { ReducedEffectsToggle } from "./ReducedEffectsToggle";
import { useReducedGameEffects } from "./useReducedGameEffects";
import { ControlInstructions } from "./ControlInstructions";
import { mergeControlInstructions, type ControlInstructionsModel } from "./controlInstructionsData";
import "./game-effects.css";


// ── Types ──────────────────────────────────────────────────────────────────

export interface GameResult {
  gameKey: string;
  score: number;
  total: number;
  streakMax: number;
  roundsCompleted: number;
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
  icon: string;
  tips?: string[];
  controlInstructions?: ControlInstructionsModel;
  chapterLabel?: string;
  themeColor?: string; // tailwind color stem e.g. "indigo", "violet", "cyan"
}

interface GameShellProps {
  gameKey: string;
  title: string;
  briefing?: MissionBriefing;
  children: (props: { onFinish: (result: GameResult) => void; reducedEffects: boolean }) => React.ReactNode;
  onComplete: (result: GameResult) => void;
  starThresholds?: [number, number, number];
  /**
   * Format the persisted personal best for display. Each game's `score` is
   * in its own unit (Tank Trek: a star-sum; Rhyme & Ride: points), and raw
   * numbers like "High Score: 55" mean nothing to a 7-year-old. Games pass
   * a formatter that renders kid-readable units (e.g. "⭐ 16/21"); without
   * one the chip falls back to the raw score.
   */
  formatBest?: (best: { bestScore: number; bestStreak: number }) => string;
}

// ── Animated star with stagger ─────────────────────────────────────────────

function AnimatedStar({ earned, index }: { earned: boolean; index: number }) {
  return (
    <div className="star-pop" style={{ animationDelay: `${index * 250}ms` }}>
      <Star
        className={`w-12 h-12 drop-shadow-lg ${
          earned
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300/50 fill-gray-200/30"
        }`}
      />
      {earned && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(250,204,21,0.3) 0%, transparent 70%)",
            animation: `pulse-glow 2s ease-in-out infinite`,
            animationDelay: `${index * 250 + 500}ms`,
          }}
        />
      )}
    </div>
  );
}

// ── Score count-up hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

// ── Achievement toast ──────────────────────────────────────────────────────

function AchievementBadge({ name, index }: { name: string; index: number }) {
  return (
    <div
      className="bounce-in flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-xl shadow-md"
      style={{ animationDelay: `${800 + index * 300}ms` }}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-inner">
        <Award className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-purple-800">{name}</p>
        <p className="text-[10px] text-purple-500">Achievement Unlocked!</p>
      </div>
    </div>
  );
}


// ── In Game Progress HUD ────────────────────────────────────────────
export function ProgressHUD({step, totalLevels}: {step: number, totalLevels: number,}){
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const minLeftPx = 4;
  const maxLeftPx = containerWidth - 4;
  const dotRadius = 10;
  const dotStart = minLeftPx + dotRadius; 
  const dotEnd = maxLeftPx - dotRadius;
  const innerWidth = containerWidth - 10;
  const getPos = (index: number) => (dotStart) + (index / (totalLevels - 1)) * (dotEnd - dotStart);
  return (
    <div
      ref={containerRef}
      className="relative h-[30px] rounded-full"
      style={{
        background: "#FF8C00",
        padding: "3px",
      }}
      >
       {/*Streak bar body*/}    
        <div
        className="w-full h-full rounded-full"
        style={{
          backgroundColor: "#fed7aa",
          padding: "2px",
        }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${getPos(step) / innerWidth * 100}%`,
              background:"#FF8C00",
            }}
            />
        </div>

    {/*Dots for each Level*/}
      {Array.from({ length: totalLevels}).map((_, i) => {
        return (
          <span 
            key = {i}
            className={`absolute rounded-full ${
              i === step
              ? "w-5 h-5"
              : i < step
                ? "w-5 h-5 bg-red-500"
                : "w-5 h-5 bg-white" 
            }`}
            style={{
            left: getPos(i),
            top: "50%",
            transform:"translate(-50%, -50%)",
            }}
          >
          {i < step && (
            <span className="text-white font-bold">
            <Check className="w-5 h-4.5" />
            </span>
          )}
        </span>
       );
    })}

      {/*Flame slider icon */}
      <div 
        className="absolute z-20"
        style={{
          left: getPos(step),
          top: "35%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Flame className="w-10 h-10 text-red-500 fill-orange-300 drop-shadow-md" />
      </div>
  </div>
  );
}

// ── Results screen (own component so hooks are never conditional) ──────────

function GameResultsView({
  result,
  title,
  personalBest,
  onPlayAgain,
  onComplete,
  headingRef,
}: {
  result: GameResult;
  title: string;
  personalBest: ReturnType<typeof usePersonalBest>;
  onPlayAgain: () => void;
  onComplete: () => void;
  headingRef: RefObject<HTMLHeadingElement>;
}) {
  const { t } = useTranslation();
  const pct = result.accuracy ?? 0;
  const stars = result.starsEarned ?? 0;
  const animatedScore = useCountUp(result.score, 1000);
  const animatedPct = useCountUp(pct, 1200);
  const sparkleDots = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        left: `${10 + Math.random() * 80}%`,
        top: `${10 + Math.random() * 80}%`,
        duration: `${1.5 + Math.random()}s`,
        delay: `${Math.random() * 2}s`,
      })),
    [],
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ActivityHeader title={title} visualKey="game" />
      <div className="slide-up-fade relative overflow-hidden rounded-2xl shadow-xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50" />
        {stars >= 3 && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {sparkleDots.map((dot, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-400/60"
                style={{
                  left: dot.left,
                  top: dot.top,
                  animation: `sparkle ${dot.duration} ease-in-out infinite`,
                  animationDelay: dot.delay,
                }}
              />
            ))}
          </div>
        )}
        <div className="relative p-8 text-center space-y-6">
          {/* Trophy */}
          <div className="bounce-in">
            <div className="text-6xl">
              {stars >= 3 ? "🏆" : stars >= 2 ? "🌟" : stars >= 1 ? "⭐" : "💪"}
            </div>
          </div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-extrabold text-amber-900 bounce-in focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            style={{ animationDelay: "200ms" }}
          >
            {stars >= 3 ? t("games.shared.amazing") : stars >= 2 ? t("games.shared.greatJob") : stars >= 1 ? t("games.shared.goodWork") : t("games.shared.keepTrying")}
          </h2>

          {/* Stars */}
          <div className="flex gap-3 justify-center relative">
            {[0, 1, 2].map((i) => (
              <AnimatedStar key={i} earned={i < stars} index={i} />
            ))}
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <p className="text-3xl font-extrabold text-indigo-600">{animatedScore}<span className="text-lg text-indigo-300">/{result.total}</span></p>
              <p className="text-xs font-medium text-slate-500 mt-1">{t("games.shared.score")}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <p className="text-3xl font-extrabold text-emerald-500">{animatedPct}%</p>
              <p className="text-xs font-medium text-slate-500 mt-1">{t("games.shared.accuracy")}</p>
            </div>
          </div>

          {/* Personal Best */}
          {personalBest && result.score > personalBest.bestScore && (
            <div className="bounce-in flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-xl shadow-md" style={{ animationDelay: "500ms" }}>
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-800">{t("games.personalBest.newRecord", { defaultValue: "New Record!" })}</span>
            </div>
          )}
          {personalBest && personalBest.bestScore > 0 && result.score <= personalBest.bestScore && (
            <div className="text-xs text-slate-400">
              {t("games.personalBest.personalBest", { defaultValue: "Personal Best" })}: {personalBest.bestScore}
            </div>
          )}

          {/* First try / perfect badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {result.firstTryClear && (
              <span className="bounce-in inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200" style={{ animationDelay: "600ms" }}>
                ✨ {t("games.shared.firstTry")}
              </span>
            )}
            {pct === 100 && (
              <span className="bounce-in inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200" style={{ animationDelay: "700ms" }}>
                💯 {t("games.shared.perfectScore")}
              </span>
            )}
          </div>

          {/* Achievements */}
          {result.achievements && result.achievements.length > 0 && (
            <div className="flex flex-col gap-2 items-center">
              {result.achievements.map((a, i) => (
                <AchievementBadge key={a} name={a} index={i} />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              className="rounded-xl hover:scale-105 active:scale-95 transition-transform"
              onClick={onPlayAgain}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> {t("games.shared.playAgain")}
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform"
              onClick={onComplete}
            >
              <Home className="w-4 h-4 mr-1" /> {t("games.shared.finish")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GameShell({
  gameKey,
  title,
  briefing,
  children,
  onComplete,
  starThresholds = [30, 60, 90],
  formatBest,
}: GameShellProps) {
  const { t } = useTranslation();
  const personalBest = usePersonalBest(gameKey);
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">(
    briefing ? "briefing" : "playing",
  );
  const [result, setResult] = useState<GameResult | null>(null);
  const { reducedEffects, source, setReducedEffects } = useReducedGameEffects();
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const gameRegionRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const instructionsId = `${gameKey}-control-instructions`;
  const activeInstructions = mergeControlInstructions(briefing?.controlInstructions);

  const handleFinish = useCallback(
    (gameResult: GameResult) => {
      const pct = gameResult.total > 0 ? Math.min(100, (gameResult.score / gameResult.total) * 100) : 0;
      const stars = pct >= starThresholds[2] ? 3 : pct >= starThresholds[1] ? 2 : pct >= starThresholds[0] ? 1 : 0;
      setResult({ ...gameResult, starsEarned: stars, accuracy: Math.round(pct) });
      setPhase("results");
    },
    [starThresholds],
  );

  useEffect(() => {
    if (phase === "briefing") {
      startButtonRef.current?.focus();
      return;
    }

    if (phase === "playing") {
      gameRegionRef.current?.focus();
      return;
    }

    if (phase === "results") {
      resultsHeadingRef.current?.focus();
    }
  }, [phase]);

  // ── Briefing ─────────────────────────────────────────────────────────

  if (phase === "briefing" && briefing) {
    const tc = briefing.themeColor ?? "indigo";
    return (
      <div
        className="max-w-2xl mx-auto space-y-4"
        data-reduced-effects={reducedEffects ? "true" : "false"}
      >
        <ActivityHeader title={title} visualKey="game" />
        <ReducedEffectsToggle
          reducedEffects={reducedEffects}
          source={source}
          onToggle={setReducedEffects}
        />
        <div className="slide-up-fade relative overflow-hidden rounded-2xl shadow-xl border border-white/20">
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br from-${tc}-500/10 via-${tc}-400/5 to-purple-500/10`} />
          {/* Tighter on mobile (p-5/space-y-4) — the p-8 band read as dead
              space under the Start button on phones. */}
          <div className="relative p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
            {/* Chapter badge */}
            {briefing.chapterLabel && (
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-${tc}-100 text-${tc}-700 tracking-wide uppercase`}>
                {briefing.chapterLabel}
              </span>
            )}
            {/* Icon with glow */}
            <div className="relative inline-block">
              <div className="text-7xl float-idle">{briefing.icon}</div>
              <div className="absolute inset-0 rounded-full bg-yellow-300/20 blur-xl scale-150" />
            </div>
            <h2 className={`text-3xl font-extrabold text-${tc}-900 tracking-tight`}>{briefing.title}</h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-md mx-auto">
              {briefing.story}
            </p>
            {briefing.tips && briefing.tips.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-left max-w-sm mx-auto border border-white/50 shadow-sm">
                <h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" /> {t("games.shared.tips")}
                </h3>
                <ul className="space-y-1.5">
                  {briefing.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0 text-indigo-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ControlInstructions id={instructionsId} instructions={activeInstructions} className="max-w-xl mx-auto text-left" />
            {personalBest && personalBest.bestScore > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/50 shadow-sm text-sm">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-slate-600">
                  {t("games.personalBest.best", { defaultValue: "Best" })}:{" "}
                  {formatBest
                    ? formatBest(personalBest)
                    : personalBest.bestScore}
                </span>
              </div>
            )}
            <Button
              ref={startButtonRef}
              size="lg"
              className={`bg-gradient-to-r from-${tc}-500 to-${tc}-600 hover:from-${tc}-600 hover:to-${tc}-700 text-lg px-10 py-6 rounded-2xl shadow-lg shadow-${tc}-500/25 transition-all hover:scale-105 active:scale-95`}
              onClick={() => setPhase("playing")}
            >
              {t("games.shared.startMission")} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────

  if (phase === "results" && result) {
    return (
      <div
        className="max-w-2xl mx-auto space-y-4"
        data-reduced-effects={reducedEffects ? "true" : "false"}
      >
        <ReducedEffectsToggle
          reducedEffects={reducedEffects}
          source={source}
          onToggle={setReducedEffects}
        />
        <GameResultsView
          result={result}
          title={title}
          personalBest={personalBest}
          headingRef={resultsHeadingRef}
          onPlayAgain={() => { setResult(null); setPhase(briefing ? "briefing" : "playing"); }}
          onComplete={() => onComplete(result)}
        />
      </div>
    );
  }

  // ── Game Phase ───────────────────────────────────────────────────────

  return (
    <div
      className="max-w-4xl mx-auto space-y-4"
      data-reduced-effects={reducedEffects ? "true" : "false"}
    >
      <ActivityHeader title={title} visualKey="game" />
      <ReducedEffectsToggle
        reducedEffects={reducedEffects}
        source={source}
        onToggle={setReducedEffects}
      />
      <div
        ref={gameRegionRef}
        role="region"
        aria-label={`${title} game area`}
        aria-describedby={instructionsId}
        tabIndex={-1}
      >
        {/* In-game How-to-play is COLLAPSED by default — the player already
            saw the full version on the briefing screen, and the expanded
            block pushed the maze/controls below the fold on phones. Native
            <details> keeps it keyboard- and screen-reader-accessible. */}
        <details className="mb-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-semibold text-slate-600 min-h-[32px] flex items-center gap-1">
            ❓ {t("games.shared.howToPlay", { defaultValue: "How to play" })}
          </summary>
          <div className="pt-2">
            <ControlInstructions id={instructionsId} instructions={activeInstructions} />
          </div>
        </details>
        {children({ onFinish: handleFinish, reducedEffects })}
      </div>
    </div>
  );
}
