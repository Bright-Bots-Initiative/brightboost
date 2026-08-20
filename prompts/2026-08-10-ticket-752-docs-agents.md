# Canonical docs/agents context and router adapters (Issue #752)

**Author:** Jack
**Date:** 2026-08-10
**Sprint:** —
**Pod:** Build

## Intent

Ship stack PR 2/3: canonical `docs/agents/` context, thin tool adapters, and lean silent-logic unit coverage for `agent-check` — without redoing `#751` foundation or `#753` consolidation.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes — docs/agents
tree and skills, adapter routers, then silent-logic unit themes plus a short
manual loud falsify and PR prep.
```

## What Claude Code Did

- Files created/modified: `docs/agents/**`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-context.mdc`, `.claude/skills/*/SKILL.md`, `.jules/{bolt,palette,sentinel}.md`, `scripts/__tests__/agent-check.test.ts`, `prompts/2026-08-10-ticket-752-docs-agents.md`
- Tests passed: `npm run agent:check` ✓; focused unit `agent-check.test.ts` 12 passed ✓
- Build clean: not required for docs/adapters; no `src/` / Prisma / Cypress changes

## What Worked

- Docs-first Parts B–D without Red-Green theater; confirm with `agent:check`
- Copying `agent-check.mjs` + allowlist into temp for U1-20/21 without mutating the real allowlist
- Lean nine-theme unit matrix + four-break manual loud pass

## What Needed Editing

- Empty truncate of `agent.md` does not trip AC-004; deleted the file for the loud proof
- Forced `git add -f .env.test` because the path is gitignored

## Lessons

- Treat `agent:check` backtick path parsing carefully inside rule files (bare `` `.md` `` can false-trigger AC-007)

## Rating

5/5 — clear ownership split across stack PRs kept the diff reviewable
