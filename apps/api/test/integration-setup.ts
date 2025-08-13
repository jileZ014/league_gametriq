/**
 * Integration Test Setup
 * Configures test database and services for integration testing
 */

import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Import all entity classes for test database
import { Tournament } from '../src/modules/tournaments/entities/tournament.entity';
import { TournamentTeam } from '../src/modules/tournaments/entities/tournament-team.entity';
import { TournamentMatch } from '../src/modules/tournaments/entities/tournament-match.entity';
import { TournamentCourt } from '../src/modules/tournaments/entities/tournament-court.entity';
import { Payment } from '../src/modules/payments/entities/payment.entity';
import { PaymentLedger } from '../src/modules/payments/entities/payment-ledger.entity';
import { User } from '../src/modules/users/entities/user.entity';

let dataSource: DataSource;

// Database configuration for tests
const testDatabaseConfig = {
  type: 'postgres' as const,
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  username: process.env.TEST_DB_USERNAME || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_NAME || 'gametriq_test',
  entities: [
    Tournament,
    TournamentTeam,
    TournamentMatch,
    TournamentCourt,
    Payment,
    PaymentLedger,
    User,
  ],
  synchronize: true, // Only for tests
  dropSchema: true, // Clean slate for each test run
  logging: false,
};

beforeAll(async () => {
  // Initialize test database connection
  dataSource = new DataSource(testDatabaseConfig);
  await dataSource.initialize();
  
  console.log('Integration test database initialized');
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    console.log('Integration test database connection closed');
  }
});

// Helper functions for integration tests
export async function cleanDatabase(): Promise<void> {
  const entities = dataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  }
}

export async function getTestDataSource(): Promise<DataSource> {
  return dataSource;
}

export class IntegrationTestHelper {
  static async createTestUser(overrides = {}) {
    const userRepo = dataSource.getRepository(User);
    return userRepo.save({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'org-test',
      roles: ['coach'],
      isActive: true,
      ...overrides,
    });
  }

  static async createTestTournament(overrides = {}) {
    const tournamentRepo = dataSource.getRepository(Tournament);
    return tournamentRepo.save({
      name: 'Test Tournament',
      format: 'single_elimination',
      status: 'draft',
      minTeams: 4,
      maxTeams: 16,
      currentTeamCount: 0,
      organizationId: 'org-test',
      createdBy: 'user-test',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      ...overrides,
    });
  }

  static async createTestTeam(tournamentId: string, overrides = {}) {
    const teamRepo = dataSource.getRepository(TournamentTeam);
    return teamRepo.save({
      tournamentId,
      teamId: 'team-test',
      teamName: 'Test Team',
      status: 'confirmed',
      seed: 1,
      registration: {
        registeredAt: new Date(),
        registeredBy: 'user-test',
        paymentStatus: 'completed',
      },
      ...overrides,
    });
  }

  static async createTestMatch(tournamentId: string, overrides = {}) {
    const matchRepo = dataSource.getRepository(TournamentMatch);
    return matchRepo.save({
      tournamentId,
      matchNumber: 1,
      round: 1,
      position: 1,
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      status: 'pending',
      ...overrides,
    });
  }

  static async createTestPayment(overrides = {}) {
    const paymentRepo = dataSource.getRepository(Payment);
    return paymentRepo.save({
      userId: 'user-test',
      orderId: 'order-test',
      paymentIntentId: 'pi_test_123',
      amount: 5000,
      currency: 'usd',
      status: 'succeeded',
      metadata: {},
      ...overrides,
    });
  }
}

// Global test utilities
declare global {
  var testDataSource: DataSource;
  var integrationHelper: typeof IntegrationTestHelper;
}

global.testDataSource = dataSource;
global.integrationHelper = IntegrationTestHelper;