import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "unit",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    environmentOptions: {
      jsdom: {},
    },
    // Vitest defaults exclude **/cypress/**; allow colocated support unit tests (#677 A2-03).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/e2e/**",
      "**/cypress/support/*.js",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
    coverage: {
      provider: "v8",
      // V8 coverage .tmp writes fail with ENOENT when the repo path contains
      // spaces (Windows local clones under "Programming Projects/…"). CI paths
      // have no spaces — keep the default ./coverage there (G-207).
      ...( /\s/.test(__dirname)
        ? {
            reportsDirectory: path.join(
              process.env.TEMP || process.env.TMP || "/tmp",
              "brightboost-vitest-coverage",
            ),
          }
        : {}),
      include: [
        "src/components/activities/quiz/**",
        "cypress/support/**/*.ts",
      ],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/types.ts",
        "cypress/support/*.js",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
