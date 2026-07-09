import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  createInitialQuizState,
  quizReducer,
  useInstantFeedbackQuiz,
} from "@/components/activities/quiz/useInstantFeedbackQuiz";
import type { QuizAction, QuizQuestion, QuizState } from "@/components/activities/quiz/types";
import {
  threeQuestionFixture,
  singleQuestionFixture,
  malformedAnswerIndexFixture,
} from "@/test/quizFixtures";

function reduce(
  questions: QuizQuestion[],
  state: QuizState,
  action: QuizAction,
): QuizState {
  return quizReducer(state, action, questions);
}

function answerCurrent(
  questions: QuizQuestion[],
  state: QuizState,
  choiceIndex: number,
): QuizState {
  const current = questions[state.currentIndex];
  if (!current) return state;
  return reduce(questions, state, {
    type: "ANSWER",
    questionId: current.id,
    choiceIndex,
  });
}

function assertI1(questions: QuizQuestion[], state: QuizState): void {
  if (state.phase === "answering") {
    const current = questions[state.currentIndex];
    if (current) {
      expect(state.selections[current.id]).toBeUndefined();
    }
  }
}

function assertI2(state: QuizState): void {
  const selectionCount = Object.keys(state.selections).length;
  expect(state.correctCount).toBeLessThanOrEqual(selectionCount);
  expect(selectionCount).toBeLessThanOrEqual(state.currentIndex + 1);
}

function assertI4(prev: QuizState, next: QuizState): void {
  for (const [id, value] of Object.entries(prev.selections)) {
    expect(next.selections[id]).toBe(value);
  }
}

function assertI5(questions: QuizQuestion[], state: QuizState): void {
  if (state.phase === "summary") {
    for (const q of questions) {
      expect(state.selections[q.id]).toBeDefined();
    }
  }
}

function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("createInitialQuizState", () => {
  it("B1-01: initial state has answering phase, index 0, empty selections", () => {
    const state = createInitialQuizState(threeQuestionFixture);
    expect(state).toEqual({
      phase: "answering",
      currentIndex: 0,
      selections: {},
      correctCount: 0,
      lastResult: null,
    });
  });
});

