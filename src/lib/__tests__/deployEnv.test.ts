import { describe, expect, it } from "vitest";
import { resolveClientDeployEnv, resolveClientGitSha } from "../deployEnv";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

describe("resolveClientDeployEnv (BRAND_R0 browser classifier)", () => {
  it("healthy production build: VITE_APP_ENV=production → no banner", () => {
    expect(
      resolveClientDeployEnv({
        VITE_APP_ENV: "production",
        VITE_GIT_SHA: SHA,
        PROD: true,
      }),
    ).toEqual({
      name: "production",
      declared: true,
      isProduction: true,
      gitSha: SHA,
      showBanner: false,
    });
  });

  it("healthy staging build: VITE_APP_ENV=staging → banner shown", () => {
    const env = resolveClientDeployEnv({ VITE_APP_ENV: "staging", PROD: true });
    expect(env.name).toBe("staging");
    expect(env.declared).toBe(true);
    expect(env.isProduction).toBe(false);
    expect(env.showBanner).toBe(true);
  });

  it("today's production build (no VITE_APP_ENV) is production but undeclared", () => {
    const env = resolveClientDeployEnv({ PROD: true });
    expect(env).toMatchObject({
      name: "production",
      declared: false,
      showBanner: false,
    });
  });

  it("an unrecognised VITE_APP_ENV never becomes production", () => {
    const env = resolveClientDeployEnv({ VITE_APP_ENV: "prod", PROD: true });
    expect(env).toMatchObject({
      name: "preview",
      declared: true,
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
      {
        name: "test",
        showBanner: false,
      },
    );
  });

  it("the Dockerfile's empty-string default counts as undeclared", () => {
    expect(
      resolveClientDeployEnv({
        VITE_APP_ENV: "",
        VITE_GIT_SHA: "",
        PROD: true,
      }),
    ).toMatchObject({ name: "production", declared: false, gitSha: null });
  });
});

describe("resolveClientGitSha", () => {
  it("accepts hex SHAs and rejects garbage", () => {
    expect(resolveClientGitSha("ABC1234")).toBe("abc1234");
    expect(resolveClientGitSha("%VITE_GIT_SHA%")).toBeNull();
    expect(resolveClientGitSha(undefined)).toBeNull();
  });
});
