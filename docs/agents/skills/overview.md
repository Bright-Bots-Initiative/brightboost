> **Canonical for:** agent skills index. Last verified against code: 2026-08-10.

# Skills overview

Load a skill when the task matches its description. Canonical bodies live under `docs/agents/skills/<name>/SKILL.md`. Claude Code may see thin stubs under `.claude/skills/` — always prefer the canonical path.

| Skill                    | When to use                                     |
| ------------------------ | ----------------------------------------------- |
| `ticket-scaffolding`     | Scaffold or set up a new ticket / work package  |
| `manual-e2e`             | Write a manual dual-tab or human walkthrough    |
| `red-green-verification` | Falsify a silent-logic guard or prove a check   |
| `i18n-strings`           | Add or translate user-facing copy               |
| `prisma-schema-change`   | Change Prisma schema or migrations              |
| `parallel-clones`        | Run two agents or maintain a second local clone |

Always-on rules stay in `docs/agents/rules/`. Skills add procedure; they do not replace rules.
