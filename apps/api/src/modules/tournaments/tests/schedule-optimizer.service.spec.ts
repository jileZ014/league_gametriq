import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleOptimizerService } from '../services/schedule-optimizer.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('ScheduleOptimizerService', () => {
  let service: ScheduleOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleOptimizerService],
    }).compile();

    service = module.get<ScheduleOptimizerService>(ScheduleOptimizerService);
  });

  describe('Basic Schedule Generation', () => {
    it('should generate schedule for single court, 4 matches', async () => {
      const matches = Array.from({ length: 4 }, (_, i) => 
        MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          homeTeamId: `team-${i * 2 + 1}`,
          awayTeamId: `team-${i * 2 + 2}`,
        })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-03');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      expect(result.matches).toHaveLength(4);
      expect(result.metrics.conflicts).toBe(0);
      
      // All matches should be assigned to the single court
      result.matches.forEach(match => {
        expect(match.courtId).toBe('court-1');
        expect(match.scheduledTime).toBeDefined();
      });

      // Matches should be scheduled sequentially with proper gaps
      const sortedMatches = result.matches.sort((a, b) => 
        a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );
      
      for (let i = 1; i < sortedMatches.length; i++) {
        const gap = sortedMatches[i].scheduledTime.getTime() - 
                   sortedMatches[i - 1].scheduledTime.getTime();
        expect(gap).toBeGreaterThanOrEqual(60 * 60 * 1000); // At least 60 minutes
      }
    });

    it('should distribute matches across multiple courts', async () => {
      const matches = Array.from({ length: 8 }, (_, i) => 
        MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          homeTeamId: `team-${i * 2 + 1}`,
          awayTeamId: `team-${i * 2 + 2}`,
        })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const teams = MockDataGenerator.generateMockTeams(16);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Courts should be utilized evenly
      const court1Matches = result.matches.filter(m => m.courtId === 'court-1').length;
      const court2Matches = result.matches.filter(m => m.courtId === 'court-2').length;
      
      expect(Math.abs(court1Matches - court2Matches)).toBeLessThanOrEqual(1);
      expect(result.metrics.efficiency).toBeGreaterThan(0.7);
    });

    it('should respect tournament date boundaries', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(20);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 5,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-02');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      result.matches.forEach(match => {
        expect(match.scheduledTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(match.scheduledTime.getTime()).toBeLessThanOrEqual(
          endDate.getTime() + 24 * 60 * 60 * 1000
        );
      });
    });
  });

  describe('Rest Time Constraints', () => {
    it('should enforce minimum rest time between team games', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({
          id: 'match-1',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
        }),
        MockDataGenerator.generateMockMatch({
          id: 'match-2',
          homeTeamId: 'team-1', // Same team
          awayTeamId: 'team-3',
        }),
        MockDataGenerator.generateMockMatch({
          id: 'match-3',
          homeTeamId: 'team-2', // Same team
          awayTeamId: 'team-4',
        }),
      ];
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(4);
      const constraints = {
        minRestTime: 120, // 2 hours minimum rest
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Find matches for team-1
      const team1Matches = result.matches.filter(
        m => m.homeTeamId === 'team-1' || m.awayTeamId === 'team-1'
      ).sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      if (team1Matches.length > 1) {
        const restTime = team1Matches[1].scheduledTime.getTime() - 
                        team1Matches[0].scheduledTime.getTime();
        expect(restTime).toBeGreaterThanOrEqual(180 * 60 * 1000); // 180 min (120 rest + 60 game)
      }
    });

    it('should handle complex rest time scenarios with multiple teams', async () => {
      const matches = Array.from({ length: 12 }, (_, i) => {
        const round = Math.floor(i / 4) + 1;
        return MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          round,
          homeTeamId: `team-${(i % 4) * 2 + 1}`,
          awayTeamId: `team-${(i % 4) * 2 + 2}`,
        });
      });
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 90,
        maxGamesPerDay: 20,
        startTime: '08:00',
        endTime: '22:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      expect(result.metrics.conflicts).toBe(0);
      
      // Verify rest times for each team
      teams.forEach(team => {
        const teamMatches = result.matches.filter(
          m => m.homeTeamId === team.id || m.awayTeamId === team.id
        ).sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

        for (let i = 1; i < teamMatches.length; i++) {
          const restTime = teamMatches[i].scheduledTime.getTime() - 
                          teamMatches[i - 1].scheduledTime.getTime() - 
                          (60 * 60 * 1000); // Subtract game duration
          expect(restTime).toBeGreaterThanOrEqual(90 * 60 * 1000);
        }
      });
    });

    it('should prioritize later rounds with flexible rest times', async () => {
      const matches = [
        ...Array.from({ length: 4 }, (_, i) => 
          MockDataGenerator.generateMockMatch({
            id: `r1-match-${i + 1}`,
            round: 1,
            homeTeamId: `team-${i * 2 + 1}`,
            awayTeamId: `team-${i * 2 + 2}`,
          })
        ),
        ...Array.from({ length: 2 }, (_, i) => 
          MockDataGenerator.generateMockMatch({
            id: `r2-match-${i + 1}`,
            round: 2,
            homeTeamId: null, // To be determined
            awayTeamId: null,
          })
        ),
        MockDataGenerator.generateMockMatch({
          id: 'final',
          round: 3,
          homeTeamId: null,
          awayTeamId: null,
        }),
      ];
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 60,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Verify rounds are scheduled in order
      const round1Times = result.matches
        .filter(m => m.round === 1)
        .map(m => m.scheduledTime.getTime());
      const round2Times = result.matches
        .filter(m => m.round === 2)
        .map(m => m.scheduledTime.getTime());
      const round3Times = result.matches
        .filter(m => m.round === 3)
        .map(m => m.scheduledTime.getTime());

      if (round1Times.length && round2Times.length) {
        expect(Math.min(...round2Times)).toBeGreaterThanOrEqual(Math.max(...round1Times));
      }
      if (round2Times.length && round3Times.length) {
        expect(Math.min(...round3Times)).toBeGreaterThanOrEqual(Math.max(...round2Times));
      }
    });
  });

  describe('Daily Game Limits', () => {
    it('should respect maximum games per day per team', async () => {
      const matches = Array.from({ length: 6 }, (_, i) => 
        MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          homeTeamId: 'team-1', // Same team in all matches
          awayTeamId: `team-${i + 2}`,
        })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(7);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 3, // Team can only play 3 games per day
        startTime: '08:00',
        endTime: '22:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-02');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Count games per day for team-1
      const dateGroups = {};
      result.matches
        .filter(m => m.homeTeamId === 'team-1' || m.awayTeamId === 'team-1')
        .forEach(match => {
          const dateKey = match.scheduledTime.toISOString().split('T')[0];
          dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
        });

      Object.values(dateGroups).forEach(count => {
        expect(count).toBeLessThanOrEqual(3);
      });
    });

    it('should spread games across multiple days when needed', async () => {
      const matches = Array.from({ length: 20 }, (_, i) => 
        MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          homeTeamId: `team-${(i % 4) + 1}`,
          awayTeamId: `team-${((i + 2) % 4) + 1}`,
        })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(4);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 2,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-05');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Verify games are spread across multiple days
      const datesUsed = new Set();
      result.matches.forEach(match => {
        datesUsed.add(match.scheduledTime.toISOString().split('T')[0]);
      });

      expect(datesUsed.size).toBeGreaterThan(1);
    });
  });

  describe('Time Window Constraints', () => {
    it('should only schedule games within daily time windows', async () => {
      const matches = Array.from({ length: 8 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(16);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '09:00',
        endTime: '17:00', // 8-hour window
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-02');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      result.matches.forEach(match => {
        const hours = match.scheduledTime.getHours();
        const minutes = match.scheduledTime.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        
        expect(timeInMinutes).toBeGreaterThanOrEqual(9 * 60); // 9:00 AM
        expect(timeInMinutes).toBeLessThanOrEqual(17 * 60); // 5:00 PM
      });
    });

    it('should handle matches that cannot fit in single day window', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(20);
      const constraints = {
        minRestTime: 0,
        maxGamesPerDay: 20,
        startTime: '10:00',
        endTime: '14:00', // Only 4-hour window, can fit max 4 games
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-03');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Should use multiple days
      const datesUsed = new Set();
      result.matches.forEach(match => {
        datesUsed.add(match.scheduledTime.toISOString().split('T')[0]);
      });
      
      expect(datesUsed.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Court Assignment Optimization', () => {
    it('should prefer specific courts for certain matches', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({
          id: 'final',
          round: 3,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
        }),
        ...Array.from({ length: 4 }, (_, i) => 
          MockDataGenerator.generateMockMatch({
            id: `match-${i + 1}`,
            round: 1,
            homeTeamId: `team-${i * 2 + 3}`,
            awayTeamId: `team-${i * 2 + 4}`,
          })
        ),
      ];
      const courts = [
        { id: 'court-1', name: 'Center Court', isActive: true, priority: 1 },
        { id: 'court-2', name: 'Court 2', isActive: true, priority: 2 },
      ];
      const teams = MockDataGenerator.generateMockTeams(10);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
        preferCenterCourtForFinals: true,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Final should be on center court
      const finalMatch = result.matches.find(m => m.id === 'final');
      expect(finalMatch.courtId).toBe('court-1');
    });

    it('should balance court usage across tournament', async () => {
      const matches = Array.from({ length: 20 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
        { id: 'court-3', name: 'Court 3', isActive: true },
        { id: 'court-4', name: 'Court 4', isActive: true },
      ];
      const teams = MockDataGenerator.generateMockTeams(40);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 20,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Count matches per court
      const courtUsage = {};
      result.matches.forEach(match => {
        courtUsage[match.courtId] = (courtUsage[match.courtId] || 0) + 1;
      });

      // Each court should have roughly equal usage (±1)
      const usageCounts = Object.values(courtUsage);
      const minUsage = Math.min(...usageCounts);
      const maxUsage = Math.max(...usageCounts);
      
      expect(maxUsage - minUsage).toBeLessThanOrEqual(1);
    });
  });

  describe('Optimization Metrics', () => {
    it('should calculate efficiency metrics correctly', async () => {
      const matches = Array.from({ length: 8 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const teams = MockDataGenerator.generateMockTeams(16);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '18:00', // 10-hour window
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.efficiency).toBeGreaterThan(0);
      expect(result.metrics.efficiency).toBeLessThanOrEqual(1);
      expect(result.metrics.conflicts).toBe(0);
      expect(result.metrics.totalDuration).toBeGreaterThan(0);
      
      // With 8 matches, 60 min each, 2 courts, should take at least 4 hours
      expect(result.metrics.totalDuration).toBeGreaterThanOrEqual(240);
    });

    it('should report conflicts when constraints cannot be met', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          homeTeamId: 'team-1', // Same team in all matches
          awayTeamId: `team-${i + 2}`,
        })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(11);
      const constraints = {
        minRestTime: 120, // 2 hours rest required
        maxGamesPerDay: 10, // But with rest time, impossible
        startTime: '08:00',
        endTime: '12:00', // Only 4-hour window
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01'); // Single day only

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Should report conflicts as constraints are impossible
      expect(result.metrics.conflicts).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large tournaments efficiently', async () => {
      const matches = Array.from({ length: 127 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = Array.from({ length: 8 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true,
      }));
      const teams = MockDataGenerator.generateMockTeams(128);
      const constraints = {
        minRestTime: 60,
        maxGamesPerDay: 3,
        startTime: '08:00',
        endTime: '22:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-03');

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.optimizeSchedule(matches, courts, teams, constraints, startDate, endDate)
      );

      expect(duration).toMatchPerformanceThreshold(5000); // Should complete within 5 seconds
      expect(result.matches).toHaveLength(127);
      expect(result.metrics.conflicts).toBeLessThanOrEqual(10); // Allow some conflicts in large tournament
    });

    it('should optimize complex constraint scenarios', async () => {
      const matches = Array.from({ length: 64 }, (_, i) => {
        const round = Math.floor(Math.log2(64 - i)) + 1;
        return MockDataGenerator.generateMockMatch({
          id: `match-${i + 1}`,
          round,
        });
      });
      const courts = Array.from({ length: 4 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true,
      }));
      const teams = MockDataGenerator.generateMockTeams(64);
      const constraints = {
        minRestTime: 90,
        maxGamesPerDay: 2,
        startTime: '09:00',
        endTime: '21:00',
        gameDuration: 60,
        roundGapMinutes: 30, // Extra gap between rounds
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-04');

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.optimizeSchedule(matches, courts, teams, constraints, startDate, endDate)
      );

      expect(duration).toMatchPerformanceThreshold(3000);
      expect(result.metrics.efficiency).toBeGreaterThan(0.6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty matches array', async () => {
      const matches = [];
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(4);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      expect(result.matches).toHaveLength(0);
      expect(result.metrics.conflicts).toBe(0);
    });

    it('should handle no active courts', async () => {
      const matches = Array.from({ length: 4 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = []; // No courts available
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      await expect(
        service.optimizeSchedule(matches, courts, teams, constraints, startDate, endDate)
      ).rejects.toThrow();
    });

    it('should handle invalid date range', async () => {
      const matches = Array.from({ length: 4 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-02');
      const endDate = new Date('2024-12-01'); // End before start

      await expect(
        service.optimizeSchedule(matches, courts, teams, constraints, startDate, endDate)
      ).rejects.toThrow();
    });

    it('should handle matches with pre-assigned times', async () => {
      const fixedTime = new Date('2024-12-01T14:00:00');
      const matches = [
        MockDataGenerator.generateMockMatch({
          id: 'fixed-match',
          scheduledTime: fixedTime,
          courtId: 'court-1',
        }),
        ...Array.from({ length: 3 }, (_, i) => 
          MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
        ),
      ];
      const courts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const teams = MockDataGenerator.generateMockTeams(8);
      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 10,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-01');

      const result = await service.optimizeSchedule(
        matches,
        courts,
        teams,
        constraints,
        startDate,
        endDate
      );

      // Fixed match should retain its time
      const fixedMatch = result.matches.find(m => m.id === 'fixed-match');
      expect(fixedMatch.scheduledTime.getTime()).toBe(fixedTime.getTime());
      expect(fixedMatch.courtId).toBe('court-1');
      
      // Other matches should be scheduled around it
      const otherMatches = result.matches.filter(m => m.id !== 'fixed-match');
      otherMatches.forEach(match => {
        const timeDiff = Math.abs(match.scheduledTime.getTime() - fixedTime.getTime());
        expect(timeDiff).toBeGreaterThanOrEqual(60 * 60 * 1000); // At least 1 hour apart
      });
    });
  });
});