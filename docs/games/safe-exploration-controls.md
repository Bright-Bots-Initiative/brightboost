# Safe Exploration controls — the shared adoption seam (#838)

> **Canonical for:** the shared experiment-control grammar in
> `src/components/games/shared/safeExploration/`. Last verified against code: 2026-09-02.
>
> Product contract: principle 9 of [`docs/design-principles.md`](../design-principles.md) (#837).
> Accessibility contract: `docs/safe-exploration-accessibility.md` (#843).
> This document does **not** claim any game has adopted the component — none has.

One reusable interaction grammar for experimental actions, so a learner does not
relearn "how do I try something, and how do I get back?" in every game.

| Band    | Grammar the learner sees                          |
| ------- | ------------------------------------------------- |
| `k2`    | Try it → What happened? → Keep it / Go back       |
| `older` | Preview → Run → Compare → Keep / Restore / Branch |

Both bands drive the **same** state model, the same transitions, and the same
callbacks. Only labels and the offered action set differ.

---

## 1. The state model

States are the programmatic vocabulary of the accessibility contract's §1
matrix. Accessible names, `data-state`, announcements, and the focus rule are
all derived from them.

```
baseline ──preview──► preview ──run──► running ──► observing ──keep───► kept
    ▲         │  cancel                    │  cancel      │  restore─► restored
    │         └────────────────────────────┘              │  branch──► branched
    └──────────── tryAgain ────────────────────────────────┘

any action → recoverableError | unexpectedError ──retry──► (re-runs that action)
host-declared → unavailable   (overrides every state; no exits)
```

`revisit / remix` (#841) and `surprise destination` (#842) are deliberately not
modelled here — those are their own surfaces.

## 2. The callback contract

```ts
type SafeExplorationHandler = () =>
  | void // ⇒ { status: "ok" }
  | SafeExplorationOutcome
  | Promise<void | SafeExplorationOutcome>;

type SafeExplorationOutcome =
  | { status: "ok"; summary?: string } // learner outcome
  | { status: "recoverableError"; summary: string; cause?: unknown }
  | { status: "unexpectedError"; summary?: string; cause?: unknown };
```

| Prop                | When it is offered                        | Lands in         |
| ------------------- | ----------------------------------------- | ---------------- |
| `onRun` (required)  | `baseline`, `preview`                     | `observing`      |
| `onPreview`         | `baseline` (older band grammar)           | `preview`        |
| `onCancel`          | `preview`, `running` (the way out)        | `baseline`       |
| `onKeep`            | **`observing` only**                      | `kept`           |
| `onRestore`         | `observing`, `kept`, `branched`           | `restored`       |
| `onBranch`          | `observing`, **`band === "older"` only**  | `branched`       |
| `onTryAgain`        | after any outcome; optional (pure reset)  | `baseline`       |
| `onExit`            | `running`, error states                   | (host navigates) |
| `onUnexpectedError` | every `unexpectedError`, including throws | —                |

Every handler takes **zero arguments**. The component never passes the artifact
around, because it never holds it: `baseline` is `{ id, label }` — a _name_.

`requestAction(id)` returns `{ accepted: true }` or
`{ accepted: false, rejection: "in-flight" | "not-in-grammar" | "unavailable" | "no-handler" }`.

## 3. The two guards

1. **Grammar guard.** `SAFE_EXPLORATION_GRAMMAR` is the single source of truth
   for "which exits exist in this state", read by both the renderer and
   `requestAction`. A control that is not rendered also cannot be invoked
   programmatically. `keep` appears only under `observing`, so a stray keep
   after a restore — or a second keep after a keep — is refused.
2. **In-flight latch.** One consequential action at a time
   (`rejection: "in-flight"`), the `completingRef` precedent from
   `src/pages/ActivityPlayer.tsx`. `cancel` and `exit` stay operable so a stuck
   run always has a visible way out; taking the latch invalidates the abandoned
   handler's result so it cannot drag the learner back into `observing`.

Together they are why "restore cannot accidentally overwrite the preserved
baseline" holds structurally rather than by convention.

## 4. Availability — never a mystery control

```ts
type SafeExplorationAvailability =
  | { kind: "available" }
  | { kind: "hidden" } // absent from the DOM
  | { kind: "blocked"; reason: string }; // present, with visible reason
```

The union makes "disabled with no explanation" unrepresentable. A `blocked`
action renders `aria-disabled` with its reason as visible text **and** as the
button's accessible description. Whole-surface lock-out uses
`unavailable={{ reason }}`, which overrides every state, offers no exits, does
not steal focus, and is never announced unprompted.

## 5. Adopting it in a game

Adoption is per-game, in that game's own ticket — never a bulk migration.

```tsx
import {
  SafeExplorationControls,
  bandForGradeBand,
} from "@/components/games/shared/safeExploration";

<SafeExplorationControls
  surfaceId="maze-maps"
  band={bandForGradeBand(gradeBand)}
  baseline={{ id: savedRoute.id, label: t("mazeMaps.savedRoute") }}
  reducedEffects={reducedEffects} // pass GameShell's value through
  onRun={async () => ({
    status: "ok",
    summary: describeRun(await runRoute(draftRoute)), // learner vocabulary
  })}
  onKeep={async () => {
    try {
      await saveRoute(draftRoute);
      return { status: "ok" };
    } catch (cause) {
      return { status: "unexpectedError", cause }; // a failure, not an outcome
    }
  }}
  onRestore={() => restoreRoute(savedRoute)}
  onExit={() => navigate(backToLessonHref)}
/>;
```

Rules for the adopting ticket:

1. **Own the artifact.** The game decides what "keep" writes; the controls
   cannot.
2. **Report outcomes honestly.** A disappointing experimental result is
   `{ status: "ok", summary }` — including "the bike spun out". Only
   infrastructure failures are errors. Never translate a failed save into `ok`.
3. **Localize what you pass in.** `baseline.label`, every `summary`, and every
   `reason` are host strings: pass `t(...)` values
   (`docs/agents/rules/20-i18n.md`). Everything the component itself says lives
   under `safeExploration.*` in `src/locales/{en,es,vi,zh-CN}/common.json`.
4. **Keep the route back.** Pass `onExit`; the controls never navigate.
5. **Attach the proof.** Rerun this component's suite for the states you use and
   add the bounded manual walkthrough #843's verification half asks for.

For a game that needs its own layout, `useSafeExplorationController(config)` is
the same state machine without any markup.

## 6. What this component never does

No eligibility, no progression queries, no score / mastery / XP / accuracy, no
randomness, no persistence, no schema, no backend calls, no navigation. A unit
test asserts `Math.random` is never called across a full loop and that the
controller exposes no score-shaped field.

Analytics are process-describing only — `experiment_previewed`,
`experiment_tried`, `experiment_kept`, `experiment_restored`,
`experiment_branched`, and `experiment_failed` (with `error_kind`) carry
`surface_id`, `band`, and an `attempt` count. `attempt` is a revision measure,
not a performance measure. A test pins the exact payload keys.

## 7. Accessibility proof map (contract §9)

| §9 asks for               | Where it is proved                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------- |
| idle story                | `K2Idle`, `OlderIdle`                                                                 |
| running story             | `K2Running`, `OlderRunning`                                                           |
| completed story           | `K2Observing`, `OlderObserving`, `K2Kept`, `OlderBranched`                            |
| restored story            | `K2Restored`, `OlderRestored`                                                         |
| unavailable story         | `K2Unavailable`, `OlderBlockedAction`                                                 |
| unexpected-error story    | `K2UnexpectedError`, `OlderUnexpectedError` (+ `K2RecoverableError` for the contrast) |
| keyboard order / focus    | `SEA-3` (five focus-matrix cases, jsdom) and the `K2KeyboardOnly` story               |
| accessible name and state | `SEA-1`, `SEA-6`; `data-state` / `data-error-kind` / `aria-disabled` / `aria-busy`    |
| reduced motion            | `SEA-5` (two-phase: transition present, then absent with all feedback intact)         |
| fixed-seed determinism    | n/a — this surface has no randomness; `SEC-4` asserts `Math.random` is never called   |
| §6 failure distinction    | `SEC-3`, `SEA-7`                                                                      |

The bounded manual walkthrough (keyboard-only, screen reader, reduced motion,
muted sound, zoom/reflow, touch) is #843's verification half and rides with the
first adopting game's PR, since this component ships with no consumer.

### Known tradeoff

In `observing`, `kept`, `branched`, and the error states, focus moves to the
status region while the live region announces the outcome. The contract asks
that an announcement not duplicate what a focus move already reads, so the
region's accessible name is a short heading ("What happened?") and the
announcement carries the substance. Real screen-reader behaviour here is exactly
what the manual walkthrough is for.
