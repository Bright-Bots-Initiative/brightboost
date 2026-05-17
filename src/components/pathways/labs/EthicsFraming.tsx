/**
 * EthicsFraming — first-run modal shown before any sandbox lab.
 *
 * Reinforces that the techniques students are about to practice are real
 * cybersecurity skills, and that the sandbox is the *only* place they're
 * authorized to apply them. Required first-run UX for justice-impacted
 * youth audiences where the legal/ethical boundary is load-bearing.
 *
 * Acknowledgment is persisted in localStorage so students only see it
 * once per browser. Per-lab override via the `force` prop is available
 * if a specific lab wants to re-show the framing.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "bb_pathways_ethics_ack_v1";

interface EthicsFramingProps {
  /** Called when the student dismisses the modal. */
  onAcknowledge: () => void;
  /** If true, show even if the user already acknowledged once. */
  force?: boolean;
}

export function readEthicsAck(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function EthicsFraming({ onAcknowledge, force }: EthicsFramingProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (force || !readEthicsAck()) setOpen(true);
    else onAcknowledge();
    // We intentionally run this once on mount; deliberate, scoped scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const handleAck = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* localStorage unavailable — fine, user just sees framing each session */
    }
    setOpen(false);
    onAcknowledge();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30">
          <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("pathways.labs.ethics.title", "Before You Start")}
          </h2>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <p>
            {t(
              "pathways.labs.ethics.intro",
              "What you're about to practice are real cybersecurity skills. Some of these techniques could be misused.",
            )}
          </p>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              {t("pathways.labs.ethics.ruleHeading", "Our rule, always:")}
            </p>
            <ul className="space-y-1.5 pl-1">
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                <span>
                  {t(
                    "pathways.labs.ethics.rule1",
                    "We practice here, in the sandbox.",
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                <span>
                  {t(
                    "pathways.labs.ethics.rule2",
                    "We never use these techniques against real people, real accounts, real companies, or real schools.",
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                <span>
                  {t(
                    "pathways.labs.ethics.rule3",
                    "Our work is to protect, not to attack.",
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                <span>
                  {t(
                    "pathways.labs.ethics.rule4",
                    "If you ever see someone misusing these skills, tell a trusted adult.",
                  )}
                </span>
              </li>
            </ul>
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            {t(
              "pathways.labs.ethics.outro",
              "Your curiosity and skill can protect a lot of people. Let's get to work.",
            )}
          </p>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleAck}
            className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
          >
            {t("pathways.labs.ethics.cta", "I Understand — Let's Go")}
          </button>
        </div>
      </div>
    </div>
  );
}
