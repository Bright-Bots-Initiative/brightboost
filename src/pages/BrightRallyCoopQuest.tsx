import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";
import { STEM_SET_1_IDS, STEM_SET_2_IDS } from "@/constants/stemSets";
import { ControlInstructions } from "@/components/games/shared/ControlInstructions";
import { ReducedEffectsToggle } from "@/components/games/shared/ReducedEffectsToggle";
import { useReducedGameEffects } from "@/components/games/shared/useReducedGameEffects";

const COURT_HEIGHT = 100;
const COURT_WIDTH = 100;
const LEFT_X = 8;
const RIGHT_X = 92;
const BALL_RADIUS = 2;
const BASE_PADDLE_HEIGHT = 20;
const TARGET_RALLIES = 18;
const BASE_LIVES = 3;
const BASE_BALL_SPEED = 38;
const MAX_BALL_SPEED = 62;

export type RallyUpgradeKey =
  | "softBounce"
  | "gearTiming"
  | "rhythmRally"
  | "pathPreview"
  | "teamShield";

export type RallyUpgrade = {
  id: string;
  key: RallyUpgradeKey;
  title: string;
  description: string;
};

export type RallyUpgradeConfig = {
  paddleHeight: number;
  speedStabilityBoost: number;
  rhythmBonusMultiplier: number;
  pathPreviewEnabled: boolean;
  shieldSaves: number;
  meterPerReturn: number;
  cpuWakeDelayMs: number;
};

export type BrightRallyResult = {
  rallyCount: number;
  bestStreak: number;
  teamScore: number;
  modulesUsed: string[];
  encouragement: string;
  teamBoosts: number;
  livesRemaining: number;
};

export function didPaddleHitBall(
  ballY: number,
  paddleY: number,
  paddleHeight: number,
  hitPadding = 0,
): boolean {
  const halfHeight = paddleHeight / 2;
  return Math.abs(ballY - paddleY) <= halfHeight + BALL_RADIUS + hitPadding;
}

export function calculateRallyScore(params: {
  rallyCount: number;
  bestStreak: number;
  teamBoosts: number;
  rhythmBonusMultiplier?: number;
}): number {
  const rhythmBonus = params.rhythmBonusMultiplier ?? 1;
  const base = params.rallyCount * 10;
  const streakBonus = params.bestStreak * 4;
  const boostBonus = params.teamBoosts * 30;
  return Math.max(0, Math.round((base + streakBonus + boostBonus) * rhythmBonus));
}

export function buildRallyUpgrades(completedActivityIds: string[]): RallyUpgrade[] {
  const completed = new Set(completedActivityIds);
  const upgrades: RallyUpgrade[] = [];

  if (completed.has("bounce-buds")) {
    upgrades.push({
      id: "bounce-buds",
      key: "softBounce",
      title: "Soft Bounce",
      description: "Larger paddle zone so your team can return tricky shots.",
    });
  }

  if (completed.has("gotcha-gears")) {
    upgrades.push({
      id: "gotcha-gears",
      key: "gearTiming",
      title: "Gear Timing",
      description: "When rallies get long, the ball calms down for easier timing.",
    });
  }

  if (completed.has("rhyme-ride")) {
    upgrades.push({
      id: "rhyme-ride",
      key: "rhythmRally",
      title: "Rhythm Rally",
      description: "Steady team streaks earn extra points.",
    });
  }

  if (completed.has("tank-trek")) {
    upgrades.push({
      id: "tank-trek",
      key: "pathPreview",
      title: "Path Preview",
      description: "Shows where the ball is going next.",
    });
  }

  if (completed.has("quantum-quest")) {
    upgrades.push({
      id: "quantum-quest",
      key: "teamShield",
      title: "Team Shield",
      description: "Blocks one miss so your team gets another chance.",
    });
  }

  return upgrades;
}

