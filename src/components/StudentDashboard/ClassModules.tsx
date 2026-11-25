import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { withRequestDeadline } from "@/lib/requestDeadline";
import { api } from "@/services/api";
import { translateContentName } from "@/utils/localizedContent";

type Group = {
  classId: string;
  className: string;
  modules: { assignmentId: string; moduleSlug: string | null; title: string }[];
};
export default function ClassModules({
  allowed,
}: {
  allowed: ReadonlySet<string>;
}) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, reload] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    setFailed(false);
    setGroups(null);
    withRequestDeadline(
      (signal) => api.getStudentAssignedModules(signal),
      ctl.signal,
    )
      .then((raw) => {
        if (ctl.signal.aborted) return;
        if (!Array.isArray(raw) || !raw.every((g) => Array.isArray(g?.modules)))
          throw Error("invalid class modules");
        setGroups(raw.filter((g) => g.modules.length));
      })
      .catch(() => {
        if (!ctl.signal.aborted) setFailed(true);
      });
    return () => ctl.abort();
  }, [version]);
  return (
    <section
      aria-labelledby="assigned-modules-title"
      className="space-y-3 rounded-xl bg-white p-5 shadow"
    >
      <h2 id="assigned-modules-title" className="text-xl font-bold">
        {t("classroom.studentTitle")}
      </h2>
      {failed ? (
        <p role="alert">
          {t("classroom.unavailable")}{" "}
          <button
            type="button"
            className="rounded border px-3 py-2"
            onClick={() => reload((v) => v + 1)}
          >
            {t("classroom.retry")}
          </button>
        </p>
      ) : groups === null ? (
        <p role="status">{t("classroom.loading")}</p>
      ) : !groups.length ? (
        <p>{t("classroom.none")}</p>
      ) : (
        groups.map((g) => (
          <div key={g.classId}>
            <h3 className="font-semibold">{g.className}</h3>
            <ol className="list-decimal space-y-2 pl-6">
              {g.modules.map((m) => (
                <li key={m.assignmentId}>
                  {m.moduleSlug && allowed.has(m.moduleSlug) ? (
                    <Link
                      className="inline-flex min-h-[44px] items-center py-2 font-semibold underline"
                      to={
                        "/student/modules/" + encodeURIComponent(m.moduleSlug)
                      }
                    >
                      {translateContentName(m.title)}
                    </Link>
                  ) : (
                    <span>
                      {translateContentName(m.title)} ·{" "}
                      {t("classroom.notReady")}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </section>
  );
}
