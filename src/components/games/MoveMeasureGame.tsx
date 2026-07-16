/**
 * Move, Measure & Improve — biotech / track-and-field STEM game for K-2.
 *
 * Phases: intro → dash → jump → toss → compare → improve → retry → exitTicket → celebration
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { type GameResult, type MissionBriefing } from "./shared/GameShell";
import "./shared/game-effects.css";
import { pickLocale } from "@/utils/localizedContent";
import { getGradeBand, BAND_CONFIG, type GradeBand } from "./gradeBandContent";

// ── Types & constants ────────────────────────────────────────────────────
type Phase = "intro" | "predict" | "dash" | "jump" | "toss" | "compare" | "eventCompare" | "improve" | "retry" | "exitTicket" | "celebration";
interface Scores { dash: number; jump: number; toss: number }
type EventKey = keyof Scores;

const GZ_DASH = { s: 0.3, e: 0.4 };
const GZ_JUMP = { s: 0.6, e: 0.8 };
const IDEAL_TOSS = 50;
const ICONS: Record<string, string> = { dash: "🏃", jump: "🦘", toss: "🥎" };
const NAMES: Record<string, string> = { dash: "Dash", jump: "Jump", toss: "Toss" };
const EVENT_ORDER: EventKey[] = ["dash", "jump", "toss"];

export function zoneScore(pos: number, s: number, e: number): number {
  const c = (s + e) / 2, hw = (e - s) / 2, d = Math.abs(pos - c);
  return d <= hw ? 10 : Math.max(0, Math.round(10 - (d - hw) * 20));
}
export function tossScore(v: number) { return Math.max(0, Math.round(10 - Math.abs(v - IDEAL_TOSS) * 0.2)); }

export function dashMeasurement(pos: number) {
  return 3 + pos * 3;
}

export function jumpMeasurement(level: number) {
  return 0.8 + level * 1.2;
}

export function tossMeasurement(value: number) {
  return value * 0.2;
}

export function buildMoveMeasureCompletionPayload(params: {
  scores: Scores;
  impEvent: EventKey | null;
  impScore: number;
  exitAns: string | null;
}): GameResult {
  const { scores, impEvent, impScore, exitAns } = params;
  const base = scores.dash + scores.jump + scores.toss;
  const bonus = impScore > (impEvent ? scores[impEvent] : 0) ? 5 : 0;
  const eBonus = exitAns === "correct" ? 5 : 0;
  const total = base + bonus + eBonus;
  return {
    gameKey: "move_measure",
    score: total,
    total: 40,
    streakMax: 0,
    roundsCompleted: 3,
    accuracy: Math.round((total / 40) * 100),
    gameSpecific: { dash: scores.dash, jump: scores.jump, toss: scores.toss, impEvent, impScore, exitCorrect: exitAns === "correct" },
  };
}

// TODO: add translations for the story, tips in briefing
const BRIEFING: MissionBriefing = {
  title: pickLocale({ en: "Move, Measure & Improve", es: "Mueve, Mide y Mejora", vi: "Đi, Đo và Cải Thiện", "zh-CN": "动、量、进步" }, "Move, Measure & Improve"),
  story: pickLocale({
    en: "Test your body's superpowers! Dash, jump, and toss — then use what you learn to get even better.",
  }, "Test your body's superpowers! Dash, jump, and toss — then use what you learn to get even better."),
  icon: "🏃",
  tips: pickLocale({
    en: ["Tap at the right moment", "Watch the green zone", "Try again to improve!"],
  }, ["Tap at the right moment", "Watch the green zone", "Try again to improve!"]),
  chapterLabel: "Body Lab",
  themeColor: "emerald",
};

// ── Reusable bar component ───────────────────────────────────────────────
function ZoneBar({ pos, gs, ge, vertical, stopped }: { pos: number; gs: number; ge: number; vertical: boolean; stopped: boolean }) {
  const inZone = pos >= gs && pos <= ge;
  const green = vertical
    ? { bottom: `${gs * 100}%`, height: `${(ge - gs) * 100}%`, left: 0, right: 0 }
    : { left: `${gs * 100}%`, width: `${(ge - gs) * 100}%`, top: 0, bottom: 0 };
  const marker = vertical
    ? { bottom: `${pos * 100}%`, left: "50%", transform: "translate(-50%, 50%)" }
    : { left: `${pos * 100}%`, top: "50%", transform: "translate(-50%, -50%)" };
  return (
    <div className={vertical ? "relative w-16 h-64 rounded-2xl bg-slate-200 overflow-hidden mx-auto" : "relative w-full h-16 rounded-2xl bg-slate-200 overflow-hidden"}>
      <div className="absolute bg-emerald-300/60 rounded" style={green} />
      <div className={`absolute w-6 h-6 rounded-full shadow-lg border-2 transition-colors ${stopped ? (inZone ? "bg-emerald-500 border-emerald-700" : "bg-red-400 border-red-600") : "bg-amber-400 border-amber-600"}`} style={marker} />
    </div>
  );
}

// ── Score feedback ───────────────────────────────────────────────────────
function ScoreFeedback({ score, t }: { score: number; t: (k: string, o?: Record<string, string>) => string }) {
  const label = score >= 8 ? t("games.moveMeasure.great", { defaultValue: "Great!" }) : score >= 5 ? t("games.moveMeasure.good", { defaultValue: "Good!" }) : t("games.moveMeasure.tryHarder", { defaultValue: "Keep trying!" });
  return (
    <div className="bounce-in space-y-2">
      <p className="text-4xl font-extrabold text-emerald-700">{score}/10</p>
      <p className="text-lg text-slate-500">{label}</p>
    </div>
  );
}

// ── Big action button ────────────────────────────────────────────────────
function BigBtn({ gradient, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { gradient: string }) {
  return <button className={`bg-gradient-to-r ${gradient} text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform min-w-[200px]`} {...props}>{children}</button>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Inner playfield
// ═══════════════════════════════════════════════════════════════════════════
function MoveMeasurePlayfield({ 
    band, 
    onFinish }: { 
        band: GradeBand,
        onFinish: (r: GameResult) => void 
    }) {
  const config = BAND_CONFIG[band];
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [scores, setScores] = useState<Scores>({ dash: 0, jump: 0, toss: 0 });
  const [impEvent, setImpEvent] = useState<EventKey | null>(null);
  const [impScore, setImpScore] = useState(0);
  const [cmpAns, setCmpAns] = useState<string | null>(null);
  const [exitAns, setExitAns] = useState<string | null>(null);
  const [diffCorrect, setDiffCorrect] = useState(false);
  const [diffFeedback, setDiffFeedback] = useState("");
  

  // Dash
  const [dashPos, setDashPos] = useState(0);
  const [dashDone, setDashDone] = useState(false);
  const dashRaf = useRef(0);
  // Jump
  const [jLevel, setJLevel] = useState(0);
  const [jHold, setJHold] = useState(false);
  const [jDone, setJDone] = useState(false);
  const jRaf = useRef(0);
  const jDir = useRef(1);
  // Toss — starts at 0 (not perfect). Player has to slide to find the sweet spot.
  const [tVal, setTVal] = useState(0);
  const [tDone, setTDone] = useState(false);
  // Improve
  const [selTip, setSelTip] = useState<number | null>(null);
  const isRetry = phase === "retry";

  const [measurements, setMeasurements] = useState({
    dash: 0,
    jump: 0,
    toss: 0,
  });

  const [predictions, setPredictions] = useState<Record<EventKey, number>>({
    dash: 0,
    jump: 0,
    toss: 0,
  });

  const [eventIndex, setEventIndex] = useState(0);
  const currentEvent = EVENT_ORDER[eventIndex];

  const goToNextPhase = () => {
    setDiffCorrect(false);
    setDiffFeedback("");
    const nextIndex = eventIndex + 1;

    if (nextIndex < EVENT_ORDER.length) {
      setEventIndex(nextIndex);
      if (config.enablePredict) {
        setPhase("predict");
      }
      else {
        setPhase(EVENT_ORDER[nextIndex]);
      }
    } else {
      setPhase("compare");
    }
  };

  function getMeasurement(ev: EventKey) {
    return measurements[ev];
  }

  // ── Dash anim ──
  useEffect(() => {
    if ((phase !== "dash" && !(isRetry && impEvent === "dash")) || dashDone) return;
    let p = 0;
    const go = () => { p += 0.012; if (p > 1) p = 0; setDashPos(p); dashRaf.current = requestAnimationFrame(go); };
    dashRaf.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(dashRaf.current);
  }, [phase, dashDone, impEvent, isRetry]);

  const tapDash = useCallback(() => { if (!dashDone) { cancelAnimationFrame(dashRaf.current); setDashDone(true); } }, [dashDone]);

  useEffect(() => {
    if (!dashDone) return;
    const sc = zoneScore(dashPos, GZ_DASH.s, GZ_DASH.e);
    const measured = dashMeasurement(dashPos);
    setMeasurements(m => ({
      ...m,
      dash: measured,
    }));
    if (isRetry) { setImpScore(sc); const t = setTimeout(() => setPhase("exitTicket"), 1200); return () => clearTimeout(t); }
    setScores(p => ({ ...p, dash: sc }));
    const t = setTimeout(() => { 
        if (config.enablePredict) {
            setPhase("eventCompare");
        } else {
            goToNextPhase();
        } 
    }, 1200);
    return () => clearTimeout(t);
  }, [dashDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Jump anim ──
  useEffect(() => {
    if ((phase !== "jump" && !(isRetry && impEvent === "jump")) || !jHold || jDone) return;
    let lv = 0; jDir.current = 1;
    const go = () => { lv += 0.015 * jDir.current; if (lv >= 1) { lv = 1; jDir.current = -1; } if (lv <= 0) { lv = 0; jDir.current = 1; } setJLevel(lv); jRaf.current = requestAnimationFrame(go); };
    jRaf.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(jRaf.current);
  }, [phase, jHold, jDone, impEvent, isRetry]);

  const relJump = useCallback(() => { if (!jDone) { cancelAnimationFrame(jRaf.current); setJDone(true); } }, [jDone]);

  useEffect(() => {
    if (!jDone) return;
    const sc = zoneScore(jLevel, GZ_JUMP.s, GZ_JUMP.e);
    const measured = jumpMeasurement(jLevel);
    setMeasurements(m => ({
    ...m,
    jump: measured,
    }));
    if (isRetry) { setImpScore(sc); const t = setTimeout(() => setPhase("exitTicket"), 1200); return () => clearTimeout(t); }
    setScores(p => ({ ...p, jump: sc }));
    const t = setTimeout(() => { 
        if (config.enablePredict) {
            setPhase("eventCompare");
        } else {
            goToNextPhase();
        } 
    }, 1200);
    return () => clearTimeout(t);
  }, [jDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toss ──
  const relToss = useCallback(() => setTDone(true), []);

  useEffect(() => {
    if (!tDone) return;
    const sc = tossScore(tVal);
    const measured = tossMeasurement(tVal);
    setMeasurements(m => ({
    ...m,
    toss: measured,
    }));
    if (isRetry) { setImpScore(sc); const t = setTimeout(() => setPhase("exitTicket"), 1200); return () => clearTimeout(t); }
    setScores(p => ({ ...p, toss: sc }));
    const t = setTimeout(() => { 
        if (config.enablePredict) {
            setPhase("eventCompare");
        } else {
            goToNextPhase();
        }
    }, 1200);
    return () => clearTimeout(t);
  }, [tDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compare ── tie-aware: handles all-tied (including perfect runs) and two-way ties
  const allEvents: EventKey[] = ["dash", "jump", "toss"];
  const maxScore = Math.max(scores.dash, scores.jump, scores.toss);
  const bestEvents = allEvents.filter((e) => scores[e] === maxScore);
  const clearWinner: EventKey | null = bestEvents.length === 1 ? bestEvents[0] : null;
  const allTied = bestEvents.length === 3;
  const twoTied = bestEvents.length === 2;
  const allPerfect = allTied && maxScore === 10;

  // ── Event Compare ──
  const prediction = predictions[currentEvent];
  const actual = measurements[currentEvent];
  const correct = Number(Math.abs(prediction - actual).toFixed(1));

  const choices = useMemo(() => {
    const distractors =
      correct === 0
        ? [0.1, 0.2]
        : [
            Number((correct + 0.2).toFixed(1)),
            Number(Math.max(0, correct - 0.2).toFixed(1)),
            ];

    return [
        correct,
        ...distractors,
    ].sort(() => Math.random() - 0.5);

    }, [correct]);

  // ── Improve ──
  const tips = [
    { label: t("games.moveMeasure.tipFocus", { defaultValue: "Focus on timing" }), ev: "dash" as EventKey },
    { label: t("games.moveMeasure.tipPower", { defaultValue: "Control your power" }), ev: "jump" as EventKey },
    { label: t("games.moveMeasure.tipAim", { defaultValue: "Aim carefully" }), ev: "toss" as EventKey },
  ];

  const pickTip = useCallback((i: number) => {
    setSelTip(i); setImpEvent(tips[i].ev);
    setDashPos(0); setDashDone(false); setJLevel(0); setJHold(false); setJDone(false); setTVal(0); setTDone(false);
    setTimeout(() => setPhase("retry"), 800);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exit ticket ──
  const exits = [
    { text: t("games.moveMeasure.exitA", { defaultValue: "I guessed" }), ok: false },
    { text: t("games.moveMeasure.exitB", { defaultValue: "I measured and compared" }), ok: true },
    { text: t("games.moveMeasure.exitC", { defaultValue: "I asked a friend" }), ok: false },
  ];

  const answerExit = useCallback((i: number) => {
    setExitAns(exits[i].ok ? "correct" : "wrong");
    setTimeout(() => setPhase("celebration"), 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Celebration → finish ──
  useEffect(() => {
    if (phase !== "celebration") return;
    const tm = setTimeout(() => onFinish(buildMoveMeasureCompletionPayload({ scores, impEvent, impScore, exitAns })), 2500);
    return () => clearTimeout(tm);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event header helper ──
  const evHeader = (icon: string, titleKey: string, dv: string, instrKey: string, instrDv: string, eventNum: string) => (
    <>
      <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">{isRetry ? t("games.moveMeasure.retryLabel", { defaultValue: "Retry!" }) : eventNum}</p>
      <h3 className="text-2xl font-extrabold text-slate-800">{icon} {t(titleKey, { defaultValue: dv })}</h3>
      <p className="text-base text-slate-600">{t(instrKey, { defaultValue: instrDv })}</p>
    </>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

if (phase === "intro") {
  return (
    <div className="slide-up-fade text-center space-y-6 py-8">
      <div className="text-7xl float-idle">🏃</div>

      <h2 className="text-3xl font-extrabold text-emerald-800">
        {t("games.moveMeasure.title", {
          defaultValue: "Move, Measure & Improve",
        })}
      </h2>

      <p className="text-lg text-slate-600 max-w-md mx-auto">
        {t("games.moveMeasure.introText", {
          defaultValue:
            "Complete 3 events, compare your scores, then improve one!",
        })}
      </p>

      <button
        className="bounce-in bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xl font-bold px-10 py-4 rounded-2xl shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform"
        onClick={() => {
          setEventIndex(0);
          if (config.enablePredict){
            setPhase("predict");
          }
          else {
            setPhase(EVENT_ORDER[0]);
          }
        }}
      >
        {t("games.moveMeasure.letsGo", {
          defaultValue: "Let's Go!",
        })}
      </button>
    </div>
  );
}

  if (phase === "predict") {
  const range = {
    dash: { min: 3, max: 6 },
    jump: { min: 0.8, max: 2 },
    toss: { min: 0, max: 20 },
  }[currentEvent];

  const value =
    predictions[currentEvent] ?? range.min;

  const setValue = (v: number) => {
    setPredictions((p) => ({
      ...p,
      [currentEvent]: v,
    }));
  };

  return (
    <div className="slide-up-fade text-center space-y-6 py-6">
      <h3 className="text-2xl font-extrabold text-slate-800">
        🔮 {t("games.moveMeasure.predictTitle", {
          defaultValue: "Make a Prediction",
        })}
      </h3>

      <p className="text-base text-slate-600">
        {t("games.moveMeasure.predictText", {
          defaultValue: "Before you try, predict where you think you'll land!",
        })}
      </p>

      {/* Event label */}
      <div className="text-lg font-bold text-emerald-700">
        {ICONS[currentEvent]} {NAMES[currentEvent]}
      </div>

      {/* Slider */}
      <div className="max-w-sm mx-auto space-y-4">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={0.1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        <div className="flex justify-between text-xs text-slate-400 font-bold">
          <span>{t("games.moveMeasure.low", { defaultValue: "Low" })}</span>
          <span>{t("games.moveMeasure.high", { defaultValue: "High" })}</span>
        </div>
      </div>

      {/* Prediction display */}
      <p className="text-xl font-bold text-slate-700">
        {t("games.moveMeasure.yourPrediction", {
          defaultValue: "Your prediction:",
        })}{" "}
        {value.toFixed(1)} m
      </p>

      {/* Hint */}
      <p className="text-sm text-slate-500">
        You will compare your prediction with your actual result after the activity.
      </p>

      {/* Start button */}
      <BigBtn
        gradient="from-emerald-500 to-emerald-600"
        onClick={() => setPhase(currentEvent)}
      >
        {t("games.moveMeasure.start", { defaultValue: "Start!" })}
      </BigBtn>
    </div>
  );
}

  if (phase === "dash" || (isRetry && impEvent === "dash")) {
    const sc = dashDone ? zoneScore(dashPos, GZ_DASH.s, GZ_DASH.e) : null;
    return (
      <div className="slide-up-fade text-center space-y-6 py-6">
        {evHeader("🏃", "games.moveMeasure.dashTitle", "Dash", "games.moveMeasure.dashInstr", "Tap when the marker is in the green zone!", t("games.moveMeasure.event1", { defaultValue: "Event 1 of 3" }))}
        <div className="max-w-sm mx-auto"><ZoneBar pos={dashPos} gs={GZ_DASH.s} ge={GZ_DASH.e} vertical={false} stopped={dashDone} /></div>
        {!dashDone && <BigBtn gradient="from-amber-400 to-amber-500" onClick={tapDash}>{t("games.moveMeasure.tap", { defaultValue: "TAP!" })}</BigBtn>}
        {sc !== null && (
        <>
            {config.showDecimals && (
            <p className="text-xl font-bold text-slate-700">
                Distance:{" "}
                {dashMeasurement(dashPos).toFixed(config.decimalPlaces)} m
            </p>
            )}

            {config.showScore && (
            <ScoreFeedback score={sc} t={t} />
            )}
        </>
        )}
      </div>
    );
  }

  if (phase === "jump" || (isRetry && impEvent === "jump")) {
    const sc = jDone ? zoneScore(jLevel, GZ_JUMP.s, GZ_JUMP.e) : null;
    return (
      <div className="slide-up-fade text-center space-y-6 py-6">
        {evHeader("🦘", "games.moveMeasure.jumpTitle", "Jump", "games.moveMeasure.jumpInstr", "Hold the button, release in the green zone!", t("games.moveMeasure.event2", { defaultValue: "Event 2 of 3" }))}
        <div className="max-w-sm mx-auto"><ZoneBar pos={jLevel} gs={GZ_JUMP.s} ge={GZ_JUMP.e} vertical={true} stopped={jDone} /></div>
        {!jDone && !jHold && <BigBtn gradient="from-sky-400 to-sky-500" onPointerDown={() => setJHold(true)}>{t("games.moveMeasure.holdMe", { defaultValue: "HOLD ME!" })}</BigBtn>}
        {!jDone && jHold && <BigBtn gradient="from-emerald-400 to-emerald-500" onPointerUp={relJump} onPointerLeave={relJump}><span className="streak-fire">{t("games.moveMeasure.release", { defaultValue: "RELEASE!" })}</span></BigBtn>}
        {sc !== null && (
        <>
            {config.showDecimals && (
            <p className="text-xl font-bold text-slate-700">
                Height:{" "}
                {jumpMeasurement(jLevel).toFixed(config.decimalPlaces)} m
            </p>
            )}

            {config.showScore && (
            <ScoreFeedback score={sc} t={t} />
            )}
        </>
        )}
      </div>
    );
  }

  if (phase === "toss" || (isRetry && impEvent === "toss")) {
    const sc = tDone ? tossScore(tVal) : null;
    return (
      <div className="slide-up-fade text-center space-y-6 py-6">
        {evHeader("🥎", "games.moveMeasure.tossTitle", "Toss", "games.moveMeasure.tossInstr", "Slide to pick your angle, then throw!", t("games.moveMeasure.event3", { defaultValue: "Event 3 of 3" }))}
        <div className="max-w-sm mx-auto space-y-4">
          <input type="range" min={0} max={100} value={tVal} onChange={e => !tDone && setTVal(Number(e.target.value))} disabled={tDone} className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          <div className="flex justify-between text-xs text-slate-400 font-bold">
            <span>{t("games.moveMeasure.low", { defaultValue: "Low" })}</span>
            <span>{t("games.moveMeasure.high", { defaultValue: "High" })}</span>
          </div>
        </div>
        {!tDone && <BigBtn gradient="from-purple-400 to-purple-500" onClick={relToss}>{t("games.moveMeasure.throw", { defaultValue: "THROW!" })}</BigBtn>}
        {sc !== null && (
        <>
            {config.showDecimals && (
            <p className="text-xl font-bold text-slate-700">
                Distance:{" "}
                {tossMeasurement(tVal).toFixed(config.decimalPlaces)} m
            </p>
            )}

            {config.showScore && (
            <ScoreFeedback score={sc} t={t} />
            )}
        </>
        )}
      </div>
    );
  }

