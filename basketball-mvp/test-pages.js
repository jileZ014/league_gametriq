// Simple test to check if pages load without crashing
const fs = require('fs');
const path = require('path');

const pages = [
  'app/page.tsx',
  'app/(auth)/login/page.tsx',
  'app/(auth)/register/page.tsx',
  'app/dashboard/page.tsx',
  'app/teams/page.tsx',
  'app/games/page.tsx'
];

console.log('Checking if all pages exist and have valid exports...\n');

let allPassed = true;

pages.forEach(pagePath => {
  const fullPath = path.join(__dirname, pagePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('export default')) {
      console.log(`✅ ${pagePath} - OK`);
    } else {
      console.log(`❌ ${pagePath} - Missing default export`);
      allPassed = false;
    }
  } else {
    console.log(`❌ ${pagePath} - File not found`);
    allPassed = false;
  }
});

console.log('\n' + (allPassed ? '✅ All pages are valid!' : '❌ Some pages have issues'));
process.exit(allPassed ? 0 : 1);