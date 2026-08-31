/* @vitest-environment node */
/**
 * Regression guard for #823 — in-repo guard sandboxes must be invisible to
 * Vite's file watcher.
 *
 * #822 builds guard sandboxes INSIDE the checkout (`.bb-guard-sandbox-*`,
 * `location: "repo"` in scripts/lib/guard-sandbox.mjs) so a sandboxed Vite can
 * resolve the real node_modules. A fresh sandbox therefore drops copies of
 * `src/lambda/tsconfig.json` and `shared/tsconfig.json` into the watched tree,
 * and Vite reacts to any appearing tsconfig.json by clearing caches and
 * forcing a full-reload. When that landed while the Storybook browser project
 * was connected, the tester page reloaded and the Vitest browser WebSocket
 * closed — the required build-and-test check failed twice on
 * main@aaa5a18 (run 33432686633, attempts 1 and 2) with
 * "[vitest] Browser connection was closed while running tests".
 *
 * The Storybook Vitest project extends vite.config.ts, so the
 * `server.watch.ignored` entry asserted here is exactly what the browser-mode
 * server inherits. Vite MERGES user `ignored` entries with its built-ins
 * (`resolveChokidarOptions`), so `.git`/`node_modules` defaults are unaffected.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFilter } from "vite";
import type { ConfigEnv, UserConfig } from "vite";
import { describe, expect, it } from "vitest";

import viteConfigExport from "../../vite.config";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The watcher-ignore entry vite.config.ts must carry. */
const SANDBOX_GLOB = "**/.bb-guard-sandbox-*/**";

// vite.config.ts exports defineConfig(({ mode }) => ({ ... })); defineConfig
// returns the function unchanged, so calling the export yields the config.
const resolveViteConfig = viteConfigExport as unknown as (
  env: ConfigEnv,
) => UserConfig;

function watchIgnored(): string[] {
  const config = resolveViteConfig({ command: "serve", mode: "test" });
  const ignored = config.server?.watch?.ignored;
  return Array.isArray(ignored) ? ignored.map(String) : [];
}

describe("vite watcher ignores in-repo guard sandboxes (#823)", () => {
  it("carries the sandbox ignore in server.watch.ignored", () => {
    expect(watchIgnored()).toContain(SANDBOX_GLOB);
  });

  it("hides the observed reload triggers without hiding real files", () => {
    // createFilter is vite's own picomatch-backed matcher — the same glob
    // family chokidar applies to watch ignores. Patterns starting with "**"
    // are used verbatim (no cwd resolution), so this asserts the deployed
    // string, not a lookalike.
    const keeps = createFilter(null, [SANDBOX_GLOB]);

    // The two paths that forced full-reloads in the failing runs.
    expect(
      keeps("/ci/checkout/.bb-guard-sandbox-NWTQW8/src/lambda/tsconfig.json"),
    ).toBe(false);
    expect(
      keeps("/ci/checkout/.bb-guard-sandbox-nxkkDk/shared/tsconfig.json"),
    ).toBe(false);

    // The real files those sandboxes copied must stay watched.
    expect(keeps("/ci/checkout/src/lambda/tsconfig.json")).toBe(true);
    expect(keeps("/ci/checkout/shared/tsconfig.json")).toBe(true);
    expect(keeps("/ci/checkout/src/main.tsx")).toBe(true);
  });

  it("stays derived from the prefix the CI-27 guard actually uses", () => {
    // If the guard renames its in-repo sandbox prefix without updating the
    // watcher ignore, the reload race comes back silently. Read the prefix
    // from the guard source so drift fails here instead. (#817 records why a
    // manual mirror of a counterpart value is not enough.)
    const guardSource = readFileSync(
      path.join(REPO_ROOT, "scripts", "verify-storybook-empty-suite.mjs"),
      "utf8",
    );
    const prefix = guardSource.match(/prefix:\s*"([^"]+)"/)?.[1];
    expect(prefix).toBeTruthy();
    expect(SANDBOX_GLOB).toBe(`**/${prefix}*/**`);
  });
});
