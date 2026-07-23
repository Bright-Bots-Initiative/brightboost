import { describe, expect, it } from "vitest";
import {
  FRESH_PROGRESS,
  HOUSES,
  PATTERN_BOOK,
  SOURCE_ROWS,
  advanceProgress,
  applyPattern,
  blankCell,
  completeMetTargets,
  currentTarget,
  freshGrid,
  newlyUnlockedParts,
  patternIsAvailable,
  pickWonder,
  shouldInviteStorm,
  simulateRun,
  simulateTick,
  tapCell,
  unlockedParts,
  type Cell,
  type Progress,
  type RunStats,
} from "../waterworksSim";

function tick(grid: Cell[][], n: number, raining = false): Cell[][] {
  let g = grid;
  for (let i = 0; i < n; i++) g = simulateTick(g, raining);
  return g;
}

function stats(overrides: Partial<RunStats> = {}): RunStats {
  return {
    fieldsWatered: 0,
    fieldsPlaced: 0,
    fieldsFloodedEver: 0,
    housesFloodedEver: 0,
    stormTested: false,
    fishmouthUsed: false,
    anyFlood: false,
    ...overrides,
  };
}

// ── Grid construction ───────────────────────────────────────────────────────

describe("freshGrid", () => {
  it("places sources and houses on every band", () => {
    for (const band of ["k2", "g35", "g68"] as const) {
      const g = freshGrid(band);
      for (const r of SOURCE_ROWS) expect(g[r][0].type).toBe("source");
      for (const [r, c] of HOUSES) expect(g[r][c].type).toBe("house");
    }
  });

  it("gives Guided and 3-5 a starter channel; 6-8 opens blank", () => {
    expect(freshGrid("k2")[4][1].type).toBe("channel");
    expect(freshGrid("g35")[4][3].type).toBe("channel");
    expect(freshGrid("g68")[4][1].type).toBe("land");
  });
});

// ── Water physics ───────────────────────────────────────────────────────────

describe("simulateTick — flow", () => {
  it("water advances one cell per tick along a channel at full strength", () => {
    const g = tick(freshGrid("k2"), 4);
    expect(g[4][1].water).toBe(4);
    expect(g[4][3].water).toBe(4); // end of the starter channel
  });

  it("a field waters after 2 sustained ticks and does NOT flood from channels alone", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 4, 4, "field");
    const { grid, stats } = simulateRun(g, false);
    const field = grid[4][4];
    expect(field.watered).toBe(true);
    expect(field.water).toBe(3); // 4 − field loss 1
    expect(field.flooded).toBe(false);
    expect(stats.fieldsWatered).toBe(1);
    expect(stats.anyFlood).toBe(false);
  });

  it("鱼嘴 splits N/S/E and never emits back west", () => {
    let g = freshGrid("g68");
    g = g.map((row) => row.slice());
    g[3][2] = { ...blankCell("fishmouth"), water: 4 };
    g[2][2] = blankCell("channel"); // N
    g[4][2] = blankCell("channel"); // S
    g[3][3] = blankCell("channel"); // E
    g[3][1] = blankCell("channel"); // W — must stay dry
    const next = simulateTick(g, false);
    expect(next[2][2].water).toBe(4);
    expect(next[4][2].water).toBe(4);
    expect(next[3][3].water).toBe(4);
    expect(next[3][1].water).toBe(0);
  });

  it("宝瓶口 caps its cell at 2", () => {
    let g = freshGrid("g68");
    g = g.map((row) => row.slice());
    g[1][1] = { ...blankCell("channel"), water: 4 };
    g[1][2] = blankCell("bottleneck");
    const next = simulateTick(g, false);
    expect(next[1][2].water).toBe(2);
  });

  it("飞沙堰 caps its cell at 1 and flags the drain animation", () => {
    let g = freshGrid("g68");
    g = g.map((row) => row.slice());
    g[1][1] = { ...blankCell("channel"), water: 4 };
    g[1][2] = blankCell("sandweir");
    const next = simulateTick(g, false);
    expect(next[1][2].water).toBe(1);
    expect(next[1][2].draining).toBe(true);
  });

  it("a closed gate blocks; tapping toggles it; open conducts", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 4, 4, "gate"); // placed open
    g = tapCell(g, 4, 4, "channel"); // tapping a gate TOGGLES (never replaces)
    expect(g[4][4].type).toBe("gate");
    expect(g[4][4].gateOpen).toBe(false);
    g = tapCell(g, 4, 5, "channel");
    let run = tick(g, 8);
    expect(run[4][4].water).toBe(0); // closed gate pinned dry
    expect(run[4][5].water).toBe(0); // nothing passes
    g = tapCell(g, 4, 4, "channel"); // toggle back open
    run = tick(g, 8);
    expect(run[4][5].water).toBe(4); // open gate conducts full strength
  });

  it("rain adds +1 to conductors and +2 to fields, clamped to 4", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 4, 4, "field");
    const { grid, stats } = simulateRun(g, true);
    expect(grid[4][4].flooded).toBe(true); // 3 + 2 → clamped 4 = flood
    expect(stats.anyFlood).toBe(true);
    expect(grid[4][3].water).toBe(4); // channel stays clamped at 4
  });

  it("a house floods when a full channel runs beside it — NO rain required", () => {
    let g = freshGrid("g68");
    for (const [r, c] of [
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [8, 2],
    ] as const) {
      g = tapCell(g, r, c, "channel");
    }
    const { grid, stats } = simulateRun(g, false);
    expect(grid[8][3].type).toBe("house");
    expect(grid[8][3].flooded).toBe(true);
    expect(stats.housesFloodedEver).toBe(1);
    expect(stats.anyFlood).toBe(true); // "first flood however caused" trigger
  });

  it("NO GAME-OVER invariant: a flooded board keeps simulating and stays editable", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 4, 4, "field");
    const { grid } = simulateRun(g, true); // flooded
    const after = simulateTick(grid, true); // sim keeps running
    for (const row of after)
      for (const cell of row) {
        expect(cell.water).toBeGreaterThanOrEqual(0);
        expect(cell.water).toBeLessThanOrEqual(4);
      }
    const edited = tapCell(after, 4, 4, "erase"); // editing still works
    expect(edited[4][4].type).toBe("land");
  });
});

