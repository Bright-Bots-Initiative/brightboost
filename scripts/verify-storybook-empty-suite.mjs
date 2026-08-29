// scripts/verify-storybook-empty-suite.mjs
// W-06: an empty Storybook suite cannot report green.  #749, closes #707.
// Two-phase: healthy (count > 0) then sabotage (count === 0 must be detected).
// Exit 0 = property holds · 1 = property false · 2 = could not check.
//
// Repository safety (#815): the sabotage is never written into the caller's
// checkout. A disposable sandbox is built BEFORE either phase, the target is
// resolved through it (anything outside is refused), and both phases run there
// — so, exactly as in verify-ci-shell-gate.sh (#801/#814), the only difference
// between them is still the patched `stories:` glob. This is structural rather
// than a restore-on-exit: `.storybook/main.ts` is TRACKED, and no `finally` or
// signal handler runs on SIGKILL (nor on the hard kill Vitest/CI issue at
// timeout), so the old in-place edit could leave a modified tracked file in the
// developer's tree. A healthy count of 0 — which is what an incomplete sandbox
// would produce — fails loudly as "collected 0 tests"; it can never be mistaken
// for successful sabotage.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGuardSandbox } from "./lib/guard-sandbox.mjs";

export const EXIT_OK = 0;
export const EXIT_FALSE = 1;
export const EXIT_CANNOT_CHECK = 2;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
/** Relative on purpose: it is resolved inside the sandbox, never joined onto the checkout. */
export const STORYBOOK_MAIN_REL = ".storybook/main.ts";
export const STORYBOOK_MAIN = path.join(REPO_ROOT, ".storybook", "main.ts");
export const SKIP_WARNING_PREFIX =
  "[vitest.workspace] Skipping Storybook project (#707)";

const NO_MATCH_GLOB = '["../src/**/__bb749_no_such_story__.stories.tsx"]';

export class CannotCheck extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "CannotCheck";
  }
}

/**
 * W-13 — refuse BB_VITEST_PATH_HAS_SPACE under CI (presence, not truthiness).
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
export function refuseOverrideUnderCI(env = process.env) {
  const underCI = Boolean(env.CI || env.GITHUB_ACTIONS);
  const overridePresent = Object.hasOwn(env, "BB_VITEST_PATH_HAS_SPACE");
  if (underCI && overridePresent) {
    return (
      `BB_VITEST_PATH_HAS_SPACE is set (value: ${JSON.stringify(env.BB_VITEST_PATH_HAS_SPACE)}) ` +
      `under CI. vitest.workspace.ts documents it as local-only. Setting it on a runner can skip ` +
      `the Storybook project entirely while the job reports green (#749 W-13). Unset it.`
    );
  }
  return null;
}

/**
 * @param {string} original
 * @returns {string}
 */
export function sabotageStories(original) {
  const re = /stories:\s*\[[^\]]*\]/;
  if (!re.test(original)) {
    throw new CannotCheck(
      "`.storybook/main.ts` has no recognizable `stories:` array",
    );
  }
  return original.replace(re, `stories: ${NO_MATCH_GLOB}`);
}

/**
 * Parse Vitest JSON reporter output for collected test count (OQ-17: numTotalTests).
 * @param {string} jsonText
 * @returns {number}
 */
export function parseCollectedCount(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new CannotCheck("Storybook JSON reporter output is unparseable");
  }
  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !Object.hasOwn(parsed, "numTotalTests") ||
    typeof parsed.numTotalTests !== "number" ||
    !Number.isFinite(parsed.numTotalTests)
  ) {
    throw new CannotCheck(
      "Storybook JSON reporter output missing numeric numTotalTests",
    );
  }
  return parsed.numTotalTests;
}

/**
 * @param {number} count
 * @returns {typeof EXIT_OK | typeof EXIT_FALSE}
 */
export function exitForHealthyCount(count) {
  return count > 0 ? EXIT_OK : EXIT_FALSE;
}

/**
 * @param {number} healthyCount
 * @param {number} sabotagedCount
 * @returns {"pass" | "false" | "cannot-check"}
 */
export function classifySabotageResult(healthyCount, sabotagedCount) {
  if (sabotagedCount === healthyCount) return "cannot-check";
  if (sabotagedCount === 0) return "pass";
  return "false";
}

/**
 * Detect "project not found" from Vitest CLI stderr/stdout (OQ-16).
 * String match verified against Vitest ^3.1.3 — Vitest exposes no structured
 * signal for an unregistered project; upgrade may break mode detection (G-021).
 * @param {string} combined
 * @returns {boolean}
 */
