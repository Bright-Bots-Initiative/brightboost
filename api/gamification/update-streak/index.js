const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing update streak request');

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
      where: { id: decoded.id }
    });

    if (!user) {
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }

    const oldStreak = user.streak || 0;
    const newStreak = oldStreak + 1;
    
    let streakXp = 0;
    let milestone = false;
    
    if (newStreak % 30 === 0) {
      streakXp = 100; // Monthly milestone
      milestone = true;
    } else if (newStreak % 7 === 0) {
      streakXp = 50;  // Weekly milestone
      milestone = true;
    } else if (newStreak % 5 === 0) {
      streakXp = 25;  // 5-day milestone
      milestone = true;
    } else {
      streakXp = 5;   // Daily streak
    }
    
    const newXp = (user.xp || 0) + streakXp;
    
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: decoded.id },
        data: {
          streak: {
            set: newStreak
          },
          xp: {
            set: newXp
          }
        }
      });
      
      return updated;
    });
    
    context.res = {
      status: 200,
      body: {
        success: true,
        streak: updatedUser.streak,
        streakXp,
        milestone,
        xp: updatedUser.xp
      }
    };
  } catch (error) {
    context.log.error('Update streak error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error updating streak' }
    };
  }
};
