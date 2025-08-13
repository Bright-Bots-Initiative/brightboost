import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModule } from "../hooks/useModule";
import { useStudentProgress } from "../hooks/useStudentProgress";
import { submitCheckpoint } from "../hooks/useCheckpoint";
import StudentProgressRing from "../components/StudentProgressRing";
import ContinueModuleCard from "../components/ContinueModuleCard";
import BadgeModal from "../components/BadgeModal";
import { t } from "../lib/i18n";

const CURRENT_STUDENT_ID = "demo-student-1";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data: mod } = useModule("stem-1");
  const { data: progress, refetch } = useStudentProgress(
    CURRENT_STUDENT_ID,
    "stem-1",
  );
  const [showBadge, setShowBadge] = useState(false);
  const [lockTooltip, setLockTooltip] = useState<string | null>(null);

  const percent = progress?.percentComplete ?? 0;
  const moduleTitle = mod?.title ?? "STEM-1";

  const lessons = useMemo(() => {
    const all = mod?.units?.flatMap((u) => u.lessons) ?? [];
    return all.sort((a, b) => a.index - b.index);
  }, [mod]);

  const nextLessonId = useMemo(() => {
    if (!lessons.length) return null;
    if (!progress?.lastLessonId) return lessons[0].id;
    const idx = lessons.findIndex((l) => l.id === progress.lastLessonId);
    return lessons[idx + 1]?.id ?? lessons[idx]?.id ?? null;
  }, [lessons, progress?.lastLessonId]);

  function handleContinue() {
    if (!nextLessonId) return;
    navigate(`/lesson/${nextLessonId}`);
  }

  function handleLessonClick(lessonId: string, index: number) {
    const unlocked =
      index === 0 || lessons[index - 1]?.id === progress?.lastLessonId;
    if (!unlocked) {
      setLockTooltip(t("student.lockedLesson"));
      setTimeout(() => setLockTooltip(null), 2500);
      return;
    }
    navigate(`/lesson/${lessonId}`);
  }

  async function simulateCheckpoint() {
    if (!nextLessonId) return;
    try {
      await submitCheckpoint({
        studentId: CURRENT_STUDENT_ID,
        moduleSlug: "stem-1",
        lessonId: nextLessonId,
        status: "COMPLETED",
        timeDeltaS: 0,
      });
    } catch (e) {
      void 0;
    }
    refetch();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("student.dashboardTitle")}</h1>
      <div className="flex items-center gap-6">
        <StudentProgressRing
          percent={percent}
          label={t("student.progressLabel")}
        />
        <div className="flex-1">
          <ContinueModuleCard
            moduleTitle={moduleTitle}
            percent={percent}
            onContinue={handleContinue}
          />
          <div className="mt-3 text-sm opacity-70">{t("student.xpHelp")}</div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">{t("student.lessons")}</div>
        <div className="flex flex-col gap-2">
          {lessons.map((l, i) => {
            const unlocked =
              i === 0 || lessons[i - 1]?.id === progress?.lastLessonId;
            return (
              <div
                key={l.id}
                className="flex items-center justify-between border rounded-xl p-3"
              >
                <div>
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs opacity-70">#{l.index + 1}</div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => handleLessonClick(l.id, i)}
                    className={`px-3 py-1 rounded-lg ${unlocked ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600 cursor-not-allowed"}`}
                    aria-disabled={!unlocked}
                  >
                    {unlocked ? t("student.open") : t("student.locked")}
                  </button>
                  {!unlocked && lockTooltip && (
                    <div
                      className="absolute right-0 mt-2 text-xs bg-black text-white rounded px-2 py-1"
                      role="tooltip"
                      data-testid="lock-tooltip"
                    >
                      {lockTooltip}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">{t("student.badges")}</div>
        <div className="flex gap-2">
          {(mod?.badges ?? []).map((b) => (
            <button
              key={b.slug}
              className="px-3 py-2 rounded-lg border"
              onClick={() => setShowBadge(true)}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-lg border"
          onClick={() => setShowBadge(true)}
        >
          {t("student.openBadgeModal")}
        </button>
        <button
          className="px-3 py-2 rounded-lg border"
          onClick={simulateCheckpoint}
        >
          {t("student.simulateCheckpoint")}
        </button>
      </div>

      <BadgeModal
        open={showBadge}
        onClose={() => setShowBadge(false)}
        badgeName="Observer"
        title={t("student.badgeUnlocked")}
      />
    </div>
  );
}
