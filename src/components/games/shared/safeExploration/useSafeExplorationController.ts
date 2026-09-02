/**
 * Safe Exploration controls — the headless controller (#838).
 *
 * Owns the state machine, the in-flight latch, and the localizable copy plan.
 * Owns **no policy**: no eligibility, no progression, no score/mastery/XP, no
 * randomness, no persistence, no network. Every consequence is a host callback.
 *
 * Two independent guards keep a consequential action from firing twice or from
 * firing out of turn:
 *
 *   1. the **grammar guard** — `requestAction` refuses any action that is not
 *      an exit of the current state (`SAFE_EXPLORATION_GRAMMAR`). `keep` exists
 *      only in `observing`, so it cannot fire from `restored`/`kept`.
 *   2. the **latch** — while an action is in flight, another consequential
 *      request is refused (`rejection: "in-flight"`), mirroring the
 *      `completingRef` precedent in `src/pages/ActivityPlayer.tsx`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { track } from "@/lib/analytics";

import {
  SAFE_EXPLORATION_GRAMMAR,
  SAFE_EXPLORATION_TARGET_STATE,
  safeExplorationKey,
  type SafeExplorationActionId,
  type SafeExplorationActionView,
  type SafeExplorationAnalyticsEvent,
  type SafeExplorationAvailability,
  type SafeExplorationBodyPart,
  type SafeExplorationConfig,
  type SafeExplorationController,
  type SafeExplorationHandler,
  type SafeExplorationMessage,
  type SafeExplorationOutcome,
  type SafeExplorationProcessEventKind,
  type SafeExplorationRequestResult,
  type SafeExplorationState,
} from "./types";

/**
 * Actions that stay operable while something else is in flight — §1 of the
 * accessibility contract requires a stuck run to expose a visible, focusable
 * way out.
 */
const ESCAPE_ACTIONS: ReadonlySet<SafeExplorationActionId> = new Set([
  "cancel",
  "exit",
]);

const ANALYTICS_KIND: Partial<
  Record<SafeExplorationActionId, SafeExplorationProcessEventKind>
> = {
  preview: "experiment_previewed",
  run: "experiment_tried",
  keep: "experiment_kept",
  restore: "experiment_restored",
  branch: "experiment_branched",
};

function normalizeOutcome(
  value: void | SafeExplorationOutcome,
): SafeExplorationOutcome {
  return value ?? { status: "ok" };
}

function isThenable(
  value: unknown,
): value is Promise<void | SafeExplorationOutcome> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

interface InternalStatus {
  readonly state: SafeExplorationState;
  /** Host-localized learner-vocabulary text carried by the last outcome. */
  readonly summary?: string;
  /** Which action produced the current error state, if any. */
  readonly failedAction?: SafeExplorationActionId;
}

