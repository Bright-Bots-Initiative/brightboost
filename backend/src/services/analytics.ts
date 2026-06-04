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

const POSTHOG_KEY = process.env.POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;
let warnedMissingKey = false;

export function getAnalyticsClient(): PostHog | null {
  if (!POSTHOG_KEY) {
    if (!warnedMissingKey) {
      console.info(
        "[analytics] No POSTHOG_KEY set — server-side analytics disabled (fine in local dev)",
      );
      warnedMissingKey = true;
    }
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
