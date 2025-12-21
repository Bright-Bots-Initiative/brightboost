// backend/src/routes/progress.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
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

enum ProgressStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get progress for a student (HEAD behavior)
router.get("/progress", async (req, res) => {
  const studentId = req.user!.id;
  const progress = await prisma.progress.findMany({
    where: { studentId },
  });
  res.json(progress);
});

// New Weekly Snapshot Endpoint
router.get("/progress/weekly", async (req, res) => {
  try {
    const studentId = req.user!.id;

    // Determine last full week_id.
    // Using ISO week logic: "YYYY-WW"
    const now = new Date();
    // Assuming "last full week" means the previous week.
    // If today is Monday, last full week is last week.
    // Let's implement a simple helper or use a library if available.
    // Since I can't import moment/date-fns easily without checking deps:

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const year = oneWeekAgo.getUTCFullYear();

    // Simple week number calculation
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (oneWeekAgo.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getUTCDay() + 1) / 7);

    const weekId = `${year}-${weekNum.toString().padStart(2, '0')}`;

    // Query snapshot
    let snapshot = await prisma.weeklySnapshot.findUnique({
      where: {
        studentId_weekId: {
          studentId,
          weekId
        }
      }
    });

    if (snapshot) {
      return res.json(snapshot);
    }

    // Create placeholder
    // Using upsert to ensure idempotency if concurrent requests happen
    snapshot = await prisma.weeklySnapshot.upsert({
      where: {
        studentId_weekId: {
          studentId,
          weekId
        }
      },
      update: {}, // No update if exists
      create: {
        studentId,
        weekId,
        dominantRegime: "UNKNOWN",
        userMetrics: {},
        systemMetrics: {},
        synthesis: "Snapshot will populate after scans and executions.",
        isPlaceholder: true
      }
    });

    return res.json(snapshot);

  } catch (e: any) {
    // 503/502 handling as requested
    console.error("Weekly snapshot error:", e);

    if (e.code === 'P2002') {
       // Unique constraint violation race condition, try fetching again
       // But upsert handles this usually.
    }

    if (e.message && (e.message.includes("API key") || e.message.includes("authentication"))) {
       return res.status(503).json({ error: "Supabase key invalid or mismatched; check SUPABASE_URL + SUPABASE_* keys." });
    }

    return res.status(503).json({ error: "Service unavailable", details: e.message });
  }
});

// Legacy endpoint for AuthContext (supports existing frontend)
router.get("/get-progress", async (req, res) => {
    // Return format expected by AuthContext
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const progress = await prisma.progress.findMany({ where: { studentId: req.user!.id } });
    res.json({ user, progress });
});

// Get aggregated progress for a specific student (Origin behavior)
router.get("/progress/:studentId", async (req, res) => {
  const studentId = req.params.studentId;

  // Authorization check: User can only access their own progress, unless they are admin/teacher
  // Note: req.user is guaranteed by requireAuth
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

// Complete an activity (HEAD behavior)
router.post("/progress/complete-activity", async (req, res) => {
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

// Checkpoint (Origin behavior)
router.post("/progress/checkpoint", async (req, res) => {
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

// Assessment submit (Origin behavior)
router.post("/assessment/submit", async (req, res) => {
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
