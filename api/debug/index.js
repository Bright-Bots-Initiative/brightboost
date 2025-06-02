const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    // Example debug: Count all lessons
    const lessonCount = await prisma.lesson.count();
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { lessonCount }
    };
  } catch (error) {
    context.log.error("Error in debug function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: 'Debug query failed.' }
    };
  }
};