describe("quizReducer", () => {
  it("B1-02: unknown action returns state unchanged", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const next = quizReducer(
      initial,
      { type: "UNKNOWN" } as unknown as QuizAction,
      threeQuestionFixture,
    );
    expect(next).toBe(initial);
  });

  it("B1-03: ANSWER correct records selection and enters feedback", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const next = reduce(threeQuestionFixture, initial, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 0,
    });

    expect(next.phase).toBe("feedback");
    expect(next.lastResult).toBe("correct");
    expect(next.correctCount).toBe(1);
    expect(next.selections.q1).toBe(0);
  });

  it("B1-04: ANSWER incorrect leaves correctCount unchanged", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const next = reduce(threeQuestionFixture, initial, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 1,
    });

    expect(next.phase).toBe("feedback");
    expect(next.lastResult).toBe("incorrect");
    expect(next.correctCount).toBe(0);
    expect(next.selections.q1).toBe(1);
  });

  // covered-by AC-2.5 (advance only on NEXT; no retry path)
  it("B1-06: NEXT mid-quiz advances index; NEXT on last question enters summary", () => {
    let state = createInitialQuizState(threeQuestionFixture);

    state = answerCurrent(threeQuestionFixture, state, 0);
    expect(state.phase).toBe("feedback");

    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    expect(state.phase).toBe("answering");
    expect(state.currentIndex).toBe(1);
    expect(state.lastResult).toBeNull();

    state = answerCurrent(threeQuestionFixture, state, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    expect(state.currentIndex).toBe(2);

    state = answerCurrent(threeQuestionFixture, state, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    expect(state.phase).toBe("summary");
    expect(state.lastResult).toBeNull();
  });

  it("I-1: answering phase has no selection for current question", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    expect(initial.phase).toBe("answering");
    expect(initial.selections.q1).toBeUndefined();

    let state = answerCurrent(threeQuestionFixture, initial, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    expect(state.phase).toBe("answering");
    expect(state.selections.q2).toBeUndefined();
  });

  it("I-2: correctCount bounded by selections and currentIndex", () => {
    let state = createInitialQuizState(threeQuestionFixture);
    assertI2(state);

    state = answerCurrent(threeQuestionFixture, state, 1);
    assertI2(state);
    expect(state.correctCount).toBe(0);
    expect(Object.keys(state.selections).length).toBe(1);

    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    state = answerCurrent(threeQuestionFixture, state, 0);
    assertI2(state);
    expect(state.correctCount).toBe(1);
    expect(Object.keys(state.selections).length).toBe(2);
    expect(state.currentIndex).toBe(1);
  });

  it("I-5: summary reachable only after all questions answered", () => {
    let state = createInitialQuizState(threeQuestionFixture);

    state = answerCurrent(threeQuestionFixture, state, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    state = answerCurrent(threeQuestionFixture, state, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });
    state = answerCurrent(threeQuestionFixture, state, 0);
    state = reduce(threeQuestionFixture, state, { type: "NEXT" });

    expect(state.phase).toBe("summary");
    expect(Object.keys(state.selections).length).toBe(threeQuestionFixture.length);
    for (const q of threeQuestionFixture) {
      expect(state.selections[q.id]).toBeDefined();
    }
  });

  // covered-by AC-1.3, AC-3.3
  it("I-3: ignores ANSWER during feedback", () => {
    let state = createInitialQuizState(threeQuestionFixture);
    state = answerCurrent(threeQuestionFixture, state, 0);

    const after = reduce(threeQuestionFixture, state, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 1,
    });
    expect(after).toBe(state);
  });

  // covered-by AC-3.3 (first tap final — double-tap no-op)
  it("E-3: double-tap same choice is a no-op", () => {
    let state = createInitialQuizState(threeQuestionFixture);
    state = answerCurrent(threeQuestionFixture, state, 0);

    const after = reduce(threeQuestionFixture, state, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 0,
    });
    expect(after).toBe(state);
  });

  // covered-by AC-3.3 (first tap final — only first choice registers)
  it("E-4: rapid tap on different choices only registers the first", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const afterFirst = answerCurrent(threeQuestionFixture, initial, 1);
    const afterSecond = reduce(threeQuestionFixture, afterFirst, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 2,
    });

    expect(afterSecond).toBe(afterFirst);
    expect(afterSecond.selections.q1).toBe(1);
  });

  it("I-3: NEXT ignored during answering", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const after = reduce(threeQuestionFixture, initial, { type: "NEXT" });
    expect(after).toBe(initial);
  });

  it("I-6 precondition: NEXT ignored during summary", () => {
    let state = createInitialQuizState(singleQuestionFixture);
    state = answerCurrent(singleQuestionFixture, state, 0);
    state = reduce(singleQuestionFixture, state, { type: "NEXT" });
    expect(state.phase).toBe("summary");

    const after = reduce(singleQuestionFixture, state, { type: "NEXT" });
    expect(after).toBe(state);
  });

  it("ANSWER with stale questionId ignored", () => {
    const initial = createInitialQuizState(threeQuestionFixture);
    const after = reduce(threeQuestionFixture, initial, {
      type: "ANSWER",
      questionId: "q2",
      choiceIndex: 0,
    });
    expect(after).toBe(initial);
  });

  it("E-6: RESET from every phase returns initial state", () => {
    const phases: QuizState[] = [];

    const answering = createInitialQuizState(threeQuestionFixture);
    phases.push(answering);

    const feedback = answerCurrent(threeQuestionFixture, answering, 0);
    phases.push(feedback);

    const mid = reduce(threeQuestionFixture, feedback, { type: "NEXT" });
    phases.push(mid);

    let summary = createInitialQuizState(singleQuestionFixture);
    summary = answerCurrent(singleQuestionFixture, summary, 0);
    summary = reduce(singleQuestionFixture, summary, { type: "NEXT" });
    phases.push(summary);

    for (const phaseState of phases) {
      const reset = reduce(threeQuestionFixture, phaseState, { type: "RESET" });
      expect(reset).toEqual(createInitialQuizState(threeQuestionFixture));
    }
  });

  it("E-12: answerIndex out of bounds grades incorrect without throwing", () => {
    const initial = createInitialQuizState(malformedAnswerIndexFixture);
    const next = answerCurrent(malformedAnswerIndexFixture, initial, 0);

    expect(next.lastResult).toBe("incorrect");
    expect(next.correctCount).toBe(0);
    expect(next.phase).toBe("feedback");
  });

  it("I-4: recorded selection is never overwritten", () => {
    const state: QuizState = {
      phase: "answering",
      currentIndex: 0,
      selections: { q1: 1 },
      correctCount: 0,
      lastResult: null,
    };

    const after = reduce(threeQuestionFixture, state, {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 2,
    });

    expect(after).toBe(state);
    expect(after.selections.q1).toBe(1);
  });

  it("I-7: reducer is pure and deterministic", () => {
    const state = createInitialQuizState(threeQuestionFixture);
    const action: QuizAction = {
      type: "ANSWER",
      questionId: "q1",
      choiceIndex: 0,
    };

    const first = quizReducer(state, action, threeQuestionFixture);
    const second = quizReducer(state, action, threeQuestionFixture);

    expect(first).toEqual(second);
    expect(first).not.toBe(state);
  });

  it("B2-07: property loop maintains I-1, I-2, I-4, I-5 across 200 random sequences", () => {
    const fixtures = [
      threeQuestionFixture,
      singleQuestionFixture,
      malformedAnswerIndexFixture,
    ];

    for (let seq = 0; seq < 200; seq++) {
      const questions = fixtures[seq % fixtures.length];
      const rng = createSeededRng(seq + 1);
      let state = createInitialQuizState(questions);
      const frozenSelections: Record<string, number> = {};

      for (let step = 0; step < 40; step++) {
        assertI1(questions, state);
        assertI2(state);
        assertI5(questions, state);

        const prev = state;

        if (state.phase === "answering") {
          const current = questions[state.currentIndex];
          if (!current) break;
          const choiceIndex = Math.floor(rng() * Math.max(current.choices.length, 1));
          state = answerCurrent(questions, state, choiceIndex);
        } else if (state.phase === "feedback") {
          state = reduce(questions, state, { type: "NEXT" });
        } else {
          break;
        }

        assertI4(prev, state);

        for (const [id, value] of Object.entries(state.selections)) {
          if (frozenSelections[id] === undefined) {
            frozenSelections[id] = value;
          } else {
            expect(state.selections[id]).toBe(frozenSelections[id]);
          }
        }
      }
    }
  });
});

