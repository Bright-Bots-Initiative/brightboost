/**
 * Safe Exploration controls — the presentational half (#838).
 *
 * Renders the banded interaction grammar over the shared state model:
 *
 *   K–2    Try it → What happened? → Keep it / Go back
 *   older  Preview → Run → Compare → Keep / Restore / Branch
 *
 * It computes nothing: no scores, no mastery, no XP, no access, no randomness.
 * Every state, exit, and consequence arrives through {@link SafeExplorationConfig}.
 *
 * Accessibility decisions, all traceable to `docs/safe-exploration-accessibility.md`:
 *  - §1 focus matrix is table-driven (`SAFE_EXPLORATION_FOCUS`); entering the
 *    surface (transition 0) never steals focus, and `running` holds focus on
 *    the invoking control, which stays mounted and focusable (`aria-disabled`,
 *    not `disabled`).
 *  - §3 one polite announcement per state change, from a live region that is
 *    in the DOM from first render. Everything it says is also visible in the
 *    status region, so nothing essential is audio-only or visual-only.
 *  - §1/§3 the focused status region is labelled by a short heading while the
 *    announcement carries the substance, to keep the overlap between "focus
 *    moved here" and "this was announced" small.
 *  - §1 an unavailable action is either absent or present **with a visible
 *    reason**; every non-ready control has an accessible description.
 *  - §4 reduced motion drops the entrance transition and keeps every piece of
 *    feedback (text, state attributes, announcement).
 *  - §8 K–2 tap targets are 56px (the D-pad precedent); older bands 44px.
 */
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import "../game-effects.css";
import { useReducedGameEffects } from "../useReducedGameEffects";
import {
  SAFE_EXPLORATION_FOCUS,
  safeExplorationKey,
  type SafeExplorationActionView,
  type SafeExplorationBodyPart,
  type SafeExplorationConfig,
} from "./types";
import { useSafeExplorationController } from "./useSafeExplorationController";

export interface SafeExplorationControlsProps extends SafeExplorationConfig {
  /**
   * Override the reduced-motion decision. Games rendered inside `GameShell`
   * already receive `reducedEffects` from its render prop — pass it through so
   * the whole surface agrees. Omitted, the shared hook decides.
   */
  readonly reducedEffects?: boolean;
  readonly className?: string;
  /**
   * Optional host-rendered detail inside the status region (a before/after
   * comparison, a thumbnail). It supplements the textual summary; it must
   * never be the only way to perceive the outcome.
   */
  readonly children?: ReactNode;
}

