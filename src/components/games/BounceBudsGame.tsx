/**
 * Bounce & Buds — paddle-and-ball life-science game for K–2.
 *
 * Students control a Buddy paddle at the bottom and bounce a ball
 * into the correct answer gate at the top. Each round shows a
 * biology/nature clue and three labeled gates (1 correct, 2 distractors).
 *
 * Pre-launch = aiming state: the ball sits on the paddle and follows
 * it as the student positions. Launch happens when the player taps/clicks
 * anywhere in the playfield (or presses Space/Enter). Dragging to aim
 * does not launch — only a short tap does.
 *
 * Keyboard: ← → or A/D to aim, Space/Enter to launch
 * Mouse/Touch: drag to aim, tap anywhere in playfield to launch
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import GameShell, {
  type GameResult,
  type MissionBriefing,
} from "./shared/GameShell";
import { getGradeBand, BOUNCE_BUDS_ROUNDS } from "./gradeBandContent";
import "./shared/game-effects.css";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

// BounceRound type imported from gradeBandContent.ts

/**
 * Phase lifecycle per round:
 *   ready → waiting → active → resolved → transition → (next ready | complete)
 *
 *   ready      – brief "Get Ready!" flash (≈1 s)
 *   waiting    – clue & gates visible, ball on paddle, waiting for player input
 *   active     – ball bouncing, physics running
 *   resolved   – outcome shown, physics stopped
 *   transition – brief fade before next round
 *   complete   – game over, no further state changes
 */
type RoundPhase = "ready" | "waiting" | "active" | "resolved" | "transition" | "complete";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const FIELD_W = 600;
const FIELD_H = 480;
const BALL_R = 11;
const PADDLE_W = 120;
const PADDLE_H = 16;
const PADDLE_Y = FIELD_H - 40;
const GATE_H = 56;
const GATE_W = 168;
const GATE_GAP = 16;
const GATES_TOTAL_W = 3 * GATE_W + 2 * GATE_GAP;
const GATE_START_X = (FIELD_W - GATES_TOTAL_W) / 2;

// ── Speed tuning (K–2 friendly) ──
const INITIAL_SPEED = 2.0;        // px/frame — noticeably slower start
const SPEED_INCREMENT = 0.08;     // gentle ramp per round
const MAX_BOUNCE_ANGLE = 0.8;     // radians — softer paddle reflection
const MAX_LIVES = 5;
const ROUND_TIMEOUT_MS = 25_000;
const READY_FLASH_MS = 1_000;     // "Get Ready!" overlay
const AUTO_LAUNCH_MS = 8_000;     // safety auto-launch if no input
const RESOLVE_DELAY_MS = 1_800;
const TRANSITION_DELAY_MS = 400;
const PADDLE_KB_SPEED = 8;
const DRAG_THRESHOLD = 12;        // px — pointer travel below this = tap, above = drag

// Round data now loaded from gradeBandContent.ts based on config.gradeBand

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
export function shouldRenderBounceSparkles(reducedEffects: boolean) {
  return !reducedEffects;
}

/** Returns [left, right] pixel ranges for each of the three gates. */
function gateRanges(): Array<{ left: number; right: number }> {
  return [0, 1, 2].map((i) => ({
    left: GATE_START_X + i * (GATE_W + GATE_GAP),
    right: GATE_START_X + i * (GATE_W + GATE_GAP) + GATE_W,
  }));
}

