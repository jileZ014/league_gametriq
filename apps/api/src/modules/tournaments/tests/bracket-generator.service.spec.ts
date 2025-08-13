import { Test, TestingModule } from '@nestjs/testing';
import { BracketGeneratorService } from '../services/bracket-generator.service';
import { TournamentFormat } from '../entities/tournament.entity';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('BracketGeneratorService', () => {
  let service: BracketGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BracketGeneratorService],
    }).compile();

    service = module.get<BracketGeneratorService>(BracketGeneratorService);
  });

  describe('Single Elimination Bracket Generation', () => {
    it('should generate correct bracket for 4 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBe(2);
      expect(result.matches).toHaveLength(3); // 2 semifinals + 1 final
      expect(result.structure.rounds).toBe(2);
      
      // Verify first round matches
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches).toHaveLength(2);
      expect(firstRoundMatches[0].homeTeamId).toBe('team-1');
      expect(firstRoundMatches[0].awayTeamId).toBe('team-4');
      expect(firstRoundMatches[1].homeTeamId).toBe('team-2');
      expect(firstRoundMatches[1].awayTeamId).toBe('team-3');
    });

    it('should generate correct bracket for 8 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBe(3);
      expect(result.matches).toHaveLength(7); // 4 + 2 + 1
      
      // Verify proper seeding (1v8, 4v5, 2v7, 3v6)
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches).toHaveLength(4);
      expect(firstRoundMatches[0].homeTeamId).toBe('team-1');
      expect(firstRoundMatches[0].awayTeamId).toBe('team-8');
      expect(firstRoundMatches[1].homeTeamId).toBe('team-4');
      expect(firstRoundMatches[1].awayTeamId).toBe('team-5');
      expect(firstRoundMatches[2].homeTeamId).toBe('team-2');
      expect(firstRoundMatches[2].awayTeamId).toBe('team-7');
      expect(firstRoundMatches[3].homeTeamId).toBe('team-3');
      expect(firstRoundMatches[3].awayTeamId).toBe('team-6');
    });

    it('should generate correct bracket for 16 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(16);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBe(4);
      expect(result.matches).toHaveLength(15); // 8 + 4 + 2 + 1
      
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches).toHaveLength(8);
    });

    it('should generate correct bracket for 32 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(32);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateBracket(config)
      );

      expect(duration).toMatchPerformanceThreshold(1000); // Should complete within 1 second
      expect(result.totalRounds).toBe(5);
      expect(result.matches).toHaveLength(31); // 16 + 8 + 4 + 2 + 1
    });

    it('should generate correct bracket for 64 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(64);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateBracket(config)
      );

      expect(duration).toMatchPerformanceThreshold(2000); // Should complete within 2 seconds
      expect(result.totalRounds).toBe(6);
      expect(result.matches).toHaveLength(63); // 32 + 16 + 8 + 4 + 2 + 1
    });

    it('should handle non-power-of-2 teams with byes (6 teams)', async () => {
      const teams = MockDataGenerator.generateMockTeams(6);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBe(3);
      expect(result.matches).toHaveLength(5); // 2 first round + 2 semifinals + 1 final
      
      // Top 2 seeds should get byes
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches).toHaveLength(2);
      expect(firstRoundMatches[0].homeTeamId).toBe('team-3');
      expect(firstRoundMatches[0].awayTeamId).toBe('team-6');
      expect(firstRoundMatches[1].homeTeamId).toBe('team-4');
      expect(firstRoundMatches[1].awayTeamId).toBe('team-5');
      
      // Second round should have seeds 1 and 2
      const secondRoundMatches = result.matches.filter(m => m.round === 2);
      expect(secondRoundMatches).toHaveLength(2);
    });

    it('should handle non-power-of-2 teams with byes (10 teams)', async () => {
      const teams = MockDataGenerator.generateMockTeams(10);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBe(4);
      expect(result.matches).toHaveLength(9);
      
      // 6 teams should get byes (top 6 seeds)
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches).toHaveLength(2);
    });

    it('should generate third place game when requested', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
        includeThirdPlace: true,
      };

      const result = await service.generateBracket(config);

      expect(result.matches).toHaveLength(8); // 7 regular + 1 third place
      
      const thirdPlaceMatch = result.matches.find(m => m.bracketType === 'THIRD_PLACE');
      expect(thirdPlaceMatch).toBeDefined();
      expect(thirdPlaceMatch.round).toBe(3);
    });

    it('should properly link matches with next match pointers', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      const finalMatch = result.matches.find(m => m.round === 2);

      // Both semifinals should point to the final
      expect(firstRoundMatches[0].nextMatches.winnerTo).toEqual({
        matchId: finalMatch.id,
        position: 'home',
      });
      expect(firstRoundMatches[1].nextMatches.winnerTo).toEqual({
        matchId: finalMatch.id,
        position: 'away',
      });
    });
  });

  describe('Double Elimination Bracket Generation', () => {
    it('should generate correct bracket for 4 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.DOUBLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      expect(result.totalRounds).toBeGreaterThanOrEqual(4);
      
      const winnersBracket = result.matches.filter(m => m.bracketType === 'WINNERS');
      const losersBracket = result.matches.filter(m => m.bracketType === 'LOSERS');
      const grandFinal = result.matches.filter(m => m.bracketType === 'GRAND_FINAL');
      
      expect(winnersBracket.length).toBeGreaterThan(0);
      expect(losersBracket.length).toBeGreaterThan(0);
      expect(grandFinal.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate correct bracket for 8 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.DOUBLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      const winnersBracket = result.matches.filter(m => m.bracketType === 'WINNERS');
      const losersBracket = result.matches.filter(m => m.bracketType === 'LOSERS');
      
      expect(winnersBracket).toHaveLength(7); // Same as single elim
      expect(losersBracket.length).toBeGreaterThan(0);
      
      // Verify losers bracket connections from winners bracket
      const firstRoundWinners = winnersBracket.filter(m => m.round === 1);
      firstRoundWinners.forEach(match => {
        expect(match.nextMatches.loserTo).toBeDefined();
      });
    });

    it('should generate correct bracket for 16 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(16);
      const config = {
        format: TournamentFormat.DOUBLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateBracket(config)
      );

      expect(duration).toMatchPerformanceThreshold(2000);
      
      const winnersBracket = result.matches.filter(m => m.bracketType === 'WINNERS');
      const losersBracket = result.matches.filter(m => m.bracketType === 'LOSERS');
      
      expect(winnersBracket).toHaveLength(15);
      expect(losersBracket.length).toBeGreaterThan(0);
    });

    it('should properly route losers to losers bracket', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.DOUBLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      const winnersFirstRound = result.matches.filter(
        m => m.bracketType === 'WINNERS' && m.round === 1
      );
      
      winnersFirstRound.forEach(match => {
        expect(match.nextMatches.loserTo).toBeDefined();
        expect(match.nextMatches.loserTo.matchId).toBeDefined();
        
        const loserMatch = result.matches.find(
          m => m.id === match.nextMatches.loserTo.matchId
        );
        expect(loserMatch).toBeDefined();
        expect(loserMatch.bracketType).toBe('LOSERS');
      });
    });

    it('should create grand final and potential reset match', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.DOUBLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      const grandFinals = result.matches.filter(m => m.bracketType === 'GRAND_FINAL');
      expect(grandFinals.length).toBeGreaterThanOrEqual(1);
      
      // Should have main grand final
      const mainGrandFinal = grandFinals.find(m => !m.isReset);
      expect(mainGrandFinal).toBeDefined();
      
      // Reset match should be prepared
      const resetMatch = grandFinals.find(m => m.isReset);
      if (resetMatch) {
        expect(resetMatch.round).toBe(mainGrandFinal.round + 1);
      }
    });
  });

  describe('Round Robin Bracket Generation', () => {
    it('should generate correct matches for 4 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.ROUND_ROBIN,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      // Each team plays every other team once: n*(n-1)/2
      expect(result.matches).toHaveLength(6);
      
      // Verify each team plays 3 matches
      const teamMatchCounts = {};
      result.matches.forEach(match => {
        teamMatchCounts[match.homeTeamId] = (teamMatchCounts[match.homeTeamId] || 0) + 1;
        teamMatchCounts[match.awayTeamId] = (teamMatchCounts[match.awayTeamId] || 0) + 1;
      });
      
      Object.values(teamMatchCounts).forEach(count => {
        expect(count).toBe(3);
      });
    });

    it('should generate correct matches for 6 teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(6);
      const config = {
        format: TournamentFormat.ROUND_ROBIN,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      // 6 teams: 6*5/2 = 15 matches
      expect(result.matches).toHaveLength(15);
      
      // Each team should play 5 matches
      const teamMatchCounts = {};
      result.matches.forEach(match => {
        teamMatchCounts[match.homeTeamId] = (teamMatchCounts[match.homeTeamId] || 0) + 1;
        teamMatchCounts[match.awayTeamId] = (teamMatchCounts[match.awayTeamId] || 0) + 1;
      });
      
      Object.values(teamMatchCounts).forEach(count => {
        expect(count).toBe(5);
      });
    });

    it('should organize matches into proper rounds', async () => {
      const teams = MockDataGenerator.generateMockTeams(4);
      const config = {
        format: TournamentFormat.ROUND_ROBIN,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      // Should have 3 rounds for 4 teams
      expect(result.totalRounds).toBe(3);
      
      // Each round should have 2 matches (4 teams / 2)
      for (let round = 1; round <= 3; round++) {
        const roundMatches = result.matches.filter(m => m.round === round);
        expect(roundMatches).toHaveLength(2);
        
        // No team should play twice in the same round
        const teamsInRound = new Set();
        roundMatches.forEach(match => {
          expect(teamsInRound.has(match.homeTeamId)).toBe(false);
          expect(teamsInRound.has(match.awayTeamId)).toBe(false);
          teamsInRound.add(match.homeTeamId);
          teamsInRound.add(match.awayTeamId);
        });
      }
    });

    it('should handle odd number of teams with byes', async () => {
      const teams = MockDataGenerator.generateMockTeams(5);
      const config = {
        format: TournamentFormat.ROUND_ROBIN,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      // 5 teams: 5*4/2 = 10 matches
      expect(result.matches).toHaveLength(10);
      
      // Should have 5 rounds (each team gets one bye)
      expect(result.totalRounds).toBe(5);
      
      // Each round should have 2 matches (one team has bye)
      for (let round = 1; round <= 5; round++) {
        const roundMatches = result.matches.filter(m => m.round === round);
        expect(roundMatches).toHaveLength(2);
      }
    });
  });

  describe('Pool Play Bracket Generation', () => {
    it('should generate correct pools for 8 teams in 2 pools', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'manual',
        poolCount: 2,
        teamsPerPool: 4,
        advanceFromPool: 2,
      };

      const result = await service.generateBracket(config);

      // Pool stage matches
      const poolMatches = result.matches.filter(m => m.bracketType === 'POOL');
      // Each pool has 6 matches (4 teams round robin), total 12
      expect(poolMatches).toHaveLength(12);
      
      // Verify pool assignments
      const poolA = poolMatches.filter(m => m.pool === 'A');
      const poolB = poolMatches.filter(m => m.pool === 'B');
      expect(poolA).toHaveLength(6);
      expect(poolB).toHaveLength(6);
    });

    it('should generate knockout stage after pools', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'manual',
        poolCount: 2,
        teamsPerPool: 4,
        advanceFromPool: 2,
      };

      const result = await service.generateBracket(config);

      // Knockout stage matches (4 teams advance, so 3 matches)
      const knockoutMatches = result.matches.filter(m => m.bracketType === 'KNOCKOUT');
      expect(knockoutMatches).toHaveLength(3); // 2 semis + 1 final
    });

    it('should generate correct pools for 16 teams in 4 pools', async () => {
      const teams = MockDataGenerator.generateMockTeams(16);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'manual',
        poolCount: 4,
        teamsPerPool: 4,
        advanceFromPool: 2,
      };

      const result = await service.generateBracket(config);

      const poolMatches = result.matches.filter(m => m.bracketType === 'POOL');
      // Each pool has 6 matches, 4 pools = 24 matches
      expect(poolMatches).toHaveLength(24);
      
      // Verify each pool
      ['A', 'B', 'C', 'D'].forEach(poolName => {
        const poolGames = poolMatches.filter(m => m.pool === poolName);
        expect(poolGames).toHaveLength(6);
      });
      
      // Knockout stage (8 teams advance)
      const knockoutMatches = result.matches.filter(m => m.bracketType === 'KNOCKOUT');
      expect(knockoutMatches).toHaveLength(7); // 4 + 2 + 1
    });

    it('should properly seed teams into pools', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'snake', // Snake seeding for balanced pools
        poolCount: 2,
        teamsPerPool: 4,
        advanceFromPool: 2,
      };

      const result = await service.generateBracket(config);

      // With snake seeding:
      // Pool A: seeds 1, 4, 5, 8
      // Pool B: seeds 2, 3, 6, 7
      const poolAMatches = result.matches.filter(m => m.pool === 'A');
      const poolATeams = new Set();
      poolAMatches.forEach(match => {
        poolATeams.add(match.homeTeamId);
        poolATeams.add(match.awayTeamId);
      });
      
      expect(poolATeams.has('team-1')).toBe(true);
      expect(poolATeams.has('team-4')).toBe(true);
      expect(poolATeams.has('team-5')).toBe(true);
      expect(poolATeams.has('team-8')).toBe(true);
    });
  });

  describe('Seeding Methods', () => {
    it('should apply manual seeding correctly', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const result = await service.generateBracket(config);

      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      // Manual seeding should preserve the seed order from teams
      expect(firstRoundMatches[0].homeTeamId).toBe('team-1');
      expect(firstRoundMatches[0].awayTeamId).toBe('team-8');
    });

    it('should apply random seeding', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'random',
      };

      // Random seeding should still create valid bracket structure
      const result = await service.generateBracket(config);
      expect(result.matches).toHaveLength(7);
      expect(result.totalRounds).toBe(3);
    });

    it('should apply ranking-based seeding', async () => {
      const teams = MockDataGenerator.generateMockTeams(8).map((team, index) => ({
        ...team,
        ranking: {
          wins: 10 - index,
          losses: index,
          points: (10 - index) * 100,
        },
      }));
      
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'ranking',
      };

      const result = await service.generateBracket(config);

      // Should seed based on ranking (wins/points)
      const firstRoundMatches = result.matches.filter(m => m.round === 1);
      expect(firstRoundMatches[0].homeTeamId).toBe('team-1'); // Highest ranked
      expect(firstRoundMatches[0].awayTeamId).toBe('team-8'); // Lowest ranked
    });

    it('should apply snake seeding for pool play', async () => {
      const teams = MockDataGenerator.generateMockTeams(12);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'snake',
        poolCount: 3,
        teamsPerPool: 4,
        advanceFromPool: 2,
      };

      const result = await service.generateBracket(config);

      // Snake pattern for 3 pools:
      // Pool A: 1, 6, 7, 12
      // Pool B: 2, 5, 8, 11
      // Pool C: 3, 4, 9, 10
      const poolMatches = result.matches.filter(m => m.bracketType === 'POOL');
      expect(poolMatches.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should generate 128-team bracket within performance threshold', async () => {
      const teams = MockDataGenerator.generateMockTeams(128);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateBracket(config)
      );

      expect(duration).toMatchPerformanceThreshold(3000); // 3 seconds for 128 teams
      expect(result.totalRounds).toBe(7);
      expect(result.matches).toHaveLength(127);
    });

    it('should handle concurrent bracket generations', async () => {
      const teams = MockDataGenerator.generateMockTeams(32);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const promises = Array.from({ length: 10 }, () => 
        service.generateBracket(config)
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(promises)
      );

      expect(duration).toMatchPerformanceThreshold(5000); // 5 seconds for 10 concurrent
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for less than minimum teams', async () => {
      const teams = MockDataGenerator.generateMockTeams(1);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      await expect(service.generateBracket(config)).rejects.toThrow();
    });

    it('should handle empty team array', async () => {
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams: [],
        seedingMethod: 'manual',
      };

      await expect(service.generateBracket(config)).rejects.toThrow();
    });

    it('should validate pool configuration', async () => {
      const teams = MockDataGenerator.generateMockTeams(10);
      const config = {
        format: TournamentFormat.POOL_PLAY,
        teams,
        seedingMethod: 'manual',
        poolCount: 3,
        teamsPerPool: 4, // 3*4=12 but only 10 teams
      };

      await expect(service.generateBracket(config)).rejects.toThrow();
    });

    it('should handle maximum tournament size', async () => {
      const teams = MockDataGenerator.generateMockTeams(256);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
      };

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateBracket(config)
      );

      expect(duration).toMatchPerformanceThreshold(5000);
      expect(result.totalRounds).toBe(8);
      expect(result.matches).toHaveLength(255);
    });
  });

  describe('Consolation Brackets', () => {
    it('should generate consolation bracket when requested', async () => {
      const teams = MockDataGenerator.generateMockTeams(8);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
        includeConsolation: true,
      };

      const result = await service.generateBracket(config);

      const consolationMatches = result.matches.filter(m => m.bracketType === 'CONSOLATION');
      expect(consolationMatches.length).toBeGreaterThan(0);
      
      // First round losers should feed into consolation
      const mainFirstRound = result.matches.filter(
        m => m.bracketType === 'MAIN' && m.round === 1
      );
      mainFirstRound.forEach(match => {
        if (config.includeConsolation) {
          expect(match.nextMatches.loserTo).toBeDefined();
        }
      });
    });

    it('should create proper consolation bracket structure', async () => {
      const teams = MockDataGenerator.generateMockTeams(16);
      const config = {
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams,
        seedingMethod: 'manual',
        includeConsolation: true,
      };

      const result = await service.generateBracket(config);

      const consolationMatches = result.matches.filter(m => m.bracketType === 'CONSOLATION');
      // Should have a complete consolation tournament for first-round losers
      expect(consolationMatches.length).toBeGreaterThanOrEqual(7); // 8 teams -> 7 matches
    });
  });
});