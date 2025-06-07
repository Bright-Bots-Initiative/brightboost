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
  context.log('Signup function triggered - comprehensive diagnostic');
  
  try {
    context.log('Environment check:', {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV
    });

    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
      };
      return;
    }

    context.log('Request body received:', req.body);

    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      context.log('Validation failed:', validation.error.errors);
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Validation failed", details: validation.error.errors }
      };
      return;
    }

    const { name, email, password, role } = validation.data;
    context.log('Validation passed for user:', { name, email, role });

    context.log('Attempting database connection...');
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    context.log('Database query completed, existing user:', !!existingUser);

    if (existingUser) {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { error: "User with this email already exists" }
      };
      return;
    }

    context.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    context.log('Password hashed successfully');

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    context.log('Creating user in database...');
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        level: 'Explorer'
      }
    });
    context.log('User created successfully with ID:', user.id);

    context.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    context.log('JWT token generated successfully');

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
    context.log.error('Signup error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "Internal server error",
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }
    };
  } finally {
    try {
      await prisma.$disconnect();
      context.log('Prisma disconnected successfully');
    } catch (disconnectError) {
      context.log.error('Prisma disconnect error:', disconnectError);
    }
  }
};
