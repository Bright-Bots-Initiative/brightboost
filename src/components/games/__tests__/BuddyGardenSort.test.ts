import { describe, it, expect } from "vitest";
import { scoreGardenPick, GARDEN_CARDS } from "../BuddyGardenSortGame";

describe("scoreGardenPick", () => {
  it("returns correct for matching bucket", () => {
    const waterCard = GARDEN_CARDS.find((c) => c.label === "Water")!;
    const result = scoreGardenPick(waterCard, "need");
    expect(result.correct).toBe(true);
    expect(result.explanation).toContain("Yes!");
  });

  it("returns incorrect for wrong bucket", () => {
    const waterCard = GARDEN_CARDS.find((c) => c.label === "Water")!;
    const result = scoreGardenPick(waterCard, "part");
    expect(result.correct).toBe(false);
    expect(result.explanation).toContain("Almost");
    expect(result.explanation).toContain("Plant Need");
  });

  it("correctly identifies plant parts", () => {
    const leafCard = GARDEN_CARDS.find((c) => c.label === "Leaf")!;
    const result = scoreGardenPick(leafCard, "part");
    expect(result.correct).toBe(true);
  });

  it("correctly identifies not-helpful items", () => {
    const rockCard = GARDEN_CARDS.find((c) => c.label === "Rock")!;
    const result = scoreGardenPick(rockCard, "not-helpful");
    expect(result.correct).toBe(true);
  });

  it("returns explanation with item label", () => {
    const rootCard = GARDEN_CARDS.find((c) => c.label === "Root")!;
    const result = scoreGardenPick(rootCard, "need");
    expect(result.explanation).toContain("Root");
  });
});
