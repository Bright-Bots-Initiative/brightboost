import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { School, PlayCircle, BarChart3, Presentation, X } from "lucide-react";

const TUTORIAL_KEY = "bb_teacher_tutorial_done";

const STEPS = [
  { icon: School, i18nKey: "tutorial.step1" },
  { icon: PlayCircle, i18nKey: "tutorial.step2" },
  { icon: BarChart3, i18nKey: "tutorial.step3" },
  { icon: Presentation, i18nKey: "tutorial.step4" },
] as const;

function isTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "true";
  } catch {
    return false;
  }
}

function markTutorialDone(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "true");
  } catch {}
}

export function resetTutorial(): void {
  try {
    localStorage.removeItem(TUTORIAL_KEY);
  } catch {}
}

export default function TeacherTutorial() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(isTutorialDone);
  const [step, setStep] = useState(0);

  const finish = useCallback(() => {
    markTutorialDone();
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  const isLast = step === STEPS.length - 1;
  const CurrentIcon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
        {/* Close / skip */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t("tutorial.skip")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <p className="text-xs text-gray-400 mb-4">
          {t("tutorial.stepOf", { current: step + 1, total: STEPS.length })}
        </p>

        {/* Icon + content */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-brightboost-blue/10 flex items-center justify-center mb-4">
            <CurrentIcon className="w-8 h-8 text-brightboost-blue" />
          </div>

          {step === 0 && (
            <>
              <h2 className="text-xl font-bold text-brightboost-navy mb-1">
                {t("tutorial.welcome")}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {t("tutorial.welcomeDesc")}
              </p>
            </>
          )}

          <p className="text-base text-brightboost-navy font-medium">
            {t(STEPS[step].i18nKey)}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? "bg-brightboost-blue scale-125"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={finish}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t("tutorial.skip")}
          </button>
          {isLast ? (
            <button
              onClick={finish}
              className="px-5 py-2 bg-brightboost-blue text-white font-semibold rounded-lg hover:bg-brightboost-navy transition-colors"
            >
              {t("tutorial.finish")}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 bg-brightboost-blue text-white font-semibold rounded-lg hover:bg-brightboost-navy transition-colors"
            >
              {t("tutorial.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
