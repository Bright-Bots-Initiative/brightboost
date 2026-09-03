/**
 * Backend re-export of the shared analytics environment guard (BRAND_R0).
 * Rules and tests: `shared/deploy-env/index.ts`. Docs: `docs/analytics.md`.
 */
export {
  decideAnalytics,
  describeAnalyticsDecision,
  type AnalyticsDecision,
  type AnalyticsGuardInput,
  type AnalyticsRefusal,
  type AnalyticsStatus,
} from "@brightboost/greatwork-engine/dist/deploy-env";

export const SERVER_GUARD_VARS = {
  key: "POSTHOG_KEY",
  keyEnv: "POSTHOG_KEY_ENV",
} as const;
