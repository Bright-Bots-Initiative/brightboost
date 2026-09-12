import { Request, Response, NextFunction } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 * 🛡️ Sentinel: Strict rate limiter for authentication endpoints.
 * Prevents brute-force attacks and credential stuffing.
 * Limit: 20 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Strict limit for login/signup
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/signup attempts, please try again later." },
});

/**
 * #872: Pathways register / code-login verify a bcrypt password and therefore
 * mint `password` session provenance, so they must be throttled — but in a
 * bucket of their own, so a cohort behind one NAT cannot exhaust the /login
 * allowance (and vice versa). Same shape as authLimiter; #885 owns tuning a
 * dedicated Pathways attempt limit.
 */
export const pathwaysPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

/**
 * #872: public home-access proof routes (invite preview + accept). Their own
 * bucket for the same reason; successful requests are not counted so a family
 * completing setup on a shared network is never locked out by neighbours.
 */
export const homeAccessProofLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts, please try again later." },
});

/**
 * #875: class-code sign-in is the K-2 classroom flow, and a classroom shares
 * one public address. Each child makes two requests — one roster lookup and
 * one login — so the 20-per-IP `authLimiter` these two routes used to share
 * ran out after ten children and then refused valid credentials for the rest
 * of the class. Teacher `/login` traffic drained the same bucket.
 *
 * Discovery and authentication are split into three buckets, each matching a
 * real abuse shape rather than a shared guess:
 *
 * | Limiter | Keyed by | Bounds |
 * | --- | --- | --- |
 * | `classDiscoveryLimiter` | address | scanning the join-code space |
 * | `classLoginIpLimiter` | address | PIN guessing from one address |
 * | `classLoginAccountLimiter` | course + student | PIN guessing against one child, from anywhere |
 *
 * All three set `skipSuccessfulRequests`, so a class signing in correctly
 * never consumes any budget no matter how many children share the address.
 * Only wrong answers cost anything, which is what the limits are for.
 *
 * Accepted trade-off: a per-child bucket lets someone burn one child's failed
 * attempts and delay that child for the rest of the window. A 4-digit PIN
 * cannot be left unbounded per account, and 15 minutes is short enough for a
 * teacher to work around; an address-only limit is the defect this replaces.
 *
 * The default MemoryStore is process-local — see the note on the creation
 * limiters before scaling the backend horizontally.
 */
const CLASSROOM_WINDOW_MS = 15 * 60 * 1000;

// These carry no test-environment override. The creation limiters lower their
// limits under NODE_ENV=test because those paths are slow; class sign-in is
// not, and the ratio between the address budget and the per-child budget is
// itself part of the behaviour — a classmate must survive one child being
// locked out. The suite exercises the numbers that ship.
export const classDiscoveryLimiter = rateLimit({
  windowMs: CLASSROOM_WINDOW_MS,
  // A join code is 6 symbols from a 32-character alphabet (~1.07e9 codes), so
  // scanning is hopeless long before this bound; it exists so the attempt
  // costs the database nothing. A real class's typos stay far below it.
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many class lookups, please try again later." },
});

export const classLoginIpLimiter = rateLimit({
  windowMs: CLASSROOM_WINDOW_MS,
  // Comfortably above a class's wrong-PIN rate on a bad morning, and seven
  // times the per-child budget, so one child being locked out never comes
  // close to exhausting the address their classmates are signing in from.
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many sign-in attempts, please try again later." },
});

/**
 * Keyed by the class member the request is trying to authenticate as, so the
 * budget follows the child rather than the address. A body that names no
 * member falls back to the caller's address: such requests are malformed, so
 * they are counted there rather than exempted.
 */
function classLoginAccountKey(req: Request): string {
  const body = req.body as
    | { courseId?: unknown; studentId?: unknown }
    | undefined;
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  if (courseId && studentId) return `class:${courseId}:${studentId}`;
  return `addr:${ipKeyGenerator(req.ip ?? "")}`;
}

