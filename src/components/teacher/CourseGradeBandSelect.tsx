import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type CourseBandResult } from "@/services/api";

type GradeBand = CourseBandResult["gradeBand"];

/** Serializes writes and displays only the last server-confirmed value. */
export default function CourseGradeBandSelect({
  courseId,
  value,
  onSaved,
}: {
  courseId: string;
  value: string;
  onSaved: (result: CourseBandResult) => void;
}) {
  const { t } = useTranslation();
  const errorId = useId();
  const busy = useRef(false);
  const mounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [failedBand, setFailedBand] = useState<GradeBand | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const save = async (band: GradeBand) => {
    // A ref also guards a second event before React renders disabled=true.
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setFailedBand(null);
    try {
      const confirmed = await api.updateCourseBand(courseId, band);
      if (mounted.current) onSaved(confirmed);
    } catch {
      if (mounted.current) setFailedBand(band);
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t("teacher.classes.gradeBandLabel")}
        aria-describedby={failedBand ? errorId : undefined}
        value={value}
        disabled={saving}
        onChange={(event) => void save(event.target.value as GradeBand)}
        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 font-medium disabled:opacity-50"
      >
        <option value="k2">{t("teacher.classes.bandK2")}</option>
        <option value="g3_5">{t("teacher.classes.bandG35")}</option>
      </select>
      {saving && <span role="status">{t("teacher.classDetail.saving")}</span>}
      {failedBand && (
        <div id={errorId} role="alert" className="text-sm text-red-700">
          <p>{t("teacher.classDetail.bandSaveFailed")}</p>
          <button
            onClick={() => void save(failedBand)}
            className="min-h-[44px] underline font-semibold focus:outline-none focus:ring-2 focus:ring-red-700"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
