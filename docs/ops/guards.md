> **Canonical for:** executable guard registry. Last verified against code: 2026-08-29.

# Executable guards

Registry of scripts that prove a property (and what actually runs them).

**Why the Runner column exists:** a correct guard that no workflow or npm script
invokes is a false green — that was the founding #739 finding (`verify-ci-shell-gate.sh`
sat unwired for months). A row without a real Runner is decoration.

| Guard                                        | Protects                                                                                                               | Runner                                                                                                                            | Proof                                                                                                                                                                                                             | Owning issue                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `scripts/verify-ci-shell-gate.sh`            | Cypress shell smoke turns red when the SPA shell is broken (healthy pass, then sabotage fail)                          | `npm run verify:ci-gate`; parity **CI-23**; `ci-cd.yml` `build-and-test` / Verify CI shell gate                                   | Occupy `:5173` then `npm run verify:ci-gate` → non-zero (`ERROR: http://localhost:5173 is already responding`). On a free port, the same command’s built-in two-phase must print healthy green then sabotage red. | #677 / #740                     |
| `scripts/verify-pr-review-check.sh`          | PR Review Bot capture helper records explicit status, exit code, and diagnostics for both green and red child commands | `.github/workflows/pr-review-bot.yml` step **Verify result capture** (`bash scripts/verify-pr-review-check.sh`) — not `ci-cd.yml` | `bash scripts/verify-pr-review-check.sh` → exit 0; stdout must show green capture `exit=0 status=success` and red capture `exit=7 status=failure` with diagnostics                                                | PR review bot / #740 workstream |
| `scripts/verify-ci-step-presence.sh`         | Every `requiredSteps` manifest entry still appears as an exact job-scoped `run:` in `ci-cd.yml` (all 4 jobs)           | Parity **CI-24**; `ci-cd.yml` `build-and-test` / Verify CI step presence                                                          | Copy `ci-cd.yml`, delete one required `run:` line, `CI_STEP_PRESENCE_WORKFLOW=<copy> bash scripts/verify-ci-step-presence.sh` → non-zero naming the missing step                                                  | #740 / #742 / #782              |
| `scripts/verify-type-program-membership.mjs` | Type-level guards listed in `scripts/type-guard-manifest.json` are inside the root `tsc` program (G-008)               | Parity **CI-25**; `ci-cd.yml` `build-and-test` / Verify type-program membership                                                   | `node scripts/verify-type-program-membership.mjs` — built-in two-phase: sabotage phase treats an excluded path as required and must exit non-zero                                                                 | #740                            |
| `scripts/verify-parity.mjs`                  | Local commands mirror CI checks in CI order (pre-push / local parity gate)                                             | `npm run verify`                                                                                                                  | `npm run verify -- --only CI-06 --inject-fail CI-06` → non-zero (injected step failure)                                                                                                                           | #740                            |
| `scripts/verify-parity-selfcheck.mjs`        | The parity runner itself has teeth: healthy subset green, then inject-fail turns red                                   | `npm run verify:parity-selfcheck`                                                                                                 | `npm run verify:parity-selfcheck` — fails if healthy CI-06 is red or sabotage stays green                                                                                                                         | #740                            |
| `scripts/verify-storybook-empty-suite.mjs`   | An empty Storybook Vitest suite cannot report green; spaced-path skips must be announced (W-06 / W-13)                 | `npm run verify:storybook-empty-suite`; parity **CI-27**; `ci-cd.yml` `build-and-test` / Verify Storybook empty-suite guard       | `CI=1 BB_VITEST_PATH_HAS_SPACE=1 npm run verify:storybook-empty-suite` → exit 1 (W-13); or force-include with empty stories → `healthy=0` exit 1                                                                  | #749 / #707                     |
| `scripts/check-prisma-drift.sh`              | Root and `backend/` Prisma model/enum definitions stay in sync                                                         | Parity **CI-06**; `ci-cd.yml` `build-and-test` / Check Prisma schema drift                                                        | Edit only one schema’s model block (scratch), run `bash scripts/check-prisma-drift.sh` → exit 1; restore                                                                                                          | #740                            |
| `scripts/check-todos.sh`                     | New `TODO:` / `FIXME:` lines in a PR diff are reported (failure status via `GITHUB_OUTPUT`)                            | **None today** — not referenced by any workflow or npm script (orphaned; same class as G-201)                                     | `bash scripts/check-todos.sh` (omit SHAs) → exit 1                                                                                                                                                                | legacy / unowned                |

## Sabotage guards never write your checkout (#801 / #815)

Three guards prove a check has teeth by breaking something. All three break a
**disposable sandbox**, never the working tree:

