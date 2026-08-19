npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
> **Canonical for:** CI jobs and parity. Last verified against code: 2026-08-18.

# CI jobs and Cypress gates

What each GitHub Actions job in `.github/workflows/ci-cd.yml` proves, how the three Cypress-related signals relate, and the env rules for seeded E2E and staging smokes. See issues #677 and #671.

**Local–CI parity:** see [`docs/agents/rules/60-verification.md`](../agents/rules/60-verification.md). The executable source of truth is `scripts/verify-parity.mjs`; do not maintain another command table here.

## What each job proves

| Job                | What it proves                                                                                                                                                                                  | What it does **not** do                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **build-only**     | `npm run build` succeeds                                                                                                                                                                        | No lint, typecheck, unit tests, or Cypress                                              |
| **build-and-test** | Lint, diff-scoped format, FE/BE typecheck, Prisma drift, wiring/type guards, agent/docs checks, unit + Storybook tests, shell gate/smoke, Waterworks mobile test, and production build artifact | No Postgres service and no backend process for the shell smoke. Does not hit `/api`     |
| **db-check**       | Prisma migrate + `npm run test:db` against its own Postgres service (`brightboost_test`)                                                                                                        | Does not run Cypress                                                                    |
| **e2e-flows**      | Seeded real flow: Postgres + migrate + `e2e:seed` + backend + frontend, then `npm run test:e2e:ci:flows` (login → student completion → teacher dashboard)                                       | Not the full Cypress suite; does not replace the shell smoke or the shell sabotage gate |

Per #774, `e2e-flows` is required on every pull request. Changes to the required-check set
follow the governance policy tracked in #775.

`build-and-test` starts `npm run dev` (Vite; port from product `vite.config.ts` / OQ-12), waits with `wait-on "$CYPRESS_SWA_URL"`, then runs the shell spec. Workflow env sets `CYPRESS_SWA_URL` (not `CYPRESS_BASE_URL`).

### Which signal to read when something is red

| Red check                                | Meaning                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run test:e2e:ci` / shell smoke step | Frontend shell failed to mount (no backend required)                                          |
| `verify:ci-gate`                         | Two-phase sabotage proof failed (healthy shell did not pass, or sabotaged shell did not fail) |
| `e2e-flows`                              | Seeded stack or real product flow failed (auth, persistence, or teacher-visible evidence)     |

## `e2e-flows` (ticket #671)

Bounded job (`timeout-minutes: 15`) that:

1. Provisions Postgres with database name **`brightboost_test`** (must match the #742 test-token name rule)
2. Sets **`TEST_DATABASE_URL`**, **`DATABASE_URL`**, and **`DIRECT_URL`** to the same designated URL
3. Runs **two** Prisma generates (no npm workspaces — root and `backend/` each have their own `@prisma/client`): `cd backend && npm run db:generate` after backend `npm ci`, then root `npx prisma generate` before migrate
4. Runs `prisma migrate deploy` and `npm run e2e:seed` (`shell: bash` so `seed | tee` has `pipefail` and a failed seed fails the step)
5. Starts backend (`nohup … start:dev` → `backend.log`) and frontend (`nohup … dev` → `frontend.log`)
6. Waits on `$CYPRESS_SWA_URL` and `$BACKEND_ORIGIN/health` (health route, not port-only)
7. Runs `npm run test:e2e:ci:flows` — `auth-login.cy.ts`, `activity-complete.cy.ts`, `dashboard-progress.cy.ts`

That subset covers login → student completion → teacher-visible progress. `dashboard-progress` is self-contained (reseeds + API setup); it does not depend on `activity-complete` having run earlier in the same session. The job promotes `CYPRESS_LESSON_ID` / `CYPRESS_STUDENT_ID` from seed stdout into the job env so `activity-complete` can read them at spec start. On failure, artifacts include Cypress screenshots/videos plus `backend.log` / `frontend.log`.

**Shell-gate note (XF-01):** `cypress.config.ts` requires `CYPRESS_SWA_URL` (A4-03). `scripts/verify-ci-shell-gate.sh` therefore defaults it to the Vite port the gate itself spawns, and `ciWiring` sets the same for the unit proof. This is intentional coupling, not a silent Cypress baseUrl fallback.

It **complements** `test:e2e:ci` and `verify:ci-gate`; it does not replace either.

### Test database requirement (#742)

Parity DB steps and local reproduction of migrate/seed against the CI contract require a **designated test database**:

- Set **`TEST_DATABASE_URL`** (parity) and keep **`DATABASE_URL` / `DIRECT_URL`** consistent with it for Prisma/seed.
- The database **name** must match `/(^|[_-])(test|tests|e2e)([_-]|$)/i` (e.g. `brightboost_test`). Names like `postgres` or `brightboost` are refused — that refusal is intentional, not a seed bug.

Local example:

```bash
# succeeds
TEST_DATABASE_URL=postgresql://…/brightboost_test DATABASE_URL=… DIRECT_URL=… npm run e2e:seed

