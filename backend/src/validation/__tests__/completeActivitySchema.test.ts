import { describe, expect, it } from "vitest";
import { GAME_SPECIFIC_MAX_BYTES } from "../gameSpecific";
import { completeActivitySchema } from "../schemas";

const base = {
  moduleSlug: "stem-1-intro",
  activityId: "act-1",
};

const validMoveMeasure = {
  dash: 5,
  jump: 7,
  toss: 3,
  impEvent: "dash" as const,
  impScore: 4,
  exitCorrect: true,
};

describe("completeActivitySchema gameSpecific", () => {
  it("E-1: omitted gameSpecific parses fine", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: { gameKey: "move_measure", score: 10 },
    });
    expect(parsed.success).toBe(true);
  });

  it('E-2: gameSpecific without gameKey fails with path ["gameSpecific"]', () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: { gameSpecific: validMoveMeasure },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // Spec refers to the keyed issue under `gameSpecific`; Zod may include
      // the parent `result` segment depending on where the superRefine lives.
      const paths = parsed.error.issues.map((i) => i.path);
      expect(paths.some((p) => p[p.length - 1] === "gameSpecific")).toBe(true);
    }
  });

  it("E-4: unregistered gameKey fails", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: {
        gameKey: "not_a_registered_game",
        gameSpecific: validMoveMeasure,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("E-5: extra key inside gameSpecific fails via .strict()", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: {
        gameKey: "move_measure",
        gameSpecific: { ...validMoveMeasure, smuggle: true },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("E-6: array gameSpecific fails", () => {
    expect(
      completeActivitySchema.safeParse({
        ...base,
        result: { gameKey: "move_measure", gameSpecific: [1, 2] },
      }).success,
    ).toBe(false);
  });

  it("E-6: string gameSpecific fails", () => {
    expect(
      completeActivitySchema.safeParse({
        ...base,
        result: { gameKey: "move_measure", gameSpecific: "nope" },
      }).success,
    ).toBe(false);
  });

  it("E-6: number gameSpecific fails", () => {
    expect(
      completeActivitySchema.safeParse({
        ...base,
        result: { gameKey: "move_measure", gameSpecific: 42 },
      }).success,
    ).toBe(false);
  });

  it("E-9: explicit null gameSpecific fails", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: { gameKey: "move_measure", gameSpecific: null },
    });
    expect(parsed.success).toBe(false);
  });

  it("E-7: serialized payload larger than GAME_SPECIFIC_MAX_BYTES fails", () => {
    const padded: Record<string, unknown> = { ...validMoveMeasure };
    let i = 0;
    while (JSON.stringify(padded).length <= GAME_SPECIFIC_MAX_BYTES) {
      padded[`pad_${i++}`] = "x".repeat(64);
    }
    expect(JSON.stringify(padded).length).toBeGreaterThan(GAME_SPECIFIC_MAX_BYTES);

    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: { gameKey: "move_measure", gameSpecific: padded },
    });
    expect(parsed.success).toBe(false);
  });

  it("E-8: after parse(), result.gameSpecific is the raw value (superRefine does not transform)", () => {
    const raw = { ...validMoveMeasure };
    const parsed = completeActivitySchema.parse({
      ...base,
      result: { gameKey: "move_measure", gameSpecific: raw },
    });
    // Documents that superRefine validates without transforming — Part C must re-parse.
    expect(parsed.result?.gameSpecific).toEqual(raw);
    expect(parsed.result?.gameSpecific).toBe(raw);
  });

  it("R-1 via schema: valid move_measure gameSpecific is retained after parse", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: { gameKey: "move_measure", gameSpecific: validMoveMeasure },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.result?.gameSpecific).toEqual(validMoveMeasure);
    }
  });

  it("G-002: existing result fields still parse identically", () => {
    const parsed = completeActivitySchema.safeParse({
      ...base,
      result: {
        gameKey: "move_measure",
        score: 42,
        total: 100,
        streakMax: 7,
        roundsCompleted: 3,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.result).toEqual({
        gameKey: "move_measure",
        score: 42,
        total: 100,
        streakMax: 7,
        roundsCompleted: 3,
      });
    }
  });
});
