import { defineConfig, loadEnv } from "vite";
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
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
  },
  test: {
    environment: "jsdom",
  },
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
    target: "es2021",
    cssCodeSplit: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        "**/__tests__/**",
        "**/test/**",
        "**/stories/**",
        "**/components/ui/**",
      ],
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["@dnd-kit/core", "@dnd-kit/sortable"],
        },
      },
    },
  },
}));
