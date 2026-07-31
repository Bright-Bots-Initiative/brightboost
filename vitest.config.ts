import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Must match overview §12 / #730 Part B: @shared/* → ./shared/*
      "@shared": path.resolve(__dirname, "./shared"),
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
      include: [
        "src/components/activities/quiz/**",
        "backend/src/validation/gameSpecific.ts",
        "cypress/support/**/*.ts",
        "src/test/dataDashPoolSync*.ts",
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
      // A2-04/A2-05: `all` left unset (effective false). Measurement showed an
      // unloaded file under cypress/support/**/*.ts still entered the report at
      // 0% and diluted totals — so new support helpers need unit tests (U2),
      // not a coverage exclusion. No include/exclude change.
    },
  },
});
