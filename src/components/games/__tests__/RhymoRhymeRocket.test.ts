import { describe, it, expect } from "vitest";
import { advanceRhymoRound, RHYME_ROUNDS } from "../RhymoRhymeRocketGame";

describe("advanceRhymoRound", () => {
  it("increments score on correct answer", () => {
    const result = advanceRhymoRound(
      { roundIndex: 0, score: 0 },
      "hat", // correct answer for "cat"
    );
    expect(result.score).toBe(1);
    expect(result.lastCorrect).toBe(true);
    expect(result.roundIndex).toBe(1);
    expect(result.done).toBe(false);
  });

  it("does not increment score on wrong answer", () => {
    const result = advanceRhymoRound(
      { roundIndex: 0, score: 0 },
      "dog", // wrong answer
    );
    expect(result.score).toBe(0);
    expect(result.lastCorrect).toBe(false);
    expect(result.roundIndex).toBe(1);
  });

  it("marks done on last round", () => {
    const lastIndex = RHYME_ROUNDS.length - 1;
    const result = advanceRhymoRound(
      { roundIndex: lastIndex, score: 4 },
      RHYME_ROUNDS[lastIndex].answer,
    );
    expect(result.done).toBe(true);
    expect(result.score).toBe(5);
  });

  it("returns correct answer and prompt info", () => {
    const result = advanceRhymoRound(
      { roundIndex: 2, score: 1 },
      "tree", // wrong answer for "star"
    );
    expect(result.correctAnswer).toBe("car");
    expect(result.promptWord).toBe("star");
  });
});
