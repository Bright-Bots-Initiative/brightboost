import { describe, it, expect } from "vitest";
import { createSimState, step, resultOf } from "@shared/greatwork-engine";
import { starterMachine, BUILDER_BOUNDS } from "../greatWorkModel";
import { resolveBandConfig } from "../greatWorkBandConfig";
import {
  axialToPixel,
  pixelToAxial,
  fitCamera,
  engineArea,
} from "../greatWorkView";
import { EnginePlayback } from "../transport/playback";
describe("The Great Work builder contract", () => {
  it("round trips every board cell through the same hit-test geometry", () => {
    const camera = fitCamera(BUILDER_BOUNDS, 390, 430);
    for (let q = -4; q <= 4; q++)
      for (let r = -3; r <= 3; r++)
        expect(pixelToAxial(axialToPixel({ q, r }, camera), camera)).toEqual({
          q,
          r,
        });
  });
  it("uses the engine's area Set by identity, rather than estimating an overlay", () => {
    let state = createSimState(
      { key: "builder-test", mode: "open", fixedParts: [], maxTicks: 20 },
      starterMachine(),
    );
    state = step(state);
    state = step(state);
    expect(engineArea(state)).toBe(state.areaClaimed);
    expect(engineArea(state).size).toBe(resultOf(state).area);
  });
  it("keeps the band config transportable and recomputes the expanded instructions", () => {
    for (const band of ["k2", "g3_5"] as const) {
      const config = resolveBandConfig(band);
      expect(JSON.parse(JSON.stringify(config))).toEqual(config);
    }
    expect(resolveBandConfig("k2").instructions).toHaveLength(3);
    expect(resolveBandConfig("g3_5").instructions).toHaveLength(7);
  });
  it("Step advances exactly once and Reset restores the starting state", () => {
    const driver = new EnginePlayback(
      { key: "builder-test", mode: "open", fixedParts: [], maxTicks: 20 },
      starterMachine(),
    );
    const initial = driver.get().state;
    driver.stepOnce();
    expect(driver.get().state?.tick).toBe(1);
    driver.reset();
    expect(driver.get().state).toEqual(initial);
    driver.dispose();
  });
});
