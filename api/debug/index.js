module.exports = async function (context, req) {
  try {
    const envVars = {
      nodeEnv: process.env.NODE_ENV || 'not set',
      postgresUrl: process.env.POSTGRES_URL ? 'Set (redacted)' : 'Not set',
      jwtSecret: process.env.JWT_SECRET ? 'Set (redacted)' : 'Not set',
      allEnvVars: Object.keys(process.env)
    };
    
    let prismaStatus = 'Not loaded';
    let dbConnectionStatus = 'Not tested';
    let dbError = null;
    
    try {
      const prisma = require('../../prisma/client.cjs');
      prismaStatus = 'Loaded successfully';
      
      try {
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        dbConnectionStatus = 'Connected successfully';
      } catch (dbErr) {
        dbConnectionStatus = 'Connection failed';
        dbError = {
          message: dbErr.message,
          code: dbErr.code,
          meta: dbErr.meta
        };
      } finally {
        await prisma.$disconnect();
      }
    } catch (prismaErr) {
      prismaStatus = `Error loading: ${prismaErr.message}`;
    }
    
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: "Debug information",
        timestamp: new Date().toISOString(),
        environment: envVars,
        prisma: {
          status: prismaStatus,
          dbConnection: dbConnectionStatus,
          error: dbError
        },
        moduleType: typeof require === 'function' ? 'CommonJS' : 'ES Module'
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        message: "Debug failed",
        error: error.message,
        stack: error.stack
      }
    };
  }
};
