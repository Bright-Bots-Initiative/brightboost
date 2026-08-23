> **Canonical for:** security learnings (migrated from `.jules/sentinel.md`). Last verified against code: 2026-08-10.

# Security learnings

Always-on rules live in `docs/agents/rules/40-security.md`. This file keeps concrete incident learnings.

## IDOR in class joining

`POST /classes/join` trusted `studentId` from the body instead of `req.user.id`.

**Prevention:** Use authenticated identity for self-actions. Never trust body IDs for "current user" operations.

## Missing auth on routers

New routes are easy to ship without `requireAuth`.

**Prevention:** Default-deny — auth unless explicitly public.

## Password hash leakage

`findUnique` without `select` returned full User including `password`.

**Prevention:** Whitelist public fields with `select` / `omit` on User responses.

## Dev backdoors and secret fallbacks

Hardcoded mock tokens or `"fallback-secret-key"` style defaults become production backdoors.

**Prevention:** Fail closed when secrets are missing. Gate shims with `NODE_ENV`.

## Input limits and DoS

Unbounded strings/numbers (login password length, `timeSpentS`, JSON body size) enable CPU/memory abuse.

**Prevention:** Zod `.max()` everywhere it matters; explicit `express.json({ limit })`; separate rate limits for polling vs auth.

## CORS and CSP

Wide-open CORS and default/incomplete Helmet CSP leave gaps; Vite HMR needs (`unsafe-inline`) must not leak into production.

**Prevention:** Origin allowlists; explicit CSP; branch on `NODE_ENV` for dev-only looseness.

## Weak password policy

`min(6)` alone is insufficient.

**Prevention:** Enforce complexity (length + character classes) at schema level for new accounts.

## Email normalization

Case-sensitive emails cause duplicate accounts.

**Prevention:** Centralize `.toLowerCase()` (and length limits) in shared Zod schemas.
