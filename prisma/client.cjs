const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances during hot reloading in development
// and ensure proper connection management in test environments
const globalForPrisma = globalThis;

/**
 * Creates a properly configured Prisma client based on the current environment.
 * Handles connection pooling and ensures proper test isolation.
 */
const createPrismaClient = () => {
  // Get database URL from environment or use default test URL
  let dbUrl = process.env.DATABASE_URL;
  
  if (process.env.NODE_ENV === 'test') {
    console.log('Creating test database client');
    dbUrl = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/brightboost_test';
    
    return new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: ['query', 'error', 'warn'],
      // Shorter connection timeout for tests to fail fast if DB is unavailable
      connectionTimeout: 5000,
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.log('Creating production database client');
    
    return new PrismaClient({
      datasources: { db: { url: dbUrl } },
      errorFormat: 'minimal',
      log: ['error', 'warn'],
    });
  } else {
    console.log('Creating development database client');
    
    return new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: ['query', 'info', 'warn', 'error'],
    });
  }
};

// Use existing client instance or create a new one
const prisma = globalForPrisma.prisma || createPrismaClient();

// Set up error and warning event handlers
prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Client warning:', e);
});

// Ensure connection is properly closed on process exit
process.on('beforeExit', async () => {
  console.log('Process exiting, disconnecting Prisma client');
  await prisma.$disconnect();
});

// Handle termination signals
process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting Prisma client');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting Prisma client');
  await prisma.$disconnect();
  process.exit(0);
});

// Cache client in development to prevent multiple instances during hot reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connect to the database immediately to verify connection
(async () => {
  if (process.env.NODE_ENV === 'test') {
    try {
      // For tests, just verify connection is working
      await prisma.$connect();
      console.log('Test database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      // Don't exit process for tests - let the test framework handle it
    }
  }
})();

module.exports = prisma;
