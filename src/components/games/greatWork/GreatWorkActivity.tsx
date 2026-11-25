import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  invalidateGradeBandCache,
  useGradeBandState,
} from "@/hooks/useGradeBand";
import { Button } from "@/components/ui/button";
import type { ActivityFinishResult, StudioCompletion } from "../gameRegistry";
import GreatWorkStudio from "./GreatWorkStudio";
import { createStudioShelf } from "./studioShelf";

type ActivityProps = {
  onComplete?: (result: StudioCompletion) => ActivityFinishResult;
};

function ClassStudio({
  studentId,
  onComplete,
}: ActivityProps & { studentId: string }) {
  const { t } = useTranslation();
  const { courses, status } = useGradeBandState();
  const [selected, setSelected] = useState("");
  const courseId =
    courses?.length === 1
      ? courses[0].courseId
      : courses?.find((course) => course.courseId === selected)?.courseId;
  const shelf = useMemo(
    () =>
      courseId
        ? createStudioShelf({ mode: "student", studentId, courseId })
        : null,
    [studentId, courseId],
  );
  if (status === "pending") return <p role="status">{t("common.loading")}</p>;
  if (status === "failed")
    return (
      <div role="alert">
        <p>{t("activity.loadError")}</p>
        <Button onClick={invalidateGradeBandCache}>{t("common.retry")}</Button>
      </div>
    );
  if (!courses?.length)
    return (
      <div>
        <p>{t("games.greatWork.classroom.noGroup")}</p>
        <Link to="/try/great-work">{t("games.greatWork.classroom.demo")}</Link>
      </div>
    );
  if (!shelf)
    return (
      <div className="space-y-3">
        <h2>{t("games.greatWork.classroom.choose")}</h2>
        {courses.map((course) => (
          <Button
            key={course.courseId}
            onClick={() => setSelected(course.courseId)}
          >
            {course.courseName}
          </Button>
        ))}
      </div>
    );
  return (
    <GreatWorkStudio
      key={courseId}
      shelf={shelf}
      onFinish={({ id, revision }) =>
        onComplete?.({
          gameKey: "great_work",
          greatWorkSave: { id, revision },
        })
      }
    />
  );
}

export default function GreatWorkActivity(props: ActivityProps) {
  const { user } = useAuth();
  return user ? (
    <ClassStudio key={user.id} studentId={user.id} {...props} />
  ) : null;
}
