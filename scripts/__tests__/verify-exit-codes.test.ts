/* @vitest-environment node */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

describe("reserved exit codes (§7 / U1-06)", () => {
  it("step-presence: missing manifest exits 2 (could not run), not 1", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-exit-"));
    tempDirs.push(dir);
    const missingManifest = path.join(dir, "does-not-exist.json");
    const result = spawnSync(
      resolveBash(),
      ["scripts/verify-ci-step-presence.sh"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 30_000,
        env: {
          ...process.env,
          CI_STEP_PRESENCE_MANIFEST: missingManifest,
        },
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(
      result.status,
      `missing manifest must be exit 2 (could not run), got ${result.status}:\n${output}`,
    ).toBe(2);
    expect(output).toMatch(/ERROR: missing manifest/);
  });

  it("step-presence: property false (missing step) exits 1, distinct from 2", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-prop-"));
    tempDirs.push(dir);
    const workflowPath = path.join(dir, "empty.yml");
    writeFileSync(workflowPath, "name: empty\njobs: {}\n", "utf8");
    const manifestPath = path.join(dir, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSubstrings: ["scripts/check-prisma-drift.sh"],
      }),
      "utf8",
    );
    const result = spawnSync(
      resolveBash(),
      ["scripts/verify-ci-step-presence.sh"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 30_000,
        env: {
          ...process.env,
          CI_STEP_PRESENCE_WORKFLOW: workflowPath,
          CI_STEP_PRESENCE_MANIFEST: manifestPath,
        },
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(
      result.status,
      `absent required step must be exit 1 (property false), got ${result.status}:\n${output}`,
    ).toBe(1);
    expect(result.status).not.toBe(2);
  });

  it("type-program: missing manifest exits 2 (could not run)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "type-guard-exit-"));
    tempDirs.push(dir);
    const missing = path.join(dir, "no-such-manifest.json");
    const result = spawnSync(
      process.execPath,
      ["scripts/verify-type-program-membership.mjs"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 30_000,
        env: {
          ...process.env,
          TYPE_GUARD_MANIFEST: missing,
        },
      },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(
      result.status,
      `missing type-guard manifest must be exit 2, got ${result.status}:\n${output}`,
    ).toBe(2);
    expect(output).toMatch(/ERROR: missing manifest/);
  });

  it("type-program: EXIT_PROPERTY and EXIT_CANNOT_RUN are distinct exports", async () => {
    const { pathToFileURL } = await import("node:url");
    const mod = await import(
      pathToFileURL(
        path.join(repoRoot, "scripts/verify-type-program-membership.mjs"),
      ).href
    );
    expect(mod.EXIT_PROPERTY).toBe(1);
    expect(mod.EXIT_CANNOT_RUN).toBe(2);
    expect(mod.EXIT_PROPERTY).not.toBe(mod.EXIT_CANNOT_RUN);
  });
});
