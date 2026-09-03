/**
 * Deployment-environment classifier (BRAND_R0).
 *
 * One typed answer to "which environment is this process running in?" so the
 * noindex header, the analytics guard and `/health` all agree. Pure function:
 * it reads only the env map it is given and performs no I/O.
 *
 * Precedence (first match wins):
 *   1. `APP_ENV`                  explicit operator declaration
 *   2. `RAILWAY_ENVIRONMENT_NAME` injected by Railway for every environment
 *   3. `NODE_ENV`                 production | test | anything else = development
 *
 * Safe direction: an unrecognised `APP_ENV`, or a Railway environment that is
 * not literally `production`, classifies as NON-production (noindex on). A
 * staging environment that copied production's variables therefore still gets
 * noindex, and `scripts/verify-deploy-target.mjs` catches the opposite mistake
 * (production accidentally noindexed) before promotion.
 *
 * Mirrored for the browser bundle in `src/lib/deployEnv.ts` (Vite-prefixed
 * variables). Keep the two in step.
 */

export type DeployEnvName =
  | "production"
  | "staging"
  | "preview"
  | "development"
  | "test";

export type DeployEnvSource =
  | "APP_ENV"
  | "APP_ENV:unrecognized"
  | "RAILWAY_ENVIRONMENT_NAME"
  | "NODE_ENV"
  | "default";

export interface DeployEnv {
  name: DeployEnvName;
  isProduction: boolean;
  /** True whenever this environment must not be indexed by search engines. */
  noindex: boolean;
  /** Which variable decided the classification (for `/health` and logs). */
  source: DeployEnvSource;
  /** Lower-cased git SHA the running build came from, or null when unknown. */
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

type EnvLike = Record<string, string | undefined>;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isDeployEnvName(value: string): value is DeployEnvName {
  return (DEPLOY_ENV_NAMES as readonly string[]).includes(value);
}

/**
 * `GIT_SHA` (explicit) wins over Railway's `RAILWAY_GIT_COMMIT_SHA`. Anything
 * that is not a 7–40 character hex string is treated as unknown rather than
 * echoed, so a mis-set variable cannot masquerade as a verified build.
 */
export function resolveGitSha(env: EnvLike = process.env): string | null {
  const sha = clean(env.GIT_SHA) ?? clean(env.RAILWAY_GIT_COMMIT_SHA);
  if (!sha) return null;
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.toLowerCase() : null;
}

function build(
  name: DeployEnvName,
  source: DeployEnvSource,
  gitSha: string | null,
): DeployEnv {
  const isProduction = name === "production";
  return { name, isProduction, noindex: !isProduction, source, gitSha };
}

export function resolveDeployEnv(env: EnvLike = process.env): DeployEnv {
  const gitSha = resolveGitSha(env);

  const appEnv = clean(env.APP_ENV)?.toLowerCase();
  if (appEnv) {
    if (isDeployEnvName(appEnv)) return build(appEnv, "APP_ENV", gitSha);
    // A typo must never promote a host to production.
    return build("preview", "APP_ENV:unrecognized", gitSha);
  }

  const railwayEnv = clean(env.RAILWAY_ENVIRONMENT_NAME)?.toLowerCase();
  if (railwayEnv) {
    if (railwayEnv === "production") {
      return build("production", "RAILWAY_ENVIRONMENT_NAME", gitSha);
    }
    return build(
      railwayEnv.includes("staging") ? "staging" : "preview",
      "RAILWAY_ENVIRONMENT_NAME",
      gitSha,
    );
  }

  const nodeEnv = clean(env.NODE_ENV)?.toLowerCase();
  if (nodeEnv === "production") return build("production", "NODE_ENV", gitSha);
  if (nodeEnv === "test") return build("test", "NODE_ENV", gitSha);
  return build("development", "default", gitSha);
}

/** The `X-Robots-Tag` value a response should carry, or null for none. */
export function robotsTagFor(
  deployEnv: Pick<DeployEnv, "noindex">,
): string | null {
  return deployEnv.noindex ? ROBOTS_TAG_NOINDEX : null;
}
