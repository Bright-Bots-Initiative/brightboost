> **Canonical for:** agent bootstrap router. Last verified against code: 2026-08-18.

# Agent context router

Before work, read `docs/agents/overview.md`, everything under `docs/agents/rules`, and `docs/agents/skills/overview.md`. Use task-specific skills from `docs/agents/skills/**/SKILL.md`.

This file is the only path adapters name. It carries no rule or skill body.

## Pointers

| Path                                         | Role                                               |
| -------------------------------------------- | -------------------------------------------------- |
| `docs/agents/overview.md`                    | Project overview, commands, source-of-truth ladder |
| `docs/agents/rules/00-core.md`               | Minimal diff, SoT ladder, push-back, branch/commit |
| `docs/agents/rules/10-testing.md`            | Red-Green for silent-logic guards; proxy traps     |
| `docs/agents/rules/20-i18n.md`               | Keys not literals; locales                         |
| `docs/agents/rules/30-database.md`           | Dual migration trees; local Postgres               |
| `docs/agents/rules/40-security.md`           | Secrets, `req.user`, default-deny                  |
| `docs/agents/rules/50-docs.md`               | Canonical docs; root allowlist; PR summaries       |
| `docs/agents/rules/60-verification.md`       | Local–CI parity; Definition of Done                |
| `docs/agents/rules/70-internship-program.md` | Internship and contributor-cohort program rules    |
| `docs/agents/skills/overview.md`             | Skill index (load on demand)                       |
| `docs/agents/learned/`                       | Migrated learnings (performance, a11y, security)   |
| `docs/agents/mcp.md`                         | MCP / tooling notes (optional; never required)     |

## Adapter contract

Adapters (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-context.mdc`) must:

- Name this file (`docs/agents/agent.md`)
- Repeat the bootstrap sentence above **verbatim**
- Stay under 40 lines
- Carry no rule or skill body text

Derived Claude skill stubs under `.claude/skills/` point at canonical `docs/agents/skills/**/SKILL.md` and are regenerated with `npm run agent:check -- --fix`.

Jules stubs under `.jules/` are one-line routers into `docs/agents/learned/`.

## Hop order

1. Read `overview.md` and every file in `rules/`
2. Skim `skills/overview.md`; open a skill only when the task matches
3. Consult `learned/` for incident-style notes; do not treat them as always-on rules
