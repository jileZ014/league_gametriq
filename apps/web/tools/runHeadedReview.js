#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG = {
  headless: false,
  testFile: 'tests/e2e/smoke-persistent.spec.ts',
  artifactsDir: 'artifacts/playwright',
  slowMo: 500,
  timeout: 120000,
  interactive: true,
  recordVideo: true
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function reviewMenu(rl) {
  log('\n🎬 HEADED REVIEW OPTIONS', 'bright');
  log('========================', 'cyan');
  log('1. Run full smoke test suite (with video recording)', 'blue');
  log('2. Run specific test pattern', 'blue');
  log('3. Launch browser for manual testing', 'blue');
  log('4. View recent test artifacts', 'blue');
  log('5. Toggle Modern UI (current: ' + (process.env.UI_MODERN_V1 === '1' ? 'ON' : 'OFF') + ')', 'blue');
  log('6. Exit', 'blue');
  
  const choice = await askQuestion(rl, '\n🔸 Select option (1-6): ');
  return choice;
}

function createArtifactsDirectories() {
  const dirs = [
    CONFIG.artifactsDir,
    `${CONFIG.artifactsDir}/screenshots`,
    `${CONFIG.artifactsDir}/traces`,
    `${CONFIG.artifactsDir}/videos`,
    `${CONFIG.artifactsDir}/downloads`
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

async function runFullSmokeTest() {
  log('🚀 Starting headed smoke test with video recording...', 'cyan');
  
  const command = [
    'npx playwright test',
    CONFIG.testFile,
    '--project=chromium',
    '--headed',
    '--workers=1',
    `--timeout=${CONFIG.timeout}`,
    `--output-dir=${CONFIG.artifactsDir}`,
    '--reporter=list'
  ].join(' ');

  const env = {
    ...process.env,
    HEADLESS: '0',
    PERSISTENT_MODE: '1',
    SLOW_MO: CONFIG.slowMo.toString(),
    RECORD_VIDEO: '1',
    UI_MODERN_V1: process.env.UI_MODERN_V1 || '1'
  };

  return executeCommand(command, env);
}

async function runSpecificTest(rl) {
  const pattern = await askQuestion(rl, '🔍 Enter test pattern (e.g., "login", "dashboard"): ');
  
  if (!pattern) {
    log('❌ No pattern provided', 'red');
    return;
  }

  log(`🎯 Running tests matching: "${pattern}"`, 'cyan');
  
  const command = [
    'npx playwright test',
    '--project=chromium',
    '--headed',
    `--grep="${pattern}"`,
    `--timeout=${CONFIG.timeout}`,
    `--output-dir=${CONFIG.artifactsDir}`,
    '--reporter=list'
  ].join(' ');

  const env = {
    ...process.env,
    HEADLESS: '0',
    PERSISTENT_MODE: '1',
    SLOW_MO: CONFIG.slowMo.toString(),
    UI_MODERN_V1: process.env.UI_MODERN_V1 || '1'
  };

  return executeCommand(command, env);
}

async function launchManualBrowser() {
  log('🌐 Launching browser for manual testing...', 'cyan');
  log('💡 Use this session to:', 'yellow');
  log('   • Test user flows manually', 'blue');
  log('   • Verify visual designs', 'blue');
  log('   • Debug specific issues', 'blue');
  log('   • Take screenshots', 'blue');
  
  const command = [
    'npx playwright test',
    'tests/e2e/manual-session.spec.ts',
    '--project=chromium',
    '--headed',
    '--timeout=0',
    '--workers=1'
  ].join(' ');

  // Create a simple manual session test if it doesn't exist
  const manualTestPath = 'tests/e2e/manual-session.spec.ts';
  if (!fs.existsSync(manualTestPath)) {
    const manualTestContent = `
import { test } from '@playwright/test';
import { startPersistentSession } from '../../tools/browserContext';

test('Manual Testing Session', async () => {
  const { manager, page } = await startPersistentSession({
    headless: false,
    slowMo: 500
  });

  // Navigate to the app
  await page.goto('/');
  
  // Keep the browser open for manual testing
  console.log('🌐 Browser launched for manual testing');
  console.log('📍 Navigate to different pages to test UI/UX');
  console.log('⏸️  Press Ctrl+C to close when done');
  
  // Wait indefinitely for manual testing
  await page.waitForTimeout(24 * 60 * 60 * 1000); // 24 hours
});
`;
    fs.writeFileSync(manualTestPath, manualTestContent.trim());
    log(`📝 Created manual session test: ${manualTestPath}`, 'green');
  }

  const env = {
    ...process.env,
    HEADLESS: '0',
    PERSISTENT_MODE: '1',
    SLOW_MO: CONFIG.slowMo.toString(),
    UI_MODERN_V1: process.env.UI_MODERN_V1 || '1'
  };

  return executeCommand(command, env);
}

function viewArtifacts() {
  log('📁 Recent Test Artifacts:', 'cyan');
  log('========================', 'cyan');
  
  const artifactDirs = ['screenshots', 'traces', 'videos'];
  
  artifactDirs.forEach(dir => {
    const fullPath = path.join(CONFIG.artifactsDir, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath)
        .map(file => ({
          name: file,
          path: path.join(fullPath, file),
          stats: fs.statSync(path.join(fullPath, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime)
        .slice(0, 5);
      
      log(`\n📂 ${dir.toUpperCase()}:`, 'blue');
      if (files.length === 0) {
        log('   (no files)', 'yellow');
      } else {
        files.forEach(file => {
          const time = file.stats.mtime.toLocaleTimeString();
          const size = (file.stats.size / 1024).toFixed(1) + 'KB';
          log(`   ${file.name} (${time}, ${size})`, 'green');
        });
      }
    }
  });
  
  // HTML Report
  const htmlReportPath = path.join(CONFIG.artifactsDir, 'html', 'index.html');
  if (fs.existsSync(htmlReportPath)) {
    log(`\n📊 HTML Report: ${htmlReportPath}`, 'magenta');
    log('   Run: npx playwright show-report', 'blue');
  }
}

function toggleModernUI() {
  const current = process.env.UI_MODERN_V1 === '1';
  const newValue = current ? '0' : '1';
  
  process.env.UI_MODERN_V1 = newValue;
  
  log(`🎨 Modern UI ${newValue === '1' ? 'ENABLED' : 'DISABLED'}`, newValue === '1' ? 'green' : 'yellow');
  log('💡 This affects the next test run', 'blue');
}

function executeCommand(command, env) {
  return new Promise((resolve, reject) => {
    log(`📝 Command: ${command}`, 'blue');
    
    const child = spawn(command, [], {
      shell: true,
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ Command completed successfully`, 'green');
        resolve({ code });
      } else {
        log(`❌ Command failed with code ${code}`, 'red');
        resolve({ code }); // Don't reject, let user continue
      }
    });

    child.on('error', (error) => {
      log(`💥 Command execution failed: ${error.message}`, 'red');
      resolve({ error: error.message });
    });
  });
}

async function main() {
  log('🏀 Gametriq Headed Review Tool', 'bright');
  log('===============================', 'cyan');
  log('🎬 Visual testing and UI review for basketball league app', 'blue');
  
  createArtifactsDirectories();
  
  const rl = createInterface();
  
  try {
    while (true) {
      const choice = await reviewMenu(rl);
      
      switch (choice) {
        case '1':
          await runFullSmokeTest();
          break;
          
        case '2':
          await runSpecificTest(rl);
          break;
          
        case '3':
          await launchManualBrowser();
          break;
          
        case '4':
          viewArtifacts();
          break;
          
        case '5':
          toggleModernUI();
          break;
          
        case '6':
        case 'exit':
        case 'quit':
        case 'q':
          log('👋 Goodbye!', 'cyan');
          process.exit(0);
          break;
          
        default:
          log('❓ Invalid option. Please try again.', 'yellow');
          break;
      }
      
      if (choice !== '4' && choice !== '5') {
        const cont = await askQuestion(rl, '\n↩️  Press Enter to continue...');
      }
    }
  } catch (error) {
    log(`💥 Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n🛑 Interrupted by user', 'yellow');
  process.exit(130);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };