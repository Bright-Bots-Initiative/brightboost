/**
 * Backend adapter for the shared deploy-environment contract (BRAND_R0).
 *
 * The rules live in `shared/deploy-env/index.ts` (one pure module for Node and
 * the browser). This file only reads `process.env` and names the variables in
 * operator messages. See DEPLOYMENT.md → "Deploy environment contract".
 */
import {
  classifyDeployEnv,
  normalizeGitSha,
  robotsTagFor,
  DEPLOY_ENV_NAMES,
  ROBOTS_TAG_NOINDEX,
  type DeployEnv,
  type DeployEnvMismatch,
  type DeployEnvName,
  type DeployEnvSource,
} from "@brightboost/greatwork-engine/dist/deploy-env";

export { robotsTagFor, DEPLOY_ENV_NAMES, ROBOTS_TAG_NOINDEX };
export type { DeployEnv, DeployEnvMismatch, DeployEnvName, DeployEnvSource };

export const SERVER_ENV_NAMES = {
  declared: "APP_ENV",
  railway: "RAILWAY_ENVIRONMENT_NAME",
} as const;

type EnvLike = Record<string, string | undefined>;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * `GIT_SHA` (explicit) wins over Railway's `RAILWAY_GIT_COMMIT_SHA`. A value
 * that is not a 7–40 character hex string is treated as unknown rather than
 * echoed, so a mis-set variable cannot masquerade as a verified build.
 */
export function resolveGitSha(env: EnvLike = process.env): string | null {
  return normalizeGitSha(
    clean(env.GIT_SHA) ?? clean(env.RAILWAY_GIT_COMMIT_SHA),
  );
}

export function resolveDeployEnv(env: EnvLike = process.env): DeployEnv {
  return classifyDeployEnv(
    {
      railwayEnvironmentName: env.RAILWAY_ENVIRONMENT_NAME,
      declaredEnv: env.APP_ENV,
      nodeEnv: env.NODE_ENV,
      gitSha: clean(env.GIT_SHA) ?? clean(env.RAILWAY_GIT_COMMIT_SHA),
    },
    { names: SERVER_ENV_NAMES },
  );
}
