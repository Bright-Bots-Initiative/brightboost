/**
 * Quantum Quest — A space-themed math adventure.
 *
 * Kids solve math problems by targeting correct answers among moving objects.
 * Teaches arithmetic, number recognition, patterns, and intro quantum concepts.
 *
 * Pure React implementation following the SequenceDragDropGame pattern.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import GameShell, { GameResult, MissionBriefing } from "./shared/GameShell";
import {
  Zap, Star, ChevronRight, RotateCcw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface MathProblem {
  id: string;
  prompt: string;
  promptEs?: string;
  correctAnswer: number;
  decoys: number[];
  skillTag: string; // "counting" | "addition" | "subtraction" | "comparison" | "patterns"
}

interface QQSector {
  id: string;
  title: string;
  titleEs?: string;
  storyBeat?: string;
  storyBeatEs?: string;
  problems: MathProblem[];
  speed: number; // 1-5, target movement speed
  spawnRate: number; // seconds between target spawns
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
}

// ── Built-in Sectors ───────────────────────────────────────────────────────

const BUILTIN_CONFIG: QuantumQuestConfig = {
  gameKey: "quantum_quest",
  sectors: [
    {
      id: "s1", title: "Star Counting", titleEs: "Conteo de Estrellas",
      storyBeat: "Welcome, Explorer! Count the stars to power your ship.",
      storyBeatEs: "¡Bienvenido, Explorador! Cuenta las estrellas para dar energía a tu nave.",
      speed: 1, spawnRate: 2.5,
      problems: [
        { id: "s1-1", prompt: "How many? ⭐⭐⭐", promptEs: "¿Cuántas? ⭐⭐⭐", correctAnswer: 3, decoys: [2, 4, 5], skillTag: "counting" },
        { id: "s1-2", prompt: "How many? 🌟🌟🌟🌟🌟", promptEs: "¿Cuántas? 🌟🌟🌟🌟🌟", correctAnswer: 5, decoys: [3, 4, 6], skillTag: "counting" },
        { id: "s1-3", prompt: "Which is bigger: 3 or 7?", promptEs: "¿Cuál es mayor: 3 o 7?", correctAnswer: 7, decoys: [3, 5, 4], skillTag: "comparison" },
        { id: "s1-4", prompt: "How many? 🚀🚀", promptEs: "¿Cuántos? 🚀🚀", correctAnswer: 2, decoys: [1, 3, 4], skillTag: "counting" },
        { id: "s1-5", prompt: "Which is smaller: 9 or 4?", promptEs: "¿Cuál es menor: 9 o 4?", correctAnswer: 4, decoys: [9, 6, 5], skillTag: "comparison" },
      ],
    },
    {
      id: "s2", title: "Addition Nebula", titleEs: "Nebulosa de Sumas",
      storyBeat: "The nebula needs energy! Solve additions to recharge it.",
      storyBeatEs: "¡La nebulosa necesita energía! Resuelve las sumas para recargarla.",
      speed: 2, spawnRate: 2,
      problems: [
        { id: "s2-1", prompt: "2 + 3 = ?", correctAnswer: 5, decoys: [4, 6, 3], skillTag: "addition" },
        { id: "s2-2", prompt: "4 + 1 = ?", correctAnswer: 5, decoys: [3, 6, 4], skillTag: "addition" },
        { id: "s2-3", prompt: "3 + 3 = ?", correctAnswer: 6, decoys: [5, 7, 4], skillTag: "addition" },
        { id: "s2-4", prompt: "5 + 2 = ?", correctAnswer: 7, decoys: [6, 8, 5], skillTag: "addition" },
        { id: "s2-5", prompt: "1 + 6 = ?", correctAnswer: 7, decoys: [5, 8, 6], skillTag: "addition" },
        { id: "s2-6", prompt: "4 + 4 = ?", correctAnswer: 8, decoys: [6, 7, 9], skillTag: "addition" },
      ],
    },
    {
      id: "s3", title: "Quantum Challenges", titleEs: "Desafíos Cuánticos",
      storyBeat: "You've reached the Quantum Zone! Mixed challenges ahead.",
      storyBeatEs: "¡Llegaste a la Zona Cuántica! Desafíos variados adelante.",
      speed: 3, spawnRate: 1.8,
      problems: [
        { id: "s3-1", prompt: "5 - 2 = ?", correctAnswer: 3, decoys: [2, 4, 5], skillTag: "subtraction" },
        { id: "s3-2", prompt: "8 - 3 = ?", correctAnswer: 5, decoys: [4, 6, 3], skillTag: "subtraction" },
        { id: "s3-3", prompt: "6 + 4 = ?", correctAnswer: 10, decoys: [8, 9, 11], skillTag: "addition" },
        { id: "s3-4", prompt: "What comes next: 2, 4, 6, ?", promptEs: "¿Qué sigue: 2, 4, 6, ?", correctAnswer: 8, decoys: [7, 9, 10], skillTag: "patterns" },
        { id: "s3-5", prompt: "9 - 5 = ?", correctAnswer: 4, decoys: [3, 5, 6], skillTag: "subtraction" },
        { id: "s3-6", prompt: "7 + 5 = ?", correctAnswer: 12, decoys: [10, 11, 13], skillTag: "addition" },
        { id: "s3-7", prompt: "What comes next: 1, 3, 5, ?", promptEs: "¿Qué sigue: 1, 3, 5, ?", correctAnswer: 7, decoys: [6, 8, 9], skillTag: "patterns" },
      ],
    },
  ],
};

// ── Target Field (the gameplay area) ───────────────────────────────────────

const FIELD_W = 600;
const FIELD_H = 360;
const TARGET_SIZE = 64;

function TargetField({
  targets, onHit,
}: {
  targets: Target[];
  onHit: (id: string) => void;
}) {
  return (
    <div
      className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 rounded-xl overflow-hidden border-2 border-indigo-500/30 mx-auto select-none"
      style={{ width: FIELD_W, height: FIELD_H, maxWidth: "100%" }}
    >
      {/* Starfield background */}
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
        />
      ))}

      {/* Targets */}
      {targets.map((tgt) => (
        <button
          key={tgt.id}
          className={`absolute flex items-center justify-center rounded-full font-bold text-lg transition-all duration-150 ${
            tgt.hit
              ? "bg-green-400/80 text-green-900 scale-125 ring-4 ring-green-400/50"
              : tgt.missed
                ? "bg-red-400/60 text-red-200 scale-90 opacity-50"
                : "bg-indigo-500/80 text-white hover:bg-indigo-400 hover:scale-110 active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/30"
          }`}
          style={{
            width: TARGET_SIZE,
            height: TARGET_SIZE,
            left: Math.max(0, Math.min(tgt.x, FIELD_W - TARGET_SIZE)),
            top: Math.max(0, Math.min(tgt.y, FIELD_H - TARGET_SIZE)),
          }}
          onClick={() => !tgt.hit && !tgt.missed && onHit(tgt.id)}
          disabled={tgt.hit || tgt.missed}
        >
          {tgt.value}
        </button>
      ))}
    </div>
  );
}

