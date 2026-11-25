import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Copy,
  Dices,
  Factory,
  FlaskConical,
  FolderOpen,
  LibraryBig,
  Plus,
  Save,
  Wrench,
  X,
} from "lucide-react";
import {
  newStudioName,
  renderStudioName,
  starterStudioDraft,
  studioLevel,
} from "@shared/greatwork-engine";
import type { RunResult, StudioDraft } from "@shared/greatwork-engine";
import { changeLanguage } from "@/i18n";
import { GreatWorkBuilder } from "./GreatWorkBuilder";
import { resolveBandConfig } from "./greatWorkBandConfig";
import { StudioWorkbench } from "./StudioWorkbench";
import type { StudioShelf, SavedMachine } from "./studioShelf";
import "./studio.css";

export interface GreatWorkStudioProps {
  shelf: StudioShelf;
  guest?: boolean;
  onFinish?: (saved: {
    id: string;
    revision: number;
  }) => void | boolean | Promise<void | boolean>;
}
const config = resolveBandConfig("k2");
export function GreatWorkStudio({
  shelf,
  guest = false,
  onFinish,
}: GreatWorkStudioProps) {
  const { t, i18n } = useTranslation();
  const s = (key: string, vars?: Record<string, unknown>) =>
    t(`games.greatWork.studio.${key}`, vars);
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const [draft, setDraft] = useState(() => starterStudioDraft(language));
  const [original, setOriginal] = useState(draft);
  const [current, setCurrent] = useState<SavedMachine | null>(null);
  const [rows, setRows] = useState<SavedMachine[]>([]);
  const [page, setPage] = useState<"bench" | "shelf">("bench");
  const [layout, setLayout] = useState(false);
  const [session, setSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const live = useRef(true);
  const saveLock = useRef(false);
  const finishLock = useRef(false);
  const pendingCopyName = useRef<StudioDraft["nameSeed"] | null>(null);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void shelf
      .list()
      .then((items) => {
        if (active) setRows(items);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shelf, refresh, page]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const name = renderStudioName(draft.nameSeed, language);
  const hasOutput = !!current?.lastRun.produced.some((p) => p.count > 0);
  function setMachine(value: StudioDraft, row: SavedMachine | null) {
    setDraft(value);
    setOriginal(value);
    setCurrent(row);
    setError("");
    setNotice("");
    setSession((n) => n + 1);
    setPage("bench");
    setLayout(false);
    setFinishing(false);
    setPending(null);
    pendingCopyName.current = null;
  }
  function requestSwitch(run: () => void) {
    if (dirty) setPending({ run });
    else run();
  }
  function openNew(lesson = false) {
    requestSwitch(() => setMachine(starterStudioDraft(language, lesson), null));
  }
  function edit(next: StudioDraft) {
    pendingCopyName.current = null;
    setDraft(next);
    setNotice("");
    setError("");
  }
  function ran(_result: RunResult) {
    setDraft((prev) => ({
      ...prev,
      iterations: Math.min(100000, prev.iterations + 1),
    }));
  }
  async function finish() {
    if (
      !onFinish ||
      !current ||
      !hasOutput ||
      dirty ||
      guest ||
      finishLock.current
    )
      return;
    finishLock.current = true;
    setFinishing(true);
    setError("");
    try {
      if (
        (await onFinish({ id: current.id, revision: current.revision })) ===
          false &&
        live.current
      )
        setError("finishError");
    } catch {
      if (live.current) setError("finishError");
    } finally {
      finishLock.current = false;
      if (live.current) setFinishing(false);
    }
  }
  async function persist(makeCopy = false) {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (makeCopy && !pendingCopyName.current)
        pendingCopyName.current = newStudioName(language, draft.nameSeed);
      const row =
        makeCopy && current
          ? await shelf.duplicate(current, {
              ...draft,
              iterations: 0,
              nameSeed: pendingCopyName.current!,
            })
          : current
            ? await shelf.revise(current, draft)
            : await shelf.create(draft);
      if (!live.current) return;
      setCurrent(row);
      setDraft((prev) =>
        !makeCopy && prev.iterations > row.content.iterations
          ? { ...row.content, iterations: prev.iterations }
          : row.content,
      );
      pendingCopyName.current = null;
      setOriginal(row.content);
      setNotice(makeCopy ? "copied" : "saved");
      setRows((old) => [row, ...old.filter((item) => item.id !== row.id)]);
      if (makeCopy) setSession((n) => n + 1);
    } catch (e) {
      if (live.current)
        setError(
          (e as { status?: number })?.status === 409 ? "conflict" : "saveError",
        );
    } finally {
      if (live.current) setSaving(false);
      saveLock.current = false;
    }
  }
  const level = studioLevel(draft);
  return (
    <section
      className="gws"
      lang={language.startsWith("es") ? "es" : "en"}
      aria-label={t("games.greatWork.title")}
    >
      <div className="gws-shell">
        <nav className="gws-nav" aria-label={s("nav")}>
          <span className="gws-brand">
            <span className="gws-brand-icon" aria-hidden="true">
              <FlaskConical />
            </span>
            {s("studioName")}
          </span>
          <div className="gws-nav-tools">
            <button
              type="button"
              className="gws-nav-shelf"
              aria-pressed={page === "shelf"}
              disabled={saving || finishing}
              onClick={() => {
                setPending(null);
                setPage(page === "bench" ? "shelf" : "bench");
              }}
            >
              <LibraryBig />
              {s("shelf")}
            </button>
            <button
              type="button"
              className="gws-language"
              lang={language.startsWith("es") ? "en" : "es"}
              aria-label={s("switchLanguage")}
              onClick={() =>
                void changeLanguage(language.startsWith("es") ? "en" : "es")
              }
            >
              {language.startsWith("es") ? "EN" : "ES"}
            </button>
          </div>
        </nav>
        {page === "bench" ? (
          <>
            <header className="gws-heading">
              <div>
                <h1>{t("games.greatWork.title")}</h1>
                <p>{s("intro")}</p>
              </div>
              <button
                type="button"
                className="gws-quiet"
                disabled={saving || finishing}
                onClick={() => openNew()}
              >
                <Plus />
                {s("new")}
              </button>
            </header>
            <fieldset
              className="gws-fieldset"
              disabled={saving || finishing}
              aria-busy={saving || finishing}
            >
              {layout ? (
                <div className="gws-layout">
                  <button
                    type="button"
                    className="gws-quiet"
                    onClick={() => setLayout(false)}
                  >
                    <ArrowLeft />
                    {s("backBoard")}
                  </button>
                  <GreatWorkBuilder
                    key={session}
                    band="k2"
                    bandConfig={config}
                    program={draft.program}
                    onProgramChange={(program) => edit({ ...draft, program })}
                    onRunResult={ran}
                    target={
                      level.targetProduct
                        ? {
                            molecule: level.targetProduct,
                            count: level.targetCount ?? 1,
                          }
                        : null
                    }
                    levelOptions={level}
                  />
                </div>
              ) : (
                <StudioWorkbench
                  key={session}
                  draft={draft}
                  onChange={(program) => edit({ ...draft, program })}
                  onRun={ran}
                  editBoard={() => setLayout(true)}
                  startLesson={() => openNew(true)}
                />
              )}
              <div className="gws-savebar">
                <div className="gws-tag" aria-hidden="true">
                  <Factory />
                </div>
                <div className="gws-name">
                  <span>{s("machineName")}</span>
                  <strong>{name}</strong>
                </div>
                <button
                  type="button"
                  className="gws-quiet gws-reroll"
                  onClick={() =>
                    edit({
                      ...draft,
                      nameSeed: newStudioName(language, draft.nameSeed),
                    })
                  }
                >
                  <Dices />
                  {s("rename")}
                </button>
                <div className="gws-save-actions">
                  {current && (
                    <button
                      type="button"
                      className="gws-quiet"
                      onClick={() => void persist(true)}
                    >
                      <Copy />
                      {s("duplicate")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!current && !dirty}
                    className="gws-save"
                    onClick={() => void persist()}
                  >
                    {current && !dirty ? <Check /> : <Save />}
                    {s(
                      saving
                        ? "saving"
                        : current && !dirty
                          ? "savedLabel"
                          : "save",
                    )}
                  </button>
                </div>
              </div>
              {guest && <p className="gws-storage-note">{s("guestNote")}</p>}
              {onFinish && !guest && current && !dirty && hasOutput && (
                <button
                  type="button"
                  className="gws-save"
                  disabled={finishing}
                  onClick={() => void finish()}
                >
                  {s("finish")}
                  <ArrowRight />
                </button>
              )}
            </fieldset>
          </>
        ) : (
          <>
            <header className="gws-heading">
              <div>
                <h1>{s("shelf")}</h1>
                <p>{s(guest ? "guestNote" : "shelfHint")}</p>
              </div>
              <button
                type="button"
                className="gws-quiet"
                onClick={() => setPage("bench")}
              >
                <ArrowLeft />
                {s("backBoard")}
              </button>
            </header>
            {loading ? (
              <p className="gws-shelf-message" role="status">
                {s("loading")}
              </p>
            ) : loadFailed ? (
              <div className="gws-shelf-message" role="alert">
                {s("loadError")}{" "}
                <button
                  type="button"
                  className="gws-quiet"
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  {s("retry")}
                </button>
              </div>
            ) : rows.length ? (
              <ul className="gws-shelf-grid">
                {rows.map((row) => (
                  <li key={row.id}>
                    <div className="gws-card-icon" aria-hidden="true">
                      <Factory />
                    </div>
                    <div>
                      <h2>
                        {renderStudioName(row.content.nameSeed, language)}
                      </h2>
                      <p>
                        {s(
                          row.lastRun.produced.some((p) => p.count > 0)
                            ? "shelfMade"
                            : "shelfDraft",
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="gws-quiet"
                      aria-label={s("openNamed", {
                        name: renderStudioName(row.content.nameSeed, language),
                      })}
                      onClick={() =>
                        requestSwitch(() => setMachine(row.content, row))
                      }
                    >
                      <FolderOpen />
                      {s("open")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="gws-empty">
                <Boxes />
                <h2>{s("empty")}</h2>
                <p>{s("emptyHint")}</p>
                <button
                  type="button"
                  className="gws-save"
                  onClick={() => setPage("bench")}
                >
                  <Wrench />
                  {s("backBoard")}
                </button>
              </div>
            )}
          </>
        )}
        {pending && (
          <dialog
            ref={(node) => {
              if (node && !node.open) node.showModal();
            }}
            className="gws-confirm"
            aria-label={s("unsaved")}
            onCancel={() => setPending(null)}
          >
            <strong>{s("unsaved")}</strong>
            <button
              type="button"
              className="gws-quiet"
              onClick={() => setPending(null)}
            >
              <X />
              {s("keep")}
            </button>
            <button type="button" className="gws-quiet" onClick={pending.run}>
              {s("discard")}
              <ArrowRight />
            </button>
          </dialog>
        )}
        <div className="gws-notice" role="status" aria-live="polite">
          {notice && page === "bench" && s(notice, { name })}
        </div>
        {error && (
          <p className="gws-error" role="alert">
            {s(error)}
          </p>
        )}
      </div>
    </section>
  );
}
export default GreatWorkStudio;
