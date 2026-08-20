> **Canonical for:** deployment pipeline inventory. Last verified against code: 2026-08-10.

# BrightBoost deployment pipeline

This document inventories CI/CD workflows for BrightBoost. **Production deploy** is Railway + Supabase — see [`DEPLOYMENT.md`](../../DEPLOYMENT.md).

## Overview

GitHub Actions automate build, test, and verification. Railway deploys from `main` (see `DEPLOYMENT.md`).

## GitHub Actions workflows

Typical workflows in `.github/workflows/`:

1. **ci-cd.yml**: Lint, typecheck, unit tests, drift, agent/docs checks, SPA shell Cypress gate.
2. **prod-smoke.yml**: Smoke tests against production (legacy Azure SWA path may still appear).
3. **bundle-size-check.yml**: Bundle size.
4. **teacher-dashboard-ci.yml**: Teacher dashboard CI.
5. **deploy-stem1.yml**: Marked legacy — removal is a separate follow-up, not part of docs consolidation.

Job semantics: [`docs/ops/ci.md`](ci.md). Local–CI parity: [`docs/agents/rules/60-verification.md`](../agents/rules/60-verification.md).

## Environment variables and secrets

### GitHub Secrets (repository settings)

- `DATABASE_URL` — when a workflow needs DB access
- `SESSION_SECRET` — session/JWT secret for environments that require it

### Build / app variables

- `VITE_API_BASE` — API base for the frontend build (local/dev often `/api`)

Production Railway variables: see `DEPLOYMENT.md`.

## Deployment process

- **Automatic:** Railway deploys on push to `main` (`DEPLOYMENT.md`).
- **Manual:** Use the Railway dashboard for the target service.

Do not treat Replit (or other retired hosts) as the production path.
