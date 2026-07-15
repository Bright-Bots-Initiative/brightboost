import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Storybook's Vitest plugin fails when the repo path contains spaces (#29572 / G-208).
// CI (Linux, no spaces) still runs storybook; local Windows clones under
// "Programming Projects/…" skip it unless STORYBOOK_TEST=1.
const pathHasSpaces = /\s/.test(dirname);
const forceStorybook = process.env.STORYBOOK_TEST === "1";

if (pathHasSpaces && !forceStorybook) {
  console.warn(
    "[vitest] Skipping storybook project — path contains spaces (see storybookjs/storybook#29572). " +
      "Set STORYBOOK_TEST=1 to force (will likely fail). CI runs storybook on paths without spaces.",
  );
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
      provider: "playwright",
      instances: [{ browser: "chromium" as const }],
    },
    setupFiles: [".storybook/vitest.setup.ts"],
  },
};

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
  "vitest.config.ts",
  ...(pathHasSpaces && !forceStorybook ? [] : [storybookProject]),
]);
