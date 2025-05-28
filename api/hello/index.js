module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const name = (req.query.name || req.body?.name || 'World');

  context.res = {
    headers: {
      'Content-Type': 'application/json'
    },
    body: { message: `Hello, ${name}! This is a test function to verify Azure Functions deployment.` }
  };
};
