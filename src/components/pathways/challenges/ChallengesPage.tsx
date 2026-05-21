/**
 * ChallengesPage — CTF ladder home at /pathways/challenges.
 *
 * Layout: hero + four category sections, each a row of six rungs (cards).
 * Solved cards display a flag icon; unsolved show their difficulty chip.
 * Locked progression is OFF in 2.0 (students can attempt any challenge);
 * if we want a strict ladder later, the `Lock` import is ready.
 */
import { Link } from "react-router-dom";
import { Flag, Trophy, Lock, Wrench } from "lucide-react";
import { CATEGORIES, type CtfDifficulty } from "@/constants/ctfChallenges";
import { useChallenges, type DisplayChallenge } from "./useChallenges";

const DIFFICULTY_BG: Record<CtfDifficulty, string> = {
  easy: "bg-emerald-600",
  medium: "bg-cyan-600",
  hard: "bg-amber-600",
  expert: "bg-rose-600",
};

const DIFFICULTY_LABEL: Record<CtfDifficulty, string> = {
  easy: "E",
  medium: "M",
  hard: "H",
  expert: "X",
};

export default function ChallengesPage() {
  const { challenges, progress, loading } = useChallenges();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/50 h-32 animate-pulse" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <div
                  key={j}
                  className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-700 dark:from-purple-800 dark:to-indigo-800 p-5 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">CTF Challenges</h1>
        <p className="text-white/80 mt-1 sm:mt-2 text-sm sm:text-base">
          Solve real cyber puzzles. Capture flags. Build your skills.
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4 text-white/90 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Flag className="w-4 h-4" /> {progress?.totalSolved ?? 0} solved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> {progress?.totalAttempts ?? 0} attempts
          </span>
        </div>
      </div>

      {/* How challenges work — brief intro above the category ladders.
          Helps first-time visitors understand the toolbox + scratch pad
          are part of the experience, not optional extras. */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-600 rounded-lg p-2 shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              How CTF Challenges Work
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm mt-1 leading-relaxed">
              Each challenge gives you a puzzle and a set of tools to solve
              it. The skill isn't memorizing — it's pattern recognition and
              tool selection. Use the toolbox (right side on desktop, 🔧
              button on mobile), take notes in the scratch pad, and reveal
              hints if you get stuck.
            </p>
            <details className="mt-3 group">
              <summary className="text-sm text-indigo-700 dark:text-indigo-300 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-200 list-none">
                <span className="inline-flex items-center gap-1">
                  Where to start
                  <span className="group-open:rotate-90 transition-transform">
                    →
                  </span>
                </span>
              </summary>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1.5">
                <p>
                  ·{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    New to CTFs?
                  </strong>{" "}
                  Start with any Easy challenge in Cryptography or Web.
                </p>
                <p>
                  ·{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    Want a challenge?
                  </strong>{" "}
                  Try a Hard one after solving three or four Easys.
                </p>
                <p>
                  ·{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    Going for badges?
                  </strong>{" "}
                  Solve one challenge in each category to earn Cyber
                  Generalist.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map((cat) => {
        const inCategory = challenges.filter((c) => c.category === cat.slug);
        const solved = inCategory.filter((c) => c.solved).length;
        return (
          <section key={cat.slug}>
            <div className="flex items-baseline justify-between mb-2 sm:mb-3 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {cat.label}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {solved}/{inCategory.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {cat.description}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
              {inCategory.map((c) => (
                <ChallengeCard key={c.slug} challenge={c} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: DisplayChallenge }) {
  // Note: we intentionally do NOT lock harder challenges behind easier ones.
  // Students should be able to attempt anything — second-chance design.
  const _Lock = Lock; // tree-shaking guard; kept for future strict-ladder mode.
  void _Lock;
  return (
    <Link
      to={`/pathways/challenges/${challenge.slug}`}
      className={`group block aspect-square rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center text-center transition-all active:scale-95 border ${
        challenge.solved
          ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
          : "bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
      }`}
    >
      {challenge.solved ? (
        <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
      ) : (
        <span
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${DIFFICULTY_BG[challenge.difficulty]} flex items-center justify-center shrink-0`}
        >
          <span className="text-white text-xs sm:text-sm font-bold uppercase">
            {DIFFICULTY_LABEL[challenge.difficulty]}
          </span>
        </span>
      )}
      <span
        className={`text-[11px] sm:text-xs mt-1 sm:mt-2 leading-tight line-clamp-2 ${
          challenge.solved ? "text-white" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {challenge.title}
      </span>
      <span
        className={`text-[10px] mt-0.5 ${
          challenge.solved ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        +{challenge.xpReward} XP
      </span>
    </Link>
  );
}