# refused (non-zero, no writes) — wrong name
DATABASE_URL=postgresql://…/brightboost npm run e2e:seed
```

## Honesty rule (Cypress)

- **Missing required config** → throw (via `requireEnv`). The run goes **red**, never green.
- **Deliberately disabled optional feature** → `this.skip()` (reports as skipped / pending).
- **Never** a silent pass (`return cy.wrap({}).log(...)`).

## Environment variables (staging + per-PR)

| Name                                                | Scope                              | Example                                            | Required by                              |
| --------------------------------------------------- | ---------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| `CYPRESS_SWA_URL`                                   | per-PR shell, `e2e-flows`, staging | `http://localhost:5173` (CI) / remapped FE locally | `cypress.config.ts` — no silent fallback |
| `VITE_API_BASE`                                     | `e2e-flows`, staging               | `http://localhost:3000/api` (CI) / remapped BE     | form login + API calls                   |
| `TEST_DATABASE_URL` / `DATABASE_URL` / `DIRECT_URL` | `e2e-flows`, local seed/parity     | `…/brightboost_test`                               | migrate, seed, #742 DB designation       |
| `E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD`        | `e2e-flows`, local seeded specs    | `teacher@e2e.invalid` + gitignored password        | seed + auth specs                        |
| `CYPRESS_ALLOW_DEV_HEADERS`                         | staging, optional                  | `1`                                                | optional checkpoint test                 |
| `CYPRESS_STUDENT_ID` / `CYPRESS_LESSON_ID`          | staging, optional                  | seeded ids                                         | optional checkpoint test                 |

Run staging with `npm run test:e2e:staging` (`cypress/e2e/staging/*.cy.ts`). Also see `docs/staging-smoke.md`.

**Workflow note:** `.github/workflows/cypress-staging.yml` still targets fossil `cypress/e2e/legacy/pilot-smoke.cy.ts` (label/`workflow_dispatch`). That job was **not** re-pointed in #677 — the honest staging smoke is the npm script path. Pointing Actions at `test:e2e:staging` is a follow-up.

## Prove the shell gate has teeth — `verify:ci-gate`

```bash
npm run verify:ci-gate
```

This script (see `scripts/verify-ci-shell-gate.sh`) runs a **two-phase causal proof** — healthy-green → sabotaged-red:

1. **Phase 1 — healthy baseline:** boots the untouched app, runs `npm run test:e2e:ci`, and **requires exit 0**. If the healthy run is red (missing Cypress binary, broken config, already-broken shell), the script FAILs here — an unrelated failure can never masquerade as a successful sabotage.
2. **Phase 2 — sabotage:** backs up `src/main.tsx` outside the repo, injects a throw, boots again, runs the same gate, and **requires a non-zero exit**.
3. **PASS is printed only when phase 1 was green AND phase 2 was red** — i.e. the gate changed from green to red _because_ the shell broke.
4. Restores `src/main.tsx` and terminates **only the process tree the script spawned** via `trap … EXIT`.

