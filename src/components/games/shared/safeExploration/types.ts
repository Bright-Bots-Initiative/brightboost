/**
 * Safe Exploration controls — the shared typed contract (#838).
 *
 * This module owns the *interaction grammar* for experimental actions and
 * nothing else. It is deliberately policy-free:
 *
 *   - no eligibility, unlock, or progression queries;
 *   - no score / mastery / XP / accuracy / random computation;
 *   - no persistence, schema, or backend calls;
 *   - no navigation of its own.
 *
 * Everything a surface needs arrives through {@link SafeExplorationConfig}
 * and leaves through the named callbacks. The host owns the artifact; this
 * contract only ever holds the artifact's *name* ({@link SafeExplorationBaseline}),
 * which is why the controls structurally cannot overwrite a preserved baseline.
 *
 * Product source: principle 9 of `docs/design-principles.md` (the Safe
 * Exploration Contract, #837).
 * Accessibility source: `docs/safe-exploration-accessibility.md` (#843) — the
 * state names below are that document's programmatic vocabulary.
 */

/**
 * Grade-band expression of the *same* state model (principle 9, "Banded
 * expressions"). Only labels and the offered action set change; states,
 * transitions, and semantics do not.
 *
 *  - `k2`    — Try it → What happened? → Keep it / Go back
 *  - `older` — Preview → Run → Compare → Keep / Restore / Branch
 */
export type SafeExplorationBand = "k2" | "older";

/** Map the repo's `Course.gradeBand` onto the banded control expression. */
export function bandForGradeBand(
  gradeBand: string | null | undefined,
): SafeExplorationBand {
  return gradeBand === "g3_5" || gradeBand === "g6_8" ? "older" : "k2";
}

/**
 * The life-cycle states from §1 of the accessibility contract. A surface may
 * skip states it does not need; it may not invent hidden ones.
 *
 * Deliberately NOT modelled here (owned by sibling tickets):
 *   - `revisit / remix`        → My Lab / My Creations (#841)
 *   - `surprise destination`   → guided choice in Modules (#842)
 */
export type SafeExplorationState =
  | "baseline"
  | "preview"
  | "running"
  | "observing"
  | "kept"
  | "restored"
  | "branched"
  | "unavailable"
  | "recoverableError"
  | "unexpectedError";

/**
 * Action identifiers are the programmatic vocabulary. Child-facing labels are
 * localized per band and never leak into logic.
 *
 *  - `preview`  — show what a run will do, without running it (older band).
 *  - `run`      — start the experiment ("Try it" / "Run").
 *  - `cancel`   — leave preview, or step out of a stuck run, without keeping.
 *  - `keep`     — the one consequential action: adopt the experiment.
 *  - `restore`  — return to the preserved baseline ("Go back" / "Restore").
 *  - `branch`   — keep as a new version, original untouched (older band only).
 *  - `tryAgain` — start over from the baseline.
 *  - `retry`    — re-run the action that failed (error states only).
 *  - `exit`     — the host's visible route back to the ordered learning path.
 */
export type SafeExplorationActionId =
  | "preview"
  | "run"
  | "cancel"
  | "keep"
  | "restore"
  | "branch"
  | "tryAgain"
  | "retry"
  | "exit";

/**
 * The preserved "before". The controls receive a **name**, never the artifact
 * and never a setter, so no code path in this component can write to it.
 */
export interface SafeExplorationBaseline {
  /** Stable id for analytics/test ids. Not rendered. */
  readonly id: string;
  /** Host-localized display name, e.g. `t("mazeMaps.savedRoute")`. */
  readonly label: string;
}

/**
 * What a host handler reports back.
 *
 * §6 of the accessibility contract: an expected experimental result is
 * learning data (`ok`, with the learner-vocabulary `summary`); an
 * infrastructure failure is a failure (`recoverableError` /
 * `unexpectedError`) and never masquerades as a learner outcome.
 */
export type SafeExplorationOutcome =
  | { readonly status: "ok"; readonly summary?: string }
  | {
      readonly status: "recoverableError";
      /** Host-localized: what failed and what the learner can do. */
      readonly summary: string;
      readonly cause?: unknown;
    }
  | {
      readonly status: "unexpectedError";
      /** Optional host detail. The system-problem framing is always ours. */
      readonly summary?: string;
      readonly cause?: unknown;
    };

/**
 * A host handler. Returning nothing means `{ status: "ok" }`.
 *
 * A handler that **throws or rejects** is classified as `unexpectedError` —
 * never as a learner outcome, and never swallowed (see `onUnexpectedError`).
 */