| Guard                                        | What it breaks                                            | Where                                                       |
| -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `scripts/verify-ci-shell-gate.sh`            | a `throw` in `src/main.tsx`                               | `mktemp -d` sandbox (#801)                                  |
| `scripts/verify-type-program-membership.mjs` | `src/test/__type_guard_sabotage__.ts`                     | `guard-sandbox.mjs` sandbox in `$TMPDIR` (#815)             |
| `scripts/verify-storybook-empty-suite.mjs`   | the `stories:` glob in `.storybook/main.ts` (**tracked**) | `guard-sandbox.mjs` sandbox in `.bb-guard-sandbox-*` (#815) |

The rule is structural, not restorative. `finally` blocks, `trap`s and signal
handlers do not run on `SIGKILL` — nor on the hard kill Vitest and CI issue at
timeout — so "mutate the checkout and put it back" strands damage: #815 observed
`src/test/__type_guard_sabotage__.ts` left untracked and `.storybook/main.ts`
left modified after a killed run. `scripts/lib/guard-sandbox.mjs` therefore
builds the sandbox **before** any sabotage exists, asserts where it is allowed to
be, and resolves every target through it — refusing (loud, non-zero) anything
that would land outside. Real-checkout safety does not depend on cleanup running
at all, and a failed cleanup never changes a verdict.

Where the sandbox may live is itself asserted, not assumed:

- **`$TMPDIR`** (type-program guard) — asserted **disjoint** from the repository.
- **`.bb-guard-sandbox-*` inside the checkout** (Storybook guard) — asserted
  **ignored by git** (`git check-ignore`) before anything is written into it, so
  `git status`, the index and every tracked file stay identical. It has to be
  nested: Vite serves only from its workspace root (the nearest `package.json`),
  so a `/tmp` sandbox cannot load the checkout's `node_modules` and collects zero
  stories. ESLint and the Vitest unit project ignore it too, so one stranded by a
  hard kill breaks nothing — delete it at leisure.

Regression coverage: `scripts/__tests__/guard-sandbox-isolation.test.ts` — it
inspects the two production target paths **while the sabotage is live** (via a
barrier, not a sleep) and after `SIGKILL`/`SIGTERM` at that same point.

Manual falsification, checkout-safety (CI-27 has no automated seam-free case —
running it end to end from inside `npm test` re-enters the Storybook Vitest
project, see the note in that spec):

```bash
# in one shell
npm run verify:storybook-empty-suite
# in another, for the whole run
while :; do git status --porcelain -- .storybook/main.ts; sleep 0.2; done
```

Pre-#815 this printed ` M .storybook/main.ts` for several seconds; it must now
print nothing at any point. The same watch over `src/test/` during
`node scripts/verify-type-program-membership.mjs` must never show
`?? src/test/__type_guard_sabotage__.ts` (that one _is_ covered automatically).

## `ci-required-steps.json` job coverage (#782)

The manifest is the whole guarantee: the guard protects exactly the commands listed there,
in exactly the job named. A job with no entries is unguarded — that was the #782 finding,
where `e2e-flows` (a required check since #774) and `build-only` had zero entries, so
deleting `npm run e2e:seed` left the guard green while the job proved nothing about a
seeded stack.

Every job defined in `.github/workflows/ci-cd.yml` now has entries. No job is exempt.

**`build-only`** — `npm run build`.
Protects the independent "does the production bundle compile" signal from being emptied out.

**`build-and-test`** — `npm run lint`, `npm run format:check`, `npm run typecheck`,
`cd backend && npm run typecheck`, `bash scripts/check-prisma-drift.sh`,
`bash scripts/verify-ci-step-presence.sh`, `node scripts/verify-type-program-membership.mjs`,
`npm run agent:check`, `npm run docs:check`, `npm test -- --watch=false`,
`npm run verify:storybook-empty-suite`, `npm run verify:ci-gate`, `npm run test:e2e:ci`,
`npm run build`.
Protects the static checks, guard wiring, unit/Storybook tests, shell smoke, and the build.

**`db-check`** — `npx prisma migrate deploy`, `npx prisma generate`, `npm run test:db`.
Protects migrate/generate/connectivity as the job's actual work; the job has been green since #646.

**`e2e-flows`** — `cd backend && npm run db:generate`, `npx prisma generate`,
`npx prisma migrate deploy`, `npm run e2e:seed | tee e2e-seed-out.txt`,
`nohup npm run start:dev > "$GITHUB_WORKSPACE/backend.log" 2>&1 &`,
`nohup npm run dev > "$GITHUB_WORKSPACE/frontend.log" 2>&1 &`,
`npx wait-on "$CYPRESS_SWA_URL" "$BACKEND_ORIGIN/health" --timeout 120000`,
`npm run test:e2e:ci:flows`.
Protects both Prisma generates, the migrations, the seed, both server starts, the health
wait, and the real-flow Cypress subset — the required check cannot go green with any of
them silently deleted.

Deliberately not registered: dependency installs (`npm ci`, `cd backend && npm ci`),
`npx cypress install`, `npx playwright install`, apt package installs, and `uses:` steps
(checkout, setup-node, upload-artifact). Removing a prerequisite fails the job loudly at
the next step; the manifest registers the commands whose removal would instead leave the
job green while proving less.

Registration is manual today: adding a job to `ci-cd.yml` with no manifest entry does **not**
fail the guard. Closing that class is #783, not this row.

## Justified omissions (R1-01 inventory)

| Path                                       | Why not a registry row                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `scripts/verify-ci-step-presence-core.mjs` | Library loaded by `verify-ci-step-presence.sh`; not a standalone entrypoint |

**Out of the R1-01 glob** (`scripts/verify-*.{sh,mjs}` + `scripts/check-*.sh`) and therefore not inventoried as rows: `scripts/docs-check.mjs`, `scripts/check-bundle-size.js`, `scripts/run-pr-review-check.sh` (helpers / bot plumbing).

## Conditional scope (not done)

A dead-code-tooling allowlist (e.g. for `knip` or `ts-prune`) applies only if one of those tools is adopted. **Neither is in the repo** — not done and not speculated here.

## W-16 checklist

Every path from `scripts/verify-*.{sh,mjs}` + `scripts/check-*.sh` is either a table row above or listed under justified omissions.
