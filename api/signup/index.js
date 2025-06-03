const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../shared/auth');
const z = require('zod');

const prisma = new PrismaClient();

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['teacher', 'student'], 'Role must be teacher or student')
});

module.exports = async function (context, req) {
  try {
    const validationResult = signupSchema.safeParse(req.body || {});
    
    if (!validationResult.success) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "bad_request",
          details: validationResult.error.errors.map(e => e.message)
        }
      };
      return;
    }

    const { name, email, password, role } = validationResult.data;
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "email_taken"
        }
      };
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        xp: 0,
        level: 'Explorer',
        streak: 0
      }
    });
    
    const token = generateToken(newUser);
    
    context.res = {
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          xp: newUser.xp,
          level: newUser.level,
          streak: newUser.streak
        }
      }
    };
  } catch (error) {
    context.log.error("Error in signup function:", {
      error: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      requestBody: req.body ? { ...req.body, password: '[REDACTED]' } : 'undefined',
      envVars: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
    if (error.code === 'P2002') {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "email_taken"
        }
      };
      return;
    }
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: "An unexpected error occurred during signup. Please try again." 
      }
    };
  }
};
