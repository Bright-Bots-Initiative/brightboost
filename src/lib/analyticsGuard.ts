/**
 * Analytics environment guard — browser mirror of
 * `backend/src/utils/analyticsGuard.ts` (BRAND_R0). Keep the two in step.
 *
 * Why: Vite inlines `VITE_POSTHOG_KEY` at build time, so a staging image built
 * from copied production variables would ship the production project key. The
 * operator labels the key with the environment it was issued for
 * (`VITE_POSTHOG_KEY_ENV`), and this guard refuses any label that does not
 * belong in the current environment. See `docs/analytics.md`.
 */

export type AnalyticsDecision =
  | { status: "enabled"; reason: "production-key" | "nonproduction-key" }
  | { status: "disabled"; reason: "no-key" }
  | {
      status: "refused";
      reason:
        | "unlabeled-nonproduction"
        | "production-key-outside-production"
        | "nonproduction-key-in-production";
    };

export type AnalyticsStatus = AnalyticsDecision["status"];

export interface AnalyticsGuardInput {
  envName: string;
  key: string | undefined;
  keyEnv: string | undefined;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function decideAnalytics(input: AnalyticsGuardInput): AnalyticsDecision {
  const key = clean(input.key);
  if (!key) return { status: "disabled", reason: "no-key" };

  const envName = clean(input.envName)?.toLowerCase() ?? "development";
  const keyEnv = clean(input.keyEnv)?.toLowerCase();

  if (envName === "production") {
    if (keyEnv === undefined || keyEnv === "production") {
      return { status: "enabled", reason: "production-key" };
    }
    return { status: "refused", reason: "nonproduction-key-in-production" };
  }

  if (keyEnv === undefined) {
    return { status: "refused", reason: "unlabeled-nonproduction" };
  }
  if (keyEnv === "production") {
    return { status: "refused", reason: "production-key-outside-production" };
  }
  return { status: "enabled", reason: "nonproduction-key" };
}

export function describeAnalyticsDecision(
  decision: AnalyticsDecision,
  vars: { key: string; keyEnv: string },
  envName: string,
): string {
  switch (decision.status) {
    case "enabled":
      return `enabled (${decision.reason}) for env=${envName}`;
    case "disabled":
      return `disabled — ${vars.key} is not set`;
    case "refused":
      switch (decision.reason) {
        case "unlabeled-nonproduction":
          return (
            `REFUSED — env=${envName} has ${vars.key} but no ${vars.keyEnv}. ` +
            `Label the key with the PostHog project it belongs to (${vars.keyEnv}=${envName}) ` +
            `or unset ${vars.key}. Unlabeled keys outside production are treated as the production key.`
          );
        case "production-key-outside-production":
          return (
            `REFUSED — env=${envName} is configured with the production PostHog key ` +
            `(${vars.keyEnv}=production). Create a separate PostHog project for this environment ` +
            `and set ${vars.key} + ${vars.keyEnv}=${envName}, or unset ${vars.key}.`
          );
        case "nonproduction-key-in-production":
          return (
            `REFUSED — production is configured with a non-production PostHog key ` +
            `(${vars.keyEnv} is not "production"). Set the production project key and ` +
            `${vars.keyEnv}=production.`
          );
      }
  }
}
