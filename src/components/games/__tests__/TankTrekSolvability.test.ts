/**
 * Tank Trek solvability guard — every level in every catalog must be
 * programmatically provably completable, within its own command cap, with
 * 3 stars reachable. Hand-authored levels broke once (g35-2-1 "Chip
 * Collector" shipped with chips uncollectable inside its maxCommands cap);
 * this guard turns the next authoring mistake into red CI instead of a
 * production dead-end for a grade-3-5 student.
 *
 * Contract per level (matching the game's actual semantics — completion =
 * reach the goal; chips are collectibles, sometimes on optional branches):
 *  1. The FULL objective (every chip + goal) is geometrically reachable.
 *  2. GOAL completion fits within maxCommands with ≥2 commands of headroom
 *     (a cap equal to the only solution leaves zero room to think).
 *  3. The FULL objective also fits within maxCommands with headroom —
 *     chips must never be a trap a kid can chase but not finish.
 *  4. 3 stars (forwards ≤ par) is reachable on the goal objective — pars
 *     are authored as shortest-path footstep counts (see PR #605).
 *  5. The full-objective route earns ≥2 stars (forwards ≤ par + 2) —
 *     collecting everything must never feel like punishment.
 */
import { describe, expect, it } from "vitest";
import { BUILTIN_LEVELS } from "../TankTrekGame";
import { TANK_TREK_G35_LEVELS } from "../gradeBandContent";
import { DEMO_CONFIG } from "@/pages/TryDemo";
import {
  solveTankLevel,
  type SolvableLevel,
} from "@/test/tankTrekSolver";

interface CatalogEntry {
  catalog: string;
  level: SolvableLevel;
}

function collect(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const ch of BUILTIN_LEVELS.chapters) {
    for (const level of ch.levels) {
      entries.push({ catalog: "builtin", level: level as SolvableLevel });
    }
  }
  for (const ch of TANK_TREK_G35_LEVELS.chapters) {
    for (const level of ch.levels) {
      entries.push({ catalog: "g35", level: level as unknown as SolvableLevel });
    }
  }
  for (const ch of DEMO_CONFIG.chapters) {
    for (const level of ch.levels) {
      entries.push({ catalog: "demo", level: level as SolvableLevel });
    }
  }
  return entries;
}

describe("Tank Trek level solvability guard", () => {
  const entries = collect();

  it("covers all catalogs (builtin + g35 + /try demo)", () => {
    const catalogs = new Set(entries.map((e) => e.catalog));
    expect(catalogs).toEqual(new Set(["builtin", "g35", "demo"]));
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it.each(entries.map((e) => [`${e.catalog}/${e.level.id}`, e] as const))(
    "%s: solvable within cap, 3 stars reachable, chips never a trap",
    (_name, entry) => {
      const { level } = entry;
      const goal = solveTankLevel(level, "goal");
      const full = solveTankLevel(level, "full");

      // 1. Reachability — both the goal and the full objective.
      expect(
        goal,
        `${level.id}: the goal is UNREACHABLE — check the grid`,
      ).not.toBeNull();
      expect(
        full,
        `${level.id}: the full objective (all chips + goal) is UNREACHABLE — a chip is walled off`,
      ).not.toBeNull();

      // 2 + 3. Cap fits with ≥2 headroom — for completion AND for chips.
      if (level.maxCommands !== undefined) {
        expect(
          goal!.minTotalCommands,
          `${level.id}: completing needs ${goal!.minTotalCommands} commands but maxCommands is ${level.maxCommands} — dead-end (or zero thinking room)`,
        ).toBeLessThanOrEqual(level.maxCommands - 2);
        expect(
          full!.minTotalCommands,
          `${level.id}: collecting all chips needs ${full!.minTotalCommands} commands but maxCommands is ${level.maxCommands} — the chips are a trap`,
        ).toBeLessThanOrEqual(level.maxCommands - 2);
      }

      // 4. 3 stars reachable (goal objective; pars are footstep counts).
      expect(
        level.par,
        `${level.id}: missing par — author it as the optimal forward-move count (${goal!.minForwardMoves})`,
      ).toBeDefined();
      expect(
        goal!.minForwardMoves,
        `${level.id}: optimal completion uses ${goal!.minForwardMoves} forward moves but par is ${level.par} — 3 stars is unreachable`,
      ).toBeLessThanOrEqual(level.par!);

      // 5. Full-objective route earns ≥2 stars.
      expect(
        full!.minForwardMoves,
        `${level.id}: the all-chips route uses ${full!.minForwardMoves} forwards vs par ${level.par} — collecting everything would rate only 1 star`,
      ).toBeLessThanOrEqual(level.par! + 2);
    },
  );

  it("prints the proof table (informational)", () => {
    const rows = entries.map(({ catalog, level }) => {
      const goal = solveTankLevel(level, "goal");
      const full = solveTankLevel(level, "full");
      return {
        level: `${catalog}/${level.id}`,
        goalCmds: goal?.minTotalCommands ?? "UNREACHABLE",
        fullCmds: full?.minTotalCommands ?? "UNREACHABLE",
        cap: level.maxCommands ?? "—",
        capMargin:
          full && level.maxCommands !== undefined
            ? level.maxCommands - full.minTotalCommands
            : "—",
        goalFwd: goal?.minForwardMoves ?? "—",
        fullFwd: full?.minForwardMoves ?? "—",
        par: level.par ?? "—",
        threeStar:
          goal && level.par !== undefined && goal.minForwardMoves <= level.par
            ? "yes"
            : "NO",
      };
    });
    console.table(rows);
    expect(rows.length).toBe(entries.length);
  });
});