export function applyRallyUpgradeConfig(upgrades: RallyUpgrade[]): RallyUpgradeConfig {
  const set = new Set(upgrades.map((upgrade) => upgrade.key));
  const set2Count = upgrades.filter((upgrade) => STEM_SET_2_IDS.includes(upgrade.id as (typeof STEM_SET_2_IDS)[number])).length;

  return {
    paddleHeight: BASE_PADDLE_HEIGHT + (set.has("softBounce") ? 6 : 0),
    speedStabilityBoost: set.has("gearTiming") ? 0.92 : 1,
    rhythmBonusMultiplier: set.has("rhythmRally") ? 1.15 : 1,
    pathPreviewEnabled: set.has("pathPreview"),
    shieldSaves: set.has("teamShield") ? 1 : 0,
    meterPerReturn: 16 + Math.min(set2Count, 2),
    cpuWakeDelayMs: set.has("gearTiming") ? 1400 : 1900,
  };
}

export function getDifficultySettings(rallyCount: number): {
  speedMultiplier: number;
  paddleSpeed: number;
  maxVerticalSpeed: number;
} {
  if (rallyCount >= 15) {
    return { speedMultiplier: 1.15, paddleSpeed: 90, maxVerticalSpeed: 38 };
  }
  if (rallyCount >= 10) {
    return { speedMultiplier: 1.08, paddleSpeed: 86, maxVerticalSpeed: 36 };
  }
  if (rallyCount >= 5) {
    return { speedMultiplier: 1.03, paddleSpeed: 84, maxVerticalSpeed: 34 };
  }
  return { speedMultiplier: 1, paddleSpeed: 82, maxVerticalSpeed: 32 };
}

export function shouldUseCpuHelper(input: {
  now: number;
  lastP2InputAt: number;
  p2InputActive: boolean;
  ballHeadingRight: boolean;
  cpuWakeDelayMs: number;
}): boolean {
  return !input.p2InputActive &&
    input.ballHeadingRight &&
    input.now - input.lastP2InputAt > input.cpuWakeDelayMs;
}

export function getCpuHelperDirection(input: {
  ballY: number;
  paddleY: number;
  ballX: number;
}): number {
  const reactionWindow = input.ballX > 60 ? 0.85 : input.ballX > 52 ? 0.65 : 0.35;
  const delta = input.ballY - input.paddleY;
  if (Math.abs(delta) < 1.2) return 0;
  return clamp(Math.sign(delta) * reactionWindow, -0.9, 0.9);
}

export function buildBrightRallyResult(input: {
  rallyCount: number;
  bestStreak: number;
  teamBoosts: number;
  livesRemaining: number;
  upgrades: RallyUpgrade[];
  rhythmBonusMultiplier?: number;
}): BrightRallyResult {
  const teamScore = calculateRallyScore({
    rallyCount: input.rallyCount,
    bestStreak: input.bestStreak,
    teamBoosts: input.teamBoosts,
    rhythmBonusMultiplier: input.rhythmBonusMultiplier,
  });

  const encouragement = input.rallyCount >= TARGET_RALLIES
    ? "Awesome teamwork! You completed the co-op rally quest!"
    : input.rallyCount >= 10
      ? "Great rallying! You are building strong team timing."
      : "Nice effort! Keep practicing together and try again.";

  return {
    rallyCount: input.rallyCount,
    bestStreak: input.bestStreak,
    teamScore,
    modulesUsed: input.upgrades.map((upgrade) => upgrade.id),
    encouragement,
    teamBoosts: input.teamBoosts,
    livesRemaining: input.livesRemaining,
  };
}

type GamePhase = "intro" | "playing" | "results";

type GameSnapshot = {
  leftY: number;
  rightY: number;
  ballX: number;
  ballY: number;
  rallyCount: number;
  bestStreak: number;
  currentStreak: number;
  teamMeter: number;
  teamBoosts: number;
  lives: number;
  shieldSaves: number;
};

const defaultSnapshot: GameSnapshot = {
  leftY: 50,
  rightY: 50,
  ballX: 50,
  ballY: 50,
  rallyCount: 0,
  bestStreak: 0,
  currentStreak: 0,
  teamMeter: 0,
  teamBoosts: 0,
  lives: BASE_LIVES,
  shieldSaves: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function BrightRallyCoopQuest() {
  const { t } = useTranslation();
  const { reducedEffects, source, setReducedEffects } = useReducedGameEffects();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);
  const [upgrades, setUpgrades] = useState<RallyUpgrade[]>([]);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(defaultSnapshot);
  const [result, setResult] = useState<BrightRallyResult | null>(null);

  const instructions = useMemo(
    () => ({
      keyboard: [
        t("brightRally.controls.p1", { defaultValue: "Player 1: W / S" }),
        t("brightRally.controls.p2", { defaultValue: "Player 2: Arrow Up / Arrow Down or I / K" }),
        t("brightRally.controls.start", { defaultValue: "Press Space or Enter to start/restart." }),
      ],
      touch: [
        t("brightRally.controls.touch", { defaultValue: "Use the big Up/Down buttons on each side." }),
      ],
      screenReader: [
        t("brightRally.controls.sr", { defaultValue: "The game region is labeled Bright Rally court." }),
      ],
    }),
    [t],
  );

  const config = useMemo(() => applyRallyUpgradeConfig(upgrades), [upgrades]);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const gameRegionRef = useRef<HTMLDivElement>(null);

  const snapshotRef = useRef<GameSnapshot>(defaultSnapshot);
  const ballVxRef = useRef(40);
  const ballVyRef = useRef(18);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const boostTimerRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchDirRef = useRef({ left: 0, right: 0 });
  const lastP2InputRef = useRef(Date.now());

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        await api.getAvatar().catch(() => null);
        const progressResponse = await api.getProgress().catch(() => []);
        const progressList = Array.isArray(progressResponse)
          ? progressResponse
          : Array.isArray(progressResponse?.progress)
            ? progressResponse.progress
            : [];

        const completed = progressList
          .filter((entry: { status?: string }) => entry.status === "COMPLETED")
          .map((entry: { activityId?: string }) => entry.activityId)
          .filter((id: string | undefined): id is string => Boolean(id));

        setCompletedActivityIds(completed);
        const canonicalSetOne = completed.filter((id: string) => STEM_SET_1_IDS.includes(id as (typeof STEM_SET_1_IDS)[number]));
        setUpgrades(buildRallyUpgrades(canonicalSetOne));
      } catch {
        setCompletedActivityIds([]);
        setUpgrades([]);
      }
    };

    fetchProgress();
  }, []);

  const resetRound = useCallback(() => {
    const initialShieldSaves = config.shieldSaves;
    const reset: GameSnapshot = {
      ...defaultSnapshot,
      shieldSaves: initialShieldSaves,
    };
    snapshotRef.current = reset;
    setSnapshot(reset);
    setResult(null);
    boostTimerRef.current = 0;
    lastTimeRef.current = null;
    ballVxRef.current = Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED;
    ballVyRef.current = (Math.random() * 18) - 9;
  }, [config.shieldSaves]);

  const finishRound = useCallback((finalSnapshot: GameSnapshot) => {
    const builtResult = buildBrightRallyResult({
      rallyCount: finalSnapshot.rallyCount,
      bestStreak: finalSnapshot.bestStreak,
      teamBoosts: finalSnapshot.teamBoosts,
      livesRemaining: finalSnapshot.lives,
      upgrades,
      rhythmBonusMultiplier: config.rhythmBonusMultiplier,
    });
    setResult(builtResult);
    setPhase("results");
  }, [config.rhythmBonusMultiplier, upgrades]);

  const step = useCallback((dt: number) => {
    const state = { ...snapshotRef.current };
    const difficulty = getDifficultySettings(state.rallyCount);
    const paddleSpeed = difficulty.paddleSpeed;
    const isP1Up = keysRef.current.w || keysRef.current.W;
    const isP1Down = keysRef.current.s || keysRef.current.S;
    const isP2Up = keysRef.current.ArrowUp || keysRef.current.i || keysRef.current.I;
    const isP2Down = keysRef.current.ArrowDown || keysRef.current.k || keysRef.current.K;

    let p1Dir = (isP1Up ? -1 : 0) + (isP1Down ? 1 : 0) + touchDirRef.current.left;
    let p2Dir = (isP2Up ? -1 : 0) + (isP2Down ? 1 : 0) + touchDirRef.current.right;

    if (isP2Up || isP2Down || touchDirRef.current.right !== 0) {
      lastP2InputRef.current = Date.now();
    }

    const now = Date.now();
    const p2InputActive = isP2Up || isP2Down || touchDirRef.current.right !== 0;
    if (shouldUseCpuHelper({
      now,
      lastP2InputAt: lastP2InputRef.current,
      p2InputActive,
      ballHeadingRight: ballVxRef.current > 0,
      cpuWakeDelayMs: config.cpuWakeDelayMs,
    })) {
      p2Dir = getCpuHelperDirection({ ballY: state.ballY, paddleY: state.rightY, ballX: state.ballX });
    }

    state.leftY = clamp(state.leftY + p1Dir * paddleSpeed * dt, config.paddleHeight / 2, COURT_HEIGHT - config.paddleHeight / 2);
    state.rightY = clamp(state.rightY + p2Dir * paddleSpeed * dt, config.paddleHeight / 2, COURT_HEIGHT - config.paddleHeight / 2);

    const assistActive = boostTimerRef.current > 0;
    const speedFactor = assistActive ? config.speedStabilityBoost : 1;

    state.ballX += ballVxRef.current * dt * difficulty.speedMultiplier * speedFactor;
    state.ballY += ballVyRef.current * dt * difficulty.speedMultiplier * speedFactor;

    if (state.ballY <= BALL_RADIUS) {
      state.ballY = BALL_RADIUS;
      ballVyRef.current = Math.abs(ballVyRef.current);
    } else if (state.ballY >= COURT_HEIGHT - BALL_RADIUS) {
      state.ballY = COURT_HEIGHT - BALL_RADIUS;
      ballVyRef.current = -Math.abs(ballVyRef.current);
    }

    const hitPadding = reducedEffects ? 1 : 2;

    if (
      state.ballX <= LEFT_X + BALL_RADIUS &&
      ballVxRef.current < 0 &&
      didPaddleHitBall(state.ballY, state.leftY, config.paddleHeight, hitPadding)
    ) {
      state.ballX = LEFT_X + BALL_RADIUS;
      ballVxRef.current = clamp(Math.abs(ballVxRef.current) * 1.01, BASE_BALL_SPEED, MAX_BALL_SPEED);
      const offset = (state.ballY - state.leftY) / (config.paddleHeight / 2);
      ballVyRef.current = clamp(ballVyRef.current + offset * 11, -difficulty.maxVerticalSpeed, difficulty.maxVerticalSpeed);
      state.rallyCount += 1;
      state.currentStreak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
      state.teamMeter += config.meterPerReturn;
    }

    if (
      state.ballX >= RIGHT_X - BALL_RADIUS &&
      ballVxRef.current > 0 &&
      didPaddleHitBall(state.ballY, state.rightY, config.paddleHeight, hitPadding)
    ) {
      state.ballX = RIGHT_X - BALL_RADIUS;
      ballVxRef.current = -clamp(Math.abs(ballVxRef.current) * 1.01, BASE_BALL_SPEED, MAX_BALL_SPEED);
      const offset = (state.ballY - state.rightY) / (config.paddleHeight / 2);
      ballVyRef.current = clamp(ballVyRef.current + offset * 11, -difficulty.maxVerticalSpeed, difficulty.maxVerticalSpeed);
      state.rallyCount += 1;
      state.currentStreak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
      state.teamMeter += config.meterPerReturn;
    }

    if (state.teamMeter >= 100) {
      state.teamMeter = state.teamMeter - 100;
      state.teamBoosts += 1;
      boostTimerRef.current = 1.2;
    }

    if (boostTimerRef.current > 0) {
      boostTimerRef.current = Math.max(0, boostTimerRef.current - dt);
    }

    if (state.ballX < -2 || state.ballX > COURT_WIDTH + 2) {
      if (state.shieldSaves > 0) {
        state.shieldSaves -= 1;
        state.currentStreak = Math.max(0, state.currentStreak - 1);
      } else {
        state.lives -= 1;
        state.currentStreak = 0;
      }
      state.ballX = 50;
      state.ballY = 50;
      ballVxRef.current = Math.random() > 0.5 ? BASE_BALL_SPEED : -BASE_BALL_SPEED;
      ballVyRef.current = (Math.random() * 16) - 8;
    }

    snapshotRef.current = state;
    setSnapshot(state);

    if (state.lives <= 0 || state.rallyCount >= TARGET_RALLIES) {
      finishRound(state);
      return false;
    }

    return true;
  }, [config, finishRound, reducedEffects]);

  useEffect(() => {
    if (phase !== "playing") {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const loop = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const dt = Math.min((time - lastTimeRef.current) / 1000, 1 / 20);
      lastTimeRef.current = time;
      const stillPlaying = step(dt);
      if (stillPlaying) {
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [phase, step]);

  useEffect(() => {
    const controlKeys = new Set([" ", "ArrowUp", "ArrowDown", "w", "W", "s", "S", "i", "I", "k", "K"]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (controlKeys.has(event.key)) {
        event.preventDefault();
      }
      keysRef.current[event.key] = true;
      if ((event.key === " " || event.key === "Enter") && phase !== "playing") {
        event.preventDefault();
        resetRound();
        setPhase("playing");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, resetRound]);

  useEffect(() => {
    if (phase === "intro") {
      startButtonRef.current?.focus();
    }
    if (phase === "playing") {
      gameRegionRef.current?.focus();
    }
    if (phase === "results") {
      resultHeadingRef.current?.focus();
    }
  }, [phase]);

  const onStart = () => {
    resetRound();
    setPhase("playing");
  };

  const courtBallTrailX = clamp(snapshot.ballX + Math.sign(ballVxRef.current) * 10, 5, 95);
  const hasBoostReady = snapshot.teamMeter >= 80;

  return (
    <section
      aria-label={t("brightRally.regionLabel", { defaultValue: "Bright Rally co-op game" })}
      className="w-full rounded-2xl border border-blue-200 bg-white p-4 shadow-sm"
      data-reduced-effects={reducedEffects ? "true" : "false"}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t("brightRally.title", { defaultValue: "Bright Rally: Pickleball Co-op Quest" })}
          </h2>
          <p className="text-sm text-slate-600">
            {t("brightRally.subtitle", { defaultValue: "Team up on one device and keep the rally alive." })}
          </p>
        </div>
        <ReducedEffectsToggle
          reducedEffects={reducedEffects}
          source={source}
          onToggle={setReducedEffects}
        />
      </div>

      <ControlInstructions instructions={instructions} className="mb-4" />

      {phase === "intro" && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="text-lg font-semibold text-blue-950">{t("brightRally.mission", { defaultValue: "Mission Brief" })}</h3>
          <p className="mt-2 text-sm text-slate-700">
            {t("brightRally.intro", { defaultValue: "Work together to return the ball, fill the team rally meter, and unlock Team Boost moments!" })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              ref={startButtonRef}
              type="button"
              onClick={onStart}
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
            >
              {t("brightRally.start", { defaultValue: "Start Rally" })}
            </button>
            <span className="rounded-lg bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-900">
              {t("brightRally.upgradesUnlocked", { defaultValue: "Upgrades unlocked" })}: {upgrades.length}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {upgrades.length > 0 ? upgrades.map((upgrade) => (
              <div key={upgrade.key} className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                <p className="font-semibold text-slate-900">{upgrade.title}</p>
                <p className="text-xs text-slate-600">{upgrade.description}</p>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-2 text-slate-700 sm:col-span-2">
                {t("brightRally.upgradeHintFriendly", { defaultValue: "Complete STEM games to unlock boosts for your next team rally." })}
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <div className="rounded-md bg-slate-100 p-2">{t("brightRally.hud.rallies", { defaultValue: "Rallies" })}: <strong>{snapshot.rallyCount}/{TARGET_RALLIES}</strong></div>
            <div className="rounded-md bg-slate-100 p-2">{t("brightRally.hud.streak", { defaultValue: "Best streak" })}: <strong>{snapshot.bestStreak}</strong></div>
            <div className="rounded-md bg-slate-100 p-2">{t("brightRally.hud.lives", { defaultValue: "Hearts" })}: <strong>{"❤️".repeat(Math.max(snapshot.lives, 0))}</strong></div>
            <div className="rounded-md bg-slate-100 p-2">{t("brightRally.hud.boosts", { defaultValue: "Team boosts" })}: <strong>{snapshot.teamBoosts}</strong></div>
            <div className="rounded-md bg-slate-100 p-2">{t("brightRally.hud.shields", { defaultValue: "Shield saves" })}: <strong>{snapshot.shieldSaves}</strong></div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{t("brightRally.meterTitle", { defaultValue: "Team Rally Meter" })}</span>
            <span>{Math.round(snapshot.teamMeter)}%</span>
          </div>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-slate-200" aria-label={t("brightRally.meterLabel", { defaultValue: "Team rally meter" })}>
            <div className="h-full bg-yellow-400 transition-all duration-150" style={{ width: `${Math.min(snapshot.teamMeter, 100)}%` }} />
          </div>
          <p className={`mb-2 text-xs font-semibold ${boostTimerRef.current > 0 ? "text-emerald-700" : hasBoostReady ? "text-amber-700" : "text-slate-600"}`}>
            {boostTimerRef.current > 0
              ? t("brightRally.boost.active", { defaultValue: "Team Boost active! Ball control is steadier." })
              : hasBoostReady
                ? t("brightRally.boost.ready", { defaultValue: "Almost there! One more return triggers Team Boost." })
                : t("brightRally.boost.filling", { defaultValue: "Work together to fill the meter and trigger Team Boost." })}
          </p>
          <p className="mb-2 text-xs text-slate-600">
            {snapshot.currentStreak >= 6
              ? t("brightRally.streak.hot", { defaultValue: "Hot streak! Great teamwork rhythm." })
              : t("brightRally.streak.base", { defaultValue: "Build a longer streak for easier rhythm control." })}
          </p>

          <div
            ref={gameRegionRef}
            tabIndex={-1}
            role="application"
            aria-label={t("brightRally.courtLabel", { defaultValue: "Bright Rally court" })}
            className="relative h-[360px] rounded-xl border border-blue-300 bg-gradient-to-b from-blue-700 to-blue-900 outline-none"
          >
            <div className="absolute inset-0 rounded-xl border border-white/20" />
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/35" />
            <div className="absolute left-[8%] top-0 h-full w-[2px] bg-white/25" />
            <div className="absolute left-[92%] top-0 h-full w-[2px] bg-white/25" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
            <div className="absolute left-[14%] top-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Team A</div>
            <div className="absolute right-[14%] top-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Team B</div>

            {config.pathPreviewEnabled && !reducedEffects && (
              <div
                className="pointer-events-none absolute h-1 w-8 rounded-full bg-cyan-200/70"
                style={{
                  left: `${courtBallTrailX}%`,
                  top: `${snapshot.ballY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}

            <div
              className="absolute h-14 w-3 rounded-md bg-sky-200"
              style={{ left: `${LEFT_X}%`, top: `${snapshot.leftY}%`, height: `${config.paddleHeight}%`, transform: "translate(-50%, -50%)" }}
            />
            <div
              className="absolute h-14 w-3 rounded-md bg-sky-200"
              style={{ left: `${RIGHT_X}%`, top: `${snapshot.rightY}%`, height: `${config.paddleHeight}%`, transform: "translate(-50%, -50%)" }}
            />

            <div
              className="absolute h-4 w-4 rounded-full bg-yellow-300 shadow"
              style={{ left: `${snapshot.ballX}%`, top: `${snapshot.ballY}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="font-semibold text-blue-900">{t("brightRally.touch.player1", { defaultValue: "Player 1 touch" })}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" aria-label="Player 1 move up" onPointerDown={() => { touchDirRef.current.left = -1; }} onPointerUp={() => { touchDirRef.current.left = 0; }} onPointerLeave={() => { touchDirRef.current.left = 0; }} className="min-h-12 flex-1 rounded-md border border-blue-200 bg-white px-3 py-3 font-semibold text-slate-900">Up ⬆️</button>
                <button type="button" aria-label="Player 1 move down" onPointerDown={() => { touchDirRef.current.left = 1; }} onPointerUp={() => { touchDirRef.current.left = 0; }} onPointerLeave={() => { touchDirRef.current.left = 0; }} className="min-h-12 flex-1 rounded-md border border-blue-200 bg-white px-3 py-3 font-semibold text-slate-900">Down ⬇️</button>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="font-semibold text-blue-900">{t("brightRally.touch.player2", { defaultValue: "Player 2 touch" })}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" aria-label="Player 2 move up" onPointerDown={() => { touchDirRef.current.right = -1; lastP2InputRef.current = Date.now(); }} onPointerUp={() => { touchDirRef.current.right = 0; }} onPointerLeave={() => { touchDirRef.current.right = 0; }} className="min-h-12 flex-1 rounded-md border border-blue-200 bg-white px-3 py-3 font-semibold text-slate-900">Up ⬆️</button>
                <button type="button" aria-label="Player 2 move down" onPointerDown={() => { touchDirRef.current.right = 1; lastP2InputRef.current = Date.now(); }} onPointerUp={() => { touchDirRef.current.right = 0; }} onPointerLeave={() => { touchDirRef.current.right = 0; }} className="min-h-12 flex-1 rounded-md border border-blue-200 bg-white px-3 py-3 font-semibold text-slate-900">Down ⬇️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "results" && result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 ref={resultHeadingRef} tabIndex={-1} className="text-lg font-bold text-emerald-900 outline-none">
            {t("brightRally.resultsTitle", { defaultValue: "Rally Complete" })}
          </h3>
          <p className="mt-2 text-sm text-slate-700">{result.encouragement}</p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-md bg-white p-2">{t("brightRally.result.rallies", { defaultValue: "Rally count" })}: <strong>{result.rallyCount}</strong></div>
            <div className="rounded-md bg-white p-2">{t("brightRally.result.streak", { defaultValue: "Best streak" })}: <strong>{result.bestStreak}</strong></div>
            <div className="rounded-md bg-white p-2">{t("brightRally.result.score", { defaultValue: "Team score" })}: <strong>{result.teamScore}</strong></div>
            <div className="rounded-md bg-white p-2">{t("brightRally.result.boosts", { defaultValue: "Team boosts" })}: <strong>{result.teamBoosts}</strong></div>
            <div className="rounded-md bg-white p-2">{t("brightRally.result.lives", { defaultValue: "Lives left" })}: <strong>{result.livesRemaining}</strong></div>
            <div className="rounded-md bg-white p-2">{t("brightRally.result.modules", { defaultValue: "Modules used" })}: <strong>{result.modulesUsed.length || t("brightRally.result.none", { defaultValue: "None" })}</strong></div>
          </div>

          {result.modulesUsed.length > 0 && (
            <p className="mt-3 text-xs text-slate-600">{result.modulesUsed.join(", ")}</p>
          )}

          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            {t("brightRally.restart", { defaultValue: "Play Again" })}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        {t("brightRally.prototypeNote", { defaultValue: "Prototype note: local single-device co-op only in this version." })}
      </p>
      {completedActivityIds.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">{t("brightRally.upgradeHint", { defaultValue: "Complete STEM activities to unlock friendly team boosts." })}</p>
      )}
    </section>
  );
}
