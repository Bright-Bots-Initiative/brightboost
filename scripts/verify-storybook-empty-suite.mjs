// scripts/verify-storybook-empty-suite.mjs
// W-06: an empty Storybook suite cannot report green.  #749, closes #707.
// Two-phase: healthy (count > 0) then sabotage (count === 0 must be detected).
// Exit 0 = property holds · 1 = property false · 2 = could not check.

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

export const EXIT_OK = 0;
export const EXIT_FALSE = 1;
export const EXIT_CANNOT_CHECK = 2;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
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
 */
function runStorybookVitest(env, outputFile) {
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
      cwd: REPO_ROOT,
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
function probeStorybook(env) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "bb749-sb-"));
  const outputFile = path.join(tmpDir, "storybook.json");
  const run = runStorybookVitest(env, outputFile);
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
 * @param {() => void} restore
 * @returns {() => void} uninstall
 */
function installSignalRestore(restore) {
  /** @type {NodeJS.Signals[]} */
  const signals = ["SIGINT", "SIGTERM"];
  /** @type {Map<NodeJS.Signals, () => void>} */
  const handlers = new Map();

  for (const sig of signals) {
    const handler = () => {
      try {
        restore();
      } catch {
        // best-effort before re-raise
      }
      // Re-raise: uninstall first so we do not recurse into this handler.
      process.off(sig, handler);
      handlers.delete(sig);
      if (process.listenerCount(sig) === 0) {
        // Default: terminate. 128+signal is conventional for shell traps.
        process.exit(128);
      } else {
        process.kill(process.pid, sig);
      }
    };
    handlers.set(sig, handler);
    process.on(sig, handler);
  }

  return () => {
    for (const [sig, handler] of handlers) {
      process.off(sig, handler);
    }
    handlers.clear();
  };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function runStorybookEmptySuiteGuard(env = process.env) {
  const refusal = refuseOverrideUnderCI(env);
  if (refusal) {
    logLine(`mode=w13-refusal → FAIL: ${refusal}`);
    return EXIT_FALSE;
  }

  const spaced = pathHasSpace(env);
  let probe;
  try {
    probe = probeStorybook(env);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logLine(`CANNOT CHECK: ${msg}`);
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

    if (!existsSync(STORYBOOK_MAIN)) {
      logLine(`CANNOT CHECK: .storybook/main.ts is missing`);
      return EXIT_CANNOT_CHECK;
    }

    const original = readFileSync(STORYBOOK_MAIN, "utf8");
    let sabotaged;
    try {
      sabotaged = sabotageStories(original);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logLine(`CANNOT CHECK: ${msg}`);
      return EXIT_CANNOT_CHECK;
    }

    const restore = () => {
      writeFileSync(STORYBOOK_MAIN, original, "utf8");
      const after = readFileSync(STORYBOOK_MAIN, "utf8");
      if (after !== original) {
        throw new CannotCheck(
          "restore of .storybook/main.ts failed byte-equality check",
        );
      }
    };

    const uninstallSignals = installSignalRestore(restore);
    let sabotagedCount;
    /** @type {{ tmpDir: string } | null} */
    let sabProbe = null;
    /** @type {number} */
    let phaseExit = EXIT_CANNOT_CHECK;
    let restoreFailed = false;
    try {
      writeFileSync(STORYBOOK_MAIN, sabotaged, "utf8");
      sabProbe = probeStorybook(env);
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
      try {
        restore();
      } catch (err) {
        restoreFailed = true;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[storybook-empty-suite] RESTORE FAILED: ${msg}`);
      }
      uninstallSignals();
      if (sabProbe?.tmpDir) {
        try {
          rmSync(sabProbe.tmpDir, { recursive: true, force: true });
        } catch {
          // ignore temp cleanup
        }
      }
    }
    // G-020: a failed restore must never report PASS/FALSE from the phases.
    if (restoreFailed) {
      logLine(
        `CANNOT CHECK: restore of .storybook/main.ts failed byte-equality`,
      );
      return EXIT_CANNOT_CHECK;
    }
    return phaseExit;
  } finally {
    try {
      rmSync(probe.tmpDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup
    }
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
