import React from "react";
import { useTranslation } from "react-i18next";

type LearningGameFrameProps = {
  title: string;
  objective: string;
  vocabulary?: string[];
  progressLabel?: string;
  feedback?: string;
  children: React.ReactNode;
};

export function LearningGameFrame({
  title,
  objective,
  vocabulary = [],
  progressLabel,
  feedback,
  children,
}: LearningGameFrameProps) {
  const { t } = useTranslation();
  const titleId = `${title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase()}-title`;

  return (
    <section
      className="mx-auto max-w-5xl rounded-2xl border bg-white p-4 shadow-sm"
      aria-labelledby={titleId}
    >
      <div className="mb-4 rounded-xl border bg-slate-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id={titleId} className="text-2xl font-bold">{title}</h2>
            <p className="text-sm text-slate-700">{objective}</p>
            {vocabulary.length > 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold">{t("games.learning.wordsToKnow")}:</span>{" "}
                {vocabulary.join(", ")}
              </p>
            ) : null}
          </div>
          {progressLabel ? (
            <div
              className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white"
              role="status"
              aria-live="polite"
            >
              {progressLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div>{children}</div>

      {feedback ? (
        <div
          className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </div>
      ) : null}
    </section>
  );
}
