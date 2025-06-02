const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { generateToken } = require("../shared/auth");

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Missing required fields. Please provide email and password.",
        },
      };
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Invalid email or password.",
        },
      };
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Invalid email or password.",
        },
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
          streak: user.streak,
        },
      },
    };
  } catch (error) {
    context.log.error("Error in login function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: "An unexpected error occurred during login. Please try again.",
      },
    };
  }
};
