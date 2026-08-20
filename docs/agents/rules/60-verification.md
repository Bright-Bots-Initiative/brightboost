# Verification rules

## Local–CI parity

`npm run verify` is the canonical parity runner. Its ordered steps are defined in
`scripts/verify-parity.mjs`; do not maintain a second hand-written command sequence.

- Dependency installs: root/backend dependencies plus Cypress and Playwright;
  `--skip-install` omits them.
- Static checks: lint, diff-scoped Prettier, frontend/backend typecheck, and Prisma drift.
- Guard wiring: required-step presence, type-program membership, `agent:check`, and
  `docs:check`.
- Tests: unit + Storybook tests, the Storybook empty-suite guard, and the two-phase shell
  gate.
- Browser shell: wait and shell smoke only when `CYPRESS_SWA_URL` is set.
- Database: migrate, generate, and connectivity only with an explicitly designated
  `TEST_DATABASE_URL`.
- Artifacts: frontend build and bundle-size budget.
- Platform-only checks: deploy and production smoke are reported as not local.

Required failures always fail. Required skips also fail unless the operator passes
`--allow-skips`; that flag acknowledges named environment gaps and never converts a failed
command into success.

After `npm ci` in the root and `backend/`, the usual environment-independent pass is:

```bash
npm run verify -- --skip-install --allow-skips
```

For the closest local reproduction of CI, omit `--allow-skips`, start the frontend at the
URL in `CYPRESS_SWA_URL`, and provide a disposable database whose name contains a bounded
`test`, `tests`, or `e2e` token through `TEST_DATABASE_URL`. Production-shaped or ambiguous
database targets must be refused before any Prisma call.

CI workflow details and the relationship among the shell gate, Storybook guard, and
`e2e-flows` live in `docs/ops/ci.md` once the documentation-consolidation layer lands (until
then, use `docs/ci.md`).

## Agent-check

- Healthy tree: exit **0**, empty findings, printed inventory.
- Findings: exit **1** with codes `AC-0NN`. Internal/usage errors: exit **2** — never conflate with 1.
- Prefer `npm run agent:check -- --json` when asserting codes.
- `--fix` regenerates derived stubs only; it never edits canonical skill bodies.

## Definition of Done (agent-context work)

- Docs/adapters written; `agent:check` green on the real tree when adapters + skills are present.
- Silent-logic unit themes (lean set) green with RED evidence where the bug is silent.
- Loud failures covered by one manual falsify pass (missing adapter, missing `agent.md`, orphan rule, tracked `.env.test`).
- No secrets, absolute paths, or machine-specific port maps in product docs.
