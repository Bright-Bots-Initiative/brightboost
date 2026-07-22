import { tmpdir } from "node:os";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Repo paths with spaces (Windows "Programming Projects/…") break V8 coverage
// .tmp writes. Use a per-process reports dir under os.tmpdir() so concurrent
// runs don't share/clean each other's coverage/.tmp (G-207).
// Spec §14.3 / G-007: CI (no spaces) keeps default ./coverage + parallel files —
// these overrides must not change CI behavior.
const pathHasSpaces = /\s/.test(__dirname);
const runningCoverage = process.argv.some(
  (arg) => arg === "--coverage" || arg.startsWith("--coverage."),
);
const coverageDirOverride = pathHasSpaces
  ? {
      reportsDirectory: path.join(
        tmpdir(),
        `brightboost-vitest-coverage-${process.pid}`,
      ),
    }
  : {};

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
    // Serialize file runs during coverage on spaced paths — reduces ENOENT
    // races writing/reading coverage/.tmp (vitest#9758). Leave unit fast otherwise.
    ...(pathHasSpaces && runningCoverage ? { fileParallelism: false } : {}),
    coverage: {
      provider: "v8",
      ...coverageDirOverride,
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
