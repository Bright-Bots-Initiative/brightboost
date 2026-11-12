/**
 * `/for-teachers` — the public teacher landing, and the page the nonprofit
 * site links a teacher into.
 *
 * The handoff contract, made literal: it never asks the role again. A visitor
 * arriving with `?source=nonprofit` already answered that question on the
 * other property, and asking twice is the failure this page exists to avoid.
 * So `source` is presentation context and nothing else — a single exact
 * literal comparison produces a boolean, and only the boolean crosses into
 * render. The raw value is never echoed, never forwarded and never measured.
 *
 * The actions sit above the explanation on purpose: a teacher who has already
 * decided should not have to scroll past setup instructions for an account
 * they have not created. The setup steps below are the product's own
 * `teacher.getStarted.*` strings, so the page cannot promise a flow that
 * differs from the one a teacher actually meets.
 */
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/home/PublicHeader";
import PublicFooter from "@/components/home/PublicFooter";
import {
  PUBLIC_ACTION_PRIMARY,
  PUBLIC_ACTION_QUIET,
  PUBLIC_ACTION_SECONDARY,
  PUBLIC_SKY_BAND,
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";
import { track } from "@/lib/analytics";
import "@/styles/public-entry.css";

const ForTeachers = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const lang = useRenderedLanguage();

  /** Exact literal match. Anything else — including `?source=` — is a direct
   *  entry, and the value itself never reaches the DOM. */
  const fromNonprofit = searchParams.get("source") === "nonprofit";

  usePublicPageMeta(
    t("forTeachers.meta.title"),
    t("forTeachers.meta.description"),
    lang,
  );

  const steps = [
    t("teacher.getStarted.step1"),
    t("teacher.getStarted.step2"),
    t("teacher.getStarted.step3"),
    // Step 4 is this page's own string rather than the shared
    // `teacher.getStarted.step4`, which reads "on this dashboard" — true where
    // it ships (inside the teacher dashboard) and false on a public page where
    // no dashboard is present.
    t("forTeachers.step4"),
  ];

  return (
    <div className="bb-public flex min-h-screen flex-col bg-white text-[color:var(--bb-color-text)]">
      <PublicHeader
        label={t("forTeachers.nav.label")}
        renderedLanguage={lang}
      />

      <main className="flex-1">
        <section style={PUBLIC_SKY_BAND}>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-12">
            {/* Context, not an announcement: one quiet line, and only when the
                visitor actually arrived from the other property. */}
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[color:var(--bb-color-text-muted)]">
              {fromNonprofit
                ? t("publicChrome.fromNonprofit")
                : t("forTeachers.eyebrow")}
            </p>

            <h1 className="mt-2 max-w-[20ch] text-[clamp(1.875rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.01em]">
              {t("forTeachers.headline")}
            </h1>

            <p className="mt-4 max-w-[62ch] text-lg leading-[1.65]">
              {t("forTeachers.lede")}
            </p>

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/teacher/signup"
                className={PUBLIC_ACTION_PRIMARY}
                onClick={() =>
                  track({ kind: "signup_clicked", audience: "teacher" })
                }
              >
                {t("forTeachers.newAccount")}
              </Link>
              <Link to="/try" className={PUBLIC_ACTION_SECONDARY}>
                {t("forTeachers.tryCta")}
              </Link>
            </div>

            <p className="mt-3 max-w-[62ch] text-sm text-[color:var(--bb-color-text-muted)]">
              {t("forTeachers.tryHelp")}
            </p>

            <p className="mt-4">
              <Link to="/teacher-login" className={PUBLIC_ACTION_QUIET}>
                {t("forTeachers.existingAccount")}
              </Link>
            </p>
          </div>
        </section>

        {/* The steps describe what happens after the account exists, so they
            sit below the action that creates it. */}
        <section
          aria-labelledby="for-teachers-first-heading"
          className="mx-auto max-w-6xl px-5 py-10 sm:px-6"
        >
          <span
            aria-hidden="true"
            className="block h-1 w-12 rounded-full bg-brightboost-yellow"
          />
          <h2
            id="for-teachers-first-heading"
            className="mt-3 text-2xl font-extrabold"
          >
            {t("forTeachers.firstTitle")}
          </h2>
          <ol className="mt-4 max-w-[62ch] list-decimal space-y-2 pl-6 leading-relaxed marker:font-bold marker:text-[color:var(--bb-coral-deep)]">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </main>

      <PublicFooter giving />
    </div>
  );
};

export default ForTeachers;
