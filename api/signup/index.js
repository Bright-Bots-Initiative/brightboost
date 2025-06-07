module.exports = async function (context, req) {
  context.log('MINIMAL SIGNUP FUNCTION - Testing basic execution');
  
  try {
    context.log('Function started successfully');
    context.log('Node version:', process.version);
    context.log('Request method:', req.method);
    context.log('Request body:', req.body);
    
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Minimal signup function working",
        nodeVersion: process.version,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString(),
        test: "SUCCESS - Function execution confirmed"
      }
    };
    
    context.log('Response set successfully');

  } catch (error) {
    context.log.error('Minimal function error:', {
      message: error.message,
      stack: error.stack
    });
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        error: "Minimal function failed",
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    };
  }
};