// ── Tap grammar ─────────────────────────────────────────────────────────────

describe("tapCell", () => {
  it("sources and houses are fixed", () => {
    const g = freshGrid("k2");
    expect(tapCell(g, 3, 0, "channel")[3][0].type).toBe("source");
    expect(tapCell(g, 1, 10, "erase")[1][10].type).toBe("house");
  });

  it("tapping a cell that already holds the selected part removes it", () => {
    let g = freshGrid("g68");
    g = tapCell(g, 2, 2, "field");
    expect(g[2][2].type).toBe("field");
    g = tapCell(g, 2, 2, "field");
    expect(g[2][2].type).toBe("land");
  });

  it("erase rubs a part out", () => {
    let g = freshGrid("k2");
    g = tapCell(g, 4, 1, "erase");
    expect(g[4][1].type).toBe("land");
  });
});

// ── Unlock ladder (Guided) ──────────────────────────────────────────────────

describe("unlock ladder", () => {
  it("Guided starts constrained; other bands get the full palette", () => {
    expect(unlockedParts("k2", FRESH_PROGRESS)).toEqual(["channel", "field"]);
    expect(unlockedParts("g35", FRESH_PROGRESS)).toHaveLength(6);
    expect(unlockedParts("g68", FRESH_PROGRESS)).toHaveLength(6);
  });

  it("first watered field → 鱼嘴; two fields in one run → 水闸", () => {
    const p1 = advanceProgress(
      FRESH_PROGRESS,
      stats({
        fieldsWatered: 1,
        fieldsPlaced: 1,
      }),
    );
    expect(unlockedParts("k2", p1)).toContain("fishmouth");
    expect(unlockedParts("k2", p1)).not.toContain("gate");
    const p2 = advanceProgress(
      p1,
      stats({
        fieldsWatered: 2,
        fieldsPlaced: 2,
      }),
    );
    expect(unlockedParts("k2", p2)).toContain("gate");
  });

  it("AMENDED TRIGGER: the protectors unlock on the first flood HOWEVER caused (a dry house-flood counts)", () => {
    const dryHouseFlood = advanceProgress(
      FRESH_PROGRESS,
      stats({
        housesFloodedEver: 1,
        anyFlood: true, // no rain involved
      }),
    );
    const parts = unlockedParts("k2", dryHouseFlood);
    expect(parts).toContain("sandweir");
    expect(parts).toContain("bottleneck");
  });

  it("newlyUnlockedParts reports each unlock exactly once (the announce beat)", () => {
    const p1 = advanceProgress(
      FRESH_PROGRESS,
      stats({
        fieldsWatered: 1,
        fieldsPlaced: 1,
      }),
    );
    expect(newlyUnlockedParts("k2", FRESH_PROGRESS, p1)).toEqual(["fishmouth"]);
    const p2 = advanceProgress(
      p1,
      stats({
        fieldsWatered: 1,
        fieldsPlaced: 1,
        fieldsFloodedEver: 1,
        anyFlood: true,
      }),
    );
    expect(newlyUnlockedParts("k2", p1, p2)).toEqual([
      "sandweir",
      "bottleneck",
    ]);
    expect(newlyUnlockedParts("k2", p2, p2)).toEqual([]);
  });

  it("BAND-SWITCH ISOLATION: visiting the Open band never leaks its full palette back into Guided", () => {
    // A kid with one earned unlock hops k2 → g68 → k2. The Open band's
    // everything-unlocked palette is BAND-derived, not progress-derived, so
    // returning to Guided must show exactly the earned set — nothing more.
    const earned = advanceProgress(
      FRESH_PROGRESS,
      stats({
        fieldsWatered: 1,
        fieldsPlaced: 1,
      }),
    );
    expect(unlockedParts("g68", earned)).toHaveLength(6); // Open: everything
    const backInGuided = unlockedParts("k2", earned); // same progress object
    expect(backInGuided).toEqual(["channel", "field", "fishmouth"]);
    expect(backInGuided).not.toContain("sandweir"); // un-earned stays locked
    expect(backInGuided).not.toContain("bottleneck");
    expect(backInGuided).not.toContain("gate");
    // and the earned unlock genuinely persists across the round trip
    expect(backInGuided).toContain("fishmouth");
  });

  it("REACHABILITY: Shíxī invites the storm after 3 floodless Guided runs", () => {
    let p: Progress = FRESH_PROGRESS;
    const cleanRun = stats({
      fieldsWatered: 1,
      fieldsPlaced: 1,
    });
    for (let i = 0; i < 3; i++) {
      expect(shouldInviteStorm("k2", p)).toBe(false);
      p = advanceProgress(p, cleanRun);
    }
    expect(shouldInviteStorm("k2", p)).toBe(true);
    expect(shouldInviteStorm("g35", p)).toBe(false); // Guided-only nudge
    const flooded = advanceProgress(p, { ...cleanRun, anyFlood: true });
    expect(shouldInviteStorm("k2", flooded)).toBe(false); // beat reached
  });
});

