# Security rules

- Never commit `.env*` values or secrets. Tracked `.env*` exceptions are allowlisted under issue **#754** with expiry — do not extend the allowlist to silence a check; rotate/untrack is #754's job.
- Never paste secrets into docs, fixtures, tests, commit messages, or PR bodies.
- Identity for self-referential actions comes from `req.user` (session), never from body- or param-supplied user IDs (class-join IDOR class of bugs).
- New routers **default-deny**: require auth unless a route is explicitly public.
- Validate inputs with Zod (including `.max()` on strings/numbers processed by expensive paths). Mirror signup constraints on login.
- Configure CORS against an allowlist; do not ship `cors()` wide open.
- Be explicit with Prisma `select` / `omit` when returning User objects — never leak password hashes.
- Guard dev-only backdoors with `NODE_ENV` checks; fail closed. Do not hardcode JWT/secret fallbacks.
- Rate limits and CSP must match real app behavior (polling clients, production vs Vite HMR).
