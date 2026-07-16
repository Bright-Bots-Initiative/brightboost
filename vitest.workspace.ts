import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
  "vitest.config.ts",
  {
    extends: "vite.config.ts",
    plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, ".storybook"),
        // Many stories are documentation-only (autodocs) and don't export any
        // Storybook test suite for the vitest addon to execute.
        // Excluding them prevents "No test suite found in file ..." failures.
        tags: { exclude: ["autodocs"] },
      }),
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
  },
]);