// ── Shíxī's wondering question ──────────────────────────────────────────────

describe("pickWonder", () => {
  const base = stats({ fieldsWatered: 1, fieldsPlaced: 1 });

  it("storm invitation outranks everything (reachability)", () => {
    expect(
      pickWonder({
        stats: { ...base, anyFlood: true },
        newPartUsed: "fishmouth",
        inviteStorm: true,
      }).key,
    ).toBe("waterworks.wonder.stormInvite");
  });

  it("a just-unlocked part used for the first time outranks the flood question", () => {
    expect(
      pickWonder({
        stats: { ...base, anyFlood: true },
        newPartUsed: "sandweir",
        inviteStorm: false,
      }).key,
    ).toBe("waterworks.wonder.newPart.sandweir");
  });

  it("flood → the flood wondering; clean → clean/next; dry → dry/favorite", () => {
    expect(
      pickWonder({ stats: { ...base, anyFlood: true }, inviteStorm: false })
        .key,
    ).toBe("waterworks.wonder.flood");
    expect(pickWonder({ stats: base, inviteStorm: false }, () => 0.1).key).toBe(
      "waterworks.wonder.clean",
    );
    expect(pickWonder({ stats: base, inviteStorm: false }, () => 0.9).key).toBe(
      "waterworks.wonder.next",
    );
    const dry = { ...base, fieldsWatered: 0 };
    expect(pickWonder({ stats: dry, inviteStorm: false }, () => 0.1).key).toBe(
      "waterworks.wonder.dry",
    );
  });
});

