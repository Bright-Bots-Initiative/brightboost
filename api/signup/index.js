module.exports = async function (context, req) {
  context.res = {
    status: 410,
    headers: { "Content-Type": "application/json" },
    body: { 
      error: "This endpoint is deprecated. Please use Azure SWA authentication: /.auth/login/github or /.auth/login/aad",
      redirectTo: "/.auth/login/github"
    }
  };
};
