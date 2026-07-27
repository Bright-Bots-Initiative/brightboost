# Honest CI Cypress gate (Issue #677)

**Author:** Jack
**Date:** 2026-07-15
**Sprint:** —
**Pod:** Build

## Intent

Make the per-PR Cypress check assert that the SPA shell actually mounts, stop staging smokes from silently passing when env is missing, and prove the gate goes red when the shell breaks — without rebuilding the full E2E suite (#671).

## Prompt

```
I followed the ticket spec and drove the work in Cursor in a few passes — verify
the CI environment assumptions, add requireEnv and the shell spec, harden staging
guards, wire npm scripts and the CI step, add the sabotage proof and wiring guard,
then close with docs and PR prep.

When things were stable I ran lint, typecheck, unit, coverage, Cypress shell,
and verify:ci-gate, then drafted the PR body with acceptance evidence and the
deliberate #671 handoff holes.
```

## What Claude Code Did

- Files created/modified: `cypress/e2e/ci-shell.cy.ts`, `cypress/e2e/staging/smoke.cy.ts`, `cypress/support/requireEnv.ts`, colocated unit/wiring tests, `scripts/verify-ci-shell-gate.sh`, `package.json` scripts, `vitest.config.ts`, `vitest.workspace.ts`, `.github/workflows/ci-cd.yml`, `docs/ci.md`, `docs/staging-smoke.md`, coverage flake test timeouts
- Tests passed: lint ✓, typecheck ✓, `test:unit` 499 passed ✓, `test:coverage:ci-guard` thresholds ✓, `test:e2e:ci` 3/3 ×2 ✓, `verify:ci-gate` PASS ✓, `build` ✓
- Build clean: yes

## What Worked

- Splitting per-PR shell vs staging env assertions
- Wiring-guard unit tests on `package.json` + workflow text so the gate cannot be pointed back at a skipping spec unnoticed
- Sabotage script with unconditional restore for acceptance evidence

## What Needed Editing

- Windows / Git Bash portability for the sabotage script (busy-port refuse, OWNED_PORT sweep)
- Coverage timeouts and spaced-path reports under local Windows clones
- Storybook Vitest project skip when the repo path contains spaces

## Lessons

- A green Cypress check with silent skips is worse than no check once the job becomes required
- `npm run typecheck` does not cover `cypress/` today — that fossilization hole belongs to #671
- Prefer named npm scripts as the CI contract so unit tests can assert wiring without a YAML parser

## Rating

★★★★★ — high leverage for a small CI blast radius; clear acceptance via verify:ci-gate
