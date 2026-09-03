/**
 * Deploy-environment contract — ONE pure module for the backend (Node) and the
 * browser bundle (Vite). BRAND_R0.
 *
 * Why shared: the classifier and the analytics guard must give identical
 * answers on both sides, and a hand-maintained mirror drifted once already.
 * No Node or DOM APIs here; callers pass plain strings read from their own
 * environment (`process.env.*` / `import.meta.env.VITE_*`).
 *
 * Contract
 * --------
 * 1. When a Railway environment name is present, Railway is the authoritative
 *    infrastructure signal (`production` → production; a name containing
 *    `staging` → staging; anything else → preview, never production).
 * 2. `APP_ENV` / `VITE_APP_ENV` is an operator DECLARATION. It must agree with
 *    the Railway classification. A disagreement is a configuration error: the
 *    host classifies as `preview` (noindex on, never production), `mismatch`
 *    names the error, `configError` carries a one-line operator message that
 *    only ever mentions variable NAMES and classifications, never values.
 * 3. Outside Railway the declaration is authoritative; an unrecognised value
 *    is a `declared-unrecognized` mismatch (also preview).
 * 4. `NODE_ENV` is the final compatibility fallback only.
 * 5. Only an exact, consistent production classification sets
 *    `isProduction=true` and `noindex=false`.
 *
 * Analytics guard: keys are labelled with the environment they were issued
 * for and the label must match the classification exactly. The single
 * exception — production with an unlabeled key — is a documented bootstrap
 * compatibility branch (`enabled-unlabeled`) that strict deploy verification
 * refuses; it is removed once production carries the label (#860).
 */

export type DeployEnvName =
  | "production"
  | "staging"
  | "preview"
  | "development"
  | "test";

export type DeployEnvSource = "railway" | "declared" | "node_env" | "default";

export type DeployEnvMismatch =
  | "none"
  | "declared-vs-railway"
  | "declared-unrecognized";

export type RailwayEnvClass = "production" | "staging" | "preview";

export interface DeployEnvInput {
  /** `RAILWAY_ENVIRONMENT_NAME` (backend) or `VITE_RAILWAY_ENVIRONMENT_NAME` (build-time). */
  railwayEnvironmentName?: string | null;
  /** `APP_ENV` (backend) or `VITE_APP_ENV` (build-time). */
  declaredEnv?: string | null;
  /** `NODE_ENV` (backend) or the Vite mode (`production` for a production build). */
  nodeEnv?: string | null;
  /** `GIT_SHA` / `RAILWAY_GIT_COMMIT_SHA` (backend) or `VITE_GIT_SHA` (build-time). */
  gitSha?: string | null;
}

export interface DeployEnv {
  /** Effective classification. */
  name: DeployEnvName;
  /** True only for an exact, consistent production classification. */
  isProduction: boolean;
  /** True whenever the host must not be indexed. `!isProduction`. */
  noindex: boolean;
  /** Which signal decided `name`. */
  source: DeployEnvSource;
  /** Railway's classification, or null when not running on Railway. */
  railwayEnv: RailwayEnvClass | null;
  /** The Railway environment name itself (a safe label, not a secret). */
  railwayEnvironmentName: string | null;
  /** The operator declaration as classified, `unrecognized`, or null when absent. */
  declaredEnv: DeployEnvName | "unrecognized" | null;
  /** Whether the declaration was present at all. */
  declared: boolean;
  mismatch: DeployEnvMismatch;
  /** One-line operator message for a mismatch (names only), else null. */
  configError: string | null;
  /** Lower-cased 7–40 hex git SHA, or null when unknown. */
  gitSha: string | null;
}

export const DEPLOY_ENV_NAMES: readonly DeployEnvName[] = [
  "production",
  "staging",
  "preview",
  "development",
  "test",
];

/** Header value applied to every non-production response. */
export const ROBOTS_TAG_NOINDEX = "noindex, nofollow";

const SHA_RE = /^[0-9a-f]{7,40}$/i;

