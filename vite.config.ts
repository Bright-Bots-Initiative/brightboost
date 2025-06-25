import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // Force absolute asset paths for nested routes
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    visualizer({
      filename: "dist/bundle-report.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
    viteCompression({
      deleteOriginFile: false,
      algorithm: "brotliCompress",
      filter: /\.(js|css|html|svg)$/i,
      threshold: 10240, // Only compress files larger than 10KB
      verbose: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "::",
    proxy: {
      "/api": {
        target:
          process.env.VITE_AWS_API_URL ||
          "https://t6gymccrfg.execute-api.us-east-1.amazonaws.com/prod",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2021",
    cssCodeSplit: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ["**/__tests__/**", "**/test/**"],
    },
  },
}));
