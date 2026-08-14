/**
 * Local–CI parity runner (§5.5).
 * Single source of truth for step order: export `STEPS`.
 * Exit 1 = a required step failed or was skipped without --allow-skips.
 * Exit 2 = could not run (bad args / unreadable config).
 *
 * Node ESM, no OS-conditional branches in the step list (G-004).
 * Ports from env only (G-007). No && chaining (G-013).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { datasourceEnvNames } from "./lib/prisma-datasource-env.mjs";
import {
  assertNoAmbientDbLeak,
  buildDbChildEnv,
} from "./lib/parity-db-child-env.mjs";
import { isDesignatedTestDbUrl } from "./lib/db-target.mjs";

export { datasourceEnvNames } from "./lib/prisma-datasource-env.mjs";
export {
  assertNoAmbientDbLeak,
  buildDbChildEnv,
  DB_SHAPED_ENV,
} from "./lib/parity-db-child-env.mjs";
export {
  describeDbUrl,
  isDesignatedTestDbName,
  isDesignatedTestDbUrl,
} from "./lib/db-target.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

// Load git-ignored local env (ports, BB_BASH) without committing secrets (G-001).
loadEnv({ path: path.join(REPO_ROOT, ".env.local") });
loadEnv({ path: path.join(REPO_ROOT, ".env") });

/**
 * Resolve `bash` via BB_BASH when set (Windows Git Bash vs WSL alias). No hardcoded ports.
 * @param {string} cmd
 */
function resolveCmd(cmd) {
  if (cmd === "bash" && process.env.BB_BASH) {
    return process.env.BB_BASH;
  }
  return cmd;
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   argv: string[],
 *   cwd?: string,
 *   required?: boolean,
 *   kind?: 'run' | 'not-local',
 *   skipIf?: () => string | null,
 *   env?: Record<string, string | undefined>,
 * }} Step
 */

/**
 * CI order mirrors ci-cd.yml: build-and-test (drift → CI-24/25 → installs →
 * tests → CI-23 → smoke → build), then db-check, then extras (bundle / format).
 * @type {Step[]}
 */
