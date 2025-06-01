const bcrypt = require('bcryptjs');
const prisma = require('../../prisma/client.cjs');
const { generateToken } = require('../shared/auth');

module.exports = async function (context, req) {
  try {
    context.log('Environment check:', {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    });

    if (!process.env.POSTGRES_URL) {
      context.log.error('POSTGRES_URL environment variable is missing');
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Database configuration error. Please contact support." 
        }
      };
      return;
    }

    if (!process.env.JWT_SECRET) {
      context.log.error('JWT_SECRET environment variable is missing');
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Authentication configuration error. Please contact support." 
        }
      };
      return;
    }

    const { name, email, password, role } = req.body || {};
    
    context.log('Signup request received:', { 
      hasName: !!name, 
      hasEmail: !!email, 
      hasPassword: !!password, 
      hasRole: !!role,
      role: role 
    });
    
    if (!name || !email || !password || !role) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Missing required fields. Please provide name, email, password, and role." 
        }
      };
      return;
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      context.res = {
        status: 409, // Conflict
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "A user with this email already exists." 
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
        level: role === 'student' ? 'Explorer' : null,
        streak: 0
      }
    });
    
    const token = generateToken(newUser);
    
    context.res = {
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
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    if (error.code === 'P1001') {
      context.log.error('Database connection failed - check POSTGRES_URL');
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Database connection error. Please contact support." 
        }
      };
      return;
    }
    
    if (error.code === 'P2002') {
      context.log.error('Unique constraint violation - duplicate email');
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "A user with this email already exists." 
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
