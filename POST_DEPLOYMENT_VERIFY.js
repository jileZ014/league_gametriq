#!/usr/bin/env node

const https = require('https');

const PRODUCTION_URL = 'https://gametriq-league-app.vercel.app';

const checks = [
  { path: '/', name: 'Homepage', mustContain: 'Basketball' },
  { path: '/api/health', name: 'API Health', mustContain: 'status' },
  { path: '/login', name: 'Login Page', mustContain: 'Sign' },
  { path: '/register', name: 'Register Page', mustContain: 'Register' }
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ 
        status: res.statusCode, 
        body: data.substring(0, 500) 
      }));
    }).on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });
  });
}

async function verifyDeployment() {
  console.log('🔍 POST-DEPLOYMENT VERIFICATION\n');
  console.log(`Testing: ${PRODUCTION_URL}\n`);
  
  let failures = [];
  
  for (const check of checks) {
    const url = PRODUCTION_URL + check.path;
    console.log(`Checking ${check.name} at ${check.path}...`);
    
    const result = await checkUrl(url);
    
    if (result.status !== 200) {
      failures.push(`❌ ${check.name}: HTTP ${result.status} (expected 200)`);
      console.log(`  ❌ Failed with status ${result.status}`);
    } else if (check.mustContain && !result.body.includes(check.mustContain)) {
      failures.push(`❌ ${check.name}: Missing expected content "${check.mustContain}"`);
      console.log(`  ❌ Missing expected content`);
    } else {
      console.log(`  ✅ Passed`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (failures.length > 0) {
    console.log('\n❌ DEPLOYMENT VERIFICATION FAILED:\n');
    failures.forEach(f => console.log(f));
    console.log('\n🚨 CRITICAL: Deployment is BROKEN');
    console.log('🔧 FIX: Re-deploy with corrected configuration');
    process.exit(1);
  } else {
    console.log('\n✅ ALL PRODUCTION CHECKS PASSED');
    console.log('\n🎉 Deployment successful and verified!');
    console.log(`\n📱 Share with client: ${PRODUCTION_URL}`);
  }
}

verifyDeployment();