// ── HUD ────────────────────────────────────────────────────────────────────

function QQHud({
  prompt, score, streak, lives, problemIdx, totalProblems,
}: {
  prompt: string;
  score: number;
  streak: number;
  lives: number;
  problemIdx: number;
  totalProblems: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="bg-indigo-900/80 text-white px-4 py-2 rounded-lg font-bold text-lg flex-1 text-center min-w-[200px]">
        {prompt}
      </div>
      <div className="flex gap-3 text-sm">
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
          <Star className="w-4 h-4" /> {score}
        </span>
        {streak > 1 && (
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium flex items-center gap-1 animate-pulse">
            <Zap className="w-4 h-4" /> x{streak}
          </span>
        )}
        <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full font-medium">
          {"❤️".repeat(Math.max(0, lives))}
        </span>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
          {problemIdx + 1}/{totalProblems}
        </span>
      </div>
    </div>
  );
}

// ── Core Game ──────────────────────────────────────────────────────────────

function QuantumQuestCore({ config, onFinish }: {
  config: QuantumQuestConfig;
  onFinish: (result: GameResult) => void;
}) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");

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

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [sectorsCleared, setSectorsCleared] = useState(0);

  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  const sector = config.sectors[sectorIdx];
  const problem = sector?.problems[problemIdx];

  // Spawn targets for current problem
  const spawnTargets = useCallback(() => {
    if (!problem) return;
    const answers = [problem.correctAnswer, ...problem.decoys].sort(() => Math.random() - 0.5);
    const newTargets: Target[] = answers.map((val, i) => {
      const speed = (sector?.speed ?? 1) * 0.5;
      return {
        id: `${problem.id}-${i}`,
        value: val,
        x: Math.random() * (FIELD_W - TARGET_SIZE * 2) + TARGET_SIZE / 2,
        y: Math.random() * (FIELD_H - TARGET_SIZE * 2) + TARGET_SIZE / 2,
        dx: (Math.random() - 0.5) * speed * 2,
        dy: (Math.random() - 0.5) * speed * 2,
        correct: val === problem.correctAnswer,
        hit: false,
        missed: false,
      };
    });
    setTargets(newTargets);
    lastSpawnRef.current = Date.now();
  }, [problem, sector]);

  useEffect(() => {
    spawnTargets();
  }, [spawnTargets]);

  // Animate targets
  useEffect(() => {
    if (sectorComplete || gameOver) return;

    const animate = () => {
      setTargets((prev) =>
        prev.map((tgt) => {
          if (tgt.hit || tgt.missed) return tgt;
          let nx = tgt.x + tgt.dx;
          let ny = tgt.y + tgt.dy;
          let ndx = tgt.dx;
          let ndy = tgt.dy;
          if (nx <= 0 || nx >= FIELD_W - TARGET_SIZE) ndx = -ndx;
          if (ny <= 0 || ny >= FIELD_H - TARGET_SIZE) ndy = -ndy;
          return { ...tgt, x: nx, y: ny, dx: ndx, dy: ndy };
        }),
      );
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sectorComplete, gameOver, problemIdx, sectorIdx]);

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

    if (tgt.correct) {
      setTargets((prev) => prev.map((t) => t.id === targetId ? { ...t, hit: true } : { ...t, missed: true }));
      setScore((s) => s + (1 + streak) * 10);
      setStreak((s) => { const ns = s + 1; setMaxStreak((m) => Math.max(m, ns)); return ns; });
      setTotalCorrect((c) => c + 1);
      setFeedback({ text: streak > 0 ? `${t("games.quantumQuest.correct")} 🔥 x${streak + 1}` : t("games.quantumQuest.correct"), type: "correct" });
      setTimeout(advanceProblem, 800);
    } else {
      setTargets((prev) => prev.map((t) => t.id === targetId ? { ...t, missed: true } : t));
      setStreak(0);
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) setGameOver(true);
        return nl;
      });
      setFeedback({ text: t("games.quantumQuest.tryAgain"), type: "wrong" });
    }
  }, [targets, streak, advanceProblem, t]);

  const handleNextSector = useCallback(() => {
    if (sectorIdx + 1 < config.sectors.length) {
      setSectorIdx(sectorIdx + 1);
      setProblemIdx(0);
      setSectorComplete(false);
      setLives((l) => Math.min(l + 1, 5)); // bonus life between sectors
    } else {
      // All sectors done
      finishGame();
    }
  }, [sectorIdx, config.sectors.length]);

  const finishGame = useCallback(() => {
    const totalProblems = config.sectors.reduce((s, sec) => s + sec.problems.length, 0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const achievements: string[] = [];
    if (maxStreak >= 5) achievements.push("Sharp Scanner");
    if (accuracy >= 90) achievements.push("Perfect Orbit");
    if (sectorsCleared === config.sectors.length) achievements.push("Quantum Explorer");

    onFinish({
      gameKey: "quantum_quest",
      score: totalCorrect,
      total: totalProblems,
      streakMax: maxStreak,
      roundsCompleted: sectorsCleared,
      accuracy,
      levelReached: sectorsCleared,
      hintsUsed: 0,
      firstTryClear: lives === 3 && sectorsCleared === config.sectors.length,
      achievements,
      gameSpecific: { maxStreak, totalAttempted, sectorsCleared },
    });
  }, [config, totalCorrect, totalAttempted, maxStreak, lives, sectorsCleared, onFinish]);

  // Game over
  if (gameOver) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-5xl">💫</div>
        <h3 className="text-xl font-bold text-indigo-900">{t("games.quantumQuest.missionEnd")}</h3>
        <p className="text-slate-600">{t("games.quantumQuest.scoreLabel")}: {totalCorrect}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => {
            setSectorIdx(0); setProblemIdx(0); setScore(0); setStreak(0); setMaxStreak(0);
            setLives(3); setTotalCorrect(0); setTotalAttempted(0); setSectorsCleared(0);
            setGameOver(false); setSectorComplete(false); setFeedback(null);
          }}>
            <RotateCcw className="w-4 h-4 mr-1" /> {t("games.quantumQuest.retry")}
          </Button>
          <Button className="bg-indigo-600" onClick={finishGame}>
            {t("games.quantumQuest.finishBtn")}
          </Button>
        </div>
      </div>
    );
  }

  // Sector complete
  if (sectorComplete && sector) {
    const sectorTitle = isEs ? (sector.titleEs ?? sector.title) : sector.title;
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-5xl">🌟</div>
        <h3 className="text-xl font-bold text-indigo-900">
          {sectorTitle} {t("games.quantumQuest.cleared")}!
        </h3>
        <p className="text-slate-600">{t("games.quantumQuest.scoreLabel")}: {totalCorrect} · {t("games.quantumQuest.streakLabel")}: {maxStreak}</p>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleNextSector}>
          {sectorIdx + 1 < config.sectors.length
            ? <>{t("games.quantumQuest.nextSector")} <ChevronRight className="w-4 h-4 ml-1" /></>
            : <>{t("games.quantumQuest.finishBtn")} <Star className="w-4 h-4 ml-1" /></>
          }
        </Button>
      </div>
    );
  }

  if (!problem || !sector) return null;

  const promptText = isEs ? (problem.promptEs ?? problem.prompt) : problem.prompt;
  const sectorTitle = isEs ? (sector.titleEs ?? sector.title) : sector.title;

  return (
    <div className="space-y-3">
      {/* Sector label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {sectorTitle}
        </span>
        {sector.storyBeat && problemIdx === 0 && (
          <span className="text-xs text-slate-500 italic max-w-xs text-right">
            {isEs ? (sector.storyBeatEs ?? sector.storyBeat) : sector.storyBeat}
          </span>
        )}
      </div>

      {/* HUD */}
      <QQHud
        prompt={promptText}
        score={score}
        streak={streak}
        lives={lives}
        problemIdx={problemIdx}
        totalProblems={sector.problems.length}
      />

      {/* Target field */}
      <TargetField targets={targets} onHit={handleHit} />

      {/* Feedback */}
      {feedback && (
        <div className={`text-center py-2 rounded-lg font-medium text-sm ${
          feedback.type === "correct" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}

// ── Exported Wrapper ───────────────────────────────────────────────────────

export default function QuantumQuestGame({ config, onComplete }: QuantumQuestGameProps) {
  const { t, i18n } = useTranslation();
  const isEs = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const gameConfig = config?.sectors?.length ? config : BUILTIN_CONFIG;

  const briefing: MissionBriefing = {
    title: isEs ? "¡Misión Cuántica!" : "Quantum Mission!",
    story: isEs
      ? "¡Explorador del espacio! Resuelve problemas de matemáticas para guiar tu nave a través del cosmos. ¡Apunta a las respuestas correctas!"
      : "Space Explorer! Solve math problems to guide your ship through the cosmos. Target the correct answers!",
    icon: "🚀",
    tips: isEs
      ? ["Toca la respuesta correcta", "¡Las rachas dan más puntos!", "Cuidado con los señuelos"]
      : ["Tap the correct answer", "Streaks give bonus points!", "Watch out for decoys"],
  };

  return (
    <GameShell
      gameKey="quantum_quest"
      title={t("games.quantumQuest.title")}
      briefing={briefing}
      onComplete={onComplete}
    >
      {({ onFinish }) => <QuantumQuestCore config={gameConfig} onFinish={onFinish} />}
    </GameShell>
  );
}
