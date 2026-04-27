/**
 * Fast Lane Signals — AI + Biotech lane-switching game for K-2.
 *
 * Turn-based: a road signal appears on each of 3 lanes, the learner
 * picks the safest lane, and the cart moves there. Phases progress
 * from simple safe/blocked signals to caution signals and look-ahead planning.
 */
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { type GameResult, type MissionBriefing } from "./shared/GameShell";
import "./shared/game-effects.css";

// ── Types ─────────────────────────────────────────────────────────────────
type Signal = "safe" | "blocked" | "caution";
type GamePhase = "intro" | "practice" | "signals" | "lookAhead" | "challenge" | "exitTicket" | "celebration";
interface LaneState { current: [Signal, Signal, Signal]; next?: [Signal, Signal, Signal]; }

// ── Constants ─────────────────────────────────────────────────────────────
const SIGNAL_ICONS: Record<Signal, string> = { safe: "\u2705", blocked: "\u274C", caution: "\u26A0\uFE0F" };
const SIGNAL_COLORS: Record<Signal, string> = {
  safe: "bg-green-100 border-green-400",
  blocked: "bg-red-100 border-red-400",
  caution: "bg-yellow-100 border-yellow-400",
};
const LANE_LABELS = ["A", "B", "C"];
const PHASE_ORDER: GamePhase[] = ["practice", "signals", "lookAhead", "challenge", "exitTicket", "celebration"];

const BRIEFING: MissionBriefing = {
  title: "Fast Lane Signals",
  story: "Deliver the science supplies safely! Read the road signals and choose the best lane.",
  icon: "\uD83D\uDEA6",
  tips: ["Green means safe", "Red means blocked", "Yellow means watch out \u2014 it might close!"],
  chapterLabel: "Signal School",
  themeColor: "blue",
};

// ── Helpers ───────────────────────────────────────────────────────────────
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function generateLanes(allowCaution: boolean): [Signal, Signal, Signal] {
  const pool: Signal[] = allowCaution ? ["safe", "blocked", "caution"] : ["safe", "blocked"];
  const lanes: Signal[] = [];
  const safeIndex = Math.floor(Math.random() * 3);
  for (let i = 0; i < 3; i++) lanes.push(i === safeIndex ? "safe" : pickRandom(pool));
  return shuffle(lanes) as [Signal, Signal, Signal];
}

export function generateLookAhead(): LaneState {
  let current: [Signal, Signal, Signal], next: [Signal, Signal, Signal], attempts = 0;
  do {
    current = generateLanes(true); next = generateLanes(true); attempts++;
  } while (attempts < 20 && !current.some((s, i) => s === "safe" && next[i] === "safe"));
  return { current, next };
}

export function bestLane(state: LaneState): number {
  const { current, next } = state;
  if (next) {
    const bothSafe = current.map((s, i) => (s === "safe" && next[i] === "safe" ? i : -1)).filter((i) => i >= 0);
    if (bothSafe.length > 0) return bothSafe[0];
    const safeNow = current.map((s, i) => (s === "safe" && next[i] !== "blocked" ? i : -1)).filter((i) => i >= 0);
    if (safeNow.length > 0) return safeNow[0];
  }
  const safeIdx = current.indexOf("safe");
  if (safeIdx >= 0) return safeIdx;
  const cautionIdx = current.indexOf("caution");
  return cautionIdx >= 0 ? cautionIdx : 0;
}

export function scorePick(signal: Signal, isBest: boolean): number {
  if (signal === "blocked") return 0;
  if (signal === "caution") return 5;
  return isBest ? 15 : 10;
}

export function buildFastLaneCompletionPayload(params: {
  score: number;
  maxStreak: number;
  totalRounds: number;
  correctCount: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}): GameResult {
  const { score, maxStreak, totalRounds, correctCount, t } = params;
  const total = Math.max(totalRounds * 15, 1);
  return {
    gameKey: "fast_lane",
    score,
    total,
    streakMax: maxStreak,
    roundsCompleted: totalRounds,
    accuracy: totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0,
    firstTryClear: correctCount === totalRounds,
    achievements: [
      ...(maxStreak >= 5 ? [t("games.fastLane.achStreak", { defaultValue: "Signal Streak x5" })] : []),
      ...(correctCount === totalRounds ? [t("games.fastLane.achPerfect", { defaultValue: "Perfect Driver" })] : []),
    ],
  };
}

