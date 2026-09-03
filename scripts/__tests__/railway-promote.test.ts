/* @vitest-environment node */
/**
 * railway-promote — pure validators, healthy then sabotage. The live Railway
 * and GitHub calls are exercised by the workflow run recorded in the evidence
 * register, never from unit tests.
 */
import { describe, expect, it } from "vitest";
import {
  classifyDeploymentStatus,
  deploymentsConsistent,
  environmentMatchesTarget,
  evaluateChecks,
  seedFlagsRequested,
  validateInputs,
} from "../railway-promote.mjs";

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

const healthy = {
  RAILWAY_TOKEN: "not-a-real-token-value",
  RAILWAY_PROJECT_ID: "fd8b32c5-9922-4e93-b9a5-010591716300",
  CANONICAL_RAILWAY_PROJECT_ID: "fd8b32c5-9922-4e93-b9a5-010591716300",
  RAILWAY_ENVIRONMENT_ID: "f0e47071-d161-49e7-b162-13c557801dbd",
  RAILWAY_SERVICE_ID_BACKEND: "e92287dc-0988-4595-9c9f-70aa0af18dfe",
  RAILWAY_SERVICE_ID_FRONTEND: "ae3241b4-e69e-431a-95cd-db8bba94c73e",
  TARGET_ENV: "production",
  COMMIT_SHA: SHA,
  PUBLIC_URL: "https://brightboost.org",
  EXPECT_ANALYTICS: "enabled",
  STAGING_PUBLIC_URL: "https://staging.example.test",
  GITHUB_REPOSITORY: "Bright-Bots-Initiative/brightboost",
  GITHUB_TOKEN: "not-a-real-token-value",
  GITHUB_ACTOR: "someone",
};

describe("validateInputs", () => {
  it("healthy production inputs validate; the token is never echoed", () => {
    const r = validateInputs(healthy);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.config)).not.toContain("not-a-real-token-value");
    expect(r.config.requiredChecks).toEqual([
      "build-and-test",
      "db-check",
      "e2e-flows",
    ]);
  });

  it("healthy staging inputs validate without STAGING_PUBLIC_URL", () => {
    const { STAGING_PUBLIC_URL: _omit, ...rest } = healthy;
    void _omit;
    expect(validateInputs({ ...rest, TARGET_ENV: "staging" }).ok).toBe(true);
  });

  it("SABOTAGE: wrong Railway project is refused", () => {
    const r = validateInputs({
      ...healthy,
      RAILWAY_PROJECT_ID: "db645af8-d47a-4989-bab0-65e61b3999a9",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/wrong Railway project/);
  });

  it("SABOTAGE: short or malformed SHA is refused", () => {
    expect(
      validateInputs({ ...healthy, COMMIT_SHA: SHA.slice(0, 7) }).errors.join(),
    ).toMatch(/40-character/);
    expect(validateInputs({ ...healthy, COMMIT_SHA: "main" }).ok).toBe(false);
  });

  it("SABOTAGE: missing Railway credential (job not approved) is a usage error, not a deploy", () => {
    const { RAILWAY_TOKEN: _omit, ...rest } = healthy;
    void _omit;
    const r = validateInputs(rest);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/RAILWAY_TOKEN is not available/);
  });

  it("SABOTAGE: production without a staging re-proof URL, or without an explicit analytics expectation, is refused", () => {
    const { STAGING_PUBLIC_URL: _omit, ...rest } = healthy;
    void _omit;
    expect(validateInputs(rest).errors.join()).toMatch(/STAGING_PUBLIC_URL/);
    expect(
      validateInputs({ ...healthy, EXPECT_ANALYTICS: "maybe" }).errors.join(),
    ).toMatch(/EXPECT_ANALYTICS/);
  });
});

