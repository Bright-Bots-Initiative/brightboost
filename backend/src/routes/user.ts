import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";

const router = Router();

// Schemas
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  school: z.string().optional(),
  subject: z.string().optional(),
});

// GET /profile - Get current user's profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    // req.user is populated by authenticateToken or devRoleShim
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    // Map database fields to UserProfile interface expected by frontend
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
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /edit-profile - Update current user's profile
router.post("/edit-profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.school && { school: data.school }),
        ...(data.subject && { subject: data.subject }),
      },
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

    res.json({ success: true, user: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id - Get specific user's profile (for teachers to view students)
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).user?.id;
    const targetUserId = req.params.id;

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check permissions:
    // 1. User viewing their own profile
    // 2. Teacher viewing a student (simplified check: requester is teacher)
    // Ideally check if student is in teacher's class, but for MVP/Mock replacement:

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });

    if (requesterId !== targetUserId && requester?.role !== "teacher") {
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

export default router;
