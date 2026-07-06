import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { QuizAction, QuizQuestion, QuizState } from "./types";

export function createInitialQuizState(_questions: QuizQuestion[]): QuizState {
  return {
    phase: "answering",
    currentIndex: 0,
    selections: {},
    correctCount: 0,
    lastResult: null,
  };
}

function isChoiceCorrect(q: QuizQuestion, choiceIndex: number): boolean {
  if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) {
    return false;
  }
  return choiceIndex === q.answerIndex;
}

export function quizReducer(
  state: QuizState,
  action: QuizAction,
  questions: QuizQuestion[],
): QuizState {
  switch (action.type) {
    case "RESET":
      return createInitialQuizState(questions);

    case "ANSWER": {
      if (state.phase !== "answering") {
        return state;
      }

      const current = questions[state.currentIndex];
      if (!current || action.questionId !== current.id) {
        return state;
      }

      if (state.selections[action.questionId] !== undefined) {
        return state;
      }

      const correct = isChoiceCorrect(current, action.choiceIndex);

      return {
        ...state,
        phase: "feedback",
        lastResult: correct ? "correct" : "incorrect",
        correctCount: state.correctCount + (correct ? 1 : 0),
        selections: {
          ...state.selections,
          [current.id]: action.choiceIndex,
        },
      };
    }

    case "NEXT": {
      if (state.phase !== "feedback") {
        return state;
      }

      if (state.currentIndex < questions.length - 1) {
        return {
          ...state,
          phase: "answering",
          currentIndex: state.currentIndex + 1,
          lastResult: null,
        };
      }

      return {
        ...state,
        phase: "summary",
        lastResult: null,
      };
    }

    default:
      return state;
  }
}

export function useInstantFeedbackQuiz(questions: QuizQuestion[]) {
  const [state, dispatch] = useReducer(
    (s: QuizState, a: QuizAction) => quizReducer(s, a, questions),
    questions,
    createInitialQuizState,
  );

  const questionIds = useMemo(
    () => questions.map((q) => q.id).join("\0"),
    [questions],
  );

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [questionIds]);

  const answer = useCallback((questionId: string, choiceIndex: number) => {
    dispatch({ type: "ANSWER", questionId, choiceIndex });
  }, [dispatch]);

  const next = useCallback(() => {
    dispatch({ type: "NEXT" });
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  return { state, answer, next, reset };
}
