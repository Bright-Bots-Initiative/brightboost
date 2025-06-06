const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const prisma = new PrismaClient();

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['student', 'teacher'], "Role must be either 'student' or 'teacher'")
});

module.exports = async function (context, req) {
  context.log('Signup function triggered');
  
  try {
    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
      };
      return;
    }

    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Validation failed", details: validation.error.errors }
      };
      return;
    }

    const { name, email, password, role } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { error: "User with this email already exists" }
      };
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        level: 'Explorer'
      }
    });

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    context.res = {
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          level: user.level
        },
        token
      }
    };

  } catch (error) {
    context.log.error('Signup error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
  } finally {
    await prisma.$disconnect();
  }
};
