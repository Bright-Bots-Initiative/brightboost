/**
 * Step 3: Mission statement.
 *
 * One sentence in the student's own words. Saved to
 * PathwayOnboarding.missionStatement and surfaced on profile + home as a
 * recurring reminder of their own framing.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeLayout, { StepNav } from "./WelcomeLayout";
import { useOnboarding } from "./useOnboarding";

const EXAMPLES = [
  "I want to help my family stay safe online.",
  "I'm curious about how hackers think — and how to stop them.",
  "I want a career that pays well and lets me work remote.",
  "I want to protect my community from scams.",
];

export default function WelcomeMissionStep() {
  const navigate = useNavigate();
  const { state, patch } = useOnboarding();
  const [text, setText] = useState("");

  useEffect(() => {
    if (state?.missionStatement) setText(state.missionStatement);
  }, [state?.missionStatement]);

  const onNext = async () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      await patch({ missionStatement: trimmed });
    }
    navigate("/pathways/welcome/goals");
  };

  return (
    <WelcomeLayout
      step={3}
      title="Why are you here?"
      subtitle="In one sentence — why are you doing this? Who do you want to protect? Who could you help?"
      showSkipToDashboard
    >
      <div className="space-y-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={4}
          placeholder="I'm here because…"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          {text.length}/280 characters
        </p>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
            Examples
          </p>
          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {EXAMPLES.map((ex) => (
              <li key={ex} className="flex gap-2">
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setText(ex)}
                  className="text-left hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2">
            Tap any example to use it as a starting point.
          </p>
        </div>

        <StepNav
          onBack={() => navigate("/pathways/welcome/skills")}
          onNext={onNext}
          nextLabel="Continue →"
        />
      </div>
    </WelcomeLayout>
  );
}
