/**
 * Student-data authorization policy (#871).
 *
 * One place decides whether an authenticated actor may see or change another
 * user's learning data. Routes call this instead of comparing roles inline, so
 * "any teacher may read any user" cannot creep back in one handler at a time.
 *
 * Relationships are resolved live from the database on every request:
 * removing an Enrollment revokes the access it granted immediately.
 *
 * Grants
 * - `self`        the actor is the target.
 * - `staff`       explicitly privileged staff (`role === "admin"`). The admin
 *                 role is never issued by signup or any request field; it is
 *                 assigned out of band in the database.
 * - `group_owner` the actor owns a Course (classroom or home group — the
 *                 parent of a home group is a teacher-role user who owns a
 *                 Course with kind "home") in which the target is enrolled as
 *                 a student. Teachers get no other path to student data.
 *
 * Read grants never imply write grants: progress writes are self-only.
 *
 * Denials must leak nothing. The read resolver never loads the target row —
 * it only asks whether a qualifying Enrollment exists — so an unrelated
 * caller cannot learn whether an id exists, and no write is attempted.
 */
import type { NextFunction, Request, Response } from "express";
import prisma from "./prisma";
import type { UserRole } from "./auth";

export type Actor = { id: string; role: UserRole };

export type StudentReadGrant = "self" | "staff" | "group_owner";

/** Explicitly privileged staff. Teachers are never staff. */
export function isStaff(actor: Pick<Actor, "role">): boolean {
  return actor.role === "admin";
}

/**
 * Resolve how `actor` may read the profile or aggregate progress of
 * `targetUserId`. Returns `null` when nothing grants access.
 */
export async function resolveStudentReadGrant(
  actor: Actor,
  targetUserId: string,
): Promise<StudentReadGrant | null> {
  if (actor.id === targetUserId) return "self";
  if (isStaff(actor)) return "staff";
  if (actor.role !== "teacher") return null;

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: targetUserId,
      course: { teacherId: actor.id },
      student: { role: "student" },
    },
    select: { id: true },
  });
  return enrollment ? "group_owner" : null;
}

/**
 * Progress writes (checkpoints) are self-only. Teachers, home-group owners and
 * staff read progress; nobody writes another learner's progress.
 */
export function canWriteProgressFor(actor: Actor, studentId: string): boolean {
  return actor.id === studentId;
}

/**
 * Express guard for read routes whose target user id is a route parameter.
 * Mount after `requireAuth`. Responds 403 `{ error: "forbidden" }` with no
 * further lookup when no grant applies.
 */
export function requireStudentReadAccess(param: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actor = req.user;
    if (!actor) return res.status(401).json({ error: "unauthorized" });

    const targetUserId = req.params[param];
    if (typeof targetUserId !== "string" || targetUserId.length === 0) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    try {
      const grant = await resolveStudentReadGrant(actor, targetUserId);
      if (!grant) return res.status(403).json({ error: "forbidden" });
      next();
    } catch (error) {
      console.error("Authorization check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
