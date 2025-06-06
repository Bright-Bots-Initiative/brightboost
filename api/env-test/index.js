module.exports = async function (context, req) {
  context.log('Environment test function triggered');
  
  const envVars = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('POSTGRES') || 
      key.includes('DATABASE') || 
      key.includes('JWT') || 
      key.includes('NODE')
    )
  };

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      message: "Environment variable diagnostic",
      variables: envVars,
      timestamp: new Date().toISOString()
    }
  };
};
