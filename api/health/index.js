module.exports = async function (context, req) {
  context.log('Health check endpoint called');
  
  context.res = {
    status: 200,
    body: {
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString()
    }
  };
};
