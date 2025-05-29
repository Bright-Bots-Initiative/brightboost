module.exports = async function (context, req) {
  try {
    const { name, email, password, role } = req.body || {};
    
    if (!name || !email || !password || !role) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Missing required fields. Please provide name, email, password, and role." 
        }
      };
      return;
    }
    
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        token: "mock-jwt-token-" + Date.now(),
        user: {
          name,
          email,
          role
        }
      }
    };
  } catch (error) {
    context.log.error("Error in signup function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: "An unexpected error occurred during signup. Please try again." 
      }
    };
  }
};
