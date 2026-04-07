import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { requireAuth, requireRole } from "../utils/auth";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const createCourseSchema = z.object({
  name: z.string().min(1).max(200),
  defaultLanguage: z.enum(["en", "es"]).optional(),
  gradeBand: z.enum(["k2", "g3_5"]).optional(),
});

const setupIconsSchema = z.object({
  students: z.array(
    z.object({
      studentId: z.string().min(1),
      icon: z.string().min(1).max(4), // emoji
      pin: z.string().length(4).regex(/^\d{4}$/).optional(),
    }),
  ),
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
        gradeBand: parsed.data.gradeBand || "k2",
        defaultLanguage: parsed.data.defaultLanguage || "en",
      },
    });

    res.status(201).json({
      id: course.id,
      name: course.name,
      joinCode: course.joinCode,
      gradeBand: course.gradeBand,
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
      gradeBand: course.gradeBand,
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
// Teacher: update course
// ---------------------------------------------------------------------------

router.put(
  "/teacher/courses/:courseId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { name: parsed.data.name },
      include: { _count: { select: { enrollments: true } } },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      joinCode: updated.joinCode,
      enrollmentCount: updated._count.enrollments,
      createdAt: updated.createdAt,
    });
  },
);

// ---------------------------------------------------------------------------
// Teacher: delete course
// ---------------------------------------------------------------------------

router.delete(
  "/teacher/courses/:courseId",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId, teacherId: req.user!.id },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Delete related records first, then the course
    await prisma.$transaction([
      prisma.pulseResponse.deleteMany({ where: { courseId: course.id } }),
      prisma.enrollment.deleteMany({ where: { courseId: course.id } }),
      prisma.assignment.deleteMany({ where: { courseId: course.id } }),
      prisma.course.delete({ where: { id: course.id } }),
    ]);

    res.json({ message: "Course deleted" });
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
// Teacher: add K-2 students (no email/password required)
// ---------------------------------------------------------------------------

const addStudentsSchema = z.object({
  students: z.array(
    z.object({
      name: z.string().min(1).max(100),
      icon: z.string().min(1).max(4),
      pin: z
        .string()
        .length(4)
        .regex(/^\d{4}$/)
        .optional(),
    }),
  ),
});

router.post(
  "/teacher/courses/:courseId/add-students",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const parsed = addStudentsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const created: { id: string; name: string; icon: string }[] = [];

      for (const s of parsed.data.students) {
        const hashedPin = s.pin ? await bcrypt.hash(s.pin, 10) : null;

        const student = await prisma.user.create({
          data: {
            name: s.name,
            role: "student",
            loginIcon: s.icon,
            loginPin: hashedPin,
            preferredLanguage: course.defaultLanguage,
            accountMode: "CLASS_CODE_ONLY",
            homeAccessEnabled: false,
          },
        });

        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseId: course.id,
          },
        });

        created.push({ id: student.id, name: student.name, icon: s.icon });
      }

      res.status(201).json({ message: "Students created", students: created });
    } catch (error) {
      console.error("Add students error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Teacher: setup student login icons + optional PINs
// ---------------------------------------------------------------------------

router.post(
  "/teacher/courses/:courseId/setup-icons",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const parsed = setupIconsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      // Verify teacher owns the course
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
      });
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Update each student
      for (const s of parsed.data.students) {
        // Verify student is enrolled
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: s.studentId,
              courseId: course.id,
            },
          },
        });
        if (!enrollment) continue;

        const updateData: any = {
          loginIcon: s.icon,
          preferredLanguage: course.defaultLanguage,
        };

        if (s.pin) {
          updateData.loginPin = await bcrypt.hash(s.pin, 10);
        }

        await prisma.user.update({
          where: { id: s.studentId },
          data: updateData,
        });
      }

      res.json({ message: "Icons updated", count: parsed.data.students.length });
    } catch (error) {
      console.error("Setup icons error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Teacher: get login cards data for printing
// ---------------------------------------------------------------------------

router.get(
  "/teacher/courses/:courseId/login-cards",
  requireAuth,
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findFirst({
        where: { id: req.params.courseId, teacherId: req.user!.id },
        include: {
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  loginIcon: true,
                  loginPin: true,
                },
              },
            },
          },
        },
      });

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const cards = course.enrollments
        .filter((e) => e.student.loginIcon)
        .map((e) => ({
          name: e.student.name,
          icon: e.student.loginIcon,
          hasPin: !!e.student.loginPin,
        }));

      res.json({
        className: course.name,
        joinCode: course.joinCode,
        defaultLanguage: course.defaultLanguage,
        cards,
      });
    } catch (error) {
      console.error("Login cards error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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
