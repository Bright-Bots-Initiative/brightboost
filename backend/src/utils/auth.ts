import { Request, Response, NextFunction } from "express";

export type UserRole = "teacher" | "student" | "admin";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: import("./auth").UserRole } | null;
  }
}

export function devRoleShim(req: Request, _res: Response, next: NextFunction) {
  // 🛡️ Sentinel: Restrict development backdoors to non-production environments
  const isDevOrTest = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (isDevOrTest) {
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
