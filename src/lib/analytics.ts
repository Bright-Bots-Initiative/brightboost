/**
 * Frontend analytics shim — backed by PostHog when VITE_POSTHOG_KEY is set,
 * otherwise a silent no-op so local dev runs cleanly without a key.
 *
 * ANALYTICS PRIVACY RULES (K-8 product — COPPA-conscious)
 * - distinct_id is ALWAYS the database user ID, never email/name/PII
 * - Session recordings mask all inputs and text
 * - Never track free-text content (homework, names, messages)
 * - Track behavior (events, counts, timings), not content
 * - When adding events, pass IDs and enums, not personal data
 *
 * Two call styles coexist:
 *   - track({ kind: "homepage_viewed" })            // typed discriminated union
 *   - trackEvent("custom_funnel_event", { ... })   // free-form (rare; prefer typed)
 *
 * The typed API is preferred for everything that the funnel cares about so
 * the compiler catches typos in event names.
 */
import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

export type AnalyticsRole = "teacher" | "student" | "parent" | "admin";
export type GradeBand = "k2" | "g3_5" | "g6_8";
export type SignupMethod = "email" | "class_code" | "cohort_code";
export type JoinMethod = "class_code" | "cohort_code";

export type AnalyticsEvent =
  // Legacy homepage / marketing events (pre-existing, no-op before PostHog)
  | { kind: "quest_start"; questId: string }
  | { kind: "quest_complete"; questId: string; attempts: number }
  | { kind: "quiz_answer"; questionId: string; isCorrect: boolean }
  | { kind: "homepage_viewed" }
  | { kind: "signup_clicked"; audience: "teacher" | "student" }
  | { kind: "feedback_clicked" }
  | { kind: "donation_clicked"; cadence?: "monthly" }
  | { kind: "student_page_clicked" }
  | { kind: "teacher_page_clicked" }
  | { kind: "parent_page_clicked" }
  | { kind: "organization_page_clicked" }
  | { kind: "free_plan_clicked"; plan: string }
  | { kind: "feedback_submitted"; audience: "teacher" | "student" | "parent" | "org" }
  // Funnel events (see docs/analytics.md)
  | { kind: "account_registered"; role: AnalyticsRole; signup_method: SignupMethod }
  | { kind: "login"; role: AnalyticsRole }
  | { kind: "class_created"; class_id: string; grade_band?: string }
  | {
      kind: "student_joined_class";
      class_id: string;
      join_method: JoinMethod;
    }
  | {
      kind: "game_started";
      game_id: string;
      module_slug?: string;
      activity_id?: string;
      grade_band?: string;
    }
  | {
      kind: "game_completed";
      game_id: string;
      module_slug?: string;
      activity_id?: string;
      score?: number;
      time_spent_seconds?: number;
      quiz_score?: number;
      grade_band?: string;
    }
  | { kind: "signup_role_selected"; role: "teacher" | "student" }
  // Public /try demo funnel (anonymous visitors — no identify call; PostHog
  // stitches the anonymous session to the user on later signup)
  | { kind: "demo_page_viewed"; source: "direct" }
  | { kind: "demo_game_started"; game_id: string }
  | {
      kind: "demo_game_completed";
      game_id: string;
      score: number;
      stars: number;
      time_spent_seconds: number;
    }
  | { kind: "demo_replayed"; game_id: string }
  | {
      kind: "demo_signup_cta_clicked";
      placement: "results" | "hero_teacher_whisper";
    }
  // Free Access Plans detail pages (/plans/:plan)
  | { kind: "plan_page_viewed"; plan: string }
  | { kind: "plan_cta_clicked"; plan: string; cta: string };

let initialized = false;

function disabled(): boolean {
  return !POSTHOG_KEY || !initialized;
}

export function initAnalytics(): void {
  if (initialized) return;
  if (!POSTHOG_KEY) {
    // Use warn (not info) so prod consoles surface the disabled state
    // clearly — silent no-ops are the #1 PostHog-not-firing failure mode.
    // The message names the env var so the cause is obvious to operators.
    console.warn(
      "[analytics] DISABLED — VITE_POSTHOG_KEY is not present in the built bundle. " +
        "If you expect analytics to work here: confirm Railway has VITE_POSTHOG_KEY set " +
        "on the FRONTEND service and that Dockerfile.frontend forwards it as a build ARG, " +
        "then trigger a clean rebuild (Vite inlines VITE_* at build time, not runtime).",
    );
    return;
  }

  // Surface a single distinguishable line at init so a prod operator can
  // tell the difference between "no key" and "key present, loading":
  //   - missing key: [analytics] DISABLED — ...
  //   - present:     [analytics] Initializing PostHog → <host>
  //   - loaded:      [analytics] PostHog ready (events will flow)
  console.info(`[analytics] Initializing PostHog → ${POSTHOG_HOST}`);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // We track explicit funnel events ourselves, not every DOM interaction.
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    // Session replay is on, but the masking config below keeps it safe for
    // a children's product — no input values, no rendered text.
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    persistence: "localStorage",
    loaded: () => {
      initialized = true;
      console.info("[analytics] PostHog ready (events will flow)");
    },
  });
}

/** Bind subsequent events to a real user. Use the DB user id, never email. */
export function identifyUser(
  userId: string,
  role: AnalyticsRole,
  props: Record<string, unknown> = {},
): void {
  if (disabled()) return;
  posthog.identify(userId, { role, ...props });
}

/** Clear the identified user on logout. */
export function resetAnalytics(): void {
  if (disabled()) return;
  posthog.reset();
}

/**
 * Track a typed analytics event. Use this for everything the funnel needs
 * to count — the discriminated union forces consistent event naming.
 */
export function track(event: AnalyticsEvent): void {
  if (disabled()) return;
  const { kind, ...props } = event;
  posthog.capture(kind, props);
}

/**
 * Free-form event escape hatch. Prefer `track()` with a typed event. Use
 * this only for one-offs that don't deserve their own union member.
 */
export function trackEvent(
  event: string,
  props: Record<string, unknown> = {},
): void {
  if (disabled()) return;
  posthog.capture(event, props);
}
