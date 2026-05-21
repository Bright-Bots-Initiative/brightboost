/**
 * ChallengePage — single CTF challenge at /pathways/challenges/:slug.
 *
 * Layout: header (title + difficulty/XP chips) → Before You Start →
 * scenario → mission prompt → materials → progressive hints → flag
 * submission. Ethics gate shown once per browser (shared key with the
 * lab ethics modal so students don't see it twice if they came from labs).
 *
 * Solo only in 2.0 — a "Team" toggle is rendered but disabled with a
 * "coming soon" tooltip until 2.1 ships team mode.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  Users,
  HelpCircle,
} from "lucide-react";
import {
  getChallengeBySlug,
  type CtfChallenge,
  type CtfMaterial,
  type CtfDifficulty,
} from "@/constants/ctfChallenges";
import EthicsFraming from "../labs/EthicsFraming";
import { useCelebrate } from "../gamification/CelebrationContext";
import { useChallenges } from "./useChallenges";
import { useOnboarding } from "../onboarding/useOnboarding";
import Toolbox from "./Toolbox";
import ScratchPad from "./ScratchPad";
import MobileToolbox from "./MobileToolbox";
import ToolboxIntro from "./ToolboxIntro";

const DIFFICULTY_BG: Record<CtfDifficulty, string> = {
  easy: "bg-emerald-600",
  medium: "bg-cyan-600",
  hard: "bg-amber-600",
  expert: "bg-rose-600",
};

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface SubmitResponse {
  correct: boolean;
  message: string;
  alreadySolved?: boolean;
  xpAwarded?: number;
  gamification?: {
    award: { leveledUp?: boolean; newLevel?: number; tier?: { tier: string; color: string } } | null;
    badges: Array<{ slug: string; name: string; description: string; icon: string }>;
    moduleCompleted: boolean;
  };
}

interface HintResponse {
  hint: string | null;
  hintsUsed: number;
  hintsRemaining: number;
  hintsExhausted?: boolean;
}

export default function ChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const challenge = useMemo(() => (slug ? getChallengeBySlug(slug) : undefined), [slug]);
  const { progress, refresh } = useChallenges();
  const { celebrate } = useCelebrate();
  const { state: onboarding, patch: patchOnboarding } = useOnboarding();

  const [ethicsAcked, setEthicsAcked] = useState(false);
  const [submittedFlag, setSubmittedFlag] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState<string[]>([]);
  const [hintRemaining, setHintRemaining] = useState(3);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [teamMode, setTeamMode] = useState<"solo" | "team">("solo");
  // Toolbox intro: shown automatically the first time the student finishes
  // ethics framing, and re-openable via the help icon on the Toolbox header.
  const [toolboxIntroOpen, setToolboxIntroOpen] = useState(false);
  const [toolboxIntroForcedOpen, setToolboxIntroForcedOpen] = useState(false);

  // Open the toolbox intro after ethics is acked, but only if the user
  // hasn't seen it before. `toolboxIntroSeen` lives on PathwayOnboarding.
  useEffect(() => {
    if (!ethicsAcked) return;
    if (onboarding && onboarding.toolboxIntroSeen === false) {
      setToolboxIntroOpen(true);
    }
  }, [ethicsAcked, onboarding]);

  const dismissToolboxIntro = async () => {
    setToolboxIntroOpen(false);
    setToolboxIntroForcedOpen(false);
    // Persist the first-time dismissal so it doesn't reappear next visit.
    // No-op when the user opened it via the help icon (already seen).
    if (onboarding && onboarding.toolboxIntroSeen === false) {
      await patchOnboarding({ toolboxIntroSeen: true });
    }
  };

  // Pre-fill any hints the student has already revealed (via highest
  // hintsUsed for this slug on the server).
  useEffect(() => {
    if (!challenge) return;
    const used = progress?.hintsBySlug[challenge.slug] ?? 0;
    if (used > 0) {
      setHintsRevealed(challenge.hints.slice(0, used));
      setHintRemaining(3 - used);
    }
  }, [challenge, progress]);

  if (!challenge) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 dark:text-slate-400">Challenge not found.</p>
        <button
          onClick={() => navigate("/pathways/challenges")}
          className="mt-3 text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          Back to challenges
        </button>
      </div>
    );
  }

  if (!ethicsAcked) {
    return <EthicsFraming onAcknowledge={() => setEthicsAcked(true)} />;
  }

  const alreadySolved = !!progress?.solveMap[challenge.slug];

  const submitFlag = async () => {
    if (!submittedFlag.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/pathways/challenges/${encodeURIComponent(challenge.slug)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ submittedFlag }),
        },
      );
      const body = (await res.json().catch(() => null)) as SubmitResponse | null;
      if (!body) throw new Error("Network error");
      setResult(body);

      // Emit celebrations on first solve.
      if (body.correct && !body.alreadySolved && body.gamification) {
        const events: Array<
          | { type: "level"; newLevel: number; tier: string }
          | { type: "badge"; slug: string; name: string; description: string; icon: string }
        > = [];
        const g = body.gamification;
        if (g.award?.leveledUp && g.award.newLevel && g.award.tier) {
          events.push({
            type: "level",
            newLevel: g.award.newLevel,
            tier: g.award.tier.tier,
          });
        }
        for (const b of g.badges) events.push({ type: "badge", ...b });
        if (events.length > 0) celebrate(events);
      }

      // Refresh ladder so the solve sticks if user navigates back.
      if (body.correct) {
        refresh();
      }
    } catch (err) {
      setResult({
        correct: false,
        message: err instanceof Error ? err.message : "Couldn't submit. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revealNextHint = async () => {
    if (hintLoading || hintRemaining <= 0) return;
    setHintLoading(true);
    setHintError(null);
    try {
      const res = await fetch(
        `/api/pathways/challenges/${encodeURIComponent(challenge.slug)}/hint`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
        },
      );
      const body = (await res.json().catch(() => null)) as
        | (HintResponse & { error?: string })
        | null;
      if (!res.ok) {
        // Server returned a non-2xx; surface its error or a fallback.
        setHintError(body?.error ?? `Couldn't load hint (${res.status})`);
        return;
      }
      if (!body) {
        setHintError("Couldn't load hint — empty response.");
        return;
      }
      if (body.hint) {
        setHintsRevealed((prev) => [...prev, body.hint!]);
        setHintRemaining(body.hintsRemaining);
        return;
      }
      // No `hint` field on a 2xx — typically the "hints exhausted" reply.
      if (body.hintsExhausted || body.hintsRemaining === 0) {
        setHintRemaining(0);
        return;
      }
      setHintError("Unexpected response from the hint service. Try again.");
    } catch (err) {
      // Network errors used to be swallowed silently — surface them now so
      // facilitators (and we) can see when the hint route is unreachable.
      console.error("[ctf/hint] failed:", err);
      setHintError("Network error — check your connection and try again.");
    } finally {
      setHintLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* MAIN COLUMN — challenge content */}
      <div className="flex-1 min-w-0 space-y-5">
      {/* Header */}
      <div>
        <Link
          to="/pathways/challenges"
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to challenges
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
          {challenge.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {challenge.description}
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs sm:text-sm">
          <Chip className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
            {challenge.category}
          </Chip>
          <Chip className={`${DIFFICULTY_BG[challenge.difficulty]} text-white capitalize`}>
            {challenge.difficulty}
          </Chip>
          <Chip className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            +{challenge.xpReward} XP
          </Chip>
          {alreadySolved && (
            <Chip className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Already solved
            </Chip>
          )}
        </div>
      </div>

      {/* Solo / Team toggle (Team is stubbed for 2.0) */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setTeamMode("solo")}
          className={`px-3 py-2 min-h-[40px] rounded-lg border text-sm font-medium ${
            teamMode === "solo"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          }`}
        >
          Solo
        </button>
        <button
          disabled
          title="Team mode launching in the next update"
          className="px-3 py-2 min-h-[40px] rounded-lg border text-sm font-medium bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Team · coming soon
        </button>
      </div>

      {/* Before You Start */}
      <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
        <summary className="font-semibold text-slate-900 dark:text-slate-100 cursor-pointer flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Before You Start
        </summary>
        <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          {challenge.beforeYouStart.length > 0 && (
            <ul className="space-y-1 pl-1">
              {challenge.beforeYouStart.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500 inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> ~{challenge.estimatedMinutes} minutes
          </p>
        </div>
      </details>

      {/* Scenario */}
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-4">
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          {challenge.scenario}
        </p>
      </div>

      {/* Mission */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Your Mission
        </h2>
        <p className="text-sm text-slate-800 dark:text-slate-200">{challenge.prompt}</p>
      </div>

      {/* Materials */}
      <div className="space-y-3">
        {challenge.materials.map((m, i) => (
          <MaterialBlock key={i} material={m} />
        ))}
      </div>

      {/* Hints */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" /> Hints
        </h3>
        {hintsRevealed.map((hint, i) => (
          <div
            key={i}
            className="rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3"
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
              Hint {i + 1}
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-200 mt-1">{hint}</p>
          </div>
        ))}
        {hintRemaining > 0 && (
          <button
            onClick={revealNextHint}
            disabled={hintLoading}
            className="text-sm text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-dashed border-amber-400 dark:border-amber-700 active:scale-[0.98] transition-all"
          >
            💡{" "}
            {hintLoading
              ? "Loading…"
              : `Reveal next hint (${hintRemaining} remaining)`}
          </button>
        )}
        {hintError && (
          <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">
            {hintError}
          </p>
        )}
        {hintRemaining === 0 && hintsRevealed.length === 3 && (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            All hints revealed. Hints don't deduct XP — they just help you learn.
          </p>
        )}
      </div>

      {/* Flag submission */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2 mb-2">
          <Flag className="w-4 h-4 text-rose-500" />
          Submit Flag
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
          Format: {challenge.flagFormat}
        </p>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            type="text"
            value={submittedFlag}
            onChange={(e) => setSubmittedFlag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitFlag();
            }}
            placeholder="Enter your flag here…"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-3 min-h-[44px] text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={submitFlag}
            disabled={submitting || !submittedFlag.trim()}
            className="px-5 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 text-white text-sm font-semibold transition-all"
          >
            {submitting ? "Checking…" : "Submit"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-3 rounded-lg p-3 flex items-start gap-2 ${
              result.correct
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40"
                : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40"
            }`}
          >
            {result.correct ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p
                className={
                  result.correct
                    ? "text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "text-amber-900 dark:text-amber-200"
                }
              >
                {result.message}
              </p>
              {result.correct && !result.alreadySolved && result.xpAwarded && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                  +{result.xpAwarded} XP earned
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      </div>{/* /MAIN COLUMN */}

      {/* RIGHT SIDEBAR — sticky on desktop, hidden on mobile (drawer below).
          Internal overflow so the sidebar itself scrolls when tools +
          scratch pad exceed the viewport height. */}
      <aside className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-4 pr-1">
          <Toolbox
            category={challenge.category}
            defaultExpanded
            headerSlot={
              <button
                type="button"
                onClick={() => {
                  setToolboxIntroForcedOpen(true);
                  setToolboxIntroOpen(true);
                }}
                aria-label="What is the toolbox?"
                className="p-1 -m-1 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            }
          />
          <ScratchPad challengeSlug={challenge.slug} defaultExpanded />
        </div>
      </aside>

      {/* MOBILE — floating button + bottom-sheet drawer. Hidden on lg+. */}
      <MobileToolbox
        category={challenge.category}
        challengeSlug={challenge.slug}
      />

      {/* One-time intro on first CTF visit; re-openable via help icon */}
      {toolboxIntroOpen && (
        <ToolboxIntro
          showClose={toolboxIntroForcedOpen}
          onAcknowledge={() => void dismissToolboxIntro()}
        />
      )}
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function MaterialBlock({ material }: { material: CtfMaterial }) {
  if (material.type === "text") {
    return (
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3">
        {material.caption && (
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
            {material.caption}
          </p>
        )}
        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
          {material.content}
        </p>
      </div>
    );
  }

  if (material.type === "code" || material.type === "table") {
    return (
      <div className="rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {material.caption && (
          <div className="px-3 py-2 border-b border-slate-700 bg-slate-800 dark:bg-slate-900">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {material.caption}
              {material.language && (
                <span className="ml-2 text-slate-500 lowercase">· {material.language}</span>
              )}
            </p>
          </div>
        )}
        <pre className="px-3 py-3 overflow-x-auto text-[12px] sm:text-[13px] text-slate-100 leading-relaxed font-mono">
          {material.content}
        </pre>
      </div>
    );
  }

  // image / file_download — render a placeholder for now; not used by the
  // initial catalog but kept here so future challenges can opt in.
  return (
    <div className="rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-600 dark:text-slate-400">
      {material.caption ?? "Material"}
    </div>
  );
}

// Unused, but exported as a hook for future tests / external embedding.
export type { CtfChallenge };
