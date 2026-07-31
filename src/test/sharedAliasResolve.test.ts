/**
 * A2-03: asserts Vitest resolves `@shared/*` → `./shared/*` (overview §12).
 * RED before A2-02 lands the alias.
 */
import { describe, expect, it } from "vitest";
import { ALIAS_PROBE } from "@shared/greatwork-engine";

describe("A2-03 @shared alias resolve", () => {
  it("resolves @shared/greatwork-engine from a unit test file", () => {
    expect(ALIAS_PROBE).toBe("shared-alias-ok");
  });
});
