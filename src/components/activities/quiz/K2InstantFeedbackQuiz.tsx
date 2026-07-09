import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import ActivityHeader from "@/components/activities/ActivityHeader";
import { track } from "@/lib/analytics";
import {
  resolveText,
  resolveChoiceList,
} from "@/utils/localizedContent";
import FeedbackPanel from "./FeedbackPanel";
import QuestionScreen from "./QuestionScreen";
import QuizSummary from "./QuizSummary";
import { useInstantFeedbackQuiz } from "./useInstantFeedbackQuiz";
import type { InstantQuizProps, QuizQuestion } from "./types";

function isAnswerInBounds(q: QuizQuestion): boolean {
  return q.answerIndex >= 0 && q.answerIndex < q.choices.length;
}

function isChoiceCorrect(q: QuizQuestion, choiceIndex: number): boolean {
  if (!isAnswerInBounds(q)) {
    return false;
  }
  return choiceIndex === q.answerIndex;
}

function defaultPickIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

function pickCheer(
  t: (key: string, opts?: { returnObjects?: boolean }) => unknown,
  lastResult: "correct" | "incorrect",
  pickIndex: (len: number) => number,
): string {
  const key =
    lastResult === "correct"
      ? "activityPlayer.feedback.correctCheers"
      : "activityPlayer.feedback.incorrectGentle";
  const pool = t(key, { returnObjects: true });
  const arr = Array.isArray(pool) ? (pool as string[]) : [String(pool)];
  if (arr.length === 0) {
    return "";
  }
  return arr[pickIndex(arr.length)] ?? arr[0];
}

export default function K2InstantFeedbackQuiz({
  title,
  questions,
  shuffleMap,
  onComplete,
  trackContext,
  pickIndex = defaultPickIndex,
}: InstantQuizProps) {
  const { t } = useTranslation();
  const { state, answer, next } = useInstantFeedbackQuiz(questions);
  const [submitting, setSubmitting] = useState(false);
  const cheerByQuestionId = useRef<Record<string, string>>({});
  const warnedQuestionIds = useRef<Set<string>>(new Set());

  const questionIds = useMemo(
    () => questions.map((q) => q.id).join("\0"),
    [questions],
  );

  useEffect(() => {
    cheerByQuestionId.current = {};
  }, [questionIds]);

  const getCheer = useCallback(
    (q: QuizQuestion, lastResult: "correct" | "incorrect"): string => {
      const cached = cheerByQuestionId.current[q.id];
      if (cached) {
        return cached;
      }
      const picked = pickCheer(t, lastResult, pickIndex);
      cheerByQuestionId.current[q.id] = picked;
      return picked;
    },
    [t, pickIndex],
  );

  const handleAnswer = useCallback(
    (choiceIndex: number) => {
      if (state.phase !== "answering") {
        return;
      }
      const q = questions[state.currentIndex];
      if (!q) {
        return;
      }
      if (state.selections[q.id] !== undefined) {
        return;
      }

      if (!isAnswerInBounds(q) && !warnedQuestionIds.current.has(q.id)) {
        warnedQuestionIds.current.add(q.id);
        console.warn(
          `[K2InstantFeedbackQuiz] malformed answerIndex for question "${q.id}"`,
        );
      }

      const correct = isChoiceCorrect(q, choiceIndex);
      answer(q.id, choiceIndex);

      track({
        kind: "quiz_question_answered",
        module_slug: trackContext.moduleSlug,
        activity_id: trackContext.activityId,
        grade_band: trackContext.gradeBand,
        question_id: q.id,
        question_index: state.currentIndex,
        correct,
        quiz_variant: "instant",
      });
    },
    [state.phase, state.currentIndex, state.selections, questions, answer, trackContext],
  );

  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    const ok = await onComplete(state.correctCount);
    if (!ok) {
      setSubmitting(false);
    }
  }, [onComplete, state.correctCount]);

  if (questions.length === 0) {
    return null;
  }

  if (state.phase === "summary") {
    return (
      <div
        data-testid="instant-quiz"
        className="p-6 max-w-3xl mx-auto space-y-4"
      >
        <ActivityHeader
          title={title}
          visualKey="quiz"
          subtitle={t("activityPlayer.quizSubtitle")}
        />
        <Card>
          <CardContent className="p-6 space-y-6">
            <QuizSummary
              score={state.correctCount}
              total={questions.length}
              submitting={submitting}
              onFinish={handleFinish}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[state.currentIndex];
  if (!currentQuestion) {
    return null;
  }

  const resolvedChoices = resolveChoiceList(t, currentQuestion.choices);
  const correctAnswerText = isAnswerInBounds(currentQuestion)
    ? (resolvedChoices[currentQuestion.answerIndex] ?? "")
    : "";

  const explanationField =
    currentQuestion.explanation ?? currentQuestion.hint;
  const explanationText = explanationField
    ? resolveText(t, explanationField)
    : undefined;

  const isLastQuestion = state.currentIndex === questions.length - 1;
  const selectedChoiceIndex = state.selections[currentQuestion.id];

  return (
    <div
      data-testid="instant-quiz"
      className="p-6 max-w-3xl mx-auto space-y-4"
    >
      <ActivityHeader
        title={title}
        visualKey="quiz"
        subtitle={t("activityPlayer.quizSubtitle")}
      />
      <Card>
        <CardContent className="p-6 space-y-6">
          <QuestionScreen
            question={currentQuestion}
            currentIndex={state.currentIndex}
            total={questions.length}
            shuffleMap={shuffleMap}
            phase={state.phase}
            selectedChoiceIndex={selectedChoiceIndex}
            lastResult={state.lastResult}
            onAnswer={handleAnswer}
          />
          {state.phase === "feedback" && state.lastResult && (
            <FeedbackPanel
              result={state.lastResult}
              cheer={getCheer(currentQuestion, state.lastResult)}
              correctAnswerText={correctAnswerText}
              explanation={
                state.lastResult === "incorrect"
                  ? explanationText
                  : undefined
              }
              isLastQuestion={isLastQuestion}
              onNext={next}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
