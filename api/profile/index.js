const { verifyToken } = require('../shared/auth');
const prisma = require('../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing profile request');

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
      include: {
        badges: true
      }
    });
    
    if (!user) {
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }
    
    context.res = {
      status: 200,
      body: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak || 0,
        badges: user.badges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description
        }))
      }
    };
  } catch (error) {
    context.log.error('Profile error:', error);
    context.res = {
      status: 401,
      body: { error: 'Invalid token' }
    };
  }
};
