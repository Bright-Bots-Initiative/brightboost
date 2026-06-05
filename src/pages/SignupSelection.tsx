/**
 * SignupSelection — role chooser for new users.
 *
 * Two distinct K-8 signup paths:
 *   - Teacher → /teacher/signup (email + password, then create class)
 *   - Student → /student/signup (email + password — students who only have a
 *     class code use /class-login instead, no signup needed for them)
 *
 * Uses LoginCard for visual consistency with the rest of the auth flow.
 * Fires `signup_role_selected` so the funnel shows where new users branch.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import LoginCard from "@/components/auth/LoginCard";
import { track } from "@/lib/analytics";

interface RoleOption {
  role: "teacher" | "student";
  to: string;
  emoji: string;
  headingKey: string;
  blurbKey: string;
  ctaKey: string;
  accent: string;
}

const OPTIONS: RoleOption[] = [
  {
    role: "teacher",
    to: "/teacher/signup",
    emoji: "👩‍🏫",
    headingKey: "signupSelection.teacherCard.heading",
    blurbKey: "signupSelection.teacherCard.blurb",
    ctaKey: "signupSelection.teacherCard.cta",
    accent: "from-sky-500 to-indigo-600",
  },
  {
    role: "student",
    to: "/student/signup",
    emoji: "🎒",
    headingKey: "signupSelection.studentCard.heading",
    blurbKey: "signupSelection.studentCard.blurb",
    ctaKey: "signupSelection.studentCard.cta",
    accent: "from-purple-500 to-pink-500",
  },
];

const SignupSelection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <LoginCard
      icon="✨"
      title={t("signupSelection.title")}
      subtitle={t("signupSelection.subtitle")}
    >
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <Link
            key={opt.role}
            to={opt.to}
            onClick={() => track({ kind: "signup_role_selected", role: opt.role })}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-300 active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div
                className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${opt.accent} flex items-center justify-center text-2xl shadow-sm`}
                aria-hidden
              >
                {opt.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900">
                  {t(opt.headingKey)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {t(opt.blurbKey)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
              {t(opt.ctaKey)} →
            </p>
          </Link>
        ))}
      </div>

      {/* Class-code alternative — students with a code from their teacher
          don't need a self-signup. Surfacing it here reduces confusion. */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
        <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-700">
            {t("signupSelection.classCodeNote")}
          </p>
          <Link
            to="/class-login"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            {t("signupSelection.classCodeLink")} →
          </Link>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-600">
          {t("signupSelection.haveAccount")}{" "}
          <Link
            to="/student-login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            {t("signupSelection.logIn")}
          </Link>
        </p>
      </div>
    </LoginCard>
  );
};

export default SignupSelection;
