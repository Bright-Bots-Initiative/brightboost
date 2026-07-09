import type { Dispatch, SetStateAction } from "react";
import type { LocalizedField } from "@/utils/localizedContent";
import type { GradeBand } from "@/hooks/useGradeBand";

export type QuizQuestion = {
  id: string;
  prompt: LocalizedField;
  choices: LocalizedField[];
  answerIndex: number;
  hint?: LocalizedField;
  explanation?: LocalizedField;
};

export type QuizPhase = "answering" | "feedback" | "summary";

export type QuizState = {
  phase: QuizPhase;
  currentIndex: number;
  selections: Record<string, number>;
  correctCount: number;
  lastResult: "correct" | "incorrect" | null;
};

export type QuizAction =
  | { type: "ANSWER"; questionId: string; choiceIndex: number }
  | { type: "NEXT" }
  | { type: "RESET" };

export type QuizVariant = "instant" | "legacy";

export type InstantQuizTrackContext = {
  moduleSlug: string | undefined;
  activityId: string | undefined;
  gradeBand: GradeBand;
};

export type InstantQuizProps = {
  title: string;
  questions: QuizQuestion[];
  shuffleMap: Record<string, number[]>;
  onComplete: (score: number) => Promise<boolean> | boolean;
  trackContext: InstantQuizTrackContext;
  pickIndex?: (len: number) => number;
};

export type LegacyListQuizProps = {
  title: string;
  questions: QuizQuestion[];
  shuffleMap: Record<string, number[]>;
  answers: Record<string, number>;
  submitted: boolean;
  incorrectIds: string[];
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
  setSubmitted: Dispatch<SetStateAction<boolean>>;
  setIncorrectIds: Dispatch<SetStateAction<string[]>>;
  onComplete: () => void | Promise<boolean>;
  isQuizOnly: boolean;
  onBackToStory: () => void;
  onBackToModule: () => void;
};
