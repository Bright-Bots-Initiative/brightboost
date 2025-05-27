const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing student dashboard request');

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

    const studentId = decoded.id;
    
    const studentUser = await prisma.user.findUnique({
      where: { id: studentId }
    });
    
    if (!studentUser) {
      context.res = {
        status: 404,
        body: { error: 'Student not found' }
      };
      return;
    }
    
    const lessons = await prisma.lesson.findMany();
    
    const studentActivities = await prisma.activity.findMany({
      where: { studentId }
    });
    
    const enrolledLessons = lessons.map(lesson => {
      const activity = studentActivities.find(sa => sa.lessonId === lesson.id);
      return {
        ...lesson,
        completed: activity ? activity.completed : false,
        grade: activity ? activity.grade : null
      };
    });

    context.res = {
      status: 200,
      body: {
        message: 'Student dashboard data',
        studentName: studentUser.name,
        enrolledLessons,
        activities: studentActivities
      }
    };
  } catch (error) {
    context.log.error('Student dashboard error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error fetching student dashboard data' }
    };
  }
};
