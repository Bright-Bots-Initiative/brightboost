const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnectivity() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.POSTGRES_URL
      }
    }
  });

  try {
    console.log('Testing database connectivity...');
    
    const testRecord = await prisma.user.create({
      data: {
        id: `ping-test-${Date.now()}`,
        name: 'DB Health Check',
        email: `ping-${Date.now()}@test.com`,
        password: 'test',
        role: 'student'
      }
    });
    
    console.log('✅ Database CREATE operation successful');
    
    const readRecord = await prisma.user.findUnique({
      where: { id: testRecord.id }
    });
    
    if (readRecord) {
      console.log('✅ Database READ operation successful');
    } else {
      throw new Error('Failed to read created record');
    }
    
    await prisma.user.delete({
      where: { id: testRecord.id }
    });
    
    console.log('✅ Database DELETE operation successful');
    console.log('✅ All database connectivity tests passed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnectivity();
