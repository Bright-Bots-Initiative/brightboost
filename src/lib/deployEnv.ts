/**
 * Browser adapter for the shared deploy-environment contract (BRAND_R0).
 *
 * Rules live in `shared/deploy-env/index.ts`. Inputs are inlined by Vite at
 * build time: `VITE_RAILWAY_ENVIRONMENT_NAME` (forwarded automatically from
 * Railway's `RAILWAY_ENVIRONMENT_NAME` build arg by `Dockerfile.frontend`),
 * `VITE_APP_ENV` (the operator declaration) and `VITE_GIT_SHA`.
 *
 * A declaration that disagrees with Railway is a configuration error: the
 * bundle classifies as `preview`, the banner renders, analytics is refused,
 * and strict deploy verification fails (`DT-010`).
 */
import {
  classifyDeployEnv,
  normalizeGitSha,
  type DeployEnv,
} from "@shared/deploy-env";

export type { DeployEnv };

export interface ClientDeployEnv extends DeployEnv {
  /** The staging banner renders for staging, preview, and any mismatch. */
  showBanner: boolean;
}

export interface ViteEnvLike {
  VITE_APP_ENV?: string;
  VITE_RAILWAY_ENVIRONMENT_NAME?: string;
  VITE_GIT_SHA?: string;
  PROD?: boolean;
  MODE?: string;
}

export const CLIENT_ENV_NAMES = {
  declared: "VITE_APP_ENV",
  railway: "VITE_RAILWAY_ENVIRONMENT_NAME",
} as const;

export function resolveClientGitSha(raw: string | undefined): string | null {
  return normalizeGitSha(raw);
}

export function resolveClientDeployEnv(
  env: ViteEnvLike = import.meta.env as ViteEnvLike,
): ClientDeployEnv {
  const resolved = classifyDeployEnv(
    {
      railwayEnvironmentName: env.VITE_RAILWAY_ENVIRONMENT_NAME,
      declaredEnv: env.VITE_APP_ENV,
      nodeEnv: env.PROD ? "production" : env.MODE,
      gitSha: env.VITE_GIT_SHA,
    },
    { names: CLIENT_ENV_NAMES },
  );
  return {
    ...resolved,
    showBanner:
      resolved.name === "staging" ||
      resolved.name === "preview" ||
      resolved.mismatch !== "none",
  };
}
