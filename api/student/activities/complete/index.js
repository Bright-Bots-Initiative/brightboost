const { verifyToken } = require('../../../shared/auth');
const prisma = require('../../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing student activity completion request');

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
    
    if (decoded.role !== 'student') {
      context.res = {
        status: 403,
        body: { error: 'Access denied' }
      };
      return;
    }
    
    const activityId = context.bindingData.activityId;
    const studentId = decoded.id;
    
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        studentId: studentId
      }
    });
    
    if (!activity) {
      context.res = {
        status: 404,
        body: { message: 'Activity not found or not assigned to this student' }
      };
      return;
    }
    
    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: { 
        completed: true,
        completedAt: new Date()
      }
    });
    
    context.res = {
      status: 200,
      body: updatedActivity
    };
  } catch (error) {
    context.log.error('Mark activity complete error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error marking activity as complete' }
    };
  }
};
