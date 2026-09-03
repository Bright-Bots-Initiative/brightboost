import React from "react";
import { useTranslation } from "react-i18next";
import { resolveClientDeployEnv, type ClientDeployEnv } from "@/lib/deployEnv";

interface EnvironmentBannerProps {
  /** Override the build-time classification (stories, tests). */
  env?: ClientDeployEnv;
}

/**
 * Staging-only banner (BRAND_R0). Renders nothing in production, local dev and
 * tests; a persistent strip on staging/preview hosts so nobody mistakes test
 * data for the real Bright Boost. Sits in normal flow above the routes so it
 * never overlaps sticky headers.
 */
const EnvironmentBanner: React.FC<EnvironmentBannerProps> = ({ env }) => {
  const { t } = useTranslation();
  const resolved = env ?? resolveClientDeployEnv();
  if (!resolved.showBanner) return null;

  const shortSha = resolved.gitSha ? resolved.gitSha.slice(0, 7) : null;
  const envLabel = t(`envBanner.env.${resolved.name}`);

  return (
    <div
      role="status"
      data-testid="environment-banner"
      data-env={resolved.name}
      className="w-full bg-amber-300 text-brightboost-navy text-sm font-semibold text-center px-3 py-1.5 border-b-2 border-amber-500"
    >
      {t("envBanner.message", { env: envLabel })}
      {shortSha ? (
        <span className="ml-2 font-mono text-xs opacity-80">
          {t("envBanner.build", { sha: shortSha })}
        </span>
      ) : null}
    </div>
  );
};

export default EnvironmentBanner;
