import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * #855 wiring guard, in the shape #730 taught us.
 *
 * The backend reads the canon through
 * `@brightboost/greatwork-engine/dist/progression/stemSetIds` — an
 * emitted-artifact specifier. It resolves `shared/dist/**` in every context,
 * Vitest included: the backend half of the suite consumes the BUILT artifact
 * while the frontend half consumes the source through the `@shared` alias. So
 * a stale or half-written `shared/dist` makes the two halves disagree about
 * who may specialize, and a specifier that is wrong for the emitted layout
 * throws MODULE_NOT_FOUND only in production. Nothing else in the suite can
 * see either failure.
 *
 * #720 now verifies shared/dist without rebuilding it in each parallel worker.
 * Freshness is checked by scripts/verify-shared-freshness.mjs; this suite keeps
 * owning the real emitted-depth resolution and wrong-specifier regression.
 * Explicitly run npm run build:shared before tests after changing shared code.
 *
 * `@shared/*` is deliberately NOT used here: `backend/tsconfig.json` carries
 * no such path, and the boundary is that the backend consumes the built
 * artifact rather than the source.
 *
 * 10-testing says fixtures go in `mkdtemp`. Justified exception: real emit
 * depth is the whole property under test, so the probe must live under
 * `backend/dist/` — which is gitignored, and each probe is removed in a
 * `finally`, so the tracked tree is never touched.
 */
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
const SHARED_VERIFY = path.join(
  REPO_ROOT,
  "scripts",
  "verify-shared-freshness.mjs",
);
const EMITTED_CANON = path.join(
  REPO_ROOT,
  "shared",
  "dist",
  "progression",
  "stemSetIds.js",
);

/** The one specifier the backend must ship. */
const EXPECTED_SPECIFIER =
  "@brightboost/greatwork-engine/dist/progression/stemSetIds";

const ROUTE_SOURCES = [
  path.join(BACKEND_DIR, "src", "routes", "avatar.ts"),
  path.join(BACKEND_DIR, "src", "routes", "studentStats.ts"),
];
// Real emit depth for backend/src/routes/*.ts under outDir "dist" + rootDir ".".
const EMIT_DIR = path.join(BACKEND_DIR, "dist", "src", "routes");

type Canon =
  typeof import("@brightboost/greatwork-engine/dist/progression/stemSetIds");
let canon: Canon;

/** Shared-package specifiers, per route file. */
function shippedSpecifiers(): { file: string; specifiers: string[] }[] {
  return ROUTE_SOURCES.map((file) => {
    const source = readFileSync(file, "utf8");
    const pattern = /from "(@brightboost\/greatwork-engine[^"]*)"/g;
    const specifiers: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);
    return { file, specifiers };
  });
}

function requireFromEmitDepth(specifier: string): {
  status: number;
  stdout: string;
  stderr: string;
} {
  mkdirSync(EMIT_DIR, { recursive: true });
  const probe = path.join(EMIT_DIR, "__stemSetIdsResolution.check.js");
  writeFileSync(
    probe,
    "const m = require(" +
      JSON.stringify(specifier) +
      ");\nprocess.stdout.write(JSON.stringify(m.STEM_SET_3_IDS));\n",
  );
  // Prove the sabotage/probe actually landed before drawing conclusions from it.
  expect(existsSync(probe)).toBe(true);
  try {
    const stdout = execFileSync(process.execPath, [probe], {
      cwd: BACKEND_DIR,
      encoding: "utf8",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.toString() ?? "",
      stderr: e.stderr?.toString() ?? "",
    };
  } finally {
    rmSync(probe, { force: true });
  }
}

describe("shared set-ID module resolves from the backend's emit depth", () => {
  // Fail loudly on a bad environment — never skip (G-017).
  beforeAll(async () => {
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
    // #720: compare fresh temporary emit; do not rewrite shared/dist from a
    // parallel test worker. The root build command owns canonical compilation.
    execFileSync(process.execPath, [SHARED_VERIFY], {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    if (!existsSync(EMITTED_CANON)) {
      throw new Error(
        `build:shared did not emit ${EMITTED_CANON}. Check shared/tsconfig.json include.`,
      );
    }
    canon =
      await import("@brightboost/greatwork-engine/dist/progression/stemSetIds");
  }, 60_000);

  it("ships the emitted-artifact specifier in every route that reads the canon", () => {
    for (const { file, specifiers } of shippedSpecifiers()) {
      const label = path.relative(REPO_ROOT, file);
      expect(
        specifiers,
        `${label} must import the shared canon exactly once`,
      ).toHaveLength(1);
      expect(
        specifiers[0],
        `${label} must use the emitted-artifact specifier`,
      ).toBe(EXPECTED_SPECIFIER);
    }
  });

  // PHASE 1 — healthy. The shipped specifier loads at emit depth and yields
  // the canon, compared against the imported constant rather than a literal.
  it("loads the canonical Set 3 IDs through the shipped specifier", () => {
    const specifier = shippedSpecifiers()[0].specifiers[0];
    const result = requireFromEmitDepth(specifier);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([...canon.STEM_SET_3_IDS]);
  });

  // PHASE 2 — negative twin. Dropping `dist/` still typechecks under
  // moduleResolution "node" (it hits the .ts source inside the linked package)
  // and then fails here. Keep `dist/` in the specifier.
  it("fails when the specifier omits dist/", () => {
    const specifier = shippedSpecifiers()[0].specifiers[0];
    const withoutDist = specifier.replace("/dist/", "/");
    expect(withoutDist).not.toBe(specifier);

    const result = requireFromEmitDepth(withoutDist);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Cannot find module");
    expect(result.stderr).toContain(withoutDist);
  });
});
