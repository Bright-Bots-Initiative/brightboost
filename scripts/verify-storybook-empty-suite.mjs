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
//
// #822 review: the sandbox copies only the root config this guard names
// (SANDBOX_ROOT_FILES) — never the whole root, which pulled a linked worktree's
// `.git` and any untracked `.env*`/`.npmrc` in with it — and the patch is written
// through `sandbox.write`, which refuses a symlinked `.storybook/main.ts` instead
// of following it out of the sandbox.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
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
 * Re-run the same command with the human reporter. `--reporter=json` writes the
 * report to a file and leaves stdout/stderr empty, so a zero collected count
 * otherwise arrives with no explanation at all. Failure path only.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} cwd
 */
function diagnosticRerun(env, cwd) {
  const result = spawnSync("npx", ["vitest", "run", "--project", "storybook"], {
    cwd,
    encoding: "utf8",
    env,
    shell: true,
    windowsHide: true,
  });
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
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
 * Root configuration this guard's sandbox needs — an explicit ALLOWLIST, not
 * "every file in the root except package.json" (#822 review).
 *
 * Determined by removal, one candidate at a time, each measured with a real
 * Storybook Vitest run in the sandbox. The three below are load-bearing:
 *
 *  - `vitest.workspace.ts` — without it there is no `storybook` project at all:
 *    `Error: No projects matched the filter "storybook"`.
 *  - `vitest.config.ts` — the workspace lists it by name: `Workspace config file
 *    "vitest.workspace.ts" references a non-existing file or a directory`.
 *  - `vite.config.ts` — the storybook project is declared `extends:
 *    "vite.config.ts"`: `failed to load config from …/vite.config.ts`.
 *
 * Three further candidates were measured and are NOT required — `postcss.config.js`,
 * `tailwind.config.ts` and `tsconfig.json` each still gave `numTotalTests: 15`,
 * all passing, when omitted. This sandbox is nested inside the checkout, and both
 * PostCSS and esbuild search upward from the project root, so they resolve the
 * checkout's copies read-only. They are therefore not copied.
 *
 * `package.json` is deliberately ABSENT: Vite derives its workspace root (and
 * therefore `server.fs.allow`) from the nearest `package.json`, so one of its own
 * would make the sandbox the workspace root and put the checkout's real
 * `node_modules` off-limits — the measured `healthy=0` failure described below.
 *
 * Explicitly NOT copied, and never to be added: `.git` (a regular `gitdir:` file
 * in a linked worktree, pointing at the real repository), `.env*`, `.npmrc`,
 * lockfiles, and any other untracked or machine-local root file.
 */
export const SANDBOX_ROOT_FILES = [
  "vite.config.ts",
  "vitest.config.ts",
  "vitest.workspace.ts",
];

/**
 * Disposable tree both phases are served from: the stories (`src/`), the config
 * dir this guard patches (`.storybook/`) and the root vite/vitest configs above.
 *
 * Three deliberate choices, all forced by how Vite decides what it may serve —
 * `server.fs.allow` defaults to the workspace root, which Vite derives from the
 * nearest `package.json` (`searchForWorkspaceRoot`):
 *
 *  - `location: "repo"` — a git-ignored `.bb-guard-sandbox-*` inside the
 *    checkout. From `/tmp` the workspace root is the sandbox itself, so the
 *    checkout's `node_modules` is off-limits and Storybook's own setup file
 *    cannot be fetched; CI measured every story file failing to import and
 *    `healthy=0`. Nesting also makes path space-ness match the checkout by
 *    construction, which #707 requires.
 *  - no `package.json` in `rootFiles` — with one of its own, the sandbox becomes
 *    the workspace root again and the same denial returns.
 *  - no `node_modules` link — Node's resolution already walks up to the
 *    checkout's, and the realpath stays inside the allowed workspace root.
 *
 * The sandbox is ignored by git (asserted, not assumed), by ESLint and by the
 * Vitest unit project, so even a hard-killed run leaves nothing that changes
 * `git status` or breaks a later command.
 *
 * @param {{ repoRoot: string, env?: NodeJS.ProcessEnv }} opts
 */
function defaultCreateSandbox({ repoRoot, env }) {
  return createGuardSandbox({
    repoRoot,
    prefix: ".bb-guard-sandbox-",
    location: "repo",
    copyDirs: ["src", "shared", ".storybook"],
    linkDirs: ["public"],
    rootFiles: SANDBOX_ROOT_FILES,
    env,
  });
}

/** @param {unknown} err */
function messageOf(err) {
  return err instanceof Error ? err.message : String(err);
}

const STORY_FILE = /\.(stories\.(js|jsx|mjs|ts|tsx)|mdx)$/;

/**
 * Count the files `.storybook/main.ts`'s globs can match under `<root>/src`.
 * The sandbox has to reproduce the checkout exactly; if it does not, a zero
 * collected count says nothing about the guard's property.
 * @param {string} root
 * @returns {number}
 */
export function countStoryFiles(root) {
  const start = path.join(root, "src");
  if (!existsSync(start)) return 0;
  let total = 0;
  /** @type {string[]} */
  const stack = [start];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && STORY_FILE.test(entry.name)) total += 1;
    }
  }
  return total;
}

