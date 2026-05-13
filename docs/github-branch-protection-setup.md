# GitHub Branch Protection Setup (Manual)

Branch protection can't be configured from code. Apply this once in the GitHub UI before summer interns start.

## Steps

Go to GitHub → **Settings** → **Branches** → **Add rule** for `main`:

- [ ] Branch name pattern: `main`
- [ ] Require a pull request before merging: **ON**
- [ ] Require approvals: **1**
- [ ] Dismiss stale pull request approvals when new commits are pushed: **ON**
- [ ] Require status checks to pass before merging: **ON**
  - Select: `build-and-test`, `db-check`, `Bundle Size Check` (whatever is currently green and meaningful)
- [ ] Require branches to be up to date before merging: **ON**
- [ ] Require conversation resolution before merging: **ON**
- [ ] Include administrators: **OFF** (keeps emergency bypass for the maintainer)
- [ ] Allow force pushes: **OFF**
- [ ] Allow deletions: **OFF**

Save the rule.

## Verify

After saving:
1. Open a fresh PR from any branch to `main`.
2. Confirm the merge button is greyed out until a review and the required status checks both pass.
3. Try pushing directly to `main` from a non-admin account — should be rejected.

## Related docs

- `CONTRIBUTING.md` — the developer-facing workflow that depends on this protection
- `.github/workflows/ci-cd.yml` — the workflow that produces the required status checks
