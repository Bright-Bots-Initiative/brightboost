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
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import TankTrekGame, {
  type TankTrekConfig,
} from "@/components/games/TankTrekGame";
import type { GameResult } from "@/components/games/shared/GameShell";
import { track } from "@/lib/analytics";

const DEMO_GAME_ID = "tank_trek_demo";

/**
 * Three short, winnable levels (mirrors Tank Trek chapter 1 "Learning to
 * Move"). Hardcoded so the route has zero data dependencies. Multilingual
 * fields follow the game's own content shape.
 */
const DEMO_CONFIG: TankTrekConfig = {
  gameKey: "tank_trek",
  chapters: [
    {
      id: "demo-ch1",
      titles: {
        en: "Learning to Move",
        es: "Aprender a Moverse",
        vi: "Học Di Chuyển",
        "zh-CN": "学习移动",
      },
      theme: "lab",
      levels: [
        {
          id: "demo-1",
          names: { en: "Go Straight!", es: "¡Ve Recto!", vi: "Đi Thẳng!", "zh-CN": "直走！" },
          cols: 3, rows: 3, startRow: 2, startCol: 1, startDir: "N", par: 2,
          storySnippets: {
            en: "Bolt just powered on! Press Forward to reach the green goal!",
            es: "¡Bolt acaba de encenderse! ¡Presiona Adelante para llegar a la meta!",
            vi: "Bolt vừa bật! Nhấn Tiến để đến đích xanh!",
            "zh-CN": "Bolt启动了！按前进到达绿色目标！",
          },
          hints: {
            en: "Tap Forward two times!",
            es: "¡Toca Adelante dos veces!",
            vi: "Nhấn Tiến hai lần!",
            "zh-CN": "点两次前进！",
          },
          grid: [
            ["wall", "goal", "wall"],
            ["wall", "floor", "wall"],
            ["wall", "start", "wall"],
          ],
        },
        {
          id: "demo-2",
          names: { en: "First Turn", es: "Primer Giro", vi: "Rẽ Đầu Tiên", "zh-CN": "第一次转弯" },
          cols: 3, rows: 3, startRow: 2, startCol: 0, startDir: "N", par: 4,
          storySnippets: {
            en: "The path turns! Go forward, then turn right and go forward again.",
            es: "¡El camino gira! Avanza, gira a la derecha y avanza de nuevo.",
            vi: "Đường rẽ! Tiến lên, rẽ phải rồi tiến tiếp.",
            "zh-CN": "路转弯了！先前进，然后右转再前进。",
          },
          hints: {
            en: "Forward, Turn Right, Forward, Forward",
            es: "Adelante, Girar Derecha, Adelante, Adelante",
            vi: "Tiến, Rẽ phải, Tiến, Tiến",
            "zh-CN": "前进、右转、前进、前进",
          },
          grid: [
            ["wall", "floor", "goal"],
            ["wall", "floor", "floor"],
            ["start", "floor", "wall"],
          ],
        },
        {
          id: "demo-3",
          names: { en: "Turn Left", es: "Gira Izquierda", vi: "Rẽ Trái", "zh-CN": "左转" },
          cols: 3, rows: 3, startRow: 2, startCol: 2, startDir: "N", par: 4,
          storySnippets: {
            en: "Now try turning left! The goal is on the other side.",
            es: "¡Ahora gira a la izquierda! La meta está al otro lado.",
            vi: "Bây giờ thử rẽ trái! Đích ở bên kia.",
            "zh-CN": "现在试试左转！目标在另一边。",
          },
          hints: {
            en: "Forward, Turn Left, Forward, Forward",
            es: "Adelante, Girar Izquierda, Adelante, Adelante",
            vi: "Tiến, Rẽ trái, Tiến, Tiến",
            "zh-CN": "前进、左转、前进、前进",
          },
          grid: [
            ["goal", "floor", "wall"],
            ["floor", "floor", "wall"],
            ["wall", "floor", "start"],
          ],
        },
      ],
    },
  ],
};

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector(
    `meta[name="${name}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function TryDemo() {
  const { t } = useTranslation();
  const [finished, setFinished] = useState<GameResult | null>(null);
  // Remount key — bumping it restarts the game cleanly for "Play again".
  const [playKey, setPlayKey] = useState(0);
  const startedFired = useRef(false);
  const startMsRef = useRef(Date.now());

  useEffect(() => {
    track({ kind: "demo_page_viewed", source: "direct" });
    const previousTitle = document.title;
    document.title = "Try Bright Boost — free STEM game, no signup";
    upsertMeta(
      "description",
      "Play a real Bright Boost K-2 STEM game right now — free, no account needed. Program Bolt the robot through the maze!",
    );
    return () => {
      document.title = previousTitle;
    };
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
              <p className="text-sm font-medium text-brightboost-navy/80">
                {t("tryDemo.resultsPitch", {
                  defaultValue:
                    "Sign up free to save your stars and unlock 9 more games.",
                })}
              </p>
              <Link
                to="/signup"
                onClick={() =>
                  track({
                    kind: "demo_signup_cta_clicked",
                    placement: "results",
                  })
                }
                className="inline-flex items-center justify-center w-full min-h-[48px] px-6 py-3 rounded-[12px] font-extrabold bg-brightboost-navy text-white hover:brightness-110 active:translate-y-[2px] button-shadow"
              >
                {t("tryDemo.signupCta", { defaultValue: "Sign up free →" })}
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
              key={playKey}
              config={DEMO_CONFIG}
              onComplete={handleComplete}
            />
          </div>
        )}
      </main>
    </div>
  );
}
