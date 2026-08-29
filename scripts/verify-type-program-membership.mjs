/**
 * verify-type-program-membership.mjs — Prove type-level guards are inside the
 * root tsc program (W-12 / G-008 / §5.8).
 *
 * Phase 1 (healthy): `tsc --noEmit --listFiles` must list every manifest path.
 * Phase 2 (sabotage): treat an excluded-path file as a required guard; require
 *   non-zero naming the file and the excluding pattern.
 *
 * Repository safety (#815): phase 2's probe file is written into a disposable
 * sandbox that is built BEFORE any sabotage exists, and the target is resolved
 * through the sandbox (which refuses anything outside it) rather than joined
 * onto REPO_ROOT. Phase 1 still compiles the checkout — read-only — and phase 2
 * compiles the sandbox copy, additionally requiring the manifest files to be
 * present there so an incomplete sandbox cannot false-PASS with an empty
 * program. The previous write-then-`finally`-delete was restorative, and no
 * `finally` runs on SIGKILL (nor on the hard kill Vitest/CI issue at timeout):
 * it stranded src/test/__type_guard_sabotage__.ts as an untracked file in the
 * caller's checkout.
 *
 * Exit 0 = both phases OK.
 * Exit 1 = property false.
 * Exit 2 = could not run.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGuardSandbox } from "./lib/guard-sandbox.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
export const MANIFEST = path.join(__dirname, "type-guard-manifest.json");

export const EXIT_OK = 0;
export const EXIT_PROPERTY = 1;
export const EXIT_CANNOT_RUN = 2;

/** Excluded-path probe. Relative on purpose: it is resolved inside the sandbox. */
export const SABOTAGE_REL = "src/test/__type_guard_sabotage__.ts";
export const EXCLUDING_PATTERN = "src/test (root tsconfig.json exclude)";
const SABOTAGE_SOURCE =
  "// intentional excluded-path probe for verify-type-program-membership\nexport {};\n";

/** Property is false (exit 1). */
class PropertyFalse extends Error {}
/** Cannot check (exit 2). */
class CannotRun extends Error {}

/** @param {unknown} err */
function messageOf(err) {
  return err instanceof Error ? err.message : String(err);
}

/** @param {string} listOutput @param {string} rel */
export function normalizeRel(rel) {
  return rel.replace(/\\/g, "/");
}

/** @param {string} listOutput @param {string} rel */
export function isListed(listOutput, rel) {
  return listOutput.replace(/\\/g, "/").includes(normalizeRel(rel));
}

/**
 * @param {string} listOutput
 * @param {string[]} files
 * @returns {string[]} missing relative paths
 */
export function assertPresent(listOutput, files) {
  const missing = [];
  for (const rel of files) {
    if (!isListed(listOutput, rel)) missing.push(rel);
  }
  return missing;
}

/**
 * Compile `root` and return the `--listFiles` output. `root` is the checkout in
 * phase 1 and the disposable sandbox in phase 2; neither is written to here.
 * @param {string} root
 */
export function listFiles(root = REPO_ROOT) {
  const tscJs = path.join(root, "node_modules/typescript/bin/tsc");
  const result = spawnSync(
    process.execPath,
    [tscJs, "--noEmit", "--listFiles"],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    },
  );
  const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!out.trim()) {
    throw new CannotRun(
      `tsc --listFiles produced no output (status=${result.status})`,
    );
  }
  return out.replace(/\\/g, "/");
}

/**
 * tsc only needs the program sources, the root tsconfig files and the type
 * packages — `public/` is not part of the program, so it is not linked.
 * @param {{ repoRoot: string, env?: NodeJS.ProcessEnv }} opts
 */
function defaultCreateSandbox({ repoRoot, env }) {
  return createGuardSandbox({
    repoRoot,
    prefix: "bb815-type-",
    copyDirs: ["src", "shared"],
    linkDirs: ["node_modules"],
    env,
  });
}

/**
 * @param {{
 *   repoRoot?: string,
 *   env?: NodeJS.ProcessEnv,
 *   listFiles?: (root: string) => string,
 *   createSandbox?: (opts: { repoRoot: string, env: NodeJS.ProcessEnv }) => import("./lib/guard-sandbox.mjs").GuardSandbox,
 * }} [deps]
 * @returns {number} exit code
 */
