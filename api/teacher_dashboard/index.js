const prisma = require('./prisma/client.cjs');
const { verifyToken } = require('../shared/auth');

module.exports = async function (context, req) {
  try {
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
    
    if (authResult.user.role !== 'teacher') {
      context.res = {
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: { 
          success: false, 
          error: "Access denied. Only teachers can access this resource." 
        }
      };
      return;
    }
    
    const lessons = await prisma.lesson.findMany({
      orderBy: { date: 'asc' }
    });
    
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true,
        activities: {
          select: {
            completed: true,
            grade: true
          }
        }
      }
    });
    
    const studentsWithProgress = students.map(student => {
      const totalActivities = student.activities.length;
      const completedActivities = student.activities.filter(a => a.completed).length;
      const progress = totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100) 
        : 0;
      
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        progress,
        xp: student.xp,
        level: student.level,
        streak: student.streak
      };
    });
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: {
        lessons,
        students: studentsWithProgress
      }
    };
  } catch (error) {
    context.log.error("Error in teacher dashboard function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false, 
        error: "An unexpected error occurred while fetching dashboard data." 
      }
    };
  }
};
