// backend/src/routes/context.ts
// Public endpoint for Task Ranker integration - returns live app signals
import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    // --- Activation rate ---
    // Students who have at least one progress record vs total students
    const totalStudents = await prisma.user.count({
      where: { role: "student" },
    });
    const activatedStudents = await prisma.user.count({
      where: {
        role: "student",
        progress: { some: {} },
      },
    });
    const activationRate =
      totalStudents > 0
        ? Math.round((activatedStudents / totalStudents) * 100) / 100
        : 0;

    // --- Teacher adoption ---
    // Teachers who have created at least one course vs total teachers
    const totalTeachers = await prisma.user.count({
      where: { role: "teacher" },
    });
    const activeTeachers = await prisma.user.count({
      where: {
        role: "teacher",
        courses: { some: {} },
      },
    });
    const teacherAdoption =
      totalTeachers > 0
        ? Math.round((activeTeachers / totalTeachers) * 100) / 100
        : 0;

    // --- Drop-off ---
    // Students who started (IN_PROGRESS) but never completed any activity
    const studentsWithProgress = await prisma.progress.groupBy({
      by: ["studentId"],
      _count: true,
    });

    const studentsWithCompleted = await prisma.progress.groupBy({
      by: ["studentId"],
      where: { status: "COMPLETED" },
      _count: true,
    });

    const startedCount = studentsWithProgress.length;
    const completedCount = studentsWithCompleted.length;
    const dropOff =
      startedCount > 0
        ? Math.round(((startedCount - completedCount) / startedCount) * 100) /
          100
        : 0;

    res.json({
      app: "Bright Boost",
      signals: [
        {
          type: "activation_rate",
          value: activationRate,
          label: `${Math.round(activationRate * 100)}% students activated`,
          boost: 2,
          threshold_dir: "below",
          threshold: 0.5,
        },
        {
          type: "drop_off",
          value: dropOff,
          label: `${Math.round(dropOff * 100)}% drop-off after first module`,
          boost: 3,
          threshold_dir: "above",
          threshold: 0.4,
        },
        {
          type: "teacher_adoption",
          value: teacherAdoption,
          label: `${Math.round(teacherAdoption * 100)}% of teachers set up class`,
          boost: 2,
          threshold_dir: "below",
          threshold: 0.6,
        },
      ],
    });
  } catch (err) {
    console.error("/context error:", err);
    res.status(500).json({ error: "Failed to compute signals" });
  }
});

export default router;
