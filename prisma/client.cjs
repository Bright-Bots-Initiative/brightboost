const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prismaClientSingleton = () => {
  if (process.env.NODE_ENV === 'test') {
    console.log('Using test database configuration');
    return new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://test_user:test_password@localhost:5433/brightboost_test'
        }
      },
      log: ['query', 'error', 'warn'],
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.log('Using production database configuration');
    return new PrismaClient({
      errorFormat: 'minimal',
      log: ['error', 'warn'],
    });
  } else {
    console.log('Using development database configuration');
    return new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
};

const prisma = globalForPrisma.prisma || prismaClientSingleton();

prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Client warning:', e);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
