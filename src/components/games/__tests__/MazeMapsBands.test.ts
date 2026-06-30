/**
 * Data-integrity test for Maze Maps
 *
 * Contract: For both bands, there exist three maps (tutorial, guided, main). 
 * In each map, the start position, goal, orbs, safe pads and walls are all 
 * inside bounds. The start position, goal, orbs, and safe pads are not on walls. 
 * Sweepers move inside bounds. Sweeper's start position is valid. Sweeper loops 
 * are closed. No duplicate orb positions or duplicated sweeper IDs. 
 */
import { describe, expect, it } from "vitest";
import { MAPS_G3_5 } from "../gradeBandContent";
import { MAPS_k2 } from "../MazeMapsGame";

const BANDS = {
  k2: MAPS_k2,
  g3_5: MAPS_G3_5,
} as const;

function inBounds(
  [r, c]: [number, number],
  rows: number,
  cols: number,
): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

describe("Maze Maps authored content", () => {
  it.each(Object.entries(BANDS))(
    "%s: contains tutorial, guided, and main maps",
    (_, maps) => {
      expect(maps.tutorial).toBeDefined();
      expect(maps.guided).toBeDefined();
      expect(maps.main).toBeDefined();
    },
  );

  it.each(Object.entries(BANDS))(
    "%s: all map coordinates are valid",
    (_, maps) => {
      for (const map of Object.values(maps)) {
        expect(
          inBounds(map.start, map.rows, map.cols),
          `${map.id}: start out of bounds`,
        ).toBe(true);

        expect(
          inBounds(map.goal, map.rows, map.cols),
          `${map.id}: goal out of bounds`,
        ).toBe(true);

        for (const orb of map.orbs) {
          expect(
            inBounds(orb, map.rows, map.cols),
            `${map.id}: orb ${orb} out of bounds`,
          ).toBe(true);
        }

        for (const pad of map.safePads) {
          expect(
            inBounds(pad, map.rows, map.cols),
            `${map.id}: safe pad ${pad} out of bounds`,
          ).toBe(true);
        }

        for (const wall of map.walls) {
          expect(
            inBounds(wall, map.rows, map.cols),
            `${map.id}: wall ${wall} out of bounds`,
          ).toBe(true);
        }
      }
    },
  );

  it.each(Object.entries(BANDS))(
    "%s: important objects do not overlap walls",
    (_, maps) => {
      for (const map of Object.values(maps)) {
        const wallSet = new Set(
          map.walls.map(([r, c]) => `${r}-${c}`),
        );

        expect(
          wallSet.has(`${map.start[0]}-${map.start[1]}`),
          `${map.id}: start is inside a wall`,
        ).toBe(false);

        expect(
          wallSet.has(`${map.goal[0]}-${map.goal[1]}`),
          `${map.id}: goal is inside a wall`,
        ).toBe(false);

        for (const orb of map.orbs) {
          expect(
            wallSet.has(`${orb[0]}-${orb[1]}`),
            `${map.id}: orb ${orb} overlaps a wall`,
          ).toBe(false);
        }

        for (const pad of map.safePads) {
          expect(
            wallSet.has(`${pad[0]}-${pad[1]}`),
            `${map.id}: safe pad ${pad} overlaps a wall`,
          ).toBe(false);
        }
      }
    },
  );

  it.each(Object.entries(BANDS))(
    "%s: sweeper definitions are valid",
    (_, maps) => {
      for (const map of Object.values(maps)) {
        const ids = new Set<string>();

        for (const sweeper of map.sweepers) {
          expect(
            ids.has(sweeper.id),
            `${map.id}: duplicate sweeper id ${sweeper.id}`,
          ).toBe(false);

          ids.add(sweeper.id);

          expect(
            sweeper.startIndex >= 0 &&
              sweeper.startIndex < sweeper.loop.length - 1,
            `${map.id}: invalid startIndex for ${sweeper.id}`,
          ).toBe(true);

          expect(
            sweeper.loop.length >= 2,
            `${map.id}: sweeper ${sweeper.id} loop too short`,
          ).toBe(true);

          expect(
            sweeper.loop[0],
            `${map.id}: sweeper ${sweeper.id} loop not closed`,
          ).toEqual(
            sweeper.loop[sweeper.loop.length - 1],
          );

          for (const pos of sweeper.loop) {
            expect(
              inBounds(pos, map.rows, map.cols),
              `${map.id}: sweeper ${sweeper.id} out of bounds`,
            ).toBe(true);
          }
        }
      }
    },
  );

  it.each(Object.entries(BANDS))(
    "%s: orb positions are unique",
    (_, maps) => {
      for (const map of Object.values(maps)) {
        const keys = map.orbs.map(([r, c]) => `${r}-${c}`);

        expect(
          new Set(keys).size,
          `${map.id}: duplicate orb positions`,
        ).toBe(keys.length);
      }
    },
  );
});