export function useSafeExplorationController(
  config: SafeExplorationConfig,
): SafeExplorationController {
  const { surfaceId, band, baseline, unavailable } = config;

  const [status, setStatus] = useState<InternalStatus>({ state: "baseline" });
  const [pendingAction, setPendingAction] =
    useState<SafeExplorationActionId | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [transitionCount, setTransitionCount] = useState(0);

  /** The latch. A ref (not state) so two clicks in one tick cannot both pass. */
  const pendingRef = useRef<SafeExplorationActionId | null>(null);
  /** Invalidates an in-flight handler whose result is no longer wanted. */
  const runTokenRef = useRef(0);
  /** Run counter kept in a ref so analytics stays correct for async handlers. */
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Latest-value refs so `requestAction` stays referentially stable and never
  // closes over a stale config — a stale `onKeep` is exactly how a keep could
  // end up committing the wrong thing.
  const configRef = useRef(config);
  configRef.current = config;
  const statusRef = useRef(status);
  statusRef.current = status;

  const effectiveState: SafeExplorationState = unavailable
    ? "unavailable"
    : status.state;

  const availabilityOf = useCallback(
    (id: SafeExplorationActionId): SafeExplorationAvailability =>
      configRef.current.availability?.[id] ?? { kind: "available" },
    [],
  );

  const isOffered = useCallback((id: SafeExplorationActionId): boolean => {
    const cfg = configRef.current;
    switch (id) {
      case "run":
        return true; // `onRun` is required by the config type.
      case "preview":
        return Boolean(cfg.onPreview);
      case "cancel":
        return Boolean(cfg.onCancel);
      case "keep":
        return Boolean(cfg.onKeep);
      case "restore":
        return Boolean(cfg.onRestore);
      case "branch":
        // K–2 has no branch concept and its child-facing copy may not use the
        // word, so the action is band-gated rather than merely relabelled.
        return cfg.band === "older" && Boolean(cfg.onBranch);
      case "tryAgain":
        return true; // Without `onTryAgain` this is a pure return to baseline.
      case "retry":
        return Boolean(statusRef.current.failedAction);
      case "exit":
        return Boolean(cfg.onExit);
      default:
        return false;
    }
  }, []);

  const handlerFor = useCallback(
    (id: SafeExplorationActionId): SafeExplorationHandler | undefined => {
      const cfg = configRef.current;
      switch (id) {
        case "preview":
          return cfg.onPreview;
        case "run":
          return cfg.onRun;
        case "cancel":
          return cfg.onCancel;
        case "keep":
          return cfg.onKeep;
        case "restore":
          return cfg.onRestore;
        case "branch":
          return cfg.onBranch;
        case "tryAgain":
          return cfg.onTryAgain ?? (() => undefined);
        default:
          return undefined;
      }
    },
    [],
  );

  const emit = useCallback((event: SafeExplorationAnalyticsEvent) => {
    const cfg = configRef.current;
    if (cfg.onAnalyticsEvent) {
      cfg.onAnalyticsEvent(event);
      return;
    }
    track(event);
  }, []);

  const commit = useCallback((next: InternalStatus) => {
    const previous = statusRef.current.state;
    statusRef.current = next;
    setStatus(next);
    setTransitionCount((n) => n + 1);
    if (next.state !== previous) {
      configRef.current.onStateChange?.(next.state, previous);
    }
  }, []);

  const requestAction = useCallback(
    (id: SafeExplorationActionId): SafeExplorationRequestResult => {
      const cfg = configRef.current;
      const originState: SafeExplorationState = cfg.unavailable
        ? "unavailable"
        : statusRef.current.state;

      // Guard 1 — grammar. A control that is not rendered in this state also
      // cannot be invoked programmatically.
      if (!SAFE_EXPLORATION_GRAMMAR[originState].actions.includes(id)) {
        return { accepted: false, rejection: "not-in-grammar" };
      }
      if (!isOffered(id)) {
        return { accepted: false, rejection: "no-handler" };
      }
      if (availabilityOf(id).kind !== "available") {
        return { accepted: false, rejection: "unavailable" };
      }

      // Guard 2 — the latch. Escapes stay reachable so a stuck run is escapable.
      if (pendingRef.current !== null && !ESCAPE_ACTIONS.has(id)) {
        return { accepted: false, rejection: "in-flight" };
      }

      if (id === "exit") {
        cfg.onExit?.();
        return { accepted: true };
      }

      // `retry` re-runs exactly the action that failed — it never becomes a
      // different, more destructive action.
      const resolvedId: SafeExplorationActionId =
        id === "retry"
          ? (statusRef.current.failedAction as SafeExplorationActionId)
          : id;
      const handler = handlerFor(resolvedId);
      if (!handler) {
        return { accepted: false, rejection: "no-handler" };
      }

      // Taking the latch invalidates any earlier in-flight handler; only an
      // escape action can reach here while one is still running.
      const token = runTokenRef.current + 1;
      runTokenRef.current = token;
      pendingRef.current = resolvedId;
      setPendingAction(resolvedId);

      if (resolvedId === "run") {
        attemptRef.current += 1;
        setAttempt(attemptRef.current);
        commit({ state: "running" });
      }
      const attemptNumber = attemptRef.current;

      const settle = (outcome: SafeExplorationOutcome) => {
        if (!mountedRef.current || runTokenRef.current !== token) return;
        pendingRef.current = null;
        setPendingAction(null);

        if (outcome.status === "ok") {
          commit({
            state:
              SAFE_EXPLORATION_TARGET_STATE[
                resolvedId as keyof typeof SAFE_EXPLORATION_TARGET_STATE
              ],
            summary: outcome.summary,
          });
          const kind = ANALYTICS_KIND[resolvedId];
          if (kind) {
            emit({ kind, surface_id: surfaceId, band, attempt: attemptNumber });
          }
          return;
        }

        // §6: an infrastructure failure is a failure. It never lands in
        // `observing` and never reads as a learner outcome.
        const isUnexpected = outcome.status === "unexpectedError";
        commit({
          state: isUnexpected ? "unexpectedError" : "recoverableError",
          summary: outcome.summary,
          failedAction: resolvedId,
        });
        if (isUnexpected) {
          cfg.onUnexpectedError?.(outcome.cause, {
            action: resolvedId,
            state: originState,
          });
        }
        emit({
          kind: "experiment_failed",
          surface_id: surfaceId,
          band,
          attempt: attemptNumber,
          error_kind: isUnexpected ? "unexpected" : "recoverable",
        });
      };

      let result:
        | void
        | SafeExplorationOutcome
        | Promise<void | SafeExplorationOutcome>;
      try {
        result = handler();
      } catch (error) {
        settle({ status: "unexpectedError", cause: error });
        return { accepted: true };
      }

      if (isThenable(result)) {
        result.then(
          (value) => settle(normalizeOutcome(value)),
          (error) => settle({ status: "unexpectedError", cause: error }),
        );
      } else {
        settle(normalizeOutcome(result));
      }
      return { accepted: true };
    },
    [availabilityOf, band, commit, emit, handlerFor, isOffered, surfaceId],
  );

  // ── Presentation plan ────────────────────────────────────────────────────
  // Deliberately not memoized: these are tiny derivations, and a stale memo of
  // "which exits exist" would be an accessibility defect, not a perf win.

  const grammar = SAFE_EXPLORATION_GRAMMAR[effectiveState];
  let candidates = grammar.actions.filter(
    (id) => isOffered(id) && availabilityOf(id).kind !== "hidden",
  );
  if (grammar.exclusiveFirst && candidates.length > 1) {
    const firstReady = candidates.find(
      (id) => availabilityOf(id).kind === "available",
    );
    candidates = [firstReady ?? candidates[0]];
  }
  const primaryId =
    candidates.find((id) => availabilityOf(id).kind === "available") ??
    candidates[0];

  const actions: readonly SafeExplorationActionView[] = candidates.map((id) => {
    const avail = availabilityOf(id);
    const isPending = pendingAction === id;
    const actionStatus: SafeExplorationActionView["status"] =
      avail.kind === "blocked"
        ? "blocked"
        : isPending || (pendingAction !== null && !ESCAPE_ACTIONS.has(id))
          ? "busy"
          : "ready";
    return {
      id,
      labelKey: safeExplorationKey(band, `actions.${id}`),
      emphasis: id === primaryId ? "primary" : "secondary",
      status: actionStatus,
      isPending,
      ...(avail.kind === "blocked" ? { reason: avail.reason } : {}),
    };
  });

  const headingKey = safeExplorationKey(band, `headings.${effectiveState}`);

  const { body, announcement } = useMemo(() => {
    const k = (path: string) => safeExplorationKey(band, path);
    const values = { baseline: baseline.label };
    const baselineState: SafeExplorationBodyPart =
      status.failedAction === "restore"
        ? { key: k("announce.restoreFailed"), values }
        : { key: k("announce.baselineSafe"), values };
    const both = (parts: SafeExplorationBodyPart[]) => ({
      body: parts,
      announcement: parts,
    });

    switch (effectiveState) {
      case "baseline":
        // Idle is silent: still described in page structure, never announced.
        return {
          body: [{ key: k("body.baseline") }] as SafeExplorationBodyPart[],
          announcement: null,
        };
      case "unavailable":
        // The reason is text on the surface, never an unprompted announcement.
        return {
          body: [
            { text: unavailable?.reason ?? "" },
          ] as SafeExplorationBodyPart[],
          announcement: null,
        };
      case "preview":
        return both([
          { key: k("announce.preview"), values },
          ...(status.summary ? [{ text: status.summary }] : []),
        ]);
      case "running":
        return both([{ key: k("announce.running") }]);
      case "observing":
        return both(
          status.summary
            ? [{ key: k("announce.observing") }, { text: status.summary }]
            : [{ key: k("announce.observingPlain") }],
        );
      case "kept":
        return both([
          { key: k("announce.kept"), values },
          ...(status.summary ? [{ text: status.summary }] : []),
        ]);
      case "restored":
        return both([{ key: k("announce.restored"), values }]);
      case "branched":
        return both([{ key: k("announce.branched"), values }]);
      case "recoverableError":
        return both([
          { key: k("announce.recoverableError") },
          ...(status.summary ? [{ text: status.summary }] : []),
          baselineState,
        ]);
      case "unexpectedError":
        return both([
          { key: k("announce.unexpectedError") },
          ...(status.summary ? [{ text: status.summary }] : []),
          baselineState,
        ]);
      default:
        return { body: [] as SafeExplorationBodyPart[], announcement: null };
    }
  }, [
    band,
    baseline.label,
    effectiveState,
    status.failedAction,
    status.summary,
    unavailable?.reason,
  ]);

  const replaceNotice: SafeExplorationMessage | null =
    effectiveState === "observing" && actions.some((a) => a.id === "keep")
      ? {
          key: safeExplorationKey(band, "replaceNotice"),
          values: { baseline: baseline.label },
        }
      : null;

  return {
    state: effectiveState,
    band,
    baseline,
    actions,
    headingKey,
    body,
    announcement,
    replaceNotice,
    transitionCount,
    pendingAction,
    attempt,
    requestAction,
  };
}
