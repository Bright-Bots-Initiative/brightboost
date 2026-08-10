import { describe, it, expect } from "vitest";
import { sharedEngineProbeLabel } from "../sharedEngineProbe";

/**
 * Source contract only (#730). This asserts the probe computes the expected label
 * when resolved from SOURCE. It deliberately does NOT prove runtime/emit resolution —
 * Vitest never loads `backend/dist/`, so this file cannot detect the depth-fragility
 * defect. That property is covered by `sharedEngineProbe.emit.test.ts`.
 */
describe("sharedEngineProbe (source contract)", () => {
  it("computes the expected label when resolved from source", () => {
    expect(sharedEngineProbeLabel).toBe("greatwork-engine-stub-730@0.0.0");
  });
});
