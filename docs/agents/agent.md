> **Canonical for:** agent bootstrap router. Last verified against code: 2026-08-10.

# Agent context router

Before work, read `docs/agents/overview.md`, everything under `docs/agents/rules`, and `docs/agents/skills/overview.md`. Use task-specific skills from `docs/agents/skills/**/SKILL.md`.

This file is the only path adapters name. It carries no rule or skill body.

| Path                                   | Role                                               |
| -------------------------------------- | -------------------------------------------------- |
| `docs/agents/overview.md`              | Project overview, commands, source-of-truth ladder |
| `docs/agents/rules/00-core.md`         | Minimal diff, SoT ladder, push-back, branch/commit |
| `docs/agents/rules/10-testing.md`      | Red-Green for silent-logic guards; proxy traps     |
| `docs/agents/rules/20-i18n.md`         | Keys not literals; locales                         |
| `docs/agents/rules/30-database.md`     | Dual migration trees; local Postgres               |
| `docs/agents/rules/40-security.md`     | Secrets, `req.user`, default-deny                  |
| `docs/agents/rules/50-docs.md`         | Canonical docs; root allowlist; PR summaries       |
| `docs/agents/rules/60-verification.md` | Local–CI parity; Definition of Done                |
| `docs/agents/skills/overview.md`       | Skill index (load on demand)                       |
| `docs/agents/learned/`                 | Migrated learnings (performance, a11y, security)   |
| `docs/agents/mcp.md`                   | MCP / tooling notes (optional; never required)     |

Adapters (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-context.mdc`) must repeat the bootstrap sentence above verbatim and stay under 40 lines.
