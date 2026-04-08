import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authLimiter } from "../utils/security";
import { logAudit } from "../utils/audit";
import { generateToken } from "../utils/token";
import { nameSchema, safeString, emailSchema } from "../validation/schemas";
import { sendPasswordResetEmail } from "../utils/mail";

const router = Router();

// 🛡️ Sentinel: Pre-calculated hash for timing-safe user lookups.
// This ensures that valid/invalid user lookups take roughly the same amount of time.
// Generated with bcrypt cost 10.
const DUMMY_HASH =
  "$2b$10$JIuf8WbA.Ni58wGtmscGveaFfGo.9Jf.uSS7PNgdHJd3w3/Aun8Na";

// Schemas
// 🛡️ Sentinel: Enforce strong password policy
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const studentSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const teacherSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  school: safeString.max(100, "School name too long").optional(),
  subject: safeString.max(100, "Subject name too long").optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(100),
});

// Routes

// POST /signup/student
router.post(
  "/signup/student",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const data = studentSignupSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: "student",
          level: "Explorer",
          accountMode: "EMAIL_ONLY",
        },
      });

      // 🛡️ Sentinel: Audit Log
      await logAudit("USER_SIGNUP", user.id, {
        email: user.email,
        role: user.role,
      });

      const token = generateToken(user);
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({
        message: "Student account created",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /signup/teacher
router.post(
  "/signup/teacher",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const data = teacherSignupSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: "teacher",
          school: data.school,
          subject: data.subject,
        },
      });

      // 🛡️ Sentinel: Audit Log
      await logAudit("USER_SIGNUP", user.id, {
        email: user.email,
        role: user.role,
      });

      const token = generateToken(user);
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({
        message: "Teacher account created",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /login
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // 🛡️ Sentinel: Prevent Timing Attack
      // Even if user is not found, we perform a hash comparison to consume time.
      // This prevents attackers from guessing valid emails based on response time.
      await bcrypt.compare(data.password, DUMMY_HASH);

      // 🛡️ Sentinel: Audit Log Failed Login (User Not Found)
      await logAudit("LOGIN_FAILED", null, {
        email: data.email,
        reason: "user_not_found",
        ip: req.ip,
      });

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Class-code-only students have no password — reject email login
    if (!user.password) {
      await logAudit("LOGIN_FAILED", user.id, {
        email: user.email,
        reason: "no_password_set",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // All passwords are bcrypt-hashed (seed.cjs hashes on insert and repairs legacy plaintext)
    const isValid = await bcrypt.compare(data.password, user.password);

    if (!isValid) {
      // 🛡️ Sentinel: Audit Log Failed Login (Invalid Password)
      await logAudit("LOGIN_FAILED", user.id, {
        email: user.email,
        reason: "invalid_password",
        ip: req.ip,
      });

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 🛡️ Sentinel: Audit Log
    await logAudit("USER_LOGIN", user.id, { email: user.email, ip: req.ip });

    const token = generateToken(user);
    const { password, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/lookup-code — check if a code is a K-8 class or Pathways cohort
router.post("/auth/lookup-code", async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required" });
  }

  const upperCode = code.trim().toUpperCase();

  // Check K-8 class first
  const course = await prisma.course.findFirst({
    where: { joinCode: { equals: upperCode, mode: "insensitive" } },
    select: { id: true, name: true, joinCode: true },
  });
  if (course) {
    return res.json({ type: "k8_class", id: course.id, name: course.name });
  }

  // Check Pathways cohort
  const cohort = await prisma.pathwayCohort.findFirst({
    where: { joinCode: { equals: upperCode, mode: "insensitive" } },
    select: { id: true, name: true, band: true, joinCode: true },
  });
  if (cohort) {
    return res.json({ type: "pathways_cohort", id: cohort.id, name: cohort.name, band: cohort.band });
  }

  return res.status(404).json({ error: "Invalid code. Please check and try again." });
});

// POST /auth/register-pathways — register a Pathways student via cohort code
const registerPathwaysSchema = z.object({
  cohortCode: z.string().min(1),
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).max(100),
  birthYear: z.number().int().min(1990).max(2015),
});

router.post("/auth/register-pathways", async (req: Request, res: Response) => {
  try {
    const data = registerPathwaysSchema.parse(req.body);

    // Look up cohort
    const cohort = await prisma.pathwayCohort.findFirst({
      where: { joinCode: { equals: data.cohortCode.trim().toUpperCase(), mode: "insensitive" } },
    });
    if (!cohort) {
      return res.status(404).json({ error: "Invalid cohort code." });
    }

    // Generate placeholder email if not provided
    const email = data.email || `student_${Math.random().toString(36).substring(2, 8)}@brightboost.local`;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists. Try logging in instead." });
    }

    // Derive age band from birth year
    const currentYear = new Date().getFullYear();
    const age = currentYear - data.birthYear;
    let ageBand: string;
    if (age >= 16) ageBand = "launch";
    else ageBand = "explorer";

    // Create user
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.displayName,
        email,
        password: hashedPassword,
        role: "student",
        userType: "pathways",
        ageBand,
        birthYear: data.birthYear,
      },
    });

    // Enroll in cohort
    await prisma.pathwayEnrollment.create({
      data: { userId: user.id, cohortId: cohort.id },
    });

    await logAudit("PATHWAYS_REGISTER", user.id, { email, cohortId: cohort.id });

    const token = generateToken(user);
    const { password, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      token,
      cohort: { id: cohort.id, name: cohort.name, band: cohort.band },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
    }
    console.error("Pathways registration error:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /auth/pathways-code-login — Pathways student login via cohort code + name + password
router.post("/auth/pathways-code-login", async (req: Request, res: Response) => {
  const { cohortCode, userId, password } = req.body;
  if (!cohortCode || !userId || !password) {
    return res.status(400).json({ error: "Code, user, and password required." });
  }

  const cohort = await prisma.pathwayCohort.findFirst({
    where: { joinCode: { equals: cohortCode.trim().toUpperCase(), mode: "insensitive" } },
  });
  if (!cohort) return res.status(404).json({ error: "Invalid code." });

  const enrollment = await prisma.pathwayEnrollment.findFirst({
    where: { userId, cohortId: cohort.id },
    include: { user: true },
  });
  if (!enrollment) return res.status(404).json({ error: "Not found in this cohort." });

  if (!enrollment.user.password) return res.status(401).json({ error: "No password set." });

  const isValid = await bcrypt.compare(password, enrollment.user.password);
  if (!isValid) return res.status(401).json({ error: "Invalid password." });

  const token = generateToken(enrollment.user);
  const { password: _, ...userWithoutPassword } = enrollment.user;
  res.json({ user: userWithoutPassword, token, cohort: { id: cohort.id, name: cohort.name, band: cohort.band } });
});

// GET /auth/cohort-roster/:code — list students in a Pathways cohort (for code-based login)
router.get("/auth/cohort-roster/:code", async (req: Request, res: Response) => {
  const cohort = await prisma.pathwayCohort.findFirst({
    where: { joinCode: { equals: req.params.code.toUpperCase(), mode: "insensitive" } },
    include: {
      enrollments: {
        where: { status: "active" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!cohort) return res.status(404).json({ error: "Invalid code." });
  res.json({
    cohortId: cohort.id,
    cohortName: cohort.name,
    students: cohort.enrollments.map((e) => ({ id: e.user.id, name: e.user.name })),
  });
});

// POST /forgot-password
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

router.post(
  "/forgot-password",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);

      // Always return success to prevent email enumeration
      const successMsg =
        "If that email exists, a reset link has been sent.";

      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return res.json({ message: successMsg });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      const frontendUrl =
        process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(data.email, resetUrl);

      await logAudit("PASSWORD_RESET_REQUESTED", user.id, {
        email: user.email,
        ip: req.ip,
      });

      res.json({ message: successMsg });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /reset-password
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

router.post(
  "/reset-password",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const data = resetPasswordSchema.parse(req.body);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: data.token },
        include: { user: true },
      });

      if (
        !resetToken ||
        resetToken.usedAt ||
        resetToken.expiresAt < new Date()
      ) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      await logAudit("PASSWORD_RESET_COMPLETED", resetToken.userId, {
        email: resetToken.user.email,
        ip: req.ip,
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
