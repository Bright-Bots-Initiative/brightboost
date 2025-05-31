module.exports = async function (context, req) {
  context.res = {
    headers: { "Content-Type": "application/json" },
    body: { message: "Hello from the signup endpoint! This is a test function to verify Azure Functions routing." }
  };
};
