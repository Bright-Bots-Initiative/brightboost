module.exports = async (context, req) => {
    context.res = {
        status: 200,
        body: {
            message: "Hello from Azure Functions!"
        }
    };
};
