module.exports = async function (context, req) {
  context.log('Hello function triggered - comprehensive environment variable diagnostic');
  
  try {
    const envDiagnostic = {
      message: "Comprehensive Environment Variable Diagnostic",
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
      totalEnvVars: Object.keys(process.env).length,
      basicInfo: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV || 'undefined'
      }
    };

    context.log('Environment diagnostic:', JSON.stringify(envDiagnostic, null, 2));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: envDiagnostic
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
