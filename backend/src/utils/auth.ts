import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type UserRole = "teacher" | "student" | "admin";

const SESSION_SECRET = process.env.SESSION_SECRET || "default_dev_secret";

// 🛡️ Sentinel: Fail fast if using default secret in production
if (
  process.env.NODE_ENV === "production" &&
  SESSION_SECRET === "default_dev_secret"
) {
  throw new Error(
    "🚨 CRITICAL SECURITY ERROR: SESSION_SECRET is missing or default in production!",
  );
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // If user is already authenticated (e.g. by dev shim), skip
  if (req.user) return next();

  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return next(); // No token, proceed as guest (requireAuth will catch if needed)

  jwt.verify(token, SESSION_SECRET, (err: any, user: any) => {
    if (err) {
      // If the token is invalid, we return 403 Forbidden
      return res.status(403).json({ error: "forbidden_invalid_token" });
    }

    req.user = user as { id: string; role: UserRole };
    next();
  });
}

export function devRoleShim(req: Request, _res: Response, next: NextFunction) {
  // 🛡️ Sentinel: Restrict development backdoors to non-production environments
  const isDevOrTest =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (isDevOrTest) {
    // If authenticateToken already verified a user, skip the shim logic?
    // Actually, dev shim might be used to override for testing.
    // But if we have a valid user from JWT, we probably want to keep it.
    if (req.user) return next();

    const authHeader = req.header("Authorization");
    if (authHeader === "Bearer mock-token-for-mvp") {
      req.user = { id: "student-123", role: "student" };
      return next();
    }

    if (process.env.ALLOW_DEV_ROLE_HEADER === "1" && !req.user) {
      const role = req.header("x-role") as UserRole | undefined;
      const id = req.header("x-user-id") || undefined;
      if (role && id) req.user = { id, role };
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}

/**
 * 🛡️ Sentinel: Enforce resource ownership or privileged role.
 * Allows access if:
 * 1. The user's ID matches the route parameter (default: "id")
 * 2. OR the user has one of the allowed roles (default: ["admin", "teacher"])
 */
export function requireSelfOrRole(
  allowedRoles: UserRole[] = ["admin", "teacher"],
  paramName = "id",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });

    const targetId = req.params[paramName];
    const isSelf = req.user.id === targetId;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isSelf && !hasRole) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
