const bcrypt = require('bcryptjs');
const prisma = require('../../prisma/client.cjs');
const { generateToken } = require('../shared/auth');

module.exports = async function (context, req) {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Missing required fields. Please provide email and password." 
        }
      };
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Invalid email or password." 
        }
      };
      return;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Invalid email or password." 
        }
      };
      return;
    }
    
    const token = generateToken(user);
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          xp: user.xp,
          level: user.level,
          streak: user.streak
        }
      }
    };
  } catch (error) {
    context.log.error("Error in login function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? "An unexpected error occurred during login. Please try again." 
          : `Error: ${error.message}\nStack: ${error.stack}\nPOSTGRES_URL: ${process.env.POSTGRES_URL ? 'Set' : 'Not set'}\nJWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`
      }
    };
  }
};
