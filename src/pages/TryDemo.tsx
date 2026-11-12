/**
 * /try — public, zero-signup playable demo (homepage growth lever).
 *
 * Implements Part 3 of docs/audits/k8-engagement-audit.md: a skeptical
 * teacher lands here from a colleague's link, on a phone, with 60 seconds.
 * One tap starts a real K-2 game (Tank Trek — the audit's no-fail gold
 * standard); finishing lands on a "save your stars → sign up free"
 * conversion moment. The URL itself is the share unit.
 *
 * ISOLATION CONTRACT (the critical property of this page):
 *  - No auth context, no user state, no API calls. The only network
 *    traffic permitted from this route is PostHog.
 *  - TankTrekGame is self-contained (config + onComplete props); its
 *    GameShell chrome reads personal bests only when a session token
 *    exists (see usePersonalBest), so anonymous visits stay 401-free.
 *  - Demo level config is hardcoded below — never fetched.
 *
 * Analytics (typed events in src/lib/analytics.ts, documented in
 * docs/analytics.md): demo_page_viewed → demo_game_started →
 * demo_game_completed → demo_signup_cta_clicked, plus demo_replayed.
 * Visitors stay anonymous; PostHog stitches the session to the identity
 * if they later sign up.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import TankTrekGame from "@/components/games/TankTrekGame";
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
import {
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";

export default function TryDemo() {
  const { t } = useTranslation();
  const lang = useRenderedLanguage();
  usePublicPageMeta(
    t("home.demo.metaTitle"),
    t("home.demo.metaDescription"),
    lang,
  );
  const { search } = useLocation();
  const band =
    new URLSearchParams(search).get("band") === "g3_5" ? "g3_5" : "k2";
  const demoConfig = band === "g3_5" ? G35_DEMO_CONFIG : DEMO_CONFIG;
  const [finished, setFinished] = useState<GameResult | null>(null);
  // Remount key — bumping it restarts the game cleanly for "Play again".
  const [playKey, setPlayKey] = useState(0);
  const startedFired = useRef(false);
  const startMsRef = useRef(Date.now());

  useEffect(() => {
    track({ kind: "demo_page_viewed", source: "direct" });
  }, []);

  // demo_game_started fires on the first interaction inside the game area.
  // GameShell's briefing screen has exactly one interactive element (the
  // Start Mission button), so the first click is the start tap in practice.
  // Capture-phase so the game's own handlers are untouched.
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
    setPlayKey((k) => k + 1);
  }, []);

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

      <main className="mx-auto max-w-4xl px-2 sm:px-4 pb-10">
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
                const best = readDemoBest();
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
          /* ── States 1+2: GameShell briefing (the one-tap gate) + play ── */
          // onClickCapture observes the first interaction without touching
          // the game's own handlers — see handleFirstInteraction.
          <div onClickCapture={handleFirstInteraction}>
            <TankTrekGame
              key={`${band}-${playKey}`}
              config={demoConfig}
              onComplete={handleComplete}
              publicDemo
            />
          </div>
        )}
      </main>
    </div>
  );
}
