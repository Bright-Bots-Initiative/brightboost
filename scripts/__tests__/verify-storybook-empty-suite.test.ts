/* @vitest-environment node */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const guardScript = path.join(
  repoRoot,
  "scripts/verify-storybook-empty-suite.mjs",
);
const storybookMain = path.join(repoRoot, ".storybook", "main.ts");

async function loadMod() {
  return import(pathToFileURL(guardScript).href);
}

describe("verify-storybook-empty-suite (H1–H4 seed)", () => {
  it("script exists and exits 2 when mode cannot be determined", async () => {
    expect(existsSync(guardScript)).toBe(true);

    const mod = await loadMod();
    expect(mod.EXIT_CANNOT_CHECK).toBe(2);
    expect(() => mod.parseCollectedCount("{not-json")).toThrow(mod.CannotCheck);
  });

  it("count 0 maps to exit 1; count > 0 maps to exit 0", async () => {
    const mod = await loadMod();
    expect(mod.exitForHealthyCount(0)).toBe(mod.EXIT_FALSE);
    expect(mod.exitForHealthyCount(5)).toBe(mod.EXIT_OK);
  });

  it("parseCollectedCount reads numTotalTests; malformed → CannotCheck", async () => {
    const mod = await loadMod();
    expect(mod.parseCollectedCount(JSON.stringify({ numTotalTests: 7 }))).toBe(
      7,
    );
    expect(mod.parseCollectedCount(JSON.stringify({ numTotalTests: 0 }))).toBe(
      0,
    );
    expect(() =>
      mod.parseCollectedCount(JSON.stringify({ testResults: [] })),
    ).toThrow(mod.CannotCheck);
  });

  it("selectMode: unregistered + spaced → announced-skip; space-free → exit 1", async () => {
    const mod = await loadMod();
    const skip = mod.selectMode({
      projectNotFound: true,
      warningPresent: true,
      pathHasSpace: true,
      count: null,
      parseError: false,
      browserMissing: false,
    });
    expect(skip.mode).toBe("announced-skip");
    expect(skip.exit).toBeNull();

    const row4 = mod.selectMode({
      projectNotFound: true,
      warningPresent: false,
      pathHasSpace: false,
      count: null,
      parseError: false,
      browserMissing: false,
    });
    expect(row4.exit).toBe(mod.EXIT_FALSE);
    expect(row4.reason).toMatch(/unregistered on a space-free path/);
  });

  it("W-13: presence under CI refuses; local override survives", async () => {
    const mod = await loadMod();
    expect(
      mod.refuseOverrideUnderCI({
        CI: "true",
        BB_VITEST_PATH_HAS_SPACE: "1",
      }),
    ).toMatch(/BB_VITEST_PATH_HAS_SPACE/);
    expect(
      mod.refuseOverrideUnderCI({
        CI: "true",
        BB_VITEST_PATH_HAS_SPACE: "0",
      }),
    ).toMatch(/"0"/);
    expect(
      mod.refuseOverrideUnderCI({
        CI: "true",
        BB_VITEST_PATH_HAS_SPACE: "",
      }),
    ).not.toBeNull();
    expect(mod.refuseOverrideUnderCI({ CI: "true" })).toBeNull();
    expect(
      mod.refuseOverrideUnderCI({ BB_VITEST_PATH_HAS_SPACE: "1" }),
    ).toBeNull();
    expect(
      mod.refuseOverrideUnderCI({
        GITHUB_ACTIONS: "true",
        BB_VITEST_PATH_HAS_SPACE: "1",
      }),
    ).not.toBeNull();
  });

  it("sabotageStories patches stories glob; missing array → CannotCheck", async () => {
    const mod = await loadMod();
    const original = readFileSync(storybookMain, "utf8");
    const sabotaged = mod.sabotageStories(original);
    expect(sabotaged).not.toBe(original);
    expect(sabotaged).toContain("__bb749_no_such_story__");
    expect(sabotaged).not.toMatch(/\.stories\.@/);
    expect(() => mod.sabotageStories("export default {};")).toThrow(
      mod.CannotCheck,
    );
  });

  it("no-op sabotage: equal counts → cannot-check", async () => {
    const mod = await loadMod();
    expect(mod.classifySabotageResult(5, 5)).toBe("cannot-check");
    expect(mod.classifySabotageResult(5, 0)).toBe("pass");
    expect(mod.classifySabotageResult(5, 2)).toBe("false");
  });

  it("EXIT_FALSE and EXIT_CANNOT_CHECK are distinguishable", async () => {
    const mod = await loadMod();
    expect(mod.EXIT_OK).toBe(0);
    expect(mod.EXIT_FALSE).toBe(1);
    expect(mod.EXIT_CANNOT_CHECK).toBe(2);
    expect(mod.EXIT_FALSE).not.toBe(mod.EXIT_CANNOT_CHECK);
  });
});
