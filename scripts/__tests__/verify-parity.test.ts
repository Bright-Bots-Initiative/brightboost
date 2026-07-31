import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

describe("verify-parity.mjs (A5)", () => {
  it("exports STEPS in CI order matching ci-cd.yml build-and-test then db-check", async () => {
    const mod = await import(
      pathToFileUrl(path.join(repoRoot, "scripts/verify-parity.mjs"))
    );
    expect(mod.STEPS, "STEPS export must exist").toBeDefined();
    const ids = mod.STEPS.map((s: { id: string }) => s.id);
    expect(ids.indexOf("CI-01")).toBeLessThan(ids.indexOf("CI-02"));
    expect(ids.indexOf("CI-06")).toBeLessThan(ids.indexOf("CI-24"));
    expect(ids.indexOf("CI-24")).toBeLessThan(ids.indexOf("CI-25"));
    expect(ids.indexOf("CI-25")).toBeLessThan(ids.indexOf("CI-07"));
    expect(ids.indexOf("CI-07")).toBeLessThan(ids.indexOf("CI-09"));
    expect(ids.indexOf("CI-09")).toBeLessThan(ids.indexOf("CI-23"));
    expect(ids.indexOf("CI-23")).toBeLessThan(ids.indexOf("CI-13"));
    expect(ids.indexOf("CI-13")).toBeLessThan(ids.indexOf("CI-14"));
    expect(ids.indexOf("CI-14")).toBeLessThan(ids.indexOf("CI-16"));
    expect(ids.indexOf("CI-26")).toBeGreaterThan(ids.indexOf("CI-16"));
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
