// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { expect, it } from "vitest";

it("removes a rejected host from direct and whole-environment Vite output", () => {
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  const fixture = mkdtempSync(path.join(tmpdir(), "bb-host-build-"));
  const marker = "private-dashboard-path-marker";
  try {
    symlinkSync(
      path.join(repo, "node_modules"),
      path.join(fixture, "node_modules"),
      "junction",
    );
    writeFileSync(
      path.join(fixture, "index.html"),
      '<script type="module" src="/entry.js"></script>',
    );
    writeFileSync(
      path.join(fixture, "entry.js"),
      "window.host = import.meta.env.VITE_POSTHOG_HOST; window.publicEnv = import.meta.env;",
    );
    // The fixture inherits no real Vite inputs, even on an operator's machine.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")),
    );
    env.VITE_POSTHOG_HOST = `https://metrics.example.invalid/${marker}`;
    const build = spawnSync(
      process.execPath,
      [
        path.join(repo, "node_modules/vite/bin/vite.js"),
        "build",
        "--config",
        path.join(repo, "vite.config.ts"),
      ],
      { cwd: fixture, env, encoding: "utf8" },
    );
    expect(build.status, build.stderr).toBe(0);
    const log = build.stdout + build.stderr;
    expect(log).toContain("Invalid VITE_POSTHOG_HOST");
    expect(log).not.toContain(marker);

    const dist = path.join(fixture, "dist");
    const files = readdirSync(dist, {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => /\.(?:html|js|css|br|map)$/.test(file));
    expect(files.some((file) => /index-.+\.js$/.test(file))).toBe(true);
    for (const file of files) {
      const bytes = readFileSync(path.join(dist, file));
      const plain = file.endsWith(".br") ? brotliDecompressSync(bytes) : bytes;
      expect(plain.includes(marker), file).toBe(false);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 60000);
