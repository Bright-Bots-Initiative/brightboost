import { Router, Request, Response } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authLimiter } from "../utils/security";
import { logAudit } from "../utils/audit";

const router = Router();

const SESSION_SECRET = process.env.SESSION_SECRET || "default_dev_secret";

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
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email").max(255, "Email too long"),
  password: passwordSchema,
});

const teacherSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email").max(255, "Email too long"),
  password: passwordSchema,
  school: z.string().max(100, "School name too long").optional(),
  subject: z.string().max(100, "Subject name too long").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(1, "Password is required").max(100),
});

// Helper to generate token
const generateToken = (user: { id: string; role: string }) => {
  return jwt.sign({ id: user.id, role: user.role }, SESSION_SECRET, {
    expiresIn: "7d",
  });
};

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
          level: "Explorer", // Default for student
          // Initialize other fields as needed
        },
      });

      const token = generateToken(user);
      const { password, ...userWithoutPassword } = user;

      // 🛡️ Sentinel: Audit log
      await logAudit(user.id, "USER_SIGNUP", { role: "student", method: "email" });

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

      const token = generateToken(user);
      const { password, ...userWithoutPassword } = user;

      // 🛡️ Sentinel: Audit log
      await logAudit(user.id, "USER_SIGNUP", { role: "teacher", method: "email" });

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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password (check if hashed or plaintext)
    // Legacy/Seed users might have plaintext passwords, so we check both if needed
    // But standard practice is assumes hashed.
    // If the user provided plaintext in seed, bcrypt.compare will fail unless the hash in DB is actually plaintext (which it isn't, it's a hash string).
    // Wait, seed users might be plaintext if seeded that way.
    // Let's assume new users are hashed.
    // If bcrypt compare fails, and the password in DB matches exactly, we might allow it (migration/fallback).

    const isValid = await bcrypt.compare(data.password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    const { password, ...userWithoutPassword } = user;

    // 🛡️ Sentinel: Audit log
    await logAudit(user.id, "USER_LOGIN", { method: "email" });

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

export default router;
