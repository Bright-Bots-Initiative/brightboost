import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { isSessionAuth } from "./token";

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

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // If user is already authenticated (e.g. by dev shim), skip
  if (req.user) return next();

  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return next(); // No token, proceed as guest (requireAuth will catch if needed)

  let claims: jwt.JwtPayload | string;
  try {
    claims = jwt.verify(token, SESSION_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(403).json({ error: "forbidden_invalid_token" });
  }
  if (
    typeof claims === "string" ||
    typeof claims.id !== "string" ||
    !["student", "teacher", "admin"].includes(claims.role)
  ) {
    return res.status(403).json({ error: "forbidden_invalid_token" });
  }
  // Pre-migration sessions represent epoch zero only; they lose authority at
  // the first credential/role change just like tokens issued by this version.
  const version = claims.sv === undefined ? 0 : claims.sv;
  if (!Number.isSafeInteger(version) || version < 0 || version > 2147483647) {
    return res.status(403).json({ error: "forbidden_invalid_token" });
  }
  try {
    const account = await prisma.user.findFirst({
      where: { id: claims.id, role: claims.role, sessionVersion: version },
      select: { id: true },
    });
    if (!account)
      return res.status(403).json({ error: "forbidden_invalid_token" });
  } catch {
    // A temporary database outage is not a logout, and cannot authorize a request.
    return res.status(503).json({ error: "session_check_unavailable" });
  }
  req.user = {
    id: claims.id,
    role: claims.role as UserRole,
    auth: isSessionAuth(claims.auth) ? claims.auth : undefined,
  };
  next();
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

/**
 * #872: true for K-2 classroom sessions (icon login with or without a PIN).
 * Anyone holding a class code can start one, so such a session must never
 * read or change the family's home login details.
 */
export function isClassroomSession(req: Request): boolean {
  const auth = req.user?.auth;
  return auth === "class_code" || auth === "class_code_pin";
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
