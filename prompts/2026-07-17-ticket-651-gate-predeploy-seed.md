# Gate predeploy seed behind RUN_SEED (Issue #651)

**Author:** Jack
**Date:** 2026-07-17
**Sprint:** —
**Pod:** Build

## Intent

Stop production deploys from running `prisma/seed.cjs` on every container start (it refreshes demo-account password hashes). Gate the seed behind `RUN_SEED=true`, keep migrate/`DIRECT_URL` hard-fail untouched, prove both branches with a stubbed-PATH harness, and document the fresh-DB bootstrap path.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes — verify the
predeploy script and seed behavior, wrap the seed behind RUN_SEED=true with a
loud skip else, add a real-script harness with stubbed npx/node, extend the
deploy runbook, then self-QA and draft the PR.
```

## What Claude Code Did

- Files created/modified: `backend/scripts/predeploy.sh`, `scripts/__tests__/predeployGate.test.ts`, `DEPLOYMENT.md`, `docs/deploy.md`, `README.md`, `prompts/2026-07-17-ticket-651-gate-predeploy-seed.md`
- Tests passed: lint ✓, typecheck ✓, `test:unit` 494 passed ✓ (harness 12/12), `sh -n backend/scripts/predeploy.sh` ✓, `build` ✓

## What Worked

- Mirroring the existing `RUN_GAMIFICATION_BACKFILL` gate shape kept the shell change small and reviewable
- Stubbing `PATH` with logging `npx`/`node` binaries proved the deed (call log), not just the log line
- Keeping migrate / `DIRECT_URL` / generate / backfill byte-identical to `main`

## What Needed Editing

- Compressed the gate comment block after an oversized first draft
- Stripped unrelated Vitest/Storybook green-path hunks out of this PR so the review stays on deploy safety
- Aligned runbook verify steps to the exact skip/run log lines; fixed README that still claimed predeploy always seeds
- Prompt log and outsider-ready PR body written at closure

## Lessons

- Deploy-script PRs should not carry test-runner flake fixes — split those to a chore branch
- Prefer asserting process invocations over stdout when the script’s own echo is part of the bug class
- One prompt log at ticket close; keep Prompt vague and paths repo-relative only

## Rating

4/5 — AI carried the gate, harness, and docs; human judgment on residual-exposure wording, PR scope, and follow-up filing still required.
