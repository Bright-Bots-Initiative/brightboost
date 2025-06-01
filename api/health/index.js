module.exports = async function (context, req) {
  context.log('Health check endpoint called');
  
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV || 'undefined'
      }
    }
  };
};