export function SafeExplorationControls(props: SafeExplorationControlsProps) {
  const { reducedEffects, className, children, ...config } = props;
  const { t } = useTranslation();
  const controller = useSafeExplorationController(config);
  const auto = useReducedGameEffects();
  const reduced = reducedEffects ?? auto.reducedEffects;

  const {
    state,
    band,
    baseline,
    actions,
    headingKey,
    body,
    announcement,
    replaceNotice,
    transitionCount,
    requestAction,
  } = controller;

  const idPrefix = useId();
  const headingId = `${idPrefix}-heading`;
  const bodyId = `${idPrefix}-body`;
  const replaceId = `${idPrefix}-replace`;
  const branchId = `${idPrefix}-branch`;
  const reasonId = (actionId: string) => `${idPrefix}-reason-${actionId}`;

  const statusRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedTransition = useRef(0);

  // §1 focus matrix. Transition 0 is "the surface just mounted": entering
  // idle never steals focus, so nothing happens until the learner acts.
  useEffect(() => {
    if (transitionCount === 0) return;
    if (transitionCount === lastFocusedTransition.current) return;
    lastFocusedTransition.current = transitionCount;
    const target = SAFE_EXPLORATION_FOCUS[state];
    if (target === "status") {
      statusRef.current?.focus();
    } else if (target === "primary") {
      primaryRef.current?.focus();
    }
    // "hold" keeps focus on the invoking control; "none" never moves focus.
  }, [state, transitionCount]);

  const renderParts = useCallback(
    (parts: readonly SafeExplorationBodyPart[]): string =>
      parts
        .map((part) => ("text" in part ? part.text : t(part.key, part.values)))
        .filter(Boolean)
        .join(" "),
    [t],
  );

  const bodyText = renderParts(body);
  const announcementText = announcement ? renderParts(announcement) : "";
  const hasBranch = actions.some((a) => a.id === "branch");

  const describedByFor = (
    action: SafeExplorationActionView,
  ): string | undefined => {
    const ids: string[] = [];
    if (action.status === "blocked") ids.push(reasonId(action.id));
    if (action.status === "busy") ids.push(bodyId);
    if (action.id === "keep" && replaceNotice) ids.push(replaceId);
    if (action.id === "branch") ids.push(branchId);
    return ids.length ? ids.join(" ") : undefined;
  };

  const tapClass = band === "k2" ? "min-h-[56px]" : "min-h-[44px]";

  return (
    <section
      aria-label={t(safeExplorationKey(band, "regionLabel"))}
      data-testid={`${config.surfaceId}-safe-exploration`}
      data-state={state}
      data-band={band}
      data-reduced-effects={reduced ? "true" : "false"}
      className={`flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:p-4 ${className ?? ""}`}
    >
      {/* One polite announcement per state change. The region itself stays
          mounted from first render so assistive tech is already observing it;
          the text inside is keyed on `transitionCount` so a *repeat* of an
          identical message — two identical failed retries — still replaces the
          node and is still announced. Without the key the string is
          byte-identical, React skips the mutation, and aria-live never fires. */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid={`${config.surfaceId}-safe-exploration-announcement`}
        data-transition={transitionCount}
      >
        <span
          key={transitionCount}
          data-testid={`${config.surfaceId}-safe-exploration-announcement-text`}
        >
          {announcementText}
        </span>
      </p>

      {/* The preserved "before" is named in ordinary page structure (§1). */}
      <p
        className="text-sm text-slate-600"
        data-testid={`${config.surfaceId}-safe-exploration-baseline`}
      >
        <span>{t(safeExplorationKey(band, "baselinePrefix"))}</span>{" "}
        <strong className="font-semibold text-slate-800">
          {baseline.label}
        </strong>
      </p>

      <div
        ref={statusRef}
        tabIndex={-1}
        aria-labelledby={headingId}
        data-testid={`${config.surfaceId}-safe-exploration-status`}
        data-error-kind={
          state === "unexpectedError"
            ? "unexpected"
            : state === "recoverableError"
              ? "recoverable"
              : undefined
        }
        className={[
          "rounded-xl px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          state === "unexpectedError"
            ? "border border-rose-300 bg-rose-50"
            : state === "recoverableError"
              ? "border border-amber-300 bg-amber-50"
              : "border border-slate-100 bg-slate-50",
          reduced ? "" : "slide-up-fade",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <h3
          id={headingId}
          className={`font-semibold text-slate-800 ${band === "k2" ? "text-lg" : "text-base"}`}
        >
          {t(headingKey)}
        </h3>
        {bodyText && (
          <p
            id={bodyId}
            className={`mt-1 text-slate-700 ${band === "k2" ? "text-base" : "text-sm"}`}
          >
            {bodyText}
          </p>
        )}
        {replaceNotice && (
          <p id={replaceId} className="mt-2 text-sm font-medium text-slate-700">
            {t(replaceNotice.key, replaceNotice.values)}
          </p>
        )}
        {hasBranch && (
          <p id={branchId} className="mt-1 text-sm text-slate-600">
            {t(safeExplorationKey(band, "branchNotice"), {
              baseline: baseline.label,
            })}
          </p>
        )}
        {children}
      </div>

      {actions.length > 0 && (
        <div
          role="group"
          aria-label={t(safeExplorationKey(band, "actionsLabel"))}
          className="flex flex-wrap gap-2"
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              ref={action.emphasis === "primary" ? primaryRef : undefined}
              type="button"
              variant={action.emphasis === "primary" ? "primary" : "outline"}
              data-action={action.id}
              data-emphasis={action.emphasis}
              data-status={action.status}
              data-tap-target={band === "k2" ? "56" : "44"}
              aria-disabled={action.status === "ready" ? undefined : true}
              aria-busy={action.isPending ? true : undefined}
              aria-describedby={describedByFor(action)}
              onClick={() => {
                if (action.status !== "ready") return;
                requestAction(action.id);
              }}
              className={[
                tapClass,
                "px-4",
                action.emphasis === "primary"
                  ? band === "k2"
                    ? "text-lg font-bold"
                    : "text-base font-semibold"
                  : "text-sm font-medium",
                action.status === "ready" ? "" : "opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {t(action.labelKey)}
            </Button>
          ))}
        </div>
      )}

      {/* An unavailable action is never a mystery: its reason is visible text
          and is the button's accessible description (§1 "unavailable"). */}
      {actions
        .filter((action) => action.status === "blocked" && action.reason)
        .map((action) => (
          <p
            key={action.id}
            id={reasonId(action.id)}
            className="text-sm text-slate-600"
            data-testid={`${config.surfaceId}-safe-exploration-reason-${action.id}`}
          >
            {action.reason}
          </p>
        ))}
    </section>
  );
}

export default SafeExplorationControls;
