const prisma = require('../../prisma/client');

module.exports = async function (context, req) {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: "Database connection successful",
        env: {
          nodeEnv: process.env.NODE_ENV,
          postgresUrl: process.env.POSTGRES_URL ? "Set (redacted)" : "Not set",
          jwtSecret: process.env.JWT_SECRET ? "Set (redacted)" : "Not set"
        },
        result: result
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        message: "Database connection failed",
        error: error.message,
        stack: error.stack,
        env: {
          nodeEnv: process.env.NODE_ENV,
          postgresUrl: process.env.POSTGRES_URL ? "Set (redacted)" : "Not set",
          jwtSecret: process.env.JWT_SECRET ? "Set (redacted)" : "Not set"
        }
      }
    };
  }
};
