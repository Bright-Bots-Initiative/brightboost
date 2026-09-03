/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  ROBOTS_TAG_NOINDEX,
  resolveDeployEnv,
  resolveGitSha,
  robotsTagFor,
} from "./deployEnv";

describe("resolveDeployEnv (BRAND_R0 classifier)", () => {
  it("healthy production: APP_ENV=production → production, no noindex", () => {
    const env = resolveDeployEnv({
      APP_ENV: "production",
      NODE_ENV: "production",
      RAILWAY_GIT_COMMIT_SHA: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
    });
    expect(env).toEqual({
      name: "production",
      isProduction: true,
      noindex: false,
      source: "APP_ENV",
      gitSha: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
    });
    expect(robotsTagFor(env)).toBeNull();
  });

  it("healthy staging: APP_ENV=staging → staging with noindex", () => {
    const env = resolveDeployEnv({
      APP_ENV: "staging",
      NODE_ENV: "production",
    });
    expect(env.name).toBe("staging");
    expect(env.isProduction).toBe(false);
    expect(env.noindex).toBe(true);
    expect(env.source).toBe("APP_ENV");
    expect(robotsTagFor(env)).toBe(ROBOTS_TAG_NOINDEX);
  });

  it("today's production (no APP_ENV, no Railway name, NODE_ENV=production) stays production", () => {
    const env = resolveDeployEnv({ NODE_ENV: "production" });
    expect(env.name).toBe("production");
    expect(env.source).toBe("NODE_ENV");
    expect(env.noindex).toBe(false);
  });

  it("a Railway environment named staging is staging even with production's copied NODE_ENV", () => {
    const env = resolveDeployEnv({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_NAME: "staging",
    });
    expect(env.name).toBe("staging");
    expect(env.source).toBe("RAILWAY_ENVIRONMENT_NAME");
    expect(env.noindex).toBe(true);
  });

  it("a Railway environment named production is production", () => {
    const env = resolveDeployEnv({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_NAME: "production",
    });
    expect(env.name).toBe("production");
    expect(env.noindex).toBe(false);
  });

  it("an unfamiliar Railway environment name (pr-123) is a noindexed preview", () => {
    const env = resolveDeployEnv({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_NAME: "pr-123",
    });
    expect(env.name).toBe("preview");
    expect(env.noindex).toBe(true);
  });

  it("APP_ENV wins over RAILWAY_ENVIRONMENT_NAME and NODE_ENV", () => {
    const env = resolveDeployEnv({
      APP_ENV: "staging",
      RAILWAY_ENVIRONMENT_NAME: "production",
      NODE_ENV: "production",
    });
    expect(env.name).toBe("staging");
    expect(env.source).toBe("APP_ENV");
  });

  it("a typo in APP_ENV (prod) never classifies as production", () => {
    const env = resolveDeployEnv({ APP_ENV: "prod", NODE_ENV: "production" });
    expect(env.name).toBe("preview");
    expect(env.source).toBe("APP_ENV:unrecognized");
    expect(env.noindex).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveDeployEnv({ APP_ENV: "  Production " }).name).toBe(
      "production",
    );
    expect(resolveDeployEnv({ APP_ENV: "", NODE_ENV: "test" }).name).toBe(
      "test",
    );
  });

  it("NODE_ENV=test → test; nothing set → development", () => {
    expect(resolveDeployEnv({ NODE_ENV: "test" })).toMatchObject({
      name: "test",
      source: "NODE_ENV",
    });
    expect(resolveDeployEnv({})).toMatchObject({
      name: "development",
      source: "default",
      noindex: true,
    });
  });
});

describe("resolveGitSha", () => {
  it("prefers GIT_SHA over RAILWAY_GIT_COMMIT_SHA and lower-cases", () => {
    expect(
      resolveGitSha({
        GIT_SHA: "ABC1234",
        RAILWAY_GIT_COMMIT_SHA: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
      }),
    ).toBe("abc1234");
  });

  it("falls back to RAILWAY_GIT_COMMIT_SHA", () => {
    expect(
      resolveGitSha({
        RAILWAY_GIT_COMMIT_SHA: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
      }),
    ).toBe("91e4071f0017fa508bb9cf385abc066ede6b07e1");
  });

  it("returns null when unset, blank, or not hex", () => {
    expect(resolveGitSha({})).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "   " })).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "not-a-sha" })).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "abc" })).toBeNull();
  });
});
