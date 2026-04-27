/**
 * Sky Shield Patterns — turn-based pattern-recognition game for K-2.
 * Light drops fall in 3 lanes; learner catches, predicts patterns, and scans mystery lights.
 * Non-violent vocabulary only: "shield", "protect", "catch", "scan".
 * Phases: intro -> practice -> pattern -> scan -> challenge -> exitTicket -> celebration
 */
import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GameShell, { type GameResult, type MissionBriefing } from "./shared/GameShell";
import "./shared/game-effects.css";

// ── Constants & Types ─────────────────────────────────────────────────────
const LABELS = ["🔵", "🟡", "🩷"];
const SHIELD_BG = ["bg-blue-500", "bg-yellow-500", "bg-pink-500"];
const LANE_BG = ["bg-blue-400/20", "bg-yellow-400/20", "bg-pink-400/20"];
export const PT = { catch: 10, predict: 20, scan: 15 };
const PRACTICE_N = 5, PATTERN_N = 3, CHALLENGE_N = 10, MYSTERY_N = 2;

type Phase = "intro" | "practice" | "pattern" | "scan" | "challenge" | "exitTicket" | "celebration";
interface Drop { lane: number; kind: "normal" | "mystery"; hiddenColor?: number }

const BRIEFING: MissionBriefing = {
  title: "Sky Shield Patterns",
  story: "Light drops are falling from the sky! Watch the pattern and place your shield to protect the land.",
  icon: "🛡️",
  tips: ["Watch which lane the light falls in", "Look for repeating patterns", "Scan mystery lights before choosing"],
  chapterLabel: "Pattern Lab",
  themeColor: "violet",
};

// ── Helpers ───────────────────────────────────────────────────────────────
const rLane = () => Math.floor(Math.random() * 3);
export function mkPattern(): number[] {
  const b = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return [...b, ...b];
}
export function mkChallenge(): Drop[] {
  const mi = new Set<number>();
  while (mi.size < MYSTERY_N) mi.add(2 + Math.floor(Math.random() * (CHALLENGE_N - 2)));
  const p = mkPattern();
  return Array.from({ length: CHALLENGE_N }, (_, i) => ({
    lane: p[i % p.length],
    kind: mi.has(i) ? "mystery" as const : "normal" as const,
    ...(mi.has(i) ? { hiddenColor: Math.random() < 0.5 ? 0 : 1 } : {}),
  }));
}

export function buildSkyShieldCompletionPayload(params: {
  score: number;
  exitAns: number | null;
  totalRounds: number;
  maxStreak: number;
  streak: number;
}): GameResult {
  const exitOk = params.exitAns === 1;
  return {
    gameKey: "sky_shield",
    score: params.score + (exitOk ? PT.predict : 0),
    total: (params.totalRounds + 1) * PT.predict,
    streakMax: Math.max(params.maxStreak, exitOk ? params.streak + 1 : params.streak),
    roundsCompleted: params.totalRounds + 1,
  };
}

// ── Shared sub-components ─────────────────────────────────────────────────
const BigBtn = ({ onClick, disabled, cls, children }: { onClick: () => void; disabled?: boolean; cls: string; children: React.ReactNode }) => (
  <Button size="lg" disabled={disabled} onClick={onClick}
    className={`min-h-[56px] min-w-[140px] text-lg rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform ${cls}`}>
    {children}
  </Button>
);

const LanePicker = ({ onPick }: { onPick: (l: number) => void }) => (
  <div className="flex gap-3 justify-center">
    {[0, 1, 2].map(l => (
      <Button key={l} onClick={() => onPick(l)}
        className={`min-w-[56px] min-h-[56px] text-2xl rounded-xl ${SHIELD_BG[l]} hover:scale-105 active:scale-95 transition-transform shadow-md`}>
        {LABELS[l]}
      </Button>
    ))}
  </div>
);

const ColorPicker = ({ onPick }: { onPick: (c: number) => void }) => (
  <div className="flex gap-3 justify-center">
    {[0, 1].map(c => (
      <Button key={c} onClick={() => onPick(c)}
        className={`min-w-[56px] min-h-[56px] text-2xl rounded-xl ${c === 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-yellow-500 hover:bg-yellow-600"} shadow-md hover:scale-105 active:scale-95 transition-transform`}>
        {c === 0 ? "🔵" : "🟡"}
      </Button>
    ))}
  </div>
);