// ── Shared lane display ───────────────────────────────────────────────────
function LaneRow({ state, chosenLane, feedbackType, onPick }: {
  state: LaneState; chosenLane: number | null;
  feedbackType: "correct" | "partial" | "wrong"; onPick: (i: number) => void;
}) {
  return (
    <div className="flex gap-4 justify-center">
      {state.current.map((signal, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className={`w-24 h-24 rounded-xl border-2 flex items-center justify-center text-4xl shadow-sm ${SIGNAL_COLORS[signal]}`}>
            {SIGNAL_ICONS[signal]}
          </div>
          {state.next && (
            <div className={`w-16 h-16 rounded-lg border flex items-center justify-center text-xl opacity-50 ${SIGNAL_COLORS[state.next[i]]}`}>
              {SIGNAL_ICONS[state.next[i]]}
            </div>
          )}
          <button
            disabled={chosenLane !== null}
            onClick={() => onPick(i)}
            className={`w-24 h-16 rounded-xl text-xl font-bold border-2 transition-all ${
              chosenLane === i
                ? feedbackType === "correct" ? "bg-green-200 border-green-500 bounce-in"
                  : feedbackType === "partial" ? "bg-yellow-200 border-yellow-500 shake"
                  : "bg-red-200 border-red-500 shake"
                : chosenLane !== null
                  ? "bg-slate-50 border-slate-200 opacity-50"
                  : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95 cursor-pointer"
            }`}
          >
            {chosenLane === i ? "\uD83D\uDE97" : LANE_LABELS[i]}
          </button>
        </div>
      ))}
    </div>
  );
}

function FeedbackBar({ feedback, feedbackType }: { feedback: string | null; feedbackType: string }) {
  if (!feedback) return null;
  return (
    <div className={`text-center py-3 rounded-xl font-bold text-sm ${
      feedbackType === "correct" ? "bg-green-100 text-green-800 bounce-in"
        : feedbackType === "partial" ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800 shake"
    }`}>{feedback}</div>
  );
}

