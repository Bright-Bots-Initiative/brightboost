# Branch status handoff (2026-08-14)

> **Superseded status (as of 2026-08-18).** The Branches table below is a dated snapshot and is now stale.
> Since it was written: **#750 merged** (`fdded13`), **#760 merged** (`94e9a99`), **#743 merged** (`866e8f0`).
> **#762 is still open**; its base has since been retargeted from the merged `jack/chore-749-…` branch to `main`.
> The table is left unedited on purpose — it records what was true on 2026-08-14, not current state.

One-page snapshot after executing `handoff-execute-decisions.md` (workspace-local; not tracked in this repo). Reflects reality at handoff close — not intent.

## Branches

| Branch                                       | PR                                                                     | Status                                                                                       | Owner                  | Next action                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `jack/test-671-cypress-rebuild`              | [#750](https://github.com/Bright-Bots-Initiative/brightboost/pull/750) | Open · head `fe213e1b` · Alice + Nathan re-requested · `e2e-flows` Essential/required (#774) | Jack / Build reviewers | Await re-review; Nathan sets required check before merge; **do not force-push**                          |
| `jack/chore-749-storybook-empty-suite-guard` | [#760](https://github.com/Bright-Bots-Initiative/brightboost/pull/760) | Open · base = #750 tip                                                                       | Jack                   | After #750 merges: confirm base → `main`, re-run all required checks (incl. `e2e-flows`), request review |
| `jack/docs-738-guard-registry`               | [#762](https://github.com/Bright-Bots-Initiative/brightboost/pull/762) | Open · base = #760 tip                                                                       | Jack                   | After #760 merges: same retarget + checks + review                                                       |
| `jack/spike-730-shared-engine`               | [#743](https://github.com/Bright-Bots-Initiative/brightboost/pull/743) | Open · §9.1 **S-2 accepted**; freshness guard → **#720**                                     | Nathan (Railway)       | Railway backend build verification; then merge                                                           |

Related (not in table): **#776** open, **blocked by #760** (must not land first). **#775** open until policy lands in `docs/ci.md` with the #709 map commit. **#709** administrative — Nathan decides close-or-not.

## Merge order (and why)

1. **#750** first — introduces `e2e-flows` and is the stack base.
2. **#760** after #750 — both touch `ci-cd.yml` / `package.json` / `docs/ci.md`; base is the #750 tip until retarget.
3. **#762** after #760 — registry needs a row for the Storybook empty-suite guard.
4. **#776** only after #760 — #760’s `CI-27` sits after `npm test` because Storybook is inside that run; splitting Storybook first invalidates that placement.
5. **#743** independent of the Cypress stack, but gates `shared/` on `main` and the After-#743 half of #764.

## Maintenance traps

- **Stacked force-push:** rewriting #750 moves #760/#762 bases — warn both before any rewrite.
- **`e2e-flows` is required** once the board setting lands — a red `e2e-flows` blocks every merge.
- **`shared/dist` freshness under S-2** is silent wrong-numbers; guard is **#720 scope**, not a new lane.
- **`dataset.greatWorkEngine`** on `#root` is spike DCE-defeat — #720 must decide keep-vs-remove.
- **`vitest.workspace.ts` three-way contention** (#748 + #760 + #720’s third project) — branch from a tree with both, or re-derive the skip.
- **`db-target.mjs` must stay single-sourced** — seed and parity share one regex (no second copy).
