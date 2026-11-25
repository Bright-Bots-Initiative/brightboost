/** Featured homepage games load one at a time after the first paint.
 * Anonymous plays use the public game's analytics identity and never submit
 * student progress. The parent page only needs the band and a readiness signal.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RadioTower, Star } from "lucide-react";
import type { GameResult } from "@/components/games/shared/GameShell";
import {
  G35_DEMO_CONFIG,
  DEMO_GAME_ID,
  writeDemoBest,
} from "@/components/games/tankTrekDemo";
import { track } from "@/lib/analytics";
import { PUBLIC_ACTION_PRIMARY, PUBLIC_ACTION_QUIET } from "./publicEntry";
import DemoErrorBoundary from "./DemoErrorBoundary";
import {
  homeDemoHref,
  isCoveControlClick,
  isCoveControlPress,
  isDemoPlayKey,
  QUBIT_COVE_DEMO_ID,
} from "./featuredDemo";

type GameModule = typeof import("@/components/games/qubitCove/QubitCoveGame");

/** How the game chunk is fetched. A prop only so a test can resolve or reject
 *  it on demand; the page never passes one. */
export type LoadGame = () => Promise<GameModule>;

const loadQubitCove: LoadGame = () =>
  import("@/components/games/qubitCove/QubitCoveGame");
const loadTankTrek = () => import("@/components/games/PublicTankTrek");

export interface PublicDemoProps {
  loadGame?: LoadGame;
  onBandChange?: (band: "k2" | "g3_5") => void;
  /** Extra class names for the outer panel (the homepage places it in a grid). */
  className?: string;
  /** The homepage re-settles a fragment landing once the first game is visible. */
  onReady?: () => void;
}

/**
 * Mounted as a sibling of the lazy game INSIDE the Suspense boundary, so its
 * effect cannot run until that boundary has resolved and the game is on
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
  onBandChange,
}: PublicDemoProps) {
  const { t, i18n } = useTranslation();
  const [armed, setArmed] = useState(false);
  const [demoBand, setDemoBand] = useState<"k2" | "g3_5">("k2");
  /** Bumped by "Try again": it rebuilds the lazy component, so the retry is a
   *  real second import rather than React replaying the cached rejection. */
  const [attempt, setAttempt] = useState(0);
  /** Bumped by "Play again": remounts the one game instance from the beginning. */
  const [playKey, setPlayKey] = useState(0);
  const [finished, setFinished] = useState<GameResult | null>(null);
  const startedFired = useRef(false);
  const startMsRef = useRef(Date.now());

  const isCove = demoBand === "k2";
  const gameId = isCove ? QUBIT_COVE_DEMO_ID : DEMO_GAME_ID;
  // Construct fresh lazy components on retry so React can retry a failed import.
  const [Cove, TankTrek] = useMemo(
    () => [lazy(loadGame ?? loadQubitCove), lazy(loadTankTrek)] as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadGame, attempt],
  );

  // After the first paint, not during it: the homepage's own content is what a
  // visitor reads first, and the chunk is ~ the whole game.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleFirstInteraction = useCallback(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    startMsRef.current = Date.now();
    track({ kind: "demo_game_started", game_id: gameId });
  }, [gameId]);

  const handleComplete = useCallback(
    (result: GameResult) => {
      track({
        kind: "demo_game_completed",
        game_id: gameId,
        score: result.score,
        stars: result.starsEarned ?? 0,
        time_spent_seconds: Math.max(
          1,
          Math.round((Date.now() - startMsRef.current) / 1000),
        ),
      });
      if (!isCove) writeDemoBest(result.starsEarned ?? 0);
      setFinished(result);
    },
    [gameId, isCove],
  );

  const recordReplay = useCallback(() => {
    track({ kind: "demo_replayed", game_id: gameId });
    startedFired.current = false;
  }, [gameId]);

  function handlePlayAgain() {
    recordReplay();
    setFinished(null);
    setPlayKey((key) => key + 1);
  }

  const handleRetry = useCallback(() => setAttempt((n) => n + 1), []);
  const switchDemoBand = (next: "k2" | "g3_5") => {
    if (next === demoBand) return;
    setDemoBand(next);
    setReady(false);
    onBandChange?.(next);
    setFinished(null);
    startedFired.current = false;
    setPlayKey((n) => n + 1);
  };
  const fullScreenHref = homeDemoHref(demoBand);

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

  const resultLanguage = isCove
    ? i18n.resolvedLanguage || i18n.language
    : undefined;
  const stars = finished?.starsEarned ?? 0;
  const ResultIcon = isCove ? RadioTower : Star;

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
              <ResultIcon
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
            lang={resultLanguage}
            tabIndex={-1}
            className="mt-3 text-2xl font-extrabold"
          >
            {t(isCove ? "qubitCove.won" : "home.demo.completeTitle")}
          </h3>
          <p
            lang={resultLanguage}
            className="mt-1 text-[color:var(--bb-color-text-muted)]"
          >
            {isCove ? (
              t("qubitCove.lights", { count: finished.roundsCompleted })
            ) : (
              <>
                {t("home.demo.starsLabel")}{" "}
                <strong data-testid="demo-stars">{stars}</strong> / 3
              </>
            )}
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
        <DemoErrorBoundary key={`${demoBand}-${attempt}`} fallback={failure}>
          <Suspense fallback={loading}>
            {armed ? (
              <div
                key={playKey}
                onClickCapture={(event) => {
                  if (!isCove || isCoveControlClick(event))
                    handleFirstInteraction();
                }}
                onPointerDownCapture={(event) => {
                  if (isCove && isCoveControlPress(event))
                    handleFirstInteraction();
                }}
                onKeyDownCapture={(event) => {
                  if (isCove && isDemoPlayKey(event)) handleFirstInteraction();
                }}
              >
                {isCove ? (
                  <Cove
                    storageScope="homepage-demo"
                    embedded
                    onReplay={recordReplay}
                    onComplete={handleComplete}
                  />
                ) : (
                  <TankTrek
                    config={G35_DEMO_CONFIG}
                    onComplete={handleComplete}
                  />
                )}
                <ReadySignal onReady={handleReady} />
              </div>
            ) : (
              loading
            )}
          </Suspense>
        </DemoErrorBoundary>
      )}
    </div>
  );
}
