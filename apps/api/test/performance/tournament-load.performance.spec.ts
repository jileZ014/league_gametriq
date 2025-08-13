import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { performance } from 'perf_hooks';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

import { AppModule } from '../../src/app.module';
import { TournamentService } from '../../src/modules/tournaments/tournament.service';
import { WebSocketGateway } from '../../src/websocket/websocket.gateway';
import { TestPerformanceMonitor, MockDataGenerator } from '../../src/test/setup';
import { IntegrationTestHelper } from '../integration-setup';

describe('Tournament Performance Tests', () => {
  let app: INestApplication;
  let httpServer: any;
  let tournamentService: TournamentService;
  let websocketGateway: WebSocketGateway;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    httpServer = app.getHttpServer();
    tournamentService = moduleFixture.get<TournamentService>(TournamentService);
    websocketGateway = moduleFixture.get<WebSocketGateway>(WebSocketGateway);
    authToken = 'performance-test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('High Concurrency Scenarios', () => {
    it('should handle 1000 concurrent score updates', async () => {
      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      const matches = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          IntegrationTestHelper.createTestMatch(tournament.id, {
            id: `match-${i}`,
            matchNumber: i + 1,
            homeTeamId: `team-${i * 2}`,
            awayTeamId: `team-${i * 2 + 1}`,
            status: 'in_progress',
          })
        )
      );

      // Generate 1000 score updates across 100 matches (10 per match)
      const scoreUpdatePromises = matches.flatMap((match, matchIndex) =>
        Array.from({ length: 10 }, (_, updateIndex) => {
          const homeScore = Math.floor(Math.random() * 100);
          const awayScore = Math.floor(Math.random() * 100);
          
          return request(httpServer)
            .patch(`/tournaments/${tournament.id}/matches/${match.id}/live-score`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              homeScore,
              awayScore,
              period: Math.min(updateIndex + 1, 4),
              timeRemaining: `${Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
              lastScoredBy: Math.random() > 0.5 ? match.homeTeamId : match.awayTeamId,
            });
        })
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(scoreUpdatePromises);
        const failures = results.filter(result => result.status === 'rejected');
        
        expect(failures.length).toBeLessThan(50); // <5% failure rate
        console.log(`Score updates: ${results.length - failures.length}/${results.length} succeeded`);
      });

      expect(duration).toMatchPerformanceThreshold(5000); // 5 seconds max
      console.log(`1000 concurrent score updates completed in ${duration}ms`);
    });

    it('should handle 500 simultaneous bracket generations', async () => {
      // Create 500 tournaments with 8 teams each
      const tournaments = await Promise.all(
        Array.from({ length: 500 }, async (_, i) => {
          const tournament = await IntegrationTestHelper.createTestTournament({
            name: `Load Test Tournament ${i}`,
            status: 'registration_closed',
            currentTeamCount: 8,
          });

          // Create 8 teams for each tournament
          await Promise.all(
            Array.from({ length: 8 }, (_, teamIndex) =>
              IntegrationTestHelper.createTestTeam(tournament.id, {
                teamId: `team-${i}-${teamIndex}`,
                teamName: `Team ${teamIndex + 1}`,
                seed: teamIndex + 1,
                status: 'confirmed',
              })
            )
          );

          return tournament;
        })
      );

      const bracketPromises = tournaments.map(tournament =>
        tournamentService.generateBracket(tournament.id, 'test-user', 'test-org')
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(bracketPromises);
        const failures = results.filter(result => result.status === 'rejected');
        
        expect(failures.length).toBeLessThan(10); // <2% failure rate
        console.log(`Bracket generations: ${results.length - failures.length}/${results.length} succeeded`);
      });

      expect(duration).toMatchPerformanceThreshold(30000); // 30 seconds max
      console.log(`500 bracket generations completed in ${duration}ms`);
    });

    it('should handle 1000 WebSocket connections with real-time updates', async () => {
      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      const matches = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          IntegrationTestHelper.createTestMatch(tournament.id, {
            id: `ws-match-${i}`,
            homeTeamId: `team-${i * 2}`,
            awayTeamId: `team-${i * 2 + 1}`,
            status: 'in_progress',
          })
        )
      );

      // Create 1000 WebSocket connections
      const connections: ClientSocket[] = [];
      const connectionPromises = Array.from({ length: 1000 }, (_, i) => {
        return new Promise<void>((resolve, reject) => {
          const socket = Client(`http://localhost:${httpServer.address().port}`, {
            auth: { token: `ws-test-token-${i}` },
            transports: ['websocket'],
            timeout: 5000,
          });

          socket.on('connect', () => {
            connections.push(socket);
            
            // Subscribe to tournament updates
            socket.emit('subscribe', {
              tournaments: [tournament.id],
              games: matches.slice(0, 10).map(m => m.id), // Subscribe to first 10 games
            });
            
            resolve();
          });

          socket.on('connect_error', (error) => {
            reject(error);
          });

          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
      });

      const { duration: connectionDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(connectionPromises);
        const failures = results.filter(result => result.status === 'rejected');
        
        expect(failures.length).toBeLessThan(100); // <10% connection failure rate
        console.log(`WebSocket connections: ${results.length - failures.length}/${results.length} established`);
      });

      expect(connectionDuration).toMatchPerformanceThreshold(15000); // 15 seconds to establish all connections

      // Test broadcasting to all connections
      const broadcastPromises = matches.slice(0, 10).map(match =>
        websocketGateway.broadcastGameUpdate({
          gameId: match.id,
          tournamentId: tournament.id,
          homeScore: Math.floor(Math.random() * 100),
          awayScore: Math.floor(Math.random() * 100),
          period: 4,
          timeRemaining: '2:30',
          gameStatus: 'in_progress',
          timestamp: new Date(),
        })
      );

      const { duration: broadcastDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        await Promise.all(broadcastPromises);
      });

      expect(broadcastDuration).toMatchPerformanceThreshold(2000); // 2 seconds to broadcast to all connections

      // Clean up connections
      connections.forEach(socket => socket.disconnect());
      console.log(`WebSocket test: ${connections.length} connections, broadcast in ${broadcastDuration}ms`);
    });

    it('should maintain response times under load', async () => {
      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      // Create baseline performance measurement
      const { duration: baselineDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        await request(httpServer)
          .get(`/tournaments/${tournament.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      console.log(`Baseline response time: ${baselineDuration}ms`);

      // Generate concurrent load
      const loadPromises = Array.from({ length: 1000 }, () =>
        request(httpServer)
          .get(`/tournaments/${tournament.id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const { duration: loadDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(loadPromises);
        const successes = results.filter(result => 
          result.status === 'fulfilled' && result.value.status === 200
        );
        
        expect(successes.length).toBeGreaterThan(950); // >95% success rate
      });

      // Measure post-load response time
      const { duration: postLoadDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        await request(httpServer)
          .get(`/tournaments/${tournament.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      // Response time should not degrade significantly under load
      expect(postLoadDuration).toBeLessThan(baselineDuration * 3); // Max 3x baseline
      console.log(`Load test: 1000 requests in ${loadDuration}ms, post-load response: ${postLoadDuration}ms`);
    });
  });

  describe('Database Performance', () => {
    it('should execute standing queries in <50ms', async () => {
      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      // Create 32 teams with match history
      const teams = await Promise.all(
        Array.from({ length: 32 }, (_, i) =>
          IntegrationTestHelper.createTestTeam(tournament.id, {
            teamId: `standings-team-${i}`,
            teamName: `Standings Team ${i}`,
            tournamentRecord: {
              wins: Math.floor(Math.random() * 5),
              losses: Math.floor(Math.random() * 3),
              pointsFor: Math.floor(Math.random() * 500),
              pointsAgainst: Math.floor(Math.random() * 400),
            },
          })
        )
      );

      // Test standings query performance
      const standingsQueries = Array.from({ length: 100 }, () =>
        TestPerformanceMonitor.measureAsync(async () => {
          return request(httpServer)
            .get(`/tournaments/${tournament.id}/standings`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        })
      );

      const results = await Promise.all(standingsQueries);
      const averageDuration = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
      
      expect(averageDuration).toMatchPerformanceThreshold(50);
      console.log(`Standings queries: Average ${averageDuration}ms, Max ${Math.max(...results.map(r => r.duration))}ms`);
    });

    it('should handle 100 concurrent tournament queries efficiently', async () => {
      const tournaments = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          IntegrationTestHelper.createTestTournament({
            name: `DB Test Tournament ${i}`,
            status: 'in_progress',
          })
        )
      );

      // Generate 100 concurrent queries across 20 tournaments
      const queryPromises = Array.from({ length: 100 }, (_, i) => {
        const tournament = tournaments[i % tournaments.length];
        return TestPerformanceMonitor.measureAsync(async () => {
          return request(httpServer)
            .get(`/tournaments/${tournament.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        });
      });

      const { duration: totalDuration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.all(queryPromises);
        const averageQueryTime = results.reduce((sum, result) => sum + result.duration, 0) / results.length;
        
        expect(averageQueryTime).toMatchPerformanceThreshold(100); // Average <100ms per query
        console.log(`Database queries: 100 concurrent queries, average ${averageQueryTime}ms each`);
      });

      expect(totalDuration).toMatchPerformanceThreshold(1000); // Total <1 second
    });

    it('should efficiently handle large dataset operations', async () => {
      // Create a large tournament with extensive data
      const largeTournament = await IntegrationTestHelper.createTestTournament({
        name: 'Large Dataset Tournament',
        maxTeams: 128,
        currentTeamCount: 128,
        status: 'completed',
      });

      // Create 128 teams
      const teams = await Promise.all(
        Array.from({ length: 128 }, (_, i) =>
          IntegrationTestHelper.createTestTeam(largeTournament.id, {
            teamId: `large-team-${i}`,
            teamName: `Large Team ${i}`,
            seed: i + 1,
            tournamentRecord: {
              wins: Math.floor(Math.random() * 10),
              losses: Math.floor(Math.random() * 5),
              pointsFor: Math.floor(Math.random() * 1000),
              pointsAgainst: Math.floor(Math.random() * 800),
            },
          })
        )
      );

      // Create matches (127 matches for single elimination)
      const matches = await Promise.all(
        Array.from({ length: 127 }, (_, i) =>
          IntegrationTestHelper.createTestMatch(largeTournament.id, {
            matchNumber: i + 1,
            round: Math.ceil(Math.log2(128) - Math.log2(i + 1)),
            homeScore: Math.floor(Math.random() * 100),
            awayScore: Math.floor(Math.random() * 100),
            status: 'completed',
          })
        )
      );

      // Test complex aggregation queries
      const complexQueries = [
        () => request(httpServer)
          .get(`/tournaments/${largeTournament.id}/statistics`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
        () => request(httpServer)
          .get(`/tournaments/${largeTournament.id}/bracket`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
        () => request(httpServer)
          .get(`/tournaments/${largeTournament.id}/schedule`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
        () => request(httpServer)
          .get(`/tournaments/${largeTournament.id}/standings`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
      ];

      for (const query of complexQueries) {
        const { duration } = await TestPerformanceMonitor.measureAsync(query);
        expect(duration).toMatchPerformanceThreshold(500); // Each complex query <500ms
        console.log(`Complex query completed in ${duration}ms`);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', initialMemory);

      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      // Sustained load test
      for (let round = 0; round < 10; round++) {
        const roundPromises = Array.from({ length: 100 }, () =>
          request(httpServer)
            .get(`/tournaments/${tournament.id}`)
            .set('Authorization', `Bearer ${authToken}`)
        );

        await Promise.all(roundPromises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage();
        const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory should not increase by more than 100MB
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        
        if (round % 3 === 0) {
          console.log(`Round ${round + 1}: Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        }
      }

      const finalMemory = process.memoryUsage();
      const totalIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log(`Final memory increase: ${Math.round(totalIncrease / 1024 / 1024)}MB`);
    });

    it('should handle connection pool limits gracefully', async () => {
      // Test database connection pool behavior under high load
      const queryPromises = Array.from({ length: 1000 }, async (_, i) => {
        const tournament = await IntegrationTestHelper.createTestTournament({
          name: `Pool Test ${i}`,
          status: 'draft',
        });

        return tournament.id;
      });

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        const results = await Promise.allSettled(queryPromises);
        const successes = results.filter(result => result.status === 'fulfilled');
        
        // Should handle connection pool limits without failing
        expect(successes.length).toBeGreaterThan(990); // >99% success rate
      });

      expect(duration).toMatchPerformanceThreshold(60000); // 60 seconds max
      console.log(`Connection pool test: 1000 operations in ${duration}ms`);
    });

    it('should cleanup resources efficiently', async () => {
      const resourcesBefore = {
        handles: process._getActiveHandles().length,
        requests: process._getActiveRequests().length,
      };

      // Create and destroy many resources
      const cleanupPromises = Array.from({ length: 100 }, async () => {
        const tournament = await IntegrationTestHelper.createTestTournament();
        
        // Simulate various operations
        await Promise.all([
          IntegrationTestHelper.createTestTeam(tournament.id),
          IntegrationTestHelper.createTestMatch(tournament.id),
        ]);
        
        return tournament;
      });

      await Promise.all(cleanupPromises);

      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      const resourcesAfter = {
        handles: process._getActiveHandles().length,
        requests: process._getActiveRequests().length,
      };

      // Resources should be cleaned up properly
      expect(resourcesAfter.handles).toBeLessThan(resourcesBefore.handles + 50);
      expect(resourcesAfter.requests).toBeLessThan(resourcesBefore.requests + 10);

      console.log('Resource cleanup:', {
        handlesBefore: resourcesBefore.handles,
        handlesAfter: resourcesAfter.handles,
        requestsBefore: resourcesBefore.requests,
        requestsAfter: resourcesAfter.requests,
      });
    });
  });

  describe('Stress Testing', () => {
    it('should survive extended high-load periods', async () => {
      const tournament = await IntegrationTestHelper.createTestTournament({
        status: 'in_progress',
      });

      let totalRequests = 0;
      let totalErrors = 0;
      const startTime = Date.now();
      const testDuration = 30000; // 30 seconds

      while (Date.now() - startTime < testDuration) {
        const batchPromises = Array.from({ length: 50 }, async () => {
          try {
            const response = await request(httpServer)
              .get(`/tournaments/${tournament.id}`)
              .set('Authorization', `Bearer ${authToken}`);
            
            totalRequests++;
            if (response.status !== 200) {
              totalErrors++;
            }
          } catch (error) {
            totalRequests++;
            totalErrors++;
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const actualDuration = Date.now() - startTime;
      const errorRate = (totalErrors / totalRequests) * 100;
      const requestsPerSecond = (totalRequests / actualDuration) * 1000;

      console.log(`Stress test results:
        Duration: ${actualDuration}ms
        Total requests: ${totalRequests}
        Total errors: ${totalErrors}
        Error rate: ${errorRate.toFixed(2)}%
        Requests/second: ${requestsPerSecond.toFixed(2)}`);

      expect(errorRate).toBeLessThan(5); // <5% error rate
      expect(requestsPerSecond).toBeGreaterThan(10); // >10 requests/second
    });
  });
});