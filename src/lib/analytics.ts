/**
 * Frontend analytics shim — backed by PostHog when VITE_POSTHOG_KEY is set,
 * otherwise a silent no-op so local dev runs cleanly without a key.
 *
 * ANALYTICS PRIVACY RULES (K-8 product — COPPA-conscious)
 * - Anonymous events use a browser ID; identified events use the DB user ID
 * - Never identify with an email or name
 * - Replay is off until a teacher/admin is identified; students are never recorded
 * - Permitted recordings mask inputs/text; console capture and heatmaps are off
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
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/** An ingestion origin, never a dashboard URL or a value safe to echo raw. */
function resolvePostHogHost(): string {
  const raw = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
  if (!raw) return DEFAULT_POSTHOG_HOST;
  try {
    const url = new URL(raw);
    // Check the original shape too: URL parsing erases empty ?/# delimiters
    // and dot paths. A root slash is harmless; any other path is not an origin.
    if (
      /^https:\/\/[^/?#\\\s]+\/?$/i.test(raw) &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    ) {
      return url.origin;
    }
  } catch {
    // Do not log the parser error: it can include the rejected input.
  }
  console.warn(
    "[analytics] Invalid VITE_POSTHOG_HOST; using the default ingestion host.",
  );
  return DEFAULT_POSTHOG_HOST;
}

export type AnalyticsRole = "teacher" | "student" | "parent" | "admin";
export type GradeBand = "k2" | "g3_5" | "g6_8";
export type SignupMethod = "email" | "class_code" | "cohort_code";
export type JoinMethod = "class_code" | "cohort_code";
/**
 * Banded expression of the Safe Exploration controls (#838). Narrower than
 * `GradeBand` on purpose: those controls only distinguish K–2 from everyone
 * older. Mirrors `SafeExplorationBand` in
 * `src/components/games/shared/safeExploration/types.ts`.
 */
export type ExplorationBand = "k2" | "older";

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
  | {
      kind: "feedback_submitted";
      audience: "teacher" | "student" | "parent" | "org";
    }
  // Funnel events (see docs/analytics.md)
  | {
      kind: "account_registered";
      role: AnalyticsRole;
      signup_method: SignupMethod;
    }
  | { kind: "login"; role: AnalyticsRole }
  | {
      kind: "class_created";
      class_id: string;
      grade_band?: string;
      group_kind?: "class" | "home";
    }
  | {
      kind: "student_joined_class";
      class_id: string;
      join_method: JoinMethod;
    }
  | {
      kind: "game_started";
      attempt_id: string;
      game_id: string;
      module_slug?: string;
      activity_id?: string;
      grade_band?: string;
    }
  | { kind: "pvp_match_started"; game_id: "spacewar_pvp" }
  | {
      kind: "pvp_match_completed";
      game_id: "spacewar_pvp";
      score?: number;
      time_spent_seconds: number;
    }
  | {
      kind: "quiz_question_answered";
      module_slug?: string;
      activity_id?: string;
      grade_band?: string;
      question_id: string;
      question_index: number;
      correct: boolean;
      quiz_variant: "instant";
    }
  | { kind: "signup_role_selected"; role: "teacher" | "student" | "parent" }
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
  | { kind: "plan_cta_clicked"; plan: string; cta: string }
  // Safe Exploration controls (#838). These describe *process* — what the
  // learner previewed, tried, kept, or undid — and deliberately carry no
  // score, mastery, accuracy, or correctness signal. `attempt` counts runs on
  // the surface (a revision measure, principle 9), not performance.
  | {
      kind:
        | "experiment_previewed"
        | "experiment_tried"
        | "experiment_kept"
        | "experiment_restored"
        | "experiment_branched";
      surface_id: string;
      band: ExplorationBand;
      attempt: number;
    }
  | {
      // Keeps an infrastructure failure countable and distinct from a learner
      // outcome (Safe Exploration accessibility contract §6) rather than
      // silently swallowed.
      kind: "experiment_failed";
      surface_id: string;
      band: ExplorationBand;
      attempt: number;
      error_kind: "recoverable" | "unexpected";
    }
  // Guided choice on the Modules page (#842). Process only: which of the four
  // navigation choices a learner reached for, and — for the surprise — which
  // destination was disclosed and whether they took it. No score, mastery,
  // accuracy, XP or unlock signal rides on these, because principle 9 forbids
  // chance from touching any of those; `reroll_count` and the seed parts are
  // here so a disclosed pick can be reproduced exactly (contract §5), not to
  // rank anyone.
  | {
      kind:
        | "guided_alternatives_opened"
        | "guided_revisit_opened"
        | "guided_surprise_cancelled";
      /** How many destinations the eligibility resolver offered. */
      pool_size: number;
    }
  | {
      kind:
        | "guided_surprise_offered"
        | "guided_surprise_accepted"
        | "guided_surprise_rerolled";
      /** The disclosed destination. Content identity, not a learner outcome. */
      module_slug: string;
      /** Why it was offerable — progression, or a teacher's assignment. */
      why_available: "progression" | "teacher_assignment";
      pool_size: number;
      /** Seed parts, so the pick is reproducible. No learner PII beyond the id. */
      reroll_count: number;
      date_bucket: string;
    }
  | {
      // The pool was empty: nothing new to offer right now. Distinct from a
      // cancel, and distinct from a failure — it is a legitimate, safe state.
      kind: "guided_surprise_empty";
    };

let initialized = false;
let initializationRequested = false;
type Identity = {
  userId: string;
  role: AnalyticsRole;
  props: Record<string, unknown>;
};
let pendingIdentity: Identity | null = null;
let pendingReset = false;

function applyIdentity({ userId, role, props }: Identity): void {
  const mayRecord = role === "teacher" || role === "admin";
  // Stop before identifying a child, including a teacher → student transition
  // on a shared device. Extra properties cannot override the role argument.
  if (!mayRecord) posthog.stopSessionRecording();
  posthog.identify(userId, { ...props, role });
  if (mayRecord) posthog.startSessionRecording();
}

function disabled(): boolean {
  return !POSTHOG_KEY || !initialized;
}

export function initAnalytics(): void {
  if (initializationRequested) return;
  initializationRequested = true;
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
  const host = resolvePostHogHost();
  console.info(`[analytics] Initializing PostHog → ${host}`);

  posthog.init(POSTHOG_KEY, {
    api_host: host,
    // We track explicit funnel events ourselves, not every DOM interaction.
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    // Checked against posthog-js 1.379.3's installed PostHogConfig types.
    // Client settings override remotely enabled capture for these features.
    disable_session_recording: true,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    disable_surveys: true,
    enable_recording_console_log: false,
    // No anonymous/student/parent replay. Only identifyUser(teacher/admin)
    // starts it, and resetAnalytics stops it before clearing the identity.
    // Those permitted recordings still mask all inputs and rendered text.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    persistence: "localStorage",
    loaded: () => {
      initialized = true;
      if (pendingReset) {
        posthog.stopSessionRecording();
        posthog.reset();
        pendingReset = false;
      }
      if (pendingIdentity) {
        const identity = pendingIdentity;
        pendingIdentity = null;
        applyIdentity(identity);
      }
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
  if (!POSTHOG_KEY) return;
  const identity = { userId, role, props: { ...props } };
  if (!initialized) {
    pendingIdentity = identity;
    return;
  }
  applyIdentity(identity);
}

/** Clear the identified user on logout. */
export function resetAnalytics(): void {
  pendingIdentity = null;
  if (!POSTHOG_KEY) return;
  if (!initialized) {
    pendingReset = true;
    return;
  }
  posthog.stopSessionRecording();
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
