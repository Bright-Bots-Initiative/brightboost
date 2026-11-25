import { describe, expect, it } from "vitest";
import {
  createGame,
  guideToBeacon,
  lightBeacon,
  nearbyBeacon,
  stepGame,
  type GameState,
} from "../engine";
import { beaconLanding, spawn } from "../world";

function walk(state: GameState, frames: number, x = 0, z = 0, jump = false) {
  for (let frame = 0; frame < frames; frame++)
    state = stepGame(state, { x, z, jump }, 1 / 60);
  return state;
}

function hubCenter() {
  return walk(createGame(), 27, 0, -1);
}

describe("Qubit Cove", () => {
  it("lets the explorer walk the pier, collect three different sparks and activate the west beacon", () => {
    const west = walk(hubCenter(), 110, -1);
    expect(nearbyBeacon(west)).toBe("zero");
    expect(west.collected).toEqual(["pier-1", "pier-2", "pier-3"]);
    expect(west.rescues).toBe(0);
    const lit = lightBeacon(west, "zero");
    expect(lit.lit).toEqual(["zero"]);
    expect(lightBeacon(lit, "zero")).toBe(lit);
    expect(lightBeacon(lit, "mix")).toBe(lit);
    expect(walk(lit, 110, 1).collected).toEqual(west.collected);
  });

  it("makes the east terraces reachable using two running jumps", () => {
    let east = walk(hubCenter(), 43, 1);
    east = walk(east, 41, 1, 0, true);
    expect(east.grounded).toBe(true);
    east = walk(east, 25);
    east = walk(east, 32, 1, 0, true);
    expect(east.cometJump).toBe(false);
    east = walk(east, 25);
    expect(east.rescues).toBe(0);
    expect(nearbyBeacon(east)).toBe("one");
  });

  it("reaches the north island by jumping from the dock", () => {
    let north = walk(hubCenter(), 54, 0, -1);
    north = walk(north, 45, 0, -1, true);
    north = walk(north, 12, 0, -1);
    expect(north.rescues).toBe(0);
    expect(nearbyBeacon(north)).toBe("mix");
  });

  it("guides an explorer to any beacon without granting rewards for travel", () => {
    let state = createGame();
    for (const id of ["mix", "zero", "one"] as const) {
      const next = guideToBeacon(state, id);
      expect(nearbyBeacon(next)).toBe(id);
      expect(next.lit).toEqual(state.lit);
      expect(next.collected).toEqual([]);
      state = lightBeacon(next, id);
    }
    expect(state.lit).toEqual(["mix", "zero", "one"]);
    expect(nearbyBeacon(createGame())).toBeNull();
  });

  it.each(["hub", "one"] as const)(
    "rescues a fall at the %s checkpoint with all earned progress intact",
    (checkpoint) => {
      const fromHub = checkpoint === "hub";
      let state = fromHub ? createGame() : guideToBeacon(createGame(), "one");
      if (!fromHub) state = lightBeacon(state, "one");
      if (fromHub) {
        state = walk(hubCenter(), 36, -1);
        expect(state.collected).toEqual(["pier-1"]);
      }
      for (let tick = 0; tick < 360 && state.rescues === 0; tick++)
        state = stepGame(state, { x: 0, z: 1, jump: false }, 1 / 120);
      expect(state.rescues).toBe(1);
      expect(state.player).toEqual(fromHub ? spawn : beaconLanding("one"));
      expect(state.lit).toEqual(fromHub ? [] : ["one"]);
      expect(state.collected).toEqual(fromHub ? ["pier-1"] : []);
    },
  );

  it("launches a higher comet jump only on a timely moving follow-up", () => {
    const regular = walk(hubCenter(), 1, 0, 0, true);
    const regularPeak = walk(regular, 21).player.y;
    const landed = walk(regular, 44);
    expect(landed.grounded).toBe(true);
    expect(walk(landed, 1, 0, 0, true).cometJump).toBe(false);
    expect(walk(walk(landed, 24), 1, 1, 0, true).cometJump).toBe(false);

    const comet = walk(landed, 1, 1, 0, true);
    expect(comet.cometJump).toBe(true);
    expect(comet.cometTime).toBeGreaterThan(0);
    expect(walk(comet, 24).player.y).toBeGreaterThan(regularPeak + 0.45);
    const after = walk(comet, 56);
    expect(after.grounded).toBe(true);
    expect(after.cometTime).toBe(0);
    expect(walk(after, 1, 1, 0, true).cometJump).toBe(false);
  });

  it("clears the comet and its landing bonus on guide or rescue", () => {
    const landed = walk(walk(createGame(), 1, 0, 0, true), 44);
    const comet = walk(landed, 1, 0, 1, true);
    expect(comet.cometJump).toBe(true);
    for (const state of [landed, comet]) {
      const arrival = guideToBeacon(state, "one");
      expect(arrival.cometJump).toBe(false);
      expect(arrival.cometTime).toBe(0);
      expect(walk(walk(arrival, 1), 1, 1, 0, true).cometJump).toBe(false);
    }

    let rescued = comet;
    for (let tick = 0; tick < 250 && !rescued.rescues; tick++)
      rescued = stepGame(rescued, { x: 0, z: 1, jump: false }, 1 / 120);
    expect(rescued.rescues).toBe(1);
    expect(rescued.cometTime).toBe(0);
    expect(walk(rescued, 1, 1, 0, true).cometJump).toBe(false);
  });

  it("counts a held jump once and keeps movement consistent across frame rates", () => {
    const initial = createGame();
    const held = walk(initial, 90, 0, 0, true);
    expect(held.grounded).toBe(true);
    expect(held.player).toEqual(spawn);
    const released = walk(held, 1);
    expect(walk(released, 1, 0, 0, true).grounded).toBe(false);

    const simulate = (fps: number) => {
      let state = initial;
      for (let f = 0; f < fps / 2; f++)
        state = stepGame(state, { x: 1, z: -1, jump: true }, 1 / fps);
      return state;
    };
    expect(simulate(30).player).toEqual(simulate(144).player);
    expect(initial.player).toEqual(spawn);
  });
});
