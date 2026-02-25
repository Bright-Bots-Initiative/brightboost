import { Router, Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createCourseSchema = z.object({
  name: z.string().min(1).max(200),
});

const joinCourseSchema = z.object({
  joinCode: z.string().min(1).max(50),
});

// ---------------------------------------------------------------------------
// Teacher: list courses
// ---------------------------------------------------------------------------

router.get(
  "/teacher/courses",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const courses = await prisma.course.findMany({
      where: { teacherId: req.user!.id },
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = courses.map((c) => ({
      id: c.id,
      name: c.name,
      joinCode: c.joinCode,
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt,
    }));

    res.json(result);
  },
);

// ---------------------------------------------------------------------------
// Teacher: create course
// ---------------------------------------------------------------------------

router.post(
  "/teacher/courses",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    // Generate a short readable join code (6 chars uppercase alphanumeric)
    const joinCode = generateJoinCode();

    const course = await prisma.course.create({
      data: {
        name: parsed.data.name,
        teacherId: req.user!.id,
        joinCode,
      },
    });

    res.status(201).json({
      id: course.id,
      name: course.name,
      joinCode: course.joinCode,
      enrollmentCount: 0,
      createdAt: course.createdAt,
    });
  },
);

// ---------------------------------------------------------------------------
// Teacher: get single course detail
// ---------------------------------------------------------------------------

router.get(
  "/teacher/courses/:courseId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
      include: {
        enrollments: {
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({
      id: course.id,
      name: course.name,
      joinCode: course.joinCode,
      enrollmentCount: course.enrollments.length,
      students: course.enrollments.map((e) => ({
        id: e.student.id,
        name: e.student.name,
        email: e.student.email,
        enrolledAt: e.enrolledAt,
      })),
      createdAt: course.createdAt,
    });
  },
);

// ---------------------------------------------------------------------------
// Student: join course by code
// ---------------------------------------------------------------------------

router.post(
  "/student/join-course",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const parsed = joinCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const course = await prisma.course.findUnique({
      where: { joinCode: parsed.data.joinCode },
    });

    if (!course) {
      return res.status(404).json({ error: "Invalid join code" });
    }

    // Check for existing enrollment
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: req.user!.id,
          courseId: course.id,
        },
      },
    });

    if (existing) {
      return res.json({
        message: "Already enrolled",
        courseId: course.id,
        courseName: course.name,
      });
    }

    await prisma.enrollment.create({
      data: {
        studentId: req.user!.id,
        courseId: course.id,
      },
    });

    res.status(201).json({
      message: "Enrolled successfully",
      courseId: course.id,
      courseName: course.name,
    });
  },
);

// ---------------------------------------------------------------------------
// Student: list enrolled courses
// ---------------------------------------------------------------------------

router.get(
  "/student/courses",
  requireAuth,
  requireRole("student"),
  async (req: Request, res: Response) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        course: { select: { id: true, name: true } },
      },
    });

    res.json(
      enrollments.map((e) => ({
        courseId: e.course.id,
        courseName: e.course.name,
        enrolledAt: e.enrolledAt,
      })),
    );
  },
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 ambiguity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default router;
