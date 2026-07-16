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
    // Conservative default: some unit cases (rate-limit loops, heavy dynamic imports)
    // can exceed Vitest's 5s default under full-suite load.
    testTimeout: 15000,
    setupFiles: ["./src/test/setup.ts"],
    environmentOptions: {
      jsdom: {},
    },
    coverage: {
      provider: "v8",
      include: ["src/components/activities/quiz/**"],
      exclude: ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/types.ts"],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
