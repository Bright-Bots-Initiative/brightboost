/**
 * `/` — the Bright Boost homepage.
 *
 * Three groups, in this order: the hero, which contains the real game; the
 * role panel, where an adult picks their own path; and access, which says who
 * today's activities are for and links the free plans. Nothing else earns a
 * band.
 *
 * The hero's second column is the GAME, not a picture of it. It is one
 * instance of the shipped `TankTrekGame` running the same `DEMO_CONFIG` as
 * `/try` (`src/components/home/PublicDemo.tsx`), loaded after the first paint
 * and mounted with `publicDemo`, so a visitor plays three real mazes here
 * without an account and without the page ever calling the API. A screenshot
 * of a game is a claim about a game; this is the game.
 *
 * What this page deliberately no longer carries, and why each is a decision
 * rather than an omission:
 *
 *  - **the hero screenshot** — replaced by the playable panel;
 *  - **"See what learning looks like"** (a second game, as a still) — one
 *    playable game says more than two pictures, and Rhyme Ride is still in the
 *    authenticated learning surface, where it is played rather than pictured;
 *  - **"Built differently for different ages"** — two columns of bullets and a
 *    grades 6–8 paragraph, collapsed into the one availability line in the
 *    access group. Saying nothing about grades 6–8 claims nothing about them;
 *  - **the teacher/family cards** — replaced by the role panel, which asks the
 *    question once and then shows one audience's actions;
 *  - **the three-competing-CTA hero**, the Early Access Goal, the Free Access
 *    Plans grid, the audience-card grid, the in-page feedback form and the
 *    donation module — removed earlier in this slice, for the reasons recorded
 *    in `docs/brand-refresh/rebrand-slice-1.md`.
 *
 * `index.html` ships title, description, Open Graph, Twitter and canonical
 * metadata before JavaScript. Keep its English title/description byte-identical
 * to `home.meta.title` / `home.meta.description`. `usePublicPageMeta` updates
 * those same nodes after hydration, including language and route changes, and
 * restores the static defaults on unmount. Only JSON-LD is added here after
 * hydration and removed on unmount. Change the static and locale copy together.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/home/PublicHeader";
import PublicFooter from "@/components/home/PublicFooter";
import PublicDemo from "@/components/home/PublicDemo";
import RolePanel from "@/components/home/RolePanel";
import {
  PUBLIC_ACTION_QUIET,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SKY_BAND,
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";
import { track } from "@/lib/analytics";
import "@/styles/public-entry.css";

const JSON_LD_ID = "bb-home-schema";

/**
 * The legacy one-shot handoff the deleted `HomeSectionRedirect` used to write.
 * `/donate` and `/feedback` are real pages now, so a stored value can only
 * come from a tab opened before this change; it is read once, cleared
 * immediately, and acted on only for the exact values below.
 */
const LEGACY_KEY = "bb-home-scroll";
const LEGACY_DONATION = "donation";
const LEGACY_FEEDBACK = "feedback";

/**
 * Fragments this page scrolls to itself. A browser only scrolls to a fragment
 * that exists in the document it just parsed, and this document is empty until
 * React renders — so on a direct load of `/#plans` or `/#for-adults` the
 * browser finds nothing and the page opens at the top. Both are handled here.
 */
const SCROLL_TARGETS = ["plans", "for-adults"] as const;

const PLANS = [
  { slug: "learner", key: "home.adults.planLearner" },
  { slug: "classroom", key: "home.adults.planClassroom" },
  { slug: "organization", key: "home.adults.planOrganization" },
] as const;

const HOW_IT_WORKS = [
  "home.howItWorks.point1",
  "home.howItWorks.point2",
  "home.howItWorks.point3",
] as const;

