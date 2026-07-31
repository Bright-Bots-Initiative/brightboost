/* @vitest-environment node */

/**
 * U1-03: supersedes the prior YAML text-read (G-202).
 * Proves `npm run verify:ci-gate` remains invoked in ci-cd.yml by *executing*
 * the step-presence guard (manifest lists that substring). Full two-phase
 * shell-gate execution lives in ciWiring.test.ts W-8/W-9 — do not duplicate it.
 *
 * Uses async spawn so Vitest's worker RPC is not blocked (birpc onTaskUpdate).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

function resolveBash(): string {
  return process.env.BB_BASH || "bash";
}

function runStepPresenceAsync(): Promise<{
  status: number | null;
  output: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(resolveBash(), ["scripts/verify-ci-step-presence.sh"], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, 60_000);
    child.stdout?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.stderr?.on("data", (c: Buffer | string) => {
      output += String(c);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: 2, output: output + `\n${err.message}` });
    });
  });
}

describe("CI shell gate wiring (G-201 / A7 / U1-03)", () => {
  it("verify-ci-step-presence.sh exits 0 (manifest requires npm run verify:ci-gate)", async () => {
    const { status, output } = await runStepPresenceAsync();
    expect(
      status,
      `step-presence must exit 0 — proves verify:ci-gate is still wired (got ${status}):\n${output}`,
    ).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  }, 60_000);
});
