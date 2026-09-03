# Safe Exploration — Accessibility Contract (canonical)

> **Canonical for:** the Safe Exploration accessibility contract (#843, definition half). Last verified against code: 2026-09-02.

This is the accessibility contract every Safe Exploration surface implements and is verified against: the shared experiment controls (#838), My Lab / My Creations (#841), guided choice in Modules (#842), and the creation-shaped finish (#693). It is the **definition half** of #843 — each surface attaches its own automated proof and bounded manual walkthrough when it ships; this document does not claim any surface is verified.

The product bar it serves is principle 9 of `docs/design-principles.md`: every experiment gives the learner a meaningful choice, a visible consequence, and a safe way back — and that has to be true for a learner who navigates by keyboard or switch, uses a screen reader, reduces motion, mutes sound, zooms the interface, or needs predictable K–2 interaction.

---

## 1. The state matrix

Every exploratory surface expresses its life cycle in these states. A surface may not need all of them; it may not invent hidden ones. Names are the **programmatic** vocabulary (accessible names, test ids, announcements are derived from them) — child-facing labels are localized copy owned by each surface within principle 9's banded expressions.

| State                                                    | Focus on entry                                                                            | Focus on exit / return                                                       | Announcement (one, concise, localized)                                                             | Non-visual equivalent of the meaningful result                                      | Error recovery                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **baseline / idle**                                      | wherever the learner already was — entering idle never steals focus                       | n/a                                                                          | none (idle is silent)                                                                              | the baseline is named in ordinary page structure ("Your saved track", "Before")     | n/a                                                                             |
| **preview**                                              | the preview's primary action                                                              | back to the invoking control on cancel                                       | what will run / what will be replaced                                                              | text summary of the previewed change                                                | cancel always available, returns cleanly                                        |
| **running / trying**                                     | stays on (now-busy) invoking control; never jumps into an animation or decorative element | n/a                                                                          | "running/trying" once — not per frame                                                              | progress conveyed by text/state, never only by motion or sound                      | a stuck run exposes a visible, focusable way out                                |
| **observing / compare**                                  | the result summary heading or region                                                      | n/a                                                                          | the meaningful outcome, once                                                                       | a concise textual/semantic summary — comparisons never rely only on visual overlays | n/a                                                                             |
| **keep**                                                 | confirmation of what was kept, then a logical next action                                 | n/a                                                                          | what was preserved                                                                                 | the kept artifact is named in page structure                                        | a failed save is announced as a **failure** (see §6)                            |
| **restore / go back**                                    | a logical next action after restoring                                                     | n/a                                                                          | **what was restored** — never a bare "done"                                                        | the restored baseline is named                                                      | a failed restore is announced as a failure and the baseline's true state stated |
| **branch** (older bands)                                 | the new branch's context                                                                  | the origin remains reachable                                                 | that a new version was created, original untouched                                                 | version relationship stated in text ("version 2 of …")                              | as keep                                                                         |
| **revisit / remix** (where offered)                      | the opened artifact's title/context                                                       | back to the portfolio/gallery entry point                                    | whether this **edits the original, creates a new version, or opens read-only** — before any change | same, in page structure                                                             | as keep                                                                         |
| **surprise destination** (where offered, #842's surface) | the destination disclosure (name + learning objective), **before navigation**             | "choose another" / cancel returns to the invoking control without navigation | destination name + objective, deterministically                                                    | the disclosure is ordinary page structure, not a transient toast                    | declining or an empty pick never strands the learner                            |
| **unavailable**                                          | not focus-stealing; the control is either absent or present-with-reason                   | n/a                                                                          | none unprompted; reason available on the control itself                                            | the reason is text, not just a dimmed look                                          | n/a                                                                             |
| **recoverable error**                                    | the error message region                                                                  | a retry/away action                                                          | what failed and what the learner can do                                                            | text, with the distinction of §6                                                    | retry and leave both reachable                                                  |
| **unexpected error**                                     | as recoverable                                                                            | as recoverable                                                               | a system problem occurred — **not** a learner outcome                                              | text                                                                                | leave/report path always reachable                                              |

## 2. Keyboard and switch

- Every essential action is operable with keyboard alone (and therefore switch-compatible scanning): no gesture-only, drag-only, hover-only, or long-press-only action.
- Focus order follows the visual/logical hierarchy of the state; one **primary** action per state comes first among the actions.
- Preview/disclosure/confirm flows are escapable (`Esc` or an explicit cancel) and never trap focus.
- Where a game's core play is pointer-driven, the _exploration controls around it_ (try, keep, restore, compare, navigation) still satisfy this contract.

## 3. Screen reader semantics

- Action labels identify **purpose**, not appearance: "Keep this track", not "Green button".
- One live-region announcement per meaningful state change; decorative changes are not narrated; announcements never duplicate what a focus move already reads.
- Announcements are localized strings under the same keys discipline as all copy (rule 20-i18n); en + es minimum.
- Surprise announcements name the **selected destination and objective** — never "something new!" ambiguity.

## 4. Reduced motion, sound, and color

- `prefers-reduced-motion` removes nonessential transition effects while **preserving the cause-and-effect feedback** (the consequence must still be perceivable — swap animation for a static state change plus its announcement).
- No required information is conveyed **only** by animation, motion, position, sound, or color. Sound stays supplementary unless an equivalent visual cue exists.
- Action priority (primary vs secondary vs optional) is expressed by size/weight/order/labeling — never by color alone.

## 5. Randomness and determinism

- Any random choice a surface makes is **seeded and injectable** (principle 9): for a fixed seed and settings, the chosen content — and therefore every accessible name and announcement derived from it — is deterministic. Accessibility tests pin a seed; no nondeterministic assertions.
- Timed or moving gameplay offers a non-timing-dependent alternative whenever timing is not the stated learning objective.

## 6. Learner outcomes vs system failures

- An expected experimental result ("the bike spun out") is learning data and is announced in the learner's vocabulary.
- An infrastructure failure (save failed, engine call failed) is announced **as a failure**, visually and semantically distinct, and never masquerades as a valid learner outcome (principle 9's platform rule). The failed thing's true state is stated ("your track from before is safe").

## 7. Navigation and the ordered path

- A visible, focusable route back to the canonical ordered learning path exists from every exploration surface; **Continue** (or the surface's equivalent primary progression action) remains present and understandable as the main route.
- No essential navigation, objective, or destination is discoverable only through motion, hover, gesture, sound, or an easter egg.
- Teacher assignments and required objectives stay visible in ordinary page structure on every exploration surface that could lead away from them.

## 8. K–2 specifics

- Tap targets keep the existing K–2 bar (≥ the 44px floor the platform already applies; the D-pad precedent is 56px).
- Copy uses the banded expressions of principle 9: concrete verbs, one variable at a time, one obvious way back; no technical words (checkpoint, mutation, rollback, branch) in child-facing strings.
- The required K–2 interaction stays usable at narrow mobile widths (the ~240px available-width floor established by #793) and at 200% text zoom with reflow — wide content scrolls inside its own container, the page never scrolls horizontally.

## 9. What automated proof asserts (per surface, at implementation time)

Each surface's PR attaches, for the states it uses: stories for idle / running / completed / restored / unavailable / unexpected-error; keyboard-order and focus-return assertions; accessible-name and state assertions; reduced-motion behavior; a fixed-seed determinism assertion where randomness exists; and the §6 failure-distinction case. The bounded manual walkthrough (keyboard-only, screen reader, reduced motion, muted sound, zoom/reflow, touch) is #843's verification half and rides with each surface's PR — it is **not** claimed by this document.

---

**Status:** definition half of #843. The verification halves land per surface (#838, #841, #842, #693) and any game-specific defects found there are filed separately with reproduction evidence.
