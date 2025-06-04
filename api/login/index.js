const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../shared/auth');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  context.log('Login function triggered');
  
  try {
    if (!process.env.POSTGRES_URL || !process.env.JWT_SECRET) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: "Server configuration error" }
      };
      return;
    }

    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
      };
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Email and password are required" }
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
        body: { error: "Invalid credentials" }
      };
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { error: "Invalid credentials" }
      };
      return;
    }

    const token = generateToken(user);

    context.res = {
      status: 200,
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
    context.log.error('Login error:', error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Internal server error" }
    };
  }
};
