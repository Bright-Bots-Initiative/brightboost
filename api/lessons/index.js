const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../shared/auth');
const { z } = require('zod');

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not configured');
}

const prisma = new PrismaClient();

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  content: z.string().optional(),
  status: z.enum(['Draft', 'Published', 'Review']).optional().default('Draft')
});

const lessonUpdateSchema = lessonSchema.partial();

module.exports = async function (context, req) {
  context.log('Lessons function triggered');
  
  try {
    const authResult = await verifyToken(context, req);
    if (!authResult.isAuthorized) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { error: authResult.error }
      };
      return;
    }

    if (authResult.user.role !== 'teacher') {
      context.res = {
        status: 403,
        headers: { "Content-Type": "application/json" },
        body: { error: "Access denied. Teacher role required." }
      };
      return;
    }

    const method = req.method;
    const urlParts = req.url.split('/');
    const lessonId = urlParts[urlParts.length - 1];

    switch (method) {
      case 'GET':
        const lessons = await prisma.lesson.findMany({
          where: { teacherId: authResult.user.id },
          orderBy: { createdAt: 'desc' }
        });
        
        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: lessons
        };
        break;

      case 'POST':
        const validation = lessonSchema.safeParse(req.body);
        if (!validation.success) {
          context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { error: "Validation failed", details: validation.error.errors }
          };
          return;
        }

        const newLesson = await prisma.lesson.create({
          data: {
            ...validation.data,
            teacherId: authResult.user.id,
            date: new Date().toISOString().split('T')[0]
          }
        });

        context.res = {
          status: 201,
          headers: { "Content-Type": "application/json" },
          body: newLesson
        };
        break;

      case 'PUT':
        if (!lessonId) {
          context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { error: "Lesson ID is required" }
          };
          return;
        }

        const updateValidation = lessonUpdateSchema.safeParse(req.body);
        if (!updateValidation.success) {
          context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { error: "Validation failed", details: updateValidation.error.errors }
          };
          return;
        }

        const existingLesson = await prisma.lesson.findFirst({
          where: { 
            id: parseInt(lessonId),
            teacherId: authResult.user.id
          }
        });

        if (!existingLesson) {
          context.res = {
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: { error: "Lesson not found" }
          };
          return;
        }

        const updatedLesson = await prisma.lesson.update({
          where: { id: parseInt(lessonId) },
          data: updateValidation.data
        });

        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: updatedLesson
        };
        break;

      case 'DELETE':
        if (!lessonId) {
          context.res = {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: { error: "Lesson ID is required" }
          };
          return;
        }

        const lessonToDelete = await prisma.lesson.findFirst({
          where: { 
            id: parseInt(lessonId),
            teacherId: authResult.user.id
          }
        });

        if (!lessonToDelete) {
          context.res = {
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: { error: "Lesson not found" }
          };
          return;
        }

        await prisma.lesson.delete({
          where: { id: parseInt(lessonId) }
        });

        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: { success: true }
        };
        break;

      default:
        context.res = {
          status: 405,
          headers: { "Content-Type": "application/json" },
          body: { error: "Method not allowed" }
        };
    }

  } catch (error) {
    context.log.error('Lessons error:', error);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Internal server error" }
    };
  } finally {
    await prisma.$disconnect();
  }
};
