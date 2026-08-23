# Testing rules

## When Red-Green applies

- Use Red-Green (failing proof → minimal fix → green) for **silent-logic guards**: parsers, set reconciliation, date/allowlist checks, exit-code mapping, path handling, idempotence.
- **Do not** treat documentation or thin adapter routers as Red-Green theater. Write the markdown; confirm with `npm run agent:check`.

## Assertions

- Assert the property under test, not a proxy. "Exit code is non-zero" is not enough — name the finding **code** (and prefer `--json`).
- Prove the healthy case first, then the broken case (two-phase). One-phase sabotage checks do not ship.
- No snapshot tests for agent-check or docs guards.
- No coverage gate as a substitute for targeted falsification.

## Placement

- Unit tests: Vitest `unit` project (`npm run test:unit`). Colocate under feature `__tests__/` or `scripts/__tests__/` for scripts.
- Fixtures: copy into `mkdtemp`; never mutate the real repo tree from a unit test.
- Cypress: only when the ticket owns E2E. Agent-context work does not add Cypress by default.

## Agent-check posture

- Silent-logic themes live in `scripts/__tests__/agent-check.test.ts`.
- Loud failures (missing adapter, orphan rule, tracked `.env.test`, oversized adapter) are proven by a manual falsify pass, not a dozen existence unit tests.
