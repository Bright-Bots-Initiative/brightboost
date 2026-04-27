/**
 * Gotcha Gears — React catching game (replaces Unity version).
 *
 * Items fall from the top of a play-field. The student reads a clue,
 * then clicks/taps the correct falling gear before it leaves the screen.
 * Wrong picks and misses cost lives.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import { resolveText } from "@/utils/localizedContent";
import "./shared/game-effects.css";

// ── Types ──────────────────────────────────────────────────────────────────

interface GearRound {
  clueText: string | { en?: string; es?: string; i18nKey?: string };
  correctLabel: string | { en?: string; es?: string; i18nKey?: string };
  distractors: (string | { en?: string; es?: string; i18nKey?: string })[];
  hint?: string | { en?: string; es?: string; i18nKey?: string };
  // Legacy field names
  clue?: string | { en?: string; es?: string; i18nKey?: string };
  correctAnswer?: string | { en?: string; es?: string; i18nKey?: string };
}

interface GotchaGearsConfig {
  gameKey: string;
  settings?: {
    lives?: number;
    speed?: number;
    speedRamp?: number;
    maxSpeed?: number;
  };
  rounds?: GearRound[];
}

interface FallingGear {
  id: string;
  label: string;
  correct: boolean;
  x: number; // 0-100 percent
  y: number; // px from top
  speed: number; // px per frame
}

// ── Built-in content (grade-band aware) ──────────────────────────────────

import { getGradeBand, GOTCHA_GEARS_CONTENT } from "./gradeBandContent";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveField(t: any, field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return resolveText(t, field as any, "");
}

export function calculateGotchaCatchScore(streak: number): number {
  return 10 * (streak + 1);
}

export function buildGotchaCompletionPayload(params: {
  score: number;
  roundsLength: number;
  maxStreak: number;
  roundIdx: number;
}): GameResult {
  return {
    gameKey: "gotcha_gears_unity",
    score: params.score,
    total: params.roundsLength,
    streakMax: params.maxStreak,
    roundsCompleted: params.roundIdx + 1,
  };
}

const FIELD_W = 560;
const FIELD_H = 420;
const GEAR_H = 52;        // gear pill height
const GEAR_MIN_W = 100;   // min pill width — ensures labels are readable

// ── Falling-gear play field ───────────────────────────────────────────────

function GearField({
  gears,
  onCatch,
}: {
  gears: FallingGear[];
  onCatch: (id: string) => void;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-gradient-to-b from-sky-100 via-sky-50 to-white mx-auto select-none shadow-lg"
      style={{ width: FIELD_W, height: FIELD_H, maxWidth: "100%" }}
    >
      {/* Decorative cogs in background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none text-8xl flex items-center justify-center gap-8">
        <span>{"⚙️"}</span><span>{"🔧"}</span><span>{"⚙️"}</span>
      </div>

      {gears.map((g) => (
        <button
          key={g.id}
          className={`absolute flex items-center gap-1.5 rounded-full font-bold text-sm shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer px-3 py-1 whitespace-nowrap ${
            g.correct
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-2 border-amber-300"
              : "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-2 border-slate-200"
          }`}
          style={{
            minWidth: GEAR_MIN_W,
            height: GEAR_H,
            left: `calc(${g.x}% - ${GEAR_MIN_W / 2}px)`,
            top: g.y,
          }}
          onClick={() => onCatch(g.id)}
        >
          <span className="text-lg flex-shrink-0">{"⚙️"}</span>
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Core game ─────────────────────────────────────────────────────────────

function GotchaGearsCore({
  config,
  onFinish,
}: {
  config: GotchaGearsConfig;
  onFinish: (result: GameResult) => void;
}) {
  const { t } = useTranslation();

  const rounds = useMemo(() => {
    const band = getGradeBand(config);
    const raw = config?.rounds?.length ? config.rounds : GOTCHA_GEARS_CONTENT[band];
    return raw.map((r: any) => ({
      clue: resolveField(t, r.clueText ?? r.clue),
      correct: resolveField(t, r.correctLabel ?? r.correctAnswer),
      distractors: (r.distractors ?? []).map((d: any) => resolveField(t, d)),
      hint: resolveField(t, r.hint),
    }));
  }, [config, t]);

  const baseSpeed = config?.settings?.speed ?? 0.55;
  const speedRamp = config?.settings?.speedRamp ?? 0.04;
  const maxSpeed = config?.settings?.maxSpeed ?? 1.4;
  const maxLives = config?.settings?.lives ?? 3;

  const [roundIdx, setRoundIdx] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [gears, setGears] = useState<FallingGear[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; type: "correct" | "wrong" } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);

  const animRef = useRef<number>(0);
  const round = rounds[roundIdx];

  // Spawn gears for current round
  const spawnGears = useCallback(() => {
    if (!round) return;
    const labels = [round.correct, ...round.distractors].sort(() => Math.random() - 0.5);
    const speed = Math.min(baseSpeed + roundIdx * speedRamp, maxSpeed);
    // Spread gears evenly across the field with jitter
    const slotWidth = 90 / labels.length; // percent-based slots
    const newGears: FallingGear[] = labels.map((label, i) => ({
      id: `${roundIdx}-${i}-${Date.now()}`,
      label,
      correct: label === round.correct,
      x: 5 + slotWidth * i + slotWidth / 2 + (Math.random() * 6 - 3),
      y: -GEAR_H - Math.random() * 50,
      speed: speed * (0.85 + Math.random() * 0.3),
    }));
    setGears(newGears);
    setRoundComplete(false);
  }, [round, roundIdx, baseSpeed, speedRamp]);

  useEffect(() => {
    spawnGears();
  }, [spawnGears]);

  // Animate gears falling
  useEffect(() => {
    if (gameOver || roundComplete) return;
    const animate = () => {
      setGears((prev) => {
        let allGone = true;
        const next = prev.map((g) => {
          const ny = g.y + g.speed;
          if (ny < FIELD_H + GEAR_H) allGone = false;
          return { ...g, y: ny };
        });
        // If all gears fell off screen without being caught
        if (allGone && prev.length > 0) {
          // Miss — lose a life
          setStreak(0);
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
          setFeedback({ text: round?.hint || t("games.gotchaGears.missed", { defaultValue: "Missed! Try to catch faster!" }), type: "wrong" });
          setTimeout(() => {
            setFeedback(null);
            advanceRound();
          }, 1200);
          return [];
        }
        return next;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameOver, roundComplete, roundIdx]);

  const advanceRound = useCallback(() => {
    if (roundIdx + 1 >= rounds.length) {
      finishGame();
    } else {
      setRoundIdx((r) => r + 1);
    }
  }, [roundIdx, rounds.length]);

  const finishGame = useCallback(() => {
    onFinish(buildGotchaCompletionPayload({ score, roundsLength: rounds.length, maxStreak, roundIdx }));
  }, [score, rounds.length, maxStreak, roundIdx, onFinish]);

  const handleCatch = useCallback(
    (gearId: string) => {
      const gear = gears.find((g) => g.id === gearId);
      if (!gear) return;

      if (gear.correct) {
        setGears([]);
        setRoundComplete(true);
        const ns = streak + 1;
        setScore((s) => s + calculateGotchaCatchScore(streak));
        setStreak(ns);
        setMaxStreak((m) => Math.max(m, ns));
        setFeedback({ text: ns > 1 ? `${t("games.gotchaGears.correct", { defaultValue: "Got it!" })} x${ns}` : t("games.gotchaGears.correct", { defaultValue: "Got it!" }), type: "correct" });
        setTimeout(() => {
          setFeedback(null);
          advanceRound();
        }, 800);
      } else {
        // Remove wrong gear, lose streak
        setGears((prev) => prev.filter((g) => g.id !== gearId));
        setStreak(0);
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) setGameOver(true);
          return nl;
        });
        setFeedback({ text: round?.hint || t("games.gotchaGears.wrong", { defaultValue: "Not that one!" }), type: "wrong" });
        setTimeout(() => setFeedback(null), 1200);
      }
    },
    [gears, streak, round, advanceRound, t],
  );

  if (gameOver) {
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">{"⚙️"}</div>
        <h3 className="text-2xl font-extrabold text-slate-800">
          {t("games.gotchaGears.gameOver", { defaultValue: "Great Effort!" })}
        </h3>
        <p className="text-lg text-slate-600">
          {t("games.gotchaGears.scoreLabel", { defaultValue: "Gears Caught" })}: <span className="font-bold text-amber-600">{score}</span>
        </p>
        <button
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={finishGame}
        >
          {t("games.gotchaGears.finish", { defaultValue: "Finish" })}
        </button>
      </div>
    );
  }

  if (!round) return null;

  return (
    <div className="space-y-3">
      {/* HUD */}
      <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-5 py-3 rounded-xl font-extrabold text-lg text-center shadow border border-amber-200 text-slate-800">
        {"🔍"} {round.clue}
      </div>
      <div className="flex items-center justify-between text-sm px-1">
        <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold">
          {"⭐"} {score}
        </span>
        {streak > 1 && (
          <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-bold">
            {"🔥"} x{streak}
          </span>
        )}
        <span className="flex items-center gap-1 px-3 py-1 bg-pink-50 text-pink-700 rounded-full">
          {Array.from({ length: Math.max(0, lives) }, (_, i) => (
            <span key={i}>{"❤️"}</span>
          ))}
        </span>
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
          {roundIdx + 1}/{rounds.length}
        </span>
      </div>

      {/* Play field */}
      <GearField gears={gears} onCatch={handleCatch} />

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-center py-2 rounded-xl font-bold text-sm ${
            feedback.type === "correct"
              ? "bg-green-100 text-green-800 bounce-in"
              : "bg-red-100 text-red-800 shake"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export default function GotchaGearsGame({
  config,
  onComplete,
}: {
  config?: any;
  onComplete?: (result: GameResult) => void;
}) {
  const { t } = useTranslation();
  const gameConfig: GotchaGearsConfig = config?.rounds?.length
    ? config
    : { gameKey: "gotcha_gears_unity", rounds: GOTCHA_GEARS_CONTENT[getGradeBand(config)] };

  const briefing: MissionBriefing = {
    title: "Gear Grab!",
    story: "Gearbot's gears are falling from the sky! Read the clue and catch the right gear before it hits the ground.",
    icon: "⚙️",
    chapterLabel: "Gotcha Gears",
    themeColor: "amber",
    tips: ["Read the clue carefully", "Tap the correct gear", "Streaks earn bonus points!"],
  };

  return (
    <GameShell
      gameKey="gotcha_gears_unity"
      title={t("games.gotchaGears.title", { defaultValue: "Gotcha Gears" })}
      briefing={briefing}
      onComplete={onComplete!}
    >
      {({ onFinish }) => (
        <GotchaGearsCore config={gameConfig} onFinish={onFinish} />
      )}
    </GameShell>
  );
}
