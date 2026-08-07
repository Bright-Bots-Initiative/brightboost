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

describe("verify-parity DB gate (Bug G / #740)", () => {
  const secretUrl =
    "postgresql://user:s3cret-password@db.prod.example.com:5432/brightboost";
  const decoyAmbient =
    "postgresql://ambient:decoy@db.ambient.example.com:5432/production";
  const designatedLocal =
    "postgresql://user:localpass@127.0.0.1:5432/brightboost_test";

  it("skips CI-14 and CI-16 when TEST_DATABASE_URL unset (exit 1 without --allow-skips)", async () => {
    const env = { ...process.env };
    delete env.TEST_DATABASE_URL;
    delete env.DATABASE_URL;
    delete env.POSTGRES_URL;
    delete env.BB_ALLOW_NON_TEST_DB;
    const { status, output } = await runParityCli(
      ["--only", "CI-14,CI-16"],
      env,
    );
    expect(status, output).toBe(1);
    expect(output).toMatch(/\[SKIP\] CI-14/);
    expect(output).toMatch(/\[SKIP\] CI-16/);
    expect(output).toMatch(/TEST_DATABASE_URL unset/);
    expect(countRunLines(output)).toBe(0);
  });

  it("allows required SKIPs with --allow-skips when TEST_DATABASE_URL unset", async () => {
    const env = { ...process.env };
    delete env.TEST_DATABASE_URL;
    delete env.DATABASE_URL;
    delete env.POSTGRES_URL;
    delete env.BB_ALLOW_NON_TEST_DB;
    const { status, output } = await runParityCli(
      ["--only", "CI-14,CI-16", "--allow-skips"],
      env,
    );
    expect(status, output).toBe(0);
    expect(output).toMatch(/\[SKIP\] CI-14/);
    expect(output).toMatch(/\[SKIP\] CI-16/);
  });

  it("refuses production-shaped TEST_DATABASE_URL with zero spawns", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    let spawnCount = 0;
    const prev = process.env.TEST_DATABASE_URL;
    const prevAllow = process.env.BB_ALLOW_NON_TEST_DB;
    process.env.TEST_DATABASE_URL = secretUrl;
    delete process.env.BB_ALLOW_NON_TEST_DB;
    try {
      const code = await mod.runParity(
        mod.STEPS,
        mod.parseArgs(["--only", "CI-14,CI-16"]),
        {
          runCommand: async () => {
            spawnCount += 1;
            return { code: 0, output: "" };
          },
        },
      );
      expect(code).toBe(1);
      expect(spawnCount, "refusal must happen before any child spawn").toBe(0);
    } finally {
      if (prev === undefined) delete process.env.TEST_DATABASE_URL;
      else process.env.TEST_DATABASE_URL = prev;
      if (prevAllow === undefined) delete process.env.BB_ALLOW_NON_TEST_DB;
      else process.env.BB_ALLOW_NON_TEST_DB = prevAllow;
    }
  });

  it("BB_ALLOW_NON_TEST_DB=1 proceeds with warning naming host and database", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const gate = mod.resolveParityDbGate({
      TEST_DATABASE_URL: secretUrl,
      BB_ALLOW_NON_TEST_DB: "1",
    });
    expect(gate.action).toBe("run");
    if (gate.action === "run") {
      expect(gate.warning).toMatch(/db\.prod\.example\.com/);
      expect(gate.warning).toMatch(/brightboost/);
      expect(gate.warning).not.toMatch(/s3cret-password/);
    }
  });

  it("passes the same designated URL in every DB env var to both steps", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const captured: Array<Record<string, string | undefined> | undefined> = [];
    const prev = process.env.TEST_DATABASE_URL;
    const prevDb = process.env.DATABASE_URL;
    process.env.TEST_DATABASE_URL = designatedLocal;
    process.env.DATABASE_URL = decoyAmbient;
    delete process.env.BB_ALLOW_NON_TEST_DB;
    try {
      const code = await mod.runParity(
        mod.STEPS,
        mod.parseArgs(["--only", "CI-14,CI-16"]),
        {
          runCommand: async (_argv, opts) => {
            captured.push(opts?.env);
            return { code: 0, output: "" };
          },
        },
      );
      expect(code).toBe(0);
      expect(captured).toHaveLength(2);
      for (const env of captured) {
        expect(env?.DATABASE_URL).toBe(designatedLocal);
        expect(env?.TEST_DATABASE_URL).toBe(designatedLocal);
        expect(env?.POSTGRES_URL).toBe(designatedLocal);
        expect(env?.DATABASE_URL).not.toBe(decoyAmbient);
      }
    } finally {
      if (prev === undefined) delete process.env.TEST_DATABASE_URL;
      else process.env.TEST_DATABASE_URL = prev;
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
    }
  });

  it("never prints the password on the refusal path", async () => {
    const env = { ...process.env, TEST_DATABASE_URL: secretUrl };
    delete env.BB_ALLOW_NON_TEST_DB;
    const { status, output } = await runParityCli(["--only", "CI-14"], env);
    expect(status, output).toBe(1);
    expect(output).not.toMatch(/s3cret-password/);
    expect(output).toMatch(/db\.prod\.example\.com/);
    expect(countRunLines(output)).toBe(0);
  });

  it("buildParityDbChildEnv keeps all three DB vars identical", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const env = mod.buildParityDbChildEnv(designatedLocal);
    expect(env.DATABASE_URL).toBe(designatedLocal);
    expect(env.TEST_DATABASE_URL).toBe(designatedLocal);
    expect(env.POSTGRES_URL).toBe(designatedLocal);
  });
});
