const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (context, req) {
  try {
    // Example: Fetch all users using Prisma (not raw SQL)
    const users = await prisma.user.findMany();
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { users }
    };
  } catch (error) {
    context.log.error("Error in dbtest function:", error?.message || error);
    context.log.error("Error stack:", error?.stack);
    context.log.error("Error code:", error?.code);
    context.log.error("Error name:", error?.name);
    context.log.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: 'Database test failed.' }
    };
  }
};
