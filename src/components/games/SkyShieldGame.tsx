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
import { pickLocale } from "@/utils/localizedContent";
import { getGradeBand, SKY_SHIELD_CONTENT, type GradeBand } from "./gradeBandContent";

// ── Constants & Types ─────────────────────────────────────────────────────
const LABELS = ["🔵", "🟡", "🩷"];
const SHIELD_BG = ["bg-blue-500", "bg-yellow-500", "bg-pink-500"];
const LANE_BG = ["bg-blue-400/20", "bg-yellow-400/20", "bg-pink-400/20"];
export const PT = { catch: 10, predict: 20, scan: 15 };

type SkyShieldContent =
  (typeof SKY_SHIELD_CONTENT)[keyof typeof SKY_SHIELD_CONTENT];
type Pattern = {
  base: number[];
  sequence: number[];
};
type Phase = "intro" | "practice" | "pattern" | "scan" | "patternReminder" | "challenge" | "challengeG35" | "exitTicket" | "celebration";
interface Drop { lane: number; kind: "normal" | "mystery"; hiddenColor?: number }

// TODO: add translations for the story, tips in briefing
const BRIEFING: MissionBriefing = {
  title: pickLocale({ en: "Sky Shield Patterns", es: "Patrones del Cielo", vi: "Mẫu Lá Chắn Bầu Trời", "zh-CN": "天空护盾图案" }, "Sky Shield Patterns"),
  story: pickLocale({
    en: "Light drops are falling from the sky! Watch the pattern and place your shield to protect the land.",
  }, "Light drops are falling from the sky! Watch the pattern and place your shield to protect the land."),
  icon: "🛡️",
  tips: pickLocale({
    en: ["Watch which lane the light falls in", "Look for repeating patterns", "Scan mystery lights before choosing"],
  }, ["Watch which lane the light falls in", "Look for repeating patterns", "Scan mystery lights before choosing"]),
  chapterLabel: "Pattern Lab",
  themeColor: "violet",
};

// ── Helpers ───────────────────────────────────────────────────────────────
const rLane = () => Math.floor(Math.random() * 3);
export function mkPattern(content: SkyShieldContent): Pattern {
  const base =
        content.patterns[Math.floor(Math.random()*content.patterns.length)];
  return {base: [...base], sequence: [...base, ...base]};
}

export function mkChallenge(
    content: SkyShieldContent,
    pattern?: Pattern,
): Drop[] {
    const mi = new Set<number>();

    while (mi.size < content.mysteryDrops) {
        mi.add(
        2 + Math.floor(Math.random() * (content.challengeRounds - 2))
        );
    }

    const p = pattern
      ? pattern.sequence
      : mkPattern(content).sequence;

    return Array.from({ length: content.challengeRounds }, (_, i) => {
        const lane = p[i % p.length];

        return {
        lane,
        kind: mi.has(i) ? "mystery" as const : "normal" as const,
        ...(mi.has(i)
            ? {
                hiddenColor: lane,
            }
            : {}),
        };
    });
}

