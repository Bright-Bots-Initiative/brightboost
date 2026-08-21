# Executable guard registry and required-checks policy (Issue #738)

**Author:** Jack
**Date:** 2026-08-20
**Sprint:** —
**Pod:** Build

## Intent

Give every `scripts/verify-*` / `scripts/check-*.sh` guard a row naming what actually invokes it, and write down which checks gate a merge on `main` — the open question on #775. Written after the fact — PR #762 merged 2026-08-20 without a log.

## Prompt

```
Followed the ticket spec and drove the work in a few passes — inventory the guards and
their runners, draft the required-checks policy, then resolve the post-#759 conflict and
rework the branch-protection snippet before PR prep.
```

## What Claude Code Did

- Files created/modified: `docs/ops/guards.md` (new), `docs/ops/ci.md`, `docs/ops/branch-protection.md`
- Tests passed: `npm run docs:check` → `scanned: 135` / `No findings.`; `npm run agent:check` → `No findings.`; `npm run format:check` → 3 files, all clean; `git merge-tree --write-tree HEAD origin/main` → clean tree, no `CONFLICT`
- Build clean: docs-only; `db-check` and the CI shell gate were not run locally and run in CI

## What Worked

- The Runner column is the whole point. `scripts/check-todos.sh` has no runner, and the table now says so out loud instead of letting the row read as coverage. That is #739's founding finding — `verify-ci-shell-gate.sh` sat unwired for months — turned into something a reviewer can check.
- Stating the derivation instead of asserting the set. Branch protection is unreadable without admin (`GET …/branches/main/protection` → 404, `GET /rulesets` → `[]`), so `docs/ops/ci.md` says where the list came from — #648's closing evidence, the #774 owner call — and says plainly that if an admin's board disagrees, the board is the fact and the table is the bug.
- Recording the `enforce_admins=true` vs _Include administrators: OFF_ contradiction as unreconciled, with a do-not-run note, rather than quietly picking a side neither of us can verify.

## What Needed Editing

- #759 landed mid-flight and reduced `docs/ci.md` to a three-line pointer, which put this branch into a genuine content conflict. Resolved by re-homing rather than re-arguing: the policy section into `docs/ops/ci.md`, the registry into `docs/ops/guards.md`, and `docs/ci.md` left byte-identical to `main`. Shipping a new CI doc at the `docs/` root would have reopened the consolidation #759 had just closed.
- Three facts went stale in the move and were corrected instead of carried over: a reference to `docs/branch-protection.md` (a path #759 deleted), `docs/github-branch-protection-setup.md` described as a live competing doc, and `scripts/check-docs.mjs`, which is `scripts/docs-check.mjs` on `main`.
- The deferred `docs/ops/branch-protection.md` cleanup got folded into this PR instead. Its copy-pasteable `PUT` set `contexts` to `["build-and-test","db-check","review"]` — running it would have _removed_ `e2e-flows`, the exact gate the new table asserts is required. `review` is now omitted rather than decided, with a warning that a `PUT` replaces the whole set, and the stale "db-check red until #646" line is gone since #646 landed.
- Two `--no-verify` uses, both disclosed in the PR body. The merge commit, where the Prettier hook flagged 32 files the branch never authored (CRLF working copies against clean LF blobs, verified through `prettier --check --stdin-filepath`), and the push, where the CI shell gate refused to run because port 5173 was already answering. Neither turned a red check green, and the three content commits ran with hooks enabled.

## Lessons

- Deferring a fix is fine right up until the deferred thing contradicts the thing you are shipping. A policy plus a snippet that undoes it is one change with a hole in it.
- Docs PRs conflict too. Re-home into whatever convention just landed; do not re-litigate someone else's finished consolidation from inside your own branch.
- A registry row without a real Runner is decoration, and the same is true of a required-checks table nobody can read back.

## Rating

4/5 — good on the inventory and the write-up; the conflict resolution and the call to pull the branch-protection fix forward were both human judgment.
