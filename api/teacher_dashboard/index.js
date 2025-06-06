const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../shared/auth');

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not configured');
}

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  context.log('Teacher dashboard function triggered');
  
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

    if (authResult.user.role !== 'teacher') {
      context.res = {
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: { error: "Access denied. Teacher role required." }
      };
      return;
    }

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
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: teachers
    };

  } catch (error) {
    context.log.error('Teacher dashboard error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Internal server error" }
    };
  } finally {
    await prisma.$disconnect();
  }
};
