import { describe, expect, it } from "vitest";
import { GAME_COMPONENTS } from "../gameRegistry";

describe("game registry target coverage", () => {
  it("registers audited under-tested game keys", () => {
    expect(GAME_COMPONENTS.gotcha_gears_unity).toBeDefined();
    expect(GAME_COMPONENTS.tank_trek).toBeDefined();
    expect(GAME_COMPONENTS.quantum_quest).toBeDefined();
    expect(GAME_COMPONENTS.move_measure).toBeDefined();
    expect(GAME_COMPONENTS.sky_shield).toBeDefined();
    expect(GAME_COMPONENTS.fast_lane).toBeDefined();
    expect(GAME_COMPONENTS.qualify_tune_race).toBeDefined();
  });
});