export const classLoginAccountLimiter = rateLimit({
  windowMs: CLASSROOM_WINDOW_MS,
  // A 4-digit PIN is 10,000 combinations; 8 wrong answers per 15 minutes puts
  // an exhaustive search for one child past 13 days.
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: classLoginAccountKey,
  message: {
    error:
      "Too many sign-in attempts for this student, please ask your teacher.",
  },
});

/**
 * 🛡️ Sentinel: Rate limiter for sensitive state-changing operations.
 * Applies to profile updates, avatar creation, etc.
 * Limit: 50 requests per 15 minutes per IP.
 */
export const sensitiveOpsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests for this operation, please try again later.",
  },
});

const CREATION_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Creation limits are keyed by the authenticated account, not IP. A classroom
 * commonly shares one public IP, so IP-keyed limits would make 30 legitimate
 * students consume the same bucket.
 *
 * These limiters must only be mounted after `requireAuth`.
 *
 * The default MemoryStore is process-local. Before horizontally scaling the
 * backend, configure a shared store so each account has one cross-instance
 * limit instead of one independent limit per process.
 */
function creationRateLimitKey(req: Request): string {
  return req.user ? `${req.user.role}:${req.user.id}` : "unauthenticated";
}

const creationLimit = (productionLimit: number, error: string) =>
  rateLimit({
    windowMs: CREATION_RATE_LIMIT_WINDOW_MS,
    // Keep integration tests fast while still exercising a real MemoryStore.
    limit: process.env.NODE_ENV === "test" ? 3 : productionLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: creationRateLimitKey,
    message: { error },
  });

/**
 * #874: a learner previewing cohort join codes. Keyed by account, not IP (a
 * classroom shares one address), and low enough that a 6-character code
 * space cannot be scanned for cohort or facilitator names.
 */
export const consentPreviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: creationRateLimitKey,
  message: { error: "too_many_previews" },
});

/** A child should only need a few new artifacts in one working session. */
export const creationCreateLimiter = creationLimit(
  10,
  "Too many new creations, please wait and try again.",
);

/** Iterative making needs a wider lane than creating new gallery records. */
export const creationUpdateLimiter = creationLimit(
  120,
  "Too many creation updates, please wait and try again.",
);

/** One adult can comfortably encourage a class of about 30 in one session. */
export const creationEncouragementLimiter = creationLimit(
  60,
  "Too many boosts, please wait and try again.",
);

/**
 * 🛡️ Sentinel: Middleware to prevent HTTP Parameter Pollution (HPP).
 *
 * Express by default populates `req.query` with an array if a parameter is repeated.
 * e.g., `?id=1&id=2` becomes `req.query.id = ['1', '2']`.
 * This can bypass validation checks or crash logic expecting a string.
 *
 * This middleware flattens query parameters to the last value provided if they are arrays.
 * White-listing can be added later if specific endpoints require arrays.
 */
export function preventHpp(req: Request, _res: Response, next: NextFunction) {
  if (req.query) {
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        // Take the last value, which is typical behavior for overriding
        const value = req.query[key] as any[];
        req.query[key] = value[value.length - 1];
      }
    }
  }
  next();
}

/**
 * 🛡️ Sentinel: Middleware to disable client-side caching.
 *
 * Ensures that sensitive API responses (PII, progress) are not stored
 * in browser history or disk cache.
 */
export function nocache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

/**
 * 🛡️ Sentinel: Rate limiter for game actions (XP/Progress).
 * Prevents scripting/botting of game mechanics.
 * Limit: 200 requests per 15 minutes per IP.
 * (~1 action every 4.5 seconds on average)
 */
// 🛡️ Sentinel: Lower limit for tests to avoid slow loops
const GAME_ACTION_LIMIT = process.env.NODE_ENV === "test" ? 5 : 200;

export const gameActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: GAME_ACTION_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many game actions, please slow down.",
  },
});