const GATE_STYLES = [
  { bg: "from-emerald-300 to-emerald-400", ring: "ring-emerald-500", text: "text-emerald-950" },
  { bg: "from-sky-300 to-sky-400", ring: "ring-sky-500", text: "text-sky-950" },
  { bg: "from-amber-300 to-amber-400", ring: "ring-amber-500", text: "text-amber-950" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Briefing (used by GameShell)
// ═══════════════════════════════════════════════════════════════════════════

const BRIEFING: MissionBriefing = {
  title: "Bounce & Buds",
  story:
    "Buddy needs your help! Bounce the ball into the right gate to help plants grow. Read the clue and aim carefully!",
  icon: "🌿",
  tips: [
    "Read the clue at the top",
    "Move the paddle left and right to aim",
    "Bounce the ball into the correct gate!",
  ],
  chapterLabel: "Life Science",
  themeColor: "emerald",
};

// ═══════════════════════════════════════════════════════════════════════════
// BouncePlayfield — inner game component (rendered by GameShell)
// ═══════════════════════════════════════════════════════════════════════════

function BouncePlayfield({
  onFinish,
  config,
  reducedEffects,
}: {
  onFinish: (result: GameResult) => void;
  config?: any;
  reducedEffects: boolean;
}) {
  const { t } = useTranslation();
  const band = getGradeBand(config);
  const ROUNDS = BOUNCE_BUDS_ROUNDS[band];

  // ── DOM refs ──
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const ballElRef = useRef<HTMLDivElement>(null);
  const paddleElRef = useRef<HTMLDivElement>(null);

  // ── Scaling (responsive) ──
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? FIELD_W;
      setScale(Math.min(w / FIELD_W, 1));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Game state (React state for rendering) ──
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [phase, setPhase] = useState<RoundPhase>("ready");
  const [feedback, setFeedback] = useState<{
    text: string;
    correct: boolean;
  } | null>(null);
  const [gateLabels, setGateLabels] = useState<string[]>([]);
  const [hitGateIdx, setHitGateIdx] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  // ── Physics refs (mutated in RAF, never cause re-renders) ──
  const ball = useRef({ x: FIELD_W / 2, y: PADDLE_Y - BALL_R - 2, vx: 0, vy: 0 });
  const paddleXRef = useRef((FIELD_W - PADDLE_W) / 2);
  const outcomeLock = useRef(false);
  const keysDown = useRef<Set<string>>(new Set());
  const rafId = useRef(0);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sparkleCounter = useRef(0);
  const gateLabelsRef = useRef<string[]>([]);
  const finishedRef = useRef(false);
  const phaseRef = useRef<RoundPhase>("ready");
  // Pointer drag-vs-tap tracking
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDrag = useRef(false);

  // Keep phaseRef in sync so event handlers see the latest value
  phaseRef.current = phase;

  const currentRound = roundIndex < ROUNDS.length ? ROUNDS[roundIndex] : null;

  // ── Safe timer helpers ──
  function addTimer(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timerIds.current.push(id);
    return id;
  }
  function clearAllTimers() {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
  }

  // ── Stop all physics & timers (called before completion and unmount) ──
  function haltEverything() {
    cancelAnimationFrame(rafId.current);
    clearAllTimers();
    outcomeLock.current = true;
  }

  // ── Direct DOM helpers ──
  function syncPaddle() {
    if (paddleElRef.current) {
      paddleElRef.current.style.transform = `translate(${paddleXRef.current}px, ${PADDLE_Y}px)`;
    }
  }
  function syncBall() {
    if (ballElRef.current) {
      ballElRef.current.style.transform = `translate(${ball.current.x - BALL_R}px, ${ball.current.y - BALL_R}px)`;
    }
  }
  /** During waiting phase, keep ball centered on paddle so aiming is real. */
  function snapBallToPaddle() {
    ball.current.x = paddleXRef.current + PADDLE_W / 2;
    ball.current.y = PADDLE_Y - BALL_R - 4;
    syncBall();
  }

  // ── Launch the ball (explicit action: Space/Enter key or Launch button) ──
  function launchBall() {
    if (phaseRef.current !== "waiting" || finishedRef.current) return;

    // Launch from current paddle position (aiming matters)
    ball.current.x = paddleXRef.current + PADDLE_W / 2;
    ball.current.y = PADDLE_Y - BALL_R - 4;

    outcomeLock.current = false;
    const speed = INITIAL_SPEED + roundIndex * SPEED_INCREMENT;
    const angle = (Math.random() - 0.5) * 0.6; // gentle initial angle
    ball.current.vx = Math.sin(angle) * speed;
    ball.current.vy = -Math.cos(angle) * speed;
    setPhase("active");

    // Round timeout
    addTimer(() => {
      if (!outcomeLock.current) {
        resolveRef.current(false, "Time\u2019s up! Let\u2019s try the next one.");
      }
    }, ROUND_TIMEOUT_MS);
  }

  const launchRef = useRef(launchBall);
  launchRef.current = launchBall;

  // ── Resolve a round outcome ──
  function resolveRound(correct: boolean, message: string) {
    if (outcomeLock.current || finishedRef.current) return;
    outcomeLock.current = true;
    cancelAnimationFrame(rafId.current);
    clearAllTimers();

    // Stop the ball immediately
    ball.current.vx = 0;
    ball.current.vy = 0;

    const newScore = correct ? score + 1 : score;
    const newLives = correct ? lives : lives - 1;
    const newStreak = correct ? streak + 1 : 0;
    const newMaxStreak = Math.max(maxStreak, correct ? streak + 1 : 0);

    setScore(newScore);
    setLives(newLives);
    setStreak(newStreak);
    setMaxStreak(newMaxStreak);
    setPhase("resolved");
    setFeedback({ text: message, correct });

    if (correct && shouldRenderBounceSparkles(reducedEffects)) {
      const bx = ball.current.x;
      const by = ball.current.y;
      const sp = Array.from({ length: 8 }, () => ({
        id: sparkleCounter.current++,
        x: bx + (Math.random() - 0.5) * 80,
        y: by + (Math.random() - 0.5) * 50,
      }));
      setSparkles(sp);
      addTimer(() => setSparkles([]), 900);
    }

    // Transition → next round or game over
    addTimer(() => {
      if (finishedRef.current) return;
      setPhase("transition");

      addTimer(() => {
        if (finishedRef.current) return;

        const next = roundIndex + 1;
        if (next >= ROUNDS.length || newLives <= 0) {
          // ── Game complete ──
          finishedRef.current = true;
          haltEverything();
          setPhase("complete");
          onFinish({
            gameKey: "buddy_garden_sort",
            score: newScore,
            total: ROUNDS.length,
            streakMax: newMaxStreak,
            roundsCompleted: Math.min(next, ROUNDS.length),
          });
        } else {
          setRoundIndex(next);
          setPhase("ready");
        }
      }, TRANSITION_DELAY_MS);
    }, RESOLVE_DELAY_MS);
  }

  const resolveRef = useRef(resolveRound);
  resolveRef.current = resolveRound;

  // ── Round setup (runs when roundIndex changes) ──
  useEffect(() => {
    if (roundIndex >= ROUNDS.length || finishedRef.current) return;

    const r = ROUNDS[roundIndex];
    const labels = shuffleArray([r.correctLabel, ...r.distractors]);
    gateLabelsRef.current = labels;
    setGateLabels(labels);
    setHitGateIdx(null);
    setFeedback(null);
    outcomeLock.current = true; // prevent stale collisions during ready/waiting

    // Position ball on paddle center
    ball.current = {
      x: FIELD_W / 2,
      y: PADDLE_Y - BALL_R - 4,
      vx: 0,
      vy: 0,
    };
    paddleXRef.current = (FIELD_W - PADDLE_W) / 2;
    syncBall();
    syncPaddle();

    // Phase 1: brief "Get Ready!" flash
    // Phase 2: "waiting" — ball on paddle, player reads clue
    const readyTimer = addTimer(() => {
      if (finishedRef.current) return;
      setPhase("waiting");

      // Safety auto-launch if the player doesn't interact
      addTimer(() => {
        if (phaseRef.current === "waiting" && !finishedRef.current) {
          launchRef.current();
        }
      }, AUTO_LAUNCH_MS);
    }, READY_FLASH_MS);

    return () => clearTimeout(readyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  // ── Main physics loop (active phase only) ──
  useEffect(() => {
    if (phase !== "active") return;

    const ranges = gateRanges();

    const loop = () => {
      if (finishedRef.current) return;

      const b = ball.current;
      const px = paddleXRef.current;

      // Keyboard input
      const k = keysDown.current;
      if (k.has("ArrowLeft") || k.has("a") || k.has("A")) {
        paddleXRef.current = Math.max(0, px - PADDLE_KB_SPEED);
      }
      if (k.has("ArrowRight") || k.has("d") || k.has("D")) {
        paddleXRef.current = Math.min(FIELD_W - PADDLE_W, px + PADDLE_KB_SPEED);
      }

      // Move ball
      b.x += b.vx;
      b.y += b.vy;

      // Wall bounces (left / right) — clamp angle to prevent near-horizontal chaos
      if (b.x - BALL_R <= 0) {
        b.x = BALL_R;
        b.vx = Math.abs(b.vx);
        clampBallAngle(b);
      } else if (b.x + BALL_R >= FIELD_W) {
        b.x = FIELD_W - BALL_R;
        b.vx = -Math.abs(b.vx);
        clampBallAngle(b);
      }

      // Gate / top-wall collision (ball moving upward)
      if (b.y - BALL_R <= GATE_H && b.vy < 0 && !outcomeLock.current) {
        let hitGate = -1;
        for (let i = 0; i < 3; i++) {
          if (b.x >= ranges[i].left && b.x <= ranges[i].right) {
            hitGate = i;
            break;
          }
        }

        if (hitGate >= 0) {
          const label = gateLabelsRef.current[hitGate];
          const round = ROUNDS[roundIndex];
          const isCorrect = label === round?.correctLabel;
          b.vx = 0;
          b.vy = 0;
          setHitGateIdx(hitGate);

          if (isCorrect) {
            resolveRef.current(true, `Yes! ${label} is correct!`);
          } else {
            resolveRef.current(
              false,
              `Almost! The answer was \u201c${round?.correctLabel}\u201d.`,
            );
          }
        } else {
          // Hit gate divider or side margin — bounce back down
          b.y = GATE_H + BALL_R + 1;
          b.vy = Math.abs(b.vy);
          clampBallAngle(b);
        }
      }

      // Paddle collision — softer reflection
      if (
        b.vy > 0 &&
        b.y + BALL_R >= PADDLE_Y &&
        b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
        b.x + BALL_R >= paddleXRef.current &&
        b.x - BALL_R <= paddleXRef.current + PADDLE_W
      ) {
        b.y = PADDLE_Y - BALL_R;
        const hitPos = (b.x - paddleXRef.current) / PADDLE_W; // 0..1
        const angle = (hitPos - 0.5) * MAX_BOUNCE_ANGLE;
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = Math.sin(angle) * speed;
        b.vy = -Math.cos(angle) * speed;
      }

      // Out-of-bounds (ball fell past paddle — gentle miss)
      if (b.y - BALL_R > FIELD_H && !outcomeLock.current) {
        resolveRef.current(false, "The ball got away! Try the next one.");
      }

      // Update DOM
      syncBall();
      syncPaddle();

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIndex]);

  // ── Paddle movement for non-active phases (keyboard still responsive) ──
  useEffect(() => {
    if (phase === "active" || phase === "complete") return;
    let id: number;
    const loop = () => {
      const k = keysDown.current;
      let moved = false;
      if (k.has("ArrowLeft") || k.has("a") || k.has("A")) {
        paddleXRef.current = Math.max(0, paddleXRef.current - PADDLE_KB_SPEED);
        moved = true;
      }
      if (k.has("ArrowRight") || k.has("d") || k.has("D")) {
        paddleXRef.current = Math.min(
          FIELD_W - PADDLE_W,
          paddleXRef.current + PADDLE_KB_SPEED,
        );
        moved = true;
      }
      if (moved) {
        syncPaddle();
        // Ball tracks paddle during aiming phase
        if (phaseRef.current === "waiting") snapBallToPaddle();
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // ── Global keyboard listeners ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      // Movement keys — aim only, never launch
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        keysDown.current.add(e.key);
      }
      // Explicit launch keys
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (phaseRef.current === "waiting") {
          launchRef.current();
        }
      }
    };
    const onUp = (e: KeyboardEvent) => keysDown.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // ── Pointer input (mouse + touch) — drag = aim, tap = launch ──

  /** Map a pointer event to paddle-space X and move paddle + docked ball. */
  const aimToPointer = useCallback((e: React.PointerEvent) => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * FIELD_W;
    paddleXRef.current = clamp(localX - PADDLE_W / 2, 0, FIELD_W - PADDLE_W);
    syncPaddle();
    if (phaseRef.current === "waiting") snapBallToPaddle();
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    fieldRef.current?.setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isDrag.current = false;
    aimToPointer(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    aimToPointer(e);
    // Check if movement exceeds drag threshold
    if (pointerStart.current && !isDrag.current) {
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        isDrag.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    // Tap (not drag) during waiting → launch
    if (phaseRef.current === "waiting" && !isDrag.current) {
      launchRef.current();
    }
    pointerStart.current = null;
    isDrag.current = false;
  }, []);

  // ── Cleanup on unmount ──
  useEffect(
    () => () => {
      haltEverything();
    },
    [],
  );

  // ── Render ──

  const ranges = gateRanges();

  return (
    <div className="space-y-3">
      {/* ── Clue Banner ── */}
      {currentRound && phase !== "complete" && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-lime-50 border border-emerald-200 p-4 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Round {roundIndex + 1} of {ROUNDS.length}
          </p>
          <p className="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl leading-snug">
            {currentRound.clueText}
          </p>
        </div>
      )}

      {/* ── HUD ── */}
      {phase !== "complete" && (
        <div className="flex items-center justify-between rounded-xl bg-white/80 border px-4 py-2 text-sm font-bold shadow-sm">
          <div
            className="flex items-center gap-0.5 text-lg"
            aria-label={`${lives} lives remaining`}
          >
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <span
                key={i}
                className={`transition-all duration-300 ${
                  i < lives ? "text-red-500 scale-100" : "text-gray-300 scale-75"
                }`}
              >
                {i < lives ? "\u2665" : "\u2661"}
              </span>
            ))}
          </div>
          <div className="text-emerald-700 tabular-nums">
            Score: {score}/{ROUNDS.length}
          </div>
          {streak >= 2 && (
            <div className={`${reducedEffects ? "" : "streak-fire"} text-amber-600 tabular-nums`}>
              {streak}x combo
            </div>
          )}
        </div>
      )}

      {/* ── Playfield (responsive wrapper) ── */}
      <div
        ref={wrapperRef}
        className="mx-auto select-none"
        style={{ maxWidth: FIELD_W }}
      >
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 shadow-lg"
          style={{ height: FIELD_H * scale }}
        >
          <div
            ref={fieldRef}
            className="absolute top-0 left-0 bg-gradient-to-b from-sky-200 via-sky-100 to-lime-100"
            style={{
              width: FIELD_W,
              height: FIELD_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Decorative grass strip */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-emerald-300/40 to-transparent" />

            {/* ── Gates ── */}
            {gateLabels.map((label, i) => {
              const isHit = hitGateIdx === i;
              const isCorrect = isHit && feedback?.correct;
              const isWrong = isHit && feedback && !feedback.correct;
              const gs = GATE_STYLES[i];
              return (
                <div
                  key={`gate-${roundIndex}-${i}`}
                  className={`absolute top-0 flex items-center justify-center rounded-b-2xl ring-2
                    font-extrabold text-base md:text-lg transition-all duration-200
                    ${isCorrect ? "bg-gradient-to-b from-green-300 to-green-400 ring-green-500 scale-105 shadow-lg shadow-green-300/50" : ""}
                    ${isWrong ? "bg-gradient-to-b from-red-200 to-red-300 ring-red-400 shake" : ""}
                    ${!isHit ? `bg-gradient-to-b ${gs.bg} ${gs.ring}` : ""}
                    ${gs.text}
                  `}
                  style={{
                    left: ranges[i].left,
                    width: GATE_W,
                    height: GATE_H,
                  }}
                >
                  <span className="px-2 text-center leading-tight drop-shadow-sm">
                    {label}
                  </span>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-white/40" />
                </div>
              );
            })}

            {/* ── Ball ── */}
            <div
              ref={ballElRef}
              className={`absolute rounded-full shadow-md transition-opacity duration-200
                ${phase === "transition" || phase === "complete" ? "opacity-0" : "opacity-100"}`}
              style={{
                width: BALL_R * 2,
                height: BALL_R * 2,
                background:
                  "radial-gradient(circle at 35% 35%, #a3e635, #16a34a)",
                border: "2px solid #15803d",
                transform: `translate(${FIELD_W / 2 - BALL_R}px, ${PADDLE_Y - BALL_R - 4}px)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] leading-none select-none">
                🌱
              </div>
            </div>

            {/* ── Paddle ── */}
            <div
              ref={paddleElRef}
              className="absolute rounded-full shadow-lg"
              style={{
                width: PADDLE_W,
                height: PADDLE_H,
                background: "linear-gradient(to right, #22c55e, #84cc16)",
                border: "2px solid #15803d",
                transform: `translate(${(FIELD_W - PADDLE_W) / 2}px, ${PADDLE_Y}px)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow select-none">
                🍃 Buddy
              </div>
            </div>

            {/* ── Sparkles ── */}
            {shouldRenderBounceSparkles(reducedEffects) && sparkles.map((s) => (
              <div
                key={s.id}
                className="absolute w-3 h-3 rounded-full bg-yellow-300 hit-burst pointer-events-none"
                style={{ left: s.x, top: s.y }}
              />
            ))}

            {/* ── Ready overlay ── */}
            {phase === "ready" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bounce-in rounded-2xl bg-white/90 px-8 py-4 shadow-xl border border-emerald-200">
                  <p className="text-2xl font-extrabold text-emerald-700">
                    Get Ready!
                  </p>
                </div>
              </div>
            )}

            {/* ── Waiting overlay — aim then tap anywhere to launch ── */}
            {phase === "waiting" && (
              <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
                <p className="slide-up-fade text-sm font-bold text-emerald-800 bg-white/80 px-4 py-1.5 rounded-full shadow">
                  Drag to aim. Tap anywhere to bounce!
                </p>
              </div>
            )}

            {/* ── Feedback overlay ── */}
            {feedback && phase === "resolved" && (
              <div
                className="absolute inset-x-0 flex justify-center pointer-events-none"
                style={{ bottom: 80 }}
              >
                <div
                  className={`bounce-in rounded-2xl px-6 py-3 text-lg font-bold shadow-xl max-w-[90%] text-center
                    ${
                      feedback.correct
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-red-700 border-2 border-red-300"
                    }`}
                >
                  {feedback.text}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Controls hint ── */}
      {phase !== "complete" && (
        <p className="text-center text-xs text-slate-400">
          {t("games.bounceBuds.controls", {
            defaultValue:
              "\u2190 \u2192 to aim \u2022 Space to bounce \u2022 or drag to aim, tap to launch",
          })}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Angle clamping — prevent near-horizontal chaos after wall bounces
// ═══════════════════════════════════════════════════════════════════════════

/** Ensure ball always has meaningful vertical speed (avoids endless horizontal bouncing). */
function clampBallAngle(b: { vx: number; vy: number }) {
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (speed === 0) return;
  const angle = Math.atan2(b.vx, -b.vy); // angle from vertical-up
  const maxAngle = 1.1; // ~63 degrees from vertical
  if (Math.abs(angle) > maxAngle) {
    const clamped = Math.sign(angle) * maxAngle;
    const dir = b.vy < 0 ? -1 : 1; // preserve vertical direction
    b.vx = Math.sin(clamped) * speed;
    b.vy = dir * Math.cos(clamped) * speed * (dir < 0 ? 1 : -1);
    // Ensure vertical direction didn't flip
    if (dir < 0) b.vy = -Math.abs(Math.cos(clamped) * speed);
    else b.vy = Math.abs(Math.cos(clamped) * speed);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════════

export default function BounceBudsGame({
  config,
  onComplete,
}: {
  config?: any;
  onComplete?: (result: GameResult) => void;
}) {
  return (
    <GameShell
      gameKey="buddy_garden_sort"
      title="Bounce & Buds"
      briefing={BRIEFING}
      onComplete={onComplete ?? (() => {})}
    >
      {({ onFinish, reducedEffects }) => (
        <BouncePlayfield onFinish={onFinish} config={config} reducedEffects={reducedEffects} />
      )}
    </GameShell>
  );
}
