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
 * Override for verification only (A3-06): set BB_VITEST_PATH_HAS_SPACE=0 to
 * force-include the Storybook project, or =1 to force-skip, regardless of cwd.
 */
function checkoutPathHasSpace(): boolean {
  const override = process.env.BB_VITEST_PATH_HAS_SPACE;
  if (override === "1") return true;
  if (override === "0") return false;
  return dirname.includes(" ") || process.cwd().includes(" ");
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

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace(
  pathHasSpace ? ["vitest.config.ts"] : ["vitest.config.ts", storybookProject],
);
