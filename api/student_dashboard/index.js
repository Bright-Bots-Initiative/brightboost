const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../shared/auth');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  context.log('Student dashboard function triggered');
  
  try {
    if (req.method !== 'GET') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
      };
      return;
    }

    const authResult = await verifyToken(context, req);
    if (!authResult.isAuthorized) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { error: authResult.error }
      };
      return;
    }

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
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: students
    };

  } catch (error) {
    context.log.error('Student dashboard error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Internal server error" }
    };
  } finally {
    await prisma.$disconnect();
  }
};