// ── Playfield ─────────────────────────────────────────────────────────────
function SkyShieldPlayfield({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const { t } = useTranslation();
  const T = (k: string, d: string) => t(`games.skyShield.${k}`, { defaultValue: d });

  const [phase, setPhase] = useState<Phase>("intro");
  const [shield, setShield] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const maxStreak = useRef(0);
  const [fb, setFb] = useState<string | null>(null);
  const total = useRef(0);
  const correct = useRef(0);

  // Practice
  const [prIdx, setPrIdx] = useState(0);
  const [prDrop, setPrDrop] = useState<Drop>({ lane: rLane(), kind: "normal" });
  const [prReady, setPrReady] = useState(true);
  // Pattern
  const pat = useRef<number[]>([]);
  const [patShown, setPatShown] = useState(0);
  const [patCorrect, setPatCorrect] = useState(0);
  const [patAsking, setPatAsking] = useState(false);
  const patStarted = useRef(false);
  // Scan
  const [scDrops] = useState<Drop[]>(() => [0, 1, 0].map(c => ({ lane: rLane(), kind: "mystery" as const, hiddenColor: c })));
  const [scIdx, setScIdx] = useState(0);
  const [scRevealed, setScRevealed] = useState(false);
  // Challenge
  const [chDrops] = useState<Drop[]>(() => mkChallenge());
  const [chIdx, setChIdx] = useState(0);
  const [chRevealed, setChRevealed] = useState(false);
  const [chReady, setChReady] = useState(true);
  // Exit
  const [exitAns, setExitAns] = useState<number | null>(null);

  const bump = useCallback((pts: number, ok: boolean) => {
    if (ok) { setScore(s => s + pts); setStreak(s => { const n = s + 1; maxStreak.current = Math.max(maxStreak.current, n); return n; }); correct.current++; }
    else setStreak(0);
    total.current++;
  }, []);

  const showFb = (key: string, ms = 800) => { setFb(key); setTimeout(() => setFb(null), ms); };

  // ── Lanes visual ────────────────────────────────────────────────────
  const Lanes = ({ activeLane, emoji, landed }: { activeLane: number; emoji: string; landed: boolean }) => (
    <div className="flex gap-2 justify-center" style={{ height: 180 }}>
      {[0, 1, 2].map(l => (
        <div key={l} onClick={() => setShield(l)}
          className={`relative w-24 rounded-xl border-2 cursor-pointer transition-all ${shield === l ? "border-white shadow-lg scale-105" : "border-white/30"} ${LANE_BG[l]}`}>
          {l === activeLane && (
            <div className="absolute left-0 right-0 flex justify-center transition-all duration-500" style={{ top: landed ? "calc(100% - 60px)" : "8px" }}>
              <span className="text-3xl bounce-in">{emoji}</span>
            </div>
          )}
          {shield === l && <div className="absolute bottom-1 left-0 right-0 flex justify-center"><span className="text-lg">🛡️</span></div>}
        </div>
      ))}
    </div>
  );

  const HUD = () => (
    <div className="flex justify-between items-center text-sm font-bold px-2">
      <span className="bg-white/80 rounded-lg px-3 py-1 shadow-sm">{t("games.shared.score", { defaultValue: "Score" })}: {score}</span>
      {streak >= 2 && <span className="streak-fire bg-orange-100 text-orange-700 rounded-lg px-3 py-1 shadow-sm">🔥 {streak}x</span>}
    </div>
  );

  const FB_MAP: Record<string, { text: string; cls: string }> = {
    ok: { text: T("catchGood", "Great catch!"), cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    miss: { text: T("catchMiss", "Oops! Try another lane."), cls: "bg-red-100 text-red-700 border-red-300" },
    pok: { text: T("predictGood", "You found the pattern!"), cls: "bg-violet-100 text-violet-700 border-violet-300" },
    pmiss: { text: T("predictMiss", "Not quite -- keep watching!"), cls: "bg-orange-100 text-orange-700 border-orange-300" },
    sok: { text: T("scanGood", "Scan correct!"), cls: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    smiss: { text: T("scanMiss", "That was a different color."), cls: "bg-red-100 text-red-700 border-red-300" },
    sfirst: { text: T("scanFirst", "Scan the mystery light first!"), cls: "bg-amber-100 text-amber-700 border-amber-300" },
  };
  const FBanner = () => { const m = fb && FB_MAP[fb]; return m ? <div className={`bounce-in text-center py-2 px-4 rounded-xl border font-bold text-sm ${m.cls}`}>{m.text}</div> : null; };

  // ── Phase: INTRO ────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div className="slide-up-fade text-center space-y-6 py-8">
      <div className="text-7xl float-idle">🛡️</div>
      <h2 className="text-2xl font-extrabold text-violet-900">{T("title", "Sky Shield Patterns")}</h2>
      <p className="text-slate-600 max-w-md mx-auto">{T("introDesc", "Light drops are falling! Move your shield to the right lane to catch them. Watch for patterns!")}</p>
      <BigBtn onClick={() => { setPhase("practice"); setPrDrop({ lane: rLane(), kind: "normal" }); setPrReady(true); }} cls="bg-gradient-to-r from-violet-500 to-violet-600">{T("letsGo", "Let's Go!")}</BigBtn>
    </div>
  );

  // ── Phase: PRACTICE ─────────────────────────────────────────────────
  if (phase === "practice") {
    const doCatch = () => {
      if (!prReady) return;
      setPrReady(false);
      const ok = shield === prDrop.lane;
      bump(PT.catch, ok); showFb(ok ? "ok" : "miss");
      setTimeout(() => { const n = prIdx + 1; if (n >= PRACTICE_N) { pat.current = mkPattern(); patStarted.current = false; setPatShown(0); setPatCorrect(0); setPatAsking(false); setPhase("pattern"); }
        else { setPrIdx(n); setPrDrop({ lane: rLane(), kind: "normal" }); setPrReady(true); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("practiceLabel", "Practice -- Catch the Light!")} ({prIdx + 1}/{PRACTICE_N})</p>
        <Lanes activeLane={prDrop.lane} emoji={LABELS[prDrop.lane]} landed={!prReady} />
        <FBanner />
        <div className="text-center space-y-3">
          <LanePicker onPick={l => setShield(l)} />
          <BigBtn disabled={!prReady} onClick={doCatch} cls="bg-gradient-to-r from-emerald-500 to-emerald-600">{T("catch", "Catch!")}</BigBtn>
        </div>
      </div>
    );
  }

  // ── Phase: PATTERN ──────────────────────────────────────────────────
  if (phase === "pattern") {
    const p = pat.current;
    if (!patStarted.current && p.length > 0) {
      patStarted.current = true;
      let i = 0;
      const show = () => { setPatShown(i + 1); i++; if (i < p.length) setTimeout(show, 700); else setTimeout(() => setPatAsking(true), 500); };
      setTimeout(show, 400);
    }
    const doGuess = (l: number) => {
      if (!patAsking) return;
      const expected = p[p.length % 3]; // next in cycle
      const ok = l === expected;
      bump(PT.predict, ok); showFb(ok ? "pok" : "pmiss");
      const nc = patCorrect + (ok ? 1 : 0); setPatCorrect(nc);
      setTimeout(() => { if (nc >= PATTERN_N) { setScIdx(0); setScRevealed(false); setPhase("scan"); }
        else { pat.current = mkPattern(); patStarted.current = false; setPatShown(0); setPatAsking(false); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("patternLabel", "Pattern -- Watch and Predict!")} ({patCorrect}/{PATTERN_N})</p>
        <div className="flex gap-1 justify-center flex-wrap">{p.slice(0, patShown).map((l, i) => <span key={i} className="text-2xl">{LABELS[l]}</span>)}</div>
        {patAsking && <>
          <p className="text-center text-lg font-bold text-violet-900">{T("whichLane", "Which lane is next?")}</p>
          <div className="flex gap-1 justify-center">{p.map((l, i) => <span key={i} className="text-xl">{LABELS[l]}</span>)}<span className="text-xl">❓</span></div>
          <LanePicker onPick={doGuess} />
        </>}
        {!patAsking && <p className="text-center text-sm text-slate-500">{T("watching", "Watching the pattern...")}</p>}
        <FBanner />
      </div>
    );
  }

  // ── Phase: SCAN ─────────────────────────────────────────────────────
  if (phase === "scan") {
    const d = scDrops[scIdx]; if (!d) return null;
    const doGuess = (c: number) => {
      if (!scRevealed) return;
      const ok = c === d.hiddenColor; bump(PT.scan, ok); showFb(ok ? "sok" : "smiss");
      setTimeout(() => { const n = scIdx + 1; if (n >= scDrops.length) { setChIdx(0); setChRevealed(false); setChReady(true); setPhase("challenge"); }
        else { setScIdx(n); setScRevealed(false); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("scanLabel", "Scan -- Reveal the Mystery!")} ({scIdx + 1}/{scDrops.length})</p>
        <div className="flex justify-center"><span className="text-6xl bounce-in">{scRevealed ? (d.hiddenColor === 0 ? "🔵" : "🟡") : "❓"}</span></div>
        {!scRevealed && <div className="text-center"><BigBtn onClick={() => setScRevealed(true)} cls="bg-gradient-to-r from-cyan-500 to-cyan-600">🔍 {T("scan", "Scan")}</BigBtn></div>}
        {scRevealed && <><p className="text-center text-sm font-bold text-slate-700">{T("pickColor", "Pick the matching shield!")}</p><ColorPicker onPick={doGuess} /></>}
        <FBanner />
      </div>
    );
  }

  // ── Phase: CHALLENGE ────────────────────────────────────────────────
  if (phase === "challenge") {
    const d = chDrops[chIdx]; if (!d) return null;
    const isMyst = d.kind === "mystery";
    const doCatch = () => {
      if (!chReady) return;
      if (isMyst && !chRevealed) { showFb("sfirst"); return; }
      setChReady(false);
      const ok = shield === d.lane; bump(isMyst ? PT.scan : PT.catch, ok); showFb(ok ? "ok" : "miss");
      setTimeout(() => { const n = chIdx + 1; if (n >= chDrops.length) { setExitAns(null); setPhase("exitTicket"); }
        else { setChIdx(n); setChRevealed(false); setChReady(true); } }, 900);
    };
    const emoji = isMyst && !chRevealed ? "❓" : isMyst ? (d.hiddenColor === 0 ? "🔵" : "🟡") : LABELS[d.lane];
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("challengeLabel", "Challenge Round!")} ({chIdx + 1}/{CHALLENGE_N})</p>
        <Lanes activeLane={d.lane} emoji={emoji} landed={!chReady} />
        <FBanner />
        <div className="text-center space-y-3">
          {isMyst && !chRevealed && <BigBtn onClick={() => setChRevealed(true)} cls="bg-gradient-to-r from-cyan-500 to-cyan-600">🔍 {T("scan", "Scan")}</BigBtn>}
          <LanePicker onPick={l => setShield(l)} />
          <BigBtn disabled={!chReady} onClick={doCatch} cls="bg-gradient-to-r from-emerald-500 to-emerald-600">{T("catch", "Catch!")}</BigBtn>
        </div>
      </div>
    );
  }

  // ── Phase: EXIT TICKET ──────────────────────────────────────────────
  if (phase === "exitTicket") {
    const submitted = exitAns !== null;
    const ok = exitAns === 1;
    return (
      <div className="slide-up-fade space-y-6 py-4 text-center">
        <h3 className="text-xl font-extrabold text-violet-900">{T("exitTitle", "Exit Ticket")}</h3>
        <p className="text-base text-slate-700 max-w-sm mx-auto">{T("exitQuestion", "The pattern is blue, blue, gold, blue, blue, ___. What comes next?")}</p>
        <div className="flex gap-1 justify-center text-2xl"><span>🔵</span><span>🔵</span><span>🟡</span><span>🔵</span><span>🔵</span><span>❓</span></div>
        {!submitted && <ColorPicker onPick={c => setExitAns(c)} />}
        {submitted && <div className="space-y-4">
          <div className={`bounce-in py-2 px-4 rounded-xl border font-bold ${ok ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-orange-100 text-orange-700 border-orange-300"}`}>
            {ok ? T("exitCorrect", "Gold! You got it!") : T("exitWrong", "The answer is gold (🟡). The pattern repeats!")}
          </div>
          <BigBtn onClick={() => setPhase("celebration")} cls="bg-gradient-to-r from-violet-500 to-violet-600">{T("seeResults", "See Results")}</BigBtn>
        </div>}
      </div>
    );
  }

  // ── Phase: CELEBRATION ──────────────────────────────────────────────
  if (phase === "celebration") {
    return (
      <div className="slide-up-fade text-center space-y-6 py-8">
        <div className="text-7xl bounce-in">🛡️✨</div>
        <h2 className="text-2xl font-extrabold text-violet-900">{T("celebrationTitle", "Amazing Work!")}</h2>
        <p className="text-slate-600 max-w-md mx-auto">{T("celebrationMsg", "You watched, noticed the pattern, and chose the right shield!")}</p>
        <BigBtn onClick={() => onFinish(buildSkyShieldCompletionPayload({
          score,
          exitAns,
          totalRounds: total.current,
          maxStreak: maxStreak.current,
          streak,
        }))}
          cls="bg-gradient-to-r from-emerald-500 to-emerald-600">{T("finish", "Finish")}</BigBtn>
      </div>
    );
  }
  return null;
}

// ── Export ─────────────────────────────────────────────────────────────────
export default function SkyShieldGame({ onComplete }: { config?: unknown; onComplete?: (result: GameResult) => void }) {
  return (
    <GameShell gameKey="sky_shield" title="Sky Shield Patterns" briefing={BRIEFING} onComplete={onComplete ?? (() => {})}>
      {({ onFinish }) => <SkyShieldPlayfield onFinish={onFinish} />}
    </GameShell>
  );
}