export function isProjectNotFound(combined) {
  return (
    /No projects were found/i.test(combined) ||
    /No projects matched the filter/i.test(combined) ||
    /filter matched no projects/i.test(combined)
  );
}

/**
 * @param {string} stderr
 * @returns {boolean}
 */
export function hasSkipWarning(stderr) {
  return stderr.includes(SKIP_WARNING_PREFIX);
}

/**
 * Path has a space (or override forces it). Mirrors vitest.workspace.ts semantics
 * for the guard's mode table — does not edit that file.
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function pathHasSpace(env = process.env, cwd = process.cwd()) {
  const override = env.BB_VITEST_PATH_HAS_SPACE;
  if (override === "1") return true;
  if (override === "0") return false;
  return REPO_ROOT.includes(" ") || cwd.includes(" ");
}

/**
 * @param {{ projectNotFound: boolean; warningPresent: boolean; pathHasSpace: boolean; count: number | null; parseError: boolean; browserMissing: boolean }} obs
 * @returns {{ mode: "count" | "announced-skip" | null; exit: number | null; reason?: string }}
 */
export function selectMode(obs) {
  if (obs.browserMissing || obs.parseError) {
    return {
      mode: null,
      exit: EXIT_CANNOT_CHECK,
      reason: obs.browserMissing
        ? "playwright chromium not installed"
        : "Storybook JSON reporter output unparseable or missing",
    };
  }
  if (obs.projectNotFound) {
    if (obs.pathHasSpace) {
      if (obs.warningPresent) {
        return { mode: "announced-skip", exit: null };
      }
      // Silent skip: unregistered on a spaced path without the #707 warning.
      // §7: property false → exit 1 (not "could not check").
      return {
        mode: null,
        exit: EXIT_FALSE,
        reason:
          "storybook project unregistered on a spaced path without announced skip warning (silent skip)",
      };
    }
    return {
      mode: null,
      exit: EXIT_FALSE,
      reason: "storybook project unregistered on a space-free path",
    };
  }
  if (obs.count === null) {
    return {
      mode: null,
      exit: EXIT_CANNOT_CHECK,
      reason: "could not determine collected count",
    };
  }
  return { mode: "count", exit: null };
}

/**
 * @param {string} message
 */
function logLine(message) {
  console.log(`[storybook-empty-suite] ${message}`);
}

/**
 * @param {string} value
 * @returns {string}
 */
