module.exports = async function (context, req) {
  try {
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: "Environment test successful",
        env: {
          nodeEnv: process.env.NODE_ENV,
          postgresUrl: process.env.POSTGRES_URL ? "Set (redacted)" : "Not set",
          jwtSecret: process.env.JWT_SECRET ? "Set (redacted)" : "Not set",
          allEnvVars: Object.keys(process.env),
        },
      },
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        message: "Environment test failed",
        error: error.message,
        stack: error.stack,
      },
    };
  }
};
