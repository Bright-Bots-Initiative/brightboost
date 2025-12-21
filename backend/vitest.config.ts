import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Removed react plugin as we are testing backend
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node", // Changed to node
    // setupFiles: ["./src/test/setup.ts"], // Removed setup files if not present or relevant
  },
});
