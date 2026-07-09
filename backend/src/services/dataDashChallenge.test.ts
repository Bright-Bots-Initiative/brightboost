import { describe, it, expect } from "vitest";
import { validateDataDashChallenge } from "./dataDashChallenge";

// Pool facts used to construct these cases (see DATA_DASH_POOL):
//   bean   full/medium/broad/pod/fast
//   fern   shade/high/frond/spore/medium
//   pine   full/low/needle/cone/slow
//   moss   shade/high/frond/spore/slow
//   pea/sunflower  full/medium/broad/pod/fast
//   hosta  shade/high/broad/pod/medium
//
// Valid baseline: cards bean+fern+pine+moss, sort by waterNeed (medium1/high2/
// low1 -> unique max high), hidden rule growthSpeed (fast/medium/slow/slow ->
// partition [bean][fern][moss,pine], which no other attribute matches here).

const valid = {
  v: 1 as const,
  cardIds: ["bean", "fern", "pine", "moss"],
  sortRule: "waterNeed" as const,
  inferRule: "growthSpeed" as const,
};

describe("validateDataDashChallenge", () => {
  it("accepts a solvable, unambiguous challenge", () => {
    expect(validateDataDashChallenge(valid)).toEqual({ ok: true });
  });

  it("rejects fewer than the minimum cards", () => {
    const r = validateDataDashChallenge({ ...valid, cardIds: ["bean", "fern", "pine"] });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown card", () => {
    const r = validateDataDashChallenge({ ...valid, cardIds: ["bean", "fern", "pine", "xyz"] });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid sort rule", () => {
    const r = validateDataDashChallenge({ ...valid, sortRule: "seedType" as never });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid hidden rule", () => {
    const r = validateDataDashChallenge({ ...valid, inferRule: "plantBed" as never });
    expect(r.ok).toBe(false);
  });

  it("rejects a sort rule that does not split the cards", () => {
    // All four are full-sun -> no split.
    const r = validateDataDashChallenge({
      v: 1,
      cardIds: ["bean", "pine", "pea", "sunflower"],
      sortRule: "sunlightNeed",
      inferRule: "growthSpeed",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a sort whose top group ties (chart question has no single answer)", () => {
    // sunlightNeed: full=[bean,pine]=2, shade=[fern,moss]=2 -> tie.
    const r = validateDataDashChallenge({
      v: 1,
      cardIds: ["bean", "pine", "fern", "moss"],
      sortRule: "sunlightNeed",
      inferRule: "growthSpeed",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a hidden rule that does not group the cards", () => {
    // All four are pod seedType -> single group.
    const r = validateDataDashChallenge({
      v: 1,
      cardIds: ["bean", "pea", "sunflower", "hosta"],
      sortRule: "sunlightNeed",
      inferRule: "seedType",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects an ambiguous hidden rule (another attribute groups identically)", () => {
    // For bean/fern/pine/moss, leafType == waterNeed == seedType partition.
    const r = validateDataDashChallenge({
      v: 1,
      cardIds: ["bean", "fern", "pine", "moss"],
      sortRule: "waterNeed",
      inferRule: "leafType",
    });
    expect(r.ok).toBe(false);
  });
});
