const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    errorFormat: 'minimal',
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Client warning:', e);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
