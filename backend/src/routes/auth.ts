import { Router, Request, Response } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";

const router = Router();

const SESSION_SECRET = process.env.SESSION_SECRET || "default_dev_secret";

// Schemas
const studentSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const teacherSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  school: z.string().optional(),
  subject: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// Helper to generate token
const generateToken = (user: { id: string; role: string }) => {
  return jwt.sign({ id: user.id, role: user.role }, SESSION_SECRET, {
    expiresIn: "7d",
  });
};

// Routes

// POST /signup/student
router.post("/signup/student", async (req: Request, res: Response) => {
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
});

// POST /signup/teacher
router.post("/signup/teacher", async (req: Request, res: Response) => {
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
});

// POST /login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password (check if hashed or plaintext)
    // Legacy/Seed users might have plaintext passwords, so we check both if needed
    // But standard practice is assumes hashed.
    // If the user provided plaintext in seed, bcrypt.compare will fail unless the hash in DB is actually plaintext (which it isn't, it's a hash string).
    // Wait, seed users might be plaintext if seeded that way.
    // Let's assume new users are hashed.
    // If bcrypt compare fails, and the password in DB matches exactly, we might allow it (migration/fallback).

    let isValid = await bcrypt.compare(data.password, user.password);

    // Fallback for plaintext passwords (common in dev/seed)
    // Security: Only attempt plaintext comparison if the stored password is NOT a bcrypt hash
    // (Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long)
    const isBcryptHash = user.password.startsWith("$2") && user.password.length === 60;
    const isDevOrTest = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

    // 🛡️ Sentinel: Only allow plaintext fallback in dev/test to prevent production credential downgrade attacks
    if (!isValid && !isBcryptHash && isDevOrTest && user.password === data.password) {
        isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

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

export default router;
