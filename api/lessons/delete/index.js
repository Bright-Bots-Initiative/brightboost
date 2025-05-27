const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing lesson delete request');

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
    
    if (decoded.role !== 'teacher') {
      context.res = {
        status: 403,
        body: { error: 'Access denied' }
      };
      return;
    }
    
    const id = context.bindingData.id;
    
    const existingLesson = await prisma.lesson.findUnique({
      where: { id }
    });
    
    if (!existingLesson) {
      context.res = {
        status: 404,
        body: { message: 'Lesson not found' }
      };
      return;
    }
    
    if (existingLesson.teacherId !== decoded.id) {
      context.res = {
        status: 403,
        body: { error: 'Access denied - not the owner of this lesson' }
      };
      return;
    }
    
    await prisma.activity.deleteMany({
      where: { lessonId: id }
    });
    
    await prisma.lesson.delete({
      where: { id }
    });
    
    context.res = {
      status: 204,
      body: null
    };
  } catch (error) {
    context.log.error('Delete lesson error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error deleting lesson', error: error.message }
    };
  }
};
