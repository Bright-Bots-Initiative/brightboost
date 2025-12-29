import { Request, Response, NextFunction } from "express";

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
