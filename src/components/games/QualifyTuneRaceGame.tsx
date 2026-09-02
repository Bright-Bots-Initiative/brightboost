/**
 * Qualify, Tune, Race — capstone K-2 STEM game.
 * Drive a qualifying lap, pick ONE upgrade (change one variable), race again, compare.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import GameShell, {
  type GameResult,
  type MissionBriefing,
  ProgressHUD,
} from "./shared/GameShell";
import "./shared/game-effects.css";
import { pickLocale } from "@/utils/localizedContent";
import {
  CAR_H,
  CAR_W,
  CONE_SIZE,
  createRaceEngine,
  LANE_W,
  laneX,
  MAX_CLEAN_SMOOTHNESS,
  minCleanLaneChanges,
  OBSTACLES,
  START_LANE,
  TRACK_H,
  TRACK_LENGTH,
  TRACK_W,
  type RaceEngine,
  type RunResult,
  type Upgrade,
} from "./qualifyTuneRaceEngine";

// ── Types ─────────────────────────────────────────────────────────────────
type Phase =
  | "intro"
  | "qualify"
  | "results1"
  | "tune"
  | "race"
  | "compare"
  | "exitTicket"
  | "celebration";

// ── Constants ─────────────────────────────────────────────────────────────
const LEVELS = 3; // 2 levels, but +1 offset
// Ceiling a second run can only hold, never beat.
const PERFECT_BUMPS = 0;

// The world model, the obstacle table and the ceiling derivations live in
// ./qualifyTuneRaceEngine so they can be simulated without React (#806/#820).
// Re-exported because they are part of this game's public test surface.
export {
  laneX,
  MAX_CLEAN_SMOOTHNESS,
  minCleanLaneChanges,
  OBSTACLES,
  START_LANE,
};

// ── Helpers ───────────────────────────────────────────────────────────────
/**
 * Display bands for the qualifying-results cards. These return a stable band
 * **id**, never display text: the id reads the same in every locale, so the
 * pure helper stays testable while the component owns the single `t()` call
 * (#805). Thresholds are unchanged from the pre-#805 `timeLabel`/`smoothLabel`.
 */
export type TimeBand = "fast" | "medium" | "slow";
export type SmoothBand = "smooth" | "rough";

export function timeBand(s: number): TimeBand {
  return s < 15 ? "fast" : s < 22 ? "medium" : "slow";
}
export function smoothBand(s: number): SmoothBand {
  return s >= 70 ? "smooth" : "rough";
}
/**
 * Locale key + English fallback for every display band. Exported so the
 * locale-completeness test can walk the real table instead of regexing JSX —
 * the band keys are reached through a variable, which the Set 2 English
 * integrity scan (literal `t("…")` only) cannot see.
 */
export const BAND_LABELS = {
  fast: { key: "games.qualifyTuneRace.timeBand.fast", en: "Fast" },
  medium: { key: "games.qualifyTuneRace.timeBand.medium", en: "Medium" },
  slow: { key: "games.qualifyTuneRace.timeBand.slow", en: "Slow" },
  smooth: { key: "games.qualifyTuneRace.smoothBand.smooth", en: "Smooth" },
  rough: { key: "games.qualifyTuneRace.smoothBand.rough", en: "Rough" },
} as const satisfies Record<TimeBand | SmoothBand, { key: string; en: string }>;

export function timeIcon(s: number) {
  return s < 15 ? "🚀" : s < 22 ? "🏃" : "🐢";
}
export function smoothIcon(s: number) {
  return s >= 70 ? "✨" : "💨";
}
export function arrow(a: number, b: number) {
  return b < a ? "⬇️" : b > a ? "⬆️" : "➡️";
}

