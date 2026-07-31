/* @vitest-environment node */

/**
 * U1-03: supersedes the prior YAML text-read (G-202).
 * Proves `npm run verify:ci-gate` remains invoked in ci-cd.yml by *executing*
 * the step-presence guard (manifest lists that substring). Full two-phase
 * shell-gate execution lives in ciWiring.test.ts W-8/W-9 — do not duplicate it.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

function resolveBash(): string {
  return process.env.BB_BASH || "bash";
}

describe("CI shell gate wiring (G-201 / A7 / U1-03)", () => {
  it("verify-ci-step-presence.sh exits 0 (manifest requires npm run verify:ci-gate)", () => {
    const bash = resolveBash();
    const result = spawnSync(bash, ["scripts/verify-ci-step-presence.sh"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60_000,
      env: process.env,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(
      result.status,
      `step-presence must exit 0 — proves verify:ci-gate is still wired (got ${result.status}):\n${output}`,
    ).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  }, 60_000);
});
