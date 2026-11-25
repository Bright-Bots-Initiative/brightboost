/** Public games share the anonymous demo funnel. Only Tank Trek uses the local stars record. */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import {
  DEMO_GAME_ID,
  DEMO_CONFIG,
  G35_DEMO_CONFIG,
  readDemoBest,
  writeDemoBest,
} from "@/components/games/tankTrekDemo";
export {
  DEMO_CONFIG,
  readDemoBest,
  writeDemoBest,
} from "@/components/games/tankTrekDemo";
import type { GameResult } from "@/components/games/shared/GameShell";
import { track } from "@/lib/analytics";
import DemoErrorBoundary from "@/components/home/DemoErrorBoundary";
import {
  isCoveControlClick,
  isCoveControlPress,
  isDemoPlayKey,
  QUBIT_COVE_DEMO_GAME,
  QUBIT_COVE_DEMO_ID,
} from "@/components/home/featuredDemo";
import {
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";

const TankTrekGame = lazy(() => import("@/components/games/PublicTankTrek"));
const QubitCoveGame = lazy(
  () => import("@/components/games/qubitCove/QubitCoveGame"),
);
type DemoSelection = typeof QUBIT_COVE_DEMO_GAME | "k2" | "g3_5";

export default function TryDemo() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const selection: DemoSelection =
    params.get("game") === QUBIT_COVE_DEMO_GAME
      ? QUBIT_COVE_DEMO_GAME
      : params.get("band") === "g3_5"
        ? "g3_5"
        : "k2";
  useEffect(() => {
    track({ kind: "demo_page_viewed", source: "direct" });
  }, []);
  return <TrySession key={selection} selection={selection} />;
}

function TrySession({ selection }: { selection: DemoSelection }) {
  const { t } = useTranslation();
  const lang = useRenderedLanguage();
  const isCove = selection === QUBIT_COVE_DEMO_GAME;
  const gameId = isCove ? QUBIT_COVE_DEMO_ID : DEMO_GAME_ID;
  usePublicPageMeta(
    isCove
      ? `${t("qubitCove.title", { lng: lang })} · Bright Boost`
      : t("home.demo.metaTitle"),
    t(isCove ? "qubitCove.goal" : "home.demo.metaDescription", { lng: lang }),
    lang,
  );
  const [finished, setFinished] = useState<GameResult | null>(null);
  // Remount key — bumping it restarts the game cleanly for "Play again".
  const [playKey, setPlayKey] = useState(0);
  const startedFired = useRef(false);
  const startMsRef = useRef(Date.now());

  const handleFirstInteraction = useCallback(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    startMsRef.current = Date.now();
    track({ kind: "demo_game_started", game_id: gameId });
  }, [gameId]);

  const playArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isCove || finished) return;
    // Full-screen Cove also accepts movement before the canvas has focus.
    function startFromBody(event: KeyboardEvent) {
      if (
        event.target === document.body &&
        isDemoPlayKey(event) &&
        playArea.current
      ) {
        handleFirstInteraction();
      }
    }
    window.addEventListener("keydown", startFromBody);
    return () => window.removeEventListener("keydown", startFromBody);
  }, [isCove, finished, handleFirstInteraction]);

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

  const trackReplay = useCallback(() => {
    track({ kind: "demo_replayed", game_id: gameId });
    startedFired.current = false;
  }, [gameId]);

  function handlePlayAgain() {
    trackReplay();
    setFinished(null);
    setPlayKey((k) => k + 1);
  }

  const stars = finished?.starsEarned ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brightboost-lightblue to-white">
      {/* Slim header — logo home link + the no-signup promise */}
      <header className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="font-extrabold text-brightboost-navy tracking-tight text-lg"
        >
          Bright Boost
        </Link>
        <p className="text-xs sm:text-sm font-semibold text-brightboost-navy/80 text-right">
          {t("tryDemo.tagline", {
            defaultValue: "A real Bright Boost game — no signup needed",
          })}
        </p>
      </header>

      <main
        className={`mx-auto max-w-4xl pb-10 sm:px-4 ${isCove ? "px-4" : "px-2"}`}
      >
        {finished ? (
          /* ── State 3: results echo + conversion moment ── */
          <div className="max-w-md mx-auto mt-8 space-y-5">
            <div className="rounded-2xl border-2 border-[#46B1E6]/20 bg-white shadow-md p-6 text-center space-y-4">
              <div className="flex justify-center gap-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-10 h-10 ${
                      i < stars
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-200 fill-slate-100"
                    }`}
                  />
                ))}
              </div>
              <h1 className="text-2xl font-extrabold text-brightboost-navy">
                {t("tryDemo.resultsHeading", {
                  defaultValue: "You did it!",
                })}
              </h1>
              {(() => {
                const best = isCove ? null : readDemoBest();
                return best && best.stars > stars ? (
                  <p className="text-xs font-semibold text-brightboost-navy/60">
                    {t("tryDemo.bestStars", {
                      defaultValue: "Your best: {{stars}}",
                      stars: "⭐".repeat(best.stars),
                    })}
                  </p>
                ) : null;
              })()}
              <p className="text-sm font-medium text-brightboost-navy/80">
                {t("home.demo.staysLocal")}
              </p>
              <Link
                to="/#for-adults"
                onClick={() =>
                  track({
                    kind: "demo_signup_cta_clicked",
                    placement: "results",
                  })
                }
                className="inline-flex items-center justify-center w-full min-h-[48px] px-6 py-3 rounded-[12px] font-extrabold bg-brightboost-navy text-white hover:brightness-110 active:translate-y-[2px] button-shadow"
              >
                {t("home.demo.adultEntry")}
              </Link>
              <button
                type="button"
                onClick={handlePlayAgain}
                className="inline-flex items-center justify-center w-full min-h-[44px] px-4 py-2 rounded-[12px] font-bold text-brightboost-blue hover:bg-brightboost-lightblue/30 transition-colors"
              >
                {t("tryDemo.playAgain", { defaultValue: "Play again" })}
              </button>
            </div>

            {/* Teacher whisper */}
            <p className="text-center text-sm text-brightboost-navy/70">
              {t("tryDemo.teacherWhisper", { defaultValue: "Teacher?" })}{" "}
              <Link
                to="/teacher/signup"
                onClick={() =>
                  track({
                    kind: "demo_signup_cta_clicked",
                    placement: "hero_teacher_whisper",
                  })
                }
                className="font-bold text-brightboost-blue underline underline-offset-2"
              >
                {t("tryDemo.teacherWhisperCta", {
                  defaultValue: "Set up your class in under 2 minutes",
                })}
              </Link>
            </p>
          </div>
        ) : (
          <DemoErrorBoundary
            fallback={
              <div role="alert" className="space-y-3 p-4 text-center">
                <p>{t("home.demo.errorTitle")}</p>
                <button
                  type="button"
                  className="font-bold underline"
                  onClick={() => window.location.reload()}
                >
                  {t("home.demo.retry")}
                </button>
              </div>
            }
          >
            <Suspense fallback={<p role="status">{t("home.demo.loading")}</p>}>
              <div
                ref={playArea}
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
                  <QubitCoveGame
                    key={playKey}
                    storageScope="public-demo"
                    onComplete={handleComplete}
                    onReplay={trackReplay}
                  />
                ) : (
                  <TankTrekGame
                    key={playKey}
                    config={
                      selection === "g3_5" ? G35_DEMO_CONFIG : DEMO_CONFIG
                    }
                    onComplete={handleComplete}
                  />
                )}
              </div>
            </Suspense>
          </DemoErrorBoundary>
        )}
      </main>
    </div>
  );
}
