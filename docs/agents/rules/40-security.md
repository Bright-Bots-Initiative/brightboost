# Security rules

- Never commit `.env*` values or secrets. Tracked `.env*` exceptions are allowlisted under issue **#754** with expiry — do not extend the allowlist to silence a check; rotate/untrack is #754's job.
- Never paste secrets into docs, fixtures, tests, commit messages, or PR bodies.
- Identity for self-referential actions comes from `req.user` (session), never from body- or param-supplied user IDs (class-join IDOR class of bugs).
- Reads of another user's profile or progress go through `backend/src/utils/authorization.ts` (self, staff, or teacher owning a class/home group the target is enrolled in). Do not compare roles inline; a read grant never implies a write grant (**#871**).
- Credential and relationship changes (home-access binding, login email/password, parent email) require the JWT `auth` claim to be `password` **and** re-entry of the current password; first-time home binding is proof based (owner-sent, single-use emailed token, never-bound account only). Classroom sessions (`class_code`, `class_code_pin`) and legacy tokens without the claim never gain credential authority, and no request field can widen a session (**#872**).
- New routers **default-deny**: require auth unless a route is explicitly public.
- Validate inputs with Zod (including `.max()` on strings/numbers processed by expensive paths). Mirror signup constraints on login.
- Configure CORS against an allowlist; do not ship `cors()` wide open.
- Be explicit with Prisma `select` / `omit` when returning User objects — never leak password hashes.
- Guard dev-only backdoors with `NODE_ENV` checks; fail closed. Do not hardcode JWT/secret fallbacks.
- Rate limits and CSP must match real app behavior (polling clients, production vs Vite HMR).
