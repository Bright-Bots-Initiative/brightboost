import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export type QuizSummaryProps = {
  score: number;
  total: number;
  submitting: boolean;
  onFinish: () => void | Promise<void>;
};

export default function QuizSummary({
  score,
  total,
  submitting,
  onFinish,
}: QuizSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 text-center" data-testid="quiz-summary">
      <h2 className="text-2xl font-bold">{t("activityPlayer.summary.title")}</h2>
      <p className="text-lg">
        {t("activityPlayer.summary.scoreLine", { score, total })}
      </p>
      {score === total && (
        <p className="text-lg font-semibold text-emerald-700">
          {t("activityPlayer.summary.perfect")}
        </p>
      )}
      <Button
        variant="default"
        className="min-h-[44px] px-6"
        disabled={submitting}
        onClick={() => {
          void Promise.resolve(onFinish()).catch(() => undefined);
        }}
      >
        {t("activityPlayer.summary.finish")}
      </Button>
    </div>
  );
}
