const { PrismaClient } = require('@prisma/client');
const { checkRequiredEnvVars } = require('../_utils/envCheck');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    checkRequiredEnvVars();
    
    // }
    
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: students
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