describe("evaluateChecks", () => {
  const run = (
    name: string,
    conclusion: string | null,
    status = "completed",
    completed_at = "2026-09-03T00:00:00Z",
  ) => ({ name, conclusion, status, completed_at });

  it("healthy: all three required checks green", () => {
    const r = evaluateChecks(
      [
        run("build-and-test", "success"),
        run("db-check", "success"),
        run("e2e-flows", "success"),
        run("review", "failure"),
      ],
      ["build-and-test", "db-check", "e2e-flows"],
    );
    expect(r).toEqual({ ok: true, missing: [], failed: [] });
  });

  it("SABOTAGE: a failed or missing required check blocks", () => {
    expect(
      evaluateChecks(
        [
          run("build-and-test", "success"),
          run("db-check", "failure"),
          run("e2e-flows", "success"),
        ],
        ["build-and-test", "db-check", "e2e-flows"],
      ),
    ).toMatchObject({ ok: false, failed: ["db-check=failure"] });
    expect(
      evaluateChecks(
        [run("build-and-test", "success")],
        ["build-and-test", "db-check", "e2e-flows"],
      ),
    ).toMatchObject({ ok: false, missing: ["db-check", "e2e-flows"] });
    expect(
      evaluateChecks(
        [run("build-and-test", null, "in_progress")],
        ["build-and-test"],
      ),
    ).toMatchObject({ ok: false, failed: ["build-and-test=in_progress"] });
  });

  it("uses the latest run per check name", () => {
    const r = evaluateChecks(
      [
        run("db-check", "failure", "completed", "2026-09-03T00:00:00Z"),
        run("db-check", "success", "completed", "2026-09-03T01:00:00Z"),
      ],
      ["db-check"],
    );
    expect(r.ok).toBe(true);
  });
});

describe("seed flags, environment, status, consistency", () => {
  it("SABOTAGE: production seed flags requested are refused by name", () => {
    expect(seedFlagsRequested(["DATABASE_URL", "RUN_SEED", "APP_ENV"])).toEqual(
      ["RUN_SEED"],
    );
    expect(seedFlagsRequested(["SEED_ALLOW_PRODUCTION", "SEED_RESET"])).toEqual(
      ["SEED_ALLOW_PRODUCTION", "SEED_RESET"],
    );
    expect(seedFlagsRequested(["DATABASE_URL", "APP_ENV"])).toEqual([]);
  });

  it("SABOTAGE: the target environment must classify as requested (wrong environment)", () => {
    expect(environmentMatchesTarget("production", "production")).toBe(true);
    expect(environmentMatchesTarget("staging", "staging")).toBe(true);
    expect(environmentMatchesTarget("staging", "production")).toBe(false);
    expect(environmentMatchesTarget("production", "staging")).toBe(false);
    expect(environmentMatchesTarget("pr-42", "staging")).toBe(false);
  });

  it("deployment states map to pending / success / failure", () => {
    expect(classifyDeploymentStatus("SUCCESS")).toBe("success");
    for (const s of [
      "FAILED",
      "CRASHED",
      "REMOVED",
      "SKIPPED",
      "NEEDS_APPROVAL",
    ])
      expect(classifyDeploymentStatus(s)).toBe("failure");
    for (const s of [
      "BUILDING",
      "DEPLOYING",
      "QUEUED",
      "INITIALIZING",
      "WAITING",
    ])
      expect(classifyDeploymentStatus(s)).toBe("pending");
  });

  it("SABOTAGE: different frontend/backend SHAs are inconsistent", () => {
    expect(
      deploymentsConsistent(
        [
          { service: "backend", sha: SHA },
          { service: "frontend", sha: SHA },
        ],
        SHA,
      ).ok,
    ).toBe(true);
    const r = deploymentsConsistent(
      [
        { service: "backend", sha: SHA },
        {
          service: "frontend",
          sha: "67b38c3d2f90c8acc4ea6122178226acbf8bab77",
        },
      ],
      SHA,
    );
    expect(r.ok).toBe(false);
    expect(r.wrong).toEqual([
      "frontend:67b38c3d2f90c8acc4ea6122178226acbf8bab77",
    ]);
  });
});
