/* @vitest-environment node */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function resolveBash(): string {
  return process.env.BB_BASH || "bash";
}

function runStepPresence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(resolveBash(), ["scripts/verify-ci-step-presence.sh"], {
      cwd: repoRoot,
      env,
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

describe("verify-ci-step-presence.sh (U1-04 + review Bug A)", () => {
  it("healthy: real workflow + manifest exits 0", async () => {
    const { status, output } = await runStepPresence();
    expect(status, `expected exit 0:\n${output}`).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  });

  it("property false: required step commented out → exit 1 (Bug A regression)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-presence-"));
    tempDirs.push(dir);

    const realWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const workflowPath = path.join(dir, "ci-cd-commented.yml");
    const commented = realWorkflow
      .split(/\r?\n/)
      .map((line) =>
        line.includes("check-prisma-drift.sh") ? `# ${line}` : line,
      )
      .join("\n");
    writeFileSync(workflowPath, commented, "utf8");

    const manifestPath = path.join(dir, "ci-required-steps.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSubstrings: ["scripts/check-prisma-drift.sh"],
      }),
      "utf8",
    );

    const { status, output } = await runStepPresence({
      ...process.env,
      CI_STEP_PRESENCE_WORKFLOW: workflowPath,
      CI_STEP_PRESENCE_MANIFEST: manifestPath,
    });

    expect(
      status,
      `commented-out drift step must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/MISSING required step substring/);
    expect(output).toContain("scripts/check-prisma-drift.sh");
  });

  it("property false: required step deleted entirely → exit 1", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-presence-"));
    tempDirs.push(dir);

    const realWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const workflowPath = path.join(dir, "ci-cd.yml");
    const sabotaged = realWorkflow
      .split(/\r?\n/)
      .filter((line) => !line.includes("check-prisma-drift.sh"))
      .join("\n");
    writeFileSync(workflowPath, sabotaged, "utf8");

    const manifestPath = path.join(dir, "ci-required-steps.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSubstrings: [
          "scripts/check-prisma-drift.sh",
          "this-step-definitely-does-not-exist-in-workflow",
        ],
      }),
      "utf8",
    );

    const { status, output } = await runStepPresence({
      ...process.env,
      CI_STEP_PRESENCE_WORKFLOW: workflowPath,
      CI_STEP_PRESENCE_MANIFEST: manifestPath,
    });

    expect(
      status,
      `manifest entry naming a missing step must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/MISSING required step substring/);
    expect(output).toContain("this-step-definitely-does-not-exist-in-workflow");
    expect(output).toContain("scripts/check-prisma-drift.sh");
  });
});
