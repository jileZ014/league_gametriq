/**
 * Jest Test Setup Configuration
 * Sets up global test environment for basketball league API
 */

import 'reflect-metadata';
import { performance } from 'perf_hooks';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toMatchPerformanceThreshold(threshold: number): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toMatchPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be less than or equal to ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be less than or equal to ${threshold}ms`,
        pass: false,
      };
    }
  },
});

// Performance monitoring utilities for tests
export class TestPerformanceMonitor {
  private startTime: number;
  
  start(): void {
    this.startTime = performance.now();
  }
  
  end(): number {
    return performance.now() - this.startTime;
  }
  
  static async measureAsync<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }
  
  static measure<T>(operation: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    return { result, duration };
  }
}

// Mock data generators for tests
export class MockDataGenerator {
  static generateMockTournament(overrides: Partial<any> = {}): any {
    return {
      id: 'tournament-1',
      name: 'Test Tournament',
      format: 'single_elimination',
      status: 'draft',
      minTeams: 4,
      maxTeams: 16,
      currentTeamCount: 0,
      organizationId: 'org-1',
      createdBy: 'user-1',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      seedingMethod: 'manual',
      settings: {
        consolationBracket: false,
        thirdPlaceGame: true,
        minRestTime: 30,
        gameDuration: 60,
      },
      ...overrides,
    };
  }

  static generateMockTeam(overrides: Partial<any> = {}): any {
    return {
      id: 'team-1',
      teamId: 'team-1',
      teamName: 'Test Team',
      tournamentId: 'tournament-1',
      status: 'confirmed',
      seed: 1,
      divisionId: 'division-1',
      roster: [],
      coaches: [],
      tournamentRecord: {
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
      registration: {
        registeredAt: new Date(),
        registeredBy: 'user-1',
        paymentStatus: 'completed',
      },
      ...overrides,
    };
  }

  static generateMockMatch(overrides: Partial<any> = {}): any {
    return {
      id: 'match-1',
      tournamentId: 'tournament-1',
      matchNumber: 1,
      round: 1,
      position: 1,
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeScore: null,
      awayScore: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
      scheduledTime: new Date(),
      duration: 60,
      courtId: null,
      ...overrides,
    };
  }

  static generateMockPayment(overrides: Partial<any> = {}): any {
    return {
      id: 'payment-1',
      userId: 'user-1',
      orderId: 'order-1',
      paymentIntentId: 'pi_test_123',
      amount: 5000, // $50.00
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        tournamentId: 'tournament-1',
        teamId: 'team-1',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateMockTeams(count: number): any[] {
    return Array.from({ length: count }, (_, i) => 
      this.generateMockTeam({
        id: `team-${i + 1}`,
        teamId: `team-${i + 1}`,
        teamName: `Team ${i + 1}`,
        seed: i + 1,
      })
    );
  }
}

// Database test utilities
export class DatabaseTestUtils {
  static async cleanupDatabase(repositories: any[]): Promise<void> {
    for (const repository of repositories) {
      await repository.query('TRUNCATE TABLE * RESTART IDENTITY CASCADE');
    }
  }

  static async seedTestData(repositories: any[], seedData: any[]): Promise<void> {
    for (let i = 0; i < repositories.length; i++) {
      if (seedData[i] && seedData[i].length > 0) {
        await repositories[i].save(seedData[i]);
      }
    }
  }
}

// WebSocket test utilities
export class WebSocketTestUtils {
  static createMockSocket(): any {
    return {
      id: 'socket-1',
      userId: 'user-1',
      organizationId: 'org-1',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: {
          token: 'test-token',
        },
        headers: {
          'user-agent': 'test-client',
        },
        address: '127.0.0.1',
      },
    };
  }

  static createMockServer(): any {
    return {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
      },
    };
  }
}

export { TestPerformanceMonitor, MockDataGenerator, DatabaseTestUtils, WebSocketTestUtils };