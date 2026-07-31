/* @vitest-environment node */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

async function loadMod() {
  return import(
    pathToFileURL(
      path.join(repoRoot, "scripts/verify-type-program-membership.mjs"),
    ).href
  );
}

describe("verify-type-program-membership.mjs listFiles parsing (U1-05)", () => {
  it("isListed: present path is found in fixture --listFiles output", async () => {
    const mod = await loadMod();
    const fixture = [
      "/repo/node_modules/typescript/lib/lib.es5.d.ts",
      "/repo/src/vite-env.d.ts",
      "/repo/src/main.tsx",
    ].join("\n");
    expect(mod.isListed(fixture, "src/vite-env.d.ts")).toBe(true);
    expect(mod.assertPresent(fixture, ["src/vite-env.d.ts"])).toEqual([]);
  });

  it("isListed: excluded-style path is absent and named by assertPresent", async () => {
    const mod = await loadMod();
    const fixture = ["/repo/src/vite-env.d.ts", "/repo/src/main.tsx"].join(
      "\n",
    );
    const excluded = "src/test/__type_guard_sabotage__.ts";
    expect(
      mod.isListed(fixture, excluded),
      "excluded path must not appear in listFiles fixture",
    ).toBe(false);
    expect(
      mod.assertPresent(fixture, ["src/vite-env.d.ts", excluded]),
      "assertPresent must name the absent excluded file",
    ).toEqual([excluded]);
  });

  it("normalizeRel converts backslashes for Windows list output", async () => {
    const mod = await loadMod();
    const fixture = "D:\\repo\\src\\vite-env.d.ts\n";
    expect(mod.isListed(fixture, "src/vite-env.d.ts")).toBe(true);
  });
});
