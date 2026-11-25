import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { withRequestDeadline } from "@/lib/requestDeadline";
import { api } from "@/services/api";
import { HIDDEN_MODULE_SLUGS } from "@/constants/stemSets";
import { translateContentName } from "@/utils/localizedContent";

type Variant = { id: string; title: string; moduleSlug: string | null };
type Assignment = { id: string; moduleVariant: Variant };
const button =
  "rounded border px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2 disabled:opacity-50";

export default function ClassModulePlanner({
  courseId,
  band,
}: {
  courseId: string;
  band: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2>
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {t("classroom.plan")}
        </button>
      </h2>
      {open && (
        <Planner key={courseId + ":" + band} courseId={courseId} band={band} />
      )}
    </section>
  );
}

function Planner({ courseId, band }: { courseId: string; band: string }) {
  const { t } = useTranslation();
  const [version, reload] = useState(0);
  const [data, setData] = useState<{
    catalog: Variant[];
    assigned: Assignment[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    setFailed(false);
    setBusy(true);
    withRequestDeadline(
      (signal) =>
        Promise.all([
          api.getModuleVariants(band, signal, true),
          api.getCourseAssignments(courseId, signal),
        ]),
      ctl.signal,
    )
      .then(([catalog, list]) => {
        if (ctl.signal.aborted) return;
        if (!Array.isArray(catalog) || !Array.isArray(list?.assignments))
          throw Error("invalid assignment list");
        setData({ catalog, assigned: list.assignments });
      })
      .catch(() => {
        if (!ctl.signal.aborted) {
          setData(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!ctl.signal.aborted) setBusy(false);
      });
    return () => ctl.abort();
  }, [courseId, band, version]);
  async function save(change: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await change();
      reload((v) => v + 1);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  const assigned = new Set(data?.assigned.map((a) => a.moduleVariant.id));
  return (
    <div className="mt-4 space-y-4" aria-busy={busy}>
      {failed && (
        <p role="alert">
          {t("classroom.loadFailed")}{" "}
          <button
            type="button"
            className={button}
            onClick={() => reload((v) => v + 1)}
          >
            {t("classroom.retry")}
          </button>
        </p>
      )}
      {!data && !failed && <p role="status">{t("classroom.loading")}</p>}
      {data && (
        <>
          <h3 className="font-bold">{t("classroom.order")}</h3>
          {!data.assigned.length && <p>{t("classroom.none")}</p>}
          <ol className="list-decimal pl-6">
            {data.assigned.map((a, i) => {
              const title = translateContentName(a.moduleVariant.title);
              return (
                <li key={a.id} className="py-2">
                  <strong>{title}</strong>
                  <div className="flex flex-wrap gap-2">
                    {(["up", "down"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={button}
                        disabled={
                          busy ||
                          (d === "up"
                            ? i === 0
                            : i === data.assigned.length - 1)
                        }
                        aria-label={t("classroom." + d, { title })}
                        onClick={() =>
                          void save(() =>
                            api.moveModuleAssignment(courseId, a.id, d),
                          )
                        }
                      >
                        {t("classroom." + d, { title })}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void save(() =>
                          api.removeModuleAssignment(courseId, a.id),
                        )
                      }
                    >
                      {t("classroom.remove", { title })}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <h3 className="font-bold">{t("classroom.catalog")}</h3>
          {!data.catalog.some(
            (v) =>
              v.moduleSlug &&
              !HIDDEN_MODULE_SLUGS.has(v.moduleSlug) &&
              !assigned.has(v.id),
          ) && <p>{t("classroom.noMore")}</p>}
          <ul className="space-y-2">
            {data.catalog
              .filter(
                (v) =>
                  v.moduleSlug &&
                  !HIDDEN_MODULE_SLUGS.has(v.moduleSlug) &&
                  !assigned.has(v.id),
              )
              .map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void save(() => api.assignModuleToClass(courseId, v.id))
                    }
                  >
                    {t("classroom.assign", {
                      title: translateContentName(v.title),
                    })}
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
