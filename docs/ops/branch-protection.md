> **Canonical for:** GitHub branch protection. Last verified against code: 2026-08-20.

# Branch protection

Branch protection cannot be configured from code. Apply rules in the GitHub UI (or API) for `main`.

## Required status checks

Align required checks with jobs that are currently green and meaningful in `.github/workflows/ci-cd.yml` (and related workflows). Typical names historically used:

- `build-and-test` — lint, typecheck, unit tests, SPA shell Cypress gate
- `db-check` — migrate + DB tests (green since #646 landed; a red here is a real failure)
- `e2e-flows` — seeded real-flow Cypress run; Essential per the #774 owner call, 2026-08-14
- `review` — PR Review Bot job. Claimed here historically; **undecided**, not confirmed. See the
  open question in [`docs/ops/ci.md`](ci.md).
- `check-bundle-size` / `build-only` — report only; `docs/ops/ci.md` records these as not required

Confirm the exact check names on a recent green PR before locking the rule.

## Manual setup (GitHub UI)

Go to GitHub → **Settings** → **Branches** → **Add rule** for `main`:

- [ ] Branch name pattern: `main`
- [ ] Require a pull request before merging: **ON**
- [ ] Require approvals: **1**
- [ ] Dismiss stale pull request approvals when new commits are pushed: **ON**
- [ ] Require status checks to pass before merging: **ON** (select the checks above)
- [ ] Require branches to be up to date before merging: **ON**
- [ ] Require conversation resolution before merging: **ON**
- [ ] Include administrators: **OFF** (keeps emergency bypass for a maintainer)
- [ ] Allow force pushes: **OFF**
- [ ] Allow deletions: **OFF**

Save the rule.

## Optional: GitHub API

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build-and-test","db-check","e2e-flows"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

This snippet is a template, not a readback, and it deliberately omits `review` because that name is
undecided, not refuted. `GET /branches/main/protection` returns 404 for non-admin tokens, so the live
set cannot be confirmed from here. See [`docs/ops/ci.md`](ci.md) for the policy table and the `review`
open question. **A PUT replaces the whole set**, so an admin must read the current contexts before
running this or it silently drops whatever it omits.

> **Unreconciled:** the checklist above says _Include administrators: OFF_ while this snippet passes
> `enforce_admins=true`. The two configure opposite policies and nobody without admin can tell which
> one matches the board. Do not run this snippet until that is settled.

## Verify

1. Open a fresh PR to `main`.
2. Confirm merge stays blocked until review + required checks pass.
3. Confirm a non-admin cannot push directly to `main`.

## Related

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — developer workflow that depends on this protection
- [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) — jobs that produce status checks
- [`docs/ops/ci.md`](ci.md) — what each CI job proves
- Local–CI parity table: [`docs/agents/rules/60-verification.md`](../agents/rules/60-verification.md) (do not fork)