It **is** wired into per-PR CI as the `Verify CI shell gate` step in `build-and-test` (after unit tests, while `:5173` is still free). Require a free `:5173` before running locally (the script refuses to steal a foreign Vite). Prefer Git Bash on Windows.

## Storybook empty-suite guard — `verify:storybook-empty-suite` (#749 / #707)

```bash
npm run verify:storybook-empty-suite
# also: npm run verify -- --only CI-27
```

**What it asserts:** Vitest’s collected Storybook test count (`numTotalTests` from the JSON reporter) — **not** “the suite exited 0”. An empty suite and a full suite can both exit 0; only the count distinguishes them.

**Two modes:**

| Mode               | When                                                                                                                                        | Pass means                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **count**          | Storybook project is registered (typical CI / space-free path)                                                                              | Healthy collected count > 0, then a sabotage that empties the `stories` glob must be detected (exit 1). Unparseable output / no-op sabotage → exit **2** |
| **announced-skip** | Spaced checkout path (local) — W-05 / `#748` omits the Storybook project and prints `[vitest.workspace] Skipping Storybook project (#707)…` | Skip warning **and** project unregistered. That is deliberate, not silent collapse                                                                       |

**Deliberately skipped vs silently collected nothing:** announced-skip requires the `#707` warning prefix **and** an unregistered project. A registered project that collected zero tests is a **failure** (exit 1), not a skip. W-05’s path-conditional skip is the announced case; this guard fails closed on the silent case.

**W-13:** under `CI` or `GITHUB_ACTIONS`, any presence of `BB_VITEST_PATH_HAS_SPACE` (including `=0` or `=1`) is refused with exit 1. The local override remains valid when those CI markers are unset.

**Wiring:** parity step **CI-27** (`required: true`, `skipIf: () => null` — unlike CI-09, it still runs on a spaced path), `build-and-test` step after `Run tests`, and `scripts/ci-required-steps.json`.

**Declared gap (§15.3.3):** on a spaced path the guard runs in announced-skip mode, so the **count assertion never executes locally**. CI (space-free) is the only place the primary assertion runs — which is why W-13 exists.

## Legacy fossils (quarantined)

Previous-generation specs live under `cypress/e2e/legacy/` and are **excluded** from the default `specPattern` (`cypress/e2e/*.cy.{ts,js}`). Run them explicitly with:

```bash
npm run test:e2e:legacy
```

They are not part of `test:e2e:ci`, `test:e2e:ci:flows`, or any required CI job. Do not “fix” fossils in #671 — quarantine only.

**Inventory:** `cypress/e2e/legacy/k2InstantQuiz.cy.js` is a **#623 keeper** among the quarantined tree — do not bulk-delete it when touching the old suite.

## Scripts cheat sheet

| Script                                 | Purpose                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `npm run test:e2e:ci`                  | Per-PR shell smoke only (`smoke.cy.ts`)                                    |
| `npm run test:e2e:ci:flows`            | Bounded real-flow subset used by the `e2e-flows` job                       |
| `npm run test:e2e:legacy`              | Quarantined fossils under `cypress/e2e/legacy/`                            |
| `npm run test:e2e:staging`             | Staging smokes (need env)                                                  |
| `npm run test:e2e`                     | Default `specPattern` suite (rebuilt specs; not fossils)                   |
| `npm run verify:ci-gate`               | Shell sabotage proof (also run in `build-and-test`)                        |
| `npm run verify:storybook-empty-suite` | Storybook collected-count / announced-skip guard (#749)                    |
| `npm run e2e:seed`                     | Deterministic E2E fixtures (requires non-prod / test-named `DATABASE_URL`) |