describe("useInstantFeedbackQuiz", () => {
  it("B3-01: hook exposes state and callbacks that mirror reducer transitions", () => {
    const { result } = renderHook(() =>
      useInstantFeedbackQuiz(threeQuestionFixture),
    );

    expect(result.current.state).toEqual(createInitialQuizState(threeQuestionFixture));
    expect(typeof result.current.answer).toBe("function");
    expect(typeof result.current.next).toBe("function");
    expect(typeof result.current.reset).toBe("function");

    act(() => {
      result.current.answer("q1", 0);
    });
    expect(result.current.state.phase).toBe("feedback");
    expect(result.current.state.lastResult).toBe("correct");

    act(() => {
      result.current.next();
    });
    expect(result.current.state.phase).toBe("answering");
    expect(result.current.state.currentIndex).toBe(1);
  });

  it("E-6: RESET when question id list changes while mounted", () => {
    const alternateFixture: QuizQuestion[] = [
      {
        id: "alt-q1",
        prompt: { en: "Alt?", es: "¿Alt?" },
        choices: [
          { en: "Yes", es: "Sí" },
          { en: "No", es: "No" },
        ],
        answerIndex: 0,
      },
    ];

    const { result, rerender } = renderHook(
      ({ questions }) => useInstantFeedbackQuiz(questions),
      { initialProps: { questions: threeQuestionFixture } },
    );

    act(() => {
      result.current.answer("q1", 0);
    });
    expect(result.current.state.phase).toBe("feedback");

    rerender({ questions: alternateFixture });

    expect(result.current.state).toEqual(createInitialQuizState(alternateFixture));
  });

  it("E-6: reset() callback restores initial state when invoked mid-journey", () => {
    const { result } = renderHook(() =>
      useInstantFeedbackQuiz(threeQuestionFixture),
    );

    act(() => {
      result.current.answer("q1", 0);
    });
    expect(result.current.state.phase).toBe("feedback");

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual(createInitialQuizState(threeQuestionFixture));
  });
});
