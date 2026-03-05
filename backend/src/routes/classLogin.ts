import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authLimiter } from "../utils/security";
import { logAudit } from "../utils/audit";
import { generateToken } from "../utils/token";

const router = Router();

// 🛡️ Sentinel: Pre-calculated hash for timing-safe PIN checks
const DUMMY_PIN_HASH =
  "$2b$10$JIuf8WbA.Ni58wGtmscGveaFfGo.9Jf.uSS7PNgdHJd3w3/Aun8Na";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const classLoginSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  pin: z.string().length(4).optional(),
});

// ---------------------------------------------------------------------------
// GET /api/classes/by-code/:code — Public lookup for class-code login
// ---------------------------------------------------------------------------

router.get(
  "/classes/by-code/:code",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const code = req.params.code.toUpperCase().trim();

      const course = await prisma.course.findUnique({
        where: { joinCode: code },
        include: {
          teacher: { select: { name: true } },
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
        return res.status(404).json({ error: "Class not found" });
      }

      // Only return students who have loginIcon set (class-code students)
      const students = course.enrollments
        .filter((e) => e.student.loginIcon)
        .map((e) => ({
          id: e.student.id,
          name: e.student.name,
          loginIcon: e.student.loginIcon,
          hasPin: !!e.student.loginPin,
        }));

      res.json({
        courseId: course.id,
        className: course.name,
        teacherName: course.teacher.name,
        defaultLanguage: course.defaultLanguage,
        students,
      });
    } catch (error) {
      console.error("Class lookup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/auth/class-login — Class code login for K-2 students
// ---------------------------------------------------------------------------

router.post(
  "/auth/class-login",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const parsed = classLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const { courseId, studentId, pin } = parsed.data;

      // Verify student exists, is enrolled, and has loginIcon
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              loginIcon: true,
              loginPin: true,
              level: true,
              xp: true,
              streak: true,
              avatarUrl: true,
              preferredLanguage: true,
            },
          },
        },
      });

      if (!enrollment || !enrollment.student.loginIcon) {
        // Timing-safe: still do a hash comparison
        await bcrypt.compare("0000", DUMMY_PIN_HASH);
        await logAudit("CLASS_LOGIN_FAILED", null, {
          courseId,
          studentId,
          reason: "not_found_or_no_icon",
          ip: req.ip,
        });
        return res.status(401).json({ error: "Student not found in class" });
      }

      const student = enrollment.student;

      // If student has a PIN, verify it
      if (student.loginPin) {
        const pinToCheck = pin || "";
        const isValid = await bcrypt.compare(pinToCheck, student.loginPin);
        if (!isValid) {
          await logAudit("CLASS_LOGIN_FAILED", student.id, {
            courseId,
            reason: "invalid_pin",
            ip: req.ip,
          });
          return res.status(401).json({ error: "Wrong PIN" });
        }
      } else {
        // No PIN set — timing-safe dummy compare
        await bcrypt.compare("0000", DUMMY_PIN_HASH);
      }

      // Success — generate token
      await logAudit("CLASS_LOGIN", student.id, {
        courseId,
        ip: req.ip,
      });

      const token = generateToken(student);

      // Return user without sensitive fields
      const { loginPin, ...userWithoutPin } = student;

      res.json({
        message: "Login successful",
        user: userWithoutPin,
        token,
      });
    } catch (error) {
      console.error("Class login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
