/**
 * Home-access routes that need an authenticated session (#872).
 *
 * Mounted after `authenticateToken` (server.ts). The public, proof-based
 * routes — `GET /auth/home-access/invite/:token` and
 * `POST /auth/home-access/accept` — live in routes/auth.ts, which is mounted
 * before the token middleware so a stale token in the parent's browser can
 * never block the accept page.
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { logAudit } from "../utils/audit";
import { sensitiveOpsLimiter } from "../utils/security";
import { idSchema } from "../validation/schemas";
import { sendHomeAccessInviteEmail } from "../utils/mail";
import {
  HomeAccessError,
  createHomeAccessInvite,
  discardHomeAccessInvite,
  inviteHomeAccessSchema,
  updateHomeCredentials,
} from "../services/homeAccess";

const router = Router();

export function answerHomeAccessError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }
  if (error instanceof HomeAccessError) {
    return res.status(error.status).json({ error: error.code });
  }
  console.error("Home access error:", error);
  return res.status(500).json({ error: "Internal server error" });
}

// The pre-#872 self-service route let any student session — including a
// PIN-less classroom login — set or replace an account's email, password and
// parent relationship. It is gone; the response says so for every caller.
router.post("/auth/home-access/enable", (_req: Request, res: Response) => {
  res.status(410).json({ error: "home_access_enable_removed" });
});

/**
 * (A) Invite a parent/guardian to bind a home login to a never-bound student.
 * Actor: the teacher (classroom) or home-group parent (a teacher-role user)
 * who owns the Course, signed in with a password session, re-entering their
 * password. Classroom and legacy sessions are refused before any lookup.
 */
router.post(
  "/teacher/courses/:courseId/students/:studentId/home-access/invite",
  requireAuth,
  sensitiveOpsLimiter,
  async (req: Request, res: Response) => {
    const actor = req.user!;
    if (actor.role !== "teacher") {
      return res.status(403).json({ error: "forbidden" });
    }
    if (actor.auth !== "password") {
      return res.status(403).json({ error: "reauthentication_required" });
    }
    const ids = z
      .object({ courseId: idSchema, studentId: idSchema })
      .safeParse(req.params);
    if (!ids.success) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    try {
      const input = inviteHomeAccessSchema.parse(req.body);

      const teacher = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { role: true, password: true },
      });
      const stepUpOk =
        !!teacher &&
        teacher.role === "teacher" &&
        !!teacher.password &&
        (await bcrypt.compare(input.currentPassword, teacher.password));
      if (!stepUpOk) {
        await logAudit("HOME_ACCESS_INVITE_DENIED", actor.id, {
          studentId: ids.data.studentId,
          reason: "invalid_current_password",
          ip: req.ip,
        });
        return res.status(403).json({ error: "invalid_current_password" });
      }

      const invite = await createHomeAccessInvite({
        teacherId: actor.id,
        courseId: ids.data.courseId,
        studentId: ids.data.studentId,
        adultEmail: input.adultEmail,
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const acceptUrl = `${frontendUrl}/home-access/accept?token=${invite.token}`;
      const delivered = await sendHomeAccessInviteEmail(
        input.adultEmail,
        acceptUrl,
        invite.studentFirstName,
      );
      if (!delivered) {
        // No proof can reach the adult, so nothing may remain claimable.
        await discardHomeAccessInvite(invite.inviteId);
        return res.status(503).json({ error: "mail_unavailable" });
      }

      await logAudit("HOME_ACCESS_INVITE_SENT", actor.id, {
        studentId: ids.data.studentId,
        courseId: ids.data.courseId,
        adultEmail: input.adultEmail,
        expiresAt: invite.expiresAt.toISOString(),
        ip: req.ip,
      });

      return res.status(202).json({ ok: true, expiresAt: invite.expiresAt });
    } catch (error) {
      return answerHomeAccessError(res, error);
    }
  },
);

/**
 * (B) Change the home login or parent relationship. Only the credential
 * holder — a student signed in with the home email + password — may do this,
 * and only by re-entering the current password. The role check is exact:
 * `requireRole` would let staff through, and no request field can widen it.
 */
router.post(
  "/auth/home-access/credentials",
  requireAuth,
  sensitiveOpsLimiter,
  async (req: Request, res: Response) => {
    const actor = req.user!;
    if (actor.role !== "student") {
      return res.status(403).json({ error: "forbidden" });
    }
    if (actor.auth !== "password") {
      return res.status(403).json({ error: "reauthentication_required" });
    }

    try {
      const result = await updateHomeCredentials(actor.id, req.body);
      await logAudit("HOME_ACCESS_CREDENTIALS_UPDATED", actor.id, {
        changedFields: result.changedFields,
        ip: req.ip,
      });
      return res.json({ ok: true, user: result.user });
    } catch (error) {
      if (
        error instanceof HomeAccessError &&
        error.code === "invalid_current_password"
      ) {
        await logAudit("HOME_ACCESS_CREDENTIALS_DENIED", actor.id, {
          reason: error.code,
          ip: req.ip,
        });
      }
      return answerHomeAccessError(res, error);
    }
  },
);

export default router;
