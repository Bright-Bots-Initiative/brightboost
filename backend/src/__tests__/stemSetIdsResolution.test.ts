import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * #855 wiring guard, in the shape #730 taught us.
 *
 * The Set 3 gate now reads the shared package. Vitest resolves that import
 * against TypeScript source, so a specifier that is wrong for the *emitted*
 * backend would still make every route test pass and then throw
 * MODULE_NOT_FOUND in production. Nothing else in the suite can see that.
 *
 * This test takes the specifier out of the shipped route source (so a rename
 * follows automatically) and loads it from a file at the real emit depth,
 * `backend/dist/src/routes/`.
 */
const REPO_ROOT = process.cwd();
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const ROUTE_SOURCES = [
  path.join(BACKEND_DIR, "src", "routes", "avatar.ts"),
  path.join(BACKEND_DIR, "src", "routes", "studentStats.ts"),
];
// Real emit depth for backend/src/routes/*.ts under outDir "dist" + rootDir ".".
const EMIT_DIR = path.join(BACKEND_DIR, "dist", "src", "routes");

/** The shared-package specifier each route actually ships. */
function shippedSpecifiers(): string[] {
  const found = new Set<string>();
  for (const file of ROUTE_SOURCES) {
    const source = readFileSync(file, "utf8");
    const pattern = /from "(@brightboost\/greatwork-engine[^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) found.add(match[1]);
  }
  return [...found];
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
  it("finds exactly one shared-package specifier across both routes", () => {
    expect(shippedSpecifiers()).toHaveLength(1);
  });

  // PHASE 1 — healthy. The shipped specifier loads and carries the real IDs.
  it("loads the canonical Set 3 IDs through the shipped specifier", () => {
    const [specifier] = shippedSpecifiers();
    const result = requireFromEmitDepth(specifier);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      "track-maker",
      "set3-game-2",
      "echo-avenue",
      "set3-game-4",
      "set3-game-5",
    ]);
  });

  // PHASE 2 — negative twin. Dropping `dist/` still typechecks under
  // moduleResolution "node" (it hits the .ts source inside the linked package)
  // and then fails here. Keep `dist/` in the specifier.
  it("fails when the specifier omits dist/", () => {
    const [specifier] = shippedSpecifiers();
    const withoutDist = specifier.replace("/dist/", "/");
    expect(withoutDist).not.toBe(specifier);

    const result = requireFromEmitDepth(withoutDist);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Cannot find module");
    expect(result.stderr).toContain(withoutDist);
  });
});
