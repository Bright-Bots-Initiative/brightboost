# Biome Buddy experiment experience

Date: 2026-09-14

## User prompt

> Analyze the repo Bright Boost. Keeping the core of the concept how would you optimize the experience: https://brightboost.org/biome-buddy/review

Follow-up:

> Implement

## Agreed implementation scope

Implement the first release from the experience review: accurate trait-change
feedback, exact historical test snapshots, uninterrupted part selection, undo,
before/after comparison, and a repeatable Water experiment. Preserve the core
creative-learning concept and the standalone prototype's isolation contract.

## Work and validation

The implementation uses the existing React/SVG components and pure stat model.
It adds validated recipe snapshots and bounded local undo, optional science cards,
and English/Spanish experiment copy. The canonical design update is in
`docs/games/biome-buddy-design.md` §15.

Before implementation, the existing model/storage suite passed (91 tests).
Two new user-flow regressions failed on the original implementation: automatic
selection modal/misleading delta and current-home rendering of a historical test.
Both now pass. Verification outcomes and environment gaps are recorded in the PR.
