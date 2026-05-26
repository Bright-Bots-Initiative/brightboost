/**
 * LabShell — the common chrome every sandbox lab renders inside.
 *
 * Wraps lab content with:
 *  - "Before You Start" checklist (skills assumed, time, output produced)
 *  - Ethics framing modal on first run per browser
 *  - Best-effort POST to /api/pathways/student/labs/attempt
 *  - Optional hint UI tracked on lab state
 *
 * Labs themselves stay focused on the interactive experience and delegate
 * persistence + ethics gating to this component.
 */
import { useState, useCallback, ReactNode } from "react";
import { ArrowLeft, Clock, ListChecks, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import EthicsFraming from "./EthicsFraming";
import { useCelebrate } from "../gamification/CelebrationContext";

export interface LabBriefing {
  /** Lab title shown in the header. */
  title: string;
  /** One-line subtitle. */
  subtitle: string;
  /** Approximate time the lab takes — purely informational. */
  estMinutes: number;
  /** What skills/concepts the student should already have. */
  assumes: string[];
  /** What artifact / outcome the lab produces. */
  outputDescription: string;
}

export interface LabAttemptPayload {
  labSlug: string;
  mode?: string;
  score: number;
  hintsUsed?: number;
  output?: unknown;
}

interface LabShellProps {
  briefing: LabBriefing;
  onExit: () => void;
  children: (api: LabApi) => ReactNode;
}

export interface LabApi {
  /** Persist an attempt; non-fatal on failure (network optimism). */
  recordAttempt: (payload: LabAttemptPayload) => Promise<void>;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function LabShell({ briefing, onExit, children }: LabShellProps) {
  const { t } = useTranslation();
  const [ethicsAcked, setEthicsAcked] = useState(false);
  const [briefed, setBriefed] = useState(false);
  const { celebrate } = useCelebrate();

  const recordAttempt = useCallback(
    async (payload: LabAttemptPayload) => {
      try {
        const res = await fetch("/api/pathways/student/labs/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        const gam = body?.gamification as
          | {
              award: {
                leveledUp?: boolean;
                newLevel?: number;
                tier?: { tier: string; color: string };
              } | null;
              badges: Array<{
                slug: string;
                name: string;
                description: string;
                icon: string;
              }>;
            }
          | undefined;
        if (gam) {
          const events: Array<
            | { type: "level"; newLevel: number; tier: string }
            | {
                type: "badge";
                slug: string;
                name: string;
                description: string;
                icon: string;
              }
          > = [];
          if (gam.award?.leveledUp && gam.award.newLevel && gam.award.tier) {
            events.push({
              type: "level",
              newLevel: gam.award.newLevel,
              tier: gam.award.tier.tier,
            });
          }
          for (const b of gam.badges) {
            events.push({ type: "badge", ...b });
          }
          if (events.length > 0) celebrate(events);
        }
      } catch {
        /* attempts are persisted best-effort; UI stays optimistic */
      }
    },
    [celebrate],
  );

  // Gate 1: Ethics framing (once per browser).
  if (!ethicsAcked) {
    return <EthicsFraming onAcknowledge={() => setEthicsAcked(true)} />;
  }

  // Gate 2: "Before You Start" briefing (every visit — it's a 10-second scan).
  if (!briefed) {
    return (
      <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto space-y-5">
          <button
            onClick={onExit}
            className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> {t("pathways.labs.shell.backToTrack")}
          </button>

          <div>
            <p className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold mb-1">
              {t("pathways.labs.shell.labLabel")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {briefing.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{briefing.subtitle}</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("pathways.labs.shell.beforeYouStart")}
              </p>
            </div>

            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <Clock className="w-3 h-3" /> {t("pathways.labs.shell.timeLabel")}
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {t("pathways.labs.shell.timeValue", { minutes: briefing.estMinutes })}
              </p>
            </div>

            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <ListChecks className="w-3 h-3" /> {t("pathways.labs.shell.assumesLabel")}
              </p>
              <ul className="text-sm text-slate-800 dark:text-slate-200 space-y-1 pl-1">
                {briefing.assumes.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                {t("pathways.labs.shell.outputLabel")}
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {briefing.outputDescription}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setBriefed(true)}
              className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
            >
              {t("pathways.labs.shell.startCta")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate cleared — render the lab body.
  return (
    <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={onExit}
          className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {children({ recordAttempt })}
      </div>
    </div>
  );
}
