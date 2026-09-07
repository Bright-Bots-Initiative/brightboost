/**
 * Explicit, server-controlled staff capability (#873).
 *
 * "Staff" is the `admin` role. It is never issued by signup or by any request
 * field — the only way to hold it is an out-of-band change to `User.role` in
 * the database (see docs/ops/staff-capability.md). A publicly registered
 * teacher is not staff, and owning a record (for example `Experiment.createdBy`)
 * does not make a global resource safe to hand to its creator.
 *
 * The role claim inside a JWT is not trusted on its own: a token lives for
 * seven days, so the role is re-read from the database on every staff call
 * and a demoted (or deleted) account loses the capability immediately, not at
 * expiry.
 *
 * Denials return 403 `{ error: "forbidden" }` and perform no work; the
 * database read is the only side effect, and it happens only for callers
 * whose token already claims `admin`.
 */
import type { NextFunction, Request, Response } from "express";
import prisma from "./prisma";

export async function isStaffAccount(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role === "admin";
}

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  let ok = false;
  try {
    ok = await isStaffAccount(req.user.id);
  } catch (error) {
    console.error("Staff check failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (!ok) return res.status(403).json({ error: "forbidden" });
  // Outside the try: a downstream throw must reach Express, not this catch.
  next();
}
