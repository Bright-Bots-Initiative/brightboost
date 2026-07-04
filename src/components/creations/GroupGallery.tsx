import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../../services/api";
import CreationStatusChip, { type CreationStatus } from "./CreationStatusChip";

// Phase 0 — group-scoped gallery of kid creations. Read path is GET
// /creations?courseId= (server enforces group membership + visibility: shared/
// complete to the group, plus the viewer's own drafts). Adults (canEncourage)
// get a text-free "give a boost"; kids get "play". No kid-to-kid comments.

type GalleryCreation = {
  id: string;
  type: string;
  title: string | null;
  status: CreationStatus;
  encouragements: number;
  authorId: string;
  authorName: string;
};

export default function GroupGallery({
  courseId,
  canEncourage,
}: {
  courseId: string;
  canEncourage: boolean;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const [items, setItems] = useState<GalleryCreation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!courseId) return;
    api
      .get(`/creations?courseId=${courseId}`)
      .then((res: unknown) => {
        setItems((Array.isArray(res) ? res : []) as GalleryCreation[]);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [api, courseId]);

  const encourage = async (id: string) => {
    try {
      const res = (await api.post(`/creations/${id}/encourage`, {})) as {
        encouragements: number;
      };
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, encouragements: res.encouragements } : c,
        ),
      );
    } catch {
      // error toast handled by useApi
    }
  };

  if (state === "loading")
    return <div className="p-6 text-center text-gray-500">{t("gallery.loading")}</div>;
  if (state === "error")
    return <div className="p-6 text-center text-gray-600">{t("gallery.error")}</div>;
  if (items.length === 0)
    return <div className="p-6 text-center text-gray-600">{t("gallery.empty")}</div>;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((c) => (
        <article
          key={c.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-brightboost-navy">
              {c.title || t("gallery.untitled")}
            </h3>
            <CreationStatusChip status={c.status} />
          </div>
          <p className="text-xs text-gray-500">
            {t("gallery.by", { name: c.authorName })}
          </p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-sm text-amber-700" aria-label={t("gallery.boosts")}>
              ⭐ {c.encouragements}
            </span>
            {canEncourage ? (
              <button
                type="button"
                onClick={() => encourage(c.id)}
                className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600"
              >
                {t("gallery.giveBoost")}
              </button>
            ) : c.type === "data_dash_challenge" ? (
              <Link
                to={`/student/challenge/${c.id}`}
                className="px-3 py-1.5 text-sm rounded-md bg-brightboost-blue text-white font-semibold hover:bg-brightboost-navy"
              >
                {t("gallery.play")}
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