export function calculateQualifyTuneRaceScore(
  run1: RunResult | null,
  run2: RunResult | null,
  exitAnswer: string | null,
) {
  if (!run1 || !run2) return { score: 0, total: 10 };
  // Improvement credit is earned by improving, or by maintaining a result that
  // was already at the ceiling. Without the ceiling clauses a flawless first run
  // made these points unreachable: a perfect-both-runs student scored 5/10 while
  // a sloppy one who tidied up scored 10/10. Repeating a non-ceiling result
  // still earns nothing, so the incentive to improve is intact.
  const heldPerfectBumps =
    run1.bumps === PERFECT_BUMPS && run2.bumps === PERFECT_BUMPS;
  // Two cone-free laps. Cones are the only thing that costs lap time in the
  // engine (BUMP_TIME_COST_SECONDS per hit), so a cone-free lap sits exactly at
  // the floor of whatever car it was driven in — the fastest that setup can
  // physically go. That is the ceiling this clause holds, and it has to be
  // *driven* twice: it is deliberately NOT a per-configuration time threshold,
  // which would hand the point to anyone who merely picked an upgrade (#820).
  // Before #806 this clause read the "Fast" display band instead, which the
  // qualifying lap could only enter on a ≥85.4 Hz display — dead on a 60 Hz
  // classroom projector, free on a gaming laptop, and coupled to a string
  // #805 wants to translate.
  const heldFloorTime = heldPerfectBumps;
  const heldMaxSmoothness =
    run1.smoothness >= MAX_CLEAN_SMOOTHNESS &&
    run2.smoothness >= MAX_CLEAN_SMOOTHNESS;
  let s = 3;
  if (run2.bumps < run1.bumps || heldPerfectBumps) s += 2;
  if (run2.time < run1.time || heldFloorTime) s += 2;
  if (run2.smoothness > run1.smoothness || heldMaxSmoothness) s += 1;
  if (exitAnswer === "one") s += 2;
  return { score: Math.min(s, 10), total: 10 };
}

export function buildQualifyTuneRaceCompletionPayload(params: {
  run1: RunResult | null;
  run2: RunResult | null;
  exitAnswer: string | null;
  upgrade: Upgrade | null;
}): GameResult {
  const { score, total } = calculateQualifyTuneRaceScore(
    params.run1,
    params.run2,
    params.exitAnswer,
  );
  return {
    gameKey: "qualify_tune_race",
    score,
    total,
    streakMax: 1,
    roundsCompleted: 2,
    achievements: ["Big Challenge"],
    gameSpecific: {
      upgrade: params.upgrade,
      run1: params.run1,
      run2: params.run2,
      exitCorrect: params.exitAnswer === "one",
    },
  };
}

