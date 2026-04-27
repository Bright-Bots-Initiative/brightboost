import { describe, expect, it } from "vitest";
import {
  DATA_DASH_CARDS,
  buildChartCounts,
  buildCompletionPayload,
  calculateDataDashScore,
  checkChartAnswer,
  evaluateSortAssignment,
} from "../DataDashSortDiscoverGame";

describe("Data Dash utilities", () => {
  it("evaluates sort assignments against a rule", () => {
    const assignments = Object.fromEntries(
      DATA_DASH_CARDS.map((card) => [card.id, card.sunlightNeed]),
    );
    const result = evaluateSortAssignment(DATA_DASH_CARDS, assignments, "sunlightNeed");
    expect(result.correct).toBe(DATA_DASH_CARDS.length);
    expect(result.total).toBe(DATA_DASH_CARDS.length);
  });

  it("builds chart counts by rule", () => {
    const chart = buildChartCounts(DATA_DASH_CARDS, "sunlightNeed");
    expect(chart.find((r) => r.label === "full")?.count).toBeGreaterThan(0);
    expect(chart.reduce((sum, row) => sum + row.count, 0)).toBe(DATA_DASH_CARDS.length);
  });

  it("checks chart question answers", () => {
    expect(checkChartAnswer(2, 2)).toBe(true);
    expect(checkChartAnswer(2, 1)).toBe(false);
  });

  it("calculates score and evidence score", () => {
    const score = calculateDataDashScore({
      sortCorrect: 7,
      sortTotal: 8,
      inferredRuleCorrect: true,
      chartCorrect: 1,
      chartTotal: 2,
      hintsUsed: 0,
    });
    expect(score.score).toBe(9);
    expect(score.total).toBe(11);
    expect(score.accuracy).toBe(82);
    expect(score.evidenceScore).toBe(50);
  });

  it("builds completion payload with required fields", () => {
    const payload = buildCompletionPayload({
      sortCorrect: 8,
      sortTotal: 8,
      inferredRuleCorrect: true,
      chartCorrect: 2,
      chartTotal: 2,
      hintsUsed: 1,
      roundsCompleted: 3,
    });

    expect(payload).toMatchObject({
      gameKey: "data_dash_sort_discover",
      score: 11,
      total: 11,
      roundsCompleted: 3,
      accuracy: 100,
      evidenceScore: 100,
      hintsUsed: 1,
    });
  });

  it("is registered in game registry", async () => {
    const { GAME_COMPONENTS } = await import("../gameRegistry");
    expect(GAME_COMPONENTS.data_dash_sort_discover).toBeDefined();
  });
});
