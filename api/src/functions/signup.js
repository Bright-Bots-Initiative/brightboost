const { app } = require('@azure/functions');
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

app.http('signup', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Signup function triggered');
    
    try {
      const validation = signupSchema.safeParse(await request.json());
      if (!validation.success) {
        return {
          status: 400,
          headers: { "Content-Type": "application/json" },
          jsonBody: { error: "Validation failed", details: validation.error.errors }
        };
      }

      const { name, email, password, role } = validation.data;

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return {
          status: 409,
          headers: { "Content-Type": "application/json" },
          jsonBody: { error: "User with this email already exists" }
        };
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

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      return {
        status: 201,
        headers: { "Content-Type": "application/json" },
        jsonBody: {
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
      
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        jsonBody: { 
          error: "Internal server error",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      };
    } finally {
      await prisma.$disconnect();
    }
  }
});
