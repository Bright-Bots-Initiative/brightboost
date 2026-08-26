> **Canonical for:** GitHub branch protection. Last verified against code: 2026-08-25.

# Branch protection

Branch protection cannot be configured from code. Apply rules in the GitHub UI (or API) for `main`.

## Verified state (admin readback)

Read-only admin readback of `GET /repos/Bright-Bots-Initiative/brightboost/branches/main/protection`
and `GET /repos/Bright-Bots-Initiative/brightboost/rulesets`, taken **2026-08-25T23:40:10Z** against
`main` at **`7c19d20bab3b5f350bf17ef17a22661251df14a7`** (#775). These are live board values, not intent:

| Setting                                                         | Value                                        |
| --------------------------------------------------------------- | -------------------------------------------- |
| `required_status_checks.contexts[]`                             | `build-and-test`, `db-check`, `e2e-flows`    |
| `required_status_checks.strict` (up to date before merging)     | `false`                                      |
| `required_pull_request_reviews.required_approving_review_count` | `1`                                          |
| `required_pull_request_reviews.dismiss_stale_reviews`           | `true`                                       |
| `required_conversation_resolution.enabled`                      | `false`                                      |
| `enforce_admins.enabled`                                        | `false`                                      |
| `required_linear_history.enabled`                               | `true`                                       |
| `allow_force_pushes.enabled` / `allow_deletions.enabled`        | `false` / `false`                            |
| `restrictions.teams[]`                                          | `Team leads`                                 |
| `GET /rulesets`                                                 | `[]` — classic branch protection, no ruleset |

`review` (PR Review Bot) is **not** in `contexts[]`. That closes the "contested" question in
[`docs/ops/ci.md`](ci.md): `review` reports, it does not gate.

Two settings differ from the intent in [Manual setup](#manual-setup-github-ui) below: `strict` and
`required_conversation_resolution` are both `false` on the board while the checklist asks for **ON**.
The board is the fact. Turning either on is a policy change for the owner to make deliberately —
flagged here, and deliberately **not** applied by this read-only readback.

## Required status checks

The required set, verified above, is `build-and-test`, `db-check`, and `e2e-flows`. What each name is:

- `build-and-test` — lint, typecheck, unit tests, SPA shell Cypress gate
- `db-check` — migrate + DB tests (green since #646 landed; a red here is a real failure)
- `e2e-flows` — seeded real-flow Cypress run; Essential per the #774 owner call, 2026-08-14
- `review` — PR Review Bot job. Claimed here historically as required; the readback refutes it. The
  job is gate-capable but is **not** in the required set. See [`docs/ops/ci.md`](ci.md).
- `check-bundle-size` / `build-only` — report only; `docs/ops/ci.md` records these as not required

Confirm the exact check names on a recent green PR before changing the rule.

## Manual setup (GitHub UI)

This checklist is the **intended** configuration. Where it differs from
[Verified state](#verified-state-admin-readback), the board is the fact.

Go to GitHub → **Settings** → **Branches** → **Add rule** for `main`:

- [ ] Branch name pattern: `main`
- [ ] Require a pull request before merging: **ON**
- [ ] Require approvals: **1**
- [ ] Dismiss stale pull request approvals when new commits are pushed: **ON**
- [ ] Require status checks to pass before merging: **ON** (select the checks above)
- [ ] Require branches to be up to date before merging: **ON** — board is currently `strict: false`
- [ ] Require conversation resolution before merging: **ON** — board is currently `false`
- [ ] Include administrators: **OFF** (keeps emergency bypass for a maintainer) — matches the board
- [ ] Allow force pushes: **OFF** — matches the board
- [ ] Allow deletions: **OFF** — matches the board

Save the rule.

## Optional: GitHub API template (do not run verbatim)

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":false,"contexts":["build-and-test","db-check","e2e-flows"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"dismiss_stale_reviews":true,"required_approving_review_count":1}' \
  --field restrictions=null
```

**Do not run this snippet verbatim.** Its status-check and review fields match the
[Verified state](#verified-state-admin-readback), including the deliberate omission of `review`,
but it is not a complete representation of the live board. **A PUT replaces the whole set**:
`restrictions=null` would drop the `Team leads` push restriction, and omitted settings may also
change. Start from a fresh admin readback and preserve every live setting and restriction before
using PUT. See [`docs/ops/ci.md`](ci.md) for the policy table.

**Who can read this endpoint.** `GET /branches/main/protection` needs a token with admin
(`Administration: read`) access; the readback above used one and got `200`. This document previously
asserted the endpoint returns `404` for non-admin tokens — that claim is **unverified**. It was not
retested here, and the one adjacent case that was checked disagrees with it: an **unauthenticated**
request returns `401 Requires authentication`, not `404`. Treat the requirement as "needs admin", not
as a specific error code, until someone confirms the non-admin response with a non-admin token.

## Verify

1. Open a fresh PR to `main`.
2. Confirm merge stays blocked until review + required checks pass.
3. Confirm a non-admin cannot push directly to `main`.

## Related

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — developer workflow that depends on this protection
- [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) — jobs that produce status checks
- [`docs/ops/ci.md`](ci.md) — what each CI job proves
- Local–CI parity table: [`docs/agents/rules/60-verification.md`](../agents/rules/60-verification.md) (do not fork)
