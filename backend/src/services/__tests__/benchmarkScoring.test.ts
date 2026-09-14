import { describe, it, expect } from "vitest";
import { scoreBenchmarkSubmission } from "../benchmarkScoring";

const Q = [
  { id: "a", choices: ["x", "y"], correctIndex: 0, skillTag: "s1" },
  { id: "b", choices: ["x", "y", "z"], correctIndex: 2, skillTag: "s2" },
  { id: "c", choices: ["x"], correctIndex: 0 },
];

describe("#879 scoreBenchmarkSubmission", () => {
  it("SC-1: scores each canonical question once, in template order, with the template's skill tag", () => {
    const r = scoreBenchmarkSubmission(Q, [
      { questionId: "c", selectedIndex: 0 },
      { questionId: "b", selectedIndex: 1 },
      { questionId: "a", selectedIndex: 0 },
    ]);
    expect(r).toEqual({
      ok: true,
      score: 2,
      answers: [
        { questionId: "a", selectedIndex: 0, isCorrect: true, skillTag: "s1" },
        { questionId: "b", selectedIndex: 1, isCorrect: false, skillTag: "s2" },
        {
          questionId: "c",
          selectedIndex: 0,
          isCorrect: true,
          skillTag: "unknown",
        },
      ],
    });
  });

  it("SC-2: refuses duplicates, unknown ids, missing questions and out-of-range choices", () => {
    expect(
      scoreBenchmarkSubmission(Q, [
        { questionId: "a", selectedIndex: 0 },
        { questionId: "a", selectedIndex: 0 },
      ]).ok,
    ).toBe(false);
    expect(
      scoreBenchmarkSubmission(Q, [
        { questionId: "a", selectedIndex: 0 },
        { questionId: "b", selectedIndex: 0 },
        { questionId: "zzz", selectedIndex: 0 },
      ]).ok,
    ).toBe(false);
    expect(
      scoreBenchmarkSubmission(Q, [
        { questionId: "a", selectedIndex: 0 },
        { questionId: "b", selectedIndex: 0 },
      ]).ok,
    ).toBe(false);
    expect(
      scoreBenchmarkSubmission(Q, [
        { questionId: "a", selectedIndex: 2 },
        { questionId: "b", selectedIndex: 0 },
        { questionId: "c", selectedIndex: 0 },
      ]).ok,
    ).toBe(false);
  });

  it("SC-3: a template question without a choices array can never be answered", () => {
    const r = scoreBenchmarkSubmission(
      [{ id: "a", correctIndex: 0 }],
      [{ questionId: "a", selectedIndex: 0 }],
    );
    expect(r.ok).toBe(false);
  });

  it("SC-4: the score is bounded by the question count for any accepted submission", () => {
    for (let seed = 0; seed < 50; seed++) {
      const answers = Q.map((q, i) => ({
        questionId: q.id,
        selectedIndex: (seed * 7 + i) % (q.choices as string[]).length,
      }));
      const r = scoreBenchmarkSubmission(Q, answers);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(Q.length);
        expect(r.answers).toHaveLength(Q.length);
      }
    }
  });
});
