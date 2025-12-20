// backend/src/routes/progress.ts
import { Router } from "express";
import { PrismaClient, ProgressStatus } from "@prisma/client";
import { requireAuth } from "../utils/auth";
import { checkUnlocks } from "../services/game";
import {
  checkpointSchema,
  assessmentSubmitSchema,
} from "../validation/schemas";
import { upsertCheckpoint, getAggregatedProgress } from "../services/progress";
import { submitAssessment } from "../services/assessment";

const router = Router();
const prisma = new PrismaClient();

// Get progress for a student (MVP)
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

// Complete an activity (MVP)
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

       await prisma.avatar.update({
           where: { studentId },
           data: { xp: { increment: 50 } }
       });

       await checkUnlocks(studentId);
  }

  res.json(finalProgress);
});

// Legacy / Comprehensive Routes (with validation)

router.get("/progress/:studentId", requireAuth, async (req, res) => {
  const studentId = req.params.studentId;

  // Authorization check: User can only access their own progress, unless they are admin/teacher
  if (req.user!.id !== studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  const moduleSlug = (req.query.module as string) || "stem-1";
  try {
    const result = await getAggregatedProgress(studentId, moduleSlug);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/progress/checkpoint", requireAuth, async (req, res) => {
  const parse = checkpointSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  // Authorization check
  if (req.user!.id !== parse.data.studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const saved = await upsertCheckpoint(parse.data);
    res.json({
      ok: true,
      id: saved.id,
      timeSpentS: saved.timeSpentS,
      status: saved.status,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/assessment/submit", requireAuth, async (req, res) => {
  const parse = assessmentSubmitSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  // Authorization check
  if (req.user!.id !== parse.data.studentId && req.user!.role === "student") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const result = await submitAssessment(parse.data);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
