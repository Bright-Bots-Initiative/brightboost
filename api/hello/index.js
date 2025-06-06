module.exports = async function (context, req) {
  context.log('Hello function triggered - basic diagnostic');
  
  try {
    const diagnostic = {
      message: "Hello, World! Azure Functions is working.",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      envVarsCount: Object.keys(process.env).length,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'undefined'
    };

    context.log('Diagnostic info:', JSON.stringify(diagnostic, null, 2));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: diagnostic
    };

  } catch (error) {
    context.log.error('Hello function error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "Function execution failed",
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    };
  }
};