/* Compare prediction and actual result for g3-5 students */
if (phase === "eventCompare") {
  return (
    <div className="slide-up-fade text-center space-y-6 py-6">

      <h3 className="text-2xl font-extrabold">
        {ICONS[currentEvent]} {NAMES[currentEvent]}
      </h3>

      <div className="flex justify-center gap-10">
        <div>
          <p className="text-xs">Prediction</p>
          <p className="text-3xl font-bold">
            {prediction.toFixed(1)} m
          </p>
        </div>

        <div className="text-2xl self-center">→</div>

        <div>
          <p className="text-xs">Actual</p>
          <p className="text-3xl font-bold">
            {actual.toFixed(1)} m
          </p>
        </div>
      </div>

      <p className="text-lg font-bold text-slate-700">
        How far off was your prediction?
      </p>

      <div className="flex justify-center gap-3 flex-wrap">
        {choices.map((choice) => {
          const correctChoice = choice === correct;

          return (
            <button
              key={choice}
              disabled={diffCorrect}
              className={`px-6 py-3 rounded-2xl text-lg font-bold shadow transition-transform hover:scale-105 active:scale-95 min-w-[100px]
                ${
                  diffCorrect
                    ? correctChoice
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                    : "bg-white border-2 border-slate-200 text-slate-700"
                }`}
              onClick={() => {
                if (choice === correct) {
                  setDiffCorrect(true);
                  setDiffFeedback(
                    t("games.moveMeasure.diffCorrect", {
                      defaultValue:
                        "Nice! You calculated the difference correctly.",
                    })
                  );
                } else {
                  setDiffFeedback(
                    t("games.moveMeasure.diffTryAgain", {
                      defaultValue: "Not quite. Try again!",
                    })
                  );
                }
              }}
            >
              {choice.toFixed(1)} m
            </button>
          );
        })}
      </div>

      {diffFeedback && (
        <p
          className={`bounce-in text-lg font-bold ${
            diffCorrect ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {diffFeedback}
        </p>
      )}

      {diffCorrect && (
        <BigBtn
          gradient="from-emerald-500 to-emerald-600"
          onClick={() => {
            setDiffCorrect(false);
            setDiffFeedback("");
            goToNextPhase();
          }}
        >
          Continue
        </BigBtn>
      )}
    </div>
  );
}



if (phase === "compare") {
  const preferenceMode = allTied || twoTied;
  const tiedNames = twoTied ? bestEvents.map((e) => NAMES[e]).join(" AND ") : "";

  return (
    <div className="slide-up-fade text-center space-y-6 py-6">
      <h3 className="text-2xl font-extrabold text-slate-800">
        📊 {t("games.moveMeasure.compareTitle", { defaultValue: "Compare Your Results" })}
      </h3>

      {allPerfect && (
        <p className="bounce-in text-xl font-extrabold text-emerald-700">
          {t("games.moveMeasure.acedEvery", { defaultValue: "You aced every event! 🏆" })}
        </p>
      )}

      {allTied && !allPerfect && (
        <p className="bounce-in text-lg font-bold text-emerald-700">
          {t("games.moveMeasure.consistent", {
            defaultValue: "Nice — you were consistent across every event!",
          })}
        </p>
      )}

      {twoTied && (
        <p className="bounce-in text-lg font-bold text-emerald-700">
          {t("games.moveMeasure.tiedBest", {
            first: NAMES[bestEvents[0]],
            second: NAMES[bestEvents[1]],
            defaultValue: `You tied your best in ${tiedNames}!`,
          })}
        </p>
      )}

      {/* RESULTS VISUALIZATION */}
      <div className="flex justify-center gap-6">
        {(["dash", "jump", "toss"] as const).map((ev) => {
          const measurement = getMeasurement(ev);

          return (
            <div key={ev} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{ICONS[ev]}</span>

              <div className="w-12 bg-slate-200 rounded-full overflow-hidden" style={{ height: 120 }}>
                <div
                  className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-full transition-all duration-700"
                  style={{
                    height: `${scores[ev] * 10}%`,
                    marginTop: `${100 - scores[ev] * 10}%`,
                  }}
                />
              </div>

              {/* Score (still internal concept) */}
              <span className="text-sm font-bold text-slate-700">
                {scores[ev]}/10
              </span>

              {/* Measurement (Grade 3–5 focus) */}
              {config.compareMeasurements && (
                <div className="text-xs text-slate-500 text-center space-y-1">
                    <div>
                    Predicted: {predictions[ev].toFixed(config.decimalPlaces)} m
                    </div>

                    <div>
                    Actual: {measurement.toFixed(config.decimalPlaces)} m
                    </div>

                <div className="font-semibold text-emerald-700">
                Difference:{" "}
                {Math.abs(measurement - predictions[ev]).toFixed(config.decimalPlaces)} m
                </div>
            </div>
            )}

              <span className="text-xs text-slate-500">
                {NAMES[ev]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-lg font-bold text-slate-700">
        {preferenceMode
          ? t("games.moveMeasure.whichEnjoyed", {
              defaultValue: "Which event did you enjoy the most?",
            })
          : t("games.moveMeasure.whichBest", {
              defaultValue: "Which event went best?",
            })}
      </p>

      <div className="flex justify-center gap-3 flex-wrap">
        {(["dash", "jump", "toss"] as const).map((ev) => {
          const isPicked = cmpAns === ev;
          const isCorrect = preferenceMode ? isPicked : isPicked && ev === clearWinner;
          const isWrong = !preferenceMode && isPicked && ev !== clearWinner;

          return (
            <button
              key={ev}
              disabled={cmpAns !== null}
              className={`px-6 py-3 rounded-2xl text-lg font-bold shadow transition-transform hover:scale-105 active:scale-95 min-w-[120px]
              ${
                isCorrect
                  ? "bg-emerald-500 text-white"
                  : isWrong
                  ? "bg-red-300 text-white shake"
                  : "bg-white border-2 border-slate-200 text-slate-700"
              }`}
              onClick={() => {
                setCmpAns(ev);
                setTimeout(() => setPhase("improve"), 1200);
              }}
            >
              {ICONS[ev]} {NAMES[ev]}
            </button>
          );
        })}
      </div>

      {cmpAns !== null && (
        <p
          className={`bounce-in text-lg font-bold ${
            preferenceMode || cmpAns === clearWinner
              ? "text-emerald-600"
              : "text-amber-600"
          }`}
        >
          {preferenceMode
            ? t("games.moveMeasure.enjoyAck", {
                defaultValue: "Great choice — everyone has a favorite!",
              })
            : cmpAns === clearWinner
            ? t("games.moveMeasure.correct", { defaultValue: "Correct!" })
            : t("games.moveMeasure.notQuite", {
                defaultValue: "Not quite — but good thinking!",
              })}
        </p>
      )}
    </div>
  );
}


  if (phase === "improve") {
  return (
    <div className="slide-up-fade text-center space-y-6 py-6">
      <h3 className="text-2xl font-extrabold text-slate-800">
        🔬 {t("games.moveMeasure.improveTitle", { defaultValue: "Pick a Coaching Tip" })}
      </h3>

      <p className="text-base text-slate-600">
        {t("games.moveMeasure.improveText", {
          defaultValue: "Choose a tip, then retry that event!",
        })}
      </p>

      <div className="flex flex-col items-center gap-3">
        {tips.map((tip, i) => (
          <button
            key={i}
            disabled={selTip !== null}
            className={`px-8 py-4 rounded-2xl text-lg font-bold shadow transition-transform hover:scale-105 active:scale-95 min-w-[250px]
            ${
              selTip === i
                ? "bg-emerald-500 text-white"
                : "bg-white border-2 border-slate-200 text-slate-700"
            }`}
            onClick={() => pickTip(i)}
          >
            {ICONS[tip.ev]} {tip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

  if (phase === "exitTicket") {
  const before = impEvent ? scores[impEvent] : 0;
  const improved = impScore > before;

  return (
    <div className="slide-up-fade text-center space-y-6 py-6">
      {impEvent && (
        <div className="bounce-in space-y-2">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            {ICONS[impEvent]} {NAMES[impEvent]}{" "}
            {t("games.moveMeasure.results", { defaultValue: "Results" })}
          </p>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-slate-400 font-bold">
                {t("games.moveMeasure.before", { defaultValue: "Before" })}
              </p>
              <p className="text-3xl font-extrabold text-slate-500">
                {before}
              </p>
          {config.compareMeasurements && (
            <p className="text-xs text-slate-500">
              {measurements[impEvent!].toFixed(config.decimalPlaces)} m
            </p>
          )}
            </div>

            <div className="text-2xl self-center">→</div>

            <div className="text-center">
              <p className="text-xs text-slate-400 font-bold">
                {t("games.moveMeasure.after", { defaultValue: "After" })}
              </p>
              <p
                className={`text-3xl font-extrabold ${
                  improved ? "text-emerald-600 streak-fire" : "text-amber-500"
                }`}
              >
                {impScore}
              </p>
            {config.compareMeasurements && (
              <p className="text-xs text-slate-500">
                {measurements[impEvent!].toFixed(config.decimalPlaces)} m
              </p>
            )}
            </div>
          </div>

          <p className="text-sm text-slate-500">
            {improved
              ? t("games.moveMeasure.youImproved", {
                  defaultValue: "You improved!",
                })
              : t("games.moveMeasure.keepPracticing", {
                  defaultValue: "Keep practicing!",
                })}
          </p>
        </div>
      )}

      <h3 className="text-2xl font-extrabold text-slate-800 pt-4">
        {t("games.moveMeasure.exitQuestion", {
          defaultValue: "How do you know you improved?",
        })}
      </h3>

      <div className="flex flex-col items-center gap-3">
        {exits.map((ch, i) => (
          <button
            key={i}
            disabled={exitAns !== null}
            className={`px-8 py-4 rounded-2xl text-lg font-bold shadow transition-transform hover:scale-105 active:scale-95 min-w-[280px]
            ${
              exitAns !== null && ch.ok
                ? "bg-emerald-500 text-white"
                : exitAns !== null && !ch.ok
                ? "bg-slate-100 text-slate-400"
                : "bg-white border-2 border-slate-200 text-slate-700"
            }`}
            onClick={() => answerExit(i)}
          >
            {ch.text}
          </button>
        ))}
      </div>

      {exitAns !== null && (
        <p
          className={`bounce-in text-lg font-bold ${
            exitAns === "correct" ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {exitAns === "correct"
            ? t("games.moveMeasure.exitCorrect", {
                defaultValue: "That's right! Measuring helps us know!",
              })
            : t("games.moveMeasure.exitWrong", {
                defaultValue: "The best way is to measure and compare!",
              })}
        </p>
      )}
    </div>
  );
}



  if (phase === "celebration") {
  return (
    <div className="slide-up-fade text-center space-y-6 py-8">
      <div className="text-7xl bounce-in">{allPerfect ? "🏆" : "🎉"}</div>

      {allPerfect && (
        <p
          className="bounce-in text-sm font-extrabold uppercase tracking-widest text-amber-600"
          style={{ animationDelay: "100ms" }}
        >
          {t("games.moveMeasure.perfectRun", {
            defaultValue: "Perfect Run!",
          })}
        </p>
      )}

      <h2
        className="text-3xl font-extrabold text-emerald-800 bounce-in"
        style={{ animationDelay: "200ms" }}
      >
        {t("games.moveMeasure.celebTitle", {
          defaultValue: "You tested, measured, and improved!",
        })}
      </h2>

      <p
        className="text-lg text-slate-600 bounce-in"
        style={{ animationDelay: "400ms" }}
      >
        {t("games.moveMeasure.celebText", {
          defaultValue: "Great scientists always measure and try again.",
        })}
      </p>

      <div
        className="flex justify-center gap-4 bounce-in"
        style={{ animationDelay: "600ms" }}
      >
        {(["dash", "jump", "toss"] as const).map((ev) => (
          <div
            key={ev}
            className="bg-white rounded-2xl p-4 shadow border text-center min-w-[80px]"
          >
            <span className="text-2xl">{ICONS[ev]}</span>
            <p className="text-lg font-extrabold text-emerald-700 mt-1">
              {scores[ev]}
            </p>
            {config.showDecimals && (
              <p className="text-xs text-slate-500">
                {measurements[ev].toFixed(config.decimalPlaces)} m
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════
export default function MoveMeasureGame({ 
    config,
    onComplete 
}: { config?: unknown; 
    onComplete?: (result: GameResult) => void }) 
{
    const band = getGradeBand(config);

  return (
    <GameShell 
      gameKey="move_measure" 
      title="Move, Measure & Improve" 
      briefing={BRIEFING} 
      onComplete={onComplete ?? (() => {})}
    >

      {({ onFinish, reducedEffects: _reducedEffects }) => <MoveMeasurePlayfield band = {band} onFinish={onFinish} />}
    </GameShell>
  );
}
