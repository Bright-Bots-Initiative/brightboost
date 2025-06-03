const { checkRequiredEnvVars } = require('../_utils/envCheck');

module.exports = async function (context, req) {
  try {
    checkRequiredEnvVars();
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { ok: true }
    };
  } catch (error) {
    context.log.error("Error in student dashboard function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: error.message || "An unexpected error occurred." 
      }
    };
  }
};
