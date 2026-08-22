# Docs foundation — verify parity, hooks, and CI format:check (Issue #751)

**Author:** Jack
**Date:** 2026-08-10
**Sprint:** —
**Pod:** Build

## Intent

Ship stack PR 1/4: local–CI verification parity, contributor git hooks, and a diff-scoped `format:check` wired into `build-and-test` — without pulling in `#752`'s agents tree or `#753`'s consolidation. Written after the fact — PR #756 merged 2026-08-19 without a log.

## Prompt

```
Followed the ticket spec and drove the work in a few passes — parity runner and required-step
manifest, diff-scoped format check plus hooks, then fixture trees and front-door doc cleanup
before refreshing the stack base and PR prep.
```

## What Claude Code Did

- Files created/modified: `scripts/verify-parity.mjs` (CI-26/CI-28/CI-29), `scripts/__tests__/verify-parity.test.ts`, `scripts/format-check.sh`, `scripts/run-bash.mjs`, `scripts/agent-check.mjs`, `scripts/agent-check.allowlist.json`, `scripts/docs-check.mjs` (replacing `scripts/check-docs.mjs`), `scripts/ci-required-steps.json`, fixture trees under `scripts/__tests__/fixtures/agent-tree/**` and `scripts/__tests__/fixtures/agent-tree-spaced/**`, `.github/workflows/ci-cd.yml`, `.husky/pre-push`, `package.json`, `CONTRIBUTING.md`, `SECURITY.md`, `README.md`, `DEPLOYMENT.md`, `backend/README.md`, `frontend/CONTRIBUTING.md`; deleted `.github/workflows/deploy-stem1.yml` and the root / `backend/` / `src/lambda/` `pnpm-lock.yaml`
- Tests passed: full CI/CD pipeline green at `890cb0f` including required `build-and-test`, `db-check`, and `e2e-flows`; bundle-size and PR review bot green; both `agent-check` fixture trees (normal and spaced) and the `docs-check` fixture tree exercised
- Build clean: yes

## What Worked

- Scoping `format:check` to the diff. `scripts/format-check.sh` takes a merge base against `origin/main` and checks only added/modified files; whole-tree `prettier --check .` is red on a large pre-existing backlog and could never have been a gate. `format:check:all` stays available for anyone who wants the backlog view, and CI-26 now actually executes instead of reporting a gap.
- Keeping `scripts/verify-parity.mjs` from #742 as the one runner and deleting the duplicate rather than maintaining two. Pre-push is a single line: `npm run verify -- --skip-install --allow-skips`.
- Holding the reject-only pre-commit contract — `prettier --check` through lint-staged, no auto-write, no re-stage — so a hook never rewrites files underneath you mid-commit.
- A spaced-path fixture tree sitting next to the normal one, because a checkout path with a space in it is a real configuration (see #707) and plenty of tooling notices.

## What Needed Editing

- `--allow-skips` needed a sharper contract than it started with: a named environment-only skip is acknowledged, but a command that actually fails still fails. Without that line pre-push quietly becomes advisory.
- `agent:check` and `docs:check` went into local parity here as CI-28/CI-29, but their CI workflow steps stayed with #759 — so the manifest entry and the workflow step land in different PRs and the ordering matters.
- `scripts/agent-check.allowlist.json` was seeded here with four dated `trackedEnvFiles` exceptions pointing at #754, so AC-018 could ship green while the actual untracking waited on its own PR. That deliberately left a loose end for #755 to close.
- Removing `deploy-stem1.yml` may orphan the Azure SWA secrets; flagged as an operational follow-up rather than touched from this branch.

## Lessons

- A gate that is red the day it arrives is not a gate. Scope it to the diff or fix the backlog first — do not ship it disabled and call it wired.
- Refreshing the bottom of a stack means composing with current `main` without force-pushing the branches sitting on top of it.
- Ship an exception with an expiry and an owning issue in the same commit; an allowlist entry with no clock becomes permanent.

## Rating

4/5 — strong on the scripts, fixtures and front-door cleanup; the stack ordering and the deferral boundaries needed steering.
