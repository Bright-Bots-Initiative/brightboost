# Delete orphaned scripts/check-todos.sh (Issue #766)

**Author:** Claude Code (Opus 5.5, night bot)
**Date:** 2026-11-23
**Sprint:** —
**Pod:** Build

## Intent

Close #766: `scripts/check-todos.sh` sat in the guard registry with Runner "None today". The issue asked for one of two outcomes: an executable guard with a sabotage proof, or no script. This change deletes it.

## Prompt

```
Build issue #766 (wire or delete orphaned scripts/check-todos.sh) from the approved plan:
delete the script, drop its docs/ops/guards.md row with a dated removal note, keep the
W-16 inventory whole, and log the evidence for deleting rather than wiring.
```

## What Claude Code Did

- Files created/modified: `scripts/check-todos.sh` (deleted), `docs/ops/guards.md` (row removed, dated note added under the #720 note), this log
- Tests passed: `npm run docs:check`, `npm run agent:check` and `npx prettier --check` on the changed files were clean. The W-16 loop over `scripts/verify-*.{sh,mjs}` + `scripts/check-*.sh` printed no `MISSING`. Lint, both typechecks, Prisma drift, `test:unit` and `build` ran too, with results in the PR body
- Build clean: yes

## What Worked

- Checking history before deciding. The script came in with #37 (`451337b5`) as a `continue-on-error` step in `pr-review-bot.yml`. That step, and the comment section that read `todos_status` / `todos_output`, were removed in `ce859a98` and `c68314a9` (both 2025-05-31). The orphaning was a deliberate removal, not an accident.
- Running the script before keeping it. `GITHUB_OUTPUT=$(mktemp) bash scripts/check-todos.sh 2ba6ae40^ 2ba6ae40` covers a commit that adds two `// TODO: translate Great Work…` lines under `src/components/games/greatWork/`. It printed `sed: -e expression #2, char 15: unknown option to 's'` once per changed file, wrote `todos_status=success` and exited 0. The `sed -e "s/^/[NEW] $file: /"` expression breaks on any path containing `/`, so only files at the repository root were ever detected. Line 39 was `exit 0` in every branch, so even a detected TODO never failed a step.
- The registry's old Proof (`bash scripts/check-todos.sh` with no SHAs → exit 1) only exercised the argument check. It never showed the property in the Protects column, which is why it looked like a guard.

## What Needed Editing

- The plan's example removal note names `scripts/check-todos.sh`, while its acceptance grep expected `check-todos` hits only under `prompts/`. Those two cannot both hold. The note keeps the path so a reader of `docs/ops/guards.md` can see which row went and why. The one remaining hit outside `prompts/` is that note, not a dead reference.

## Lessons

- A guard's Proof column has to exercise the property it protects. An argument-validation exit code is a proxy.
- Wiring the script would have meant a rewrite, a `.github/workflows/` step, a two-phase sabotage proof and a new decision that TODOs block merges. None of those is a restoration of anything, so they belong in their own ticket if anyone wants them.

## Rating

4/5. The history and the reproduction did the deciding, and the edit itself was small.
