/**
 * The homepage's playable panel: ONE instance of the real Tank Trek game.
 *
 * Not a screenshot, not a scripted imitation and not a second copy of `/try`.
 * It mounts `TankTrekGame` with the same `DEMO_CONFIG` the `/try` route uses,
 * so the briefing, the mazes, the controls, the timing, the stars and the
 * three levels are the shipped game — this component owns only what sits
 * around it: the loading box, the failure state, and the card that appears
 * after the run.
 *
 * Four properties are deliberate and each has a test:
 *
 *  1. **One engine.** A single panel, placed with CSS grid rather than
 *     rendered twice for two breakpoints, so no second game exists off-screen
 *     keeping its own timers. "Play again" remounts THIS instance with a key.
 *  2. **Lazy, after the first paint.** The game chunk is imported from an
 *     effect, so the homepage's text and actions paint first and a visitor who
 *     never scrolls to the panel pays for it after everything else. The box
 *     reserves its height before the chunk arrives, so nothing below it moves.
 *  3. **A failure is never the learner's.** If the chunk cannot load, the
 *     panel says so in its own words, offers "Try again" (which re-imports)
 *     and a plain link to `/try`. It never renders as a lost game.
 *  4. **Public means public.** `publicDemo` turns GameShell's personal-best
 *     read off, so a stale `bb_access_token` in this browser cannot make the
 *     homepage issue an authenticated request. See `usePersonalBest`.
 *
 * Analytics: the existing demo kinds only, with the same meanings they have on
 * `/try` — `demo_game_started` on the first interaction inside the game,
 * `demo_game_completed` when the run ends, `demo_replayed` on "Play again".
 * `demo_page_viewed` belongs to the `/try` page view and is never fired here.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { GameResult } from "@/components/games/shared/GameShell";
import {
  DEMO_CONFIG,
  G35_DEMO_CONFIG,
  DEMO_GAME_ID,
  writeDemoBest,
} from "@/components/games/tankTrekDemo";
import { track } from "@/lib/analytics";
import { PUBLIC_ACTION_PRIMARY, PUBLIC_ACTION_QUIET } from "./publicEntry";

type GameModule = typeof import("@/components/games/TankTrekGame");

/** How the game chunk is fetched. A prop only so a test can resolve or reject
 *  it on demand; the page never passes one. */
export type LoadGame = () => Promise<GameModule>;

const loadTankTrek: LoadGame = () => import("@/components/games/TankTrekGame");

export interface PublicDemoProps {
  loadGame?: LoadGame;
  /** Extra class names for the outer panel (the homepage places it in a grid). */
  className?: string;
  /**
   * Called once per mount, after the lazy game has actually rendered its
   * briefing — never while the box is still reserved, never on the failure
   * path, and not again on a replay. The homepage uses it for one thing: a
   * visitor who arrived on `/#plans` had their landing computed before the
   * briefing replaced the reserved box, and the box is 4px short of the real
   * card, so the anchor is re-settled once when the swap is done.
   */
  onReady?: () => void;
}

/* ── The failure boundary ────────────────────────────────────────────────── */

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

class DemoErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in the console for whoever is debugging a failed chunk; nothing is
    // sent anywhere, and the visitor sees the fallback, not this.
    console.error("Public demo failed to load", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Mounted as a sibling of the lazy game INSIDE the Suspense boundary, so its
 * effect cannot run until that boundary has resolved and the briefing is on
 * screen. A `useEffect` on the panel itself would fire while the box was still
 * empty, and an observer or a timer would only be guessing at the same moment.
 */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export default function PublicDemo({
  loadGame,
  className,
  onReady,
}: PublicDemoProps) {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);
  const [demoBand, setDemoBand] = useState<"k2" | "g3_5">("k2");
  /** Bumped by "Try again": it rebuilds the lazy component, so the retry is a
   *  real second import rather than React replaying the cached rejection. */
  const [attempt, setAttempt] = useState(0);
  /** Bumped by "Play again": remounts the one game instance at its briefing. */
  const [playKey, setPlayKey] = useState(0);
  const [finished, setFinished] = useState<GameResult | null>(null);
  const startedFired = useRef(false);
  const startMsRef = useRef(Date.now());

  const load = loadGame ?? loadTankTrek;
  const Game = useMemo(
    () => lazy(load),
    // `attempt` is the point: a new lazy component is a new import.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, attempt],
  );

  // After the first paint, not during it: the homepage's own content is what a
  // visitor reads first, and the chunk is ~ the whole game.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * `demo_game_started` on the first interaction inside the game area, in the
   * capture phase so the game's own handlers are untouched — the same pattern
   * `/try` uses. The briefing has exactly one interactive control, so in
   * practice the first click is the Start Mission tap.
   */
  const handleFirstInteraction = useCallback(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    startMsRef.current = Date.now();
    track({ kind: "demo_game_started", game_id: DEMO_GAME_ID });
  }, []);

  const handleComplete = useCallback((result: GameResult) => {
    track({
      kind: "demo_game_completed",
      game_id: DEMO_GAME_ID,
      score: result.score,
      stars: result.starsEarned ?? 0,
      time_spent_seconds: Math.max(
        1,
        Math.round((Date.now() - startMsRef.current) / 1000),
      ),
    });
    writeDemoBest(result.starsEarned ?? 0);
    setFinished(result);
  }, []);

  const handlePlayAgain = useCallback(() => {
    track({ kind: "demo_replayed", game_id: DEMO_GAME_ID });
    startedFired.current = false;
    setFinished(null);
    setPlayKey((key) => key + 1);
  }, []);

  const handleRetry = useCallback(() => setAttempt((n) => n + 1), []);
  const switchDemoBand = (next: "k2" | "g3_5") => {
    if (next === demoBand) return;
    setDemoBand(next);
    setFinished(null);
    startedFired.current = false;
    setPlayKey((n) => n + 1);
  };
  const fullScreenHref = demoBand === "g3_5" ? "/try?band=g3_5" : "/try";

  /** Once per mount: a replay remounts the game, not the panel. */
  const readyFired = useRef(false);
  /** Drives `data-ready`, which releases the reserved height — the box exists
   *  to stop the page moving while the game is on its way, and once the game
   *  is here the panel should be as tall as what it holds (the completion card
   *  otherwise floats in ~500px of empty panel). */
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => {
    setReady(true);
    if (readyFired.current) return;
    readyFired.current = true;
    onReady?.();
  }, [onReady]);

  /**
   * When the run ends, the card that replaces the game is shorter than the
   * screen the player was looking at, so the page they were scrolled into
   * collapses under them and the result can land above the viewport. Moving
   * focus to the card's heading fixes both halves at once: a screen reader is
   * told what happened, and the browser brings the heading into view. It only
   * ever runs in response to the player finishing.
   */
  const completeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (finished) completeHeadingRef.current?.focus();
  }, [finished]);

  const stars = finished?.starsEarned ?? 0;

  const loading = (
    <p className="bb-demo-status" role="status">
      {t("home.demo.loading")}
    </p>
  );

  const failure = (
    <div className="bb-demo-status">
      <p className="font-extrabold text-[color:var(--bb-color-text)]">
        {t("home.demo.errorTitle")}
      </p>
      <p className="mt-2 max-w-[42ch] text-[color:var(--bb-color-text-muted)]">
        {t("home.demo.errorBody")}
      </p>
      <p className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className={PUBLIC_ACTION_PRIMARY}
          onClick={handleRetry}
        >
          {t("home.demo.retry")}
        </button>
        <Link to={fullScreenHref} className={PUBLIC_ACTION_QUIET}>
          {t("home.demo.openFull")}
        </Link>
      </p>
    </div>
  );

  return (
    <div
      className={`bb-public-demo ${className ?? ""}`}
      data-testid="public-demo"
      data-ready={ready ? "true" : "false"}
    >
      <div
        className="bb-demo-bands"
        role="group"
        aria-label={t("home.demo.bandLabel")}
      >
        {(["k2", "g3_5"] as const).map((band) => (
          <button
            key={band}
            type="button"
            aria-pressed={demoBand === band}
            onClick={() => switchDemoBand(band)}
            className={
              "bb-demo-band" + (demoBand === band ? " is-selected" : "")
            }
          >
            {t(band === "k2" ? "home.demo.bandK2" : "home.demo.bandG35")}
          </button>
        ))}
      </div>
      {finished ? (
        <div className="bb-demo-complete">
          <p className="flex justify-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={
                  i < stars
                    ? "h-9 w-9 fill-yellow-400 text-yellow-400"
                    : "h-9 w-9 fill-slate-100 text-slate-300"
                }
              />
            ))}
          </p>
          <h3
            ref={completeHeadingRef}
            tabIndex={-1}
            className="mt-3 text-2xl font-extrabold"
          >
            {t("home.demo.completeTitle")}
          </h3>
          {/* The count is its own node rather than an interpolated string, so
              the number a visitor reads is the number the result carries and
              the assertion in the test is on that number, not on a sentence. */}
          <p className="mt-1 text-[color:var(--bb-color-text-muted)]">
            {t("home.demo.starsLabel")}{" "}
            <strong data-testid="demo-stars">{stars}</strong> / 3
          </p>
          <p className="mt-5">
            <button
              type="button"
              className={PUBLIC_ACTION_PRIMARY}
              onClick={handlePlayAgain}
            >
              {t("home.demo.playAgain")}
            </button>
          </p>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[color:var(--bb-color-text-muted)]">
            {t("home.demo.adultsLabel")}
          </p>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3">
            <Link
              to="/for-teachers"
              className={PUBLIC_ACTION_QUIET}
              onClick={() => track({ kind: "teacher_page_clicked" })}
            >
              {t("home.demo.teacherLink")}
            </Link>
            <Link
              to="/for-families"
              className={PUBLIC_ACTION_QUIET}
              onClick={() => track({ kind: "parent_page_clicked" })}
            >
              {t("home.demo.familyLink")}
            </Link>
          </p>
          <p className="mt-2">
            <Link to={fullScreenHref} className={PUBLIC_ACTION_QUIET}>
              {t("home.demo.openFull")}
            </Link>
          </p>
        </div>
      ) : (
        /* `onClickCapture` observes the first interaction without touching the
           game's own handlers; `key` is how "Play again" restarts this one
           instance instead of adding a second. */
        <div key={playKey} onClickCapture={handleFirstInteraction}>
          <DemoErrorBoundary key={attempt} fallback={failure}>
            <Suspense fallback={loading}>
              {armed ? (
                <>
                  <Game
                    config={demoBand === "k2" ? DEMO_CONFIG : G35_DEMO_CONFIG}
                    onComplete={handleComplete}
                    publicDemo
                  />
                  <ReadySignal onReady={handleReady} />
                </>
              ) : (
                loading
              )}
            </Suspense>
          </DemoErrorBoundary>
        </div>
      )}
    </div>
  );
}
