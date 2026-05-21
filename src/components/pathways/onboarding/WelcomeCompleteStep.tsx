/**
 * Final celebration screen — shown after the user finishes Step 4.
 *
 * Highlights the chosen avatar + display name, echoes the mission statement,
 * and points them at the dashboard. The actual onboarding.completedAt was
 * already set in the Goals step (via `patch({ completed: true })`).
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeLayout from "./WelcomeLayout";
import { AvatarBadge } from "./avatars";
import { useOnboarding } from "./useOnboarding";

export default function WelcomeCompleteStep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useOnboarding();

  return (
    <WelcomeLayout step={5} title="" subtitle="">
      <div className="text-center space-y-5 pt-2">
        <div className="flex justify-center">
          <AvatarBadge slug={state?.avatarSlug} size="xl" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          You're all set
          {user?.name ? `, ${user.name}` : ""}!
        </h1>

        {state?.missionStatement && (
          <div className="max-w-md mx-auto rounded-xl border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-3 text-left">
            <p className="text-[10px] uppercase tracking-widest text-indigo-700 dark:text-indigo-300 font-semibold">
              Your mission
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-200 italic mt-1">
              &ldquo;{state.missionStatement}&rdquo;
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-left max-w-md mx-auto">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            What's next?
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Head to your dashboard and start your first module. Your daily
            goals refresh every morning — and the Glossary tool is available
            any time you hit a term you don't know.
          </p>
        </div>

        <button
          onClick={() => navigate("/pathways")}
          className="px-6 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
        >
          Let's go →
        </button>
      </div>
    </WelcomeLayout>
  );
}
