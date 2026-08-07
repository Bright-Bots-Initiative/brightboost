#!/usr/bin/env node
/**
 * verify-storybook-empty-suite.mjs — Two-phase proof for W-06 (#707).
 *
 * Phase 1 (healthy): force path-conditional Storybook skip, run `npm test`,
 *   require exit 0 and the named skip line. A red baseline cannot masquerade
 *   as a successful sabotage (G-005).
 * Phase 2 (sabotage): force-include Storybook with a *non-empty* stories glob
 *   that matches zero files (so Storybook indexes successfully), then require
 *   Vitest to exit non-zero with "No test files found" — the
 *   `passWithNoTests: false` path. An empty `stories: []` hard-error from
 *   Storybook is rejected as a proxy (§15.2 row 11).
 *
 * Exit codes:
 *   0  — both phases satisfied
 *   1  — property false (healthy failed or sabotage did not fail correctly)
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
/** Vitest message when passWithNoTests is false and zero files collected. */
const EMPTY_COLLECTION_MARKER = "No test files found";
/** Storybook rejects stories: [] before Vitest runs — not a W-06 proof. */
const PROXY_MARKER = "InvalidStoriesEntryError";

/**
 * Non-empty stories field that resolves to zero files. Storybook warns but
 * still hands an empty set to Vitest — unlike `stories: []`, which throws.
 */
const EMPTY_COLLECTION_MAIN = `import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.__empty_collection__.@(ts|tsx)"],
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
    "--- phase 2 (sabotage): Vitest empty collection (passWithNoTests: false) ---",
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
  process.on("exit", restore);
  process.on("SIGINT", () => {
    restore();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    restore();
    process.exit(143);
  });

  try {
    fs.writeFileSync(STORYBOOK_MAIN, EMPTY_COLLECTION_MAIN, "utf8");
    console.log(
      "command: BB_VITEST_PATH_HAS_SPACE=0 npm test -- --watch=false --project storybook",
    );
    console.log(
      "sabotage: stories glob matches zero files (not stories: [] — that is a proxy)",
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
    if (combined.includes(PROXY_MARKER)) {
      failProperty(
        "sabotage phase: InvalidStoriesEntryError is a Storybook config hard-error, not Vitest empty collection (W-06 proxy)",
      );
    }
    if (!combined.includes(EMPTY_COLLECTION_MARKER)) {
      failProperty(
        `sabotage phase: expected Vitest "${EMPTY_COLLECTION_MARKER}" (passWithNoTests path); got a different failure`,
      );
    }
    if (status === 0) {
      failProperty(
        "sabotage phase: empty Vitest collection exited 0 (silent green — W-06 failed; is passWithNoTests: false set?)",
      );
    }
    console.log(
      `PASS phase 2: empty Vitest collection exited non-zero (status=${status}) with "${EMPTY_COLLECTION_MARKER}"`,
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
    "PASS: W-06 — healthy skip green AND Vitest empty collection non-zero (passWithNoTests)",
  );
  process.exit(0);
}

main();
