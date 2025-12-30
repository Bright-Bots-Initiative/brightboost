import type { UserRole } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole } | null;
    }
  }
}

export {};
