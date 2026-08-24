# Branch status handoff (2026-08-14; refreshed 2026-08-23)

> This file began as the branch snapshot taken at handoff close on 2026-08-14. It was refreshed on 2026-08-23 to record the outcomes and leave only actionable follow-ups. Linked issues, pull requests, and canonical docs remain the source of truth after that date.

## Resolved handoff stack

- **#750 merged on 2026-08-17.** The real seeded Cypress stack landed, and the owner decision in #774 made `e2e-flows` an every-PR required check.
- **#760 merged on 2026-08-18.** The Storybook empty-suite guard landed. Its dependent split, #776, is unblocked.
- **#743 merged on 2026-08-18.** S-2 is the accepted shared-engine build layout, and Railway verification passed. The built-artifact freshness guard and spike-scaffold decision remain #720 scope.
- **#762 merged on 2026-08-20.** The required-check policy and executable guard registry now live in `docs/ops/ci.md` and `docs/ops/guards.md`.
- **#777 merged on 2026-08-23.** The Set 2 experience/localization audit now distinguishes shipped UI key wiring from the remaining briefing and locale work.

The original #750 → #760 → #762 stack is fully merged. Its force-push and retarget sequence is no longer an active dependency.

## Remaining closeout pull request

At this refresh, the only open pull requests are #770 and this documentation PR (#779).

- **#770** is updated with current `main`, changes only `src/locales/zh-CN/common.json`, contains all 222 Simplified Chinese Set 2 keys, preserves every interpolation token, has approval, and has green required CI including `e2e-flows`. It remains open for the final localization acceptance/merge decision.
- **#779** is this corrected handoff. After it merges, #770 is the only remaining open pull request from the closeout set.

## Open work that still needs an owner

- **#720 — deterministic simulation engine.** Implement Release 1 from the in-repo design and handoff. Under S-2, CI must prove `shared/dist` is fresh; the `dataset.greatWorkEngine` DCE-defeat scaffold also needs an explicit keep-or-remove decision.
- **#709 — CI suite map.** This remains administrative and unassigned. The policy is documented, but the command-level suite inventory is still open.
- **#775 — branch-protection readback.** The policy landed with #762. An admin still needs to verify the full protection settings and reconcile the `enforce_admins` contradiction in `docs/ops/branch-protection.md`.
- **#776 — Storybook tier/split.** This is unblocked and unassigned. If Storybook moves out of `npm test`, move CI-27, its parity test, `scripts/ci-required-steps.json`, the workflow step, and the `docs/ops/guards.md` runner entry together.
- **#739 — release-integrity umbrella.** Its unassigned follow-ups include #764, #765, #767, #782, and #783.

## Current maintenance traps

- **Required status contexts:** the `main` branch summary reported `build-and-test`, `db-check`, and `e2e-flows` on 2026-08-23. That summary does not expose strict-update, PR-approval, conversation-resolution, or administrator-enforcement settings; #775 owns the admin readback.
- **`shared/dist` freshness under S-2:** a stale artifact can compile and run while producing different browser/Node behavior. #720 must make freshness executable.
- **Storybook split coordination:** #776 and #720 can both touch `vitest.workspace.ts`; branch from current `main` and re-derive CI-27 placement rather than copying the old order.
- **Guard completeness:** #782 records that `scripts/ci-required-steps.json` covers neither `e2e-flows` nor `build-only`; #783 records the registry's one-way AC-018 check.
- **Database target guard:** keep `scripts/lib/db-target.mjs` single-sourced for seed and parity safety. Do not introduce a second database-name regex.
- **Stacked branches:** if future work is stacked, do not force-push a base without coordinating and revalidating every dependent head.
