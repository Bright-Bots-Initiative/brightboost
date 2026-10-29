import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/**
 * Path-with-spaces Storybook noise (#29572) is owned by #707 (path-conditional
 * project skip) — keep this file aligned with main for #702.
 *
 * Override for verification / falsification only (A3-06): set
 * BB_VITEST_PATH_HAS_SPACE=0 to force-include the Storybook project, or =1 to
 * force-skip, regardless of cwd. Do not set in CI. Not a product env var —
 * do not document in app/CI env tables (H-1).
 */
function checkoutPathHasSpace(): boolean {
  const override = process.env.BB_VITEST_PATH_HAS_SPACE;
  if (override === "1") return true;
  if (override === "0") return false;
  return dirname.includes(" ") || process.cwd().includes(" ");
}

// Serial verification prevents concurrent browser/Node projects on small machines.
// Defaults and the path-with-spaces contract stay unchanged.
const serialVerification = process.env.BB_TEST_SERIAL === "1";
function serialSchedule(groupOrder: number) {
  return serialVerification
    ? {
        fileParallelism: false,
        maxWorkers: 1,
        minWorkers: 1,
        sequence: { groupOrder },
      }
    : {};
}

const storybookProject = {
  extends: "vite.config.ts",
  plugins: [
    // The plugin will run tests for the stories defined in your Storybook config
    // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
    storybookTest({ configDir: path.join(dirname, ".storybook") }),
  ],
  test: {
    name: "storybook",
    ...serialSchedule(3),
    browser: {
      enabled: true,
      headless: true,
      name: "chromium",
      provider: "playwright",
    },
    setupFiles: [".storybook/vitest.setup.ts"],
  },
};

const pathHasSpace = checkoutPathHasSpace();

if (pathHasSpace) {
  // Explicit named skip — never register an empty Storybook project that can report green.
  console.warn(
    "[vitest.workspace] Skipping Storybook project (#707): checkout path contains a space (storybookjs/storybook#29572). Reason: path-conditional project skip.",
  );
}

// #720 inline projects keep the Storybook sandbox's three-file config contract.
// The browser suite is mandatory even when a spaced path skips Storybook.
const engineProject = {
  resolve: { alias: { "@shared": path.resolve(dirname, "shared") } },
  test: {
    name: "greatwork-engine",
    ...serialSchedule(1),
    environment: "node",
    include: [
      "shared/greatwork-engine/index.test.ts",
      "shared/greatwork-engine/__tests__/engine.test.ts",
      "scripts/__tests__/shared-freshness.test.ts",
    ],
    globalSetup: ["scripts/greatwork/parity-setup.ts"],
    passWithNoTests: false,
  },
};
const engineBrowserProject = {
  resolve: { alias: { "@shared": path.resolve(dirname, "shared") } },
  test: {
    name: "greatwork-engine-browser",
    ...serialSchedule(2),
    include: ["shared/greatwork-engine/__tests__/engine.browser.test.ts"],
    globalSetup: ["scripts/greatwork/parity-setup.ts"],
    passWithNoTests: false,
    browser: {
      enabled: true,
      headless: true,
      name: "chromium",
      provider: "playwright",
    },
  },
};

export default defineWorkspace([
  "vitest.config.ts",
  engineProject,
  engineBrowserProject,
  ...(pathHasSpace ? [] : [storybookProject]),
]);
