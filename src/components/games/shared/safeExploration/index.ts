/**
 * Safe Exploration controls — the adoption seam (#838).
 *
 * ## What this is
 *
 * One reusable interaction grammar for experimental actions, so a learner does
 * not relearn "how do I try something and get back?" in every game:
 *
 * | Band    | Grammar                                                        |
 * | ------- | -------------------------------------------------------------- |
 * | `k2`    | Try it → What happened? → Keep it / Go back                     |
 * | `older` | Preview → Run → Compare → Keep / Restore / Branch               |
 *
 * Both bands drive the **same** state model and the same callbacks. Only
 * labels and the offered action set differ (principle 9, "Banded expressions").
 *
 * ## What it never does
 *
 * No eligibility, no progression queries, no score/mastery/XP/accuracy, no
 * randomness, no persistence, no schema, no network, no navigation. Adoption
 * that needs any of those keeps them in the game (or its own ticket), and
 * hands this component the *result* as props.
 *
 * ## How a game adopts it (per-game ticket, never a bulk migration)
 *
 * ```tsx
 * import {
 *   SafeExplorationControls,
 *   bandForGradeBand,
 * } from "@/components/games/shared/safeExploration";
 *
 * // Inside a game rendered by GameShell — pass its `reducedEffects` through
 * // so the whole surface agrees on motion.
 * <SafeExplorationControls
 *   surfaceId="maze-maps"
 *   band={bandForGradeBand(gradeBand)}
 *   baseline={{ id: savedRoute.id, label: t("mazeMaps.savedRoute") }}
 *   reducedEffects={reducedEffects}
 *   onRun={async () => {
 *     const result = await runRoute(draftRoute);       // the game's own engine
 *     return { status: "ok", summary: describe(result) }; // learner vocabulary
 *   }}
 *   onKeep={async () => {
 *     try {
 *       await saveRoute(draftRoute);                    // the game's own save
 *       return { status: "ok" };
 *     } catch (cause) {
 *       // A failed save is a failure, never a learner outcome (§6).
 *       return { status: "unexpectedError", cause };
 *     }
 *   }}
 *   onRestore={() => restoreRoute(savedRoute)}
 *   onExit={() => navigate(backToLessonHref)}
 * />
 * ```
 *
 * Seam rules for the adopting ticket:
 *
 * 1. **Own the artifact.** The controls receive the baseline's *name*, never
 *    the artifact and never a setter, so nothing here can overwrite what you
 *    preserved. `onKeep` takes no arguments: the game decides what "keep"
 *    writes.
 * 2. **Report outcomes honestly.** Return `{ status: "ok", summary }` for an
 *    expected experimental result — including a "bad" one ("the bike spun
 *    out"). Return `recoverableError` / `unexpectedError` only for
 *    infrastructure failures. Never translate a failed save into an `ok`.
 *    A handler that throws is classified `unexpectedError` and reported to
 *    `onUnexpectedError`; it is never masked.
 * 3. **Localize what you pass in.** `baseline.label`, outcome `summary`, and
 *    every `availability` `reason` are host strings — pass `t(...)` values,
 *    not literals (rule `docs/agents/rules/20-i18n.md`). Everything the
 *    component itself says comes from `safeExploration.*` in the locale files.
 * 4. **Do not hide an exit.** Use `availability` to mark an action `hidden`
 *    (absent) or `blocked` **with a reason** — the union makes a mystery
 *    disabled control unrepresentable.
 * 5. **Keep the route back.** `onExit` renders only in `running` and the two
 *    error states — the states where a learner could otherwise be stranded.
 *    It is *not* a persistent Continue affordance: §7's always-visible route
 *    back to the ordered path stays the game shell's job, and these controls
 *    never navigate on their own. Pass `onExit` anyway, or a stuck run and a
 *    failed save have no way out.
 * 6. **Attach the proof.** An adopting PR reruns this component's automated
 *    proof for its states and adds the bounded manual walkthrough that #843's
 *    verification half asks for.
 *
 * Contracts: `docs/design-principles.md` principle 9 (#837),
 * `docs/safe-exploration-accessibility.md` (#843),
 * `docs/games/safe-exploration-controls.md` (this seam, long form).
 */
export {
  SafeExplorationControls,
  default as SafeExplorationControlsDefault,
  type SafeExplorationControlsProps,
} from "./SafeExplorationControls";
export { useSafeExplorationController } from "./useSafeExplorationController";
export {
  SAFE_EXPLORATION_FOCUS,
  SAFE_EXPLORATION_GRAMMAR,
  SAFE_EXPLORATION_TARGET_STATE,
  bandForGradeBand,
  safeExplorationKey,
  type SafeExplorationActionId,
  type SafeExplorationActionView,
  type SafeExplorationAnalyticsEvent,
  type SafeExplorationAvailability,
  type SafeExplorationBand,
  type SafeExplorationBaseline,
  type SafeExplorationBodyPart,
  type SafeExplorationConfig,
  type SafeExplorationController,
  type SafeExplorationErrorContext,
  type SafeExplorationFocusTarget,
  type SafeExplorationHandler,
  type SafeExplorationMessage,
  type SafeExplorationOutcome,
  type SafeExplorationRejection,
  type SafeExplorationRequestResult,
  type SafeExplorationState,
} from "./types";
