/**
 * Maze Map solvability guard — every map must be
 * programmatically provably completable. The goal and all orbs must be reachable.
 */

import { describe, expect, it } from "vitest";
import { MAPS_k2 } from "../MazeMapsGame";
import { MAPS_G3_5 } from "../gradeBandContent";

const CATALOGS = {
  k2: MAPS_k2,
  g3_5: MAPS_G3_5,
} as const;


function key([r, c]: [number, number]): string {
  return `${r},${c}`;
}

function reachableCells(map: {
  rows: number;
  cols: number;
  start: [number, number];
  walls: [number, number][];
}) {
  const wallSet = new Set(map.walls.map(key));
  const visited = new Set<string>();
  const queue: [number, number][] = [map.start];

  visited.add(key(map.start));

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;

    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (
        nr < 0 ||
        nr >= map.rows ||
        nc < 0 ||
        nc >= map.cols
      ) {
        continue;
      }

      const k = `${nr},${nc}`;

      if (wallSet.has(k) || visited.has(k)) {
        continue;
      }

      visited.add(k);
      queue.push([nr, nc]);
    }
  }

  return visited;
}

describe("Maze Maps solvability guard", () => {
  it.each(
    Object.entries(CATALOGS).flatMap(([catalog, maps]) =>
      Object.values(maps).map((map) => [
        `${catalog}/${map.id}`,
        map,
      ] as const),
    ),
  )("%s: all orbs and goal are reachable", (_name, map) => {
    const reachable = reachableCells(map);

    for (const orb of map.orbs) {
      expect(
        reachable.has(key(orb)),
        `${map.id}: orb at ${orb} is unreachable`,
      ).toBe(true);
    }

    expect(
      reachable.has(key(map.goal)),
      `${map.id}: goal is unreachable`,
    ).toBe(true);
  });
});