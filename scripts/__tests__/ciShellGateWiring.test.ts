import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

describe("CI shell gate wiring (G-201 / A7)", () => {
  it("ci-cd.yml invokes verify-ci-shell-gate.sh (or npm run verify:ci-gate)", () => {
    const workflow = readFileSync(
      path.join(repoRoot, ".github/workflows/ci-cd.yml"),
      "utf8",
    );
    const wired =
      workflow.includes("verify-ci-shell-gate.sh") ||
      workflow.includes("npm run verify:ci-gate");
    expect(
      wired,
      "ci-cd.yml must invoke scripts/verify-ci-shell-gate.sh (G-201). " +
        "A guard that exists but is never run is not a guard.",
    ).toBe(true);
  });
});
