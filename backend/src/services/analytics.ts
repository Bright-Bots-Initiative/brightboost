/**
 * Backend analytics shim — PostHog Node SDK wrapper.
 *
 * The server-side mirror of high-value funnel events lives here. The client
 * may drop events when a tab closes mid-flow; the server is the source of
 * truth for the scoreboard.
 *
 * If POSTHOG_KEY is unset, every call here silently no-ops so dev/test runs
 * cleanly without a key. Don't crash on a missing key.
 *
 * PRIVACY: same rules as src/lib/analytics.ts — distinctId is the DB user id,
 * properties are IDs and enums only. Never persist email, name, or free-text
 * content to PostHog.
 */
import { PostHog } from "posthog-node";
import {
  decideAnalytics,
  describeAnalyticsDecision,
  type AnalyticsDecision,
  type AnalyticsStatus,
} from "../utils/analyticsGuard";
import { resolveDeployEnv } from "../utils/deployEnv";

const POSTHOG_KEY = process.env.POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
// BRAND_R0: the environment the key was issued for (production | staging | …).
// See utils/analyticsGuard.ts — an unlabeled key outside production is refused.
const POSTHOG_KEY_ENV = process.env.POSTHOG_KEY_ENV;

const GUARD_VARS = { key: "POSTHOG_KEY", keyEnv: "POSTHOG_KEY_ENV" };

let client: PostHog | null = null;
let decision: AnalyticsDecision | null = null;
let announced = false;

/** Environment-guard verdict for this process (computed once, logged once). */
export function getAnalyticsDecision(): AnalyticsDecision {
  if (decision) return decision;
  const envName = resolveDeployEnv(process.env).name;
  decision = decideAnalytics({
    envName,
    key: POSTHOG_KEY,
    keyEnv: POSTHOG_KEY_ENV,
  });
  if (!announced) {
    announced = true;
    const message = `[analytics] ${describeAnalyticsDecision(decision, GUARD_VARS, envName)}`;
    if (decision.status === "refused") console.error(message);
    else if (decision.status === "disabled") {
      console.info(
        "[analytics] No POSTHOG_KEY set — server-side analytics disabled (fine in local dev)",
      );
    } else console.info(message);
  }
  return decision;
}

/** `enabled` | `disabled` | `refused` — surfaced on /health. */
export function getAnalyticsStatus(): AnalyticsStatus {
  return getAnalyticsDecision().status;
}

export function getAnalyticsClient(): PostHog | null {
  if (getAnalyticsDecision().status !== "enabled" || !POSTHOG_KEY) {
    return null;
  }
  if (!client) {
    client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  }
  return client;
}

/**
 * Fire-and-forget event capture. Wraps every call in a try/catch so a
 * misconfigured PostHog never breaks a real request handler.
 */
export function trackServer(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const ph = getAnalyticsClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId: userId, event, properties });
  } catch (err) {
    console.warn("[analytics] capture failed:", err);
  }
}

/**
 * Flush queued events. Call on graceful shutdown so trailing captures land
 * in PostHog before the process exits.
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch (err) {
    console.warn("[analytics] shutdown failed:", err);
  }
}
