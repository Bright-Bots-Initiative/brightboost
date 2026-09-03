/* @vitest-environment node */
/**
 * Backend adapter over the shared deploy-environment contract. The contract
 * itself is proven in shared/deploy-env/index.test.ts; these cases prove the
 * adapter reads the right process.env names and keeps the SHA precedence.
 */
import { describe, expect, it } from "vitest";
import {
  ROBOTS_TAG_NOINDEX,
  resolveDeployEnv,
  resolveGitSha,
  robotsTagFor,
} from "./deployEnv";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

describe("resolveDeployEnv (backend adapter)", () => {
  it("healthy production: RAILWAY_ENVIRONMENT_NAME=production + APP_ENV=production", () => {
    const env = resolveDeployEnv({
      RAILWAY_ENVIRONMENT_NAME: "production",
      APP_ENV: "production",
      NODE_ENV: "production",
      RAILWAY_GIT_COMMIT_SHA: SHA,
    });
    expect(env).toMatchObject({
      name: "production",
      isProduction: true,
      noindex: false,
      source: "railway",
      declaredEnv: "production",
      railwayEnv: "production",
      mismatch: "none",
      gitSha: SHA,
    });
    expect(robotsTagFor(env)).toBeNull();
  });

  it("healthy staging: RAILWAY_ENVIRONMENT_NAME=staging + APP_ENV=staging", () => {
    const env = resolveDeployEnv({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "staging",
      NODE_ENV: "production",
    });
    expect(env).toMatchObject({
      name: "staging",
      noindex: true,
      mismatch: "none",
    });
    expect(robotsTagFor(env)).toBe(ROBOTS_TAG_NOINDEX);
  });

  it("today's production (no Railway name, no APP_ENV, NODE_ENV=production) stays production", () => {
    expect(resolveDeployEnv({ NODE_ENV: "production" })).toMatchObject({
      name: "production",
      source: "node_env",
      declared: false,
    });
  });

  it("SABOTAGE: Railway staging with a copied APP_ENV=production is never production", () => {
    const env = resolveDeployEnv({
      RAILWAY_ENVIRONMENT_NAME: "staging",
      APP_ENV: "production",
      NODE_ENV: "production",
    });
    expect(env.isProduction).toBe(false);
    expect(env.noindex).toBe(true);
    expect(env.mismatch).toBe("declared-vs-railway");
    expect(env.configError).toContain(
      "APP_ENV=production disagrees with RAILWAY_ENVIRONMENT_NAME",
    );
  });

  it("SABOTAGE: Railway production with APP_ENV=staging is a mismatch", () => {
    expect(
      resolveDeployEnv({
        RAILWAY_ENVIRONMENT_NAME: "production",
        APP_ENV: "staging",
      }),
    ).toMatchObject({
      name: "preview",
      isProduction: false,
      mismatch: "declared-vs-railway",
    });
  });

  it("an unfamiliar Railway environment name (pr-123) is a noindexed preview", () => {
    expect(
      resolveDeployEnv({
        RAILWAY_ENVIRONMENT_NAME: "pr-123",
        NODE_ENV: "production",
      }),
    ).toMatchObject({
      name: "preview",
      noindex: true,
      railwayEnv: "preview",
    });
  });

  it("a typo in APP_ENV (prod) never classifies as production", () => {
    expect(
      resolveDeployEnv({ APP_ENV: "prod", NODE_ENV: "production" }),
    ).toMatchObject({
      name: "preview",
      mismatch: "declared-unrecognized",
      noindex: true,
    });
  });

  it("NODE_ENV=test → test; nothing set → development", () => {
    expect(resolveDeployEnv({ NODE_ENV: "test" })).toMatchObject({
      name: "test",
      source: "node_env",
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
      resolveGitSha({ GIT_SHA: "ABC1234", RAILWAY_GIT_COMMIT_SHA: SHA }),
    ).toBe("abc1234");
  });

  it("falls back to RAILWAY_GIT_COMMIT_SHA", () => {
    expect(resolveGitSha({ RAILWAY_GIT_COMMIT_SHA: SHA })).toBe(SHA);
  });

  it("returns null when unset, blank, or not hex", () => {
    expect(resolveGitSha({})).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "   " })).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "not-a-sha" })).toBeNull();
    expect(resolveGitSha({ GIT_SHA: "abc" })).toBeNull();
  });
});
