# Storybook Vitest project skip on spaced checkout paths (Issue #707)

**Author:** Jack
**Date:** 2026-08-11
**Sprint:** —
**Pod:** Build

## Intent

Stop the Storybook Vitest project from poisoning a local run when the checkout path contains a space, without letting an empty Storybook project stand in for a real one. Written after the fact — PR #748 merged 2026-08-11 without a log; reconstructed from the PR and `docs/repro/707-spaced-path.md`.

## Prompt

```
Followed the ticket spec and drove the work in a few passes — reproduce the spaced-path
failure, path-conditional skip in the workspace config, then falsify both branches and
write up RED/GREEN before PR prep.
```

## What Claude Code Did

- Files created/modified: `vitest.workspace.ts`, `docs/repro/707-spaced-path.md` (net diff vs `main` is these two)
- Tests passed: full run on a spaced checkout — `Test Files 110 passed | 7 skipped (117)`, `Tests 707 passed | 20 skipped (727)`, exit 0, no `|storybook|` in the output; `npm run lint` 0; `npm run typecheck` 0
- Build clean: not the gate for this change; no `src/` or Prisma changes

## What Worked

- Omitting the project outright and printing a named reason (`[vitest.workspace] Skipping Storybook project (#707): checkout path contains a space … Reason: path-conditional project skip.`) rather than registering it and hoping someone notices it collected nothing
- `BB_VITEST_PATH_HAS_SPACE` as a verification-only override — `=0` force-include, `=1` force-skip — so both branches stay falsifiable. Not a product variable, not set in CI, kept out of the env tables
- Keeping RED-before / GREEN-after in `docs/repro/707-spaced-path.md` instead of only in the PR thread; the force-include run still reproduces storybookjs/storybook#29572, so the skip is provably load-bearing

## What Needed Editing

- The empty-suite guard I first put on this branch came back off. It leaned on `passWithNoTests: false` set on the Storybook project, and Vitest reads that off the **root** config and evaluates it against the **aggregate** spec list — a sibling project with tests means the branch is never entered. Verified on 3.1.3 and 3.2.4: deleting the option and setting it to `true` both give the identical exit code. It passed with its own subject deleted, so it was withdrawn rather than left reading as coverage. Real enforcement moved to #749.
- Space-free include-branch evidence was waived for this pass; CI stays the space-free runner.
- Prettier was checked on touched files only — the whole-repo run was still red on a pre-existing backlog at the time (#751 later scoped `format:check` to the diff).

## Lessons

- A skip you can see beats a project that collects nothing and exits 0
- Falsify a guard by deleting the thing it guards; if it still passes, it is decoration, and withdrawing it is not the same as weakening a check to get green
- #707 does not fully close on this PR — the empty-suite half is tracked on #749

## Rating

4/5 — fast on the skip and the repro write-up; the `passWithNoTests` dead end needed a human to notice the guard was passing for the wrong reason.
