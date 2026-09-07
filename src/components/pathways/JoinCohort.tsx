/**
 * Join or confirm a cohort (#874).
 *
 * The learner's own act of consent, with a read-only preview first: enter the
 * cohort code (or arrive from the home's "confirm sharing" prompt), see the
 * cohort, its facilitator and exactly which tracks would start sharing, then
 * confirm. Confirmation sends the preview's `version`; if the cohort changed
 * meanwhile the server answers 409 with a fresh preview and this page asks
 * again. Nothing is shared by loading this page or previewing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";

export interface ConsentPreview {
  cohort: {
    id: string;
    name: string;
    band: string;
    sitePartner: string | null;
    facilitatorName: string | null;
  };
  tracks: { slug: string; consentedSince: string | null; requested: boolean }[];
  enrollment: {
    state: "none" | "legacy" | "trusted" | "revoked";
    acceptedAt: string | null;
    source: string | null;
  };
  newSharing: string[];
  canConfirm: boolean;
  reason: "enrollment_revoked" | "nothing_new" | null;
  version: string;
}

type Phase = "enter" | "loading" | "preview" | "confirming" | "done";
type FailureKind =
  | "invalidCode"
  | "notFound"
  | "session"
  | "revoked"
  | "network"
  | "server";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("bb_access_token")}`,
});

/** fetch with a hard ceiling so a hung request becomes a retryable error. */
async function fetchWithTimeout(url: string, init: RequestInit, ms = 10000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

const trackName = (slug: string) =>
  PATHWAY_TRACKS.find((t) => t.slug === slug)?.name ?? slug;

export default function JoinCohort() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cohortIdParam = params.get("cohortId");

  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>(
    cohortIdParam ? "loading" : "enter",
  );
  const [preview, setPreview] = useState<ConsentPreview | null>(null);
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [changedNotice, setChangedNotice] = useState(false);
  const [done, setDone] = useState<{
    cohortName: string;
    changed: boolean;
  } | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  const ref = useCallback(
    () =>
      cohortIdParam
        ? { cohortId: cohortIdParam }
        : { joinCode: code.trim().toUpperCase() },
    [cohortIdParam, code],
  );

  const loadPreview = useCallback(async () => {
    const r = ref();
    if (!r.cohortId && !r.joinCode) return;
    setFailure(null);
    setChangedNotice(false);
    setPhase("loading");
    const query = r.cohortId
      ? `cohortId=${encodeURIComponent(r.cohortId)}`
      : `joinCode=${encodeURIComponent(r.joinCode ?? "")}`;
    try {
      const res = await fetchWithTimeout(
        `/api/pathways/enroll/preview?${query}`,
        {
          headers: authHeaders(),
        },
      );
      // 401: no session; 403: the token is invalid or expired (the preview
      // never answers 403 for a relationship — a revoked row is a 200).
      if (res.status === 401 || res.status === 403) {
        setFailure("session");
        setPhase("enter");
        return;
      }
      if (res.status === 404) {
        setFailure(r.cohortId ? "notFound" : "invalidCode");
        setPhase("enter");
        return;
      }
      if (!res.ok) {
        setFailure("server");
        setPhase("enter");
        return;
      }
      setPreview((await res.json()) as ConsentPreview);
      setPhase("preview");
    } catch {
      setFailure("network");
      setPhase("enter");
    }
  }, [ref]);

  // Arriving from the home's prompt: the cohort is known, preview at once.
  useEffect(() => {
    if (cohortIdParam) void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortIdParam]);

  useEffect(() => {
    if (phase === "preview") previewHeading.current?.focus();
    if (phase === "done") doneHeading.current?.focus();
    if (phase === "enter" && failure) codeInput.current?.focus();
  }, [phase, failure]);

  const confirm = async () => {
    if (!preview) return;
    setPhase("confirming");
    setFailure(null);
    setChangedNotice(false);
    try {
      const res = await fetchWithTimeout("/api/pathways/enroll", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...ref(), version: preview.version }),
      });
      const data = (await res.json().catch(() => null)) as {
        preview?: ConsentPreview;
        cohortName?: string;
        changed?: boolean;
        error?: string;
      } | null;
      if (res.status === 409 && data?.preview) {
        // The cohort changed since the preview: show what it is now and ask
        // again. Nothing was shared.
        setPreview(data.preview);
        setChangedNotice(true);
        setPhase("preview");
        return;
      }
      // A removed learner is told so by the error code; any other 401/403
      // is a missing, invalid or expired session.
      if (res.status === 403 && data?.error === "enrollment_revoked") {
        setFailure("revoked");
        setPhase("preview");
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setFailure("session");
        setPhase("preview");
        return;
      }
      if (!res.ok || !data) {
        setFailure("server");
        setPhase("preview");
        return;
      }
      setDone({
        cohortName: data.cohortName ?? preview.cohort.name,
        changed: data.changed ?? true,
      });
      // The home must not answer this confirmation with the first-visit
      // welcome redirect (its own one-shot key).
      try {
        sessionStorage.setItem("bb_pathways_welcome_offered", "1");
      } catch {
        // storage unavailable
      }
      setPhase("done");
    } catch {
      setFailure("network");
      setPhase("preview");
    }
  };

  const back = () => {
    if (cohortIdParam) {
      navigate("/pathways");
      return;
    }
    setPreview(null);
    setFailure(null);
    setChangedNotice(false);
    setPhase("enter");
  };

  const failureText = (kind: FailureKind) => t(`pathways.join.errors.${kind}`);
  const stateKey = (p: ConsentPreview) =>
    p.enrollment.state === "revoked"
      ? "stateRevoked"
      : p.reason === "nothing_new"
        ? "stateNothingNew"
        : p.enrollment.state === "legacy"
          ? "stateLegacy"
          : p.enrollment.state === "trusted"
            ? "stateTrusted"
            : "stateNone";

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="join-cohort">
      <div>
        <Link
          to="/pathways"
          className="inline-flex items-center gap-1 text-sm text-indigo-700 dark:text-indigo-300 hover:underline min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t("pathways.join.backHome")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.join.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {t("pathways.join.intro")}
        </p>
      </div>

      {/* Announcements: loading and errors are read by assistive tech. */}
      <div aria-live="polite" className="sr-only">
        {phase === "loading" &&
          t(
            cohortIdParam
              ? "pathways.join.loadingCohort"
              : "pathways.join.loading",
          )}
        {phase === "confirming" && t("pathways.join.confirming")}
      </div>
      {failure && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-900 dark:text-rose-200"
          data-testid="join-error"
        >
          <p>{failureText(failure)}</p>
          {failure === "session" && (
            <Link
              to="/student-login"
              className="mt-2 inline-flex items-center min-h-[44px] font-medium underline"
            >
              {t("pathways.join.errors.signIn")}
            </Link>
          )}
          {(failure === "network" || failure === "server") && (
            <button
              type="button"
              onClick={() => (preview ? void confirm() : void loadPreview())}
              className="mt-2 inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg border border-rose-300 dark:border-rose-700 font-medium"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {t("pathways.join.errors.retry")}
            </button>
          )}
        </div>
      )}

      {(phase === "enter" || (phase === "loading" && !cohortIdParam)) && (
        <form
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void loadPreview();
          }}
        >
          <label
            htmlFor="join-code"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            {t("pathways.join.codeLabel")}
          </label>
          <input
            id="join-code"
            ref={codeInput}
            name="joinCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("pathways.join.codePlaceholder")}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-lg tracking-widest uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={phase === "loading" || code.trim().length === 0}
            className="inline-flex items-center gap-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            {phase === "loading"
              ? t("pathways.join.loading")
              : t("pathways.join.preview")}
          </button>
        </form>
      )}

      {phase === "loading" && cohortIdParam && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("pathways.join.loadingCohort")}
        </p>
      )}

      {(phase === "preview" || phase === "confirming") && preview && (
        <section
          className="rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/30 p-5 space-y-4"
          aria-labelledby="join-preview-title"
          data-testid="join-preview"
        >
          {changedNotice && (
            <p
              role="status"
              className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
              data-testid="join-changed"
            >
              {t("pathways.join.changedNotice")}
            </p>
          )}
          <h2
            id="join-preview-title"
            ref={previewHeading}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            {t("pathways.join.previewTitle")}
          </h2>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {preview.cohort.name}
              {preview.cohort.sitePartner
                ? ` • ${preview.cohort.sitePartner}`
                : ""}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {preview.cohort.facilitatorName &&
                t("pathways.join.facilitator", {
                  name: preview.cohort.facilitatorName,
                })}
              {preview.cohort.facilitatorName ? " · " : ""}
              {t(
                `pathways.join.bands.${preview.cohort.band}`,
                preview.cohort.band,
              )}
            </p>
          </div>
          <p
            className="text-sm text-slate-800 dark:text-slate-200"
            data-testid="join-state"
          >
            {t(`pathways.join.${stateKey(preview)}`)}
          </p>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("pathways.join.tracksTitle")}
            </h3>
            <ul className="mt-1 space-y-1">
              {preview.tracks.map((track) => (
                <li
                  key={track.slug}
                  className="flex flex-wrap items-baseline gap-x-2 text-sm"
                  data-testid={`join-track-${track.slug}`}
                  data-requested={track.requested ? "true" : "false"}
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {trackName(track.slug)}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {track.consentedSince
                      ? t("pathways.join.trackSince", {
                          date: new Date(
                            track.consentedSince,
                          ).toLocaleDateString(),
                        })
                      : track.requested
                        ? t("pathways.join.trackNew")
                        : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {preview.canConfirm && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t("pathways.join.boundaryNote")}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            {preview.canConfirm && (
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={phase === "confirming"}
                className="inline-flex items-center gap-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                data-testid="join-confirm"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                {phase === "confirming"
                  ? t("pathways.join.confirming")
                  : t("pathways.join.confirm")}
              </button>
            )}
            <button
              type="button"
              onClick={back}
              disabled={phase === "confirming"}
              className="inline-flex items-center gap-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              data-testid="join-back"
            >
              {preview.canConfirm
                ? t("pathways.join.cancel")
                : t("pathways.join.back")}
            </button>
          </div>
        </section>
      )}

      {phase === "done" && done && (
        <section
          className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30 p-5 space-y-3"
          aria-labelledby="join-done-title"
          data-testid="join-done"
        >
          <h2
            id="join-done-title"
            ref={doneHeading}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            {t("pathways.join.doneTitle")}
          </h2>
          <p
            className="text-sm text-slate-800 dark:text-slate-200"
            role="status"
          >
            {done.changed
              ? t("pathways.join.doneBody", { cohort: done.cohortName })
              : t("pathways.join.doneNothing")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/pathways")}
            className="inline-flex items-center gap-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            data-testid="join-home"
          >
            {t("pathways.join.backHome")}
          </button>
        </section>
      )}
    </div>
  );
}
