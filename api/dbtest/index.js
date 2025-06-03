const { PrismaClient } = require('@prisma/client');

module.exports = async function (context, req) {
  let prisma;
  try {
    context.log('Starting database test...');
    
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    context.log('Prisma client initialized, testing connection...');
    
    await prisma.$connect();
    context.log('Database connection successful');
    
    // Example: Fetch all users using Prisma (not raw SQL)
    const users = await prisma.user.findMany();
    context.log(`Found ${users.length} users`);
    
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { 
        success: true,
        message: 'Database connection successful',
        userCount: users.length,
        users: users.slice(0, 5) // Only return first 5 users for safety
      }
    };
  } catch (error) {
    context.log.error("Error in dbtest function:", error);
    context.log.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { 
        success: false,
        error: 'Database test failed',
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN'
      }
    };
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      context.log('Prisma client disconnected');
    }
  }
};
