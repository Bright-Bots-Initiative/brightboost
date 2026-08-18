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

/** Map classifySabotageResult labels to exit codes (G-019 / U3-05). */
function exitForSabotageClass(
  label: "pass" | "false" | "cannot-check",
  mod: { EXIT_OK: number; EXIT_FALSE: number; EXIT_CANNOT_CHECK: number },
): number {
  if (label === "pass") return mod.EXIT_OK;
  if (label === "false") return mod.EXIT_FALSE;
  return mod.EXIT_CANNOT_CHECK;
}

describe("verify-storybook-empty-suite (U3)", () => {
  it("guard script exists", () => {
    expect(existsSync(guardScript)).toBe(true);
  });

  describe("U3-01 JSON parsing", () => {
    it("valid output with count 5 → numTotalTests 5", async () => {
      const mod = await loadMod();
      expect(
        mod.parseCollectedCount(JSON.stringify({ numTotalTests: 5 })),
      ).toBe(5);
      expect(mod.exitForHealthyCount(5)).toBe(mod.EXIT_OK);
    });

    it("valid output with count 0 → EXIT_FALSE", async () => {
      const mod = await loadMod();
      expect(
        mod.parseCollectedCount(JSON.stringify({ numTotalTests: 0 })),
      ).toBe(0);
      expect(mod.exitForHealthyCount(0)).toBe(mod.EXIT_FALSE);
    });

    it("malformed / missing field → CannotCheck → EXIT_CANNOT_CHECK (2), not 1", async () => {
      const mod = await loadMod();
      expect(() => mod.parseCollectedCount("{not-json")).toThrow(
        mod.CannotCheck,
      );
      expect(() =>
        mod.parseCollectedCount(JSON.stringify({ testResults: [] })),
      ).toThrow(mod.CannotCheck);
      expect(mod.EXIT_CANNOT_CHECK).toBe(2);
      expect(mod.EXIT_CANNOT_CHECK).not.toBe(mod.EXIT_FALSE);
    });
  });

  describe("U3-02 mode selection (§5.1.3)", () => {
    it("unregistered + spaced + warning → announced-skip", async () => {
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
    });

    it("unregistered + spaced without warning → silent skip EXIT_FALSE", async () => {
      const mod = await loadMod();
      const silent = mod.selectMode({
        projectNotFound: true,
        warningPresent: false,
        pathHasSpace: true,
        count: null,
        parseError: false,
        browserMissing: false,
      });
      expect(silent.exit).toBe(mod.EXIT_FALSE);
      expect(silent.reason).toMatch(/silent skip/);
    });

    it("unregistered + space-free path → EXIT_FALSE (row 4)", async () => {
      const mod = await loadMod();
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

    it("registered + count available → mode count", async () => {
      const mod = await loadMod();
      const counted = mod.selectMode({
        projectNotFound: false,
        warningPresent: false,
        pathHasSpace: false,
        count: 5,
        parseError: false,
        browserMissing: false,
      });
      expect(counted.mode).toBe("count");
      expect(counted.exit).toBeNull();
    });

    it("parseError / browserMissing → EXIT_CANNOT_CHECK", async () => {
      const mod = await loadMod();
      const parseFail = mod.selectMode({
        projectNotFound: false,
        warningPresent: false,
        pathHasSpace: false,
        count: null,
        parseError: true,
        browserMissing: false,
      });
      expect(parseFail.exit).toBe(mod.EXIT_CANNOT_CHECK);

      const browserFail = mod.selectMode({
        projectNotFound: false,
        warningPresent: false,
        pathHasSpace: false,
        count: null,
        parseError: false,
        browserMissing: true,
      });
      expect(browserFail.exit).toBe(mod.EXIT_CANNOT_CHECK);
    });
  });

  describe("U3-03 W-13 override matrix", () => {
    it("CI × BB_VITEST_PATH_HAS_SPACE presence (incl. value 0 and empty)", async () => {
      const mod = await loadMod();

      // CI set + override present (any value) → refuse
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

      // CI set, override absent → null
      expect(mod.refuseOverrideUnderCI({ CI: "true" })).toBeNull();

      // override present, CI absent → local hatch survives
      expect(
        mod.refuseOverrideUnderCI({ BB_VITEST_PATH_HAS_SPACE: "1" }),
      ).toBeNull();

      // neither → null
      expect(mod.refuseOverrideUnderCI({})).toBeNull();

      // GITHUB_ACTIONS is also CI for W-13
      expect(
        mod.refuseOverrideUnderCI({
          GITHUB_ACTIONS: "true",
          BB_VITEST_PATH_HAS_SPACE: "1",
        }),
      ).not.toBeNull();
    });
  });

  describe("U3-04 exit-code mapping (1 ≠ 2)", () => {
    it("EXIT_OK / EXIT_FALSE / EXIT_CANNOT_CHECK are distinguishable", async () => {
      const mod = await loadMod();
      expect(mod.EXIT_OK).toBe(0);
      expect(mod.EXIT_FALSE).toBe(1);
      expect(mod.EXIT_CANNOT_CHECK).toBe(2);
      expect(mod.EXIT_FALSE).not.toBe(mod.EXIT_CANNOT_CHECK);
    });

    it("count 0 → 1; unparseable → 2 (not merely non-zero)", async () => {
      const mod = await loadMod();
      expect(mod.exitForHealthyCount(0)).toBe(1);
      expect(mod.exitForHealthyCount(0)).not.toBe(2);
      expect(() => mod.parseCollectedCount("{not-json")).toThrow(
        mod.CannotCheck,
      );
      const cannotCheckExit = mod.selectMode({
        projectNotFound: false,
        warningPresent: false,
        pathHasSpace: false,
        count: null,
        parseError: true,
        browserMissing: false,
      }).exit;
      expect(cannotCheckExit).toBe(2);
      expect(cannotCheckExit).not.toBe(1);
    });
  });

  describe("U3-05 no-op sabotage detector", () => {
    it("equal counts → cannot-check → EXIT_CANNOT_CHECK (2)", async () => {
      const mod = await loadMod();
      expect(mod.classifySabotageResult(5, 5)).toBe("cannot-check");
      expect(exitForSabotageClass(mod.classifySabotageResult(5, 5), mod)).toBe(
        mod.EXIT_CANNOT_CHECK,
      );
    });

    it("sabotaged 0 → pass; unequal non-zero → false → EXIT_FALSE", async () => {
      const mod = await loadMod();
      expect(mod.classifySabotageResult(5, 0)).toBe("pass");
      expect(exitForSabotageClass(mod.classifySabotageResult(5, 0), mod)).toBe(
        mod.EXIT_OK,
      );
      expect(mod.classifySabotageResult(5, 2)).toBe("false");
      expect(exitForSabotageClass(mod.classifySabotageResult(5, 2), mod)).toBe(
        mod.EXIT_FALSE,
      );
    });

    it("sabotageStories patches real main.ts; missing stories → CannotCheck", async () => {
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
  });
});
