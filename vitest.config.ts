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
    coverage: {
      provider: "v8",
      include: ["src/components/activities/quiz/**", "backend/src/validation/gameSpecific.ts"],
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
