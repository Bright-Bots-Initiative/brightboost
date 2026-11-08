> Canonical for: the #721 controlled builder interface and integration decisions.
> Last verified against code: 2026-11-06. Repository-integrated review candidate; catalogue release and independent approval remain separate.

# The Great Work — build surface

`src/components/games/greatWork/GreatWorkBuilder.tsx` exports the controlled
`GreatWorkBuilder` and its props. #724 supplies the program/target and owns Studio.
#722 owns saving and verification; #725 owns gallery access. This component imports
no API, owns no Creation state, and submits no academic result or XP.

## Contract

Pass the normalized `band`, `bandConfig`, engine `MachineSpec` as `program`,
`target` or null, `onProgramChange`, and `onRunResult`. Optional `allowList`,
`readOnly`, `headerSlot`, and `onPlaybackStateChange` keep the handoff boundary.
`levelOptions` adds the engine's bounds, walls, fixed parts and tick budget so a
lesson can supply geometry without the editor inventing a second level format.

The engine is imported as `@shared/greatwork-engine`. `MachineProgram` is only a
local alias for #720's actual `MachineSpec`; it introduces no alternate payload.
The previous engine root-dataset sentinel is removed from main; the UI is not
registered in the application catalogue by this ticket.

## Interaction

A tray part can be dragged or selected and placed with a tap or keyboard cursor.
Placement, moving and turning are checked by the engine validator. The preview
uses the engine's entire footprint. Invalid drops leave the machine unchanged.
Select a placed part for Move, Turn, Remove, or Undo; reach/grabber count never
change on a placed arm. R1 offers only the one-grabber/reach-one arm variant.

Instruction choices can be tapped into slots. Filled slots use dnd-kit's real
KeyboardSensor with `sortableKeyboardCoordinates`; named Earlier/Later/Remove
controls give an equivalent non-drag path. Cross-arm dragging never moves an
instruction into a different lane. Running locks edits. A paused edit resets
simulation before it publishes a new controlled program.

The playback controller calls the real engine on a speed-scaled timer; rAF only
paints. Step calls exactly one engine step. Reset restores tick zero without
clearing the design. Visibility/blur/help pause, and a resumed tab waits for Run.
The area painter takes `state.areaClaimed` directly. It does not infer a new set
from the picture. Mirror comparison draws the actual target and actual output.

## Explicit decisions, not inherited approvals

- The issue's `activities/` path is superseded by its handoff's
  `components/games/greatWork/` path.
- The first handoff fixes K–2 to three slots and GRAB/ROTATE_CW/DROP, while its
  supplement calls RESET/REPEAT essential. The implementation keeps the exact
  beginner contract and offers all seven instructions in the expanded context.
  It never pretends the three-chip starter loops: it produces one block, then
  stops. The expanded looping example explicitly contains RESET and REPEAT.
- These are builder contexts, not permission to release a grades 3–5 module.
  Unknown band defaults to K–2; changing context never truncates an existing tape.
- `null` capacity remains serializable in expanded config. The editor has a
  technical 256-chip-per-arm safety limit; this is not a learning-stage unlock.
- GameShell's star/score finish view is not mounted. Builder feedback is creation
  feedback. The integration component persists no machine; only the existing reduced-effects
  hook may store its display preference. The Storybook review stories are session-only and have no fabricated Save or Share control.
- New locale resources are separate `greatWork.json` files merged into the same
  existing `translation.games.greatWork` namespace. Other locale data is retained.
  EN/ES are authored, Spanish is a draft; VI/ZH are explicit English fallbacks,
  not claimed translations. The new strings are not duplicated into common.json.
- Inter is requested via the CSS stack but no font is bundled/downloaded here.
  Local system fallback is expected until approved app typography supplies it.
- All #720 draft rules are inherited unchanged, including its RESET, footprint,
  sweep and reaction decisions. Downstream implementation does not approve them.

## Verification

Run the feature tests with `npm run test:unit -- src/components/games/greatWork`
and the browser stories with `npx vitest run --project storybook src/components/games/greatWork`.
The feature includes model, hook, drawing and real-KeyboardSensor checks. The
canonical application gate remains `npm run verify`; environment-dependent skips
must be disclosed, not counted as acceptance. Required hosted CI, independent
review and child-facing usability review remain separate from local evidence.

## Repository integration

Integrated against the #720 merge `c4bc846` without copying the old preview engine,
standalone server, synthetic profiles, or storage adapters. The current asynchronous
application bootstrap and existing locale resources are preserved. The obsolete
root-dataset sentinel alone is removed; the backend compatibility export is retained.

Small boards initially show a closer view of the starter machine. A manual zoom or
pan takes precedence over responsive defaults; Fit restores the whole board.
The builder language attribute follows EN/ES; uncurated VI/ZH strings are explicitly
English fallback, not approved translations.

Repository tests exercise the real engine model, timer lifetimes and exact drawing
trace restoration. Browser stories include keyboard construction, real keyboard
reordering, paused-plan repair, async band changes, three-product looping delivery,
mirror comparison, collisions and Spanish controls. These supplement rather than
replace a child-facing usability review and a qualified Spanish review.

Drag role descriptions and live announcements use the same locale resources as
the visible controls. Release feedback says a piece was released, not that an
invalid drop succeeded. A real-browser Spanish keyboard-reordering story covers
the spoken role and announcements, including stable naming after reordering.