export const STEPS = [
  {
    id: "CI-01",
    name: "Install root deps",
    argv: ["npm", "ci"],
    required: true,
  },
  {
    id: "CI-02",
    name: "Lint",
    argv: ["npm", "run", "lint"],
    required: true,
  },
  {
    id: "CI-03",
    name: "Typecheck frontend",
    argv: ["npm", "run", "typecheck"],
    required: true,
  },
  {
    id: "CI-04",
    name: "Install backend deps",
    argv: ["npm", "ci"],
    cwd: "backend",
    required: true,
  },
  {
    id: "CI-05",
    name: "Typecheck backend",
    argv: ["npm", "run", "typecheck"],
    cwd: "backend",
    required: true,
  },
  {
    id: "CI-06",
    name: "Prisma schema drift",
    argv: ["bash", "scripts/check-prisma-drift.sh"],
    required: true,
  },
  {
    id: "CI-24",
    name: "Required-step presence",
    argv: ["bash", "scripts/verify-ci-step-presence.sh"],
    required: true,
  },
  {
    id: "CI-25",
    name: "Type-program membership",
    argv: ["node", "scripts/verify-type-program-membership.mjs"],
    required: true,
  },
  {
    id: "CI-07",
    name: "Cypress binary install",
    argv: ["npx", "cypress", "install"],
    required: true,
  },
  {
    id: "CI-08",
    name: "Playwright Chromium install",
    argv: ["npx", "playwright", "install", "--with-deps", "chromium"],
    required: true,
  },
  {
    id: "CI-09",
    name: "Unit + Storybook tests",
    argv: ["npm", "test", "--", "--watch=false"],
    required: true,
    skipIf: () =>
      REPO_ROOT.includes(" ")
        ? "checkout path contains a space — Storybook Vitest project owned by #707"
        : null,
  },
  {
    id: "CI-23",
    name: "CI shell gate",
    argv: ["npm", "run", "verify:ci-gate"],
    required: true,
    // Gate boots Vite on hardcoded :5173 (same as CI). Unset remapped
    // CYPRESS_SWA_URL so Cypress hits the gate's server (remember.md §8 #19).
    env: { CYPRESS_SWA_URL: undefined },
  },
  {
    id: "CI-10",
    name: "Dev server up (external or remapped)",
    argv: [
      "node",
      "-e",
      "console.log('CI-10: expect FE already listening at CYPRESS_SWA_URL')",
    ],
    required: true,
    skipIf: () => {
      if (!process.env.CYPRESS_SWA_URL) {
        return "CYPRESS_SWA_URL unset — start FE (workspace port-remap) and set env (G-007)";
      }
      return null;
    },
  },
  {
    id: "CI-11",
    name: "Wait for server",
    argv: [
      "npx",
      "wait-on",
      process.env.CYPRESS_SWA_URL || "env://CYPRESS_SWA_URL",
      "--timeout",
      "60000",
    ],
    required: true,
    skipIf: () =>
      process.env.CYPRESS_SWA_URL
        ? null
        : "CYPRESS_SWA_URL unset (G-007 — no hardcoded port)",
  },
  {
    id: "CI-12",
    name: "Cypress shell smoke",
    argv: ["npm", "run", "test:e2e:ci"],
    required: true,
    skipIf: () =>
      process.env.CYPRESS_SWA_URL
        ? null
        : "CYPRESS_SWA_URL unset (G-007 — no hardcoded port)",
  },
  {
    id: "CI-13",
    name: "Frontend build",
    argv: ["npm", "run", "build"],
    required: true,
  },
  {
    id: "CI-14",
    name: "Prisma migrate deploy",
    argv: ["npx", "prisma", "migrate", "deploy"],
    required: true,
    skipIf: () => {
      const gate = resolveParityDbGate();
      return gate.action === "skip" ? gate.reason : null;
    },
  },
  {
    id: "CI-15",
    name: "Prisma generate",
    argv: ["npx", "prisma", "generate"],
    required: true,
  },
  {
    id: "CI-16",
    name: "DB connectivity",
    argv: ["npm", "run", "test:db"],
    required: true,
    skipIf: () => {
      const gate = resolveParityDbGate();
      return gate.action === "skip" ? gate.reason : null;
    },
  },
  {
    id: "CI-17",
    name: "Bundle size budget",
    argv: ["npm", "run", "check-bundle-size"],
    required: true,
  },
  {
    id: "CI-21",
    name: "Deploy",
    argv: [],
    kind: "not-local",
    required: false,
  },
  {
    id: "CI-22",
    name: "Production smoke",
    argv: [],
    kind: "not-local",
    required: false,
  },
  {
    id: "CI-26",
    name: "Prettier format check",
    argv: ["npm", "run", "format:check"],
    required: true,
    skipIf: () =>
      "whole-tree format:check is a reverse gap (OQ-10); Prettier is enforced reject-only on staged files via husky — not mass-fixed in #740",
  },
];

/**
 * Documented local setup and skip contract (Bug E / nwalker review).
 * Printed by `node scripts/verify-parity.mjs --help`.
 */
export const HELP_TEXT = `npm run verify — local–CI parity runner (#740)

Documented setup (from repo root):
  npm ci
  cd backend && npm ci
  # optional: npx prisma generate  (usually supplied by @prisma/client postinstall)

Then:
  npm run verify -- --skip-install
  # env-dependent / out-of-scope steps SKIP; use --allow-skips for exit 0
  # If CYPRESS_SWA_URL points at a remapped FE, that server must be listening
  # or unset the var so CI-10/11/12 SKIP. CI-23 unsets remapped URL itself
  # (shell gate uses CI's :5173).

Skip contract:
  Required SKIP without --allow-skips → exit 1 (never silent green).
  Known local SKIPs (named + linked):
    CI-09  spaced path → #707 Storybook Vitest
    CI-10/11/12  CYPRESS_SWA_URL unset
    CI-14/16  TEST_DATABASE_URL unset
    CI-26  whole-tree Prettier reverse gap (OQ-10); hooks cover staged files
  NOT-LOCAL: CI-21 deploy, CI-22 prod-smoke
  Do not fix backend pre-existing tsc / Prisma gaps here (OQ-03 residual / B5-02).

Flags:
  --skip-install   omit CI-01/04/07/08
  --allow-skips    treat required SKIPs as non-fatal
  --only CI-0X     run a subset (comma-separated; unknown/empty IDs → exit 2)
  --inject-fail ID sabotage one step (parity-selfcheck; unknown ID → exit 2)
  --help           this text

DB safety (CI-14 / CI-16):
  Requires TEST_DATABASE_URL (never falls back to DATABASE_URL).
  Database name must contain a test/e2e token on a boundary (e.g. brightboost_test).
  Localhost alone is not sufficient. No override path.
`;

