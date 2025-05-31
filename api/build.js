const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting API build process...');

const apiPrismaDir = path.join(__dirname, 'prisma');
if (!fs.existsSync(apiPrismaDir)) {
  fs.mkdirSync(apiPrismaDir, { recursive: true });
}

const rootPrismaDir = path.join(__dirname, '..', 'prisma');
if (fs.existsSync(path.join(rootPrismaDir, 'schema.prisma'))) {
  console.log('Copying Prisma schema to API directory...');
  fs.copyFileSync(
    path.join(rootPrismaDir, 'schema.prisma'),
    path.join(apiPrismaDir, 'schema.prisma')
  );
}

try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: __dirname
  });
  
  if (fs.existsSync(path.join(rootPrismaDir, 'client.cjs'))) {
    console.log('Copying client.cjs to API directory...');
    fs.copyFileSync(
      path.join(rootPrismaDir, 'client.cjs'),
      path.join(apiPrismaDir, 'client.cjs')
    );
  }
  
  console.log('API build completed successfully');
} catch (error) {
  console.error('Error during API build:', error);
  process.exit(1);
}
