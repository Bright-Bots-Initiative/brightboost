import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";
import { logAudit } from "../utils/audit";

const router = Router();

// Validation schema for updating profile
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .optional(),
  school: z.string().max(100, "School name too long").optional(),
  subject: z.string().max(100, "Subject name too long").optional(),
});

// GET /profile
router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Safe assertion due to requireAuth

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        subject: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Map to UserProfile interface expected by frontend
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      school: user.school || undefined,
      subject: user.subject || undefined,
      role: user.role,
      avatar: user.avatarUrl || undefined,
      created_at: user.createdAt.toISOString(),
    };

    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id - Get specific user's profile
// 🛡️ Sentinel: Ported from dead code in user.ts and secured.
router.get("/users/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;
    const targetUserId = req.params.id as string;

    // Authorization Check
    const isSelf = requesterId === targetUserId;
    const isTeacher = requesterRole === "teacher";
    const isAdmin = requesterRole === "admin";

    // 🛡️ Sentinel: MVP Logic - Allow any teacher to view any student.
    // TODO: In production, verify that the student belongs to the teacher's class.
    if (!isSelf && !isTeacher && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: true,
        subject: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school,
      subject: user.subject,
      avatar: user.avatarUrl,
      created_at: user.createdAt.toISOString(),
    };

    res.json(profile);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /edit-profile (or PUT /profile)
router.post(
  "/edit-profile",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const data = updateProfileSchema.parse(req.body);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          school: data.school,
          subject: data.subject,
        },
        select: {
          id: true,
          name: true,
          email: true,
          school: true,
          subject: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      const profile = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        school: updatedUser.school || undefined,
        subject: updatedUser.subject || undefined,
        role: updatedUser.role,
        avatar: updatedUser.avatarUrl || undefined,
        created_at: updatedUser.createdAt.toISOString(),
      };

      // 🛡️ Sentinel: Audit log
      await logAudit(userId, "PROFILE_UPDATE", { changed: Object.keys(data) });

      res.json({ success: true, user: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
