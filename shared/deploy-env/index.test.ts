/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  classifyDeployEnv,
  classifyRailwayEnvironment,
  decideAnalytics,
  describeAnalyticsDecision,
  normalizeGitSha,
  robotsTagFor,
  ROBOTS_TAG_NOINDEX,
} from "./index";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";
const KEY = "phc_test_key_not_real";
const VARS = { key: "POSTHOG_KEY", keyEnv: "POSTHOG_KEY_ENV" };

describe("classifyDeployEnv — consistency contract (BRAND_R0)", () => {
  // ── Healthy rows first ──
  it("Railway production + APP_ENV=production → exact production, indexable", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "production",
      declaredEnv: "production",
      nodeEnv: "production",
      gitSha: SHA,
    });
    expect(env).toMatchObject({
      name: "production",
      isProduction: true,
      noindex: false,
      source: "railway",
      railwayEnv: "production",
      declaredEnv: "production",
      declared: true,
      mismatch: "none",
      configError: null,
      gitSha: SHA,
    });
    expect(robotsTagFor(env)).toBeNull();
  });

  it("Railway staging + APP_ENV=staging → staging, noindex", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "staging",
      declaredEnv: "staging",
      nodeEnv: "production",
    });
    expect(env).toMatchObject({
      name: "staging",
      isProduction: false,
      noindex: true,
      source: "railway",
      mismatch: "none",
    });
    expect(robotsTagFor(env)).toBe(ROBOTS_TAG_NOINDEX);
  });

  it("Railway production without a declaration → production (declared=false)", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "production",
      nodeEnv: "production",
    });
    expect(env).toMatchObject({
      name: "production",
      isProduction: true,
      declared: false,
      mismatch: "none",
    });
  });

  it("no Railway + APP_ENV=production → production by declaration", () => {
    const env = classifyDeployEnv({
      declaredEnv: "production",
      nodeEnv: "development",
    });
    expect(env).toMatchObject({
      name: "production",
      isProduction: true,
      source: "declared",
      railwayEnv: null,
    });
  });

  it("NODE_ENV is only the final fallback", () => {
    expect(classifyDeployEnv({ nodeEnv: "production" })).toMatchObject({
      name: "production",
      source: "node_env",
    });
    expect(classifyDeployEnv({ nodeEnv: "test" })).toMatchObject({
      name: "test",
      source: "node_env",
      noindex: true,
    });
    expect(classifyDeployEnv({})).toMatchObject({
      name: "development",
      source: "default",
      noindex: true,
    });
  });

  // ── Sabotage rows ──
  it("SABOTAGE: Railway staging + copied APP_ENV=production can NEVER be production", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "staging",
      declaredEnv: "production",
      nodeEnv: "production",
      gitSha: SHA,
    });
    expect(env.isProduction).toBe(false);
    expect(env.noindex).toBe(true);
    expect(env.name).toBe("preview");
    expect(env.mismatch).toBe("declared-vs-railway");
    expect(env.source).toBe("railway");
    expect(env.configError).toContain(
      "APP_ENV=production disagrees with RAILWAY_ENVIRONMENT_NAME",
    );
    expect(env.configError).toContain("staging");
    expect(robotsTagFor(env)).toBe(ROBOTS_TAG_NOINDEX);
  });

  it("SABOTAGE: Railway production + APP_ENV=staging → mismatch, not production", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "production",
      declaredEnv: "staging",
    });
    expect(env).toMatchObject({
      name: "preview",
      isProduction: false,
      noindex: true,
      mismatch: "declared-vs-railway",
    });
  });

  it("SABOTAGE: unknown Railway environment (pr-123) is non-production, and agreeing with it needs APP_ENV=preview", () => {
    expect(
      classifyDeployEnv({ railwayEnvironmentName: "pr-123" }),
    ).toMatchObject({
      name: "preview",
      isProduction: false,
      railwayEnv: "preview",
      mismatch: "none",
    });
    expect(
      classifyDeployEnv({
        railwayEnvironmentName: "pr-123",
        declaredEnv: "preview",
      }).mismatch,
    ).toBe("none");
    expect(
      classifyDeployEnv({
        railwayEnvironmentName: "pr-123",
        declaredEnv: "production",
      }),
    ).toMatchObject({
      name: "preview",
      mismatch: "declared-vs-railway",
      isProduction: false,
    });
  });

  it("SABOTAGE: a typo in APP_ENV (prod) is a declared-unrecognized mismatch, never production", () => {
    expect(
      classifyDeployEnv({
        railwayEnvironmentName: "production",
        declaredEnv: "prod",
      }),
    ).toMatchObject({
      name: "preview",
      isProduction: false,
      mismatch: "declared-unrecognized",
    });
    expect(
      classifyDeployEnv({ declaredEnv: "prod", nodeEnv: "production" }),
    ).toMatchObject({
      name: "preview",
      isProduction: false,
      mismatch: "declared-unrecognized",
      source: "declared",
    });
  });

  it("configError names variables and classifications only, never raw values", () => {
    const env = classifyDeployEnv({
      railwayEnvironmentName: "staging-secret-xyz",
      declaredEnv: "pRoDuCtIoN",
    });
    expect(env.configError).not.toContain("secret-xyz");
    expect(env.configError).not.toContain("pRoDuCtIoN");
    expect(env.configError).toContain("APP_ENV=production");
    expect(env.railwayEnvironmentName).toBe("staging-secret-xyz");
  });

  it("browser variable names appear in the browser-side message", () => {
    const env = classifyDeployEnv(
      { railwayEnvironmentName: "staging", declaredEnv: "production" },
      {
        names: {
          declared: "VITE_APP_ENV",
          railway: "VITE_RAILWAY_ENVIRONMENT_NAME",
        },
      },
    );
    expect(env.configError).toContain(
      "VITE_APP_ENV=production disagrees with VITE_RAILWAY_ENVIRONMENT_NAME",
    );
  });

  it("is case- and whitespace-insensitive on both signals", () => {
    expect(
      classifyDeployEnv({
        railwayEnvironmentName: " Production ",
        declaredEnv: "PRODUCTION",
      }).isProduction,
    ).toBe(true);
    expect(
      classifyDeployEnv({
        railwayEnvironmentName: "",
        declaredEnv: " ",
        nodeEnv: "test",
      }).name,
    ).toBe("test");
  });
});

