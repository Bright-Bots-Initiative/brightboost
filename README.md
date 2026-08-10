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
| [docs/design-principles.md](docs/design-principles.md) | Design philosophy                   |
| [docs/team-workflow.md](docs/team-workflow.md)         | Labels, priority, and delegation    |

Agent-assisted contributors: see [CONTRIBUTING.md](CONTRIBUTING.md). Canonical agent context
lands under `docs/agents/` in a follow-on change; until then follow CONTRIBUTING and the
repo checks (`npm run verify`).

## Verify locally

```bash
npm ci
cd backend && npm ci && cd ..
npx prisma generate --schema prisma/schema.prisma
npm run verify
```

`npm run verify` mirrors the main CI gate (lint, format, typecheck, prisma drift, agent/docs
checks, unit tests). Some agent/docs findings on `main` are expected until the docs stack
lands; do not weaken the scripts.

## Tech stack (summary)

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React 18, TypeScript, Vite, Tailwind |
| Backend  | Node.js 20, Express, TypeScript      |
| Database | PostgreSQL (Supabase) via Prisma     |
| i18n     | i18next (EN / ES)                    |

Production is Railway + Supabase. Legacy AWS Lambda / Azure SWA / Aurora notes in older docs
are historical only.
