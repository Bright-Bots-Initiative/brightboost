const fs = require('fs');
const path = require('path');

function checkBundleSize() {
  const distPath = path.join(__dirname, '../dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Build directory not found. Run npm run build first.');
    process.exit(1);
  }

  let totalSize = 0;
  const files = [];

  function getDirectorySize(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        getDirectorySize(itemPath);
      } else {
        const sizeKB = Math.round(stats.size / 1024);
        totalSize += sizeKB;
        files.push({ name: item, size: sizeKB });
      }
    }
  }

  getDirectorySize(distPath);

  console.log('📦 Bundle Size Analysis');
  console.log('======================');
  console.log(`Total bundle size: ${totalSize} KB`);
  
  const largestFiles = files
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
    
  console.log('\n🔍 Largest files:');
  largestFiles.forEach(file => {
    console.log(`  ${file.name}: ${file.size} KB`);
  });

  const WARNING_THRESHOLD = 2000; // 2MB
  const ERROR_THRESHOLD = 5000; // 5MB

  if (totalSize > ERROR_THRESHOLD) {
    console.log(`\n❌ Bundle size (${totalSize} KB) exceeds error threshold (${ERROR_THRESHOLD} KB)`);
    process.exit(1);
  } else if (totalSize > WARNING_THRESHOLD) {
    console.log(`\n⚠️  Bundle size (${totalSize} KB) exceeds warning threshold (${WARNING_THRESHOLD} KB)`);
  } else {
    console.log(`\n✅ Bundle size (${totalSize} KB) is within acceptable limits`);
  }

  console.log('\n📝 Note: This is a basic size check. For delta comparison,');
  console.log('   implement baseline comparison in your CI/CD pipeline.');
}

checkBundleSize();
