module.exports = async function (context, req) {
 devin/1749186500-diagnostic-environment-check
  context.log('Hello function triggered - checking environment variables');
  
  try {
    const envDiagnostic = {
      message: "Environment Variable Diagnostic",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      environmentVariables: {
        POSTGRES_URL: {
          present: !!process.env.POSTGRES_URL,
          value: process.env.POSTGRES_URL ? 'SET' : 'UNSET',
          length: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0
        },
        DATABASE_URL: {
          present: !!process.env.DATABASE_URL,
          value: process.env.DATABASE_URL ? 'SET' : 'UNSET',
          length: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
        },
        JWT_SECRET: {
          present: !!process.env.JWT_SECRET,
          value: process.env.JWT_SECRET ? 'SET' : 'UNSET',
          length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
        },
        NODE_ENV: {
          present: !!process.env.NODE_ENV,
          value: process.env.NODE_ENV || 'UNSET'
        }
      },
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('POSTGRES') || 
        key.includes('DATABASE') || 
        key.includes('JWT') || 
        key.includes('NODE') ||
        key.includes('AZURE') ||
        key.includes('WEBSITE')
      ).sort(),
      totalEnvVars: Object.keys(process.env).length
    };

    context.log('Environment diagnostic:', JSON.stringify(envDiagnostic, null, 2));

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
 main

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
 devin/1749186500-diagnostic-environment-check
      body: envDiagnostic

      body: diagnostic
 main
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
