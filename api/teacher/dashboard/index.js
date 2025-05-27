const { verifyToken } = require('../../shared/auth');
const prisma = require('../../shared/prisma');

module.exports = async function (context, req) {
  context.log('Processing teacher dashboard request');

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

    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: decoded.id
      }
    });
    
    const activities = await prisma.activity.findMany({
      where: {
        lesson: {
          teacherId: decoded.id
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            xp: true,
            level: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    const populatedActivities = activities.map(activity => ({
      id: activity.id,
      studentId: activity.studentId,
      lessonId: activity.lessonId,
      completed: activity.completed,
      grade: activity.grade,
      studentName: activity.student ? activity.student.name : 'Unknown Student',
      lessonTitle: activity.lesson ? activity.lesson.title : 'Unknown Lesson'
    }));

    context.res = {
      status: 200,
      body: {
        message: 'Teacher dashboard data',
        lessons,
        studentActivities: populatedActivities
      }
    };
  } catch (error) {
    context.log.error('Teacher dashboard error:', error);
    context.res = {
      status: 500,
      body: { message: 'Error fetching teacher dashboard data' }
    };
  }
};
