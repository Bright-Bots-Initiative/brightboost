---
name: ticket-scaffolding
description: Scaffold or set up a new ticket / work package when starting tracked work from an issue or brief.
---

# Ticket scaffolding

Use when creating the planning surface for a ticket before product changes.

## Steps

1. Confirm the issue id, scope, and clone/branch naming conventions from `CONTRIBUTING.md`.
2. Capture vision, anti-goals, and blast radius before coding.
3. Split work into ordered Parts with clear file ownership.
4. Record progress checkboxes and a short session log as you go.
5. Keep product code and planning notes separated — do not commit personal planning trees into the app repo unless the team already does so in-repo.

## Do

- Prefer conventional commits and a single focused PR scope.
- Link acceptance criteria to falsifiable checks where guards exist.

## Do not

- Paste secrets into ticket notes or fixtures.
- Expand into unrelated refactors while scaffolding.
- Duplicate always-on rules — link `docs/agents/rules/00-core.md` and `docs/agents/rules/50-docs.md`.
