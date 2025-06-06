const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../shared/auth');
const { z } = require('zod');

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not configured');
}

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

module.exports = async function (context, req) {
  context.log('Login function triggered');
  
  try {
    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
      };
      return;
    }

    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Validation failed", details: validation.error.errors }
      };
      return;
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { error: "Invalid email or password" }
      };
      return;
    }

    const token = generateToken(user);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Login successful",
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
    context.log.error('Login error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    };
  } finally {
    await prisma.$disconnect();
  }
};