// ── Core Game Component ───────────────────────────────────────────────────
function FastLaneCore({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [laneState, setLaneState] = useState<LaneState>({ current: ["safe", "blocked", "safe"] });
  const [chosenLane, setChosenLane] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"correct" | "partial" | "wrong">("correct");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const roundsForPhase = useMemo(() => {
    if (phase === "challenge") return 8;
    if (phase === "practice" || phase === "signals" || phase === "lookAhead") return 4;
    return 0;
  }, [phase]);

  const setupRound = useCallback((p: GamePhase) => {
    setChosenLane(null);
    setFeedback(null);
    if (p === "practice") setLaneState({ current: generateLanes(false) });
    else if (p === "signals") setLaneState({ current: generateLanes(true) });
    else if (p === "lookAhead") setLaneState(generateLookAhead());
    else if (p === "challenge") setLaneState({ current: generateLanes(true), next: Math.random() > 0.4 ? generateLanes(true) : undefined });
    else if (p === "exitTicket") setLaneState(generateLookAhead());
  }, []);

  const advancePhase = useCallback((next: GamePhase) => {
    setPhase(next); setRoundIndex(0); setupRound(next);
  }, [setupRound]);

  const handlePick = useCallback((laneIdx: number) => {
    if (chosenLane !== null) return;
    setChosenLane(laneIdx);
    const signal = laneState.current[laneIdx];
    const isBest = laneIdx === bestLane(laneState);
    setScore((s) => s + scorePick(signal, isBest));
    setTotalRounds((r) => r + 1);

    if (signal === "safe") {
      setCorrectCount((c) => c + 1);
      setStreak((s) => { const ns = s + 1; setMaxStreak((m) => Math.max(m, ns)); return ns; });
      setFeedbackType("correct");
      setFeedback(isBest
        ? t("games.fastLane.perfectPick", { defaultValue: "Perfect pick! Best lane!" })
        : t("games.fastLane.safePick", { defaultValue: "Safe! Good choice!" }));
    } else if (signal === "caution") {
      setStreak(0); setFeedbackType("partial");
      setFeedback(t("games.fastLane.cautionPick", { defaultValue: "Careful! That lane might close soon." }));
    } else {
      setStreak(0); setFeedbackType("wrong");
      setFeedback(t("games.fastLane.blockedPick", { defaultValue: "Oops! That lane was blocked." }));
    }
  }, [chosenLane, laneState, t]);

  const handleNext = useCallback(() => {
    const next = roundIndex + 1;
    if (next >= roundsForPhase) {
      const idx = PHASE_ORDER.indexOf(phase);
      if (idx >= 0 && idx < PHASE_ORDER.length - 1) advancePhase(PHASE_ORDER[idx + 1]);
    } else { setRoundIndex(next); setupRound(phase); }
  }, [roundIndex, roundsForPhase, phase, advancePhase, setupRound]);

  const handleFinish = useCallback(() => {
    onFinish(buildFastLaneCompletionPayload({ score, maxStreak, totalRounds, correctCount, t }));
  }, [score, maxStreak, totalRounds, correctCount, onFinish, t]);

  // ── Intro ───────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="slide-up-fade text-center space-y-6 py-8">
        <div className="text-7xl float-idle">{"\uD83D\uDEA6"}</div>
        <h2 className="text-3xl font-extrabold text-blue-900">
          {t("games.fastLane.title", { defaultValue: "Fast Lane Signals" })}
        </h2>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          {t("games.fastLane.introText", { defaultValue: "Read the road signals and pick the safest lane to deliver your science supplies!" })}
        </p>
        <button
          className="bounce-in px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xl font-bold rounded-2xl shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transition-transform"
          onClick={() => advancePhase("practice")}
        >{t("games.fastLane.letsGo", { defaultValue: "Let's Go!" })}</button>
      </div>
    );
  }

  // ── Celebration ─────────────────────────────────────────────────────────
  if (phase === "celebration") {
    return (
      <div className="slide-up-fade text-center space-y-6 py-8">
        <div className="text-7xl bounce-in">{"\uD83C\uDF89"}</div>
        <h2 className="text-2xl font-extrabold text-blue-900">
          {t("games.fastLane.celebTitle", { defaultValue: "Great driving!" })}
        </h2>
        <p className="text-lg text-slate-600 max-w-sm mx-auto">
          {t("games.fastLane.celebText", { defaultValue: "You watched the signals and made smart choices!" })}
        </p>
        <div className="flex gap-4 justify-center text-sm">
          <div className="bg-white rounded-xl px-4 py-3 shadow border">
            <p className="text-2xl font-extrabold text-indigo-600">{score}</p>
            <p className="text-xs text-slate-500">{t("games.shared.score", { defaultValue: "Score" })}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow border">
            <p className="text-2xl font-extrabold text-amber-500">{maxStreak}</p>
            <p className="text-xs text-slate-500">{t("games.fastLane.bestStreak", { defaultValue: "Best Streak" })}</p>
          </div>
        </div>
        <button
          className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={handleFinish}
        >{t("games.shared.finish", { defaultValue: "Finish" })}</button>
      </div>
    );
  }

  // ── Exit Ticket ─────────────────────────────────────────────────────────
  if (phase === "exitTicket") {
    return (
      <div className="slide-up-fade space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-blue-900">
            {t("games.fastLane.exitTitle", { defaultValue: "Final Check!" })}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {t("games.fastLane.exitPrompt", { defaultValue: "Which lane is safest?" })}
          </p>
        </div>
        {laneState.next && (
          <p className="text-center text-xs text-slate-400">
            {t("games.fastLane.nextTurnLabel", { defaultValue: "Next turn signals shown below" })}
          </p>
        )}
        <LaneRow state={laneState} chosenLane={chosenLane} feedbackType={feedbackType} onPick={handlePick} />
        <FeedbackBar feedback={feedback} feedbackType={feedbackType} />
        {chosenLane !== null && (
          <div className="text-center">
            <button
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow hover:scale-105 active:scale-95 transition-transform"
              onClick={() => advancePhase("celebration")}
            >{t("games.fastLane.seeResults", { defaultValue: "See Results" })}</button>
          </div>
        )}
      </div>
    );
  }

  // ── Gameplay (practice / signals / lookAhead / challenge) ───────────────
  const phaseLabel: Record<string, string> = {
    practice: t("games.fastLane.phasePractice", { defaultValue: "Practice" }),
    signals: t("games.fastLane.phaseSignals", { defaultValue: "Signal Training" }),
    lookAhead: t("games.fastLane.phaseLookAhead", { defaultValue: "Look Ahead" }),
    challenge: t("games.fastLane.phaseChallenge", { defaultValue: "Challenge" }),
  };
  const phaseHint: Record<string, string> = {
    practice: t("games.fastLane.hintPractice", { defaultValue: "Pick the lane with a green signal!" }),
    signals: t("games.fastLane.hintSignals", { defaultValue: "Avoid red AND yellow signals." }),
    lookAhead: t("games.fastLane.hintLookAhead", { defaultValue: "Check both rows. Pick the lane that stays safe!" }),
    challenge: t("games.fastLane.hintChallenge", { defaultValue: "Use everything you learned!" }),
  };

  return (
    <div className="slide-up-fade space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-blue-500">{phaseLabel[phase] ?? phase}</span>
          <span className="text-xs text-slate-400 ml-2">
            {t("games.fastLane.roundOf", { defaultValue: "Round {{n}} of {{total}}", n: roundIndex + 1, total: roundsForPhase })}
          </span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="font-bold text-indigo-600">{t("games.shared.score", { defaultValue: "Score" })}: {score}</span>
          {streak >= 2 && <span className="font-bold text-amber-500 streak-fire">{"\uD83D\uDD25"} {streak}</span>}
        </div>
      </div>
      <p className="text-center text-sm text-slate-500">{phaseHint[phase]}</p>
      {laneState.next && (
        <p className="text-center text-xs text-slate-400">{t("games.fastLane.nextTurnLabel", { defaultValue: "Next turn signals shown below" })}</p>
      )}
      <LaneRow state={laneState} chosenLane={chosenLane} feedbackType={feedbackType} onPick={handlePick} />
      <FeedbackBar feedback={feedback} feedbackType={feedbackType} />
      {chosenLane !== null && (
        <div className="text-center">
          <button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow hover:scale-105 active:scale-95 transition-transform"
            onClick={handleNext}
          >{t("games.fastLane.nextRound", { defaultValue: "Next" })}</button>
        </div>
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────
export default function FastLaneGame({ onComplete }: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) {
  return (
    <GameShell gameKey="fast_lane" title="Fast Lane Signals" briefing={BRIEFING} onComplete={onComplete ?? (() => {})}>
      {({ onFinish }) => <FastLaneCore onFinish={onFinish} />}
    </GameShell>
  );
}
