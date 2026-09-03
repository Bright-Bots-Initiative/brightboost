/**
 * Browser re-export of the shared analytics environment guard (BRAND_R0).
 * Rules and tests: `shared/deploy-env/index.ts`. Docs: `docs/analytics.md`.
 */
export {
  decideAnalytics,
  describeAnalyticsDecision,
  type AnalyticsDecision,
  type AnalyticsGuardInput,
  type AnalyticsRefusal,
  type AnalyticsStatus,
} from "@shared/deploy-env";

export const CLIENT_GUARD_VARS = {
  key: "VITE_POSTHOG_KEY",
  keyEnv: "VITE_POSTHOG_KEY_ENV",
} as const;
