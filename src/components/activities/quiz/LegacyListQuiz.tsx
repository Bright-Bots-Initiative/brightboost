import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  resolveText,
  resolveChoiceList,
} from "@/utils/localizedContent";
import ActivityHeader from "@/components/activities/ActivityHeader";
import type { LegacyListQuizProps } from "./types";

export default function LegacyListQuiz({
  title,
  questions,
  shuffleMap,
  answers,
  submitted,
  incorrectIds,
  setAnswers,
  setSubmitted,
  setIncorrectIds,
  onComplete,
  isQuizOnly,
  onBackToStory,
  onBackToModule,
}: LegacyListQuizProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const allAnswered = questions.every(
    (q) => typeof answers[q.id] === "number",
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <ActivityHeader
        title={title}
        visualKey="quiz"
        subtitle={t("activityPlayer.quizSubtitle")}
      />
      <div className="flex items-center justify-between">
        {isQuizOnly ? (
          <Button variant="outline" onClick={onBackToModule}>
            {t("activityPlayer.back")}
          </Button>
        ) : (
          <Button variant="outline" onClick={onBackToStory}>
            {t("activityPlayer.backToStory")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {questions.map((q) => {
            const isWrong = submitted && incorrectIds.includes(q.id);
            const promptId = `question-prompt-${q.id}`;
            return (
              <div key={q.id} className="space-y-2">
                <div className="font-semibold text-lg" id={promptId}>
                  {resolveText(t, q.prompt)}
                  {isWrong && (
                    <span className="text-red-500 ml-2 text-sm">
                      {t("activityPlayer.tryAgain")}
                    </span>
                  )}
                </div>
                <div
                  className="grid gap-2"
                  role="group"
                  aria-labelledby={promptId}
                >
                  {(() => {
                    const resolved = resolveChoiceList(t, q.choices);
                    const order = shuffleMap[q.id] ?? q.choices.map((_, i) => i);
                    return order.map((origIdx) => {
                      const selected = answers[q.id] === origIdx;
                      return (
                        <Button
                          key={origIdx}
                          variant={selected ? "default" : "outline"}
                          aria-pressed={selected}
                          // h-auto + whitespace-normal: choices wrap instead
                          // of clipping; min-h-[44px] + py-3 keeps every
                          // choice a comfortable K-2 tap target.
                          className={`justify-start text-left h-auto min-h-[44px] py-3 whitespace-normal ${isWrong && selected ? "border-red-500 text-red-600 bg-red-50" : ""}`}
                          onClick={() => {
                            setAnswers((prev) => ({ ...prev, [q.id]: origIdx }));
                            if (isWrong) {
                              setIncorrectIds((prev) =>
                                prev.filter((id) => id !== q.id),
                              );
                            }
                          }}
                        >
                          {resolved[origIdx]}
                        </Button>
                      );
                    });
                  })()}
                </div>
                {isWrong && q.hint && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 animate-in fade-in">
                    💡 {resolveText(t, q.hint)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit is the hero action; Reset is demoted to ghost so a
              K-2 student doesn't accidentally wipe all answers reaching
              for the primary button. */}
          <div className="flex gap-2 items-center">
            <Button
              disabled={!allAnswered}
              className="min-h-[44px] px-6 flex-1 sm:flex-none"
              onClick={() => {
                const incorrect = questions.filter(
                  (q) => answers[q.id] !== q.answerIndex,
                );
                if (incorrect.length === 0) {
                  onComplete();
                  return;
                }
                setSubmitted(true);
                setIncorrectIds(incorrect.map((q) => q.id));
                toast({
                  title: t("activityPlayer.almost"),
                  description: t("activityPlayer.checkHints"),
                });
              }}
            >
              {t("activityPlayer.submit")}
            </Button>
            <Button
              variant="ghost"
              className="min-h-[44px] text-slate-500"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
                setIncorrectIds([]);
              }}
            >
              {t("activityPlayer.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