const Index = () => {
  const [demoBand, setDemoBand] = useState<"k2" | "g3_5">("k2");
  const { t } = useTranslation();
  const lang = useRenderedLanguage();
  const navigate = useNavigate();
  const { hash } = useLocation();

  const title = t("home.meta.title");
  const description = t("home.meta.description");

  usePublicPageMeta(title, description, lang);

  useEffect(() => {
    track({ kind: "homepage_viewed" });
  }, []);

  /* ---- Organization JSON-LD -----------------------------------------------
   *
   * The structured data says exactly two things that are true and checkable:
   * Bright Boost is an organization, and it is part of Bright Bots Initiative.
   * It does NOT carry a `url` for the nonprofit — this origin is the product's,
   * not the nonprofit's, and no verified address for the nonprofit exists in
   * this repository — and it claims no educational level, rating, outcome or
   * aggregate. Everything here is removed or restored on unmount. */
  useEffect(() => {
    document.getElementById(JSON_LD_ID)?.remove();
    const schema = document.createElement("script");
    schema.id = JSON_LD_ID;
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Bright Boost",
      url: `${PUBLIC_SITE_ORIGIN}/`,
      parentOrganization: {
        "@type": "Organization",
        name: "Bright Bots Initiative",
      },
    });
    document.head.appendChild(schema);
    return () => schema.remove();
  }, []);

  /* ---- Fragment and one-shot storage handling ------------------------------
   *
   * Two jobs: `/#donation` and `/#feedback` used to be homepage sections and
   * are pages now, so they redirect; `#plans` and `#for-adults` are anchors in
   * this document, which the browser cannot reach on a direct load because the
   * document is empty until React renders.
   *
   * Three rules keep it from looping: it runs ONCE per mount (never on a later
   * client navigation, never on a hash change), the stored value is removed
   * before it is acted on, and only the exact values above do anything at all.
   * Every other value — and every other hash — is left alone.
   *
   * The scroll itself gets three bounded follow-ups, and no more. A scroll
   * computed on the first frame is computed against a layout that is not final:
   * the web font swaps in, the text above the target reflows, and the demo
   * panel's reserved box is replaced by the slightly taller briefing. So the
   * same `scrollIntoView` runs again when `document.fonts.ready` resolves,
   * again on `load` if the document has not finished loading, and once more
   * when the panel reports that the game is on screen. Each fires at most once
   * and is then finished — no MutationObserver, no ResizeObserver, no polling,
   * no timeout. The jump is instant (see `settleLegacyTarget`).
   * `scroll-margin-top` on the targets
   * (`src/styles/public-entry.css`) keeps the result clear of the sticky
   * header. */
  const legacyHandled = useRef(false);
  /** The landing this mount owes, if any, and the two one-shot latches that
   *  keep the after-the-demo correction to exactly one run. */
  const legacyTarget = useRef<string | null>(null);
  const demoReady = useRef(false);
  const readySettled = useRef(false);

  /**
   * `behavior: "auto"`, always. A smooth programmatic scroll is an animation,
   * and Chromium cancels it when the layout changes underneath — which is
   * exactly what the lazy demo panel does a few hundred milliseconds in, so a
   * `/#plans` load could finish at 7px instead of the document end. An instant
   * jump is also what a native fragment navigation does, and what reduced
   * motion was already getting.
   */
  const settleLegacyTarget = useCallback(() => {
    const target = legacyTarget.current;
    if (!target) return;
    // `?.` and nothing else: after an unmount the element is gone and this is
    // a no-op, which is why no follow-up needs tearing down.
    document
      .getElementById(target)
      ?.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  /**
   * The demo panel reserves its box before the game arrives, and the real
   * briefing is a few pixels taller than the reservation — enough to leave a
   * landing computed before the swap slightly short. This re-runs the same
   * settle once, and only when this mount actually owed a landing.
   */
  const settleAfterDemoReady = useCallback(() => {
    if (readySettled.current) return;
    if (!demoReady.current || !legacyTarget.current) return;
    readySettled.current = true;
    settleLegacyTarget();
  }, [settleLegacyTarget]);

  const handleDemoReady = useCallback(() => {
    demoReady.current = true;
    settleAfterDemoReady();
  }, [settleAfterDemoReady]);

  useEffect(() => {
    if (legacyHandled.current) return;
    legacyHandled.current = true;

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(LEGACY_KEY);
      if (stored !== null) sessionStorage.removeItem(LEGACY_KEY);
    } catch {
      stored = null;
    }

    const target = stored ?? (hash ? hash.replace(/^#/, "") : null);
    if (target === LEGACY_DONATION) {
      navigate("/donate", { replace: true });
      return;
    }
    if (target === LEGACY_FEEDBACK) {
      navigate("/feedback", { replace: true });
      return;
    }
    if (
      target !== null &&
      (SCROLL_TARGETS as readonly string[]).includes(target)
    ) {
      legacyTarget.current = target;
      const settle = settleLegacyTarget;

      requestAnimationFrame(settle);

      const fonts: { ready?: Promise<unknown> } | undefined = document.fonts;
      if (fonts?.ready) void fonts.ready.then(settle, () => {});
      // A guard for the case where this component mounts BEFORE the document
      // finishes loading, not a fix for anything on this page: `!== "complete"`
      // rather than `=== "loading"` because by the time an effect runs the
      // document is usually already `"interactive"`, and testing for
      // `"loading"` would attach the listener essentially never.
      //
      // In THIS app it does not fire at all. `src/main.tsx` renders inside
      // `import("./i18n").then(...)`, so React mounts after `load` (measured on
      // the release build: `load` at 81-145ms, first `#root` child at
      // 88-163ms) and `readyState` is already `"complete"` here. The reload
      // that used to land 104px short was a geometry problem in the hero
      // screenshot (gone now; the demo panel reserves its box before the game
      // chunk arrives) — not a missing `load` listener.
      if (document.readyState !== "complete") {
        window.addEventListener("load", settle, { once: true });
      }

      // The panel usually reports ready long after this effect; when it has
      // already done so, the correction belongs here instead. Either way it
      // runs at most once.
      settleAfterDemoReady();
    }
    // Anything else is ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bb-public flex min-h-screen flex-col bg-white text-[color:var(--bb-color-text)]">
      <PublicHeader renderedLanguage={lang} />

      <main className="flex-1">
        {/* ── Hero · the intro and the game ──────────────────────────────
            Two columns from `lg` (1024px) only. At 768px the previous
            `md:grid-cols-2` squeezed the game into a ~250px column with
            miniature controls, so below 1024px the intro stacks above a
            full-width panel instead. There is ONE panel either way — the
            column span moves it; nothing renders it twice. */}
        <section
          id="hero"
          aria-labelledby="hero-heading"
          style={PUBLIC_SKY_BAND}
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:py-10">
            {/* Three grid children, in the order a phone reads them: what the
                page is, then the game, then the two things an adult wants
                after seeing it. From `lg` the panel spans both rows on the
                right and the two intro blocks stack on the left, so the
                desktop column is unchanged while the stacked layout no longer
                pushes Start Mission a screen and a half down.

                `min-w-0` on every child: a grid item is floored at its
                min-content width unless it is told otherwise, so one
                unbreakable label could make the column — and the page — wider
                than the screen. It reflows instead. */}
            <div className="flex min-w-0 flex-col [container-type:inline-size] lg:col-span-5 lg:row-start-1">
              {/* A rounded box, not a pill: at 320px the label needs two
                  lines, and a pill with a wrapped label reads as a mistake. */}
              <p className="bb-eyebrow">{t("home.eyebrow")}</p>

              {/* The tagline is a DISPLAY LINE, not the heading. Three
                  abstract verbs tell a first-time visitor, a screen reader and
                  a crawler nothing about what this is or who it serves, so the
                  heading carries the meaning and is sized above it. */}
              <p className="mt-4 text-[clamp(1.25rem,1.2vw+0.8rem,1.625rem)] font-extrabold leading-tight tracking-[-0.01em] text-[color:var(--bb-coral-deep)]">
                {t("home.displayLine")}
              </p>
              <h1
                id="hero-heading"
                // Desktop type follows this grid column, not the viewport.
                // Spanish needs more room per line. The 1.65rem floor stays
                // above the display line's 1.625rem ceiling; mobile can wrap.
                className={
                  "mt-1 text-[clamp(1.65rem,4vw,3.4rem)] font-extrabold leading-[1.07] tracking-[-0.035em] " +
                  (lang === "es"
                    ? "lg:text-[clamp(1.65rem,7.2cqw,3.4rem)]"
                    : "lg:text-[clamp(1.65rem,10.8cqw,3.4rem)]")
                }
              >
                <span className="block lg:whitespace-nowrap">
                  {t("home.h1First")}
                </span>{" "}
                <span className="block lg:whitespace-nowrap">
                  {t("home.h1Second")}
                </span>
              </h1>
              <p className="mt-4 max-w-[62ch] text-lg leading-[1.65]">
                {t("home.heroSentence")}
              </p>
            </div>

            <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
              <PublicDemo
                onReady={handleDemoReady}
                onBandChange={setDemoBand}
              />
              <p className="mt-3 text-center">
                <Link
                  to={demoBand === "g3_5" ? "/try?band=g3_5" : "/try"}
                  className={PUBLIC_ACTION_QUIET}
                >
                  {t("home.demo.fullScreen")}
                </Link>
              </p>
            </div>

            {/* Below the panel on one column, under the intro on two.
                `self-start` keeps it directly beneath the sentence instead of
                being stretched down the height of the game beside it. */}
            <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start">
              {/* One disclosure, native, for the three things an adult asks
                  before letting a child tap something. Nothing needed to
                  navigate this page is inside it. */}
              <details className="bb-disclosure">
                <summary>{t("home.howItWorks.summary")}</summary>
                <ul className="m-0 mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                  {HOW_IT_WORKS.map((key) => (
                    <li key={key}>{t(key)}</li>
                  ))}
                </ul>
              </details>

              <p className="mt-5">
                <a href="#for-adults" className={PUBLIC_ACTION_QUIET}>
                  {t("home.secondaryCta")}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── For your classroom or family ─────────────────────────────── */}
        <RolePanel />

        {/* ── Access · who it is for today, and the free plans ─────────── */}
        <section
          id="access"
          aria-labelledby="access-heading"
          className="mx-auto max-w-6xl px-5 py-10 sm:px-6"
        >
          <h2
            id="access-heading"
            className="text-2xl font-extrabold md:text-3xl"
          >
            {t("home.access.title")}
          </h2>
          <p className="mt-2 max-w-[62ch] leading-relaxed">
            {t("home.access.availability")}
          </p>

          <div
            aria-label={t("home.bands.heading")}
            className="mt-5 grid gap-3 sm:grid-cols-3"
          >
            {(["k2", "g35", "g68"] as const).map((band) => (
              <div
                key={band}
                className={
                  "bb-grade-card" + (band === "g68" ? " is-upcoming" : "")
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="m-0 text-lg font-extrabold">
                    {t("home.bands." + band)}
                  </h3>
                  <span className="bb-grade-status">
                    {t(
                      band === "g68"
                        ? "home.bands.coming"
                        : "home.bands.available",
                    )}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  {t("home.bands." + band + "Description")}
                </p>
              </div>
            ))}
          </div>

          {/* The compact plans entry. `id="plans"` is also what the legacy
              `/#plans` fragment and the stored handoff scroll to. */}
          <div id="plans" className="mt-6">
            <h3 className="text-xl font-extrabold">
              {t("home.adults.plansTitle")}
            </h3>
            <p className="mt-1 max-w-[62ch] leading-relaxed">
              {t("home.adults.plansBody")}
            </p>
            <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-4 p-0">
              {PLANS.map((plan) => (
                <li key={plan.slug}>
                  <Link
                    to={`/plans/${plan.slug}`}
                    className={PUBLIC_ACTION_QUIET}
                    onClick={() =>
                      track({ kind: "free_plan_clicked", plan: plan.slug })
                    }
                  >
                    {t(plan.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <PublicFooter giving />
    </div>
  );
};

export default Index;
