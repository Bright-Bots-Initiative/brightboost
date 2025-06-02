module.exports = async function (context, req) {
  context.res = {
    headers: { "Content-Type": "application/json" },
    body: {
      message:
        "Hello from the test endpoint! This is a test function to verify Azure Functions discovery.",
    },
  };
};
