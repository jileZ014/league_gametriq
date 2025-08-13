import { Test, TestingModule } from '@nestjs/testing';
import { CourtAssignerService } from '../services/court-assigner.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('CourtAssignerService', () => {
  let service: CourtAssignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourtAssignerService],
    }).compile();

    service = module.get<CourtAssignerService>(CourtAssignerService);
  });

  describe('Basic Court Assignment', () => {
    it('should assign single match to single court', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ id: 'match-1' })
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true }
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      expect(result).toHaveLength(1);
      expect(result[0].courtId).toBe('court-1');
      expect(result[0].id).toBe('match-1');
    });

    it('should distribute matches evenly across multiple courts', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      const court1Count = result.filter(m => m.courtId === 'court-1').length;
      const court2Count = result.filter(m => m.courtId === 'court-2').length;
      
      expect(Math.abs(court1Count - court2Count)).toBeLessThanOrEqual(1);
      expect(court1Count + court2Count).toBe(10);
    });

    it('should handle more courts than matches', async () => {
      const matches = Array.from({ length: 3 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = Array.from({ length: 5 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true
      }));
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      expect(result).toHaveLength(3);
      const usedCourts = new Set(result.map(m => m.courtId));
      expect(usedCourts.size).toBeLessThanOrEqual(3);
    });

    it('should skip inactive courts', async () => {
      const matches = Array.from({ length: 5 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: false },
        { id: 'court-3', name: 'Court 3', isActive: true },
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      const court2Matches = result.filter(m => m.courtId === 'court-2');
      expect(court2Matches).toHaveLength(0);
      
      const activeCourts = result.every(m => 
        m.courtId === 'court-1' || m.courtId === 'court-3'
      );
      expect(activeCourts).toBe(true);
    });
  });

  describe('Priority-Based Assignment', () => {
    it('should prioritize center court for finals', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'final', 
          round: 5,
          isFinal: true 
        }),
        ...Array.from({ length: 4 }, (_, i) => 
          MockDataGenerator.generateMockMatch({ 
            id: `match-${i + 1}`,
            round: 1 
          })
        ),
      ];
      const courts = [
        { id: 'center-court', name: 'Center Court', isActive: true, priority: 1 },
        { id: 'court-2', name: 'Court 2', isActive: true, priority: 2 },
        { id: 'court-3', name: 'Court 3', isActive: true, priority: 3 },
      ];
      const constraints = {
        preferCenterCourtForFinals: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      const finalMatch = result.find(m => m.id === 'final');
      expect(finalMatch.courtId).toBe('center-court');
    });

    it('should assign higher rounds to better courts', async () => {
      const matches = [
        ...Array.from({ length: 8 }, (_, i) => 
          MockDataGenerator.generateMockMatch({ 
            id: `r1-match-${i + 1}`,
            round: 1 
          })
        ),
        ...Array.from({ length: 4 }, (_, i) => 
          MockDataGenerator.generateMockMatch({ 
            id: `r2-match-${i + 1}`,
            round: 2 
          })
        ),
        ...Array.from({ length: 2 }, (_, i) => 
          MockDataGenerator.generateMockMatch({ 
            id: `r3-match-${i + 1}`,
            round: 3 
          })
        ),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true, priority: 1 },
        { id: 'court-2', name: 'Court 2', isActive: true, priority: 2 },
        { id: 'court-3', name: 'Court 3', isActive: true, priority: 3 },
        { id: 'court-4', name: 'Court 4', isActive: true, priority: 4 },
      ];
      const constraints = {
        prioritizeByRound: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Higher rounds should tend to be on lower priority (better) courts
      const r3Matches = result.filter(m => m.round === 3);
      const r3Courts = r3Matches.map(m => m.courtId);
      
      expect(r3Courts).toContain('court-1');
    });

    it('should respect court capacity constraints', async () => {
      const matches = Array.from({ length: 20 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true, maxGamesPerDay: 8 },
        { id: 'court-2', name: 'Court 2', isActive: true, maxGamesPerDay: 8 },
        { id: 'court-3', name: 'Court 3', isActive: true, maxGamesPerDay: 6 },
      ];
      const constraints = {
        respectCourtCapacity: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      const court1Count = result.filter(m => m.courtId === 'court-1').length;
      const court2Count = result.filter(m => m.courtId === 'court-2').length;
      const court3Count = result.filter(m => m.courtId === 'court-3').length;
      
      expect(court1Count).toBeLessThanOrEqual(8);
      expect(court2Count).toBeLessThanOrEqual(8);
      expect(court3Count).toBeLessThanOrEqual(6);
    });
  });

  describe('Time-Based Assignment', () => {
    it('should avoid court conflicts for overlapping times', async () => {
      const baseTime = new Date('2024-12-01T10:00:00');
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          scheduledTime: baseTime
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2',
          scheduledTime: new Date(baseTime.getTime() + 30 * 60000) // 30 min later
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3',
          scheduledTime: new Date(baseTime.getTime() + 90 * 60000) // 90 min later
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {
        gameDuration: 60,
        bufferTime: 15
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Match 1 and 2 overlap (with buffer), should be on different courts
      const match1 = result.find(m => m.id === 'match-1');
      const match2 = result.find(m => m.id === 'match-2');
      expect(match1.courtId).not.toBe(match2.courtId);
      
      // Match 3 doesn't overlap with match 1, can be on same court
      const match3 = result.find(m => m.id === 'match-3');
      expect([match1.courtId, match2.courtId]).toContain(match3.courtId);
    });

    it('should optimize court utilization over time', async () => {
      const baseTime = new Date('2024-12-01T08:00:00');
      const matches = Array.from({ length: 12 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ 
          id: `match-${i + 1}`,
          scheduledTime: new Date(baseTime.getTime() + Math.floor(i / 3) * 90 * 60000)
        })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
        { id: 'court-3', name: 'Court 3', isActive: true },
      ];
      const constraints = {
        gameDuration: 60,
        bufferTime: 15
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Each time slot should use all available courts
      for (let slot = 0; slot < 4; slot++) {
        const slotMatches = result.filter(m => 
          m.id.endsWith(`-${slot * 3 + 1}`) ||
          m.id.endsWith(`-${slot * 3 + 2}`) ||
          m.id.endsWith(`-${slot * 3 + 3}`)
        );
        
        const courtsUsed = new Set(slotMatches.map(m => m.courtId));
        expect(courtsUsed.size).toBe(3);
      }
    });

    it('should handle court availability windows', async () => {
      const baseTime = new Date('2024-12-01T08:00:00');
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ 
          id: `match-${i + 1}`,
          scheduledTime: new Date(baseTime.getTime() + i * 120 * 60000) // Every 2 hours
        })
      );
      const courts = [
        { 
          id: 'court-1', 
          name: 'Court 1', 
          isActive: true,
          availableFrom: '08:00',
          availableTo: '12:00'
        },
        { 
          id: 'court-2', 
          name: 'Court 2', 
          isActive: true,
          availableFrom: '12:00',
          availableTo: '20:00'
        },
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      // Morning matches should be on court-1
      const morningMatches = result.filter(m => {
        const hour = new Date(m.scheduledTime).getHours();
        return hour >= 8 && hour < 12;
      });
      morningMatches.forEach(m => {
        expect(m.courtId).toBe('court-1');
      });

      // Afternoon matches should be on court-2
      const afternoonMatches = result.filter(m => {
        const hour = new Date(m.scheduledTime).getHours();
        return hour >= 12;
      });
      afternoonMatches.forEach(m => {
        expect(m.courtId).toBe('court-2');
      });
    });
  });

  describe('Load Balancing', () => {
    it('should balance total game time across courts', async () => {
      const matches = Array.from({ length: 15 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ 
          id: `match-${i + 1}`,
          duration: 60 + (i % 3) * 30 // Variable durations: 60, 90, 120 min
        })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
        { id: 'court-3', name: 'Court 3', isActive: true },
      ];
      const constraints = {
        balanceByDuration: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Calculate total duration per court
      const courtDurations = {};
      result.forEach(match => {
        courtDurations[match.courtId] = (courtDurations[match.courtId] || 0) + match.duration;
      });

      const durations = Object.values(courtDurations);
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      
      // Should be reasonably balanced (within 20%)
      expect(maxDuration - minDuration).toBeLessThanOrEqual(minDuration * 0.2);
    });

    it('should balance matches by team distribution', async () => {
      // Create matches where some teams play multiple times
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2',
          homeTeamId: 'team-3',
          awayTeamId: 'team-4'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3',
          homeTeamId: 'team-1',
          awayTeamId: 'team-3'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-4',
          homeTeamId: 'team-2',
          awayTeamId: 'team-4'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-5',
          homeTeamId: 'team-1',
          awayTeamId: 'team-4'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {
        distributeTeamsAcrossCourts: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Team 1 plays 3 times, should be distributed
      const team1Matches = result.filter(m => 
        m.homeTeamId === 'team-1' || m.awayTeamId === 'team-1'
      );
      const team1Courts = new Set(team1Matches.map(m => m.courtId));
      
      // Should use both courts for team variety
      expect(team1Courts.size).toBeGreaterThan(1);
    });
  });

  describe('Special Constraints', () => {
    it('should keep division matches on same court', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          divisionId: 'div-1'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2',
          divisionId: 'div-1'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3',
          divisionId: 'div-2'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-4',
          divisionId: 'div-2'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {
        keepDivisionsTogether: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      const div1Courts = new Set(
        result.filter(m => m.divisionId === 'div-1').map(m => m.courtId)
      );
      const div2Courts = new Set(
        result.filter(m => m.divisionId === 'div-2').map(m => m.courtId)
      );
      
      // Each division should be on a single court
      expect(div1Courts.size).toBe(1);
      expect(div2Courts.size).toBe(1);
    });

    it('should handle court preferences for teams', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          homeTeamId: 'team-1',
          homeTeamPreferredCourt: 'court-1'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2',
          homeTeamId: 'team-2',
          homeTeamPreferredCourt: 'court-2'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3',
          homeTeamId: 'team-3'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {
        respectTeamPreferences: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      const match1 = result.find(m => m.id === 'match-1');
      const match2 = result.find(m => m.id === 'match-2');
      
      // Should respect preferences when possible
      expect(match1.courtId).toBe('court-1');
      expect(match2.courtId).toBe('court-2');
    });

    it('should handle court surface preferences', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          requiredSurface: 'hardwood'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2',
          requiredSurface: 'sport-court'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true, surface: 'hardwood' },
        { id: 'court-2', name: 'Court 2', isActive: true, surface: 'sport-court' },
        { id: 'court-3', name: 'Court 3', isActive: true, surface: 'hardwood' },
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      const match1 = result.find(m => m.id === 'match-1');
      const match2 = result.find(m => m.id === 'match-2');
      
      expect(['court-1', 'court-3']).toContain(match1.courtId);
      expect(match2.courtId).toBe('court-2');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of matches efficiently', async () => {
      const matches = Array.from({ length: 200 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = Array.from({ length: 10 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true
      }));
      const constraints = {};

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.assignCourts(matches, courts, constraints)
      );

      expect(duration).toMatchPerformanceThreshold(1000); // Should complete within 1 second
      expect(result).toHaveLength(200);
      
      // Verify even distribution
      const courtCounts = {};
      result.forEach(m => {
        courtCounts[m.courtId] = (courtCounts[m.courtId] || 0) + 1;
      });
      
      const counts = Object.values(courtCounts);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);
      expect(maxCount - minCount).toBeLessThanOrEqual(1);
    });

    it('should optimize complex constraints efficiently', async () => {
      const baseTime = new Date('2024-12-01T08:00:00');
      const matches = Array.from({ length: 100 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ 
          id: `match-${i + 1}`,
          scheduledTime: new Date(baseTime.getTime() + (i % 20) * 90 * 60000),
          round: Math.floor(i / 25) + 1,
          divisionId: `div-${(i % 4) + 1}`,
          homeTeamId: `team-${(i % 10) + 1}`,
          awayTeamId: `team-${((i + 5) % 10) + 1}`,
        })
      );
      const courts = Array.from({ length: 5 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true,
        priority: i + 1
      }));
      const constraints = {
        gameDuration: 60,
        bufferTime: 15,
        prioritizeByRound: true,
        keepDivisionsTogether: true,
        distributeTeamsAcrossCourts: true
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.assignCourts(matches, courts, constraints)
      );

      expect(duration).toMatchPerformanceThreshold(2000); // Should complete within 2 seconds
      expect(result).toHaveLength(100);
    });

    it('should handle concurrent assignments', async () => {
      const matches = Array.from({ length: 50 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = Array.from({ length: 5 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court ${i + 1}`,
        isActive: true
      }));
      const constraints = {};

      const promises = Array.from({ length: 10 }, () => 
        service.assignCourts(matches, courts, constraints)
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(promises)
      );

      expect(duration).toMatchPerformanceThreshold(3000); // 10 concurrent within 3 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty matches array', async () => {
      const matches = [];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true }
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      expect(result).toHaveLength(0);
    });

    it('should throw error for no active courts', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ id: 'match-1' })
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: false }
      ];
      const constraints = {};

      await expect(
        service.assignCourts(matches, courts, constraints)
      ).rejects.toThrow();
    });

    it('should handle matches with pre-assigned courts', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          courtId: 'court-2' // Pre-assigned
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-2'
        }),
        MockDataGenerator.generateMockMatch({ 
          id: 'match-3'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const constraints = {};

      const result = await service.assignCourts(matches, courts, constraints);

      const match1 = result.find(m => m.id === 'match-1');
      expect(match1.courtId).toBe('court-2'); // Should keep pre-assigned court
      
      // Other matches should be distributed
      const match2 = result.find(m => m.id === 'match-2');
      const match3 = result.find(m => m.id === 'match-3');
      expect([match2.courtId, match3.courtId]).toContain('court-1');
    });

    it('should handle invalid court references gracefully', async () => {
      const matches = [
        MockDataGenerator.generateMockMatch({ 
          id: 'match-1',
          homeTeamPreferredCourt: 'non-existent-court'
        }),
      ];
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true }
      ];
      const constraints = {
        respectTeamPreferences: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      expect(result[0].courtId).toBe('court-1'); // Should fallback to available court
    });

    it('should handle all courts at capacity', async () => {
      const matches = Array.from({ length: 10 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );
      const courts = [
        { id: 'court-1', name: 'Court 1', isActive: true, maxGamesPerDay: 3 },
        { id: 'court-2', name: 'Court 2', isActive: true, maxGamesPerDay: 3 },
      ];
      const constraints = {
        respectCourtCapacity: true
      };

      const result = await service.assignCourts(matches, courts, constraints);

      // Should only assign up to capacity
      const assignedCount = result.filter(m => m.courtId !== null).length;
      expect(assignedCount).toBeLessThanOrEqual(6);
      
      // Some matches may remain unassigned
      const unassignedCount = result.filter(m => m.courtId === null).length;
      expect(unassignedCount).toBe(4);
    });
  });
});