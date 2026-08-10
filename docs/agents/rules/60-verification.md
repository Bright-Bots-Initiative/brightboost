# Verification rules

## Local–CI parity

| CI check          | Local command                        | In `npm run verify`?        |
| ----------------- | ------------------------------------ | --------------------------- |
| lint              | `npm run lint`                       | yes                         |
| format:check      | `npm run format:check`               | yes                         |
| typecheck         | `npm run typecheck`                  | yes                         |
| backend typecheck | `cd backend && npm run typecheck`    | yes                         |
| prisma drift      | `bash scripts/check-prisma-drift.sh` | yes                         |
| agent:check       | `npm run agent:check`                | yes                         |
| docs:check        | `npm run docs:check`                 | yes                         |
| full `npm test`   | `npm run test:unit` locally          | no — unit is the light gate |
| Cypress ci-shell  | `npm run test:e2e:ci`                | no                          |
| build             | `npm run build`                      | no                          |
| db-check          | migrate deploy + `test:db`           | no — red until #646         |

Run `npm run verify` before claiming parity. Do not widen, disable, or exclude a rule to get green.

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
