# Data Dash drift guard + creations visibility consolidation (Issue #679)

**Author:** Jack
**Date:** 2026-07-28
**Sprint:** —
**Pod:** Build

## Intent

Ship the two deferred #663 cleanup items: a CI-failing guard when frontend/backend Data Dash literals drift, and a single visibility definition for creations gallery reads — without changing authorization behavior or card values.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes — foundation
and pool inventory, drift guard with fixture coverage, visibility helper
consolidation after #696 landed, compliance/self-QA, then PR prep including
build gate and prompt log.
```

## What Claude Code Did

- Files created/modified: `src/test/dataDashPoolSync.ts`, `src/test/dataDashPoolSync.test.ts`, `backend/src/services/dataDashChallenge.ts`, `backend/src/routes/creations.ts`, `backend/src/routes/__tests__/creationsVisibility.test.ts`, `vitest.config.ts`, `prompts/2026-07-28-ticket-679-creations-drift-guard.md`
- Tests passed: lint ✓, root + backend typecheck ✓, `test:unit` 553 passed ✓, `build` ✓
- Existing invariance: `backend/src/routes/creations.test.ts` and `backend/src/services/dataDashChallenge.test.ts` green with unmodified assertions

## What Worked

- Root-level sync test importing both sides via Vitest (backend build boundary stays intact)
- Truth-table + V-8 tests for the consolidated visibility rule
- Literal RED/restore proof for the highest-risk list `where` merge

## What Needed Editing

- Compliance cleanup after an early Part D close (re-open checklist rows, revert out-of-scope script drift, capture break/restore evidence properly)
- PR opened once before full create-pr.md sequence; body and prompt log completed afterward

## Lessons

- Do not call `gh pr create` until `pr-description.md`, prompt log, and `npm run build` are done — see `docs/workflow/create-pr.md` §5 ordered checklist
- For isolated clones (`brightboost-{id}/`), prompt logs still live under that clone's `prompts/`

## Rating

4/5 — AI carried the guard, refactor, and test matrix; human review still required on E-5 merge and drift-message quality.
