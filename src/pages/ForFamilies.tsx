/**
 * `/for-families` — the public family landing, and the page the nonprofit site
 * links a family into.
 *
 * Two product truths shape it, and both come from the application rather than
 * from taste:
 *
 *  1. **There is no K–2 self-registration.** `/student/signup` exists for
 *     self-registering students and is explicitly not the K–2 path; K–2 signs
 *     in with a class code and a picture (plus an optional PIN) at
 *     `/class-login`, and `/student-login` is the chooser. So the page offers
 *     an adult two doors and says plainly that a young child cannot open
 *     either alone.
 *  2. **"Create a home group" is a real destination.** `/parents` already
 *     links it at `/teacher/signup?intent=home` (`TeacherSignup.tsx` reads
 *     `intent === "home"`). This page points at the same place rather than
 *     inventing a family account type.
 *
 * Like the teacher landing it never re-asks the role, and `source` is a single
 * exact literal comparison whose raw value never reaches the DOM and is never
 * forwarded onto any destination — `intent=home` is constructed here.
 *
 * No giving link: the footer's `giving` prop is left at its default.
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

const CARD_CLASS =
  "flex flex-col rounded-[var(--bb-radius-lg)] border border-[color:var(--bb-color-border)] bg-[color:var(--bb-color-surface-raised)] p-5";

const ForFamilies = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const lang = useRenderedLanguage();

  /** Exact literal match; anything else behaves as a direct entry. */
  const fromNonprofit = searchParams.get("source") === "nonprofit";

  usePublicPageMeta(
    t("forFamilies.meta.title"),
    t("forFamilies.meta.description"),
    lang,
  );

  const fits = ["classroom", "afterschool", "home"] as const;

  return (
    <div className="bb-public flex min-h-screen flex-col bg-white text-[color:var(--bb-color-text)]">
      <PublicHeader
        label={t("forFamilies.nav.label")}
        renderedLanguage={lang}
      />

      <main className="flex-1">
        <section style={PUBLIC_SKY_BAND}>
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-12">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[color:var(--bb-color-text-muted)]">
              {fromNonprofit
                ? t("publicChrome.fromNonprofit")
                : t("forFamilies.eyebrow")}
            </p>

            <h1 className="mt-2 max-w-[22ch] text-[clamp(1.875rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.01em]">
              {t("forFamilies.headline")}
            </h1>

            <p className="mt-4 max-w-[62ch] text-lg leading-[1.65]">
              {t("forFamilies.lede")}
            </p>

            {/* The two doors, immediately under the opening. */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className={CARD_CLASS}>
                <h2 className="text-xl font-extrabold">
                  {t("forFamilies.atSchoolTitle")}
                </h2>
                <p className="mt-2 flex-1">{t("forFamilies.atSchoolBody")}</p>
                <div className="mt-4 flex flex-col items-start gap-2 border-t border-[color:var(--bb-color-border)] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link to="/class-login" className={PUBLIC_ACTION_PRIMARY}>
                    {t("parents.cta.join")}
                  </Link>
                  <Link
                    to="/student-login"
                    className={PUBLIC_ACTION_QUIET}
                    onClick={() =>
                      track({ kind: "signup_clicked", audience: "student" })
                    }
                  >
                    {t("forFamilies.atSchoolCta")}
                  </Link>
                </div>
              </article>

              <article className={CARD_CLASS}>
                <h2 className="text-xl font-extrabold">
                  {t("forFamilies.homeTitle")}
                </h2>
                <p className="mt-2 flex-1">{t("forFamilies.homeBody")}</p>
                <div className="mt-4 flex flex-col items-start gap-2 border-t border-[color:var(--bb-color-border)] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                  {/* The literal supported home-setup entry. `intent=home` is
                      constructed here; nothing from the incoming query string
                      is forwarded. */}
                  <Link
                    to="/teacher/signup?intent=home"
                    className={PUBLIC_ACTION_PRIMARY}
                  >
                    {t("forFamilies.homeCta")}
                  </Link>
                </div>
              </article>
            </div>

            {/* A fact a parent has to know, not an aside. */}
            <p
              role="note"
              className="mt-4 max-w-[62ch] rounded-[var(--bb-radius-md)] border border-[color:var(--bb-color-warn-border)] bg-[color:var(--bb-color-warn-soft)] px-4 py-3 text-[color:var(--bb-color-warn-text)]"
            >
              {t("forFamilies.noSelfSignup")}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="for-families-guide-heading"
          className="mx-auto max-w-6xl px-5 py-10 sm:px-6"
        >
          <span
            aria-hidden="true"
            className="block h-1 w-12 rounded-full bg-brightboost-yellow"
          />
          <h2
            id="for-families-guide-heading"
            className="mt-3 text-2xl font-extrabold"
          >
            {t("forFamilies.guideTitle")}
          </h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed">
            {t("forFamilies.guideBody")}
          </p>
          <p className="mt-4">
            {/* Fires nothing. `parent_page_clicked` counts a visitor choosing
                the family path, and the homepage's "Family paths" card already
                counted that for anyone who arrived here through it — firing
                again on the guide link would double-count the same journey.
                There is no existing kind for "opened the family guide", so that
                is a recorded gap rather than a new event. */}
            <Link to="/parents" className={PUBLIC_ACTION_SECONDARY}>
              {t("forFamilies.guideCta")}
            </Link>
          </p>
        </section>

        <section
          aria-labelledby="for-families-fits-heading"
          className="bg-[color:var(--bb-color-surface-sunken)]"
        >
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
            <span
              aria-hidden="true"
              className="block h-1 w-12 rounded-full bg-brightboost-yellow"
            />
            <h2
              id="for-families-fits-heading"
              className="mt-3 text-2xl font-extrabold"
            >
              {t("parents.fits.title")}
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              {fits.map((key) => (
                <div
                  key={key}
                  className="border-t-2 border-brightboost-yellow pt-3"
                >
                  <h3 className="text-xl font-extrabold">
                    {t(`parents.fits.${key}.title`)}
                  </h3>
                  <p className="mt-1 leading-relaxed">
                    {t(`parents.fits.${key}.desc`)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6">
              <Link to="/try" className={PUBLIC_ACTION_SECONDARY}>
                {t("parents.cta.demo")}
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* `giving` deliberately omitted: no fundraising on a family surface. */}
      <PublicFooter />
    </div>
  );
};

export default ForFamilies;
