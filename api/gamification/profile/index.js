const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing gamification profile request');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      context.res = {
        status: 401,
        body: { error: 'Authorization header is required' }
      };
      return;
    }

    const decoded = verifyToken(authHeader);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        streak: true
      }
    });

    if (!user) {
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }

    const badges = await prisma.badge.findMany({
      where: {
        users: {
          some: {
            id: user.id
          }
        }
      }
    });

    const gamificationProfile = {
      id: user.id,
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak || 0,
      badges: badges
    };

    context.res = {
      status: 200,
      body: gamificationProfile
    };
  } catch (error) {
    context.log.error('Gamification profile error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error fetching gamification data' }
    };
  }
};
