# Local–CI parity, hooks, and guard wiring (Issue #740)

**Author:** Jack
**Date:** 2026-07-31
**Sprint:** —
**Pod:** Build

## Intent

Ship infrastructure so local and CI verification mean the same thing: a parity runner, commit hooks, and wired two-phase guards for CI shell gate, required-step presence, and type-program membership — without changing classroom-facing product behavior.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes: parity script and selfcheck, husky hooks, CI guard wiring, unit tests that execute gates, then QA falsification and PR prep.
```

## What Claude Code Did

- Files created/modified: `scripts/verify-parity.mjs`, `scripts/verify-parity-selfcheck.mjs`, `scripts/verify-ci-step-presence.sh`, `scripts/verify-type-program-membership.mjs`, `scripts/ci-required-steps.json`, `scripts/type-guard-manifest.json`, `scripts/__tests__/*`, `.github/workflows/ci-cd.yml`, `.husky/*`, `package.json` / `package-lock.json` (verify scripts + husky)
- Tests passed: `npm run test:unit` green after `npx prisma generate` (593 passed / 20 skipped)
- Build clean: `npm run build` yes; `npm run lint` / `npm run typecheck` yes

## What Worked

- Extending the existing two-phase shell-gate pattern for new verifiers instead of inventing a parallel convention
- Replacing source-text CI wiring assertions with process execution and exit codes
- Keeping full `npm run verify` honesty: named local gaps rather than weakening steps

## What Needed Editing

- Vitest worker timeouts when spawning long shell-gate runs (async spawn / suite timeout)
- Remapped Cypress base URL vs gate’s hardcoded Vite port when proving the shell gate locally
- Git Bash vs broken WSL `bash` for npm scripts that invoke bare `bash`

## Lessons

- A correct guard that no workflow invokes is still a false green until wired and falsified
- Clean `npm ci` without `prisma generate` can fail backend unit suites that import `@prisma/client` — document, don’t paper over in the parity table

## Rating

4/5 — strong for scaffolding scripts and tests; human still needed for environment gotchas (ports, bash, Prisma generate) and for deciding what stays out of scope (#707 Storybook, E2E seed).
