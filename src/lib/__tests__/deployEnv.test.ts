import { describe, expect, it } from "vitest";
import { resolveClientDeployEnv, resolveClientGitSha } from "../deployEnv";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

describe("resolveClientDeployEnv (browser adapter over shared/deploy-env)", () => {
  it("healthy production build on Railway: both signals production → no banner", () => {
    expect(
      resolveClientDeployEnv({
        VITE_RAILWAY_ENVIRONMENT_NAME: "production",
        VITE_APP_ENV: "production",
        VITE_GIT_SHA: SHA,
        PROD: true,
      }),
    ).toMatchObject({
      name: "production",
      isProduction: true,
      source: "railway",
      mismatch: "none",
      gitSha: SHA,
      showBanner: false,
    });
  });

  it("healthy staging build: both signals staging → banner", () => {
    expect(
      resolveClientDeployEnv({
        VITE_RAILWAY_ENVIRONMENT_NAME: "staging",
        VITE_APP_ENV: "staging",
        PROD: true,
      }),
    ).toMatchObject({
      name: "staging",
      isProduction: false,
      mismatch: "none",
      showBanner: true,
    });
  });

  it("missing explicit value with a valid Railway build value → Railway decides (staging, banner)", () => {
    expect(
      resolveClientDeployEnv({
        VITE_RAILWAY_ENVIRONMENT_NAME: "staging",
        PROD: true,
      }),
    ).toMatchObject({
      name: "staging",
      source: "railway",
      declared: false,
      showBanner: true,
    });
  });

  it("SABOTAGE: frontend staging build with a copied VITE_APP_ENV=production → mismatch, banner, never production", () => {
    const env = resolveClientDeployEnv({
      VITE_RAILWAY_ENVIRONMENT_NAME: "staging",
      VITE_APP_ENV: "production",
      PROD: true,
    });
    expect(env.isProduction).toBe(false);
    expect(env.name).toBe("preview");
    expect(env.mismatch).toBe("declared-vs-railway");
    expect(env.showBanner).toBe(true);
    expect(env.configError).toContain(
      "VITE_APP_ENV=production disagrees with VITE_RAILWAY_ENVIRONMENT_NAME",
    );
  });

  it("today's production build (no signals) is production but undeclared", () => {
    expect(resolveClientDeployEnv({ PROD: true })).toMatchObject({
      name: "production",
      declared: false,
      source: "node_env",
      showBanner: false,
    });
  });

  it("an unrecognised VITE_APP_ENV is a declared-unrecognized mismatch (banner)", () => {
    expect(
      resolveClientDeployEnv({ VITE_APP_ENV: "prod", PROD: true }),
    ).toMatchObject({
      name: "preview",
      mismatch: "declared-unrecognized",
      showBanner: true,
    });
  });

  it("dev server and test mode show no banner", () => {
    expect(
      resolveClientDeployEnv({ PROD: false, MODE: "development" }),
    ).toMatchObject({
      name: "development",
      showBanner: false,
    });
    expect(resolveClientDeployEnv({ PROD: false, MODE: "test" })).toMatchObject(
      { name: "test", showBanner: false },
    );
  });

  it("the Dockerfile's empty-string defaults count as absent", () => {
    expect(
      resolveClientDeployEnv({
        VITE_APP_ENV: "",
        VITE_RAILWAY_ENVIRONMENT_NAME: "",
        VITE_GIT_SHA: "",
        PROD: true,
      }),
    ).toMatchObject({
      name: "production",
      declared: false,
      railwayEnv: null,
      gitSha: null,
    });
  });
});

describe("resolveClientGitSha", () => {
  it("accepts hex SHAs and rejects garbage", () => {
    expect(resolveClientGitSha("ABC1234")).toBe("abc1234");
    expect(resolveClientGitSha("%VITE_GIT_SHA%")).toBeNull();
    expect(resolveClientGitSha(undefined)).toBeNull();
  });
});
