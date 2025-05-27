const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing lesson update request');

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
        body: { error: 'Access denied - not a teacher' }
      };
      return;
    }
    
    const id = context.bindingData.id;
    const { title, content, category, date, status } = req.body;
    
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
    
    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingLesson.title,
        content: content !== undefined ? content : existingLesson.content,
        category: category !== undefined ? category : existingLesson.category,
        date: date !== undefined ? date : existingLesson.date,
        status: status !== undefined ? status : existingLesson.status,
      }
    });
    
    context.res = {
      status: 200,
      body: updatedLesson
    };
  } catch (error) {
    context.log.error('Update lesson error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error updating lesson', error: error.message }
    };
  }
};
