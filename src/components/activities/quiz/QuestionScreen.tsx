import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  resolveText,
  resolveChoiceList,
} from "@/utils/localizedContent";
import type { QuizPhase, QuizQuestion } from "./types";

const CHOICE_BASE =
  "justify-start text-left h-auto min-h-[44px] py-3 whitespace-normal";
const CORRECT_CHOICE =
  "border-emerald-500 bg-emerald-50 text-emerald-700";
const WRONG_TAP_CHOICE =
  "border-slate-300 bg-slate-50 text-slate-500 opacity-80";

export type QuestionScreenProps = {
  question: QuizQuestion;
  currentIndex: number;
  total: number;
  shuffleMap: Record<string, number[]>;
  phase: QuizPhase;
  selectedChoiceIndex?: number;
  lastResult?: "correct" | "incorrect" | null;
  onAnswer: (choiceIndex: number) => void;
};

function choiceClassName(
  origIdx: number,
  phase: QuizPhase,
  selectedChoiceIndex: number | undefined,
  lastResult: "correct" | "incorrect" | null | undefined,
  answerIndex: number,
  answerInBounds: boolean,
): string {
  if (phase !== "feedback" || !answerInBounds) {
    return CHOICE_BASE;
  }

  const isCorrectChoice = origIdx === answerIndex;
  const isSelectedWrong =
    lastResult === "incorrect" &&
    selectedChoiceIndex !== undefined &&
    origIdx === selectedChoiceIndex &&
    !isCorrectChoice;

  if (isCorrectChoice) {
    return `${CHOICE_BASE} ${CORRECT_CHOICE}`;
  }
  if (isSelectedWrong) {
    return `${CHOICE_BASE} ${WRONG_TAP_CHOICE}`;
  }
  return CHOICE_BASE;
}

export default function QuestionScreen({
  question,
  currentIndex,
  total,
  shuffleMap,
  phase,
  selectedChoiceIndex,
  lastResult,
  onAnswer,
}: QuestionScreenProps) {
  const { t } = useTranslation();
  const promptId = `question-prompt-${question.id}`;
  const resolved = resolveChoiceList(t, question.choices);
  const order =
    shuffleMap[question.id] ?? question.choices.map((_, i) => i);
  const disabled = phase !== "answering";
  const answerInBounds =
    question.answerIndex >= 0 &&
    question.answerIndex < question.choices.length;

  return (
    <div className="space-y-4" data-testid="question-screen">
      <p className="text-sm text-muted-foreground">
        {t("activityPlayer.questionOf", {
          current: currentIndex + 1,
          total,
        })}
      </p>

      <div className="font-semibold text-lg" id={promptId}>
        {resolveText(t, question.prompt)}
      </div>

      <div className="grid gap-2" role="group" aria-labelledby={promptId}>
        {order.map((origIdx) => {
          const isCorrectHighlight =
            phase === "feedback" &&
            answerInBounds &&
            origIdx === question.answerIndex;
          const isWrongHighlight =
            phase === "feedback" &&
            lastResult === "incorrect" &&
            selectedChoiceIndex === origIdx &&
            origIdx !== question.answerIndex;

          return (
            <Button
              key={origIdx}
              variant="outline"
              disabled={disabled}
              className={choiceClassName(
                origIdx,
                phase,
                selectedChoiceIndex,
                lastResult,
                question.answerIndex,
                answerInBounds,
              )}
              onClick={() => onAnswer(origIdx)}
            >
              <span className="flex w-full items-center gap-2">
                {isCorrectHighlight && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                )}
                {isWrongHighlight && (
                  <XCircle
                    className="h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                )}
                <span>{resolved[origIdx]}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
