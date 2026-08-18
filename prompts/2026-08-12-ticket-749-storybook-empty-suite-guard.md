# Storybook empty-suite guard (Issue #749 / closes #707)

**Author:** Jack
**Date:** 2026-08-12
**Sprint:** —
**Pod:** Build

## Intent

Ship a count-based Storybook empty-suite guard so an empty Vitest Storybook project cannot report green, wire it into parity and CI, and keep #738 (guard registry) as a separate follow-up PR.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes: branch base onto #750 after #748, guard modes and two-phase sabotage, parity/CI/manifest wiring, unit tests, then QA falsification and PR prep.
```

## What Claude Code Did

- Files created/modified: `scripts/verify-storybook-empty-suite.mjs`, `scripts/__tests__/verify-storybook-empty-suite.test.ts`, `scripts/verify-parity.mjs` (CI-27), `scripts/__tests__/verify-parity.test.ts` (EXPECTED_STEP_IDS), `scripts/ci-required-steps.json`, `.github/workflows/ci-cd.yml`, `package.json`, `docs/ci.md`, this prompt log
- Tests passed: unit specs for the guard (15) and verify-parity (34); `npm run verify:storybook-empty-suite` announced-skip exit 0; `npm run verify -- --only CI-27` PASS; CI workflow_dispatch run proved `healthy=15 sabotaged=0 → PASS`
- Build clean: not the focus of this ticket; guard and unit targets green

## What Worked

- Extending the existing two-phase verify-ci-shell-gate / verify-pr-review-check pattern instead of inventing a parallel convention
- Pinning announced-skip to warning prefix **and** unregistered project; pinning count to JSON `numTotalTests`
- Keeping W-13 as a hard CI refusal of the local-only path override

## What Needed Editing

- `EXPECTED_STEP_IDS` had to gain `CI-27` or `Run tests` skipped later parity steps on CI
- Local spaced path cannot exercise healthy count > 0; CI workflow_dispatch used because stacked PR base is not `main`
- Shebang omitted on the `.mjs` guard so Vitest can dynamic-import it in unit tests

## Lessons

- A correct guard that no workflow invokes is still a false green (W-14 / W-15)
- Exit 1 vs exit 2 must stay distinct or “could not check” collapses into “property false”
- Sabotage must change the collected count; equal counts are exit 2, not a pass

## Rating

4/5 — strong for implementing the guard, wiring, and falsification scripts; human judgment still needed for stacking on #750 and for leaving #738 as PR 2.
