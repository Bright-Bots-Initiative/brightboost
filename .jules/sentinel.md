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
