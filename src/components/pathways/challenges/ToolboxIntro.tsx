/**
 * ToolboxIntro — one-time overlay shown the first time a student opens a
 * CTF challenge. Frames the toolbox + scratch pad + hints so they don't
 * think they're supposed to do everything in their head.
 *
 * Dismissal flips PathwayOnboarding.toolboxIntroSeen so future visits skip
 * it. Re-openable via the help icon on the Toolbox header.
 */
import { Wrench, Edit3, Lightbulb, X } from "lucide-react";

interface ToolboxIntroProps {
  onAcknowledge: () => void;
  /** When true, shows a small × close button (used when the intro is
   *  re-opened from the help icon and the user is just browsing the
   *  reference rather than completing first-run). */
  showClose?: boolean;
}

export default function ToolboxIntro({
  onAcknowledge,
  showClose,
}: ToolboxIntroProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            Meet Your Toolbox
          </h2>
          {showClose && (
            <button
              type="button"
              onClick={onAcknowledge}
              aria-label="Close"
              className="p-1 -m-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <p>
            Real cybersecurity professionals don't memorize ciphers or compute
            hex by hand. They use tools — and so will you.
          </p>

          <IntroBlock
            Icon={Wrench}
            tint="indigo"
            title="Toolbox"
            body={
              <>
                Every challenge has tools designed for it — cipher decoders,
                hex converters, port references, network calculators, and
                more. They live in a panel on the right (on mobile, tap the{" "}
                <span className="inline-flex items-center gap-0.5 align-baseline">
                  <Wrench className="w-3 h-3" /> Tools
                </span>{" "}
                button in the bottom corner).
              </>
            }
          />

          <IntroBlock
            Icon={Edit3}
            tint="emerald"
            title="Scratch Pad"
            body="A notepad for your work. Notes, attempts, partial answers — anything. Auto-saves while you work. It sits right below the Toolbox."
          />

          <IntroBlock
            Icon={Lightbulb}
            tint="amber"
            title="Hints"
            body="Stuck? Every challenge has 3 progressive hints. Using them doesn't cost you any XP — it just helps your facilitator see where group instruction might help."
          />

          <p className="text-center text-slate-600 dark:text-slate-400 italic text-xs sm:text-sm pt-2">
            The challenge isn't to do everything in your head.
            <br />
            The challenge is to recognize problems and use the right tool.
          </p>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onAcknowledge}
            className="w-full px-5 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
          >
            Got it — let's solve some puzzles
          </button>
        </div>
      </div>
    </div>
  );
}

type Tint = "indigo" | "emerald" | "amber";

function IntroBlock({
  Icon,
  tint,
  title,
  body,
}: {
  Icon: typeof Wrench;
  tint: Tint;
  title: string;
  body: React.ReactNode;
}) {
  const ring = {
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
    amber:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
  }[tint];
  const iconColor = {
    indigo: "text-indigo-700 dark:text-indigo-300",
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-400",
  }[tint];
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${ring}`}>
      <p className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </span>
      </p>
      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        {body}
      </div>
    </div>
  );
}
