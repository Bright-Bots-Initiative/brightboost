# CI jobs and Cypress gates

What each GitHub Actions job in `.github/workflows/ci-cd.yml` proves, how to run the honest Cypress shell gate locally, and the env rules for staging smokes. See issue #677.

## What each job proves

| Job | What it proves | What it does **not** do |
|---|---|---|
| **build-only** | `npm run build` succeeds | No lint, typecheck, unit tests, or Cypress |
| **build-and-test** | Lint, typecheck, unit tests, Prisma drift check, then Vite boots and the **SPA shell mounts** via `npm run test:e2e:ci` (`cypress/e2e/ci-shell.cy.ts`); also produces a production build artifact | No Postgres service and no backend process. Does not hit staging or `/api` |
| **db-check** | Prisma migrate + `npm run test:db` against its own Postgres service | Untouched by #677; separate from the shell gate |

`build-and-test` starts `npm run dev` (Vite on `:5173`), waits with `wait-on`, then runs the shell spec. Workflow env already sets `CYPRESS_BASE_URL: http://localhost:5173`.

## Honesty rule (Cypress)

- **Missing required config** → throw (via `requireEnv`). The run goes **red**, never green.
- **Deliberately disabled optional feature** → `this.skip()` (reports as skipped / pending).
- **Never** a silent pass (`return cy.wrap({}).log(...)`).

## Environment variables (staging + per-PR)

Must match issue #677 / ticket overview §8. No new env vars are introduced; the per-PR shell gate needs none beyond the workflow `CYPRESS_BASE_URL` already set.

| Name | Scope | Example | Where to get it | Required by |
|---|---|---|---|---|
| `CYPRESS_BASE_URL` | `build-and-test` job (workflow-level `env:`) | `http://localhost:5173` | **already set** — do not remove; it is what makes the shell spec work | `ci-shell.cy.ts` (implicitly, as `baseUrl`) |
| `CYPRESS_SWA_URL` | staging runs only | `https://brightboost-staging.up.railway.app` | deployed staging URL | `staging/smoke.cy.ts` |
| `VITE_API_BASE` | staging runs only | `https://brightboost-staging.up.railway.app` | same host as SWA in the Railway single-service setup | `staging/smoke.cy.ts` |
| `CYPRESS_ALLOW_DEV_HEADERS` | staging, optional | `1` | only where dev headers are permitted; never production | optional checkpoint test |
| `CYPRESS_STUDENT_ID` / `CYPRESS_LESSON_ID` | staging, optional | `smoke-student` | optional overrides, already mapped in `cypress.config.ts` | optional checkpoint test |

Run staging with `npm run test:e2e:staging` (`cypress/e2e/staging/*.cy.ts`). Also see `docs/staging-smoke.md`.

**Workflow note:** `.github/workflows/cypress-staging.yml` still targets fossil `cypress/e2e/pilot-smoke.cy.ts` (label/`workflow_dispatch`). That job was **not** re-pointed in #677 — the honest staging smoke is the npm script path. Pointing Actions at `test:e2e:staging` is a follow-up.

## Prove the gate has teeth — `verify:ci-gate`

```bash
npm run verify:ci-gate
```

This script (see `scripts/verify-ci-shell-gate.sh`) runs a **two-phase causal proof** — healthy-green → sabotaged-red:

1. **Phase 1 — healthy baseline:** boots the untouched app, runs `npm run test:e2e:ci`, and **requires exit 0**. If the healthy run is red (missing Cypress binary, broken config, already-broken shell), the script FAILs here — an unrelated failure can never masquerade as a successful sabotage.
2. **Phase 2 — sabotage:** backs up `src/main.tsx` outside the repo, injects a throw, boots again, runs the same gate, and **requires a non-zero exit**.
3. **PASS is printed only when phase 1 was green AND phase 2 was red** — i.e. the gate changed from green to red *because* the shell broke.
4. Restores `src/main.tsx` and terminates **only the process tree the script spawned** via `trap … EXIT` (normal, error, and signal exits). It never sweeps or kills other PIDs on `:5173`: a busy port fails the preflight, and if a foreign listener wins the startup race the script errors out and leaves it alone.

It is **not** wired into per-PR CI (would double job time and intentionally breaks the tree). Run it manually and paste the PASS block (both exit codes) into PR evidence.

Require a free `:5173` before running (the script refuses to steal a foreign Vite). Prefer Git Bash on Windows (`C:\Program Files\Git\bin\bash.exe`).

## Scripts cheat sheet

| Script | Purpose |
|---|---|
| `npm run test:e2e:ci` | Per-PR shell spec only |
| `npm run test:e2e:staging` | Staging smokes (need env) |
| `npm run test:coverage:ci-guard` | Coverage on scoped helpers (`cypress/support/**`, quiz includes) |
| `npm run verify:ci-gate` | Sabotage proof |
| `npm run test:e2e` | All Cypress specs — still red from fossil specs; owned by #671 |

## Deliberate holes left for #671

Bare `test:e2e`, the **9** previous-generation fossil specs, `supportFile: false`, and wiring `tsc -p cypress/tsconfig.json` into CI are intentional handoffs — not omissions. See issue #671 and the #677 PR description §17.

**Inventory:** `cypress/e2e/k2InstantQuiz.cy.js` is a **#623 keeper**, not one of those fossils — do not bulk-delete it when removing the old suite.