/**
 * Union env() connection names from root + backend Prisma schemas.
 * Zero names from either file → could-not-run (exit 2), never silent empty protection.
 * @param {string} [repoRoot]
 * @returns {{ ok: true, names: Set<string> } | { ok: false, code: 2, reason: string }}
 */
export function loadSchemaDatasourceEnvNames(repoRoot = REPO_ROOT) {
  const schemaPaths = [
    path.join(repoRoot, "prisma", "schema.prisma"),
    path.join(repoRoot, "backend", "prisma", "schema.prisma"),
  ];
  const union = new Set();
  for (const schemaPath of schemaPaths) {
    let text;
    try {
      text = fs.readFileSync(schemaPath, "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        code: 2,
        reason: `could not read Prisma schema ${schemaPath}: ${msg}`,
      };
    }
    const names = datasourceEnvNames(text);
    if (names.size === 0) {
      return {
        ok: false,
        code: 2,
        reason: `Prisma schema yielded zero datasource env names: ${schemaPath}`,
      };
    }
    for (const n of names) union.add(n);
  }
  return { ok: true, names: union };
}

/**
 * Build the full deny-by-default child env for a designated test URL.
 * @param {string} designatedUrl
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [baseEnv]
 * @param {Iterable<string>} [schemaEnvNames]
 * @returns {{ child: Record<string, string>, mustSet: Set<string> }}
 */
export function buildParityDbChildEnv(
  designatedUrl,
  baseEnv = process.env,
  schemaEnvNames,
) {
  let names = schemaEnvNames;
  if (!names) {
    const loaded = loadSchemaDatasourceEnvNames();
    if (!loaded.ok) {
      throw Object.assign(new Error(loaded.reason), { exitCode: 2 });
    }
    names = loaded.names;
  }
  return buildDbChildEnv(designatedUrl, baseEnv, names);
}

/**
 * Gate CI-14 / CI-16 on an explicitly designated test database (G-002).
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ action: 'skip', reason: string } | { action: 'refuse', reason: string, host?: string, database?: string } | { action: 'could-not-run', code: 2, reason: string } | { action: 'run', env: Record<string, string>, mustSet: Set<string>, host: string, database: string, warning: string | null }}
 */
export function resolveParityDbGate(env = process.env) {
  const url = env.TEST_DATABASE_URL;
  if (!url || !String(url).trim()) {
    return {
      action: "skip",
      reason: "TEST_DATABASE_URL unset (db-check not locally runnable)",
    };
  }
  const schemaNames = loadSchemaDatasourceEnvNames();
  if (!schemaNames.ok) {
    return {
      action: "could-not-run",
      code: 2,
      reason: schemaNames.reason,
    };
  }
  const designatedUrl = String(url).trim();
  const check = isDesignatedTestDbUrl(designatedUrl);
  if (!check.ok) {
    if (check.code === 2) {
      return {
        action: "could-not-run",
        code: 2,
        reason: check.reason,
      };
    }
    return {
      action: "refuse",
      reason: check.reason,
      host: check.host,
      database: check.database,
    };
  }
  const { child, mustSet } = buildDbChildEnv(
    designatedUrl,
    env,
    schemaNames.names,
  );
  assertNoAmbientDbLeak({
    child,
    mustSet,
    designatedUrl,
    baseEnv: env,
  });
  return {
    action: "run",
    env: child,
    mustSet,
    host: check.host,
    database: check.database,
    warning: null,
  };
}

/**
 * @typedef {{
 *   allowSkips: boolean,
 *   only: string[] | null,
 *   injectFail: string | null,
 *   skipInstall: boolean,
 *   usageError: string | null,
 * }} ParsedArgs
 */

/**
 * Parse a comma-separated ID list flag (`--only`, future selectors).
 * Missing value, flag-as-value, or empty/whitespace entries → usageError.
 * @param {string[]} argvCli
 * @param {string} flag
 * @returns {{ values: string[] | null, usageError: string | null }}
 */
export function parseIdListFlag(argvCli, flag) {
  const idx = argvCli.indexOf(flag);
  if (idx < 0) return { values: null, usageError: null };
  const raw = argvCli[idx + 1];
  if (raw === undefined || raw.startsWith("--")) {
    return {
      values: null,
      usageError: `${flag} requires a comma-separated list of step IDs`,
    };
  }
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length === 0 || parts.some((p) => !p)) {
    return {
      values: null,
      usageError: `${flag} contains an empty step ID (check commas / quotes)`,
    };
  }
  return { values: parts, usageError: null };
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv | Record<string, string | undefined>, replaceEnv?: boolean }} [opts]
 * @returns {Promise<{ code: number, output: string }>}
 */
