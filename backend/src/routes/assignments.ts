import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  activityId: z.string().min(1).max(100),
  dueDate: z.string().min(1).max(30),
});

// ---------------------------------------------------------------------------
// Teacher: create assignment (launch session)
// ---------------------------------------------------------------------------

router.post(
  "/teacher/courses/:courseId/assignments",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        activityId: parsed.data.activityId,
        dueDate: parsed.data.dueDate,
        status: "Open",
        courseId: course.id,
      },
    });

    res.status(201).json(assignment);
  },
);

// ---------------------------------------------------------------------------
// Teacher: list assignments with stats
// ---------------------------------------------------------------------------

router.get(
  "/teacher/courses/:courseId/assignments",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    // Verify course ownership
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const enrolledCount = course._count.enrollments;

    const assignments = await prisma.assignment.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { createdAt: "desc" },
    });

    // For each assignment with an activityId, compute stats from Progress
    const enrolledStudentIds = enrolledCount > 0
      ? (
          await prisma.enrollment.findMany({
            where: { courseId: req.params.courseId },
            select: { studentId: true },
          })
        ).map((e) => e.studentId)
      : [];

    const result = await Promise.all(
      assignments.map(async (a) => {
        let completedCount = 0;
        let avgTimeSpentS = 0;

        if (a.activityId && enrolledStudentIds.length > 0) {
          const progressRecords = await prisma.progress.findMany({
            where: {
              activityId: a.activityId,
              studentId: { in: enrolledStudentIds },
              status: "COMPLETED",
            },
            select: { timeSpentS: true },
          });

          completedCount = progressRecords.length;
          if (completedCount > 0) {
            const totalTime = progressRecords.reduce(
              (sum, p) => sum + p.timeSpentS,
              0,
            );
            avgTimeSpentS = Math.round(totalTime / completedCount);
          }
        }

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          activityId: a.activityId,
          dueDate: a.dueDate,
          status: a.status,
          enrolledCount,
          completedCount,
          avgTimeSpentS,
          createdAt: a.createdAt,
        };
      }),
    );

    res.json(result);
  },
);

// ---------------------------------------------------------------------------
// Student: list active assignments for enrolled courses
// ---------------------------------------------------------------------------

router.get(
  "/student/assignments",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    // Find all courses the student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      select: { courseId: true, course: { select: { name: true } } },
    });

    if (enrollments.length === 0) {
      return res.json([]);
    }

    const courseIds = enrollments.map((e) => e.courseId);
    const courseNameMap = new Map(
      enrollments.map((e) => [e.courseId, e.course.name]),
    );

    // Get all open assignments for enrolled courses
    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: "Open",
      },
      orderBy: { createdAt: "desc" },
    });

    // For each assignment, check if student already completed it
    const result = await Promise.all(
      assignments.map(async (a) => {
        let completed = false;
        if (a.activityId) {
          const progress = await prisma.progress.findUnique({
            where: {
              studentId_activityId: {
                studentId: req.user!.id,
                activityId: a.activityId,
              },
            },
          });
          completed = progress?.status === "COMPLETED";
        }

        // Try to resolve the activity to get navigation info
        let activityTitle = a.title;
        let moduleSlug: string | null = null;
        let lessonId: string | null = null;

        if (a.activityId) {
          const activity = await prisma.activity.findUnique({
            where: { id: a.activityId },
            include: {
              Lesson: {
                include: {
                  Unit: {
                    include: { Module: { select: { slug: true } } },
                  },
                },
              },
            },
          });
          if (activity) {
            activityTitle = activity.title;
            lessonId = activity.lessonId;
            moduleSlug = activity.Lesson?.Unit?.Module?.slug ?? null;
          }
        }

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          activityId: a.activityId,
          activityTitle,
          moduleSlug,
          lessonId,
          dueDate: a.dueDate,
          courseName: courseNameMap.get(a.courseId) ?? "",
          completed,
        };
      }),
    );

    res.json(result);
  },
);

export default router;
