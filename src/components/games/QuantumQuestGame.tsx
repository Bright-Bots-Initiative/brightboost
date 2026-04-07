/**
 * Quantum Quest — Premium space-themed math adventure (polished v2).
 *
 * Upgrades: sector theming, hit pulse effects, streak escalation,
 * power-up system, richer starfield, improved HUD, sector celebrations.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import { Zap, Star, ChevronRight, RotateCcw, Shield, Clock, Sparkles } from "lucide-react";
import { pickLocale } from "@/utils/localizedContent";
import "./shared/game-effects.css";

// ── Types ──────────────────────────────────────────────────────────────────

interface MathProblem {
  id: string;
  prompts: Partial<Record<string, string>>;
  correctAnswer: number;
  decoys: number[];
  skillTag: string;
}

interface QQSector {
  id: string;
  titles: Partial<Record<string, string>>;
  storyBeats?: Partial<Record<string, string>>;
  problems: MathProblem[];
  speed: number;
  spawnRate: number;
  theme: "harbor" | "nebula" | "gate";
}

interface QuantumQuestConfig {
  gameKey: "quantum_quest";
  sectors: QQSector[];
}

interface QuantumQuestGameProps {
  config: QuantumQuestConfig;
  onComplete: (result?: GameResult) => void;
}

interface Target {
  id: string;
  value: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  correct: boolean;
  hit: boolean;
  missed: boolean;
  size: number;
}

type PowerUp = "slowTime" | "shield" | "reveal";

// ── Sector Themes ──────────────────────────────────────────────────────────

const SECTOR_THEMES: Record<string, { bg: string; accent: string; targetIdle: string; targetGlow: string; label: string; icon: string }> = {
  harbor: {
    bg: "from-slate-900 via-blue-950 to-slate-900",
    accent: "blue", targetIdle: "from-blue-500 to-indigo-600",
    targetGlow: "shadow-blue-500/40", label: "Star Harbor", icon: "🌟",
  },
  nebula: {
    bg: "from-indigo-950 via-purple-950 to-indigo-950",
    accent: "purple", targetIdle: "from-purple-500 to-pink-600",
    targetGlow: "shadow-purple-500/40", label: "Nebula Stream", icon: "🌌",
  },
  gate: {
    bg: "from-slate-950 via-cyan-950 to-slate-950",
    accent: "cyan", targetIdle: "from-cyan-500 to-teal-600",
    targetGlow: "shadow-cyan-500/40", label: "Quantum Gate", icon: "🔮",
  },
};

// ── Built-in Sectors ───────────────────────────────────────────────────────

const BUILTIN_CONFIG: QuantumQuestConfig = {
  gameKey: "quantum_quest",
  sectors: [
    {
      id: "s1", titles: { en: "Star Harbor", es: "Puerto Estelar", vi: "Bến Sao", "zh-CN": "星港" }, theme: "harbor",
      storyBeats: { en: "Welcome, Explorer! Count the stars to power your ship.", es: "¡Bienvenido! Cuenta las estrellas para dar energía a tu nave.", vi: "Chào nhà thám hiểm! Đếm các ngôi sao để tiếp năng lượng cho tàu.", "zh-CN": "欢迎，探险家！数星星来给飞船充能。" },
      speed: 1, spawnRate: 2.5,
      problems: [
        { id: "s1-1", prompts: { en: "How many? ⭐⭐⭐", es: "¿Cuántas? ⭐⭐⭐", vi: "Bao nhiêu? ⭐⭐⭐", "zh-CN": "有几个？⭐⭐⭐" }, correctAnswer: 3, decoys: [2, 4, 5], skillTag: "counting" },
        { id: "s1-2", prompts: { en: "How many? 🌟🌟🌟🌟🌟", es: "¿Cuántas? 🌟🌟🌟🌟🌟", vi: "Bao nhiêu? 🌟🌟🌟🌟🌟", "zh-CN": "有几个？🌟🌟🌟🌟🌟" }, correctAnswer: 5, decoys: [3, 4, 6], skillTag: "counting" },
        { id: "s1-3", prompts: { en: "Which is bigger: 3 or 7?", es: "¿Cuál es mayor: 3 o 7?", vi: "Số nào lớn hơn: 3 hay 7?", "zh-CN": "哪个更大：3还是7？" }, correctAnswer: 7, decoys: [3, 5, 4], skillTag: "comparison" },
        { id: "s1-4", prompts: { en: "How many? 🚀🚀", es: "¿Cuántos? 🚀🚀", vi: "Bao nhiêu? 🚀🚀", "zh-CN": "有几个？🚀🚀" }, correctAnswer: 2, decoys: [1, 3, 4], skillTag: "counting" },
        { id: "s1-5", prompts: { en: "Which is smaller: 9 or 4?", es: "¿Cuál es menor: 9 o 4?", vi: "Số nào nhỏ hơn: 9 hay 4?", "zh-CN": "哪个更小：9还是4？" }, correctAnswer: 4, decoys: [9, 6, 5], skillTag: "comparison" },
      ],
    },
    {
      id: "s2", titles: { en: "Nebula Stream", es: "Corriente de Nebulosa", vi: "Dòng Tinh Vân", "zh-CN": "星云流" }, theme: "nebula",
      storyBeats: { en: "The nebula needs energy! Scan carefully and discover the right answers.", es: "¡La nebulosa necesita energía! Escanea con cuidado y descubre las respuestas.", vi: "Tinh vân cần năng lượng! Quét kỹ và tìm câu trả lời đúng.", "zh-CN": "星云需要能量！仔细扫描，找到正确答案。" },
      speed: 2, spawnRate: 2,
      problems: [
        { id: "s2-1", prompts: { en: "2 + 3 = ?" }, correctAnswer: 5, decoys: [4, 6, 3], skillTag: "addition" },
        { id: "s2-2", prompts: { en: "4 + 1 = ?" }, correctAnswer: 5, decoys: [3, 6, 4], skillTag: "addition" },
        { id: "s2-3", prompts: { en: "3 + 3 = ?" }, correctAnswer: 6, decoys: [5, 7, 4], skillTag: "addition" },
        { id: "s2-4", prompts: { en: "5 + 2 = ?" }, correctAnswer: 7, decoys: [6, 8, 5], skillTag: "addition" },
        { id: "s2-5", prompts: { en: "1 + 6 = ?" }, correctAnswer: 7, decoys: [5, 8, 6], skillTag: "addition" },
        { id: "s2-6", prompts: { en: "4 + 4 = ?" }, correctAnswer: 8, decoys: [6, 7, 9], skillTag: "addition" },
      ],
    },
    {
      id: "s3", titles: { en: "Quantum Gate", es: "Puerta Cuántica", vi: "Cổng Lượng Tử", "zh-CN": "量子之门" }, theme: "gate",
      storyBeats: { en: "Several possible paths until we check closely! Mixed challenges ahead.", es: "¡Varios caminos posibles hasta que miremos bien! Desafíos variados adelante.", vi: "Nhiều con đường cho đến khi kiểm tra kỹ! Thử thách hỗn hợp phía trước.", "zh-CN": "仔细检查才能找到正确的路！前方有混合挑战。" },
      speed: 3, spawnRate: 1.8,
      problems: [
        { id: "s3-1", prompts: { en: "5 - 2 = ?" }, correctAnswer: 3, decoys: [2, 4, 5], skillTag: "subtraction" },
        { id: "s3-2", prompts: { en: "8 - 3 = ?" }, correctAnswer: 5, decoys: [4, 6, 3], skillTag: "subtraction" },
        { id: "s3-3", prompts: { en: "6 + 4 = ?" }, correctAnswer: 10, decoys: [8, 9, 11], skillTag: "addition" },
        { id: "s3-4", prompts: { en: "What comes next: 2, 4, 6, ?", es: "¿Qué sigue: 2, 4, 6, ?", vi: "Số tiếp theo: 2, 4, 6, ?", "zh-CN": "下一个是：2, 4, 6, ?" }, correctAnswer: 8, decoys: [7, 9, 10], skillTag: "patterns" },
        { id: "s3-5", prompts: { en: "9 - 5 = ?" }, correctAnswer: 4, decoys: [3, 5, 6], skillTag: "subtraction" },
        { id: "s3-6", prompts: { en: "7 + 5 = ?" }, correctAnswer: 12, decoys: [10, 11, 13], skillTag: "addition" },
        { id: "s3-7", prompts: { en: "What comes next: 1, 3, 5, ?", es: "¿Qué sigue: 1, 3, 5, ?", vi: "Số tiếp theo: 1, 3, 5, ?", "zh-CN": "下一个是：1, 3, 5, ?" }, correctAnswer: 7, decoys: [6, 8, 9], skillTag: "patterns" },
      ],
    },
  ],
};

// ── Target Field ───────────────────────────────────────────────────────────

const FIELD_W = 600;
const FIELD_H = 380;
const TARGET_PAD = 8; // safe padding from edges so targets never clip

function TargetField({
  targets, onHit, sectorTheme, streak, hitEffects, slowActive,
}: {
  targets: Target[];
  onHit: (id: string) => void;
  sectorTheme: typeof SECTOR_THEMES[string];
  streak: number;
  hitEffects: { id: string; x: number; y: number; correct: boolean }[];
  slowActive: boolean;
}) {
  // Responsive scaling — same approach as Bounce & Buds
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  // Stable starfield
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.15,
      twinkle: 2 + Math.random() * 3,
    })),
  []);

  return (
    <div ref={wrapperRef} className="mx-auto" style={{ maxWidth: FIELD_W }}>
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl"
        style={{ height: FIELD_H * scale }}
      >
        <div
          className={`absolute top-0 left-0 bg-gradient-to-b ${sectorTheme.bg} select-none ${slowActive ? "ring-2 ring-cyan-400/50" : ""}`}
          style={{
            width: FIELD_W,
            height: FIELD_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Starfield */}
          {stars.map((s) => (
            <div
              key={s.id}
              className="absolute rounded-full bg-white"
              style={{
                width: s.size, height: s.size,
                left: `${s.x}%`, top: `${s.y}%`,
                opacity: s.opacity,
                animation: `sparkle ${s.twinkle}s ease-in-out infinite`,
                animationDelay: `${s.id * 0.1}s`,
              }}
            />
          ))}

          {/* Hit effect bursts */}
          {hitEffects.map((e) => (
            <div
              key={e.id}
              className="absolute pointer-events-none hit-burst rounded-full"
              style={{
                left: e.x, top: e.y, width: 64, height: 64,
                background: e.correct
                  ? "radial-gradient(circle, rgba(74,222,128,0.6), transparent)"
                  : "radial-gradient(circle, rgba(248,113,113,0.6), transparent)",
              }}
            />
          ))}

          {/* Targets */}
          {targets.map((tgt) => {
            const isIdle = !tgt.hit && !tgt.missed;
            return (
              <button
                key={tgt.id}
                className={`absolute flex items-center justify-center rounded-full font-extrabold transition-all duration-150 ${
                  tgt.hit
                    ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white scale-0 opacity-0"
                    : tgt.missed
                      ? "bg-red-500/40 text-red-200 scale-75 opacity-30"
                      : `bg-gradient-to-br ${sectorTheme.targetIdle} text-white shadow-lg ${sectorTheme.targetGlow} hover:scale-110 active:scale-90 cursor-pointer`
                }`}
                style={{
                  width: tgt.size, height: tgt.size,
                  fontSize: tgt.size > 60 ? 22 : 18,
                  left: tgt.x,
                  top: tgt.y,
                  transition: tgt.hit ? "all 0.3s ease-out" : "transform 0.1s",
                }}
                onClick={() => isIdle && onHit(tgt.id)}
                disabled={!isIdle}
              >
                {tgt.value}
              </button>
            );
          })}

          {/* Streak fire overlay */}
          {streak >= 3 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-extrabold streak-fire shadow-lg">
              🔥 {streak}x STREAK
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── HUD ────────────────────────────────────────────────────────────────────

function QQHud({
  prompt, score, streak, lives, problemIdx, totalProblems, sectorTheme, powerUps, onUsePower,
}: {
  prompt: string;
  score: number;
  streak: number;
  lives: number;
  problemIdx: number;
  totalProblems: number;
  sectorTheme: typeof SECTOR_THEMES[string];
  powerUps: Record<PowerUp, number>;
  onUsePower: (p: PowerUp) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {/* Prompt bar */}
      <div className={`bg-gradient-to-r from-${sectorTheme.accent}-900/90 to-${sectorTheme.accent}-800/90 text-white px-5 py-3 rounded-xl font-extrabold text-xl text-center shadow-lg border border-white/10`}>
        {prompt}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Stats */}
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full font-bold shadow-sm">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> {score}
          </span>
          {streak > 1 && (
            <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold shadow-sm ${
              streak >= 5 ? "bg-red-100 text-red-700 streak-fire" : "bg-orange-100 text-orange-700"
            }`}>
              <Zap className="w-4 h-4" /> x{streak}
            </span>
          )}
          <span className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full font-medium">
            {Array.from({ length: Math.max(0, lives) }, (_, i) => (
              <span key={i} className="text-base">❤️</span>
            ))}
          </span>
          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
            {problemIdx + 1}/{totalProblems}
          </span>
        </div>
        {/* Power-ups */}
        <div className="flex gap-1.5">
          {powerUps.slowTime > 0 && (
            <button onClick={() => onUsePower("slowTime")} className="flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold hover:bg-cyan-200 active:scale-95 transition-all" title={t("games.quantumQuest.slowTime")}>
              <Clock className="w-3 h-3" /> {powerUps.slowTime}
            </button>
          )}
          {powerUps.shield > 0 && (
            <button onClick={() => onUsePower("shield")} className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 active:scale-95 transition-all" title={t("games.quantumQuest.shieldBubble")}>
              <Shield className="w-3 h-3" /> {powerUps.shield}
            </button>
          )}
          {powerUps.reveal > 0 && (
            <button onClick={() => onUsePower("reveal")} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 active:scale-95 transition-all" title={t("games.quantumQuest.reveal")}>
              <Sparkles className="w-3 h-3" /> {powerUps.reveal}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Core Game ──────────────────────────────────────────────────────────────

function QuantumQuestCore({ config, onFinish }: { config: QuantumQuestConfig; onFinish: (result: GameResult) => void }) {
  const { t } = useTranslation();

  const [sectorIdx, setSectorIdx] = useState(0);
  const [problemIdx, setProblemIdx] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<{ text: string; type: "correct" | "wrong" } | null>(null);
  const [sectorComplete, setSectorComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hitEffects, setHitEffects] = useState<{ id: string; x: number; y: number; correct: boolean }[]>([]);

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [sectorsCleared, setSectorsCleared] = useState(0);
  const [powerUpsUsed, setPowerUpsUsed] = useState(0);

  // Power-ups: earned by streaks
  const [powerUps, setPowerUps] = useState<Record<PowerUp, number>>({ slowTime: 1, shield: 1, reveal: 0 });
  const [slowActive, setSlowActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);

  const animFrameRef = useRef<number>(0);
  const sector = config.sectors[sectorIdx];
  const problem = sector?.problems[problemIdx];
  const sectorTheme = SECTOR_THEMES[sector?.theme ?? "harbor"];

  const spawnTargets = useCallback(() => {
    if (!problem) return;
    const answers = [problem.correctAnswer, ...problem.decoys].sort(() => Math.random() - 0.5);
    const speed = (sector?.speed ?? 1) * (slowActive ? 0.25 : 0.5);
    const tgtSize = 64 + Math.floor(Math.random() * 12);
    const maxX = FIELD_W - tgtSize - TARGET_PAD;
    const maxY = FIELD_H - tgtSize - TARGET_PAD;
    const newTargets: Target[] = answers.map((val, i) => ({
      id: `${problem.id}-${i}-${Date.now()}`,
      value: val, correct: val === problem.correctAnswer,
      x: TARGET_PAD + Math.random() * (maxX - TARGET_PAD),
      y: TARGET_PAD + Math.random() * (maxY - TARGET_PAD),
      dx: (Math.random() - 0.5) * speed * 2,
      dy: (Math.random() - 0.5) * speed * 2,
      hit: false, missed: false,
      size: tgtSize,
    }));
    setTargets(newTargets);
  }, [problem, sector, slowActive]);

  useEffect(() => { spawnTargets(); }, [spawnTargets]);

  // Animate
  useEffect(() => {
    if (sectorComplete || gameOver) return;
    const animate = () => {
      setTargets((prev) => prev.map((tgt) => {
        if (tgt.hit || tgt.missed) return tgt;
        let nx = tgt.x + tgt.dx, ny = tgt.y + tgt.dy;
        let ndx = tgt.dx, ndy = tgt.dy;
        const minB = TARGET_PAD;
        const maxX = FIELD_W - tgt.size - TARGET_PAD;
        const maxY = FIELD_H - tgt.size - TARGET_PAD;
        if (nx <= minB) { nx = minB; ndx = Math.abs(ndx); }
        else if (nx >= maxX) { nx = maxX; ndx = -Math.abs(ndx); }
        if (ny <= minB) { ny = minB; ndy = Math.abs(ndy); }
        else if (ny >= maxY) { ny = maxY; ndy = -Math.abs(ndy); }
        return { ...tgt, x: nx, y: ny, dx: ndx, dy: ndy };
      }));
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sectorComplete, gameOver, problemIdx, sectorIdx]);

  // Clean hit effects
  useEffect(() => {
    if (hitEffects.length === 0) return;
    const timer = setTimeout(() => setHitEffects([]), 500);
    return () => clearTimeout(timer);
  }, [hitEffects]);

  const advanceProblem = useCallback(() => {
    setFeedback(null);
    if (problemIdx + 1 < (sector?.problems.length ?? 0)) {
      setProblemIdx(problemIdx + 1);
    } else {
      setSectorComplete(true);
      setSectorsCleared((s) => s + 1);
    }
  }, [problemIdx, sector]);

  const handleHit = useCallback((targetId: string) => {
    const tgt = targets.find((t) => t.id === targetId);
    if (!tgt || tgt.hit || tgt.missed) return;
    setTotalAttempted((a) => a + 1);
    setHitEffects([{ id: targetId, x: tgt.x, y: tgt.y, correct: tgt.correct }]);

    if (tgt.correct) {
      setTargets((prev) => prev.map((t) => t.id === targetId ? { ...t, hit: true } : { ...t, missed: true }));
      const bonus = (1 + streak) * 10;
      setScore((s) => s + bonus);
      setStreak((s) => {
        const ns = s + 1;
        setMaxStreak((m) => Math.max(m, ns));
        // Award power-up at streak milestones
        if (ns === 3) setPowerUps((p) => ({ ...p, reveal: p.reveal + 1 }));
        if (ns === 5) setPowerUps((p) => ({ ...p, slowTime: p.slowTime + 1 }));
        return ns;
      });
      setTotalCorrect((c) => c + 1);
      setFeedback({ text: streak > 0 ? `${t("games.quantumQuest.correct")} 🔥 x${streak + 1}` : t("games.quantumQuest.correct"), type: "correct" });
      setTimeout(advanceProblem, 700);
    } else {
      setTargets((prev) => prev.map((t) => t.id === targetId ? { ...t, missed: true } : t));
      setStreak(0);
      if (shieldActive) {
        setShieldActive(false);
        setFeedback({ text: t("games.quantumQuest.shieldSaved"), type: "wrong" });
      } else {
        setLives((l) => { const nl = l - 1; if (nl <= 0) setGameOver(true); return nl; });
        setFeedback({ text: t("games.quantumQuest.tryAgain"), type: "wrong" });
      }
    }
  }, [targets, streak, advanceProblem, t, shieldActive]);

  const usePower = useCallback((p: PowerUp) => {
    if (powerUps[p] <= 0) return;
    setPowerUps((prev) => ({ ...prev, [p]: prev[p] - 1 }));
    setPowerUpsUsed((c) => c + 1);
    if (p === "slowTime") { setSlowActive(true); setTimeout(() => setSlowActive(false), 5000); }
    if (p === "shield") setShieldActive(true);
    if (p === "reveal") {
      setTargets((prev) => prev.map((t) => t.correct ? { ...t, size: t.size + 16 } : t));
    }
  }, [powerUps]);

  const handleNextSector = useCallback(() => {
    if (sectorIdx + 1 < config.sectors.length) {
      setSectorIdx(sectorIdx + 1);
      setProblemIdx(0);
      setSectorComplete(false);
      setSlowActive(false);
      setShieldActive(false);
      setLives((l) => Math.min(l + 1, 5));
    } else {
      finishGame();
    }
  }, [sectorIdx, config.sectors.length]);

  const finishGame = useCallback(() => {
    const totalProblems = config.sectors.reduce((s, sec) => s + sec.problems.length, 0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const achievements: string[] = [];
    if (maxStreak >= 5) achievements.push(t("games.quantumQuest.achScanner"));
    if (accuracy >= 90) achievements.push(t("games.quantumQuest.achPerfect"));
    if (sectorsCleared === config.sectors.length) achievements.push(t("games.quantumQuest.achExplorer"));
    if (maxStreak >= 3) achievements.push(t("games.quantumQuest.achFast"));

    onFinish({
      gameKey: "quantum_quest", score: totalCorrect, total: totalProblems,
      streakMax: maxStreak, roundsCompleted: sectorsCleared, accuracy,
      levelReached: sectorsCleared, hintsUsed: 0,
      firstTryClear: lives >= 3 && sectorsCleared === config.sectors.length,
      achievements, gameSpecific: { maxStreak, totalAttempted, sectorsCleared, powerUpsUsed },
    });
  }, [config, totalCorrect, totalAttempted, maxStreak, lives, sectorsCleared, powerUpsUsed, onFinish, t]);

  const resetAll = useCallback(() => {
    setSectorIdx(0); setProblemIdx(0); setScore(0); setStreak(0); setMaxStreak(0);
    setLives(3); setTotalCorrect(0); setTotalAttempted(0); setSectorsCleared(0);
    setGameOver(false); setSectorComplete(false); setFeedback(null);
    setPowerUps({ slowTime: 1, shield: 1, reveal: 0 }); setSlowActive(false); setShieldActive(false);
    setPowerUpsUsed(0);
  }, []);

  // Game over
  if (gameOver) {
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">💫</div>
        <h3 className="text-2xl font-extrabold text-indigo-900">{t("games.quantumQuest.missionEnd")}</h3>
        <p className="text-lg text-slate-600">{t("games.quantumQuest.scoreLabel")}: <span className="font-bold text-indigo-600">{totalCorrect}</span></p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="rounded-xl" onClick={resetAll}>
            <RotateCcw className="w-4 h-4 mr-1" /> {t("games.quantumQuest.retry")}
          </Button>
          <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-lg" onClick={finishGame}>
            {t("games.quantumQuest.finishBtn")}
          </Button>
        </div>
      </div>
    );
  }

  // Sector complete
  if (sectorComplete && sector) {
    const sectorTitle = pickLocale(sector.titles, sector.titles.en ?? "");
    return (
      <div className="text-center space-y-5 py-8 slide-up-fade">
        <div className="text-6xl bounce-in">{sectorTheme.icon}</div>
        <h3 className="text-2xl font-extrabold text-indigo-900">
          {sectorTitle} {t("games.quantumQuest.cleared")}!
        </h3>
        <div className="flex gap-4 justify-center">
          <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-2xl font-extrabold text-yellow-600">{totalCorrect}</p>
            <p className="text-xs text-slate-500">{t("games.quantumQuest.scoreLabel")}</p>
          </div>
          <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-2xl font-extrabold text-orange-600">{maxStreak}</p>
            <p className="text-xs text-slate-500">{t("games.quantumQuest.streakLabel")}</p>
          </div>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform px-8" onClick={handleNextSector}>
          {sectorIdx + 1 < config.sectors.length
            ? <>{t("games.quantumQuest.nextSector")} <ChevronRight className="w-4 h-4 ml-1" /></>
            : <>{t("games.quantumQuest.finishBtn")} <Sparkles className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>
    );
  }

  if (!problem || !sector) return null;
  const promptText = pickLocale(problem.prompts, problem.prompts.en ?? "");

  return (
    <div className="space-y-3">
      <QQHud
        prompt={promptText} score={score} streak={streak} lives={lives}
        problemIdx={problemIdx} totalProblems={sector.problems.length}
        sectorTheme={sectorTheme} powerUps={powerUps} onUsePower={usePower}
      />
      <TargetField
        targets={targets} onHit={handleHit} sectorTheme={sectorTheme}
        streak={streak} hitEffects={hitEffects} slowActive={slowActive}
      />
      {feedback && (
        <div className={`text-center py-2 rounded-xl font-bold text-sm ${
          feedback.type === "correct" ? "bg-green-100 text-green-800 bounce-in" : "bg-red-100 text-red-800 shake"
        }`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────

export default function QuantumQuestGame({ config, onComplete }: QuantumQuestGameProps) {
  const { t } = useTranslation();
  const gameConfig = config?.sectors?.length ? config : BUILTIN_CONFIG;

  const briefing: MissionBriefing = {
    title: pickLocale({ en: "Quantum Mission!", es: "¡Misión Cuántica!", vi: "Nhiệm Vụ Lượng Tử!", "zh-CN": "量子任务！" }, "Quantum Mission!"),
    story: pickLocale({
      en: "Explorer! Solve math problems and scan the correct answers floating through space.",
      es: "¡Explorador! Resuelve problemas de matemáticas y escanea las respuestas correctas flotando en el espacio.",
      vi: "Nhà thám hiểm! Giải toán và quét các câu trả lời đúng trôi nổi trong không gian.",
      "zh-CN": "探险家！解决数学题，扫描漂浮在太空中的正确答案。",
    }, "Explorer! Solve math problems and scan the correct answers floating through space."),
    icon: "🚀",
    chapterLabel: pickLocale({ en: "Quantum Quest", es: "Quantum Quest", vi: "Quantum Quest", "zh-CN": "量子探索" }, "Quantum Quest"),
    themeColor: "violet",
    tips: pickLocale({
      en: ["Tap the correct answer", "Streaks unlock power-ups!", "Use power-ups wisely"],
      es: ["Toca la respuesta correcta", "¡Las rachas dan poderes!", "Usa poderes con cuidado"],
      vi: ["Chạm câu trả lời đúng", "Chuỗi đúng mở khóa sức mạnh!", "Dùng sức mạnh cẩn thận"],
      "zh-CN": ["点击正确答案", "连续答对可解锁道具！", "谨慎使用道具"],
    }, ["Tap the correct answer", "Streaks unlock power-ups!", "Use power-ups wisely"]),
  };

  return (
    <GameShell gameKey="quantum_quest" title={t("games.quantumQuest.title")} briefing={briefing} onComplete={onComplete}>
      {({ onFinish }) => <QuantumQuestCore config={gameConfig} onFinish={onFinish} />}
    </GameShell>
  );
}