export function runCommand(argv, opts = {}) {
  return new Promise((resolve) => {
    const [rawCmd, ...args] = argv;
    const cmd = resolveCmd(rawCmd);
    // npm/npx/bare bash need shell resolution on Windows; an absolute BB_BASH path must not
    // go through shell:true (spaces in "Program Files" break unquoted spawn).
    const needsShell = cmd === "npm" || cmd === "npx" || cmd === "bash";
    // DB steps pass a deny-by-default child env — never re-spread process.env (ambient leak).
    /** @type {NodeJS.ProcessEnv} */
    let childEnv;
    if (opts.replaceEnv) {
      childEnv = {};
      for (const [k, v] of Object.entries(opts.env || {})) {
        if (v !== undefined) childEnv[k] = v;
      }
    } else {
      childEnv = { ...process.env, ...(opts.env || {}) };
      if (opts.env) {
        for (const [k, v] of Object.entries(opts.env)) {
          if (v === undefined) delete childEnv[k];
        }
      }
    }
    const child = spawn(cmd, args, {
      cwd: opts.cwd ? path.join(REPO_ROOT, opts.cwd) : REPO_ROOT,
      env: childEnv,
      shell: needsShell,
      windowsHide: true,
    });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });
    child.on("error", (err) => {
      const text = `spawn error: ${err.message}\n`;
      output += text;
      process.stderr.write(text);
      resolve({ code: 2, output });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

/**
 * @param {string[]} argvCli
 * @returns {ParsedArgs}
 */
export function parseArgs(argvCli) {
  const allowSkips = argvCli.includes("--allow-skips");
  const skipInstall = argvCli.includes("--skip-install");

  const onlyParsed = parseIdListFlag(argvCli, "--only");
  let usageError = onlyParsed.usageError;
  const only = onlyParsed.values;

  const injectIdx = argvCli.indexOf("--inject-fail");
  let injectFail = null;
  if (injectIdx >= 0) {
    const raw = argvCli[injectIdx + 1];
    if (raw === undefined || raw.startsWith("--")) {
      usageError =
        usageError ?? "--inject-fail requires a step ID (e.g. CI-06)";
    } else if (!raw.trim()) {
      usageError = usageError ?? "--inject-fail requires a non-empty step ID";
    } else {
      injectFail = raw.trim();
    }
  }

  return { allowSkips, only, injectFail, skipInstall, usageError };
}

/**
 * Validate selection flags against the step registry.
 * Unknown IDs → exit 2 (usage); do not run a partial selection.
 * @param {Step[]} steps
 * @param {ParsedArgs} opts
 * @returns {{ ok: true } | { ok: false, code: number, message: string }}
 */
export function validateStepSelection(steps, opts) {
  if (opts.usageError) {
    return { ok: false, code: 2, message: opts.usageError };
  }
  const validIds = steps.map((s) => s.id);
  const validList = validIds.join(", ");

  if (opts.only) {
    const unknown = opts.only.filter((id) => !validIds.includes(id));
    if (unknown.length > 0) {
      return {
        ok: false,
        code: 2,
        message: `Unknown step ID(s): ${unknown.join(", ")}. Valid IDs: ${validList}`,
      };
    }
  }

  if (opts.injectFail && !validIds.includes(opts.injectFail)) {
    return {
      ok: false,
      code: 2,
      message: `Unknown step ID for --inject-fail: ${opts.injectFail}. Valid IDs: ${validList}`,
    };
  }

  return { ok: true };
}

/**
 * Filter steps by --only / --skip-install (and any future selectors).
 * @param {Step[]} steps
 * @param {ParsedArgs} opts
 */
export function selectSteps(steps, opts) {
  return steps.filter((step) => {
    if (opts.only && !opts.only.includes(step.id)) return false;
    if (
      opts.skipInstall &&
      (step.id === "CI-01" ||
        step.id === "CI-04" ||
        step.id === "CI-07" ||
        step.id === "CI-08")
    ) {
      return false;
    }
    return true;
  });
}

/**
 * @param {Step[]} steps
 * @param {ParsedArgs} opts
 * @param {{ runCommand?: typeof runCommand }} [deps]
 */
export async function runParity(steps, opts, deps = {}) {
  const run = deps.runCommand ?? runCommand;
  let failed = false;
  let skippedRequired = false;

  const selection = validateStepSelection(steps, opts);
  if (!selection.ok) {
    console.error(selection.message);
    return selection.code;
  }

  const selected = selectSteps(steps, opts);

  if (opts.only || opts.skipInstall) {
    const ids = selected.map((s) => s.id).join(", ") || "(none)";
    console.log(`Selected ${selected.length} of ${steps.length} steps: ${ids}`);
  }

  // Terminal invariant: a narrowing filter must never silently verify nothing.
  if (selected.length === 0) {
    console.error(
      "No steps selected after filtering. Refusing to exit 0 with an empty run.",
    );
    return 1;
  }

  // Rebuild wait-on argv with live env (STEPS is evaluated at import time).
  const liveSteps = selected.map((step) => {
    if (step.id !== "CI-11") return step;
    const url = process.env.CYPRESS_SWA_URL;
    if (!url) return step;
    return {
      ...step,
      argv: ["npx", "wait-on", url, "--timeout", "60000"],
    };
  });

  for (const step of liveSteps) {
    const cmdStr =
      step.kind === "not-local"
        ? "(not locally reproducible)"
        : step.argv.join(" ");

    if (step.kind === "not-local") {
      console.log(`[NOT-LOCAL] ${step.id} ${step.name}`);
      continue;
    }

    const skipReason = step.skipIf?.() ?? null;
    if (skipReason) {
      console.log(`[SKIP] ${step.id} ${step.name} — ${skipReason}`);
      if (step.required !== false) {
        skippedRequired = true;
      }
      continue;
    }

    /** @type {Record<string, string | undefined> | undefined} */
    let stepEnv = step.env;
    let replaceEnv = false;
    if (step.id === "CI-14" || step.id === "CI-16") {
      let gate;
      try {
        gate = resolveParityDbGate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[FAIL] ${step.id} ${step.name}`);
        console.log(`command: ${cmdStr}`);
        console.error(msg);
        return typeof err === "object" &&
          err &&
          "exitCode" in err &&
          err.exitCode === 2
          ? 2
          : 2;
      }
      if (gate.action === "could-not-run") {
        console.log(`[FAIL] ${step.id} ${step.name}`);
        console.log(`command: ${cmdStr}`);
        console.error(gate.reason);
        return gate.code;
      }
      if (gate.action === "refuse") {
        console.log(`[FAIL] ${step.id} ${step.name}`);
        console.log(`command: ${cmdStr}`);
        console.error(gate.reason);
        failed = true;
        break;
      }
      if (gate.action === "run") {
        if (gate.warning) {
          console.warn(gate.warning);
        }
        // Full deny-by-default child — do not merge onto process.env at spawn.
        stepEnv = gate.env;
        replaceEnv = true;
      }
    }

    if (opts.injectFail === step.id) {
      console.log(`[FAIL] ${step.id} ${step.name}`);
      console.log(`command: ${cmdStr}`);
      console.log(
        `injected failure via --inject-fail ${step.id} (parity selfcheck sabotage)`,
      );
      failed = true;
      break;
    }

    console.log(`[RUN] ${step.id} ${step.name}`);
    console.log(`command: ${cmdStr}`);
    const { code, output } = await run(step.argv, {
      cwd: step.cwd,
      env: stepEnv,
      replaceEnv,
    });
    if (code !== 0) {
      console.log(`[FAIL] ${step.id} ${step.name}`);
      console.log(`command: ${cmdStr}`);
      console.log(`exit: ${code}`);
      console.log("--- full output above (untruncated) ---");
      if (!output) {
        console.log("(no captured output)");
      }
      failed = true;
      break;
    }
    console.log(`[PASS] ${step.id} ${step.name}`);
  }

  if (failed) return 1;
  if (skippedRequired && !opts.allowSkips) {
    console.log(
      "Required step(s) were SKIPPED. Re-run with --allow-skips to treat skips as non-fatal, or provide the missing env.",
    );
    return 1;
  }
  console.log("Parity verify complete.");
  return 0;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (process.argv.slice(2).includes("--help")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  const opts = parseArgs(process.argv.slice(2));
  runParity(STEPS, opts).then((code) => {
    process.exit(code);
  });
}
