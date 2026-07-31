import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

/**
 * Exact CI order from overview.md §15.3.2 / verify-parity.mjs STEPS.
 * U1-01 RED used a deliberately wrong list (CI-02 before CI-01) so the
 * failure named the order property; U1-02 locks the real sequence.
 */
/**
 * Exact CI order from overview.md §15.3.2 / verify-parity.mjs STEPS.
 * U1-01 RED used a deliberately wrong list (CI-02 before CI-01); failure
 * named the order property. U1-02 locks the real sequence below.
 */
const EXPECTED_STEP_IDS = [
  "CI-01",
  "CI-02",
  "CI-03",
  "CI-04",
  "CI-05",
  "CI-06",
  "CI-24",
  "CI-25",
  "CI-07",
  "CI-08",
  "CI-09",
  "CI-23",
  "CI-10",
  "CI-11",
  "CI-12",
  "CI-13",
  "CI-14",
  "CI-15",
  "CI-16",
  "CI-17",
  "CI-21",
  "CI-22",
  "CI-26",
];

describe("verify-parity.mjs (A5 / U1)", () => {
  it("exports STEPS in exact CI order (not merely presence)", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    expect(mod.STEPS, "STEPS export must exist").toBeDefined();
    const ids = mod.STEPS.map((s: { id: string }) => s.id);
    expect(
      ids,
      "STEPS order must match CI build-and-test then db-check then extras",
    ).toEqual(EXPECTED_STEP_IDS);
  });

  it("parseArgs recognizes --allow-skips and --inject-fail", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    const opts = mod.parseArgs([
      "--allow-skips",
      "--inject-fail",
      "CI-06",
      "--only",
      "CI-06,CI-26",
    ]);
    expect(opts.allowSkips).toBe(true);
    expect(opts.injectFail).toBe("CI-06");
    expect(opts.only).toEqual(["CI-06", "CI-26"]);
  });
});

function pathToFileUrl(p: string): string {
  const resolved = path.resolve(p);
  const withSlashes = resolved.replace(/\\/g, "/");
  return withSlashes.startsWith("/")
    ? `file://${withSlashes}`
    : `file:///${withSlashes}`;
}
