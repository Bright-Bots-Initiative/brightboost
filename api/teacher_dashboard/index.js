const prisma = require('../../prisma/client.cjs');
const { verifyToken } = require('../shared/auth');

module.exports = async function (context, req) {
  try {
 devin/1748491643-fix-yaml-syntax
    // Verify JWT token
> main
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
    
 devin/1748491643-fix-yaml-syntax
    // Check if user is a teacher
 main
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
    
 devin/1748491643-fix-yaml-syntax
    // Get lessons from database
 main
    const lessons = await prisma.lesson.findMany({
      orderBy: { date: 'asc' }
    });
    
 devin/1748491643-fix-yaml-syntax
    // Get students from database
 main
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
    
 devin/1748491643-fix-yaml-syntax
    // Calculate progress for each student
 main
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