export type SafeExplorationHandler = () =>
  | void
  | SafeExplorationOutcome
  | Promise<void | SafeExplorationOutcome>;

/**
 * Per-action availability. The union makes a mystery disabled control
 * unrepresentable: an action is either offered, absent, or present **with a
 * reason** (accessibility contract §1, "unavailable").
 */
export type SafeExplorationAvailability =
  | { readonly kind: "available" }
  | { readonly kind: "hidden" }
  | {
      readonly kind: "blocked";
      /** Host-localized. */ readonly reason: string;
    };

/** A localizable string the controls emit: key plus interpolation values. */
export interface SafeExplorationMessage {
  readonly key: string;
  readonly values?: Readonly<Record<string, string>>;
}

/**
 * A piece of rendered copy: either one of our localized messages or a
 * host-supplied, already-localized string (observation summaries, block
 * reasons — content the host owns because it is game-specific).
 */
export type SafeExplorationBodyPart =
  | SafeExplorationMessage
  | { readonly text: string };

/** One rendered action, fully resolved for presentation. */
export interface SafeExplorationActionView {
  readonly id: SafeExplorationActionId;
  readonly labelKey: string;
  /** Exactly one action per state is `primary` (one dominant action rule). */
  readonly emphasis: "primary" | "secondary";
  /**
   * `ready` — operable. `busy` — an action is in flight. `blocked` — the host
   * marked it unavailable and supplied a reason. Both non-ready statuses carry
   * an accessible description, so there is never a mystery disabled control.
   */
  readonly status: "ready" | "busy" | "blocked";
  /** True only for the action actually in flight (carries `aria-busy`). */
  readonly isPending: boolean;
  /** Present iff `status === "blocked"`; host-localized. */
  readonly reason?: string;
}

/** Why a requested action was not performed. */
export type SafeExplorationRejection =
  | "in-flight"
  | "not-in-grammar"
  | "unavailable"
  | "no-handler";

export type SafeExplorationRequestResult =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly rejection: SafeExplorationRejection };

export interface SafeExplorationErrorContext {
  readonly action: SafeExplorationActionId;
  readonly state: SafeExplorationState;
}

export interface SafeExplorationConfig {
  /**
   * Stable surface identifier (e.g. `"maze-maps"`). Used for analytics
   * properties and test ids only — never for policy.
   */
  readonly surfaceId: string;
  readonly band: SafeExplorationBand;
  readonly baseline: SafeExplorationBaseline;
  /**
   * Set by the host when experimenting is not offered right now (teacher
   * lock, missing prerequisite, …). The reason is host-localized text; the
   * controls never compute eligibility themselves.
   */
  readonly unavailable?: { readonly reason: string };
  readonly availability?: Partial<
    Record<SafeExplorationActionId, SafeExplorationAvailability>
  >;

  /** Required: the surface exists to run experiments. */
  readonly onRun: SafeExplorationHandler;
  readonly onPreview?: SafeExplorationHandler;
  readonly onCancel?: SafeExplorationHandler;
  readonly onKeep?: SafeExplorationHandler;
  readonly onRestore?: SafeExplorationHandler;
  /** Older band only; ignored for `k2` (no "branch" concept in K–2 copy). */
  readonly onBranch?: SafeExplorationHandler;
  /** Optional reset hook; without it `tryAgain` simply returns to baseline. */
  readonly onTryAgain?: SafeExplorationHandler;
  /** The host's route back to the ordered learning path. */
  readonly onExit?: () => void;

  readonly onStateChange?: (
    next: SafeExplorationState,
    previous: SafeExplorationState,
  ) => void;
  /**
   * Called for every `unexpectedError`, including thrown/rejected handlers,
   * so infrastructure failures stay observable instead of being masked.
   */
  readonly onUnexpectedError?: (
    error: unknown,
    context: SafeExplorationErrorContext,
  ) => void;
  /** Escape hatch for tests/stories; defaults to the shared `track` util. */
  readonly onAnalyticsEvent?: (event: SafeExplorationAnalyticsEvent) => void;
}

/** What the learner did, never how well they did it. */
export type SafeExplorationProcessEventKind =
  | "experiment_previewed"
  | "experiment_tried"
  | "experiment_kept"
  | "experiment_restored"
  | "experiment_branched";

/**
 * Process-describing analytics. Never correctness, never a score. `attempt`
 * counts runs on this surface — a revision measure (principle 5/9).
 */
