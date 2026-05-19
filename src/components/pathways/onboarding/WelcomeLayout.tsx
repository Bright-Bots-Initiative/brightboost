/**
 * WelcomeLayout — shared shell for the 4-step Cyber Skills 101 flow.
 *
 * Renders a top progress indicator (4 dots), the step title, the step body
 * (passed as children), and a footer area for nav buttons. Step components
 * stay focused on their own content and let the layout handle chrome.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface WelcomeLayoutProps {
  step: 1 | 2 | 3 | 4 | 5; // 5 = complete screen, hides the progress bar visually
  totalSteps?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  showSkipToDashboard?: boolean;
}

export default function WelcomeLayout({
  step,
  totalSteps = 4,
  title,
  subtitle,
  children,
  showSkipToDashboard,
}: WelcomeLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Top row: progress + escape hatch */}
        <div className="flex items-center justify-between gap-3">
          {step <= totalSteps ? (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                return (
                  <div
                    key={n}
                    className={`h-1.5 rounded-full transition-all ${
                      active
                        ? "w-8 bg-indigo-500"
                        : done
                          ? "w-4 bg-emerald-500"
                          : "w-4 bg-slate-200 dark:bg-slate-700"
                    }`}
                    aria-label={`Step ${n} ${active ? "(current)" : done ? "(done)" : ""}`}
                  />
                );
              })}
              <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                Step {step} of {totalSteps}
              </span>
            </div>
          ) : (
            <div />
          )}
          {showSkipToDashboard && (
            <Link
              to="/pathways"
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Skip to dashboard
            </Link>
          )}
        </div>

        {/* Header */}
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </header>

        {/* Body */}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** Small inline back/next button row used by every step. */
export function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue →",
  nextDisabled,
  secondaryAction,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="pt-4 sm:pt-6 flex items-center justify-between gap-3 flex-wrap">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 ml-auto">
        {secondaryAction}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 text-white text-sm font-semibold transition-all"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