// ── Metric card (reused in results1) ──────────────────────────────────────
function MetricCard({
  icon,
  value,
  label,
  sub,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-md border space-y-2">
      <div className="text-3xl">{icon}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RacePlayfield
// ═══════════════════════════════════════════════════════════════════════════
function RacePlayfield({
  onFinish,
  reducedEffects,
}: {
  onFinish: (r: GameResult) => void;
  reducedEffects: boolean;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [carLane, setCarLane] = useState(START_LANE);
  const [scrollY, setScrollY] = useState(0);
  const [bumps, setBumps] = useState(0);
  const [wobble, setWobble] = useState(false);
  const [run1, setRun1] = useState<RunResult | null>(null);
  const [run2, setRun2] = useState<RunResult | null>(null);
  const [upgrade, setUpgrade] = useState<Upgrade | null>(null);
  const [exitAnswer, setExitAnswer] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  /** Bands are ids; the one place they become words is here (#805). */
  const bandText = (band: TimeBand | SmoothBand) =>
    t(BAND_LABELS[band].key, { defaultValue: BAND_LABELS[band].en });

  const rafId = useRef(0);
  const engineRef = useRef<RaceEngine | null>(null);
  const isRacing = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) =>
      setScale(Math.min((e[0]?.contentRect.width ?? TRACK_W) / TRACK_W, 1)),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const startRun = useCallback(
    (p: "qualify" | "race") => {
      // The qualifying lap is always driven un-upgraded; only the race run
      // carries the student's one change.
      engineRef.current = createRaceEngine(p === "race" ? upgrade : null);
      setPhase(p);
      setCarLane(START_LANE);
      setScrollY(0);
      setBumps(0);
      isRacing.current = true;
    },
    [upgrade],
  );

  const finishRun = useCallback(() => {
    isRacing.current = false;
    cancelAnimationFrame(rafId.current);
    const result = engineRef.current?.result() ?? {
      time: 0,
      bumps: 0,
      smoothness: 0,
    };
    if (phase === "qualify") {
      setRun1(result);
      setPhase("results1");
    } else {
      setRun2(result);
      setPhase("compare");
    }
  }, [phase]);

  const finishRef = useRef(finishRun);
  finishRef.current = finishRun;

  // RAF loop. The engine advances by elapsed time, not per frame (#806), so
  // this only has to hand it honest frame lengths and mirror its state into
  // React; a 60 Hz projector and a 144 Hz laptop run the identical world.
  useEffect(() => {
    if (phase !== "qualify" && phase !== "race") return;
    let previous = performance.now();
    const loop = (now: number) => {
      const engine = engineRef.current;
      if (!isRacing.current || !engine) return;
      const frameSeconds = (now - previous) / 1000;
      previous = now;
      const bumpsBefore = engine.bumps;
      engine.advance(frameSeconds);
      setScrollY(engine.scroll);
      if (engine.bumps !== bumpsBefore) {
        setBumps(engine.bumps);
        if (!reducedEffects) {
          setWobble(true);
          setTimeout(() => setWobble(false), 400);
        }
      }
      if (engine.finished) {
        finishRef.current();
        return;
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [phase, reducedEffects]);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const steer = useCallback((dir: -1 | 1) => {
    if (!isRacing.current) return;
    const engine = engineRef.current;
    if (engine?.steer(dir)) setCarLane(engine.lane);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        steer(-1);
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        steer(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  // ── Phase: intro ────────────────────────────────────────────────────
  if (phase === "intro")
    return (
      <div className="slide-up-fade text-center space-y-6 py-8">
        <div className="text-7xl float-idle">🏎️</div>
        <h2 className="text-3xl font-extrabold text-amber-900">
          {t("games.qualifyTuneRace.title", {
            defaultValue: "Qualify, Tune, Race",
          })}
        </h2>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          {t("games.qualifyTuneRace.introText", {
            defaultValue:
              "Drive your qualifying lap, pick ONE upgrade, then race again!",
          })}
        </p>
        <button
          onClick={() => startRun("qualify")}
          className="bounce-in px-10 py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-transform"
        >
          {t("games.qualifyTuneRace.letsGo", { defaultValue: "Let's Go!" })}
        </button>
      </div>
    );

  // ── Phase: qualify / race ───────────────────────────────────────────
  if (phase === "qualify" || phase === "race") {
    const isRacePhase = phase === "race";
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-white/80 border px-4 py-2 text-sm font-bold shadow-sm">
          <span className="text-amber-700">
            {isRacePhase
              ? t("games.qualifyTuneRace.raceRun", { defaultValue: "Race Run" })
              : t("games.qualifyTuneRace.qualifyRun", {
                  defaultValue: "Qualifying",
                })}
          </span>
          <span className="text-slate-600">
            💥 {bumps}{" "}
            {t("games.qualifyTuneRace.bumps", { defaultValue: "bumps" })}
          </span>
          {isRacePhase && upgrade && (
            <span className="text-emerald-600">
              {upgrade === "grip" ? "🛞" : upgrade === "speed" ? "⚡" : "🎯"}{" "}
              {t("games.qualifyTuneRace.active", { defaultValue: "Active" })}
            </span>
          )}
        </div>
        <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
          <ProgressHUD step={step} totalLevels={LEVELS} />
        </div>
        <div
          ref={wrapperRef}
          className="mx-auto select-none"
          style={{ maxWidth: TRACK_W }}
        >
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-amber-300 shadow-lg"
            style={{ height: TRACK_H * scale }}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                width: TRACK_W,
                height: TRACK_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                background: "linear-gradient(to bottom, #6b7280, #9ca3af)",
              }}
            >
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: i * LANE_W,
                    width: 3,
                    opacity: 0.5,
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, white 0px, white 20px, transparent 20px, transparent 40px)",
                    backgroundPositionY: -(scrollY % 40),
                  }}
                />
              ))}
              {OBSTACLES.map((obs, i) => {
                const sy = obs.y - scrollY + TRACK_H - 100;
                if (sy < -CONE_SIZE || sy > TRACK_H + CONE_SIZE) return null;
                return (
                  <div
                    key={i}
                    className={`absolute flex items-center justify-center text-2xl ${engineRef.current?.hasHit(i) ? "opacity-40" : ""}`}
                    style={{
                      left: laneX(obs.lane) - CONE_SIZE / 2,
                      top: sy - CONE_SIZE / 2,
                      width: CONE_SIZE,
                      height: CONE_SIZE,
                    }}
                  >
                    🔶
                  </div>
                );
              })}
              <div
                className={`absolute transition-all duration-150 ease-out ${wobble && !reducedEffects ? "shake" : ""}`}
                style={{
                  left: laneX(carLane) - CAR_W / 2,
                  top: TRACK_H - 100 - CAR_H / 2,
                  width: CAR_W,
                  height: CAR_H,
                  fontSize: 40,
                  textAlign: "center",
                  lineHeight: `${CAR_H}px`,
                }}
              >
                🏎️
              </div>
              {(() => {
                const fy = TRACK_LENGTH - scrollY + TRACK_H - 100;
                if (fy > TRACK_H + 20 || fy < -20) return null;
                return (
                  <div
                    className="absolute left-0 right-0 h-4"
                    style={{
                      top: fy,
                      opacity: 0.7,
                      backgroundImage:
                        "repeating-linear-gradient(90deg, black 0px, black 15px, white 15px, white 30px)",
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onPointerDown={() => steer(-1)}
            className="px-8 py-5 text-2xl font-bold rounded-2xl bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform min-w-[100px]"
            aria-label={t("games.qualifyTuneRace.steerLeft", {
              defaultValue: "Steer Left",
            })}
          >
            ⬅️
          </button>
          <button
            onPointerDown={() => steer(1)}
            className="px-8 py-5 text-2xl font-bold rounded-2xl bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform min-w-[100px]"
            aria-label={t("games.qualifyTuneRace.steerRight", {
              defaultValue: "Steer Right",
            })}
          >
            ➡️
          </button>
        </div>
        <p className="text-center text-xs text-slate-400">
          {t("games.qualifyTuneRace.controls", {
            defaultValue: "← → or tap buttons to steer",
          })}
        </p>
      </div>
    );
  }

  // ── Phase: results1 ─────────────────────────────────────────────────
  if (phase === "results1" && run1)
    return (
      <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
        <ProgressHUD step={1} totalLevels={LEVELS} />
        <h2 className="text-2xl font-extrabold text-amber-900">
          {t("games.qualifyTuneRace.resultsTitle", {
            defaultValue: "Qualifying Results",
          })}
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            icon={timeIcon(run1.time)}
            value={`${run1.time}s`}
            label={`⏱️ ${t("games.qualifyTuneRace.timeLabel", { defaultValue: "Time" })}`}
            sub={bandText(timeBand(run1.time))}
            color="text-indigo-600"
          />
          <MetricCard
            icon="💥"
            value={`${run1.bumps}`}
            label={t("games.qualifyTuneRace.bumpsLabel", {
              defaultValue: "Bumps",
            })}
            color="text-red-500"
          />
          <MetricCard
            icon={smoothIcon(run1.smoothness)}
            value={`${run1.smoothness}`}
            label={`🌊 ${t("games.qualifyTuneRace.smoothLabel", { defaultValue: "Smoothness" })}`}
            sub={bandText(smoothBand(run1.smoothness))}
            color="text-emerald-500"
          />
        </div>
        <p className="text-lg font-bold text-slate-700">
          {t("games.qualifyTuneRace.whatChange", {
            defaultValue: "What should we change?",
          })}
        </p>
        <button
          onClick={() => {
            setPhase("tune");
            setStep((prev) => prev + 1);
          }}
          className="px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {t("games.qualifyTuneRace.tuneTitle", {
            defaultValue: "Pick an Upgrade!",
          })}
        </button>
      </div>
    );

  // ── Phase: tune ─────────────────────────────────────────────────────
  if (phase === "tune") {
    const ups: { key: Upgrade; icon: string; title: string; desc: string }[] = [
      {
        key: "grip",
        icon: "🛞",
        title: t("games.qualifyTuneRace.gripTires", {
          defaultValue: "Grip Tires",
        }),
        desc: t("games.qualifyTuneRace.gripDesc", {
          defaultValue: "Fewer slips, easier control",
        }),
      },
      {
        key: "speed",
        icon: "⚡",
        title: t("games.qualifyTuneRace.speedBoost", {
          defaultValue: "Speed Boost",
        }),
        desc: t("games.qualifyTuneRace.speedDesc", {
          defaultValue: "Faster but harder to steer",
        }),
      },
      {
        key: "steering",
        icon: "🎯",
        title: t("games.qualifyTuneRace.steadySteering", {
          defaultValue: "Steady Steering",
        }),
        desc: t("games.qualifyTuneRace.steadyDesc", {
          defaultValue: "Smoother, more predictable turns",
        }),
      },
    ];
    return (
      <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
        <ProgressHUD step={step} totalLevels={LEVELS} />
        <h2 className="text-2xl font-extrabold text-amber-900">
          {t("games.qualifyTuneRace.tuneTitle", {
            defaultValue: "Pick ONE Upgrade",
          })}
        </h2>

        <p className="text-base text-slate-600">
          {t("games.qualifyTuneRace.tuneHint", {
            defaultValue: "Change only one thing — that's how scientists test!",
          })}
        </p>
        <div className="grid gap-4">
          {ups.map((u) => {
            const sel = upgrade === u.key,
              dis = upgrade !== null && !sel;
            return (
              <button
                key={u.key}
                onClick={() => !dis && setUpgrade(u.key)}
                disabled={dis}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                  ${sel ? "border-amber-500 bg-amber-50 shadow-lg scale-105 ring-2 ring-amber-300" : ""}
                  ${dis ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-50" : ""}
                  ${!sel && !dis ? "border-slate-200 bg-white hover:border-amber-300 hover:shadow-md cursor-pointer" : ""}`}
              >
                <span className="text-4xl">{u.icon}</span>
                <div>
                  <p className="text-lg font-extrabold text-slate-900">
                    {u.title}
                  </p>
                  <p className="text-sm text-slate-500">{u.desc}</p>
                </div>
                {sel && <span className="ml-auto text-2xl">✅</span>}
              </button>
            );
          })}
        </div>
        {upgrade && (
          <button
            onClick={() => startRun("race")}
            className="bounce-in px-10 py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform"
          >
            {t("games.qualifyTuneRace.raceNow", {
              defaultValue: "Race Again!",
            })}
          </button>
        )}
      </div>
    );
  }

  // ── Phase: compare ──────────────────────────────────────────────────
  if (phase === "compare" && run1 && run2) {
    const metrics = [
      {
        label: t("games.qualifyTuneRace.timeLabel", { defaultValue: "Time" }),
        icon: "⏱️",
        v1: run1.time,
        v2: run2.time,
        unit: "s",
        lb: true,
      },
      {
        label: t("games.qualifyTuneRace.bumpsLabel", { defaultValue: "Bumps" }),
        icon: "💥",
        v1: run1.bumps,
        v2: run2.bumps,
        unit: "",
        lb: true,
      },
      {
        label: t("games.qualifyTuneRace.smoothLabel", {
          defaultValue: "Smoothness",
        }),
        icon: "🌊",
        v1: run1.smoothness,
        v2: run2.smoothness,
        unit: "",
        lb: false,
      },
    ];
    return (
      <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
        <ProgressHUD step={2} totalLevels={LEVELS} />
        <h2 className="text-2xl font-extrabold text-amber-900">
          {t("games.qualifyTuneRace.compareTitle", {
            defaultValue: "Run 1 vs Run 2",
          })}
        </h2>

        <div className="space-y-3">
          {metrics.map((m) => {
            const better = m.lb ? m.v2 < m.v1 : m.v2 > m.v1;
            const same = m.v1 === m.v2;
            return (
              <div
                key={m.label}
                className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-md border"
              >
                <div className="text-left">
                  <span className="text-lg mr-2">{m.icon}</span>
                  <span className="font-bold text-slate-700">{m.label}</span>
                </div>
                <div className="flex items-center gap-3 text-lg font-extrabold">
                  <span className="text-slate-500">
                    {m.v1}
                    {m.unit}
                  </span>
                  <span className="text-xl">
                    {m.lb ? arrow(m.v2, m.v1) : arrow(m.v1, m.v2)}
                  </span>
                  <span
                    className={
                      better
                        ? "text-emerald-600"
                        : same
                          ? "text-slate-500"
                          : "text-red-500"
                    }
                  >
                    {m.v2}
                    {m.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-lg font-bold text-slate-700">
          {t("games.qualifyTuneRace.whatGotBetter", {
            defaultValue: "What got better?",
          })}
        </p>
        <button
          onClick={() => setPhase("exitTicket")}
          className="px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {t("games.qualifyTuneRace.next", { defaultValue: "Next" })}
        </button>
      </div>
    );
  }

  // ── Phase: exitTicket ───────────────────────────────────────────────
  if (phase === "exitTicket") {
    const opts = [
      {
        key: "one",
        label: t("games.qualifyTuneRace.exitCorrect", { defaultValue: "One" }),
      },
      {
        key: "two",
        label: t("games.qualifyTuneRace.exitWrongB", { defaultValue: "Two" }),
      },
      {
        key: "all",
        label: t("games.qualifyTuneRace.exitWrongA", {
          defaultValue: "All of them",
        }),
      },
    ];
    const answered = exitAnswer !== null,
      correct = exitAnswer === "one";
    return (
      <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
        <ProgressHUD step={2} totalLevels={LEVELS} />
        <h2 className="text-2xl font-extrabold text-amber-900">
          {t("games.qualifyTuneRace.exitQuestion", {
            defaultValue:
              "To make a fair test, how many things should you change?",
          })}
        </h2>

        <div className="grid gap-3">
          {opts.map((o) => {
            const isSel = exitAnswer === o.key,
              isCorr = o.key === "one";
            const showOk = answered && isCorr,
              showBad = answered && isSel && !isCorr;
            return (
              <button
                key={o.key}
                onClick={() => !answered && setExitAnswer(o.key)}
                disabled={answered}
                className={`px-6 py-5 text-xl font-bold rounded-2xl border-2 transition-all
                  ${showOk ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105 ring-2 ring-emerald-300" : ""}
                  ${showBad ? "border-red-400 bg-red-50 text-red-600 shake" : ""}
                  ${!answered ? "border-slate-200 bg-white hover:border-amber-300 hover:shadow-md cursor-pointer" : ""}
                  ${answered && !showOk && !showBad ? "opacity-40 border-slate-200 bg-slate-50" : ""}`}
              >
                {o.label}
                {showOk && " ✅"}
                {showBad && " ❌"}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="space-y-4">
            <p
              className={`text-lg font-bold ${correct ? "text-emerald-700" : "text-amber-700"}`}
            >
              {correct
                ? t("games.qualifyTuneRace.correctAnswer", {
                    defaultValue:
                      "That's right! Change only ONE thing for a fair test!",
                  })
                : t("games.qualifyTuneRace.wrongAnswer", {
                    defaultValue:
                      "The answer is ONE! Change one thing so you know what made the difference.",
                  })}
            </p>
            <button
              onClick={() => setPhase("celebration")}
              className="px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              {t("games.qualifyTuneRace.seeBadge", {
                defaultValue: "See Your Badge!",
              })}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: celebration ──────────────────────────────────────────────
  if (phase === "celebration")
    return (
      <div className="slide-up-fade text-center space-y-6 py-6 max-w-md mx-auto">
        <div className="text-7xl bounce-in">🏆</div>
        <h2
          className="text-2xl font-extrabold text-amber-900 bounce-in"
          style={{ animationDelay: "200ms" }}
        >
          {t("games.qualifyTuneRace.celebTitle", {
            defaultValue: "You tested, changed one thing, and improved!",
          })}
        </h2>
        <div
          className="bounce-in bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl p-6 border border-amber-200 shadow-md"
          style={{ animationDelay: "400ms" }}
        >
          <div className="text-4xl mb-2">🏎️</div>
          <p className="text-lg font-extrabold text-amber-800">
            {t("games.qualifyTuneRace.badgeName", {
              defaultValue: "Big Challenge",
            })}
          </p>
          <p className="text-sm text-amber-600">
            {t("games.qualifyTuneRace.badgeDesc", {
              defaultValue: "Completed the Qualify, Tune, Race capstone!",
            })}
          </p>
        </div>
        <button
          onClick={() => {
            onFinish(
              buildQualifyTuneRaceCompletionPayload({
                run1,
                run2,
                exitAnswer,
                upgrade,
              }),
            );
          }}
          className="bounce-in px-10 py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-transform"
          style={{ animationDelay: "600ms" }}
        >
          {t("games.qualifyTuneRace.finish", { defaultValue: "Finish!" })}
        </button>
      </div>
    );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════
export default function QualifyTuneRaceGame({
  onComplete,
}: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) {
  const { t } = useTranslation();
  // TODO: add translation keys for the story, tips, control instructions in briefing
  const briefing: MissionBriefing = {
    title: pickLocale(
      {
        en: "Qualify, Tune, Race",
        es: "Califica, Ajusta, Compite",
        vi: "Thử, Điều Chỉnh, Đua",
        "zh-CN": "测试、调整、比赛",
      },
      "Qualify, Tune, Race",
    ),
    story: pickLocale(
      {
        en: "First we test. Then we tune. Then we race again! Change one thing and see what happens.",
      },
      "First we test. Then we tune. Then we race again! Change one thing and see what happens.",
    ),
    icon: "🏎️",
    tips: pickLocale(
      {
        en: [
          "Drive carefully on the first run",
          "Pick ONE upgrade to test",
          "Compare your two runs!",
        ],
      },
      [
        "Drive carefully on the first run",
        "Pick ONE upgrade to test",
        "Compare your two runs!",
      ],
    ),
    chapterLabel: t("games.qualifyTuneRace.chapterLabel", {
      defaultValue: "Race Lab",
    }),
    themeColor: "amber",
    controlInstructions: {
      keyboard: pickLocale(
        {
          en: [
            "Use Tab to reach lane controls, then use Enter or Space to steer.",
          ],
        },
        ["Use Tab to reach lane controls, then use Enter or Space to steer."],
      ),
      buttons: pickLocale(
        {
          en: [
            "Use lane controls or available buttons to steer.",
            "Test one change at a time.",
          ],
        },
        [
          "Use lane controls or available buttons to steer.",
          "Test one change at a time.",
        ],
      ),
    },
  };

  return (
    <GameShell
      gameKey="qualify_tune_race"
      title="Qualify, Tune, Race"
      briefing={briefing}
      onComplete={onComplete ?? (() => {})}
    >
      {({ onFinish, reducedEffects }) => (
        <RacePlayfield onFinish={onFinish} reducedEffects={reducedEffects} />
      )}
    </GameShell>
  );
}
