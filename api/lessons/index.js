const { verifyToken } = require('../shared/auth');
const prisma = require('../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing lessons request');

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
    
    if (req.method === 'GET') {
      const where = decoded.role === 'teacher' 
        ? { teacherId: decoded.id } 
        : { status: 'Published' };
      
      const lessons = await prisma.lesson.findMany({ where });
      
      context.res = {
        status: 200,
        body: lessons
      };
      return;
    }
    
    if (req.method === 'POST') {
      if (decoded.role !== 'teacher') {
        context.res = {
          status: 403,
          body: { error: 'Access denied - not a teacher' }
        };
        return;
      }
      
      const { title, content, category, date } = req.body;
      
      if (!title || !content) {
        context.res = {
          status: 400,
          body: { error: 'Title and content are required' }
        };
        return;
      }
      
      const newLesson = await prisma.lesson.create({
        data: {
          title,
          content,
          category: category || 'Uncategorized',
          date: date || new Date().toISOString(),
          status: 'Draft',
          teacherId: decoded.id
        }
      });
      
      context.res = {
        status: 201,
        body: newLesson
      };
      return;
    }
    
    context.res = {
      status: 405,
      body: { error: 'Method not allowed' }
    };
  } catch (error) {
    context.log.error('Lessons error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error processing lessons request', error: error.message }
    };
  }
};
