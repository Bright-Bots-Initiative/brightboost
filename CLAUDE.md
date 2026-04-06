# Bright Boost — Claude Code Project Brief

> This file is read by Claude Code on every turn. Keep it current.
> Last updated: 2026-04-06

---

## Product

Bright Boost is a bilingual (English/Spanish) K–8 STEM learning platform.
Current rollout priority is **K–2**. Architecture and copy must support K–8.
Long-term pathway emphasis: AI, quantum, and biotech.

### Core Users

| User | What they care about |
|------|---------------------|
| Students (K–2 first) | Fun, readable, clear instructions, gamified learning |
| Teachers | Dashboard quality, evidence of progress, demo readiness |
| School/community partners | Pilot readiness, measurable outcomes, bilingual access |

### Product Priorities (ranked)

1. K–2 usability and readability
2. Teacher dashboard quality and progress evidence
3. Bilingual English/Spanish consistency
4. Gamified learning that stays educational, structured, measurable
5. Pilot/demo readiness for schools and partners
6. Clean, minimal regression risk in every change

---

## Source of Truth Order

When repository information conflicts, resolve using this order:

1. **Actual code** — imports, runtime behavior, component trees
2. **package.json** — scripts, engines, dependencies
3. **prisma/schema.prisma** — data model
4. **Root README.md**
5. **Current passing tests**
6. **Other docs** in active use
7. **Legacy docs** — only if code proves they are still active

### Known Conflicts

- `package.json` declares Node 20.x; `frontend/CONTRIBUTING.md` may reference Node 18.
- `backend/README.md` may reference AWS Lambda/Aurora — this is stale. Production is Railway/Supabase.
- If you find a new conflict, **flag it explicitly** in your response. Do not silently choose one side.

---

## Tech Stack

### Frontend
- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui, Framer Motion
- React Router v6
- i18next / react-i18next (bilingual)

### Backend
- Node.js 20.x, Express, TypeScript
- Prisma ORM → PostgreSQL / Supabase

### Infrastructure
- Hosting: Railway
- DB: Supabase (PostgreSQL)

### Testing & Quality
- Vitest (unit)
- Cypress (e2e)
- Storybook (component dev)
- ESLint + Prettier

---

## Commands

```bash
# Install
npm install

# Dev servers
npm run dev                # frontend
cd backend && npm run dev  # backend

# Quality
npm run lint
npm run test
npm run typecheck
npm run storybook

# Database
npm run db:init
npx prisma migrate dev
npx prisma generate
```

---

## Repo Rules

### Code Style
- Functional React components and hooks only — no class components
- Follow existing folder conventions and patterns before inventing new ones
- TypeScript strict mode — no `any` unless absolutely necessary and commented

### Change Philosophy
- **Minimal diff over broad refactor** — always
- Do not rewrite unrelated files
- Do not change architecture unless the task explicitly requires it
- Prefer narrow, production-safe edits
- Reuse existing components, hooks, utilities, and patterns

### Bilingual / i18n
- Never hardcode English strings in UI — use translation keys via `useTranslation()`
- When adding new copy, add keys to both `en.json` and `es.json`
- If Spanish translation is uncertain, add the English value with a `// TODO: translate` comment in the JSON

### Educational Intent
- Do not replace Bright Boost's learning intent with generic gameplay
- Preserve the educational objective, pacing, readability, and instructional clarity
- If recreating older game concepts in React, keep the original learning goal and feel intact
- K–2 content must use simple vocabulary, large tap targets, clear visual hierarchy

### UX Consistency
- Keep teacher and student flows consistent with existing app patterns
- Maintain onboarding and instruction clarity inside games/activities
- Prioritize readability for K–2 over visual complexity

---

## Workflow — How to Execute Every Task

### Before Coding
1. **Inspect** — Read relevant files, adjacent components, services, tests, translation files, and route patterns
2. **Explain current behavior** — What does the app do right now?
3. **Explain proposed approach** — What will you change and why?
4. **Identify risks and assumptions** — What could break? What are you guessing about?

### When Coding
1. Make the smallest viable change
2. Match existing patterns — check adjacent files first
3. Avoid unrelated refactors
4. Add translation keys, not hardcoded strings
5. Preserve educational intent

### Before Finishing
1. Run `npm run lint`, `npm run test`, `npm run typecheck` when possible
2. List every file changed
3. Summarize what changed and why it fits Bright Boost
4. Note any follow-up work or risks

---

## Task Spec Template

Use this structure for every task:

```
## Intent
[One sentence: what needs to be built/fixed]

## Context
[Why this matters for Bright Boost, who it affects, where it sits in the product]

## Relevant Areas
[Likely files, routes, components, services, schema, or tests]

## Current Behavior
[What the app does now]

## Desired Behavior
[What it should do after the change]

## Acceptance Tests
- [ ] specific behavior 1
- [ ] specific behavior 2
- [ ] specific behavior 3

## Edge Cases
- edge case 1
- edge case 2

## Constraints
- Preserve bilingual support
- Keep K–2 readability
- Avoid unrelated regressions
- Match current code patterns
- Do not change architecture unless necessary
```

---

## Quality Definition

"Good" for Bright Boost means ALL of these, not just clean code:

- ✅ K–2 clarity — simple words, large UI, clear flow
- ✅ Educational intent preserved — learning goal intact
- ✅ Bilingual consistency — both languages work, keys not hardcoded
- ✅ Teacher demo readiness — dashboards show real progress
- ✅ Minimal regression risk — small diff, existing patterns reused
- ✅ Matches existing conventions — not a new architecture opinion

---

## Anti-Patterns — Never Do These

- ❌ Silently choose one side of a doc conflict without flagging it
- ❌ Hardcode English strings in JSX
- ❌ Broad refactor when a narrow fix works
- ❌ Replace educational game logic with generic gameplay
- ❌ Introduce new architectural patterns without being asked
- ❌ Assume AWS/Lambda/Aurora docs are current
- ❌ Skip inspecting adjacent files before writing code
- ❌ Optimize for code elegance at the expense of K–2 usability

---

## Bright Boost Defaults (quick reference)

```
K–2 first, K–8 aware
English + Spanish always
Minimal diff over broad refactor
Teacher + student flow consistency
Educational clarity over flashy complexity
Preserve original game/module intent
Trust current code over stale docs
Flag conflicts, don't hide them
```
