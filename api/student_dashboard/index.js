const prisma = require('../../prisma/client');
const { verifyToken } = require('../shared/auth');

module.exports = async function (context, req) {
  try {
    // Verify JWT token
    const authResult = await verifyToken(context, req);
    
    if (!authResult.isAuthorized) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: authResult.error || "Unauthorized access" 
        }
      };
      return;
    }
    
    // Check if user is a student
    if (authResult.user.role !== 'student') {
      context.res = {
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Access denied. Only students can access this resource." 
        }
      };
      return;
    }
    
    // Get student's enrolled lessons
    const enrolledLessons = await prisma.enrollment.findMany({
      where: { studentId: authResult.user.id },
      include: {
        lesson: true,
        activities: {
          where: { studentId: authResult.user.id }
        }
      }
    });
    
    // Format enrolled lessons
    const formattedLessons = enrolledLessons.map(enrollment => {
      const totalActivities = enrollment.activities.length;
      const completedActivities = enrollment.activities.filter(a => a.completed).length;
      const progress = totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100) 
        : 0;
      
      return {
        id: enrollment.lesson.id,
        title: enrollment.lesson.title,
        category: enrollment.lesson.category,
        progress,
        nextLesson: enrollment.lesson.nextLessonTitle || null
      };
    });
    
    // Get student's activities
    const activities = await prisma.activity.findMany({
      where: { studentId: authResult.user.id },
      include: { lesson: true }
    });
    
    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      title: activity.title || activity.lesson.title,
      dueDate: activity.dueDate,
      completed: activity.completed,
      score: activity.grade
    }));
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        studentName: authResult.user.name,
        enrolledLessons: formattedLessons,
        activities: formattedActivities
      }
    };
  } catch (error) {
    context.log.error("Error in student dashboard function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: "An unexpected error occurred while fetching student dashboard data." 
      }
    };
  }
};