export type SafeExplorationAnalyticsEvent =
  | {
      readonly kind: SafeExplorationProcessEventKind;
      readonly surface_id: string;
      readonly band: SafeExplorationBand;
      readonly attempt: number;
    }
  | {
      /** An infrastructure failure stays countable and distinct (§6). */
      readonly kind: "experiment_failed";
      readonly surface_id: string;
      readonly band: SafeExplorationBand;
      readonly attempt: number;
      readonly error_kind: "recoverable" | "unexpected";
    };

/** What the headless controller hands to any presentation layer. */
export interface SafeExplorationController {
  readonly state: SafeExplorationState;
  readonly band: SafeExplorationBand;
  readonly baseline: SafeExplorationBaseline;
  readonly actions: readonly SafeExplorationActionView[];
  /** The state heading key. */
  readonly headingKey: string;
  /**
   * Visible body copy for the state. Everything the announcement says is also
   * here, so no required information exists only in audio (or only visually).
   */
  readonly body: readonly SafeExplorationBodyPart[];
  /**
   * The single announcement for the most recent state change, as ordered
   * parts. `null` when nothing should be said (idle, unavailable).
   */
  readonly announcement: readonly SafeExplorationBodyPart[] | null;
  /** Set in `observing` when `keep` is offered: what keeping will replace. */
  readonly replaceNotice: SafeExplorationMessage | null;
  /** Incremented on every state change; presentation uses it to move focus. */
  readonly transitionCount: number;
  /** The action currently in flight, if any (the latch's public face). */
  readonly pendingAction: SafeExplorationActionId | null;
  readonly attempt: number;
  requestAction(id: SafeExplorationActionId): SafeExplorationRequestResult;
}

// ── Grammar ────────────────────────────────────────────────────────────────

interface GrammarEntry {
  /** Ordered candidates; the first *available* one becomes primary. */
  readonly actions: readonly SafeExplorationActionId[];
  /**
   * When true only the first available candidate renders, so two "start the
   * experiment" affordances never compete for dominance.
   */
  readonly exclusiveFirst?: boolean;
}

/**
 * The single source of truth for "which exits exist in this state". Both the
 * renderer and `requestAction`'s guard read it, so a control that is not
 * rendered also cannot be invoked programmatically.
 *
 * Note `keep` appears **only** under `observing`: that is the structural half
 * of "restore cannot accidentally overwrite the preserved baseline".
 */
export const SAFE_EXPLORATION_GRAMMAR: Readonly<
  Record<SafeExplorationState, GrammarEntry>
> = {
  baseline: { actions: ["preview", "run"], exclusiveFirst: true },
  preview: { actions: ["run", "cancel"] },
  running: { actions: ["run", "cancel", "exit"] },
  observing: { actions: ["keep", "branch", "restore", "tryAgain"] },
  kept: { actions: ["tryAgain", "restore"] },
  branched: { actions: ["tryAgain", "restore"] },
  restored: { actions: ["tryAgain"] },
  unavailable: { actions: [] },
  recoverableError: { actions: ["retry", "exit"] },
  unexpectedError: { actions: ["retry", "exit"] },
};

/** Where a successfully completed action lands. */
export const SAFE_EXPLORATION_TARGET_STATE: Readonly<
  Record<
    Exclude<SafeExplorationActionId, "retry" | "exit">,
    SafeExplorationState
  >
> = {
  preview: "preview",
  run: "observing",
  cancel: "baseline",
  keep: "kept",
  restore: "restored",
  branch: "branched",
  tryAgain: "baseline",
};

/**
 * Where focus goes when a state is entered (accessibility contract §1).
 *
 *  - `none`    — never steal focus (idle, unavailable, and first mount).
 *  - `status`  — the result/confirmation/error region.
 *  - `primary` — the state's primary action button.
 *  - `hold`    — leave focus on the invoking control (it stays mounted, busy).
 */
export type SafeExplorationFocusTarget = "none" | "status" | "primary" | "hold";

export const SAFE_EXPLORATION_FOCUS: Readonly<
  Record<SafeExplorationState, SafeExplorationFocusTarget>
> = {
  baseline: "primary",
  preview: "primary",
  running: "hold",
  observing: "status",
  kept: "status",
  restored: "primary",
  branched: "status",
  unavailable: "none",
  recoverableError: "status",
  unexpectedError: "status",
};

/** Root i18n key for a band's copy table. */
export function safeExplorationKey(
  band: SafeExplorationBand,
  path: string,
): string {
  return `safeExploration.${band}.${path}`;
}
