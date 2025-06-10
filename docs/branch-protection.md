# Branch Protection Configuration

## Required Status Checks

The main branch should be protected with the following required status checks:

### GitHub Actions Jobs
- `build-and-test` - Ensures code builds, lints, and tests pass
- `db-check` - Verifies database connectivity and migrations
- `review` - Automated PR review bot checks

### Manual Configuration Steps

To enable branch protection rules for the main branch:

1. Go to Repository Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select the following required status checks:
   - `build-and-test`
   - `db-check` 
   - `review`
5. Enable "Require branches to be up to date before merging"
6. Enable "Restrict pushes that create files larger than 100 MB"

### Optional: Automated Setup via GitHub API

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build-and-test","db-check","review"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

## Analytics Hooks

Consider adding the following analytics integrations:

- **Deployment tracking**: Monitor successful deployments to Azure
- **Test coverage**: Track test coverage trends over time  
- **Performance monitoring**: Monitor API response times and error rates
- **Security scanning**: Automated dependency vulnerability scanning

## Notes

- Preview builds (pull requests) skip API deployment by design
- Database connectivity tests use isolated test database in CI
- Cypress smoke tests verify end-to-end API functionality
