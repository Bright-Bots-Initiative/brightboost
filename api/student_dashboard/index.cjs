const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (context, req) {
  context.log('Student Dashboard API triggered');

  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Unauthorized: No token provided' }
      };
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    if (!process.env.JWT_SECRET) {
        context.res = {
            status: 500,
            headers: {'Content-Type': 'application/json' },
            body: { error: 'JWT_SECRET not set in environment' }
        };
        return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch student from DB
    const student = await prisma.user.findUnique({
      where: { id: decoded.userId},
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true
      }
    });

    if (!student) {
      context.res = {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Student not found' }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: [student]  // frontend expects an array
    };
  } catch (err) {
    context.log.error('Dashboard error:', err);

    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }
    };
  }
};