describe("helpers", () => {
  it("classifyRailwayEnvironment", () => {
    expect(classifyRailwayEnvironment("production")).toBe("production");
    expect(classifyRailwayEnvironment("staging")).toBe("staging");
    expect(classifyRailwayEnvironment("bb-staging-2")).toBe("staging");
    expect(classifyRailwayEnvironment("pr-42")).toBe("preview");
    expect(classifyRailwayEnvironment(undefined)).toBeNull();
  });

  it("normalizeGitSha", () => {
    expect(normalizeGitSha("ABC1234")).toBe("abc1234");
    expect(normalizeGitSha("%VITE_GIT_SHA%")).toBeNull();
    expect(normalizeGitSha("abc")).toBeNull();
    expect(normalizeGitSha(null)).toBeNull();
  });
});

describe("decideAnalytics — exact label matching", () => {
  const env = (
    name: string,
    mismatch: "none" | "declared-vs-railway" = "none",
  ) => ({ name, mismatch }) as never;

  it("no key → disabled in every environment", () => {
    expect(
      decideAnalytics({
        env: env("production"),
        key: undefined,
        keyEnv: "production",
      }),
    ).toEqual({ status: "disabled", reason: "no-key" });
    expect(
      decideAnalytics({ env: env("staging"), key: " ", keyEnv: undefined }),
    ).toEqual({ status: "disabled", reason: "no-key" });
  });

  it("production + production label → enabled", () => {
    expect(
      decideAnalytics({
        env: env("production"),
        key: KEY,
        keyEnv: "production",
      }),
    ).toEqual({ status: "enabled", reason: "labeled-match" });
  });

  it("production + unlabeled key → enabled-unlabeled (bootstrap compatibility, degraded)", () => {
    const d = decideAnalytics({
      env: env("production"),
      key: KEY,
      keyEnv: undefined,
    });
    expect(d).toEqual({
      status: "enabled-unlabeled",
      reason: "production-bootstrap-compat",
    });
    expect(describeAnalyticsDecision(d, VARS, "production")).toContain(
      "POSTHOG_KEY_ENV=production",
    );
  });

  it("production + any non-production label → refused", () => {
    expect(
      decideAnalytics({ env: env("production"), key: KEY, keyEnv: "staging" }),
    ).toEqual({ status: "refused", reason: "nonproduction-key-in-production" });
    expect(
      decideAnalytics({
        env: env("production"),
        key: KEY,
        keyEnv: "development",
      }).status,
    ).toBe("refused");
  });

  it("staging only with keyEnv=staging; preview only with keyEnv=preview; development only with keyEnv=development", () => {
    expect(
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: "staging" })
        .status,
    ).toBe("enabled");
    expect(
      decideAnalytics({ env: env("preview"), key: KEY, keyEnv: "preview" })
        .status,
    ).toBe("enabled");
    expect(
      decideAnalytics({
        env: env("development"),
        key: KEY,
        keyEnv: "development",
      }).status,
    ).toBe("enabled");
  });

  it("SABOTAGE: staging with a preview-labelled key → environment-key-mismatch", () => {
    expect(
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: "preview" }),
    ).toEqual({ status: "refused", reason: "environment-key-mismatch" });
  });

  it("SABOTAGE: preview with a staging-labelled key → environment-key-mismatch", () => {
    expect(
      decideAnalytics({ env: env("preview"), key: KEY, keyEnv: "staging" }),
    ).toEqual({ status: "refused", reason: "environment-key-mismatch" });
  });

  it("SABOTAGE: any non-production key without a label → refused", () => {
    for (const name of ["staging", "preview", "development", "test"]) {
      expect(
        decideAnalytics({ env: env(name), key: KEY, keyEnv: undefined }),
      ).toEqual({ status: "refused", reason: "unlabeled-nonproduction" });
    }
  });

  it("SABOTAGE: production key outside production → refused", () => {
    expect(
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: "production" }),
    ).toEqual({
      status: "refused",
      reason: "production-key-outside-production",
    });
  });

  it("SABOTAGE: a classifier mismatch refuses analytics whatever the label", () => {
    expect(
      decideAnalytics({
        env: env("preview", "declared-vs-railway"),
        key: KEY,
        keyEnv: "preview",
      }),
    ).toEqual({ status: "refused", reason: "environment-mismatch" });
    expect(
      decideAnalytics({
        env: env("preview", "declared-vs-railway"),
        key: KEY,
        keyEnv: "production",
      }).reason,
    ).toBe("environment-mismatch");
  });

  it("every refusal has an operator message that names variables, not values", () => {
    const cases = [
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: "preview" }),
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: undefined }),
      decideAnalytics({ env: env("staging"), key: KEY, keyEnv: "production" }),
      decideAnalytics({ env: env("production"), key: KEY, keyEnv: "staging" }),
      decideAnalytics({
        env: env("preview", "declared-vs-railway"),
        key: KEY,
        keyEnv: "preview",
      }),
    ];
    for (const d of cases) {
      const msg = describeAnalyticsDecision(d, VARS, "staging");
      expect(msg).toMatch(/^REFUSED/);
      expect(msg).not.toContain(KEY);
    }
  });
});
