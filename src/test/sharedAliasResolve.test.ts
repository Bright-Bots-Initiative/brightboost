/**
 * @vitest-environment node
 *
 * A2-03: asserts Vitest/`@shared` alias resolves without shipping shared/ (#730 owns that tree).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("A2-03 @shared alias resolve", () => {
  let server: ViteDevServer;

  beforeAll(async () => {
    server = await createServer({
      configFile: path.join(root, "vitest.config.ts"),
      root,
      server: { middlewareMode: true },
      appType: "custom",
    });
  });

  afterAll(async () => {
    await server?.close();
  });

  it("resolves @shared/greatwork-engine to ./shared/greatwork-engine", async () => {
    const resolved = await server.pluginContainer.resolveId(
      "@shared/greatwork-engine",
    );
    expect(resolved, "alias should resolve an id").toBeTruthy();
    const id = (resolved!.id ?? "").replace(/\\/g, "/");
    expect(id).toMatch(/\/shared\/greatwork-engine$/);
  }, 30_000);
});
