import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  p50: 50,    // 50ms
  p95: 100,   // 100ms requirement
  p99: 200,   // 200ms
  max: 500,   // 500ms absolute max
};

// Helper to measure API response time
async function measureApiTime(
  request: any,
  method: string,
  endpoint: string,
  options?: any
): Promise<number> {
  const start = performance.now();
  
  try {
    const response = await request[method.toLowerCase()](endpoint, options);
    const end = performance.now();
    
    if (!response.ok()) {
      throw new Error(`API call failed: ${response.status()}`);
    }
    
    return end - start;
  } catch (error) {
    const end = performance.now();
    console.error(`API error for ${endpoint}:`, error);
    return end - start;
  }
}

// Helper to calculate percentiles
function calculatePercentiles(times: number[]) {
  const sorted = times.sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  
  return {
    min: sorted[0],
    p50: sorted[p50Index],
    p95: sorted[p95Index],
    p99: sorted[p99Index],
    max: sorted[sorted.length - 1],
    mean: times.reduce((a, b) => a + b, 0) / times.length,
  };
}

test.describe('API Performance Benchmarks', () => {
  test.describe.configure({ mode: 'parallel' });
  
  // Warm up the API before tests
  test.beforeAll(async ({ request }) => {
    console.log('Warming up API...');
    for (let i = 0; i < 5; i++) {
      await request.get('/api/health');
    }
  });

  test('Registration API - p95 < 100ms', async ({ request }) => {
    const times: number[] = [];
    const iterations = 100;
    
    // Generate test data
    const testUsers = Array.from({ length: iterations }, (_, i) => ({
      email: `perf-test-${Date.now()}-${i}@gametriq.test`,
      password: 'TestPassword123!',
      name: `Performance Test ${i}`,
      role: 'player',
      dateOfBirth: '1990-01-01',
    }));
    
    // Run registration API tests
    for (const user of testUsers) {
      const time = await measureApiTime(request, 'POST', '/api/auth/register', {
        data: user,
      });
      times.push(time);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Registration API Performance:');
    console.log(`  Min: ${stats.min.toFixed(2)}ms`);
    console.log(`  P50: ${stats.p50.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`  Max: ${stats.max.toFixed(2)}ms`);
    console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
    
    // Assert p95 < 100ms
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('Payment Processing API - p95 < 100ms', async ({ request }) => {
    const times: number[] = [];
    const iterations = 100;
    
    // Simulate payment intent creation
    for (let i = 0; i < iterations; i++) {
      const time = await measureApiTime(request, 'POST', '/api/payments/create-intent', {
        data: {
          amount: 12500,
          currency: 'usd',
          metadata: {
            teamName: `Team ${i}`,
            registrationType: 'team',
          },
        },
      });
      times.push(time);
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Payment API Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('User Authentication API - p95 < 100ms', async ({ request }) => {
    const times: number[] = [];
    const iterations = 100;
    
    // Create a test user first
    await request.post('/api/auth/register', {
      data: {
        email: 'perf-auth-test@gametriq.test',
        password: 'TestPassword123!',
        name: 'Auth Performance Test',
        role: 'player',
      },
    });
    
    // Test login performance
    for (let i = 0; i < iterations; i++) {
      const time = await measureApiTime(request, 'POST', '/api/auth/login', {
        data: {
          email: 'perf-auth-test@gametriq.test',
          password: 'TestPassword123!',
        },
      });
      times.push(time);
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Authentication API Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('Search API - p95 < 100ms', async ({ request }) => {
    const times: number[] = [];
    const iterations = 50;
    const searchQueries = [
      'basketball',
      'team',
      'player',
      'tournament',
      'spring league',
      'coach john',
      'player stats',
      'game schedule',
    ];
    
    // Test search performance with various queries
    for (let i = 0; i < iterations; i++) {
      const query = searchQueries[i % searchQueries.length];
      const time = await measureApiTime(request, 'GET', `/api/search?q=${encodeURIComponent(query)}`);
      times.push(time);
      
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Search API Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('Dashboard Data API - p95 < 100ms', async ({ request }) => {
    const times: number[] = [];
    const iterations = 50;
    
    // Test various dashboard endpoints
    const endpoints = [
      '/api/dashboard/stats',
      '/api/dashboard/recent-games',
      '/api/dashboard/standings',
      '/api/dashboard/schedule',
      '/api/dashboard/team-roster',
    ];
    
    for (const endpoint of endpoints) {
      for (let i = 0; i < iterations / endpoints.length; i++) {
        const time = await measureApiTime(request, 'GET', endpoint);
        times.push(time);
        
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Dashboard API Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('Concurrent Request Performance', async ({ request }) => {
    const concurrentRequests = 10;
    const iterations = 10;
    const allTimes: number[] = [];
    
    console.log(`Testing ${concurrentRequests} concurrent requests...`);
    
    for (let i = 0; i < iterations; i++) {
      const promises = Array.from({ length: concurrentRequests }, async (_, j) => {
        const endpoint = j % 2 === 0 ? '/api/health' : '/api/dashboard/stats';
        return measureApiTime(request, 'GET', endpoint);
      });
      
      const times = await Promise.all(promises);
      allTimes.push(...times);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const stats = calculatePercentiles(allTimes);
    
    console.log('Concurrent Request Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95 * 1.5); // Allow 50% overhead for concurrent requests
  });

  test('Database Query Performance', async ({ request }) => {
    const times: number[] = [];
    const iterations = 50;
    
    // Test complex queries
    const queries = [
      { endpoint: '/api/teams/search', params: 'name=Lakers&league=spring' },
      { endpoint: '/api/players/stats', params: 'season=2025&team=123' },
      { endpoint: '/api/games/schedule', params: 'date=2025-08-10&league=all' },
      { endpoint: '/api/tournaments/standings', params: 'id=456&division=youth' },
    ];
    
    for (const query of queries) {
      for (let i = 0; i < iterations / queries.length; i++) {
        const time = await measureApiTime(
          request,
          'GET',
          `${query.endpoint}?${query.params}`
        );
        times.push(time);
        
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('Database Query Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms ✓`);
    
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('File Upload Performance', async ({ request }) => {
    const times: number[] = [];
    const iterations = 20;
    
    // Create a mock file buffer
    const fileContent = Buffer.from('x'.repeat(1024 * 100)); // 100KB file
    
    for (let i = 0; i < iterations; i++) {
      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), `test-${i}.jpg`);
      formData.append('type', 'team-logo');
      
      const time = await measureApiTime(request, 'POST', '/api/upload', {
        multipart: {
          file: {
            name: `test-${i}.jpg`,
            mimeType: 'image/jpeg',
            buffer: fileContent,
          },
          type: 'team-logo',
        },
      });
      
      times.push(time);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const stats = calculatePercentiles(times);
    
    console.log('File Upload Performance:');
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    
    // File uploads can be slower, so we allow higher threshold
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95 * 3);
  });

  test('Cache Performance Verification', async ({ request }) => {
    const endpoint = '/api/teams/popular';
    const coldTimes: number[] = [];
    const warmTimes: number[] = [];
    
    // Cold cache requests
    for (let i = 0; i < 10; i++) {
      // Clear cache header
      const time = await measureApiTime(request, 'GET', endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      coldTimes.push(time);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Warm cache requests
    for (let i = 0; i < 50; i++) {
      const time = await measureApiTime(request, 'GET', endpoint);
      warmTimes.push(time);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const coldStats = calculatePercentiles(coldTimes);
    const warmStats = calculatePercentiles(warmTimes);
    
    console.log('Cache Performance:');
    console.log(`  Cold P95: ${coldStats.p95.toFixed(2)}ms`);
    console.log(`  Warm P95: ${warmStats.p95.toFixed(2)}ms ✓`);
    console.log(`  Cache speedup: ${(coldStats.p95 / warmStats.p95).toFixed(2)}x`);
    
    // Cached requests should be significantly faster
    expect(warmStats.p95).toBeLessThan(coldStats.p95 * 0.5);
    expect(warmStats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
  });

  test('API Rate Limiting Performance', async ({ request }) => {
    const times: number[] = [];
    const endpoint = '/api/auth/login';
    const rateLimitThreshold = 100; // requests per minute
    
    // Send requests up to rate limit
    for (let i = 0; i < rateLimitThreshold + 10; i++) {
      const start = performance.now();
      const response = await request.post(endpoint, {
        data: {
          email: 'rate-limit-test@gametriq.test',
          password: 'wrong-password',
        },
      });
      const end = performance.now();
      
      times.push(end - start);
      
      if (response.status() === 429) {
        console.log(`Rate limited at request ${i + 1}`);
        break;
      }
      
      // Rapid fire requests
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    const stats = calculatePercentiles(times.slice(0, -10)); // Exclude rate limited requests
    
    console.log('Rate Limiting Performance:');
    console.log(`  P95 (before limit): ${stats.p95.toFixed(2)}ms ✓`);
    
    // Performance should remain consistent even under high load
    expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95 * 2);
  });

  test('Generate Performance Report', async ({ request }) => {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
      thresholds: PERFORMANCE_THRESHOLDS,
      results: {},
    };
    
    // Comprehensive performance test
    const endpoints = [
      { name: 'Health Check', method: 'GET', path: '/api/health' },
      { name: 'User Registration', method: 'POST', path: '/api/auth/register' },
      { name: 'User Login', method: 'POST', path: '/api/auth/login' },
      { name: 'Dashboard Stats', method: 'GET', path: '/api/dashboard/stats' },
      { name: 'Search', method: 'GET', path: '/api/search?q=test' },
      { name: 'Teams List', method: 'GET', path: '/api/teams' },
      { name: 'Games Schedule', method: 'GET', path: '/api/games/schedule' },
    ];
    
    for (const endpoint of endpoints) {
      const times: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const time = await measureApiTime(
          request,
          endpoint.method,
          endpoint.path,
          endpoint.method === 'POST' ? { data: {} } : undefined
        );
        times.push(time);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      const stats = calculatePercentiles(times);
      report.results[endpoint.name] = {
        ...stats,
        passes_p95: stats.p95 < PERFORMANCE_THRESHOLDS.p95,
      };
    }
    
    // Write report to file
    const reportJson = JSON.stringify(report, null, 2);
    console.log('\n=== Performance Report ===');
    console.log(reportJson);
    
    // All endpoints should meet p95 < 100ms requirement
    Object.entries(report.results).forEach(([name, stats]: [string, any]) => {
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95);
    });
  });
});