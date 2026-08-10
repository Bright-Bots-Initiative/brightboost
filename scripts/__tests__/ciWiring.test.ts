/* @vitest-environment node */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });

function readText(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function extractCiSpecPath(testE2eCiScript: string): string {
  const match = testE2eCiScript.match(/--spec\s+"([^"]+)"/);
  if (!match) {
    throw new Error(
      `test:e2e:ci script has no --spec "…" path: ${testE2eCiScript}`,
    );
  }
  return match[1];
}

/** Matches one-liner `cy.wrap({}).log(` and multiline `cy\n  .wrap({})\n  .log(` (overview.md §5.7). */
const SILENT_SKIP_PATTERN = /cy\s*\.wrap\(\{\}\)[\s\S]*?\.log\(/;

function resolveBash(): string {
  return process.env.BB_BASH || "bash";
}

/**
 * Async bash spawn — spawnSync blocks the Vitest worker thread and trips
 * birpc "Timeout calling onTaskUpdate" on long gates (~60s+).
 */
function runBashScriptAsync(
  scriptRel: string,
  opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ status: number | null; output: string }> {
  const bash = resolveBash();
  const timeoutMs = opts.timeoutMs ?? 60_000;
  return new Promise((resolve) => {
    const child = spawn(bash, [scriptRel], {
      cwd: repoRoot,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      output += `\nspawn timeout after ${timeoutMs}ms\n`;
      resolve({ status: 124, output });
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      output += `\nspawn error: ${err.message}\n`;
      resolve({ status: 2, output });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code, output });
    });
  });
}

describe("CI wiring guard (#677 / U1-03)", { timeout: 300_000 }, () => {
  it('W-1: package.json has scripts["test:e2e:ci"]', () => {
    const pkg = JSON.parse(readText("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["test:e2e:ci"]).toEqual(expect.any(String));
    expect(pkg.scripts!["test:e2e:ci"].length).toBeGreaterThan(0);
  });

  it("W-2: test:e2e:ci --spec path exists on disk", () => {
    const pkg = JSON.parse(readText("package.json")) as {
      scripts: Record<string, string>;
    };
    const script = pkg.scripts["test:e2e:ci"];
    expect(script).toMatch(/--spec\s+"/);
    const specPath = extractCiSpecPath(script);
    expect(existsSync(path.join(repoRoot, specPath))).toBe(true);
  });

  it("W-3: CI shell spec contains no cy.wrap({})-then-.log( silent-skip pattern", () => {
    const pkg = JSON.parse(readText("package.json")) as {
      scripts: Record<string, string>;
    };
    const specPath = extractCiSpecPath(pkg.scripts["test:e2e:ci"]);
    const source = readText(specPath);
    expect(source).not.toMatch(SILENT_SKIP_PATTERN);
  });

  it("W-4: CI shell spec contains no Cypress.env(", () => {
    const pkg = JSON.parse(readText("package.json")) as {
      scripts: Record<string, string>;
    };
    const specPath = extractCiSpecPath(pkg.scripts["test:e2e:ci"]);
    const source = readText(specPath);
    expect(source).not.toMatch(/Cypress\.env\(/);
  });

  // U1-03 / G-202: execute the step-presence guard instead of reading ci-cd.yml text.
  it("W-5: verify-ci-step-presence.sh exits 0 (required steps including test:e2e:ci)", async () => {
    const { status, output } = await runBashScriptAsync(
      "scripts/verify-ci-step-presence.sh",
      { timeoutMs: 60_000 },
    );
    expect(
      status,
      `step-presence guard must exit 0 (got ${status}):\n${output}`,
    ).toBe(0);
    expect(output).toMatch(/PASS: CI step-presence guard has teeth/);
  }, 60_000);

  // Restored from pre-U1 W-6: step-presence does not cover this negative.
  it('W-6: ci-cd.yml does not contain --spec "cypress/e2e/smoke.cy.ts"', () => {
    const workflow = readText(".github/workflows/ci-cd.yml");
    expect(workflow).not.toContain('--spec "cypress/e2e/smoke.cy.ts"');
  });

  it("W-7: cypress/e2e/staging/smoke.cy.ts exists and imports requireEnv", () => {
    const stagingSmoke = path.join(repoRoot, "cypress/e2e/staging/smoke.cy.ts");
    expect(existsSync(stagingSmoke)).toBe(true);
    const source = readFileSync(stagingSmoke, "utf8");
    expect(source).toMatch(
      /import\s*\{[^}]*\brequireEnv\b[^}]*\}\s*from\s*["'][^"']+["']/,
    );
  });

  // U1-03 / G-202: execute the shell gate (healthy + sabotage inside the script).
  // Unset remapped CYPRESS_SWA_URL so Cypress matches Vite on :5173 (gate contract).
  it("W-8/W-9: verify-ci-shell-gate.sh exits 0 (two-phase healthy then sabotage)", async () => {
    const gateEnv: NodeJS.ProcessEnv = { ...process.env };
    delete gateEnv.CYPRESS_SWA_URL;
    const { status, output } = await runBashScriptAsync(
      "scripts/verify-ci-shell-gate.sh",
      { timeoutMs: 180_000, env: gateEnv },
    );
    expect(
      status,
      `CI shell gate must exit 0 (got ${status}):\n${output}`,
    ).toBe(0);
    expect(output).toMatch(/Healthy baseline GREEN/);
    expect(output).toMatch(/PASS/i);
  }, 180_000);

  // Live POSIX proof: nested bash→mid node→:5173 listener must die with the
  // tree. Skips on Windows/taskkill (that path uses //T).
  it.skipIf(process.platform === "win32")(
    "W-10: kill_pid_tree reaps nested descendants holding :5173",
    ({ skip }) => {
      const harness = path.join(
        repoRoot,
        "scripts/__tests__/kill-pid-tree-live.sh",
      );
      const result = spawnSync(resolveBash(), [harness], {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 60_000,
      });
      const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      if (result.status === 77) {
        skip();
        return;
      }
      expect(
        result.status,
        `W-10 harness failed (exit ${result.status}):\n${combined}`,
      ).toBe(0);
      expect(combined).toMatch(/W-10 PASS/);
    },
    60_000,
  );
});