function clean(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function isDeployEnvName(value: string): value is DeployEnvName {
  return (DEPLOY_ENV_NAMES as readonly string[]).includes(value);
}

/** Anything that is not a 7–40 char hex string is treated as unknown, never echoed. */
export function normalizeGitSha(raw: string | null | undefined): string | null {
  const sha = clean(raw);
  if (!sha) return null;
  return SHA_RE.test(sha) ? sha.toLowerCase() : null;
}

/** Railway environment name → infrastructure classification. Unknown names are non-production. */
export function classifyRailwayEnvironment(
  name: string | null | undefined,
): RailwayEnvClass | null {
  const value = clean(name)?.toLowerCase() ?? null;
  if (!value) return null;
  if (value === "production") return "production";
  if (value.includes("staging")) return "staging";
  return "preview";
}

export interface ClassifyOptions {
  /** Variable names used in the operator message (differ between backend and browser). */
  names?: { declared: string; railway: string };
}

const DEFAULT_NAMES = {
  declared: "APP_ENV",
  railway: "RAILWAY_ENVIRONMENT_NAME",
};

function build(
  name: DeployEnvName,
  source: DeployEnvSource,
  partial: Pick<
    DeployEnv,
    | "railwayEnv"
    | "railwayEnvironmentName"
    | "declaredEnv"
    | "declared"
    | "mismatch"
    | "configError"
    | "gitSha"
  >,
): DeployEnv {
  const isProduction = name === "production" && partial.mismatch === "none";
  return {
    name,
    isProduction,
    noindex: !isProduction,
    source,
    ...partial,
  };
}

export function classifyDeployEnv(
  input: DeployEnvInput,
  options: ClassifyOptions = {},
): DeployEnv {
  const names = options.names ?? DEFAULT_NAMES;
  const gitSha = normalizeGitSha(input.gitSha);
  const railwayEnvironmentName = clean(input.railwayEnvironmentName);
  const railwayEnv = classifyRailwayEnvironment(railwayEnvironmentName);

  const declaredRaw = clean(input.declaredEnv)?.toLowerCase() ?? null;
  const declared = declaredRaw !== null;
  const declaredEnv: DeployEnv["declaredEnv"] =
    declaredRaw === null
      ? null
      : isDeployEnvName(declaredRaw)
        ? declaredRaw
        : "unrecognized";

  const base = {
    railwayEnv,
    railwayEnvironmentName,
    declaredEnv,
    declared,
    gitSha,
  };

  // 1–2. Railway is authoritative; the declaration must agree.
  if (railwayEnv) {
    if (!declared) {
      return build(railwayEnv, "railway", {
        ...base,
        mismatch: "none",
        configError: null,
      });
    }
    if (declaredEnv === "unrecognized") {
      return build("preview", "railway", {
        ...base,
        mismatch: "declared-unrecognized",
        configError: `${names.declared} is set to an unrecognised value; Railway classifies this environment as ${railwayEnv}. Fix ${names.declared} (one of ${DEPLOY_ENV_NAMES.join(", ")}).`,
      });
    }
    if (declaredEnv === railwayEnv) {
      return build(railwayEnv, "railway", {
        ...base,
        mismatch: "none",
        configError: null,
      });
    }
    return build("preview", "railway", {
      ...base,
      mismatch: "declared-vs-railway",
      configError: `${names.declared}=${declaredEnv} disagrees with ${names.railway} (classified ${railwayEnv}). This host is treated as non-production until the declaration matches the Railway environment.`,
    });
  }

  // 3. Outside Railway the declaration is authoritative.
  if (declared) {
    if (declaredEnv === "unrecognized") {
      return build("preview", "declared", {
        ...base,
        mismatch: "declared-unrecognized",
        configError: `${names.declared} is set to an unrecognised value. Fix ${names.declared} (one of ${DEPLOY_ENV_NAMES.join(", ")}).`,
      });
    }
    return build(declaredEnv as DeployEnvName, "declared", {
      ...base,
      mismatch: "none",
      configError: null,
    });
  }

  // 4. NODE_ENV compatibility fallback.
  const nodeEnv = clean(input.nodeEnv)?.toLowerCase() ?? null;
  if (nodeEnv === "production") {
    return build("production", "node_env", {
      ...base,
      mismatch: "none",
      configError: null,
    });
  }
  if (nodeEnv === "test") {
    return build("test", "node_env", {
      ...base,
      mismatch: "none",
      configError: null,
    });
  }
  return build("development", "default", {
    ...base,
    mismatch: "none",
    configError: null,
  });
}

/** The `X-Robots-Tag` value a response should carry, or null for none. */
export function robotsTagFor(env: Pick<DeployEnv, "noindex">): string | null {
  return env.noindex ? ROBOTS_TAG_NOINDEX : null;
}

// ── Analytics guard ─────────────────────────────────────────────────────────

export type AnalyticsStatus =
  | "enabled"
  | "enabled-unlabeled"
  | "disabled"
  | "refused";

export type AnalyticsRefusal =
  | "environment-mismatch"
  | "unlabeled-nonproduction"
  | "production-key-outside-production"
  | "nonproduction-key-in-production"
  | "environment-key-mismatch";

export type AnalyticsDecision =
  | { status: "enabled"; reason: "labeled-match" }
  | { status: "enabled-unlabeled"; reason: "production-bootstrap-compat" }
  | { status: "disabled"; reason: "no-key" }
  | { status: "refused"; reason: AnalyticsRefusal };

export interface AnalyticsGuardInput {
  /** The classified environment. */
  env: Pick<DeployEnv, "name" | "mismatch">;
  /** The PostHog project key, possibly unset. */
  key: string | null | undefined;
  /** The environment the key was issued for, possibly unset. */
  keyEnv: string | null | undefined;
}

export function decideAnalytics(input: AnalyticsGuardInput): AnalyticsDecision {
  const key = clean(input.key);
  if (!key) return { status: "disabled", reason: "no-key" };

  if (input.env.mismatch !== "none") {
    return { status: "refused", reason: "environment-mismatch" };
  }

  const envName = input.env.name;
  const keyEnv = clean(input.keyEnv)?.toLowerCase() ?? null;

  if (envName === "production") {
    if (keyEnv === null) {
      return {
        status: "enabled-unlabeled",
        reason: "production-bootstrap-compat",
      };
    }
    if (keyEnv === "production")
      return { status: "enabled", reason: "labeled-match" };
    return { status: "refused", reason: "nonproduction-key-in-production" };
  }

  if (keyEnv === null)
    return { status: "refused", reason: "unlabeled-nonproduction" };
  if (keyEnv === "production") {
    return { status: "refused", reason: "production-key-outside-production" };
  }
  if (keyEnv === envName) return { status: "enabled", reason: "labeled-match" };
  return { status: "refused", reason: "environment-key-mismatch" };
}

export interface GuardVarNames {
  key: string;
  keyEnv: string;
}

/** Operator-facing explanation for logs; names variables, never values. */
export function describeAnalyticsDecision(
  decision: AnalyticsDecision,
  vars: GuardVarNames,
  envName: string,
): string {
  switch (decision.status) {
    case "enabled":
      return `enabled (${vars.keyEnv} matches env=${envName})`;
    case "enabled-unlabeled":
      return (
        `enabled WITHOUT a label — bootstrap compatibility only. ` +
        `Set ${vars.keyEnv}=production so this host reports a fully labelled posture; ` +
        `strict deploy verification refuses this state.`
      );
    case "disabled":
      return `disabled — ${vars.key} is not set`;
    case "refused":
      switch (decision.reason) {
        case "environment-mismatch":
          return `REFUSED — the deploy-environment declaration disagrees with the infrastructure environment; analytics stays off until the configuration error is fixed.`;
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
        case "environment-key-mismatch":
          return (
            `REFUSED — env=${envName} but ${vars.keyEnv} names a different non-production environment. ` +
            `Each environment uses its own PostHog project and an exactly matching label.`
          );
      }
  }
}
