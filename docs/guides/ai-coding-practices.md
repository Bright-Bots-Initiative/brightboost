> **Canonical for:** AI-assisted coding practices in this repo. Last verified against code: 2026-08-10.

# AI coding practices

How to work with agents in BrightBoost without inventing a parallel process. This is narrative guidance — load skills for procedures; do not treat this page as a second rulebook.

## Why scaffolding exists

Tickets that need planning use a small, stable set of files so humans and agents share the same contract: vision, progress checkboxes, guardrails, and audit evidence. Scaffolding keeps scope honest and makes handoffs cheap.

When you need to create that surface, use [`docs/agents/skills/ticket-scaffolding/SKILL.md`](../agents/skills/ticket-scaffolding/SKILL.md).

## Five-file contract (shape)

A typical ticket planning pack answers five jobs:

1. **Overview** — vision, anti-goals, blast radius, acceptance criteria
2. **Progress** — ordered Parts and checkboxes (never renumber silently)
3. **Remember** — versions, gotchas, hard guardrails
4. **Audit** — falsification and manual-pass evidence before PR
5. **Scoped rule** (when used) — branch lock and per-turn workflow for that ticket only

Exact paths depend on where your team keeps planning (often outside the product repo). Product PRs still ship only product + automated tests.

## Three test layers

| Layer                  | What it proves                      | Typical command                                |
| ---------------------- | ----------------------------------- | ---------------------------------------------- |
| Unit / component       | Fast logic and UI contracts         | `npm run test:unit`                            |
| Docs / agent integrity | Links, allowlists, adapter graph    | `npm run docs:check`, `npm run agent:check`    |
| E2E                    | Browser flows against a running app | Cypress (`npm run test:e2e` / focused scripts) |

Silent-logic guards (parsers, reconciles, exits) need Red-Green proof — see [`docs/agents/skills/red-green-verification/SKILL.md`](../agents/skills/red-green-verification/SKILL.md) and [`docs/agents/rules/10-testing.md`](../agents/rules/10-testing.md).

Documentation-only tickets prove with `docs:check` and a short manual break list — not a Vitest sabotage suite for every loud code.

## Cypress conventions

- Specs live under `cypress/e2e/` as `*.cy.ts`.
- Prefer focused scripts (`test:e2e:ci`, staging smokes) over bare `test:e2e` when CI already defines the honest gate.
- Do not add Cypress for flows that unit tests already cover unless the ticket owns E2E.
- Filename style among feature specs is mixed historically; pick one convention per new pair and record it in the PR when folding duplicates.

## When manual walkthroughs earn a place

Automated E2E is preferred when stable. Write a manual dual-tab / human walkthrough when automation cannot yet cover the flow, or when the ticket explicitly requires a rehearsal. Use [`docs/agents/skills/manual-e2e/SKILL.md`](../agents/skills/manual-e2e/SKILL.md).

## Other skills (load on demand)

| Skill                                                                    | When                       |
| ------------------------------------------------------------------------ | -------------------------- |
| [`i18n-strings`](../agents/skills/i18n-strings/SKILL.md)                 | User-facing copy / locales |
| [`prisma-schema-change`](../agents/skills/prisma-schema-change/SKILL.md) | Schema or migrations       |
| [`parallel-clones`](../agents/skills/parallel-clones/SKILL.md)           | Isolated second clone      |

Index: [`docs/agents/skills/overview.md`](../agents/skills/overview.md). Always-on rules: [`docs/agents/rules/`](../agents/rules/).

## Related

- [`SETUP.md`](../../SETUP.md)
- [`docs/guides/parallel-agents.md`](parallel-agents.md)
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- [`docs/agents/agent.md`](../agents/agent.md)
