import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Clone-local A2-02 seam (#730 U2) — match vite.config.ts; #671 keeps identical string
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
      // Bug D / SF-03 (PR #750): measured with vs without excluding e2e.ts +
      // commands.ts. With exclude: All files 98.18/95.18/96.77/98.18. Without:
      // 92.32/94.17/90.9/92.32 (e2e.ts + commands.ts at 0% dilute support to
      // 48.45 stmts). Thresholds still ≥90 without the exclusion — keep both
      // files in the denominator so the 90% floor stays honest (G-006).
    },
  },
});