function shellQuote(value) {
  // spawnSync(..., { shell: true }) joins argv with spaces; quote paths (G-011).
  if (!/[ \t"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {string} outputFile
 * @param {string} cwd — the sandbox root; never the checkout once sabotage exists
 */
function runStorybookVitest(env, outputFile, cwd) {
  const result = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "--project",
      "storybook",
      "--reporter=json",
      `--outputFile=${shellQuote(outputFile)}`,
    ],
    {
      cwd,
      encoding: "utf8",
      env,
      shell: true,
      windowsHide: true,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

/**
 * @param {string} combined
 * @returns {boolean}
 */
function looksLikeMissingBrowser(combined) {
  return (
    /Executable doesn't exist/i.test(combined) ||
    /browserType\.launch/i.test(combined) ||
    /Please run the following command to download new browsers/i.test(
      combined,
    ) ||
    /playwright.*install/i.test(combined)
  );
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{
 *   projectNotFound: boolean;
 *   warningPresent: boolean;
 *   count: number | null;
 *   parseError: boolean;
 *   browserMissing: boolean;
 *   stderr: string;
 *   stdout: string;
 *   outputFile: string;
 *   tmpDir: string;
 * }}
 */
function probeStorybook(env, cwd = REPO_ROOT) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "bb749-sb-"));
  const outputFile = path.join(tmpDir, "storybook.json");
  const run = runStorybookVitest(env, outputFile, cwd);
  const combined = `${run.stdout}\n${run.stderr}`;
  const warningPresent = hasSkipWarning(run.stderr);
  const projectNotFound = isProjectNotFound(combined);
  const browserMissing = looksLikeMissingBrowser(combined);

  let count = null;
  let parseError = false;
  if (existsSync(outputFile)) {
    try {
      const text = readFileSync(outputFile, "utf8");
      if (text.trim()) {
        count = parseCollectedCount(text);
      } else if (!projectNotFound) {
        parseError = true;
      }
    } catch (err) {
      if (err instanceof CannotCheck) {
        parseError = true;
      } else {
        throw err;
      }
    }
  } else if (!projectNotFound && !browserMissing) {
    // Vitest may fail before writing JSON when the project is missing; that is
    // handled via projectNotFound. Otherwise missing output is uncheckable.
    if (run.status !== 0 && !isProjectNotFound(combined)) {
      // Still try: some failures leave no file
      parseError = !warningPresent;
    }
  }

  return {
    projectNotFound,
    warningPresent,
    count,
    parseError: parseError && !projectNotFound,
    browserMissing,
    stderr: run.stderr,
    stdout: run.stdout,
    outputFile,
    tmpDir,
  };
}

/**
 * Disposable tree both phases are served from. Storybook needs the stories
 * (`src/`), the config dir it patches (`.storybook/`) and the root vite/vitest
 * configs; `node_modules` and `public` are linked because copying them costs
 * hundreds of megabytes.
 *
 * `matchPathSpace` is required here: vitest.workspace.ts registers the Storybook
 * project based on whether the *running* path contains a space (#707), so a
 * sandbox whose space-ness differed from the checkout would silently move the
 * guard into another row of its own mode table.
 *
 * @param {{ repoRoot: string, env?: NodeJS.ProcessEnv }} opts
 */
function defaultCreateSandbox({ repoRoot, env }) {
  return createGuardSandbox({
    repoRoot,
    prefix: "bb815-sb-",
    copyDirs: ["src", "shared", ".storybook"],
    linkDirs: ["node_modules", "public"],
    matchPathSpace: true,
    env,
  });
}

/** @param {unknown} err */
function messageOf(err) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * @param {{ tmpDir?: string } | null | undefined} probe
 */
function dropProbeTmp(probe) {
  if (!probe?.tmpDir) return;
  try {
    rmSync(probe.tmpDir, { recursive: true, force: true });
  } catch {
    // ignore temp cleanup
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{
 *   repoRoot?: string,
 *   probe?: (env: NodeJS.ProcessEnv, cwd: string) => ReturnType<typeof probeStorybook>,
 *   createSandbox?: (opts: { repoRoot: string, env: NodeJS.ProcessEnv }) => import("./lib/guard-sandbox.mjs").GuardSandbox,
 * }} [deps]
 * @returns {number}
 */
export function runStorybookEmptySuiteGuard(env = process.env, deps = {}) {
  const {
    repoRoot = REPO_ROOT,
    probe: probeImpl = probeStorybook,
    createSandbox = defaultCreateSandbox,
  } = deps;

  const refusal = refuseOverrideUnderCI(env);
  if (refusal) {
    logLine(`mode=w13-refusal → FAIL: ${refusal}`);
    return EXIT_FALSE;
  }

  const spaced = pathHasSpace(env);

  // Built before either phase, so no window exists in which the checkout is the
  // sabotage target (#815).
  let sandbox;
  try {
    sandbox = createSandbox({ repoRoot, env });
  } catch (err) {
    logLine(
      `CANNOT CHECK: could not build the sabotage sandbox: ${messageOf(err)}`,
    );
    return EXIT_CANNOT_CHECK;
  }

  try {
    return runPhases({ env, spaced, sandbox, probeImpl });
  } finally {
    // Teardown must never decide the verdict (#814): a failed removal leaves
    // temp residue, never a repository change.
    try {
      sandbox.dispose();
    } catch (err) {
      console.error(
        `[storybook-empty-suite] sandbox cleanup failed (temp residue only): ${messageOf(err)}`,
      );
    }
  }
}

/**
 * Both phases run in the sandbox; the only difference between them is the
 * patched `stories:` glob.
 * @param {{
 *   env: NodeJS.ProcessEnv,
 *   spaced: boolean,
 *   sandbox: import("./lib/guard-sandbox.mjs").GuardSandbox,
 *   probeImpl: (env: NodeJS.ProcessEnv, cwd: string) => ReturnType<typeof probeStorybook>,
 * }} args
 * @returns {number}
 */
function runPhases({ env, spaced, sandbox, probeImpl }) {
  let sabotageTarget;
  try {
    sabotageTarget = sandbox.resolve(STORYBOOK_MAIN_REL);
  } catch (err) {
    logLine(
      `CANNOT CHECK: refusing to patch ${STORYBOOK_MAIN_REL}: ${messageOf(err)}`,
    );
    return EXIT_CANNOT_CHECK;
  }

  let probe;
  try {
    probe = probeImpl(env, sandbox.root);
  } catch (err) {
    logLine(`CANNOT CHECK: ${messageOf(err)}`);
    return EXIT_CANNOT_CHECK;
  }

  try {
    const decision = selectMode({
      projectNotFound: probe.projectNotFound,
      warningPresent: probe.warningPresent,
      pathHasSpace: spaced,
      count: probe.count,
      parseError: probe.parseError,
      browserMissing: probe.browserMissing,
    });

    if (decision.exit === EXIT_CANNOT_CHECK) {
      logLine(`CANNOT CHECK: ${decision.reason ?? "unknown"}`);
      return EXIT_CANNOT_CHECK;
    }
    if (decision.exit === EXIT_FALSE) {
      logLine(
        `mode=${decision.mode ?? "none"} → FAIL: ${decision.reason ?? "property false"}`,
      );
      return EXIT_FALSE;
    }

    if (decision.mode === "announced-skip") {
      logLine(`mode=announced-skip warning=present registered=false → PASS`);
      return EXIT_OK;
    }

    // count mode
    const healthyCount = probe.count;
    if (healthyCount === null) {
      logLine(`CANNOT CHECK: could not determine collected count`);
      return EXIT_CANNOT_CHECK;
    }
    if (healthyCount === 0) {
      logLine(
        `mode=count healthy=0 → FAIL: Storybook project collected 0 tests`,
      );
      return EXIT_FALSE;
    }

    if (!existsSync(sabotageTarget)) {
      logLine(`CANNOT CHECK: .storybook/main.ts is missing`);
      return EXIT_CANNOT_CHECK;
    }

    const original = readFileSync(sabotageTarget, "utf8");
    let sabotaged;
    try {
      sabotaged = sabotageStories(original);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logLine(`CANNOT CHECK: ${msg}`);
      return EXIT_CANNOT_CHECK;
    }

    let sabotagedCount;
    /** @type {{ tmpDir: string } | null} */
    let sabProbe = null;
    /** @type {number} */
    let phaseExit = EXIT_CANNOT_CHECK;
    try {
      // Sandbox copy only — $REPO_ROOT/.storybook/main.ts is opened for reading
      // nowhere in this function, and never for writing (#815). Nothing is
      // restored afterwards because nothing in the checkout was touched.
      writeFileSync(sabotageTarget, sabotaged, "utf8");
      sabProbe = probeImpl(env, sandbox.root);
      if (sabProbe.parseError || sabProbe.browserMissing) {
        logLine(
          `CANNOT CHECK: ${sabProbe.browserMissing ? "playwright chromium not installed" : "sabotage-phase JSON unparseable"}`,
        );
        phaseExit = EXIT_CANNOT_CHECK;
      } else if (sabProbe.projectNotFound) {
        // After a stories-glob patch the project must still be registered.
        // Treating "not found" as count 0 would false-PASS a broken workspace.
        logLine(
          `CANNOT CHECK: sabotage phase lost the storybook project (unexpected unregister)`,
        );
        phaseExit = EXIT_CANNOT_CHECK;
      } else if (sabProbe.count === null) {
        logLine(`CANNOT CHECK: sabotage phase produced no countable output`);
        phaseExit = EXIT_CANNOT_CHECK;
      } else {
        sabotagedCount = sabProbe.count;
        const classification = classifySabotageResult(
          healthyCount,
          sabotagedCount,
        );
        if (classification === "cannot-check") {
          logLine(
            `mode=count healthy=${healthyCount} sabotaged=${sabotagedCount} → CANNOT CHECK: sabotage was a no-op`,
          );
          phaseExit = EXIT_CANNOT_CHECK;
        } else if (classification === "false") {
          logLine(
            `mode=count healthy=${healthyCount} sabotaged=${sabotagedCount} → FAIL: sabotage did not empty the suite`,
          );
          phaseExit = EXIT_FALSE;
        } else {
          logLine(
            `mode=count healthy=${healthyCount} sabotaged=${sabotagedCount} → PASS`,
          );
          phaseExit = EXIT_OK;
        }
      }
    } finally {
      dropProbeTmp(sabProbe);
    }
    // G-020 previously escalated a failed restore to CANNOT CHECK because a
    // half-restored checkout made the verdict meaningless. There is no restore
    // to fail now: the sabotage lives in a disposable tree, so the phase verdict
    // stands on its own and cleanup cannot flip it.
    return phaseExit;
  } finally {
    dropProbeTmp(probe);
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  let code;
  try {
    code = runStorybookEmptySuiteGuard(process.env);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[storybook-empty-suite] CANNOT CHECK: ${msg}`);
    code = EXIT_CANNOT_CHECK;
  }
  process.exit(code);
}
