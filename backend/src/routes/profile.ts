import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth } from "../utils/auth";

const router = Router();

// Schemas
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  school: z.string().optional(),
  subject: z.string().optional(),
});

// GET /api/profile
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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

    // Map database fields to frontend UserProfile interface
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      school: user.school,
      subject: user.subject,
      role: user.role,
      avatar: user.avatarUrl,
      created_at: user.createdAt.toISOString(),
    };

    res.json(profile);
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/profile
router.put("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
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
      school: updatedUser.school,
      subject: updatedUser.subject,
      role: updatedUser.role,
      avatar: updatedUser.avatarUrl,
      created_at: updatedUser.createdAt.toISOString(),
    };

    res.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
