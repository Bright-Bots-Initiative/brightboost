/* @vitest-environment node */

import { spawn, spawnSync } from "node:child_process";
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

/** Absolute bash path so PATH can be stripped of node without losing the shell. */
function resolveAbsoluteBash(): string {
  const candidate = resolveBash();
  if (path.isAbsolute(candidate)) {
    return candidate;
  }
  const probed = spawnSync(candidate, ["-c", "command -v bash"], {
    encoding: "utf8",
    env: process.env,
  });
  const found = (probed.stdout || "").trim().split(/\r?\n/)[0];
  if (probed.status === 0 && found && path.isAbsolute(found)) {
    return found;
  }
  throw new Error(
    `Could not resolve absolute bash path from ${JSON.stringify(candidate)}`,
  );
}

function runBash(
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
  bashPath = resolveBash(),
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(bashPath, args, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, timeoutMs);
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

function runNode(
  scriptRel: string,
  env: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptRel], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: 124, output: output + "\nspawn timeout\n" });
    }, timeoutMs);
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

describe("reserved exit codes (§7 / U1-06)", () => {
  it("step-presence: missing manifest exits 2 (could not run), not 1", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-exit-"));
    tempDirs.push(dir);
    const missingManifest = path.join(dir, "does-not-exist.json");
    const { status, output } = await runBash(
      ["scripts/verify-ci-step-presence.sh"],
      {
        ...process.env,
        CI_STEP_PRESENCE_MANIFEST: missingManifest,
      },
    );
    expect(
      status,
      `missing manifest must be exit 2 (could not run), got ${status}:\n${output}`,
    ).toBe(2);
    expect(output).toMatch(/ERROR: missing manifest/);
  });

  it("step-presence: property false (missing step) exits 1, distinct from 2", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ci-step-prop-"));
    tempDirs.push(dir);
    const workflowPath = path.join(dir, "empty.yml");
    writeFileSync(workflowPath, "name: empty\njobs: {}\n", "utf8");
    const manifestPath = path.join(dir, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        requiredSteps: [
          {
            job: "build-and-test",
            run: "bash scripts/check-prisma-drift.sh",
          },
        ],
      }),
      "utf8",
    );
    const { status, output } = await runBash(
      ["scripts/verify-ci-step-presence.sh"],
      {
        ...process.env,
        CI_STEP_PRESENCE_WORKFLOW: workflowPath,
        CI_STEP_PRESENCE_MANIFEST: manifestPath,
      },
    );
    expect(
      status,
      `absent required step must be exit 1 (property false), got ${status}:\n${output}`,
    ).toBe(1);
    expect(status).not.toBe(2);
  });

  it("step-presence: PATH without node exits 2 (could not run)", async () => {
    // U1-06: remove node from PATH. On Linux node often shares /usr/bin with
    // bash, so spawn via an absolute bash path and use a minimal PATH that
    // cannot resolve node (empty bin + win32 System32 when present).
    const emptyBin = mkdtempSync(path.join(tmpdir(), "no-node-bin-"));
    tempDirs.push(emptyBin);
    const bashAbs = resolveAbsoluteBash();
    const slimParts = [emptyBin];
    if (process.env.SystemRoot) {
      slimParts.push(path.join(process.env.SystemRoot, "System32"));
    }
    const slimPath = slimParts.join(path.delimiter);

    const { status, output } = await runBash(
      ["scripts/verify-ci-step-presence.sh"],
      {
        ...process.env,
        PATH: slimPath,
        Path: slimPath,
      },
      30_000,
      bashAbs,
    );
    expect(
      status,
      `PATH without node must be exit 2 (could not run), got ${status}:\n${output}`,
    ).toBe(2);
    expect(output).toMatch(/ERROR: node is required|ERROR: missing/);
  });

  it("type-program: missing manifest exits 2 (could not run)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "type-guard-exit-"));
    tempDirs.push(dir);
    const missing = path.join(dir, "no-such-manifest.json");
    const { status, output } = await runNode(
      "scripts/verify-type-program-membership.mjs",
      {
        ...process.env,
        TYPE_GUARD_MANIFEST: missing,
      },
    );
    expect(
      status,
      `missing type-guard manifest must be exit 2, got ${status}:\n${output}`,
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
