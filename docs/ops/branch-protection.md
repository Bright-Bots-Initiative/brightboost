> **Canonical for:** GitHub branch protection. Last verified against code: 2026-08-10.

# Branch protection

Branch protection cannot be configured from code. Apply rules in the GitHub UI (or API) for `main`.

## Required status checks

Align required checks with jobs that are currently green and meaningful in `.github/workflows/ci-cd.yml` (and related workflows). Typical names historically used:

- `build-and-test` — lint, typecheck, unit tests, SPA shell Cypress gate
- `db-check` — migrate + DB tests (expected red until `#646` — do not treat as a silent omission)
- `review` / Bundle Size Check — only if those checks still exist and are required by the team

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
  --field required_status_checks='{"strict":true,"contexts":["build-and-test","db-check","review"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

Adjust `contexts` to match live check names before running.

## Verify

1. Open a fresh PR to `main`.
2. Confirm merge stays blocked until review + required checks pass.
3. Confirm a non-admin cannot push directly to `main`.

## Related

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — developer workflow that depends on this protection
- [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) — jobs that produce status checks
- [`docs/ops/ci.md`](ci.md) — what each CI job proves
- Local–CI parity table: [`docs/agents/rules/60-verification.md`](../agents/rules/60-verification.md) (do not fork)
