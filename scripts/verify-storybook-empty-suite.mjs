#!/usr/bin/env node
/**
 * verify-storybook-empty-suite.mjs — Two-phase proof for W-06 (#707).
 *
 * Phase 1 (healthy): force path-conditional Storybook skip, run `npm test`,
 *   require exit 0 and the named skip line. A red baseline cannot masquerade
 *   as a successful sabotage (G-005).
 * Phase 2 (sabotage): force-include Storybook, empty `.storybook` stories
 *   collection, run the storybook project, require non-zero exit
 *   (`passWithNoTests: false`). Restore stories via finally.
 *
 * Exit codes:
 *   0  — both phases satisfied
 *   1  — property false (healthy failed or sabotage did not fail)
 *   75 — could not run (missing tooling / restore failure)
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXIT_PROPERTY_FALSE = 1;
const EXIT_COULD_NOT_RUN = 75;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const STORYBOOK_MAIN = path.join(REPO_ROOT, ".storybook", "main.ts");
const SKIP_MARKER = "[vitest.workspace] Skipping Storybook project (#707):";

const EMPTY_STORIES_MAIN = `import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/experimental-addon-test",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;
`;

function failCouldNotRun(message) {
  console.error(`COULD_NOT_RUN: ${message}`);
  process.exit(EXIT_COULD_NOT_RUN);
}

function failProperty(message) {
  console.error(`FAIL: ${message}`);
  process.exit(EXIT_PROPERTY_FALSE);
}

function runCommand(command, args, envExtra = {}) {
  const isWin = process.platform === "win32";
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...envExtra },
    // Windows: npm/npx are .cmd shims; spawnSync without shell hits EINVAL.
    shell: isWin,
  });
  if (result.error) {
    failCouldNotRun(`spawn failed (${command}): ${result.error.message}`);
  }
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return {
    status: result.status ?? EXIT_COULD_NOT_RUN,
    combined: `${stdout}\n${stderr}`,
  };
}

function runNpm(args, envExtra = {}) {
  return runCommand("npm", args, envExtra);
}

function ensurePrismaClient() {
  console.log("--- preflight: npx prisma generate ---");
  const { status } = runCommand("npx", ["prisma", "generate"]);
  if (status !== 0) {
    failCouldNotRun(`prisma generate exited ${status}`);
  }
}

function phaseHealthy() {
  console.log("--- phase 1 (healthy): explicit Storybook skip ---");
  console.log("command: BB_VITEST_PATH_HAS_SPACE=1 npm test -- --watch=false");
  const { status, combined } = runNpm(["test", "--", "--watch=false"], {
    BB_VITEST_PATH_HAS_SPACE: "1",
  });
  if (!combined.includes(SKIP_MARKER)) {
    failProperty(
      "healthy phase: named skip line missing from output (explicit skip not proven)",
    );
  }
  if (status !== 0) {
    failProperty(
      `healthy phase: expected exit 0, got ${status} (baseline must be green before sabotage)`,
    );
  }
  console.log("PASS phase 1: exit 0 with named Storybook skip");
}

function phaseSabotage() {
  console.log(
    "--- phase 2 (sabotage): empty Storybook collection, force-include ---",
  );
  if (!fs.existsSync(STORYBOOK_MAIN)) {
    failCouldNotRun(`missing ${STORYBOOK_MAIN}`);
  }
  const original = fs.readFileSync(STORYBOOK_MAIN, "utf8");
  let restored = false;
  const restore = () => {
    if (!restored) {
      fs.writeFileSync(STORYBOOK_MAIN, original, "utf8");
      restored = true;
    }
  };

  try {
    fs.writeFileSync(STORYBOOK_MAIN, EMPTY_STORIES_MAIN, "utf8");
    console.log(
      "command: BB_VITEST_PATH_HAS_SPACE=0 npm test -- --watch=false --project storybook",
    );
    const { status, combined } = runNpm(
      ["test", "--", "--watch=false", "--project", "storybook"],
      { BB_VITEST_PATH_HAS_SPACE: "0" },
    );
    if (combined.includes(SKIP_MARKER)) {
      failProperty(
        "sabotage phase: Storybook was skipped — empty-collection collapse was not exercised",
      );
    }
    if (status === 0) {
      failProperty(
        "sabotage phase: empty Storybook collection exited 0 (silent green — W-06 failed)",
      );
    }
    console.log(
      `PASS phase 2: empty collection exited non-zero (status=${status})`,
    );
  } finally {
    restore();
  }
}

function main() {
  ensurePrismaClient();
  phaseHealthy();
  phaseSabotage();
  console.log(
    "PASS: W-06 empty-suite guard — healthy skip green AND emptied collection non-zero",
  );
  process.exit(0);
}

main();
