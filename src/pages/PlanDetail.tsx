// src/pages/PlanDetail.tsx
//
// Free Access Plans detail pages: /plans/learner, /plans/classroom,
// /plans/organization. Public, short (one phone-scroll), each ending in a
// persona-routed CTA. Reached from the "Learn more" buttons on the homepage
// Free Access Plans section (src/pages/Index.tsx).
//
// Honesty rule: only promise features that exist TODAY. In particular we do NOT
// claim teachers can "assign modules" — that UI is a known gap.
//
// i18n NOTE: copy is intentionally hardcoded English to match the rest of the
// landing/marketing surface (Index.tsx is not i18n'd). i18n for the whole
// marketing surface is tracked as debt — see the PR.
import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import GameBackground from "../components/GameBackground";
import LanguageToggle from "../components/LanguageToggle";
import { track } from "@/lib/analytics";

type PlanCta = { label: string; to: string; cta: string };
type PlanContent = {
  title: string;
  tagline: string;
  bullets: string[];
  primary: PlanCta;
  secondary: PlanCta;
};

const PLAN_CONTENT: Record<string, PlanContent> = {
  learner: {
    title: "Bright Boost for Learners",
    tagline:
      "Hands-on STEM games you can jump into right now — no setup, no cost.",
    bullets: [
      "Play STEM games across AI, quantum, and biotech themes",
      "Earn XP, level up an avatar, and track your own progress",
      "Available in English and Spanish",
      "Content for K-2 and grades 3-5",
    ],
    primary: { label: "Play a game now", to: "/try", cta: "try" },
    secondary: { label: "Sign up free", to: "/signup", cta: "signup" },
  },
  classroom: {
    title: "Bright Boost for Classrooms",
    tagline: "Free tools for teachers — set up a class in minutes.",
    bullets: [
      "Create a class and share one join code",
      "Students sign in with an emoji and a secret number — no email needed",
      "See each student's progress across the STEM games",
      "English and Spanish, with K-2 and grades 3-5 content",
    ],
    primary: {
      label: "Create your class — it's free",
      to: "/teacher/signup",
      cta: "teacher_signup",
    },
    secondary: { label: "See a student demo", to: "/try", cta: "try" },
  },
  organization: {
    title: "Bright Boost for Organizations",
    tagline: "Free for schools, libraries, and community programs.",
    bullets: [
      "Bring multiple teachers and classrooms onto one platform",
      "Bilingual access (English and Spanish) for diverse communities",
      "Measurable student progress teachers can see",
      "Always free — no per-seat cost",
    ],
    primary: {
      label: "Get started — teacher sign up",
      to: "/teacher/signup",
      cta: "teacher_signup",
    },
    secondary: { label: "Contact us", to: "/feedback", cta: "contact" },
  },
};

export default function PlanDetail() {
  const { plan } = useParams();
  const key = (plan ?? "").toLowerCase();
  const content = PLAN_CONTENT[key];

  useEffect(() => {
    if (content) track({ kind: "plan_page_viewed", plan: key });
  }, [content, key]);

  // Unknown plan slug → send them home rather than a dead page.
  if (!content) return <Navigate to="/" replace />;

  return (
    <GameBackground>
      <div className="relative z-10 min-h-screen px-4 py-10">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <div className="mx-auto max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brightboost-navy hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="mt-4 rounded-[18px] border-2 border-[#46B1E6]/20 bg-white p-6 shadow-sm">
            <span className="inline-flex w-fit rounded-full bg-[#69D681]/25 px-3 py-1 text-xs font-bold text-brightboost-navy">
              Always Free
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-brightboost-navy">
              {content.title}
            </h1>
            <p className="mt-1 font-medium text-brightboost-navy/80">
              {content.tagline}
            </p>

            <ul className="mt-4 space-y-2">
              {content.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 font-medium text-brightboost-navy/90"
                >
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#69D681]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to={content.primary.to}
                onClick={() =>
                  track({
                    kind: "plan_cta_clicked",
                    plan: key,
                    cta: content.primary.cta,
                  })
                }
                className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-brightboost-navy px-5 py-2.5 text-sm font-extrabold text-white hover:brightness-110"
              >
                {content.primary.label} →
              </Link>
              <Link
                to={content.secondary.to}
                onClick={() =>
                  track({
                    kind: "plan_cta_clicked",
                    plan: key,
                    cta: content.secondary.cta,
                  })
                }
                className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border-2 border-brightboost-navy px-5 py-2.5 text-sm font-extrabold text-brightboost-navy hover:bg-brightboost-navy/5"
              >
                {content.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </GameBackground>
  );
}
