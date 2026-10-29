# #720 — implementation request

Owner request, 2026-10-14: **"implement Ticket #720"**.

Interpretation: implement the deterministic shared TypeScript engine against the
current #720 / #704 decisions and in-repository design; tests, S-2 build-freshness
checks and local source/compiled review evidence are included. This is a local
implementation draft. Do not push, merge, close tickets, deploy, change accounts,
implement #721–#725, modify the existing learner prototype, or adopt #940's Rust
proposal. Unresolved design details are labelled as provisional rather than
silently represented as prior owner decisions.

Source baseline for the changed files: `fc1bf82ce44e13468af5b3eb0edba05a17acb59b`.
The review workspace is a file-verified partial snapshot, not a full repository
clone. Actual verification limits are recorded outside the product tree in the
review package. This record does not assign reviewers or approve publication.

## Full-checkout integration, 2026-10-18

Resume the owner-authorized #720 integration after remote connectivity recovery.
Apply only the delivered #720 patch to a fresh complete checkout, select its
documented engine contract, use the repository Node 20 toolchain, and run actual
application, Chromium and backend-container checks. Keep #721-#725, existing
worktrees, hosted deployment settings and real data unchanged. Require independent
review and deployment-trigger verification before publication or merge.

The full application check exposed that the shell-smoke sandbox omitted the new
predev verification dependencies. Copy those two scripts into both sandbox phases;
retain the guard, stale-output refusal and real healthy/sabotage browser proof.

## October 19 integration resume

Resume the engine-only integration after the disk-space interruption. Reconcile
with main after #944, preserve the selected engine contract, and run actual
application checks. Repair the missing .mts LF checkout rule exposed by the
Windows rebase, with a clean-checkout red/green proof. Do not restart unrelated
Docker services or publish, deploy, or merge without the remaining gates.

## October 28 relocation and release request

Owner requested relocating the integration workspace to the secondary drive and
releasing the verified version. Preserve all evidence and reconcile current main.
Add opt-in `BB_TEST_SERIAL=1` scheduling to run the same tests and browser projects
sequentially on memory-constrained machines. Default CI behavior and assertions
remain unchanged. Do not bypass push hooks, required checks, or independent review.
