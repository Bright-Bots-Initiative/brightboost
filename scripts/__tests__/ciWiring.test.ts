import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

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

describe("CI wiring guard (#677)", () => {
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

  it("W-5: ci-cd.yml text contains npm run test:e2e:ci", () => {
    const workflow = readText(".github/workflows/ci-cd.yml");
    expect(workflow).toContain("npm run test:e2e:ci");
  });

  it('W-6: ci-cd.yml text does not contain --spec "cypress/e2e/smoke.cy.ts"', () => {
    const workflow = readText(".github/workflows/ci-cd.yml");
    expect(workflow).not.toContain('--spec "cypress/e2e/smoke.cy.ts"');
  });

  it("W-7: cypress/e2e/staging/smoke.cy.ts exists and imports requireEnv", () => {
    const stagingSmoke = path.join(
      repoRoot,
      "cypress/e2e/staging/smoke.cy.ts",
    );
    expect(existsSync(stagingSmoke)).toBe(true);
    const source = readFileSync(stagingSmoke, "utf8");
    // overview.md §5.7: "imports requireEnv" (stronger than a bare reference)
    expect(source).toMatch(
      /import\s*\{[^}]*\brequireEnv\b[^}]*\}\s*from\s*["'][^"']+["']/,
    );
  });

  // ── verify-ci-shell-gate.sh contracts (review r3598393451 / r3598393457) ──

  it("W-8: the sabotage verifier runs a HEALTHY baseline before injecting sabotage", () => {
    const script = readText("scripts/verify-ci-shell-gate.sh");
    const healthyGate = script.indexOf('HEALTHY_EC=$CYPRESS_EC');
    const healthyCheck = script.indexOf('"$HEALTHY_EC" -ne 0');
    const sabotageInjection = script.indexOf("SABOTAGE #677");
    // All three exist…
    expect(healthyGate).toBeGreaterThan(-1);
    expect(healthyCheck).toBeGreaterThan(-1);
    expect(sabotageInjection).toBeGreaterThan(-1);
    // …and the healthy run + its exit-0 requirement come BEFORE the sabotage,
    // so a missing binary / broken config / already-red baseline can never
    // masquerade as a successful sabotage (causality, r3598393451).
    expect(healthyGate).toBeLessThan(sabotageInjection);
    expect(healthyCheck).toBeLessThan(sabotageInjection);
  });

  it("W-9: the sabotage verifier never sweeps arbitrary PIDs on :5173", () => {
    const script = readText("scripts/verify-ci-shell-gate.sh");
    // No port-wide PID harvesting (r3598393457): cleanup must be scoped to
    // the process tree this script spawned (DEV_PID), never "whoever is on
    // the port".
    expect(script).not.toMatch(/lsof\s+-ti/);
    expect(script).not.toMatch(/netstat[^\n]*5173/);
    expect(script).not.toMatch(/sweep_port/);
    // The only kill target is the tracked DEV_PID tree.
    expect(script).toMatch(/kill_pid_tree\s+"\$DEV_PID"/);
  });
});
