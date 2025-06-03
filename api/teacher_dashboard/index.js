const { PrismaClient } = require('@prisma/client');
const { checkRequiredEnvVars } = require('../_utils/envCheck');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    checkRequiredEnvVars();
    
    // }
    
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: teachers
    };
  } catch (error) {
    context.log.error("Error in teacher dashboard function:", error);
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
