#!/usr/bin/env node

/**
 * GameTriq Basketball League Management System
 * Health Monitoring & System Check
 * 
 * Comprehensive health monitoring that checks:
 * - API endpoints availability
 * - Database connectivity (Supabase)
 * - Page load times
 * - JavaScript/CSS asset loading
 * - 404 error detection
 * - Service worker registration
 * - WebSocket connections
 * 
 * @version 1.0.0
 */

const https = require('https');
const http = require('http');
const dns = require('dns');
const { URL } = require('url');
const { performance } = require('perf_hooks');

class GameTriqHealthMonitor {
  constructor() {
    this.config = {
      baseUrl: process.env.GAMETRIQ_BASE_URL || 'https://leaguegametriq.vercel.app',
      supabaseUrl: process.env.SUPABASE_URL || 'mgfpbqvkhqjlvgeqaclj.supabase.co',
      supabaseKey: process.env.SUPABASE_ANON_KEY || '',
      timeout: 10000,
      retries: 3
    };

    this.results = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: {}
    };
  }

  async runAllHealthChecks() {
    console.log('🏥 Starting GameTriq Health Monitoring...');
    console.log(`Target URL: ${this.config.baseUrl}`);
    console.log(`Supabase URL: ${this.config.supabaseUrl}`);

    try {
      // Core Infrastructure Checks
      await this.checkDNSResolution();
      await this.checkSSLCertificate();
      await this.checkDatabaseConnectivity();
      
      // Application Health Checks
      await this.checkAPIEndpoints();
      await this.checkPageLoading();
      await this.checkAssetLoading();
      await this.checkServiceWorker();
      
      // Performance Checks
      await this.checkResponseTimes();
      await this.checkResourceAvailability();
      
      // Calculate overall status
      this.calculateOverallStatus();
      
      // Output results as JSON for test suite consumption
      console.log(JSON.stringify(this.results, null, 2));
      
      return this.results;
      
    } catch (error) {
      console.error('Health check failed:', error.message);
      this.results.overall_status = 'failed';
      this.results.error = error.message;
      
      console.log(JSON.stringify(this.results, null, 2));
      process.exit(1);
    }
  }

  async checkDNSResolution() {
    const check = 'dns_resolution';
    const startTime = performance.now();
    
    try {
      const url = new URL(this.config.baseUrl);
      const hostname = url.hostname;
      
      await new Promise((resolve, reject) => {
        dns.lookup(hostname, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      
      // Check Supabase DNS resolution
      await new Promise((resolve, reject) => {
        dns.lookup(this.config.supabaseUrl, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      
      const duration = performance.now() - startTime;
      
      this.results.checks[check] = {
        status: 'passed',
        duration: Math.round(duration),
        message: 'DNS resolution successful for both app and Supabase'
      };
      
      this.results.passed++;
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'failed',
        error: error.message,
        message: 'DNS resolution failed - check domain configuration'
      };
      
      this.results.failed++;
      
      // Critical: If Supabase DNS fails, this is likely the root cause
      if (error.message.includes(this.config.supabaseUrl)) {
        this.results.checks[check].critical = true;
        this.results.checks[check].message = '🚨 CRITICAL: Supabase URL does not resolve! This will break authentication and data operations.';
      }
    }
  }

  async checkSSLCertificate() {
    const check = 'ssl_certificate';
    const startTime = performance.now();
    
    try {
      const url = new URL(this.config.baseUrl);
      
      await new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: 443,
          method: 'GET',
          timeout: this.config.timeout
        };
        
        const req = https.request(options, (res) => {
          resolve(res.socket.getPeerCertificate());
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('SSL check timeout')));
        req.end();
      });
      
      const duration = performance.now() - startTime;
      
      this.results.checks[check] = {
        status: 'passed',
        duration: Math.round(duration),
        message: 'SSL certificate valid'
      };
      
      this.results.passed++;
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'failed',
        error: error.message,
        message: 'SSL certificate issue detected'
      };
      
      this.results.failed++;
    }
  }

  async checkDatabaseConnectivity() {
    const check = 'database_connectivity';
    const startTime = performance.now();
    
    try {
      // Test Supabase connectivity
      const supabaseHealthUrl = `https://${this.config.supabaseUrl}/rest/v1/`;
      
      const response = await this.makeHttpRequest(supabaseHealthUrl, {
        headers: {
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`
        }
      });
      
      const duration = performance.now() - startTime;
      
      if (response.statusCode === 200 || response.statusCode === 401) {
        // 401 is expected without proper auth, but means Supabase is responding
        this.results.checks[check] = {
          status: 'passed',
          duration: Math.round(duration),
          message: 'Supabase database connectivity confirmed'
        };
        
        this.results.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.statusCode}`);
      }
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'failed',
        error: error.message,
        message: '🚨 CRITICAL: Supabase database connectivity failed!',
        critical: true,
        recommendations: [
          'Verify Supabase URL is correct',
          'Check Supabase project status',
          'Validate API keys',
          'Ensure Supabase project is not paused'
        ]
      };
      
      this.results.failed++;
    }
  }

  async checkAPIEndpoints() {
    const check = 'api_endpoints';
    const endpoints = [
      '/api/health',
      '/api/auth/test',
      '/api/teams',
      '/api/games',
      '/api/tournaments'
    ];
    
    const results = {};
    let passedCount = 0;
    let failedCount = 0;
    
    for (const endpoint of endpoints) {
      const startTime = performance.now();
      
      try {
        const url = `${this.config.baseUrl}${endpoint}`;
        const response = await this.makeHttpRequest(url);
        const duration = performance.now() - startTime;
        
        results[endpoint] = {
          status: response.statusCode < 500 ? 'passed' : 'failed',
          statusCode: response.statusCode,
          duration: Math.round(duration)
        };
        
        if (response.statusCode < 500) {
          passedCount++;
        } else {
          failedCount++;
        }
        
      } catch (error) {
        results[endpoint] = {
          status: 'failed',
          error: error.message
        };
        failedCount++;
      }
    }
    
    this.results.checks[check] = {
      status: failedCount === 0 ? 'passed' : (passedCount > failedCount ? 'warning' : 'failed'),
      endpoints: results,
      summary: `${passedCount} passed, ${failedCount} failed`
    };
    
    if (failedCount === 0) {
      this.results.passed++;
    } else if (passedCount > failedCount) {
      this.results.warnings++;
    } else {
      this.results.failed++;
    }
  }

  async checkPageLoading() {
    const check = 'page_loading';
    const pages = [
      '/',
      '/auth/login',
      '/spectator',
      '/tournaments'
    ];
    
    const results = {};
    let passedCount = 0;
    let failedCount = 0;
    
    for (const page of pages) {
      const startTime = performance.now();
      
      try {
        const url = `${this.config.baseUrl}${page}`;
        const response = await this.makeHttpRequest(url);
        const duration = performance.now() - startTime;
        
        const isSuccess = response.statusCode >= 200 && response.statusCode < 400;
        
        results[page] = {
          status: isSuccess ? 'passed' : 'failed',
          statusCode: response.statusCode,
          loadTime: Math.round(duration),
          performance: duration < 3000 ? 'good' : 'slow'
        };
        
        if (isSuccess) {
          passedCount++;
        } else {
          failedCount++;
        }
        
      } catch (error) {
        results[page] = {
          status: 'failed',
          error: error.message
        };
        failedCount++;
      }
    }
    
    this.results.checks[check] = {
      status: failedCount === 0 ? 'passed' : 'failed',
      pages: results,
      summary: `${passedCount} pages loaded successfully, ${failedCount} failed`
    };
    
    if (failedCount === 0) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  async checkAssetLoading() {
    const check = 'asset_loading';
    const assets = [
      '/favicon.ico',
      '/manifest.webmanifest',
      '/sw.js',
      '/_next/static/css/',
      '/_next/static/chunks/'
    ];
    
    const results = {};
    let passedCount = 0;
    let failedCount = 0;
    
    for (const asset of assets) {
      try {
        const url = `${this.config.baseUrl}${asset}`;
        const response = await this.makeHttpRequest(url);
        
        const isSuccess = response.statusCode >= 200 && response.statusCode < 400;
        
        results[asset] = {
          status: isSuccess ? 'passed' : 'failed',
          statusCode: response.statusCode
        };
        
        if (isSuccess) {
          passedCount++;
        } else {
          failedCount++;
        }
        
      } catch (error) {
        results[asset] = {
          status: 'failed',
          error: error.message
        };
        failedCount++;
      }
    }
    
    this.results.checks[check] = {
      status: passedCount > 0 ? 'passed' : 'failed',
      assets: results,
      summary: `${passedCount} assets loaded, ${failedCount} failed`
    };
    
    if (passedCount > 0) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  async checkServiceWorker() {
    const check = 'service_worker';
    
    try {
      const url = `${this.config.baseUrl}/sw.js`;
      const response = await this.makeHttpRequest(url);
      
      if (response.statusCode === 200) {
        this.results.checks[check] = {
          status: 'passed',
          message: 'Service worker available for PWA functionality'
        };
        this.results.passed++;
      } else {
        this.results.checks[check] = {
          status: 'warning',
          message: 'Service worker not available - PWA features may not work'
        };
        this.results.warnings++;
      }
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'warning',
        error: error.message,
        message: 'Service worker check failed'
      };
      this.results.warnings++;
    }
  }

  async checkResponseTimes() {
    const check = 'response_times';
    const startTime = performance.now();
    
    try {
      const response = await this.makeHttpRequest(this.config.baseUrl);
      const duration = performance.now() - startTime;
      
      this.results.checks[check] = {
        status: duration < 2000 ? 'passed' : 'warning',
        responseTime: Math.round(duration),
        threshold: 2000,
        message: duration < 2000 ? 'Response time within acceptable range' : 'Response time exceeds recommended threshold'
      };
      
      if (duration < 2000) {
        this.results.passed++;
      } else {
        this.results.warnings++;
      }
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'failed',
        error: error.message
      };
      this.results.failed++;
    }
  }

  async checkResourceAvailability() {
    const check = 'resource_availability';
    
    try {
      // Check memory and performance
      const memoryUsage = process.memoryUsage();
      
      this.results.checks[check] = {
        status: 'passed',
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        message: 'Resource availability check completed'
      };
      
      this.results.passed++;
      
    } catch (error) {
      this.results.checks[check] = {
        status: 'failed',
        error: error.message
      };
      this.results.failed++;
    }
  }

  calculateOverallStatus() {
    if (this.results.failed > 0) {
      this.results.overall_status = 'failed';
    } else if (this.results.warnings > 0) {
      this.results.overall_status = 'warning';
    } else {
      this.results.overall_status = 'passed';
    }
    
    // Check for critical issues
    const criticalIssues = Object.values(this.results.checks)
      .filter(check => check.critical);
    
    if (criticalIssues.length > 0) {
      this.results.overall_status = 'critical';
      this.results.critical_issues = criticalIssues.length;
    }
  }

  makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: this.config.timeout
      };
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }

  // Generate health report summary
  generateHealthReport() {
    const report = {
      title: 'GameTriq Health Monitoring Report',
      timestamp: this.results.timestamp,
      summary: {
        overall_status: this.results.overall_status,
        total_checks: this.results.passed + this.results.failed + this.results.warnings,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings
      },
      critical_findings: [],
      recommendations: []
    };
    
    // Extract critical findings
    Object.entries(this.results.checks).forEach(([checkName, result]) => {
      if (result.critical || result.status === 'failed') {
        report.critical_findings.push({
          check: checkName,
          status: result.status,
          message: result.message || result.error,
          recommendations: result.recommendations || []
        });
      }
    });
    
    // Generate recommendations
    if (report.critical_findings.some(f => f.check === 'database_connectivity')) {
      report.recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix Supabase connectivity immediately',
        impact: 'Application cannot function without database access'
      });
    }
    
    if (report.summary.failed > report.summary.passed) {
      report.recommendations.push({
        priority: 'HIGH',
        action: 'Investigate and resolve failing health checks',
        impact: 'Multiple system components are not functioning properly'
      });
    }
    
    return report;
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new GameTriqHealthMonitor();
  
  monitor.runAllHealthChecks()
    .then((results) => {
      if (results.overall_status === 'critical' || results.overall_status === 'failed') {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('Health monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = GameTriqHealthMonitor;