/**
 * Analytics environment guard (BRAND_R0).
 *
 * Failure mode this closes: a staging environment created by duplicating the
 * production Railway variables inherits the production PostHog key and starts
 * writing test traffic into the production project. The guard cannot see which
 * PostHog project a key belongs to, so it requires the operator to LABEL the
 * key with the environment it was issued for:
 *
 *   POSTHOG_KEY=phc_…            POSTHOG_KEY_ENV=production   (production)
 *   POSTHOG_KEY=phc_…            POSTHOG_KEY_ENV=staging      (staging)
 *
 * Rules (pure, no I/O):
 *   - no key                                  → disabled (silent no-op, as before)
 *   - production + label absent or production → enabled (no regression for prod)
 *   - production + any other label            → refused
 *   - non-production + label absent           → refused (fail closed)
 *   - non-production + label "production"     → refused
 *   - non-production + any other label        → enabled
 *
 * Mirrored for the browser bundle in `src/lib/analyticsGuard.ts`. Keep them in
 * step; both have unit tests covering every row above.
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
  /** Deploy environment name from `resolveDeployEnv().name`. */
  envName: string;
  /** The PostHog project key (`phc_…`), possibly unset. */
  key: string | undefined;
  /** The environment the key was issued for, possibly unset. */
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

/** Operator-facing explanation for logs; names the variables to fix. */
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
