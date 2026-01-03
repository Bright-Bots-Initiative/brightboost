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
