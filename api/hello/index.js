module.exports = async function (context, req) {
    context.log('Hello function processed a request.');
    
    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
            message: "Hello, World! This is a test function to verify Azure Functions deployment.",
            timestamp: new Date().toISOString()
        }
    };
};
