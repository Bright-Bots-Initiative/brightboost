const { app } = require('@azure/functions');

app.http('hello', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Hello function processed a request.');
    return { 
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: { 
        message: "Hello, World! This is a test function to verify Azure Functions deployment.",
        timestamp: new Date().toISOString()
      }
    };
  }
});
