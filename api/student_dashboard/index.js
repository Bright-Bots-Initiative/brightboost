const prisma = require('../../prisma/client.cjs');
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
    
    // Get student's activities with lessons
    const studentActivities = await prisma.activity.findMany({
      where: { studentId: authResult.user.id },
      include: {
        lesson: true
      }
    });
    
    const lessonMap = new Map();
    studentActivities.forEach(activity => {
      if (!lessonMap.has(activity.lessonId)) {
        lessonMap.set(activity.lessonId, {
          id: activity.lesson.id,
          title: activity.lesson.title,
          category: activity.lesson.category,
          activities: []
        });
      }
      lessonMap.get(activity.lessonId).activities.push(activity);
    });
    
    // Format enrolled lessons with progress
    const formattedLessons = Array.from(lessonMap.values()).map(lessonData => {
      const totalActivities = lessonData.activities.length;
      const completedActivities = lessonData.activities.filter(a => a.completed).length;
      const progress = totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100) 
        : 0;
      
      return {
        id: lessonData.id,
        title: lessonData.title,
        category: lessonData.category,
        progress,
        nextLesson: null // We don't have nextLesson data in our schema
      };
    });
    
    // Format activities from the same activities we already fetched
    const formattedActivities = studentActivities.map(activity => ({
      id: activity.id,
      title: activity.lesson.title, // Use lesson title since activity doesn't have title
      dueDate: null, // Our schema doesn't have dueDate on Activity
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