/**
 * A zero collected count is either the property being false or a sandbox that
 * never reproduced the suite. Print enough to tell those apart instead of
 * leaving a bare "collected 0 tests" (#815 follow-up).
 * @param {{ sandboxRoot: string, repoRoot: string, probe: { stdout: string, stderr: string } }} ctx
 */
function explainZeroCount({ sandboxRoot, repoRoot, probe, env }) {
  const tail = (text) =>
    text.split(/\r?\n/).filter(Boolean).slice(-25).join("\n    ");
  logLine(`  sandbox:        ${sandboxRoot}`);
  logLine(
    `  story files:    checkout=${countStoryFiles(repoRoot)} sandbox=${countStoryFiles(sandboxRoot)}`,
  );
  for (const rel of [
    "src",
    ".storybook/main.ts",
    ".storybook/vitest.setup.ts",
    "vitest.workspace.ts",
    "vitest.config.ts",
    "vite.config.ts",
    "package.json",
    "node_modules",
  ]) {
    logLine(
      `  ${rel.padEnd(28)}${existsSync(path.join(sandboxRoot, rel)) ? "present" : "MISSING"}`,
    );
  }
  logLine(`  probe stdout tail:\n    ${tail(probe.stdout) || "(empty)"}`);
  logLine(`  probe stderr tail:\n    ${tail(probe.stderr) || "(empty)"}`);
  logLine(
    `  human-reporter re-run:\n    ${tail(diagnosticRerun(env, sandboxRoot)) || "(empty)"}`,
  );
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
    return runPhases({ env, spaced, sandbox, probeImpl, repoRoot });
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
 *   repoRoot: string,
 * }} args
 * @returns {number}
 */
function runPhases({ env, spaced, sandbox, probeImpl, repoRoot }) {
  let sabotageTarget;
  try {
    sabotageTarget = sandbox.resolve(STORYBOOK_MAIN_REL);
  } catch (err) {
    logLine(
      `CANNOT CHECK: refusing to patch ${STORYBOOK_MAIN_REL}: ${messageOf(err)}`,
    );
    return EXIT_CANNOT_CHECK;
  }

  // Fidelity: an incomplete copy would collect 0 for a reason that has nothing
  // to do with the property under test.
  const checkoutStories = countStoryFiles(repoRoot);
  const sandboxStories = countStoryFiles(sandbox.root);
  if (sandboxStories !== checkoutStories) {
    logLine(
      `CANNOT CHECK: sandbox reproduced ${sandboxStories} of the checkout's ${checkoutStories} story files (${sandbox.root})`,
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
      explainZeroCount({ sandboxRoot: sandbox.root, repoRoot, probe, env });
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
      // sandbox.write re-checks every path component (the final one included)
      // and creates the file with `wx`, so a symlink at the target cannot be
      // followed out of the sandbox (#822 review).
      try {
        sandbox.write(STORYBOOK_MAIN_REL, sabotaged);
      } catch (err) {
        logLine(
          `CANNOT CHECK: refusing to patch ${STORYBOOK_MAIN_REL}: ${messageOf(err)}`,
        );
        return EXIT_CANNOT_CHECK;
      }
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
