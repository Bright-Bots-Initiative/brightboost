/**
 * Browser-side deployment-environment classifier (BRAND_R0).
 *
 * Mirrors `backend/src/utils/deployEnv.ts` for the Vite bundle. Values are
 * inlined at build time (`VITE_*`), so a staging build must be built with
 * `VITE_APP_ENV=staging` — see DEPLOYMENT.md and Dockerfile.frontend.
 *
 * Safe direction: an unrecognised `VITE_APP_ENV` classifies as `preview`
 * (banner shown, treated as non-production). An absent `VITE_APP_ENV` keeps
 * today's behaviour (a production build is production) so the current
 * production deploy does not regress; the deploy-target smoke refuses a
 * staging host that failed to declare itself.
 */

export type ClientDeployEnvName =
  | "production"
  | "staging"
  | "preview"
  | "development"
  | "test";

export interface ClientDeployEnv {
  name: ClientDeployEnvName;
  /** True when `VITE_APP_ENV` was present at build time. */
  declared: boolean;
  isProduction: boolean;
  /** Lower-cased git SHA baked into the bundle (`VITE_GIT_SHA`), or null. */
  gitSha: string | null;
  /** The staging banner renders only for staging and preview hosts. */
  showBanner: boolean;
}

export interface ViteEnvLike {
  VITE_APP_ENV?: string;
  VITE_GIT_SHA?: string;
  PROD?: boolean;
  MODE?: string;
}

const NAMES: readonly ClientDeployEnvName[] = [
  "production",
  "staging",
  "preview",
  "development",
  "test",
];

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isName(value: string): value is ClientDeployEnvName {
  return (NAMES as readonly string[]).includes(value);
}

export function resolveClientGitSha(raw: string | undefined): string | null {
  const sha = clean(raw);
  if (!sha) return null;
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.toLowerCase() : null;
}

export function resolveClientDeployEnv(
  env: ViteEnvLike = import.meta.env as ViteEnvLike,
): ClientDeployEnv {
  const gitSha = resolveClientGitSha(env.VITE_GIT_SHA);
  const declaredRaw = clean(env.VITE_APP_ENV)?.toLowerCase();

  let name: ClientDeployEnvName;
  let declared: boolean;
  if (declaredRaw) {
    declared = true;
    name = isName(declaredRaw) ? declaredRaw : "preview";
  } else {
    declared = false;
    if (env.PROD) name = "production";
    else if (env.MODE === "test") name = "test";
    else name = "development";
  }

  return {
    name,
    declared,
    isProduction: name === "production",
    gitSha,
    showBanner: name === "staging" || name === "preview",
  };
}
