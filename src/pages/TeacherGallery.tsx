import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import GroupGallery from "../components/creations/GroupGallery";

// Phase 0 — teacher/parent view of a group's gallery. The adult can give a
// text-free "boost" to encourage a kid's creation (no comments in Phase 0).

export default function TeacherGallery() {
  const { id } = useParams();
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <Link
        to={`/teacher/classes/${id}`}
        className="inline-flex items-center text-sm text-brightboost-blue hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t("gallery.backToClass")}
      </Link>
      <h1 className="text-2xl font-bold text-brightboost-navy">
        {t("gallery.pageTitle")}
      </h1>
      {id && <GroupGallery courseId={id} canEncourage={true} />}
    </div>
  );
}
