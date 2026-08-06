import { describe, it, expect } from "vitest";
import { sharedEngineProbeLabel } from "../sharedEngineProbe";

/**
 * Regression (#730 review): backend must resolve the shared engine at runtime
 * via package name (`@brightboost/greatwork-engine`), not a depth-fragile
 * relative path into `shared/dist`.
 */
describe("sharedEngineProbe", () => {
  it("loads the shared engine label via package-name resolution", () => {
    expect(sharedEngineProbeLabel).toBe("greatwork-engine-stub-730@0.0.0");
  });
});
