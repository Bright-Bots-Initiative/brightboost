/**
 * Step 4: Daily goal preference.
 *
 * Three intensity buckets. Selection saves to
 * PathwayOnboarding.dailyGoalLevel; the daily goal generator can later
 * read this to size the targets it creates. (For now we just record
 * the preference — the daily goal generator falls back to defaults if
 * the preference is missing.)
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import WelcomeLayout, { StepNav } from "./WelcomeLayout";
import { useOnboarding } from "./useOnboarding";

type Level = "light" | "medium" | "heavy";

interface LevelOption {
  value: Level;
  title: string;
  blurb: string;
  bullets: string[];
  recommended?: boolean;
}

const LEVELS: LevelOption[] = [
  {
    value: "light",
    title: "Just exploring",
    blurb: "15–20 minutes a day, a few days a week. Curious for now.",
    bullets: ["Complete 1 section per day", "Earn 30 XP per day"],
  },
  {
    value: "medium",
    title: "Building skills",
    blurb: "30–45 minutes most days. Focused on real progress.",
    bullets: [
      "Complete 1 section per day",
      "Earn 50 XP per day",
      "Try 1 lab or challenge per day",
    ],
    recommended: true,
  },
  {
    value: "heavy",
    title: "Going for it",
    blurb: "1+ hour most days. Serious about a cyber career.",
    bullets: [
      "Complete 2 sections per day",
      "Earn 100 XP per day",
      "Try 1 lab or challenge per day",
    ],
  },
];

export default function WelcomeGoalsStep() {
  const navigate = useNavigate();
  const { state, patch } = useOnboarding();
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    if (state?.dailyGoalLevel) setLevel(state.dailyGoalLevel as Level);
    else setLevel("medium"); // default recommendation
  }, [state?.dailyGoalLevel]);

  const onFinish = async () => {
    if (!level) return;
    await patch({ dailyGoalLevel: level, completed: true });
    navigate("/pathways/welcome/complete");
  };

  return (
    <WelcomeLayout
      step={4}
      title="How much time can you give this?"
      subtitle="We'll set your default daily goals based on what works for you. You can change this anytime."
      showSkipToDashboard
    >
      <div className="space-y-3">
        {LEVELS.map((lvl) => {
          const picked = level === lvl.value;
          return (
            <button
              key={lvl.value}
              type="button"
              onClick={() => setLevel(lvl.value)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all active:scale-[0.99] ${
                picked
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    picked
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {picked && <Check className="w-3 h-3" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {lvl.title}
                    </h3>
                    {lvl.recommended && (
                      <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {lvl.blurb}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {lvl.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="text-slate-400 dark:text-slate-600">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}

        <StepNav
          onBack={() => navigate("/pathways/welcome/mission")}
          onNext={onFinish}
          nextLabel="Finish setup →"
          nextDisabled={!level}
        />
      </div>
    </WelcomeLayout>
  );
}
