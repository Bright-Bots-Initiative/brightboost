const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing award XP request');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      context.log.warn('Authorization header missing');
      context.res = {
        status: 401,
        body: { error: 'Authorization header is required' }
      };
      return;
    }

    const decoded = verifyToken(authHeader);
    context.log('Award XP request from user:', decoded.id);
    
    const { amount, reason } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      context.log.warn('Invalid XP amount:', amount);
      context.res = {
        status: 400,
        body: { error: 'Valid XP amount is required' }
      };
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      context.log.warn('User not found for XP award:', decoded.id);
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }

    context.log('Found user for XP award:', user.id, 'Current XP:', user.xp);

    const oldXp = user.xp || 0;
    const newXp = oldXp + parseInt(amount, 10);
    const oldLevel = user.level || 1;
    
    let newLevel = 1; // Explorer
    
    if (newXp >= 1000) newLevel = 5;      // Master
    else if (newXp >= 500) newLevel = 4;  // Expert
    else if (newXp >= 200) newLevel = 3;  // Advanced
    else if (newXp >= 50) newLevel = 2;   // Beginner
    
    const leveledUp = oldLevel !== newLevel;
    context.log('Calculated new XP:', newXp, 'new level:', newLevel, 'leveled up:', leveledUp);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const userInTx = await tx.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!userInTx) {
        context.log.error('User not found within transaction for XP award:', decoded.id);
        throw new Error(`User not found within transaction: ${decoded.id}`);
      }
      
      const updated = await tx.user.update({
        where: { id: decoded.id },
        data: {
          xp: newXp,
          level: newLevel
        }
      });
      
      const verifiedUser = await tx.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!verifiedUser) {
        context.log.error('Failed to verify XP update within transaction:', decoded.id);
        throw new Error(`Failed to verify XP update: ${decoded.id}`);
      }
      
      context.log('Successfully updated user XP in transaction:', verifiedUser.id, 'New XP:', verifiedUser.xp);
      return updated;
    });

    context.log('XP award successful for user:', updatedUser.id, 'New XP:', updatedUser.xp, 'New level:', updatedUser.level);

    context.res = {
      status: 200,
      body: {
        success: true,
        xp: updatedUser.xp,
        xpGained: parseInt(amount, 10),
        level: updatedUser.level,
        leveledUp,
        reason: reason || 'Activity completed'
      }
    };
  } catch (error) {
    context.log.error('Award XP error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error awarding XP' }
    };
  }
};
