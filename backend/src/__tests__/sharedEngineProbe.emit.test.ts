import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const EXPECTED_LABEL = "greatwork-engine-stub-730@0.0.0";
const OLD_BROKEN_SPECIFIER = "../../shared/dist/greatwork-engine";

const REPO_ROOT = process.cwd();
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const TSC_BIN = path.join(
  BACKEND_DIR,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);
const PKG_LINK = path.join(
  BACKEND_DIR,
  "node_modules",
  "@brightboost",
  "greatwork-engine",
);
const SHARED_TSCONFIG = path.join(REPO_ROOT, "shared", "tsconfig.json");
const EMITTED_PROBE = path.join(
  BACKEND_DIR,
  "dist",
  "src",
  "sharedEngineProbe.js",
);

/**
 * #730 review regression. The defect Nathan found lives ONLY in emitted output:
 * with `outDir: "dist"` + `rootDir: "."`, `backend/src/x.ts` emits to
 * `backend/dist/src/x.js`, one level deeper, so any relative specifier out of
 * `backend/` is off by exactly one. TypeScript never rewrites relative specifiers.
 *
 * A test that imports the SOURCE cannot see this. This one compiles the probe to
 * its real emit depth and requires the emitted artifact in a child Node process.
 */
describe("sharedEngineProbe emitted-artifact resolution", () => {
  // Two intentional `tsc` invocations (shared + probe emit). Default hookTimeout
  // (10s) is too low under a full parallel unit suite; this is sized for the work,
  // not a flake waiver (G-006).
  beforeAll(() => {
    // Fail loudly — never skip (G-017, proxy row 17).
    if (!existsSync(BACKEND_DIR)) {
      throw new Error(
        `Expected repo root as cwd; got "${REPO_ROOT}". Run Vitest from the repo root.`,
      );
    }
    if (!existsSync(PKG_LINK)) {
      throw new Error(
        "Missing backend/node_modules/@brightboost/greatwork-engine. " +
          "Run: cd backend ; npm ci",
      );
    }
    if (!existsSync(TSC_BIN)) {
      throw new Error("Missing backend TypeScript. Run: cd backend ; npm ci");
    }
    // Build shared/dist (idempotent) so package `main`/`types` resolve.
    execFileSync(process.execPath, [TSC_BIN, "-p", SHARED_TSCONFIG], {
      cwd: BACKEND_DIR,
      stdio: "pipe",
    });
    // Emit the probe at its REAL depth: backend/dist/src/sharedEngineProbe.js
    execFileSync(
      process.execPath,
      [
        TSC_BIN,
        "src/sharedEngineProbe.ts",
        "--rootDir",
        ".",
        "--outDir",
        "dist",
        "--module",
        "commonjs",
        "--target",
        "ES2019",
        "--moduleResolution",
        "node",
        "--esModuleInterop",
        "--skipLibCheck",
      ],
      { cwd: BACKEND_DIR, stdio: "pipe" },
    );
  }, 60_000);

  it("emits the probe to backend/dist/src/ (the real S-2 depth)", () => {
    expect(existsSync(EMITTED_PROBE)).toBe(true);
  });

  // PHASE 1 — healthy. The emitted artifact must load and produce the label.
  it("resolves the shared engine when the EMITTED artifact is required", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "-e",
        "process.stdout.write(String(require('./dist/src/sharedEngineProbe.js').sharedEngineProbeLabel))",
      ],
      { cwd: BACKEND_DIR, encoding: "utf8" },
    );
    expect(stdout).toBe(EXPECTED_LABEL);
  });

  // PHASE 2 — negative twin. The old relative specifier MUST fail at this depth.
  it("fails at this emit depth when the old relative specifier is used", () => {
    const sabotage = path.join(
      BACKEND_DIR,
      "dist",
      "src",
      "__depthProbe.check.js",
    );
    mkdirSync(path.dirname(sabotage), { recursive: true });
    writeFileSync(
      sabotage,
      `module.exports = require(${JSON.stringify(OLD_BROKEN_SPECIFIER)});\n`,
    );
    // Prove the sabotage actually happened (the `removedCount > 0` pattern).
    expect(existsSync(sabotage)).toBe(true);

    let stderr = "";
    let exitCode = 0;
    try {
      execFileSync(
        process.execPath,
        ["-e", "require('./dist/src/__depthProbe.check.js')"],
        { cwd: BACKEND_DIR, stdio: "pipe" },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: Buffer };
      exitCode = e.status ?? 1;
      stderr = e.stderr?.toString() ?? "";
    } finally {
      rmSync(sabotage, { force: true });
    }

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Cannot find module");
    expect(stderr).toContain(OLD_BROKEN_SPECIFIER);
  });
});
