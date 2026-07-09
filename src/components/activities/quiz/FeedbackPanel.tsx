import { CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CORRECT_BANNER =
  "border border-emerald-500 bg-emerald-50 text-emerald-700 rounded-lg p-4";
const INCORRECT_BANNER =
  "border border-amber-300 bg-amber-50 text-amber-800 rounded-lg p-4";
const EXPLANATION_BLOCK =
  "text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded p-2";

export type FeedbackPanelProps = {
  result: "correct" | "incorrect";
  cheer: string;
  correctAnswerText: string;
  explanation?: string;
  isLastQuestion: boolean;
  onNext: () => void;
};

export default function FeedbackPanel({
  result,
  cheer,
  correctAnswerText,
  explanation,
  isLastQuestion,
  onNext,
}: FeedbackPanelProps) {
  const { t } = useTranslation();
  const isCorrect = result === "correct";

  return (
    <div className="space-y-4" data-testid="feedback-panel">
      <div
        role="status"
        aria-live="polite"
        className={`motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 ${isCorrect ? CORRECT_BANNER : INCORRECT_BANNER}`}
      >
        <div className="flex items-start gap-2">
          {isCorrect ? (
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <Lightbulb
              className="h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
          )}
          <div className="space-y-1">
            <p className="text-lg font-semibold">{cheer}</p>
            {!isCorrect && (
              <p>
                {t("activityPlayer.feedback.answerIs")}{" "}
                <span className="font-medium">{correctAnswerText}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {!isCorrect && explanation && (
        <div className={EXPLANATION_BLOCK}>💡 {explanation}</div>
      )}

      <Button
        autoFocus
        variant="default"
        className="min-h-[44px] px-6 w-full sm:w-auto"
        onClick={onNext}
      >
        {isLastQuestion
          ? t("activityPlayer.feedback.seeResults")
          : t("activityPlayer.next")}
      </Button>
    </div>
  );
}
