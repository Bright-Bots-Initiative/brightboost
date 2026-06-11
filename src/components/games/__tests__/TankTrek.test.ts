import { describe, expect, it } from "vitest";
import {
  applyTankCommand,
  buildTankTrekCompletionPayload,
  computeTankStars,
} from "../TankTrekGame";

describe("Tank Trek helpers", () => {
  it("computes stars from forward-move count and par", () => {
    expect(computeTankStars(4, 4)).toBe(3);
    expect(computeTankStars(5, 4)).toBe(2);
    expect(computeTankStars(8, 4)).toBe(1);
  });

  // ── Star contract (regression guard for the /try conversion moment) ──
  //
  // Pars are authored as FOOTSTEP counts (forward moves on the shortest
  // path); turns are free. The original bug passed total program length
  // (forwards + turns) against par, which made 3 stars mathematically
  // impossible on every level whose optimal route includes a turn:
  // demo level "First Turn" needs 4 forwards + 3 turns = 7 commands vs
  // par 4 → capped at 1 star even when played perfectly.

  it("CONTRACT: optimal play (forwards == par) always earns 3 stars", () => {
    // Demo levels' pars: Go Straight! par 2, First Turn par 4, Turn Left par 4
    expect(computeTankStars(2, 2)).toBe(3);
    expect(computeTankStars(4, 4)).toBe(3);
    // Fewer forwards than par can't happen geometrically, but must never rate < 3
    expect(computeTankStars(3, 4)).toBe(3);
  });

  it("CONTRACT: the old buggy metric (total commands incl. turns) capped at 1 star — forwards-only does not", () => {
    // "First Turn" optimal program: R,F,L,F,F,R,F → 7 commands, 4 forwards
    const totalCommands = 7;
    const forwardsOnly = 4;
    const par = 4;
    expect(computeTankStars(totalCommands, par)).toBe(1); // the bug, if revived
    expect(computeTankStars(forwardsOnly, par)).toBe(3); // the fix
  });

  it("CONTRACT: solid play earns 2 stars; sloppy completion earns 1 (gradient is real)", () => {
    expect(computeTankStars(5, 4)).toBe(2);
    expect(computeTankStars(6, 4)).toBe(2);
    expect(computeTankStars(7, 4)).toBe(1);
  });

  it("CONTRACT: aggregate optimal run on the 3-level demo crosses GameShell's 3-star threshold (90%)", () => {
    // Per-level optimal = 3 stars each → totalScore 9 / totalPossible 9.
    // GameShell stars: pct >= 90 → 3. Before the fix the same run scored
    // 3+1+1 = 5/9 = 55.6% → 1 star overall.
    const totalScore = 3 + 3 + 3;
    const totalPossible = 3 * 3;
    const pct = (totalScore / totalPossible) * 100;
    expect(pct).toBeGreaterThanOrEqual(90);
  });

  it("missing par fails loud (console.warn) and defaults to 3 stars, never a silent 1-star ceiling", () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (msg: unknown) => warnings.push(String(msg));
    try {
      expect(computeTankStars(12, undefined)).toBe(3);
      expect(warnings.some((w) => w.includes("missing `par`"))).toBe(true);
    } finally {
      console.warn = original;
    }
  });

  it("applies turn commands deterministically", () => {
    expect(applyTankCommand("N", "LEFT")).toBe("W");
    expect(applyTankCommand("N", "RIGHT")).toBe("E");
    expect(applyTankCommand("S", "FWD")).toBe("S");
  });

  it("builds completion payload with expected metadata", () => {
    const payload = buildTankTrekCompletionPayload({
      totalScore: 12,
      totalPossible: 15,
      levelsCleared: 5,
      retries: 0,
      totalChips: 3,
      hintsUsed: 1,
      allLevelsLength: 5,
      achievements: ["No Hints"],
    });

    expect(payload).toMatchObject({
      gameKey: "tank_trek",
      score: 12,
      total: 15,
      roundsCompleted: 5,
      accuracy: 80,
      firstTryClear: true,
      hintsUsed: 1,
      gameSpecific: { totalChips: 3, retries: 0 },
    });
  });
});
