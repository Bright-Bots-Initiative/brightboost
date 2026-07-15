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
});
