import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import GroupGallery from "../components/creations/GroupGallery";

// Phase 0 — student-facing group gallery. Lists the kid's group(s), shows the
// gallery for the selected one, and links to "Make a Challenge".

type Group = { courseId: string; courseName: string };

export default function StudentGallery() {
  const { t } = useTranslation();
  const api = useApi();
  const [groups, setGroups] = useState<Group[]>([]);
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    api
      .get("/student/courses")
      .then((res: unknown) => {
        const list = (Array.isArray(res) ? res : []) as Group[];
        setGroups(list);
        if (list[0]) setCourseId(list[0].courseId);
      })
      .catch(() => setGroups([]));
  }, [api]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brightboost-navy">
          {t("gallery.pageTitle")}
        </h1>
        <Link
          to="/student/create-challenge"
          className="px-4 py-2 rounded-md bg-brightboost-blue text-white font-semibold"
        >
          {t("gallery.makeChallenge")}
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-600">{t("gallery.noGroups")}</p>
      ) : (
        <>
          {groups.length > 1 && (
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {groups.map((g) => (
                <option key={g.courseId} value={g.courseId}>
                  {g.courseName}
                </option>
              ))}
            </select>
          )}
          {courseId && <GroupGallery courseId={courseId} canEncourage={false} />}
        </>
      )}
    </div>
  );
}
