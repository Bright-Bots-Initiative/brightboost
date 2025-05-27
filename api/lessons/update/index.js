const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing lesson update request');

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
    context.log('Update lesson request from user:', decoded.id, 'role:', decoded.role);
    
    if (decoded.role !== 'teacher') {
      context.log.warn('Non-teacher attempted to update lesson. User role:', decoded.role);
      context.res = {
        status: 403,
        body: { error: 'Access denied - not a teacher' }
      };
      return;
    }
    
    const id = context.bindingData.id;
    context.log('Updating lesson with ID:', id);
    
    const { title, content, category, date, status } = req.body;
    context.log('Update data:', { title, category, status });
    
    const existingLesson = await prisma.lesson.findUnique({
      where: { id }
    });
    
    if (!existingLesson) {
      context.log.warn('Lesson not found with ID:', id);
      context.res = {
        status: 404,
        body: { message: 'Lesson not found' }
      };
      return;
    }
    
    context.log('Found lesson to update:', existingLesson.id);
    
    if (existingLesson.teacherId !== decoded.id) {
      context.log.warn('Teacher does not own this lesson. Lesson teacherId:', existingLesson.teacherId, 'User ID:', decoded.id);
      context.res = {
        status: 403,
        body: { error: 'Access denied - not the owner of this lesson' }
      };
      return;
    }
    
    try {
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
      
      context.log('Lesson updated successfully:', updatedLesson.id);
      
      context.res = {
        status: 200,
        body: updatedLesson
      };
    } catch (updateError) {
      context.log.error('Error updating lesson:', updateError);
      context.res = {
        status: 500,
        body: { message: 'Error updating lesson', error: updateError.message }
      };
    }
  } catch (error) {
    context.log.error('Update lesson error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error updating lesson', error: error.message }
    };
  }
};
