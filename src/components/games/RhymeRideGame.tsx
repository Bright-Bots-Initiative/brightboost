/**
 * Rhyme & Ride — lane-based reflex / rhythm game (flagship redesign).
 *
 * Rhymo rides through three themed worlds. Word cards scroll across
 * three lanes toward a hit-zone. The student taps the lane that holds
 * the correct rhyme before it passes. Combos, showdown rounds, and
 * a star-rated mastery card make it feel like a real arcade game while
 * staying K-2 friendly.
 *
 * Keyboard: 1 / 2 / 3  or  A / S / D
 * Touch:    tap the lane
 * Accessibility: reduced-motion mode, non-color cues, large targets
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import { cn } from "@/lib/utils";
import { pickLocale } from "@/utils/localizedContent";
import "./shared/game-effects.css";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface RhymeFamily {
  id: string;
  pattern: string;          // e.g. "-at"
  color: string;            // tailwind bg class
  icon: string;             // non-color cue
  words: string[];          // pool of correct rhymes
  distractors: string[];    // common non-rhyming words
}

interface World {
  id: string;
  names: Record<string, string>;
  theme: string;            // tailwind gradient stem
  icon: string;
  families: RhymeFamily[];
}

interface LaneCard {
  id: string;
  word: string;
  lane: 0 | 1 | 2;
  correct: boolean;
  familyColor: string;
  familyIcon: string;
  y: number;               // 0 = top, progresses toward HIT_ZONE_Y
  state: "falling" | "hit" | "missed" | "wrong";
}

type Phase =
  | "playing"
  | "feedback"
  | "showdown"
  | "showdownFeedback"
  | "worldTransition"
  | "gameOver";

// ═══════════════════════════════════════════════════════════════════════════
// Content — three themed worlds with rhyme families
// ═══════════════════════════════════════════════════════════════════════════

const WORLDS: World[] = [
  {
    id: "ai-alley",
    names: { en: "AI Alley", es: "Callejón de IA", vi: "Ngõ AI", "zh-CN": "AI小巷" },
    theme: "from-blue-600 via-indigo-600 to-blue-700",
    icon: "🤖",
    families: [
      { id: "at", pattern: "-at", color: "bg-blue-400", icon: "🐱", words: ["hat", "bat", "mat", "rat", "sat", "flat"], distractors: ["dog", "sun", "big", "run", "top", "lip"] },
      { id: "an", pattern: "-an", color: "bg-cyan-400", icon: "🚐", words: ["can", "fan", "man", "pan", "ran", "van"], distractors: ["cup", "red", "hop", "wet", "dig", "pot"] },
      { id: "ig", pattern: "-ig", color: "bg-sky-400", icon: "🐷", words: ["big", "dig", "fig", "pig", "wig", "jig"], distractors: ["hat", "log", "sun", "net", "hug", "top"] },
    ],
  },
  {
    id: "quantum-canyon",
    names: { en: "Quantum Canyon", es: "Cañón Cuántico", vi: "Hẻm Lượng Tử", "zh-CN": "量子峡谷" },
    theme: "from-purple-600 via-violet-600 to-purple-700",
    icon: "🔮",
    families: [
      { id: "op", pattern: "-op", color: "bg-purple-400", icon: "🐰", words: ["hop", "mop", "pop", "top", "cop", "stop"], distractors: ["bat", "wig", "fun", "bed", "lip", "van"] },
      { id: "ug", pattern: "-ug", color: "bg-fuchsia-400", icon: "🐛", words: ["bug", "hug", "mug", "rug", "tug", "dug"], distractors: ["hat", "pen", "sit", "map", "fog", "jet"] },
      { id: "ip", pattern: "-ip", color: "bg-pink-400", icon: "🚢", words: ["dip", "hip", "lip", "rip", "sip", "tip", "zip"], distractors: ["cat", "log", "bun", "wet", "cot", "van"] },
    ],
  },
  {
    id: "bio-garden",
    names: { en: "Bio Garden", es: "Jardín Bio", vi: "Vườn Sinh Học", "zh-CN": "生物花园" },
    theme: "from-green-600 via-emerald-600 to-green-700",
    icon: "🌿",
    families: [
      { id: "un", pattern: "-un", color: "bg-green-400", icon: "☀️", words: ["bun", "fun", "run", "sun", "pun", "spun"], distractors: ["hat", "log", "dip", "mop", "wig", "bed"] },
      { id: "et", pattern: "-et", color: "bg-teal-400", icon: "🐕", words: ["bet", "get", "jet", "net", "pet", "set", "vet", "wet"], distractors: ["hug", "pop", "fan", "dig", "cot", "lip"] },
      { id: "ot", pattern: "-ot", color: "bg-lime-400", icon: "🍲", words: ["cot", "dot", "got", "hot", "lot", "not", "pot"], distractors: ["bug", "hat", "pen", "sip", "run", "big"] },
    ],
  },
];

const ROUNDS_PER_WORLD = 6;
const SHOWDOWN_EVERY = 5;         // bonus showdown round after N correct
const SHOWDOWN_CARDS = 5;          // rapid-fire cards in showdown
const HIT_ZONE_TOP = 300;          // px — top of hit zone
const HIT_ZONE_BOTTOM = 380;       // px — bottom of hit zone
const FIELD_HEIGHT = 420;
const CARD_HEIGHT = 64;             // taller cards for readability
const BASE_SPEED = 1.1;            // px per animation frame — slower for K-2
const SPEED_RAMP = 0.06;           // gentler increase per world
const SHOWDOWN_SPEED_MULT = 1.2;   // less aggressive showdown speedup

const LANE_LABELS = ["1", "2", "3"];
const LANE_KEYS_NUM = ["1", "2", "3"];
const LANE_KEYS_ALPHA = ["a", "s", "d"];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════════════════
// Lane / card display
// ═══════════════════════════════════════════════════════════════════════════

const LANE_BG = [
  "bg-blue-50/70",
  "bg-purple-50/70",
  "bg-green-50/70",
];
const LANE_BORDER = [
  "border-blue-200",
  "border-purple-200",
  "border-green-200",
];

function LaneField({
  cards,
  onLaneTap,
  worldTheme,
  reducedMotion,
  combo,
}: {
  cards: LaneCard[];
  onLaneTap: (lane: 0 | 1 | 2) => void;
  worldTheme: string;
  reducedMotion: boolean;
  combo: number;
}) {
  return (
    <div className="relative mx-auto select-none" style={{ maxWidth: 480 }}>
      {/* World backdrop */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${worldTheme} opacity-10 pointer-events-none`}
      />

      {/* Lanes container */}
      <div
        className="relative grid grid-cols-3 gap-2 rounded-2xl border-2 border-white/40 overflow-hidden shadow-xl"
        style={{ height: FIELD_HEIGHT }}
      >
        {[0, 1, 2].map((lane) => (
          <button
            key={lane}
            className={cn(
              "relative flex flex-col items-center justify-end pb-2",
              LANE_BG[lane],
              "border-r last:border-r-0",
              LANE_BORDER[lane],
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-yellow-400",
              "transition-colors active:bg-yellow-100/50",
            )}
            style={{ height: FIELD_HEIGHT }}
            onClick={() => onLaneTap(lane as 0 | 1 | 2)}
            aria-label={`Lane ${lane + 1}`}
          >
            {/* Hit zone marker */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-400/60 pointer-events-none"
              style={{ top: HIT_ZONE_TOP }}
            />
            <div
              className="absolute left-0 right-0 bg-yellow-300/15 pointer-events-none"
              style={{ top: HIT_ZONE_TOP, height: HIT_ZONE_BOTTOM - HIT_ZONE_TOP }}
            />

            {/* Lane label */}
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {LANE_LABELS[lane]}
            </span>
          </button>
        ))}

        {/* Render cards on top of lanes */}
        {cards.map((card) => {
          const leftPercent = card.lane * 33.333 + 2;
          const widthPercent = 29.5;
          const isHit = card.state === "hit";
          const isWrong = card.state === "wrong";
          const isMissed = card.state === "missed";
          // Derive border-color class from bg-* family color (e.g. bg-blue-400 → border-blue-400)
          const borderAccent = card.familyColor.replace("bg-", "border-");
          return (
            <div
              key={card.id}
              className={cn(
                "absolute flex items-center justify-center rounded-xl font-extrabold text-lg shadow-md pointer-events-none",
                "transition-all overflow-hidden",
                isHit && "scale-125 opacity-0 bg-green-100 border-2 border-green-400 text-green-800",
                isWrong && "scale-75 opacity-30 bg-red-100 border-2 border-red-300 text-red-800",
                isMissed && "opacity-20 scale-90 bg-white border-2 border-slate-200",
                !isHit && !isWrong && !isMissed && `bg-white border-l-4 border-r-0 border-t-0 border-b-0 ${borderAccent} text-slate-900 shadow-lg ring-1 ring-slate-200`,
              )}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                height: CARD_HEIGHT,
                top: card.y,
                transition: reducedMotion
                  ? "none"
                  : isHit || isWrong
                    ? "all 0.3s ease-out"
                    : "none",
              }}
            >
              <span className="mr-1.5 text-xl">{card.familyIcon}</span>
              <span className="truncate">{card.word}</span>
            </div>
          );
        })}
      </div>

      {/* Combo bar */}
      {combo >= 2 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-extrabold shadow-lg streak-fire z-10">
          {"🔥"} {combo}x COMBO
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════════════════════════

function RhymeHUD({
  prompt,
  familyPattern,
  familyColor,
  familyIcon,
  score,
  combo,
  lives,
  worldName,
  worldIcon,
  roundLabel,
}: {
  prompt: string;
  familyPattern: string;
  familyColor: string;
  familyIcon: string;
  score: number;
  combo: number;
  lives: number;
  worldName: string;
  worldIcon: string;
  roundLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 max-w-[480px] mx-auto">
      {/* Prompt chip */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-3 rounded-xl font-extrabold text-xl text-center shadow-lg border border-white/10 flex items-center justify-center gap-3">
        <span className="text-2xl">{familyIcon}</span>
        <span>
          {t("games.rhymeRide.whichRhymes")} <span className="text-yellow-300 underline decoration-wavy">{prompt}</span>?
        </span>
        <span className={cn("px-2 py-0.5 rounded-full text-sm font-bold border", familyColor.replace("bg-", "border-"), "bg-white text-slate-700")}>
          {familyPattern}
        </span>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
        <div className="flex gap-2">
          <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full font-bold shadow-sm">
            {"⭐"} {score}
          </span>
          {combo > 1 && (
            <span className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full font-bold shadow-sm",
              combo >= 5 ? "bg-red-100 text-red-700 streak-fire" : "bg-orange-100 text-orange-700"
            )}>
              {"⚡"} x{combo}
            </span>
          )}
          <span className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full">
            {Array.from({ length: Math.max(0, lives) }, (_, i) => (
              <span key={i}>{"❤️"}</span>
            ))}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-lg">{worldIcon}</span>
          <span className="text-xs font-medium text-slate-500">{worldName}</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{roundLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Core game component
// ═══════════════════════════════════════════════════════════════════════════

function RhymeRideCore({ onFinish }: { onFinish: (result: GameResult) => void }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // ── State ──
  const [worldIdx, setWorldIdx] = useState(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [familyIdx, setFamilyIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [, setShowdownCorrect] = useState(0);
  const [muted, setMuted] = useState(false);

  const [cards, setCards] = useState<LaneCard[]>([]);
  const [prompt, setPrompt] = useState("");
  const [currentFamily, setCurrentFamily] = useState<RhymeFamily | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | "neutral">("neutral");

  // Missed families to recycle
  const missedFamiliesRef = useRef<RhymeFamily[]>([]);
  const animRef = useRef<number>(0);
  const cardIdRef = useRef(0);

  const world = WORLDS[worldIdx];
  const speed = BASE_SPEED + worldIdx * SPEED_RAMP;

  /**
   * Shared helper: register a successful decision (correct tap OR correct pass).
   * Increments combo, updates max streak, adds to score, increments totalCorrect.
   * Returns the new combo value for feedback text.
   */
  const registerSuccess = useCallback((points: number): number => {
    let newCombo = 0;
    setCombo((c) => { newCombo = c + 1; return newCombo; });
    setMaxStreak((m) => Math.max(m, newCombo));
    setTotalCorrect((c) => c + 1);
    setScore((s) => s + points);
    return newCombo;
  }, []);

  // ── Spawn a round ──
  const spawnRound = useCallback(
    (family?: RhymeFamily) => {
      const w = WORLDS[worldIdx];
      if (!w) return;

      // Pick family: from missed queue, or cycle through world families
      let fam: RhymeFamily;
      if (family) {
        fam = family;
      } else if (missedFamiliesRef.current.length > 0) {
        fam = missedFamiliesRef.current.shift()!;
      } else {
        fam = w.families[familyIdx % w.families.length];
        setFamilyIdx((i) => i + 1);
      }

      setCurrentFamily(fam);

      // Pick prompt word and one correct answer (different from prompt)
      const available = fam.words.filter(() => true);
      const promptWord = pick(available);
      const correctPool = available.filter((w) => w !== promptWord);
      const correctWord = correctPool.length > 0 ? pick(correctPool) : promptWord;

      // Pick 2 distractors
      const dists = pickN(fam.distractors, 2);

      // Assign to 3 lanes randomly
      const allWords = shuffle([
        { word: correctWord, correct: true },
        { word: dists[0] || "nope", correct: false },
        { word: dists[1] || "nah", correct: false },
      ]);

      const newCards: LaneCard[] = allWords.map((item, i) => ({
        id: `card-${++cardIdRef.current}`,
        word: item.word,
        lane: i as 0 | 1 | 2,
        correct: item.correct,
        familyColor: fam.color,
        familyIcon: fam.icon,
        y: -CARD_HEIGHT - (Math.random() * 30),
        state: "falling" as const,
      }));

      setPrompt(promptWord);
      setCards(newCards);
      setPhase("playing");
    },
    [worldIdx, familyIdx],
  );

  // ── Spawn showdown round (rapid-fire single cards) ──
  const showdownQueueRef = useRef<{ word: string; correct: boolean; family: RhymeFamily }[]>([]);
  const [, setShowdownPrompt] = useState("");

  const spawnShowdown = useCallback(() => {
    const w = WORLDS[worldIdx];
    if (!w) return;

    const queue: { word: string; correct: boolean; family: RhymeFamily }[] = [];
    for (let i = 0; i < SHOWDOWN_CARDS; i++) {
      const fam = pick(w.families);
      const isCorrect = Math.random() > 0.3;
      const word = isCorrect ? pick(fam.words) : pick(fam.distractors);
      queue.push({ word, correct: isCorrect, family: fam });
    }
    showdownQueueRef.current = queue;
    setShowdownCorrect(0);
    setPhase("showdown");

    // Show first showdown card
    advanceShowdown(queue, w);
  }, [worldIdx]);

  const advanceShowdown = useCallback((queue: typeof showdownQueueRef.current, _w: World) => {
    void _w;
    if (queue.length === 0) {
      // Showdown done — transition back
      setPhase("worldTransition");
      return;
    }
    const next = queue[0];
    const fam = next.family;
    setShowdownPrompt(pick(fam.words));
    setCurrentFamily(fam);

    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const card: LaneCard = {
      id: `sd-${++cardIdRef.current}`,
      word: next.word,
      lane,
      correct: next.correct,
      familyColor: fam.color,
      familyIcon: fam.icon,
      y: -CARD_HEIGHT,
      state: "falling",
    };
    setCards([card]);
    setPrompt(pick(fam.words));
  }, []);

  // ── Initial spawn ──
  useEffect(() => {
    spawnRound();
  }, []); // only on mount

  // ── Animation loop ──
  useEffect(() => {
    if (phase !== "playing" && phase !== "showdown") return;

    const isShowdown = phase === "showdown";
    const currentSpeed = isShowdown ? speed * SHOWDOWN_SPEED_MULT : speed;

    const animate = () => {
      setCards((prev) => {
        const next = prev.map((c) => {
          if (c.state !== "falling") return c;
          const ny = c.y + currentSpeed;
          if (ny > FIELD_HEIGHT + CARD_HEIGHT) {
            return { ...c, y: ny, state: "missed" as const };
          }
          return { ...c, y: ny };
        });

        // Check if all cards passed off-screen
        const allDone = next.every((c) => c.state !== "falling");
        if (allDone && prev.some((c) => c.state === "falling")) {
          if (isShowdown) {
            // Showdown: only penalise if the card was the correct rhyme.
            // Letting a distractor pass is neutral/good behaviour.
            const hadCorrect = prev.some((c) => c.correct && c.state === "falling");
            if (hadCorrect) {
              handleMiss();
            } else {
              // Distractor fell through — advance showdown without penalty
              handleShowdownDistractorPass();
            }
          } else {
            // Normal round: missing the correct rhyme is always a miss
            handleMiss();
          }
        }

        return next;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, speed, worldIdx]);

  // ── Miss handler (called when cards fall off screen) ──
  const handleMiss = useCallback(() => {
    if (currentFamily) {
      missedFamiliesRef.current.push(currentFamily);
    }
    setCombo(0);
    setLives((l) => {
      const nl = l - 1;
      if (nl <= 0) {
        setPhase("gameOver");
      }
      return nl;
    });
    setFeedbackText(t("games.rhymeRide.tooSlow"));
    setFeedbackType("negative");
    setPhase("feedback");
    setTimeout(() => {
      setFeedbackText("");
      setTotalRounds((r) => r + 1);
      if (roundIdx + 1 >= ROUNDS_PER_WORLD) {
        handleWorldEnd();
      } else {
        setRoundIdx((r) => r + 1);
        spawnRound();
      }
    }, 1000);
  }, [currentFamily, roundIdx, spawnRound]);

  // ── Showdown distractor pass-through (correct decision — reward) ──
  const handleShowdownDistractorPass = useCallback(() => {
    const nc = registerSuccess(15); // reward for correct pass
    setFeedbackText(nc >= 3 ? `${t("games.rhymeRide.showdownGoodEye")} x${nc}` : t("games.rhymeRide.showdownGoodEye"));
    setFeedbackType("positive");
    setPhase("showdownFeedback");
    setTimeout(() => {
      setFeedbackText("");
      const queue = showdownQueueRef.current;
      queue.shift();
      if (queue.length === 0) {
        setPhase("worldTransition");
      } else {
        setPhase("showdown");
        advanceShowdown(queue, WORLDS[worldIdx]);
      }
    }, 600);
  }, [worldIdx, advanceShowdown, registerSuccess]);

  // ── Lane tap handler ──
  const handleLaneTap = useCallback(
    (lane: 0 | 1 | 2) => {
      if (phase === "feedback" || phase === "worldTransition" || phase === "gameOver" || phase === "showdownFeedback") return;

      // In showdown mode
      if (phase === "showdown") {
        const card = cards.find((c) => c.lane === lane && c.state === "falling");
        if (!card) return;

        const queue = showdownQueueRef.current;
        const currentItem = queue[0];
        if (!currentItem) return;

        if (currentItem.correct) {
          // Should tap — correct!
          setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, state: "hit" as const } : c));
          setShowdownCorrect((c) => c + 1);
          const nc = registerSuccess(20); // reward for correct showdown tap
          setFeedbackText(nc >= 3 ? `${t("games.rhymeRide.showdownHit")} x${nc}` : t("games.rhymeRide.showdownHit"));
          setFeedbackType("positive");
        } else {
          // Shouldn't tap — it's a distractor → gentle penalty
          setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, state: "wrong" as const } : c));
          setCombo(0);
          setFeedbackText(t("games.rhymeRide.showdownNotRhyme"));
          setFeedbackType("negative");
        }
        setPhase("showdownFeedback");

        setTimeout(() => {
          setFeedbackText("");
          queue.shift();
          if (queue.length === 0) {
            setPhase("worldTransition");
          } else {
            setPhase("showdown");
            advanceShowdown(queue, WORLDS[worldIdx]);
          }
        }, 600);
        return;
      }

      // Normal play mode
      const inZone = cards.filter(
        (c) => c.state === "falling" && c.y >= HIT_ZONE_TOP - 20 && c.y <= HIT_ZONE_BOTTOM + 20,
      );

      // Find card in tapped lane (prefer ones in hit zone, fallback to any falling)
      let target = inZone.find((c) => c.lane === lane);
      if (!target) {
        target = cards.find((c) => c.lane === lane && c.state === "falling");
      }
      if (!target) return; // no card in that lane

      if (target.correct) {
        // ── Correct hit ──
        setCards((prev) =>
          prev.map((c) =>
            c.id === target!.id
              ? { ...c, state: "hit" as const }
              : c.state === "falling"
                ? { ...c, state: "missed" as const }
                : c,
          ),
        );
        const nc = registerSuccess(10 * (combo + 1));
        setFeedbackText(
          nc >= 5
            ? `${t("games.shared.amazing")} "${target.word}" x${nc}`
            : nc >= 3
              ? `${t("games.shared.greatJob")} "${target.word}" x${nc}`
              : `${t("games.shared.goodWork")} "${target.word}"!`,
        );
        setFeedbackType("positive");
        setPhase("feedback");

        const nextRound = roundIdx + 1;
        setTotalRounds((r) => r + 1);

        setTimeout(() => {
          setFeedbackText("");

          // Check for showdown trigger
          if (totalCorrect + 1 > 0 && (totalCorrect + 1) % SHOWDOWN_EVERY === 0) {
            spawnShowdown();
            return;
          }

          if (nextRound >= ROUNDS_PER_WORLD) {
            handleWorldEnd();
          } else {
            setRoundIdx(nextRound);
            spawnRound();
          }
        }, 900);
      } else {
        // ── Wrong hit ──
        setCards((prev) =>
          prev.map((c) =>
            c.id === target!.id ? { ...c, state: "wrong" as const } : c,
          ),
        );
        setCombo(0);
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) setPhase("gameOver");
          return nl;
        });
        setFeedbackText(`${t("games.shared.keepTrying")} "${target.word}"`);
        setFeedbackType("negative");

        // Don't advance yet — let remaining cards keep falling
        setTimeout(() => setFeedbackText(""), 1200);
      }
    },
    [phase, cards, combo, prompt, roundIdx, totalCorrect, spawnRound, spawnShowdown, worldIdx],
  );

  // ── World end ──
  const handleWorldEnd = useCallback(() => {
    if (worldIdx + 1 >= WORLDS.length) {
      // All worlds done — finish
      finishGame();
    } else {
      setPhase("worldTransition");
    }
  }, [worldIdx]);

  const advanceWorld = useCallback(() => {
    setWorldIdx((w) => w + 1);
    setRoundIdx(0);
    setFamilyIdx(0);
    setLives((l) => Math.min(l + 1, 3)); // bonus life between worlds
    setPhase("playing");
    // Spawn will happen via effect
    setTimeout(() => {
      const nextWorld = WORLDS[worldIdx + 1];
      if (nextWorld) {
        spawnRound(nextWorld.families[0]);
      }
    }, 100);
  }, [worldIdx, spawnRound]);

  const finishGame = useCallback(() => {
    onFinish({
      gameKey: "rhymo_rhyme_rocket",
      score,
      total: totalRounds || ROUNDS_PER_WORLD * WORLDS.length,
      streakMax: maxStreak,
      roundsCompleted: totalRounds,
    });
  }, [score, totalRounds, maxStreak, onFinish]);

  // ── Keyboard handler ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const numIdx = LANE_KEYS_NUM.indexOf(key);
      const alphaIdx = LANE_KEYS_ALPHA.indexOf(key);
      const lane = numIdx >= 0 ? numIdx : alphaIdx >= 0 ? alphaIdx : -1;
      if (lane >= 0 && lane <= 2) {
        e.preventDefault();
        handleLaneTap(lane as 0 | 1 | 2);
      }
      if (key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleLaneTap]);

  // ═══ Render states ═══

  // Game over
  if (phase === "gameOver") {
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade max-w-md mx-auto">
        <div className="text-6xl bounce-in">{"🎵"}</div>
        <h3 className="text-2xl font-extrabold text-slate-800">{t("games.rhymeRide.rideComplete")}</h3>
        <p className="text-lg text-slate-600">
          {t("games.rhymeRide.score")}: <span className="font-bold text-purple-600">{score}</span>
          {" | "}
          {t("games.rhymeRide.bestStreak")}: <span className="font-bold text-orange-600">{maxStreak}</span>
        </p>
        {maxStreak >= 5 && (
          <div className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold rounded-full shadow-lg">
            {"🏆"} {t("games.rhymeRide.perfectChain")}
          </div>
        )}
        <button
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          onClick={finishGame}
        >
          {t("games.rhymeRide.finish")}
        </button>
      </div>
    );
  }

  // World transition
  if (phase === "worldTransition") {
    const nextWorld = WORLDS[worldIdx + 1];
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade max-w-md mx-auto">
        <div className="text-6xl bounce-in">{world?.icon}</div>
        <h3 className="text-2xl font-extrabold text-slate-800">
          {t("games.rhymeRide.worldComplete", { world: world ? pickLocale(world.names, world.names.en) : "" })}
        </h3>
        <div className="flex gap-4 justify-center">
          <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-2xl font-extrabold text-yellow-600">{score}</p>
            <p className="text-xs text-slate-500">{t("games.rhymeRide.score")}</p>
          </div>
          <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-2xl font-extrabold text-orange-600">{maxStreak}</p>
            <p className="text-xs text-slate-500">{t("games.rhymeRide.bestStreak")}</p>
          </div>
        </div>
        {nextWorld ? (
          <button
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            onClick={advanceWorld}
          >
            {"🚀"} {t("games.rhymeRide.nextWorld", { world: pickLocale(nextWorld.names, nextWorld.names.en) })}
          </button>
        ) : (
          <button
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            onClick={finishGame}
          >
            {"🌟"} {t("games.rhymeRide.seeResults")}
          </button>
        )}
      </div>
    );
  }

  if (!world || !currentFamily) return null;

  return (
    <div className="space-y-3">
      {/* Mute toggle */}
      <div className="flex justify-end max-w-[480px] mx-auto">
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label={muted ? t("games.rhymeRide.soundOn") : t("games.rhymeRide.soundOff")}
        >
          {muted ? "🔇" : "🔊"} {muted ? t("games.rhymeRide.soundOff") : t("games.rhymeRide.soundOn")}
        </button>
      </div>

      {/* HUD */}
      <RhymeHUD
        prompt={prompt}
        familyPattern={currentFamily.pattern}
        familyColor={currentFamily.color}
        familyIcon={currentFamily.icon}
        score={score}
        combo={combo}
        lives={lives}
        worldName={pickLocale(world.names, world.names.en)}
        worldIcon={world.icon}
        roundLabel={
          phase === "showdown" || phase === "showdownFeedback"
            ? t("games.rhymeRide.showdownLabel")
            : `${roundIdx + 1}/${ROUNDS_PER_WORLD}`
        }
      />

      {/* Lane field */}
      <LaneField
        cards={cards}
        onLaneTap={handleLaneTap}
        worldTheme={world.theme}
        reducedMotion={prefersReducedMotion}
        combo={combo}
      />

      {/* Feedback overlay */}
      {feedbackText && (
        <div
          className={cn(
            "text-center py-2 rounded-xl font-bold text-sm max-w-[480px] mx-auto",
            feedbackType === "positive"
              ? "bg-green-100 text-green-800 bounce-in"
              : feedbackType === "negative"
                ? "bg-red-100 text-red-800 shake"
                : "bg-yellow-100 text-yellow-800 bounce-in",
          )}
        >
          {feedbackText}
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-center text-xs text-slate-400 max-w-[480px] mx-auto">
        {t("games.rhymeRide.keyboardHint")}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Export — wraps core in GameShell for briefing + results
// ═══════════════════════════════════════════════════════════════════════════

export default function RhymeRideGame({
  config: _config,
  onComplete,
}: {
  config?: any;
  onComplete?: (result: GameResult) => void;
}) {
  void _config; // config reserved for future content-driven rounds
  const { t } = useTranslation();

  const briefing: MissionBriefing = {
    title: t("games.rhymeRide.briefingTitle"),
    story: t("games.rhymeRide.briefingStory"),
    icon: "🚲",
    chapterLabel: t("games.rhymeRide.title"),
    themeColor: "purple",
    tips: [
      t("games.rhymeRide.tipTapLane"),
      t("games.rhymeRide.tipKeyboard"),
      t("games.rhymeRide.tipCombos"),
      t("games.rhymeRide.tipShowdown"),
    ],
  };

  return (
    <GameShell
      gameKey="rhymo_rhyme_rocket"
      title={t("games.rhymeRide.title", { defaultValue: "Rhyme & Ride" })}
      briefing={briefing}
      onComplete={onComplete!}
    >
      {({ onFinish }) => <RhymeRideCore onFinish={onFinish} />}
    </GameShell>
  );
}
