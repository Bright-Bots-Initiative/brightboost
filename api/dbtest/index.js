module.exports = async function (context, req) {
  try {
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Database test function loaded successfully",
        timestamp: new Date().toISOString(),
        method: req.method,
      },
    };
  } catch (error) {
    context.log.error("Error in dbtest function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Database test failed." },
    };
  }
};
