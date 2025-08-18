#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 DEPLOYMENT VALIDATION STARTING...\n');

let errors = [];
let warnings = [];

// Check 1: Verify correct directory structure
console.log('Checking directory structure...');
const requiredPaths = [
  'apps/web/src/app/page.tsx',
  'apps/web/package.json',
  'apps/web/next.config.js',
  'vercel.json'
];

requiredPaths.forEach(p => {
  if (!fs.existsSync(path.join(__dirname, p))) {
    errors.push(`❌ Missing critical file: ${p}`);
  } else {
    console.log(`✅ Found: ${p}`);
  }
});

// Check 2: Verify vercel.json is correct
console.log('\nChecking vercel.json configuration...');
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (vercelConfig.framework !== 'nextjs') {
  errors.push('❌ vercel.json framework must be "nextjs"');
}
if (!vercelConfig.buildCommand.includes('npm run build')) {
  errors.push('❌ vercel.json buildCommand must actually build the project');
}
if (!vercelConfig.outputDirectory.includes('.next')) {
  errors.push('❌ vercel.json outputDirectory must point to .next directory');
}

// Check 3: Test local build
console.log('\nTesting local build...');
try {
  console.log('Building apps/web...');
  execSync('cd apps/web && npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (e) {
  errors.push('❌ Build failed - fix errors before deploying');
}

// Check 4: Verify .next directory was created
if (!fs.existsSync('apps/web/.next')) {
  errors.push('❌ Build did not create .next directory');
}

// Final verdict
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
  console.log('\n🚫 DEPLOYMENT BLOCKED - FIX THESE ISSUES:\n');
  errors.forEach(e => console.log(e));
  console.log('\n❌ DO NOT DEPLOY UNTIL ALL ISSUES ARE RESOLVED');
  process.exit(1);
} else {
  console.log('\n✅ ALL CHECKS PASSED - SAFE TO DEPLOY');
  console.log('\nNext steps:');
  console.log('1. Commit changes: git add -A && git commit -m "Fix deployment configuration"');
  console.log('2. Deploy: vercel --prod');
  console.log('3. Verify at: https://gametriq-league-app.vercel.app');
}