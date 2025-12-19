// backend/src/routes/progress.ts
import { Router } from "express";
import { PrismaClient, ProgressStatus } from "@prisma/client";
import { requireAuth } from "../utils/auth";
import { checkUnlocks } from "../services/game";

const router = Router();
const prisma = new PrismaClient();

// Get progress for a student
router.get("/progress", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const progress = await prisma.progress.findMany({
    where: { studentId },
  });
  res.json(progress);
});

// Legacy endpoint for AuthContext (supports existing frontend)
router.get("/get-progress", requireAuth, async (req, res) => {
    // Return format expected by AuthContext
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const progress = await prisma.progress.findMany({ where: { studentId: req.user!.id } });
    res.json({ user, progress });
});

// Complete an activity
router.post("/progress/complete-activity", requireAuth, async (req, res) => {
  const studentId = req.user!.id;
  const { moduleSlug, lessonId, activityId, timeSpentS } = req.body;

  // 1. Upsert progress
  const existing = await prisma.progress.findFirst({
      where: { studentId, activityId }
  });

  if (existing && existing.status === ProgressStatus.COMPLETED) {
      return res.json({ message: "Already completed", progress: existing });
  }

  let finalProgress;
  if (existing) {
       finalProgress = await prisma.progress.update({
           where: { id: existing.id },
           data: { status: ProgressStatus.COMPLETED, timeSpentS: { increment: timeSpentS || 0 } }
       });
  } else {
       finalProgress = await prisma.progress.create({
           data: {
              studentId,
              moduleSlug,
              lessonId,
              activityId,
              status: ProgressStatus.COMPLETED,
              timeSpentS: timeSpentS || 0
           }
       });

       // Award XP
       await prisma.avatar.update({
           where: { studentId },
           data: { xp: { increment: 50 } }
       });

       await checkUnlocks(studentId);
  }

  res.json(finalProgress);
});

export default router;
