## 2024-05-23 - IDOR in Class Joining

**Vulnerability:** Insecure Direct Object Reference (IDOR) in `POST /classes/join`.
**Learning:** The endpoint trusted `studentId` from the request body instead of the authenticated user's ID (`req.user.id`). This allowed any authenticated student to enroll any other student into a class.
**Prevention:** Always rely on the authenticated session (`req.user`) for user identification in actions that affect the current user. Never trust IDs from the request body for self-referential actions.

## 2024-05-23 - Missing Auth on Progress Endpoints

**Vulnerability:** `backend/src/routes/progress.ts` endpoints lack authentication middleware (`requireAuth`).
**Learning:** It's easy to miss adding middleware to new routers or endpoints.
**Prevention:** Use a default-deny policy where all routes require authentication by default, or use a linter/scanner to ensure sensitive routes have auth middleware. (Fixed in this session).

## 2024-05-24 - Broken Access Control on Progress Routes

**Vulnerability:** Public access to student progress data and checkpoint submission.
**Learning:** Endpoints were completely public and trusted `studentId` from params/body.
**Prevention:** Enforced `requireAuth` and added checks to ensure `req.user.id` matches the target `studentId` (for students).

## 2024-05-24 - Production Backdoor in Auth Shim

**Vulnerability:** Hardcoded "mock-token-for-mvp" in `devRoleShim` allowed full auth bypass in any environment.
**Learning:** Developer conveniences often become security holes if not strictly guarded by environment checks.
**Prevention:** Guard all test/dev backdoors with explicit `process.env.NODE_ENV` checks and ensure they fail-safe (closed) by default.

## 2024-05-24 - DoS Risk in Login Schema

**Vulnerability:** The login schema lacked maximum length validation for passwords and emails. This allowed attackers to send excessively long strings (e.g., 1MB+) which could be processed by bcrypt or database queries, causing CPU spikes or memory exhaustion (DoS).
**Learning:** Always mirror input constraints from signup/creation schemas to login schemas. If a user can only sign up with a 100-char password, they should only be able to log in with a 100-char password.
**Prevention:** Audit all `zod` schemas for `.max()` constraints on string fields, especially those processed by expensive algorithms like bcrypt.

## 2025-02-18 - Overly Permissive CORS

**Vulnerability:** `app.use(cors())` was used without options, allowing any origin to access the API.
**Learning:** Permissive CORS defaults (allowing `*`) are dangerous for APIs handling sensitive user data, even if authentication is token-based. It allows unauthorized clients (like malicious websites) to read API responses if the user has a valid session (though less critical with header-based auth, it's still best practice).
**Prevention:** Configure CORS to explicitly check `origin` against a trusted list (`ALLOWED_ORIGINS` env var) or allow specific patterns (like localhost in dev), rather than allowing everything.

## 2025-01-29 - Missing CSP and Availability Risk

**Vulnerability:**

1. **Missing CSP:** The backend was using `helmet()` with default settings, which in version 4+ provides some protection but lacks a strict Content Security Policy (CSP). This left the application vulnerable to XSS if an attacker could inject scripts.
2. **DoS Risk (Availability):** The global API rate limit was set to 100 requests per 15 minutes. The game frontend implements polling (every 1.2s-3.5s) during matches. A legitimate player would hit the rate limit within ~2 minutes, causing the game to crash/disconnect (Self-inflicted Denial of Service).

**Learning:**

- **Default != Secure:** Relying on library defaults (like `helmet()`) without checking the specific version behavior and configuration often leaves gaps.
- **Security vs. Usability:** Security controls (Rate Limiting) must be tuned to the application's actual behavior (Polling). A "secure" default of 100/15min is a "bug" for a real-time polling app. Availability is a core pillar of security.

**Prevention:**

- Always configure `helmet.contentSecurityPolicy` explicitly with a whitelist.
- Calculate expected request volume for "heavy" users (gamers) before setting rate limits.
- Use separate rate limiters for high-traffic endpoints (like `/match`) versus sensitive ones (like `/login`).

## 2025-02-19 - Weak Password Policy

**Vulnerability:** The application allowed creation of accounts with simple passwords (e.g., "123456", "password"), exposing users to brute-force and credential stuffing attacks.
**Learning:** Default validation (`min(6)`) is insufficient for modern security standards. Users often default to the simplest possible password if not constrained.
**Prevention:** Enforce complexity rules (uppercase, lowercase, number, minimum length of 8) at the schema level for all new accounts.

## 2024-05-22 - Prevent Password Hash Leak in Progress Endpoint

**Vulnerability:** `GET /get-progress` endpoint was returning the full `User` object, including the hashed `password` field, because `findUnique` was used without a `select` clause.
**Learning:** Prisma's `findUnique` (and other find methods) return all scalar fields by default unless `select` or `omit` is used. Always be explicit about selected fields when returning user objects to the client.
**Prevention:** Use `select` to whitelist public fields when fetching User models for API responses.

## 2026-01-14 - Missing Input Validation in Progress Route

**Vulnerability:** The `POST /api/progress/complete-activity` endpoint blindly trusted `req.body`, allowing negative `timeSpentS` (corrupting data) and missing fields (causing 500 errors).
**Learning:** MVP/Prototype endpoints often lack rigorous validation that "legacy" or "comprehensive" endpoints have. Always audit "quick fix" endpoints.
**Prevention:** Enforce Zod schemas for ALL POST endpoints, even internal/MVP ones. Added `completeActivitySchema`.

## 2026-03-03 - Unbounded Request Body Size (DoS Risk)

**Vulnerability:** The application was using `express.json()` without a specific size limit (defaulting to 100kb). While reasonable, relying on defaults can be risky if they change or if custom parsers are added.
**Learning:** Explicit configuration is better than implicit defaults. Setting a strict limit (50kb) based on actual usage prevents potential DoS attacks via large payloads and documents the constraint.
**Prevention:** Configure `express.json({ limit: "50kb" })` in `server.ts`.

## 2026-03-03 - Missing Email Normalization and Input Limits

**Vulnerability:** Emails were treated as case-sensitive on signup/login, leading to potential account duplication. Activity time spent was unbounded, posing DoS/Data corruption risks.
**Learning:** Default `z.string().email()` does not normalize case. Numeric inputs without `.max()` are risky for databases.
**Prevention:** Use centralized Zod schemas with `.toLowerCase()` for emails and explicit `.max()` constraints for all numeric inputs.

## 2026-05-18 - Development Configuration Leaking to Production

**Vulnerability:** The CSP `script-src` directive included `'unsafe-inline'` to support Vite's development HMR (Hot Module Replacement) and React Refresh, but this setting persisted in production.
**Learning:** Development tools often require insecure configurations (like inline scripts) that undermine production security. It's critical to conditionally apply these settings based on `NODE_ENV`.
**Prevention:** Explicitly check `process.env.NODE_ENV === 'production'` when configuring security headers. Use strict CSP in production while allowing necessary dev conveniences locally.

## 2026-05-25 - Hardcoded Fallback JWT Secret in Lambdas

**Vulnerability:** 9 Lambda functions in `src/lambda/` were using a hardcoded fallback string ("fallback-secret-key") when `JWT_SECRET` environment variable was missing.
**Learning:** Copy-paste boilerplate for environment variables often carries over insecure defaults. A fallback that is convenient for local dev becomes a critical backdoor if deployed.
**Prevention:** Strictly enforce environment variable presence using `if (!envVar) throw new Error(...)` pattern. Do not provide default values for secrets.
