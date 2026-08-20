---
name: manual-e2e
description: Write a manual dual-tab or human walkthrough when automated E2E is missing or insufficient for the flow.
---

# Manual dual-tab / walkthrough

Use when a human must verify two roles, two browsers, or a multi-step UI path that Cypress does not cover yet.

## Steps

1. State preconditions (accounts, seed data, which servers must be up).
2. Number each human step; one action per step.
3. Record expected UI outcomes after each step.
4. Note cleanup (logout, reset data) so the next run starts clean.
5. Prefer tracked default ports from repo config (`5173` / `3000` / Postgres `5435`) unless the contributor’s local remap is documented outside the repo.

## Do

- Keep the walkthrough copy-pasteable and role-explicit (teacher vs student, etc.).
- Point at seeded demo accounts from project docs without inventing new secrets.

## Do not

- Commit machine-specific absolute paths or personal port maps into the product repo.
- Treat a manual walkthrough as a substitute when the ticket requires automated coverage.
- Duplicate `docs/agents/rules/10-testing.md` — link it for assertion posture.
