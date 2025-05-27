const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing award badge request');

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
    const { badgeId, badgeName } = req.body;
    
    if (!badgeId || !badgeName) {
      context.res = {
        status: 400,
        body: { error: 'Badge ID and name are required' }
      };
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }

    const badge = await prisma.$transaction(async (tx) => {
      let existingBadge = await tx.badge.findUnique({
        where: { id: badgeId }
      });
      
      if (!existingBadge) {
        try {
          existingBadge = await tx.badge.create({
            data: {
              id: badgeId,
              name: badgeName
            }
          });
        } catch (createError) {
          if (createError.code === 'P2002') {
            existingBadge = await tx.badge.findFirst({
              where: { name: badgeName }
            });
            
            if (!existingBadge) {
              throw new Error('Failed to create or find badge');
            }
          } else {
            throw createError;
          }
        }
      }
      
      return existingBadge;
    });
    
    await prisma.$transaction(async (tx) => {
      const existingUserBadge = await tx.user.findFirst({
        where: {
          id: user.id,
          badges: {
            some: {
              id: badge.id
            }
          }
        }
      });
      
      if (!existingUserBadge) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            badges: {
              connect: { id: badge.id }
            }
          }
        });
      }
    });
    
    context.res = {
      status: 200,
      body: {
        success: true,
        message: 'Badge awarded successfully',
        badge: {
          id: badge.id,
          name: badge.name
        }
      }
    };
  } catch (error) {
    context.log.error('Award badge error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error awarding badge', details: error.message }
    };
  }
};