export function buildSkyShieldCompletionPayload(params: {
  score: number;
  exitAns: number | null;
  exitAnswer: number;
  totalRounds: number;
  maxStreak: number;
  streak: number;
}): GameResult {
  const exitOk = params.exitAns === params.exitAnswer;
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

const ColorPicker = ({
    onPick,
    colorCount,
}: {
    onPick: (c: number) => void;
    colorCount: number;
}) => (
    <div className="flex gap-3 justify-center">
        {Array.from({ length: colorCount }, (_, c) => (
        <Button
            key={c}
            onClick={() => onPick(c)}
            className={`min-w-[56px] min-h-[56px] text-2xl rounded-xl ${
            SHIELD_BG[c]
            } shadow-md hover:scale-105 active:scale-95 transition-transform`}
        >
            {LABELS[c]}
        </Button>
        ))}
    </div>
    )

// ── Playfield ─────────────────────────────────────────────────────────────
function SkyShieldPlayfield({ 
    band,
    onFinish }: { 
        band: GradeBand,
        onFinish: (r: GameResult) => void }) {
  const content = SKY_SHIELD_CONTENT[band];
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
  const pat = useRef<Pattern | null>(null);
  const [patShown, setPatShown] = useState(0);
  const [patCorrect, setPatCorrect] = useState(0);
  const [patAsking, setPatAsking] = useState(false);
  const patStarted = useRef(false);
  // Scan
  const [scDrops, setScDrops] = useState<Drop[]>([]);
  const [scIdx, setScIdx] = useState(0);
  const [scRevealed, setScRevealed] = useState(false);
  // Challenge
  const [chDrops, setChDrops] = useState<Drop[]>([]);
  const [chIdx, setChIdx] = useState(0);
  const [chRevealed, setChRevealed] = useState(false);
  const [chReady, setChReady] = useState(true);
  // G-5 Challenge
  const [prediction, setPrediction] = useState<number | null>(null);
const [g35Scanned, setG35Scanned] = useState(false);
const [g35Ready, setG35Ready] = useState(true);
  // Exit
  const [exitAns, setExitAns] = useState<number | null>(null);

  const bump = useCallback((pts: number, ok: boolean) => {
    if (ok) { setScore(s => s + pts); setStreak(s => { const n = s + 1; maxStreak.current = Math.max(maxStreak.current, n); return n; }); correct.current++; }
    else setStreak(0);
    total.current++;
  }, []);

  const showFb = (key: string, ms = 800) => { setFb(key); setTimeout(() => setFb(null), ms); };

  // ── Lanes visual ────────────────────────────────────────────────────
  const Lanes = ({ activeLane, emoji, landed, onPick }: { activeLane: number; emoji: string; landed: boolean; onPick?: (lane: number) => void; }) => (
    <div className="flex gap-2 justify-center" style={{ height: 180 }}>
      {[0, 1, 2].map(l => (
        <div key={l} onClick={() => (onPick ?? setShield)(l)}
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
      setTimeout(() => { const n = prIdx + 1; if (n >= content.practiceRounds) { pat.current = mkPattern(content); patStarted.current = false; setPatShown(0); setPatCorrect(0); setPatAsking(false); setPhase("pattern"); }
        else { setPrIdx(n); setPrDrop({ lane: rLane(), kind: "normal" }); setPrReady(true); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("practiceLabel", "Practice -- Catch the Light!")} ({prIdx + 1}/{content.practiceRounds})</p>
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
    const pattern = pat.current;
      if (!pattern) return null;
    const p = pattern.sequence;

    if (!patStarted.current && p.length > 0) {
      patStarted.current = true;
      let i = 0;
      const show = () => { setPatShown(i + 1); i++; if (i < p.length) setTimeout(show, 700); else setTimeout(() => setPatAsking(true), 500); };
      setTimeout(show, 400);
    }
    const doGuess = (l: number) => {
      if (!patAsking) return;
      const expected = pattern.base[p.length % pattern.base.length]; // next in cycle
      const ok = l === expected;
      bump(PT.predict, ok); showFb(ok ? "pok" : "pmiss");
      const nc = patCorrect + (ok ? 1 : 0); setPatCorrect(nc);
      setTimeout(() => { 
        if (nc >= content.patternRounds) { 
            setScIdx(0); 
            setScRevealed(false); 
            if (band === "g3_5" && pat.current) {
                const sequence = pat.current.sequence;
                setScDrops(
                    Array.from({ length: 4 }, (_, i) => ({
                        lane: sequence[i],
                        kind: "mystery" as const,
                        hiddenColor: sequence[i],
                    }))
                );
            } else {
                // keep K-2 unchanged
                setScDrops(
                    [0, 1, 0].map(c => ({
                        lane: rLane(),
                        kind: "mystery" as const,
                        hiddenColor: c,
                    }))
                );
            }
            setPhase("scan"); }
        else { pat.current = mkPattern(content); patStarted.current = false; setPatShown(0); setPatAsking(false); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("patternLabel", "Pattern -- Watch and Predict!")} ({patCorrect}/{content.patternRounds})</p>
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
      setTimeout(() => { 
        const n = scIdx + 1; 
        if (n >= scDrops.length) { 
            setChIdx(0);
            setChRevealed(false);
            setChReady(true);

            if (band === "g3_5") {
                if (pat.current) {
                    setChDrops(mkChallenge(content, pat.current));
                }
                setPhase("patternReminder");
            } else {
                setChDrops(mkChallenge(content));
                setPhase("challenge");
            } 
        }
        else { setScIdx(n); setScRevealed(false); } }, 900);
    };
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("scanLabel", "Scan -- Reveal the Mystery!")} ({scIdx + 1}/{scDrops.length})</p>
        <div className="flex justify-center"><span className="text-6xl bounce-in">{scRevealed ? LABELS[d.hiddenColor!] : "❓"}</span></div>
        {!scRevealed && <div className="text-center"><BigBtn onClick={() => setScRevealed(true)} cls="bg-gradient-to-r from-cyan-500 to-cyan-600">🔍 {T("scan", "Scan")}</BigBtn></div>}
        {scRevealed && <><p className="text-center text-sm font-bold text-slate-700">{T("pickColor", "Pick the matching shield!")}</p><ColorPicker onPick={doGuess} colorCount={content.mysteryColors}/></>}
        <FBanner />
      </div>
    );
  }

// ── Phase: PATTERN REMINDER for G3-5 ────────────────────────────────────────────────
  if (phase === "patternReminder") {
    const pattern = pat.current;
    if (!pattern) return null;

    return (
      <div className="slide-up-fade space-y-6 py-6 text-center">
        <h3 className="text-xl font-extrabold text-violet-900">
          {T("patternReminderTitle", "You learned this pattern:")}
        </h3>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2 justify-center text-3xl">
            {pattern.base.map((l, i) => (
              <span key={i}>{LABELS[l]}</span>
            ))}
          </div>

          <div className="flex gap-2 justify-center text-3xl">
            {pattern.base.map((l, i) => (
              <span key={i}>{LABELS[l]}</span>
            ))}
          </div>
        </div>

        <p className="text-slate-700 font-semibold max-w-sm mx-auto">
          {T(
            "patternReminderDesc",
            "Remember it! The mystery lights will follow this same pattern."
          )}
        </p>

        <BigBtn
          onClick={() => setPhase("challengeG35")}
          cls="bg-gradient-to-r from-violet-500 to-violet-600"
        >
          {T("startChallenge", "Start Challenge")}
        </BigBtn>
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
    const emoji =
        isMyst && !chRevealed
            ? "❓"
            : isMyst
              ? LABELS[d.hiddenColor!]
              : LABELS[d.lane];
    return (
      <div className="slide-up-fade space-y-4">
        <HUD />
        <p className="text-center font-bold text-violet-800 text-sm">{T("challengeLabel", "Challenge Round!")} ({chIdx + 1}/{content.challengeRounds})</p>
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


// ── Phase: CHALLENGE G3-5 ───────────────────────────────────────────
if (phase === "challengeG35") {
  const d = chDrops[chIdx];
  const isMystery = d.kind === "mystery";
  if (!d) return null;

  const nextRound = () => {
    const n = chIdx + 1;
    if (n >= chDrops.length) {
      setExitAns(null);
      setPhase("exitTicket");
    } else {
      setChIdx(n);
      setPrediction(null);
      setG35Scanned(false);
      setG35Ready(true);
    }
  };

  const doPredict = (lane: number) => {
    if (!g35Ready || g35Scanned) return;
    setPrediction(lane);
    setShield(lane); // move 🛡️ icon
  };

  const doScan = () => {
    if (prediction === null) return;
    setG35Scanned(true);
    const predictionCorrect = prediction === d.lane;
    bump(
        PT.predict,
        predictionCorrect
  );
};

  const doCatch = () => {
    const caught = shield === d.lane;
    bump(
      PT.catch,
      caught
    );
    showFb(caught ? "ok" : "miss");
    setTimeout(nextRound, 1200);
};

  const emoji = isMystery
    ? (g35Scanned ? LABELS[d.hiddenColor!] : "")
    : LABELS[d.lane];

  return (
    <div className="slide-up-fade space-y-4">
      <HUD />
      <p className="text-center font-bold text-violet-800 text-sm">
        Challenge ({chIdx + 1}/{chDrops.length})
      </p>

      {/* Lanes */}
      <Lanes
      activeLane={
        isMystery
          ? (g35Scanned ? d.lane : -1)
          : d.lane
      }
      emoji={emoji}
      landed={false}
      onPick={
        !g35Scanned && isMystery
          ? doPredict
          : setShield
      }
    />

      {isMystery && !g35Scanned && (
        <p className="text-center font-bold text-violet-900">
          Which lane will the light fall into?
        </p>
      )}

      {/* Predict */}
      {isMystery && !g35Scanned && (
        <>
          <LanePicker
            onPick={doPredict}
          />
        <div className="flex justify-center">
          <BigBtn
            disabled={prediction === null}
            onClick={doScan}
            cls="bg-gradient-to-r from-cyan-500 to-cyan-600"
          >
            🔍 Scan
          </BigBtn>
        </div>
        </>
      )}

    {/* Normal Drops */}
    {!isMystery && (
      <div className="space-y-4 text-center">
        <LanePicker onPick={setShield} />

        <BigBtn
        onClick={doCatch}
        cls="bg-gradient-to-r from-emerald-500 to-emerald-600"
        >
        Catch!
        </BigBtn>
    </div>
    )}

    {/* Reveal */}
    {isMystery && g35Scanned && (
    <div className="space-y-4 text-center">
        <p className="text-lg font-bold text-cyan-700">
        The light is {LABELS[d.hiddenColor ?? d.lane]} and falls into lane {d.lane + 1}!
        </p>
        <p className="text-base font-semibold text-violet-800">
        {prediction === d.lane
            ? "✨ Great prediction! You spotted the pattern!"
            : "🌟 Not quite. Keep watching the pattern."}
        </p>
        <BigBtn
        onClick={doCatch}
        cls="bg-gradient-to-r from-emerald-500 to-emerald-600"
        >
        Catch!
        </BigBtn>
    </div>
    )}
      <FBanner />
    </div>
  );
}

  // ── Phase: EXIT TICKET ──────────────────────────────────────────────
  if (phase === "exitTicket") {
    const submitted = exitAns !== null;
    const ok = exitAns === content.exitAnswer;
    const correctEmoji = LABELS[content.exitAnswer];
    return (
      <div className="slide-up-fade space-y-6 py-4 text-center">
        <h3 className="text-xl font-extrabold text-violet-900">{T("exitTitle", "Exit Ticket")}</h3>
        <p className="text-base text-slate-700 max-w-sm mx-auto">{"What comes next?"}</p>
        <div className="flex gap-1 justify-center text-2xl">
            {content.exitPattern.map((c, i) => (
                <span key={i}>{LABELS[c]}</span>
              ))}
              <span>❓</span>
            </div>
        {!submitted && <ColorPicker onPick={c => setExitAns(c)} colorCount={content.mysteryColors}/>}
        {submitted && <div className="space-y-4">
          <div className={`bounce-in py-2 px-4 rounded-xl border font-bold ${ok ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-orange-100 text-orange-700 border-orange-300"}`}>
            {ok
              ? T("exitCorrect", `Correct! ${correctEmoji} comes next!`)
              : T("exitWrong", `The answer is ${correctEmoji}. The pattern repeats!`)
            }
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
          exitAnswer: content.exitAnswer,
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
export default function SkyShieldGame({
    config,
    onComplete,
}: {
  config?: unknown;
  onComplete?: (result: GameResult) => void;
}) 
{
    const band = getGradeBand(config);

  return (
    <GameShell 
      gameKey="sky_shield" 
      title="Sky Shield Patterns" 
      briefing={BRIEFING} 
      onComplete={onComplete ?? (() => {})}
    >
      {({ onFinish, reducedEffects: _reducedEffects }) => <SkyShieldPlayfield  band={band} onFinish={onFinish} />}
    </GameShell>
  );
}
