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
import { pickLocale, resolveText } from "@/utils/localizedContent";
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
  roundsCompleted: number;
  correctCount: number;
  attempts: number;
}): GameResult {
  return {
    gameKey: "gotcha_gears_unity",
    score: params.score,
    total: params.roundsLength,
    streakMax: params.maxStreak,
    roundsCompleted: params.roundsCompleted,
    // Points retain their arcade/personal-best unit. Accuracy counts choices;
    // unfinished rounds remain in its denominator, so stopping early cannot
    // turn one catch into perfect mastery. Wrong picks and misses are attempts.
    accuracy:
      params.roundsLength > 0
        ? (100 * params.correctCount) /
          Math.max(params.roundsLength, params.attempts)
        : 0,
    gameSpecific: {
      correctCount: params.correctCount,
      attempts: params.attempts,
      requiredRounds: params.roundsLength,
    },
  };
}

const FIELD_W = 560;
const FIELD_H = 420;
const GEAR_H = 52; // gear pill height
const GEAR_MIN_W = 100; // min pill width — ensures labels are readable

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
        <span>{"⚙️"}</span>
        <span>{"🔧"}</span>
        <span>{"⚙️"}</span>
      </div>

      {gears.map((g) => (
        <button
          key={g.id}
          type="button"
          className="absolute flex items-center gap-1.5 rounded-full font-bold text-sm shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer px-3 py-1 whitespace-nowrap bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 border-2 border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
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
    const raw = config?.rounds?.length
      ? config.rounds
      : GOTCHA_GEARS_CONTENT[band];
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
  const livesRef = useRef(maxLives);
  const stats = useRef({
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    attempts: 0,
    roundsCompleted: 0,
  });
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gears, setGears] = useState<FallingGear[]>([]);
  const gearsRef = useRef<FallingGear[]>([]);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: "correct" | "wrong";
  } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const resolved = useRef(false);
  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const round = rounds[roundIdx];

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const finishGame = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish(
      buildGotchaCompletionPayload({
        ...stats.current,
        roundsLength: rounds.length,
      }),
    );
  }, [rounds.length, onFinish]);

  const advanceRound = useCallback(() => {
    if (livesRef.current <= 0 || finished.current) return;
    if (roundIdx + 1 >= rounds.length) finishGame();
    else setRoundIdx(roundIdx + 1);
  }, [roundIdx, rounds.length, finishGame]);

  const endRound = useCallback(
    (delay: number) => {
      resolved.current = true;
      stats.current.roundsCompleted++;
      setRoundComplete(true);
      timers.current.push(
        setTimeout(() => {
          setFeedback(null);
          advanceRound();
        }, delay),
      );
    },
    [advanceRound],
  );

  const loseLife = useCallback(() => {
    livesRef.current--;
    setLives(livesRef.current);
    stats.current.streak = 0;
    setStreak(0);
    if (livesRef.current <= 0) setGameOver(true);
  }, []);

  // Spawn each round once. Animation and clicks use the same current gear list
  // so rapid input cannot count one gear twice before React renders again.
  useEffect(() => {
    if (!round) return;
    const labels = [round.correct, ...round.distractors].sort(
      () => Math.random() - 0.5,
    );
    const speed = Math.min(baseSpeed + roundIdx * speedRamp, maxSpeed);
    const slotWidth = 90 / labels.length;
    const next = labels.map((label, i) => ({
      id: `${roundIdx}-${i}`,
      label,
      correct: label === round.correct,
      x: 5 + slotWidth * i + slotWidth / 2 + (Math.random() * 6 - 3),
      y: -GEAR_H - Math.random() * 50,
      speed: speed * (0.85 + Math.random() * 0.3),
    }));
    gearsRef.current = next;
    setGears(next);
    resolved.current = false;
    setRoundComplete(false);
  }, [round, roundIdx, baseSpeed, speedRamp, maxSpeed]);

  useEffect(() => {
    if (gameOver || roundComplete) return;
    let frame = 0;
    const animate = () => {
      if (resolved.current || finished.current) return;
      const next = gearsRef.current.map((g) => ({ ...g, y: g.y + g.speed }));
      if (next.length > 0 && next.every((g) => g.y >= FIELD_H + GEAR_H)) {
        stats.current.attempts++;
        loseLife();
        gearsRef.current = [];
        setGears([]);
        setFeedback({
          text:
            round?.hint ||
            t("games.gotchaGears.missed", {
              defaultValue: "Missed! Try to catch faster!",
            }),
          type: "wrong",
        });
        endRound(1200);
        return;
      }
      gearsRef.current = next;
      setGears(next);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [gameOver, roundComplete, round, loseLife, endRound, t]);

  const handleCatch = useCallback(
    (gearId: string) => {
      if (resolved.current || finished.current || livesRef.current <= 0) return;
      const gear = gearsRef.current.find((g) => g.id === gearId);
      if (!gear) return;
      stats.current.attempts++;
      if (gear.correct) {
        stats.current.score += calculateGotchaCatchScore(stats.current.streak);
        stats.current.streak++;
        stats.current.maxStreak = Math.max(
          stats.current.maxStreak,
          stats.current.streak,
        );
        stats.current.correctCount++;
        setScore(stats.current.score);
        setStreak(stats.current.streak);
        gearsRef.current = [];
        setGears([]);
        const text = t("games.gotchaGears.correct", {
          defaultValue: "Got it!",
        });
        setFeedback({
          text:
            stats.current.streak > 1
              ? `${text} x${stats.current.streak}`
              : text,
          type: "correct",
        });
        endRound(800);
      } else {
        gearsRef.current = gearsRef.current.filter((g) => g.id !== gearId);
        setGears(gearsRef.current);
        loseLife();
        setFeedback({
          text:
            round?.hint ||
            t("games.gotchaGears.wrong", { defaultValue: "Not that one!" }),
          type: "wrong",
        });
        if (livesRef.current <= 0) {
          resolved.current = true;
          stats.current.roundsCompleted++;
        }
      }
    },
    [round, loseLife, endRound, t],
  );

  if (gameOver) {
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">{"⚙️"}</div>
        <h3 className="text-2xl font-extrabold text-slate-800">
          {t("games.gotchaGears.gameOver", { defaultValue: "Great Effort!" })}
        </h3>
        <p className="text-lg text-slate-600">
          {t("games.gotchaGears.scoreLabel", { defaultValue: "Gears Caught" })}:{" "}
          <span className="font-bold text-amber-600">
            {stats.current.correctCount}
          </span>
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
          role="status"
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
    : {
        gameKey: "gotcha_gears_unity",
        rounds: GOTCHA_GEARS_CONTENT[getGradeBand(config)],
      };

  // TODO: add translations for the story, tips in briefing
  const briefing: MissionBriefing = {
    title: pickLocale({ en: "Gear Grab!" }, "Gear Grab!"),
    story: pickLocale(
      {
        en: "Gearbot's gears are falling from the sky! Read the clue and catch the right gear before it hits the ground.",
      },
      "Gearbot's gears are falling from the sky! Read the clue and catch the right gear before it hits the ground.",
    ),
    icon: "⚙️",
    chapterLabel: "Gotcha Gears",
    themeColor: "amber",
    tips: pickLocale(
      {
        en: [
          "Read the clue carefully",
          "Tap the correct gear",
          "Streaks earn bonus points!",
        ],
      },
      [
        "Read the clue carefully",
        "Tap the correct gear",
        "Streaks earn bonus points!",
      ],
    ),
  };

  return (
    <GameShell
      gameKey="gotcha_gears_unity"
      title={t("games.gotchaGears.title", { defaultValue: "Gotcha Gears" })}
      briefing={briefing}
      onComplete={onComplete!}
      useReportedAccuracy
      scoreDisplay="points"
    >
      {({ onFinish, reducedEffects: _reducedEffects }) => (
        <GotchaGearsCore config={gameConfig} onFinish={onFinish} />
      )}
    </GameShell>
  );
}