export function runTypeProgramMembership(deps = {}) {
  const {
    repoRoot = REPO_ROOT,
    env = process.env,
    listFiles: listFilesImpl = listFiles,
    createSandbox = defaultCreateSandbox,
  } = deps;

  try {
    const manifestPath = env.TYPE_GUARD_MANIFEST || MANIFEST;
    if (!existsSync(manifestPath)) {
      throw new CannotRun(`missing manifest ${manifestPath}`);
    }

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (err) {
      throw new CannotRun(
        `unreadable manifest ${manifestPath}: ${messageOf(err)}`,
      );
    }
    const guardFiles = manifest.guardFiles;
    if (!Array.isArray(guardFiles) || guardFiles.length === 0) {
      throw new CannotRun("type-guard-manifest.json has no guardFiles");
    }

    console.log(
      "[verify-type-program-membership] Phase 1/2 — healthy manifest files (expect present)…",
    );
    const list = listFilesImpl(repoRoot);
    const healthyMissing = assertPresent(list, guardFiles);
    if (healthyMissing.length > 0) {
      throw new PropertyFalse(
        `guard file(s) absent from tsc program: ${healthyMissing.join(", ")} (check tsconfig include/exclude)`,
      );
    }
    for (const rel of guardFiles) {
      console.log(`  present: ${rel}`);
    }
    console.log("[verify-type-program-membership] Healthy phase PASS.");

    // Built before the probe exists, so there is no window in which the
    // checkout is the sabotage target (#815).
    let sandbox;
    try {
      sandbox = createSandbox({ repoRoot, env });
    } catch (err) {
      throw new CannotRun(
        `could not build the sabotage sandbox: ${messageOf(err)}`,
      );
    }

    try {
      let sabotageAbs;
      try {
        sabotageAbs = sandbox.resolve(SABOTAGE_REL);
      } catch (err) {
        throw new CannotRun(
          `refusing to write the excluded-path probe: ${messageOf(err)}`,
        );
      }
      mkdirSync(path.dirname(sabotageAbs), { recursive: true });
      writeFileSync(sabotageAbs, SABOTAGE_SOURCE);

      console.log(
        "[verify-type-program-membership] Phase 2/2 — excluded-path guard (expect ABSENT / non-zero)…",
      );
      const list2 = listFilesImpl(sandbox.root);
      const sandboxMissing = assertPresent(list2, guardFiles);
      if (sandboxMissing.length > 0) {
        // Without this, an empty or partial sandbox program would report the
        // probe "absent" and PASS for the wrong reason.
        throw new CannotRun(
          `sandbox program did not reproduce manifest file(s): ${sandboxMissing.join(", ")} — an absent probe would prove nothing`,
        );
      }
      if (isListed(list2, SABOTAGE_REL)) {
        throw new PropertyFalse(
          `excluded guard unexpectedly present in tsc program: ${SABOTAGE_REL}`,
        );
      }
      console.log(
        `ABSENT (expected): ${SABOTAGE_REL} — excluding pattern: ${EXCLUDING_PATTERN}`,
      );
      console.log(
        "============================================================",
      );
      console.log("  PASS: type-program membership guard has teeth.");
      console.log("  Healthy:   manifest files present in tsc --listFiles");
      console.log(`  Sabotage:  ${SABOTAGE_REL} absent (${EXCLUDING_PATTERN})`);
      console.log(
        "============================================================",
      );
      return EXIT_OK;
    } finally {
      // Teardown must never decide the verdict (#814): a failed rm leaves temp
      // residue, not a repository change.
      try {
        sandbox.dispose();
      } catch (err) {
        console.error(
          `[verify-type-program-membership] sandbox cleanup failed (temp residue only): ${messageOf(err)}`,
        );
      }
    }
  } catch (err) {
    if (err instanceof PropertyFalse) {
      console.error(`FAIL: ${err.message}`);
      return EXIT_PROPERTY;
    }
    console.error(`ERROR: ${messageOf(err)}`);
    return EXIT_CANNOT_RUN;
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exit(runTypeProgramMembership());
}
