import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { classifyDeployEnv } from "./shared/deploy-env/index";

/**
 * BRAND_R0 build metadata. Classifies the build-time environment with the
 * shared contract (shared/deploy-env) and stamps the result into index.html
 * (`%BB_*%` placeholders) so a plain `curl` can read the declared environment,
 * Railway's environment, the effective classification, any mismatch, and the
 * git SHA without executing JavaScript. `scripts/verify-deploy-target.mjs`
 * reads these tags. Inputs: VITE_APP_ENV (declaration),
 * VITE_RAILWAY_ENVIRONMENT_NAME (forwarded from Railway's build arg by
 * Dockerfile.frontend), VITE_GIT_SHA.
 */
function bbBuildMetadata(mode: string): Plugin {
  return {
    name: "bb-build-metadata",
    transformIndexHtml(html) {
      const env = loadEnv(mode, process.cwd(), "VITE_");
      const resolved = classifyDeployEnv(
        {
          railwayEnvironmentName: env.VITE_RAILWAY_ENVIRONMENT_NAME,
          declaredEnv: env.VITE_APP_ENV,
          nodeEnv: mode,
          gitSha: env.VITE_GIT_SHA,
        },
        {
          names: {
            declared: "VITE_APP_ENV",
            railway: "VITE_RAILWAY_ENVIRONMENT_NAME",
          },
        },
      );
      const stamp: Record<string, string> = {
        BB_ENV_DECLARED: resolved.declaredEnv ?? "",
        BB_RAILWAY_ENV: resolved.railwayEnv ?? "",
        BB_ENV_EFFECTIVE: resolved.name,
        BB_ENV_SOURCE: resolved.source,
        BB_ENV_MISMATCH: resolved.mismatch,
        BB_GIT_SHA: resolved.gitSha ?? "",
      };
      return html.replace(/%(BB_[A-Z_]+)%/g, (match, key: string) =>
        key in stamp ? stamp[key] : match,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // Force absolute asset paths for nested routes
  plugins: [
    bbBuildMetadata(mode),
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
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "::",
    watch: {
      // #823: guard sandboxes (#815/#822) are built inside the checkout as
      // .bb-guard-sandbox-* so their Vite can reach the real node_modules. A
      // fresh sandbox's copied tsconfig.json otherwise makes this watcher
      // force a full-reload mid-run, dropping the Vitest browser connection —
      // the Storybook project extends this config, so its browser-mode server
      // inherits this ignore. Vite merges the list with its built-in ignores.
      ignored: ["**/.bb-guard-sandbox-*/**"],
    },
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
