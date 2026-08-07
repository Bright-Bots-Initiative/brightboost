/* @vitest-environment node */

import { spawn } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const parityScript = path.join(repoRoot, "scripts/verify-parity.mjs");

/**
 * Exact CI order from overview.md §15.3.2 / verify-parity.mjs STEPS.
 * U1-01 RED used a deliberately wrong list (CI-02 before CI-01); failure
 * named the order property. U1-02 locks the real sequence below.
 */
const EXPECTED_STEP_IDS = [
  "CI-01",
  "CI-02",
  "CI-03",
  "CI-04",
  "CI-05",
  "CI-06",
  "CI-24",
  "CI-25",
  "CI-07",
  "CI-08",
  "CI-09",
  "CI-23",
  "CI-10",
  "CI-11",
  "CI-12",
  "CI-13",
  "CI-14",
  "CI-15",
  "CI-16",
  "CI-17",
  "CI-21",
  "CI-22",
  "CI-26",
];

function pathToFileUrl(p: string): string {
  const resolved = path.resolve(p);
  const withSlashes = resolved.replace(/\\/g, "/");
  return withSlashes.startsWith("/")
    ? `file://${withSlashes}`
    : `file:///${withSlashes}`;
}

function runParityCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 30_000,
): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [parityScript, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
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

/** Count step executions that actually spawned a child (not inject-fail / SKIP). */
function countRunLines(output: string): number {
  return (output.match(/^\[RUN\] /gm) || []).length;
}

describe("verify-parity.mjs (A5 / U1)", () => {
  it("exports STEPS in exact CI order (not merely presence)", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    expect(mod.STEPS, "STEPS export must exist").toBeDefined();
    const ids = mod.STEPS.map((s: { id: string }) => s.id);
    expect(
      ids,
      "STEPS order must match CI build-and-test then db-check then extras",
    ).toEqual(EXPECTED_STEP_IDS);
  });

  it("parseArgs recognizes --allow-skips and --inject-fail", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const opts = mod.parseArgs([
      "--allow-skips",
      "--inject-fail",
      "CI-06",
      "--only",
      "CI-06,CI-26",
    ]);
    expect(opts.allowSkips).toBe(true);
    expect(opts.injectFail).toBe("CI-06");
    expect(opts.only).toEqual(["CI-06", "CI-26"]);
    expect(opts.usageError).toBeNull();
  });
});

describe("verify-parity --only selection integrity (Bug F / #740)", () => {
  it("rejects unknown ID --only CI-99 with exit 2 naming CI-99", async () => {
    const { status, output } = await runParityCli(["--only", "CI-99"]);
    expect(status, output).toBe(2);
    expect(output).toMatch(/CI-99/);
    expect(output).toMatch(/Valid IDs:/);
    expect(countRunLines(output)).toBe(0);
  });

  it("rejects --only with no value (exit 2)", async () => {
    const { status, output } = await runParityCli(["--only"]);
    expect(status, output).toBe(2);
    expect(output).toMatch(/--only requires/);
    expect(countRunLines(output)).toBe(0);
  });

  it("rejects --only --allow-skips as flag-as-value (exit 2)", async () => {
    const { status, output } = await runParityCli(["--only", "--allow-skips"]);
    expect(status, output).toBe(2);
    expect(output).toMatch(/--only requires/);
    expect(countRunLines(output)).toBe(0);
  });

  it('rejects --only "" as empty entry (exit 2)', async () => {
    const { status, output } = await runParityCli(["--only", ""]);
    expect(status, output).toBe(2);
    expect(countRunLines(output)).toBe(0);
  });

  it("rejects partial --only CI-02,CI-99 without running CI-02 (exit 2)", async () => {
    const { status, output } = await runParityCli(["--only", "CI-02,CI-99"]);
    expect(status, output).toBe(2);
    expect(output).toMatch(/CI-99/);
    expect(output).not.toMatch(/\[RUN\] CI-02/);
    expect(output).not.toMatch(/\[PASS\] CI-02/);
    expect(output).not.toMatch(/\[FAIL\] CI-02/);
    expect(countRunLines(output)).toBe(0);
  });

  it("runs exactly one step for --only CI-02 (inject-fail, no other steps)", async () => {
    const { status, output } = await runParityCli([
      "--only",
      "CI-02",
      "--inject-fail",
      "CI-02",
    ]);
    expect(status, output).toBe(1);
    expect(output).toMatch(/Selected 1 of \d+ steps: CI-02/);
    expect(output).toMatch(/\[FAIL\] CI-02/);
    expect(output).not.toMatch(/\[RUN\] CI-/);
    expect(output).not.toMatch(/\[FAIL\] CI-(?!02\b)/);
    expect(output).not.toMatch(/\[PASS\] CI-/);
    expect(countRunLines(output)).toBe(0);
  });

  it("exits 1 when selection is all SKIP (zero executable steps)", async () => {
    // CI-26 always SKIPs locally (OQ-10 reverse gap).
    const { status, output } = await runParityCli(["--only", "CI-26"]);
    expect(status, output).toBe(1);
    expect(output).toMatch(/Selected 1 of \d+ steps: CI-26/);
    expect(output).toMatch(/\[SKIP\] CI-26/);
    expect(output).toMatch(/Required step\(s\) were SKIPPED/);
    expect(countRunLines(output)).toBe(0);
  });

  it("validateStepSelection lists valid IDs for unknown --only", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const opts = mod.parseArgs(["--only", "CI-99"]);
    const result = mod.validateStepSelection(mod.STEPS, opts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(2);
      expect(result.message).toMatch(/CI-99/);
      expect(result.message).toMatch(/CI-02/);
    }
  });
});
