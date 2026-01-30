import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";

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
