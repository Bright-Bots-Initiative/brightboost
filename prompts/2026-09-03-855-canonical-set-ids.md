# #855 — one canonical STEM set-ID source for app and backend

**Author:** Nathaniel Walker (with Claude Code)
**Date:** 2026-09-03
**Sprint:** —
**Pod:** Build

## Intent

Kill the triple definition of "Set 3 complete". `src/constants/stemSets.ts` held
the real list; `backend/src/routes/avatar.ts` and `backend/src/routes/studentStats.ts`
each held a hand-typed `set3-game-1..5` copy in which two IDs
(`set3-game-1`, `set3-game-3`) matched no seeded activity at all — the real ones
are `track-maker` and `echo-avenue`. So `POST /avatar/select-archetype` guarded
on a condition no student could ever satisfy, and `specialtyProgress` undercounted
Set 3 forever. `studentStats.ts` also hand-copied the Set 1/2 lists, agreeing with
the frontend by luck.

## Prompt

```
Fix issue #855 against current main. Read `gh issue view 855` first, plus
docs/agents/rules/00-core.md and 10-testing.md.

PHASE A — INVENTORY + REPRODUCE BEFORE FIXING (mandated): build the mapping
table for all Set-1/2/3 games (Module | slug | activityId | gameKey | set |
seeded level) from stemSets.ts, prisma/seed.cjs, gameRegistry.ts; grep for
every literal so no stale copy survives. Then write discriminating tests FIRST
that prove the defect on current code, and show them failing (prefer red-green:
assert the CORRECT behavior, watch it fail, then fix). Classify data impact
explicitly.

PHASE B — FIX AT THE SOURCE via the EXISTING shared boundary: create a
canonical module under shared/, wire it so BOTH sides consume ONE source (pick
the least-broad wiring that survives backend `npm run build` and build:railway;
PROVE it), point avatar.ts and studentStats.ts at it and delete their
hardcoded lists. Tests: reproduction now green; a drift test; the OLD fake IDs
count for nothing; the specialization gate is satisfiable iff every canonical
Set-3 ID is completed (still unsatisfiable today because of placeholders — pin
THAT too, it's the designed behavior); don't write tests that merely mirror
constants. Grade-band logic: do not touch.

DELIVERABLE: mapping table; every duplicate-list site and its disposition;
failing-first evidence; data-impact classification; the wiring chosen and the
build proof; acceptance vs #855; test list + falsification (revert the
canonical import briefly → which tests fail → restore). Flag anything you
found that is a genuinely NEW defect (do not fix it).
```

## What Claude Code Did

- Files created: `shared/progression/stemSetIds.ts`,
  `backend/src/routes/__tests__/stemSetIdCanon.test.ts`,
  `backend/src/__tests__/stemSetIdsResolution.test.ts`,
  `src/constants/__tests__/stemSetIdsSeedParity.test.ts`.
- Files modified: `shared/tsconfig.json`, `src/constants/stemSets.ts`,
  `src/constants/__tests__/stemSets.test.ts`, `backend/src/routes/avatar.ts`,
  `backend/src/routes/studentStats.ts`, `docs/architecture/shared-code.md`.
- Tests passed: yes (targeted 166/166; full unit suite green apart from a
  pre-existing Windows-local failure in `scripts/__tests__/verify-exit-codes.test.ts`).
- Build clean: yes (frontend `tsc --noEmit`, backend `typecheck`,
  `build:railway`, `vite build`, eslint, format-check vs base).

## What Worked

- Red-green as instructed. The tests went in first against unmodified routes:
  5 of 9 failed, and the 4 that passed were the invariant pins rather than
  discriminators — which is exactly the shape you want, and it made the "still
  unsatisfiable by design" behavior legible instead of looking like a second bug.
- Naming the placeholders (`STEM_SET_3_PLACEHOLDER_IDS`) turned an accident into
  a stated contract. The old list was wrong _and_ unsatisfiable; the new one is
  unsatisfiable on purpose, and a test says so.
- The highest-value test was not the one asked for. A seed-parity check —
  every non-placeholder canonical ID must exist as a seeded `activityId` in
  **both** seed trees, and no placeholder may — is the guard that would have
  caught #855 the day it was typed. Falsifying it (adding `set3-game-1` back)
  fails four assertions across both trees.
- Choosing the wiring by _disproving_ the alternative: an `exports` +
  `typesVersions` pair would have made TypeScript and Node resolve by different
  mechanisms. Compiling a probe proved the no-`dist` specifier typechecks clean
  and then throws `MODULE_NOT_FOUND` from the emitted artifact — the #730 shape.
  That probe became a shipped test.

## What Needed Editing

- A first-pass assertion read `res.body.avatar.stage` after the route re-fetches
  through a mocked `findUnique`, so it asserted the mock rather than the gate.
  Replaced with an assertion on the `avatar.update` call.
- A doc claim ("the no-`dist` specifier typechecks") was written before it was
  verified, and the first probe _disproved_ it — because the local resolution
  shim only exposed `dist/`. Re-running against a faithful package layout
  confirmed the claim; the lesson is that the shim, not the claim, was wrong.
- Adversarial review (APPROVE-INTERNAL, zero blocking) still returned real
  findings: the two new backend files read `shared/dist` while a parallel worker
  rebuilds it, so both now build it idempotently in `beforeAll` behind loud
  precondition throws, and the route test imports the app dynamically so its
  transitive `dist` read is ordered after that build. A specifier check that
  asserted `toHaveLength(1)` across both routes would have passed if one route
  re-grew a hand copy — now asserted per file. And a docstring had the mechanism
  backwards: the `/dist/` specifier resolves the **emitted** `.js` in Vitest too,
  which is precisely why a stale `dist` splits the suite in half.
- Fixing that finding introduced a second error worth recording: the first
  attempt imported the canon into the two backend tests via `@shared/...`, which
  `backend/tsconfig.json` has no path for. Backend `tsc` failed with `TS2307`
  plus three implicit-`any` errors. It was also the wrong boundary — backend
  consumes the built artifact. Both tests now load the canon dynamically from
  the package specifier, after the build.
- Then a negative-control run (delete the `beforeAll` build, stale the artifact)
  disproved a claim in the fix itself: the resolution test compares the probe's
  output to its own imported canon, so both sides read the same built file and a
  stale `dist` passes there. It is the behavioural test that goes red. The
  docstrings now say which file owns which property instead of over-claiming.

## Lessons

- Three copies of a list is not the bug; **no copy being checked against the
  seed** is the bug. Fixing duplication without adding the artifact-parity test
  would have left the same failure mode available to the next list.
- Mandating a `node_modules` junction into another checkout silently repoints
  `file:` dependencies at that other checkout. Backend typecheck failed with
  `TS2307` until a worktree-local junction reproduced the real layout — worth
  knowing before reading such a failure as a code error.
- `backend/src/routes/*` emit to `backend/dist/src/routes/*`, so any proof about
  module resolution has to run at that depth. A test that imports the source
  cannot see the class of bug that matters here.

## Rating

4/5 — the inventory and red-green pass were fast and the wiring proof was
genuinely load-bearing; the shared-vs-guarded architecture call (see
`docs/architecture/shared-code.md`) still wants a human decision, and the
`shared/dist` freshness split is now under a live authorization gate.
