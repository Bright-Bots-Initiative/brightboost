/**
 * Step 1: Pick avatar + display name.
 *
 * Saves avatar to PathwayOnboarding.avatarSlug; display name updates User.name
 * via the existing /api/auth/profile endpoint if it exists, else we just keep
 * it as state for now (display name on the user record was already settable
 * elsewhere in the app).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeLayout, { StepNav } from "./WelcomeLayout";
import { AVATAR_OPTIONS } from "./avatars";
import { useOnboarding } from "./useOnboarding";

export default function WelcomeAvatarStep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, patch } = useOnboarding();
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (state?.avatarSlug) setPickedSlug(state.avatarSlug);
    if (user?.name) setDisplayName(user.name);
  }, [state?.avatarSlug, user?.name]);

  const onNext = async () => {
    if (!pickedSlug) return;
    await patch({ avatarSlug: pickedSlug, avatarChosen: true });
    navigate("/pathways/welcome/skills");
  };

  return (
    <WelcomeLayout
      step={1}
      title="Welcome to Pathways."
      subtitle="You're about to start something real. Before we dive in, let's set you up."
      showSkipToDashboard
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Pick your look
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            This is how you'll show up across the platform. You can change it
            anytime.
          </p>
          <div
            role="radiogroup"
            aria-label="Avatar"
            className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3"
          >
            {AVATAR_OPTIONS.map((opt) => {
              const picked = pickedSlug === opt.slug;
              const Icon = opt.Icon;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => setPickedSlug(opt.slug)}
                  className={`group rounded-xl border-2 p-2 sm:p-3 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                    picked
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                      : `border-slate-200 dark:border-slate-700 ${opt.hoverClass} bg-white dark:bg-slate-800/40`
                  }`}
                >
                  <span
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${opt.ringClass}`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <label
            htmlFor="display-name"
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1"
          >
            Display name
          </label>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Use whatever name you want to be called here. Doesn't have to be
            your real name.
          </p>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="What should we call you?"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            (For now, we'll just remember your display name in this session;
            permanent changes happen from your profile settings.)
          </p>
        </section>

        <StepNav
          onNext={onNext}
          nextLabel="Continue →"
          nextDisabled={!pickedSlug}
        />
      </div>
    </WelcomeLayout>
  );
}
