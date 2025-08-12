#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  headless: true,
  testFile: 'tests/e2e/smoke-persistent.spec.ts',
  artifactsDir: 'artifacts/playwright',
  maxRetries: 2,
  timeout: 60000,
  parallelWorkers: 1
};

// ANSI color codes for console output
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
      log(`📁 Created directory: ${dir}`, 'blue');
    }
  });
}

function generatePlaywrightCommand() {
  const args = [
    'npx playwright test',
    CONFIG.testFile,
    '--project=chromium',
    `--workers=${CONFIG.parallelWorkers}`,
    `--retries=${CONFIG.maxRetries}`,
    `--timeout=${CONFIG.timeout}`,
    '--reporter=list,html'
  ];

  // Environment variables
  const env = {
    ...process.env,
    HEADLESS: CONFIG.headless ? '1' : '0',
    PERSISTENT_MODE: '1',
    UI_MODERN_V1: process.env.UI_MODERN_V1 || '1',
    PWTEST_HTML_REPORT_OPEN: 'never'
  };

  return { command: args.join(' '), env };
}

function executeCommand(command, env) {
  return new Promise((resolve, reject) => {
    log('🚀 Starting persistent headless smoke tests...', 'cyan');
    log(`📝 Command: ${command}`, 'blue');
    
    const startTime = Date.now();
    
    const child = exec(command, {
      env,
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      
      // Real-time output with color coding
      if (output.includes('✓')) {
        process.stdout.write(colors.green + output + colors.reset);
      } else if (output.includes('✗') || output.includes('failed')) {
        process.stdout.write(colors.red + output + colors.reset);
      } else if (output.includes('Running')) {
        process.stdout.write(colors.yellow + output + colors.reset);
      } else {
        process.stdout.write(output);
      }
    });

    child.stderr?.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      process.stderr.write(colors.red + error + colors.reset);
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log(`\n✅ Smoke tests completed successfully in ${duration}s`, 'green');
        resolve({ code, stdout, stderr, duration });
      } else {
        log(`\n❌ Smoke tests failed with code ${code} after ${duration}s`, 'red');
        reject({ code, stdout, stderr, duration });
      }
    });

    child.on('error', (error) => {
      log(`\n💥 Command execution failed: ${error.message}`, 'red');
      reject({ error: error.message, stdout, stderr });
    });
  });
}

function generateReport(result) {
  const timestamp = new Date().toISOString();
  const reportPath = `${CONFIG.artifactsDir}/smoke-report-${Date.now()}.json`;
  
  const report = {
    timestamp,
    configuration: CONFIG,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      headless: CONFIG.headless,
      ui_modern: process.env.UI_MODERN_V1 === '1'
    },
    execution: {
      success: result.code === 0,
      duration: result.duration,
      exitCode: result.code
    },
    artifacts: {
      traces: `${CONFIG.artifactsDir}/traces/`,
      screenshots: `${CONFIG.artifactsDir}/screenshots/`,
      videos: `${CONFIG.artifactsDir}/videos/`,
      htmlReport: `${CONFIG.artifactsDir}/html/index.html`
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📊 Report generated: ${reportPath}`, 'magenta');
  
  return report;
}

function printSummary(report) {
  log('\n' + '='.repeat(60), 'cyan');
  log('🎯 PERSISTENT HEADLESS SMOKE TEST SUMMARY', 'bright');
  log('='.repeat(60), 'cyan');
  
  log(`⏱️  Duration: ${report.execution.duration}s`, 'blue');
  log(`🖥️  Mode: ${report.environment.headless ? 'Headless' : 'Headed'}`, 'blue');
  log(`🎨 Modern UI: ${report.environment.ui_modern ? 'Enabled' : 'Disabled'}`, 'blue');
  log(`📍 Platform: ${report.environment.platform} ${report.environment.arch}`, 'blue');
  
  if (report.execution.success) {
    log(`✅ Result: PASSED`, 'green');
  } else {
    log(`❌ Result: FAILED (exit code: ${report.execution.exitCode})`, 'red');
  }
  
  log('\n📁 Artifacts:', 'cyan');
  Object.entries(report.artifacts).forEach(([key, path]) => {
    log(`   ${key}: ${path}`, 'blue');
  });
  
  log('='.repeat(60), 'cyan');
}

async function main() {
  try {
    log('🏀 Gametriq Persistent Headless Smoke Tests', 'bright');
    log('=' .repeat(50), 'cyan');
    
    // Setup
    createArtifactsDirectories();
    
    // Execute tests
    const { command, env } = generatePlaywrightCommand();
    const result = await executeCommand(command, env);
    
    // Generate and display report
    const report = generateReport(result);
    printSummary(report);
    
    // Exit with appropriate code
    process.exit(0);
    
  } catch (error) {
    log('\n💥 Execution failed:', 'red');
    console.error(error);
    
    // Still generate report for failed runs
    try {
      const report = generateReport(error);
      printSummary(report);
    } catch (reportError) {
      log('❌ Could not generate report', 'red');
    }
    
    process.exit(error.code || 1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n🛑 Interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n🛑 Terminated', 'yellow');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };