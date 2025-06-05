const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = async function (context, req) {
  context.log('Teacher dashboard function triggered');
  
  try {
    if (!process.env.POSTGRES_URL || !process.env.JWT_SECRET) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: "Server configuration error" }
      };
      return;
    }

    if (req.method !== 'GET') {
      context.res = {
        status: 405,
        headers: { "Content-Type": "application/json" },
        body: { error: "Method not allowed" }
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
  }
};