// ── Soft targets ────────────────────────────────────────────────────────────

describe("currentTarget", () => {
  it("suggests the first unmet, undismissed target for the band", () => {
    const t = currentTarget("k2", FRESH_PROGRESS, null, new Set());
    expect(t?.id).toBe("k2Water1");
    const dismissed = currentTarget(
      "k2",
      FRESH_PROGRESS,
      null,
      new Set(["k2Water1"]),
    );
    expect(dismissed?.id).toBe("k2Water2"); // dismissible, never a requirement
  });

  it("advances as progress meets targets", () => {
    const p = advanceProgress(
      FRESH_PROGRESS,
      stats({
        fieldsWatered: 2,
        fieldsPlaced: 2,
      }),
    );
    expect(currentTarget("k2", p, null, new Set())?.id).toBe("k2RainSafe");
  });

  it("never credits Rain goals on a dry run or Fish Mouth goals without water reaching one", () => {
    const dry = stats({ fieldsWatered: 3, fieldsPlaced: 3 });
    let progress = completeMetTargets("g35", FRESH_PROGRESS, dry);
    expect(progress.completedTargetIds).toEqual([]);

    const rainyWithoutFishMouth = stats({
      fieldsWatered: 3,
      fieldsPlaced: 3,
      stormTested: true,
    });
    progress = completeMetTargets("g35", FRESH_PROGRESS, rainyWithoutFishMouth);
    expect(progress.completedTargetIds).not.toContain("g35Water3");
  });

  it("stores achieved targets so a later run cannot make them reappear", () => {
    const successfulStorm = stats({
      fieldsWatered: 3,
      fieldsPlaced: 3,
      stormTested: true,
      fishmouthUsed: true,
    });
    const progress = completeMetTargets("g35", FRESH_PROGRESS, successfulStorm);
    expect(progress.completedTargetIds).toEqual(
      expect.arrayContaining(["g35Water3", "g35RainZeroFlood", "g35HousesDry"]),
    );
    expect(currentTarget("g35", progress, stats(), new Set())).toBeNull();
  });
});

// ── Pattern book (programmatic solvability guard) ───────────────────────────

describe("pattern book", () => {
  it("GUARD: every pattern waters at least one field on a dry run", () => {
    for (const pattern of PATTERN_BOOK) {
      const { stats } = simulateRun(applyPattern("g68", pattern), false);
      expect(
        stats.fieldsWatered,
        `pattern "${pattern.id}" must water a field`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        stats.anyFlood,
        `pattern "${pattern.id}" must not flood on a dry run`,
      ).toBe(false);
    }
  });

  it("the protected patterns survive the storm (zero flooded fields in rain)", () => {
    for (const id of ["safeFarm", "stormProofVillage"]) {
      const pattern = PATTERN_BOOK.find((p) => p.id === id)!;
      const { stats } = simulateRun(applyPattern("g68", pattern), true);
      expect(
        stats.fieldsFloodedEver,
        `"${id}" fields must stay safe in rain`,
      ).toBe(0);
      expect(stats.fieldsWatered).toBeGreaterThanOrEqual(1);
    }
  });

  it("the unprotected split river DOES flood in rain — the teaching contrast", () => {
    const pattern = PATTERN_BOOK.find((p) => p.id === "splitRiver")!;
    const { stats } = simulateRun(applyPattern("g68", pattern), true);
    expect(stats.anyFlood).toBe(true);
  });

  it("patterns never overwrite sources or houses", () => {
    for (const pattern of PATTERN_BOOK) {
      const g = applyPattern("k2", pattern);
      for (const r of SOURCE_ROWS) expect(g[r][0].type).toBe("source");
      for (const [r, c] of HOUSES) expect(g[r][c].type).toBe("house");
    }
  });

  it("marks Guided patterns unavailable until every required part is unlocked", () => {
    for (const pattern of PATTERN_BOOK) {
      expect(
        patternIsAvailable(pattern, unlockedParts("k2", FRESH_PROGRESS)),
      ).toBe(false);
      expect(
        patternIsAvailable(pattern, unlockedParts("g35", FRESH_PROGRESS)),
      ).toBe(true);
    }
  });
});
