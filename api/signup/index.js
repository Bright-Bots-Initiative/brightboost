const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../shared/auth');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    const { name, email, password, role } = req.body || {};
    
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
    context.log.error("Error in signup function:", error);
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
