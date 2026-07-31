/* @vitest-environment node */

import { spawnSync } from "node:child_process";
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

function runStepPresence(env: NodeJS.ProcessEnv = process.env): {
  status: number | null;
  output: string;
} {
  const result = spawnSync(
    resolveBash(),
    ["scripts/verify-ci-step-presence.sh"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60_000,
      env,
    },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("verify-ci-step-presence.sh (U1-04)", () => {
  it("healthy: real workflow + manifest exits 0", () => {
    const { status, output } = runStepPresence();
    expect(status, `expected exit 0:\n${output}`).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  });

  it("property false: manifest names a step that does not exist in the workflow (exit 1)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-presence-"));
    tempDirs.push(dir);

    const realWorkflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const workflowPath = path.join(dir, "ci-cd.yml");
    // Remove prisma-drift invocation so a real required substring is absent.
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

    const { status, output } = runStepPresence({
      ...process.env,
      CI_STEP_PRESENCE_WORKFLOW: workflowPath,
      CI_STEP_PRESENCE_MANIFEST: manifestPath,
    });

    expect(
      status,
      `manifest entry naming a missing step must exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(output).toMatch(/MISSING required step substring/);
    expect(output).toMatch(
      /this-step-definitely-does-not-exist-in-workflow|check-prisma-drift\.sh/,
    );
  });
});
