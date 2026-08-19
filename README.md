# BrightBoost

> Canonical for: project front door · Last verified: 2026-08-10

A bilingual (English/Spanish) K–8 STEM learning platform for Title I classrooms and
after-school programs. Character-driven stories, Unity mini-games, and a teacher dashboard
for assigning, tracking, and assessing standards-aligned activities.

## Clone

```bash
git clone https://github.com/Bright-Bots-Initiative/brightboost.git
cd brightboost
```

Package manager: **npm** (CI runs `npm ci`). Do not use pnpm for this repo.

## Quick links

| Doc                                                    | Purpose                             |
| ------------------------------------------------------ | ----------------------------------- |
| [SETUP.md](SETUP.md)                                   | Local development setup             |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Branch, commit, and review workflow |
| [DEPLOYMENT.md](DEPLOYMENT.md)                         | Production deploy notes             |
| [SECURITY.md](SECURITY.md)                             | Reporting and secret-handling rules |
| [docs/README.md](docs/README.md)                       | Docs map (directories + canonicals) |
| [docs/ops/ci.md](docs/ops/ci.md)                       | CI jobs, Cypress gates, parity      |
| [docs/design-principles.md](docs/design-principles.md) | Design philosophy                   |
| [docs/team-workflow.md](docs/team-workflow.md)         | Labels, priority, and delegation    |

Agent-assisted contributors: start at [docs/agents/agent.md](docs/agents/agent.md) (also linked from
[AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md)). Run `npm run verify` before claiming local–CI parity.

## Verify locally

```bash
npm ci
cd backend && npm ci && cd ..
npx prisma generate --schema prisma/schema.prisma
npm run verify -- --skip-install --allow-skips
```

`npm run verify` mirrors the main CI gate. The command above runs every locally available
step and reports environment-bound skips; omit `--allow-skips` when the frontend and an
explicitly designated test database are available. This layer also wires `agent:check` and
`docs:check` into CI. Do not weaken the scripts to get green.

## Tech stack (summary)

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React 18, TypeScript, Vite, Tailwind |
| Backend  | Node.js 20, Express, TypeScript      |
| Database | PostgreSQL (Supabase) via Prisma     |
| i18n     | i18next (EN / ES)                    |

Production is Railway + Supabase. Legacy AWS Lambda / Azure SWA / Aurora notes in older docs
are historical only.
