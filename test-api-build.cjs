const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Testing API build process...');

process.chdir(path.join(__dirname, 'api'));

try {
  console.log('Running API build script...');
  execSync('npm run build', { stdio: 'inherit' });
  
  const prismaClientPath = path.join(__dirname, 'api', 'prisma', 'client.cjs');
  if (fs.existsSync(prismaClientPath)) {
    console.log('✅ Prisma client was successfully generated at:', prismaClientPath);
  } else {
    console.error('❌ Prisma client was not generated at:', prismaClientPath);
    process.exit(1);
  }
  
  console.log('API build test completed successfully');
} catch (error) {
  console.error('Error during API build test:', error);
  process.exit(1);
}
