import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { TournamentService } from '../tournament.service';
import { Tournament, TournamentFormat, TournamentStatus } from '../entities/tournament.entity';
import { TournamentTeam, TeamStatus } from '../entities/tournament-team.entity';
import { TournamentMatch, MatchStatus } from '../entities/tournament-match.entity';
import { TournamentCourt } from '../entities/tournament-court.entity';
import { BracketGeneratorService } from '../services/bracket-generator.service';
import { ScheduleOptimizerService } from '../services/schedule-optimizer.service';
import { CourtAssignerService } from '../services/court-assigner.service';
import { WebSocketGatewayService } from '../../../websocket/websocket.gateway';

import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('TournamentService', () => {
  let service: TournamentService;
  let tournamentRepository: jest.Mocked<Repository<Tournament>>;
  let teamRepository: jest.Mocked<Repository<TournamentTeam>>;
  let matchRepository: jest.Mocked<Repository<TournamentMatch>>;
  let courtRepository: jest.Mocked<Repository<TournamentCourt>>;
  let dataSource: jest.Mocked<DataSource>;
  let bracketGenerator: jest.Mocked<BracketGeneratorService>;
  let scheduleOptimizer: jest.Mocked<ScheduleOptimizerService>;
  let courtAssigner: jest.Mocked<CourtAssignerService>;
  let websocketGateway: jest.Mocked<WebSocketGatewayService>;

  // Mock QueryRunner for transaction testing
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentService,
        {
          provide: getRepositoryToken(Tournament),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
            update: jest.fn(),
            delete: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(TournamentTeam),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(TournamentMatch),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          }),
        },
        {
          provide: getRepositoryToken(TournamentCourt),
          useFactory: () => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          }),
        },
        {
          provide: DataSource,
          useFactory: () => ({
            createQueryRunner: jest.fn(() => mockQueryRunner),
          }),
        },
        {
          provide: BracketGeneratorService,
          useFactory: () => ({
            generateBracket: jest.fn(),
          }),
        },
        {
          provide: ScheduleOptimizerService,
          useFactory: () => ({
            optimizeSchedule: jest.fn(),
          }),
        },
        {
          provide: CourtAssignerService,
          useFactory: () => ({
            assignCourts: jest.fn(),
          }),
        },
        {
          provide: WebSocketGatewayService,
          useFactory: () => ({
            broadcastTournamentUpdate: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<TournamentService>(TournamentService);
    tournamentRepository = module.get(getRepositoryToken(Tournament));
    teamRepository = module.get(getRepositoryToken(TournamentTeam));
    matchRepository = module.get(getRepositoryToken(TournamentMatch));
    courtRepository = module.get(getRepositoryToken(TournamentCourt));
    dataSource = module.get(DataSource);
    bracketGenerator = module.get(BracketGeneratorService);
    scheduleOptimizer = module.get(ScheduleOptimizerService);
    courtAssigner = module.get(CourtAssignerService);
    websocketGateway = module.get(WebSocketGatewayService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Tournament Creation', () => {
    it('should create a tournament successfully', async () => {
      const createDto = {
        name: 'Test Tournament',
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
        maxTeams: 16,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
      };

      const mockTournament = MockDataGenerator.generateMockTournament(createDto);
      tournamentRepository.create.mockReturnValue(mockTournament);
      tournamentRepository.save.mockResolvedValue(mockTournament);

      const result = await service.create(createDto, 'user-1', 'org-1');

      expect(tournamentRepository.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: 'org-1',
        createdBy: 'user-1',
        status: TournamentStatus.DRAFT,
      });
      expect(tournamentRepository.save).toHaveBeenCalledWith(mockTournament);
      expect(result).toEqual(mockTournament);
    });

    it('should create tournament with courts when provided', async () => {
      const createDto = {
        name: 'Test Tournament',
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
        maxTeams: 16,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        courts: [
          { name: 'Court 1', isActive: true },
          { name: 'Court 2', isActive: true },
        ],
      };

      const mockTournament = MockDataGenerator.generateMockTournament({ id: 'tournament-1' });
      const mockCourts = createDto.courts.map(court => ({ ...court, tournamentId: 'tournament-1' }));

      tournamentRepository.create.mockReturnValue(mockTournament);
      tournamentRepository.save.mockResolvedValue(mockTournament);
      courtRepository.create.mockImplementation((data) => data);
      courtRepository.save.mockResolvedValue(mockCourts);

      const result = await service.create(createDto, 'user-1', 'org-1');

      expect(courtRepository.create).toHaveBeenCalledTimes(2);
      expect(courtRepository.save).toHaveBeenCalledWith(mockCourts);
      expect(result).toEqual(mockTournament);
    });
  });

  describe('Tournament Queries', () => {
    it('should find all tournaments for organization with filters', async () => {
      const mockTournaments = [MockDataGenerator.generateMockTournament()];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTournaments),
      };

      tournamentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const filters = {
        status: TournamentStatus.IN_PROGRESS,
        format: TournamentFormat.SINGLE_ELIMINATION,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
      };

      const result = await service.findAll('org-1', filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tournament.organizationId = :organizationId',
        { organizationId: 'org-1' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tournament.status = :status',
        { status: filters.status }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tournament.format = :format',
        { format: filters.format }
      );
      expect(result).toEqual(mockTournaments);
    });

    it('should find one tournament with relations', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      tournamentRepository.findOne.mockResolvedValue(mockTournament);

      const result = await service.findOne('tournament-1', 'org-1');

      expect(tournamentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tournament-1', organizationId: 'org-1' },
        relations: ['teams', 'matches', 'courts'],
      });
      expect(result).toEqual(mockTournament);
    });

    it('should throw NotFoundException when tournament not found', async () => {
      tournamentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Bracket Generation', () => {
    it('should generate valid single elimination bracket for 16 teams', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        format: TournamentFormat.SINGLE_ELIMINATION,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(16);
      const mockBracketResult = {
        structure: { rounds: 4, matches: [] },
        matches: Array.from({ length: 15 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })),
        totalRounds: 4,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.generateBracket('tournament-1', 'user-1', 'org-1');
      });

      expect(duration).toMatchPerformanceThreshold(2000); // Should complete within 2 seconds
      expect(bracketGenerator.generateBracket).toHaveBeenCalledWith({
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams: mockTeams,
        seedingMethod: mockTournament.seedingMethod,
        includeConsolation: mockTournament.settings?.consolationBracket,
        includeThirdPlace: mockTournament.settings?.thirdPlaceGame,
        poolCount: mockTournament.settings?.poolCount,
        teamsPerPool: mockTournament.settings?.teamsPerPool,
        advanceFromPool: mockTournament.settings?.advanceFromPool,
      });
      expect(websocketGateway.broadcastTournamentUpdate).toHaveBeenCalled();
    });

    it('should generate valid double elimination bracket for 32 teams', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        format: TournamentFormat.DOUBLE_ELIMINATION,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(32);
      const mockBracketResult = {
        structure: { rounds: 6, matches: [] },
        matches: Array.from({ length: 62 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })), // 31 winners + 31 losers
        totalRounds: 6,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      const result = await service.generateBracket('tournament-1', 'user-1', 'org-1');

      expect(result.matches).toHaveLength(62);
      expect(bracketGenerator.generateBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          format: TournamentFormat.DOUBLE_ELIMINATION,
          teams: mockTeams,
        })
      );
    });

    it('should handle bye distribution for non-power-of-2 teams', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(14); // Non-power of 2
      const mockBracketResult = {
        structure: { rounds: 4, matches: [] },
        matches: Array.from({ length: 13 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })),
        totalRounds: 4,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      const result = await service.generateBracket('tournament-1', 'user-1', 'org-1');

      expect(result.matches).toHaveLength(13);
      expect(bracketGenerator.generateBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: mockTeams,
        })
      );
    });

    it('should seed teams correctly based on ranking', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        seedingMethod: 'ranking',
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(8);
      const mockBracketResult = {
        structure: { rounds: 3, matches: [] },
        matches: Array.from({ length: 7 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })),
        totalRounds: 3,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      await service.generateBracket('tournament-1', 'user-1', 'org-1');

      expect(bracketGenerator.generateBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          seedingMethod: 'ranking',
        })
      );
    });

    it('should create proper consolation brackets', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        minTeams: 4,
        settings: {
          consolationBracket: true,
          thirdPlaceGame: true,
        },
      });
      const mockTeams = MockDataGenerator.generateMockTeams(8);
      const mockBracketResult = {
        structure: { rounds: 3, matches: [] },
        matches: Array.from({ length: 10 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })), // Main + consolation
        totalRounds: 3,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      await service.generateBracket('tournament-1', 'user-1', 'org-1');

      expect(bracketGenerator.generateBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          includeConsolation: true,
          includeThirdPlace: true,
        })
      );
    });

    it('should throw error if insufficient teams', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(2); // Below minimum

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);

      await expect(
        service.generateBracket('tournament-1', 'user-1', 'org-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on bracket generation failure', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(8);

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockRejectedValue(new Error('Bracket generation failed'));

      await expect(
        service.generateBracket('tournament-1', 'user-1', 'org-1')
      ).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('Schedule Optimization', () => {
    it('should optimize court assignments for minimum conflicts', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatches = Array.from({ length: 8 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` }));
      const mockCourts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
      ];
      const mockTeams = MockDataGenerator.generateMockTeams(8);
      const mockSchedule = {
        matches: mockMatches.map(match => ({ ...match, courtId: 'court-1', scheduledTime: new Date() })),
        metrics: {
          efficiency: 0.95,
          conflicts: 0,
          totalDuration: 480, // 8 hours
        },
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.find.mockResolvedValue(mockMatches);
      courtRepository.find.mockResolvedValue(mockCourts);
      teamRepository.find.mockResolvedValue(mockTeams);
      scheduleOptimizer.optimizeSchedule.mockResolvedValue(mockSchedule);

      const constraints = {
        minRestTime: 30,
        maxGamesPerDay: 3,
        startTime: '08:00',
        endTime: '20:00',
        gameDuration: 60,
      };

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.generateSchedule('tournament-1', constraints, 'user-1', 'org-1');
      });

      expect(duration).toMatchPerformanceThreshold(3000); // Should complete within 3 seconds
      expect(scheduleOptimizer.optimizeSchedule).toHaveBeenCalledWith(
        mockMatches,
        mockCourts,
        mockTeams,
        constraints,
        mockTournament.startDate,
        mockTournament.endDate
      );
      expect(websocketGateway.broadcastTournamentUpdate).toHaveBeenCalled();
    });

    it('should respect rest time constraints between games', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatches = [MockDataGenerator.generateMockMatch()];
      const mockCourts = [{ id: 'court-1', name: 'Court 1', isActive: true }];
      const mockTeams = MockDataGenerator.generateMockTeams(4);

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.find.mockResolvedValue(mockMatches);
      courtRepository.find.mockResolvedValue(mockCourts);
      teamRepository.find.mockResolvedValue(mockTeams);

      await service.generateSchedule('tournament-1', { minRestTime: 45 }, 'user-1', 'org-1');

      expect(scheduleOptimizer.optimizeSchedule).toHaveBeenCalledWith(
        mockMatches,
        mockCourts,
        mockTeams,
        expect.objectContaining({ minRestTime: 45 }),
        mockTournament.startDate,
        mockTournament.endDate
      );
    });

    it('should handle court availability constraints', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatches = [MockDataGenerator.generateMockMatch()];
      const mockCourts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: false }, // Inactive court
      ];
      const mockTeams = MockDataGenerator.generateMockTeams(4);

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.find.mockResolvedValue(mockMatches);
      courtRepository.find.mockResolvedValue([mockCourts[0]]); // Only active courts returned
      teamRepository.find.mockResolvedValue(mockTeams);

      await service.generateSchedule('tournament-1', {}, 'user-1', 'org-1');

      expect(courtRepository.find).toHaveBeenCalledWith({
        where: { tournamentId: 'tournament-1', isActive: true },
      });
    });

    it('should distribute games evenly across courts', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatches = Array.from({ length: 6 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` }));
      const mockCourts = [
        { id: 'court-1', name: 'Court 1', isActive: true },
        { id: 'court-2', name: 'Court 2', isActive: true },
        { id: 'court-3', name: 'Court 3', isActive: true },
      ];
      const mockTeams = MockDataGenerator.generateMockTeams(12);
      const mockSchedule = {
        matches: mockMatches.map((match, i) => ({ 
          ...match, 
          courtId: mockCourts[i % 3].id, // Evenly distributed
          scheduledTime: new Date() 
        })),
        metrics: { efficiency: 0.9, conflicts: 0, totalDuration: 360 },
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.find.mockResolvedValue(mockMatches);
      courtRepository.find.mockResolvedValue(mockCourts);
      teamRepository.find.mockResolvedValue(mockTeams);
      scheduleOptimizer.optimizeSchedule.mockResolvedValue(mockSchedule);

      const result = await service.generateSchedule('tournament-1', {}, 'user-1', 'org-1');

      // Verify each court gets 2 matches (6 matches / 3 courts)
      const court1Matches = result.matches.filter(m => m.courtId === 'court-1').length;
      const court2Matches = result.matches.filter(m => m.courtId === 'court-2').length;
      const court3Matches = result.matches.filter(m => m.courtId === 'court-3').length;
      
      expect(court1Matches).toBe(2);
      expect(court2Matches).toBe(2);
      expect(court3Matches).toBe(2);
    });
  });

  describe('Match Results', () => {
    it('should advance winners automatically', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        format: TournamentFormat.SINGLE_ELIMINATION,
      });
      const mockMatch = MockDataGenerator.generateMockMatch({
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        nextMatches: {
          winnerTo: { matchId: 2, position: 'home' },
        },
      });
      const mockNextMatch = MockDataGenerator.generateMockMatch({
        id: 'match-2',
        matchNumber: 2,
        homeTeamId: null,
        awayTeamId: 'team-3',
      });

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.findOne.mockResolvedValueOnce(mockMatch);
      matchRepository.findOne.mockResolvedValueOnce(mockNextMatch);
      matchRepository.save.mockResolvedValue({
        ...mockMatch,
        homeScore: 75,
        awayScore: 68,
        winnerId: 'team-1',
        loserId: 'team-2',
        status: MatchStatus.COMPLETED,
      });

      const result = await service.updateMatchResult(
        'tournament-1',
        'match-1',
        {
          homeScore: 75,
          awayScore: 68,
          scoreByPeriod: [{ period: 1, homeScore: 18, awayScore: 15 }],
          gameStats: {},
        },
        'user-1',
        'org-1'
      );

      expect(result.winnerId).toBe('team-1');
      expect(result.loserId).toBe('team-2');
      expect(websocketGateway.broadcastTournamentUpdate).toHaveBeenCalledWith(
        'tournament-1',
        expect.objectContaining({
          type: 'match_result',
        })
      );
    });

    it('should update bracket standings in real-time', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatch = MockDataGenerator.generateMockMatch({
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.findOne.mockResolvedValue(mockMatch);
      matchRepository.save.mockResolvedValue({
        ...mockMatch,
        homeScore: 80,
        awayScore: 75,
        winnerId: 'team-1',
        status: MatchStatus.COMPLETED,
      });

      await service.updateMatchResult(
        'tournament-1',
        'match-1',
        { homeScore: 80, awayScore: 75 },
        'user-1',
        'org-1'
      );

      expect(websocketGateway.broadcastTournamentUpdate).toHaveBeenCalledWith(
        'tournament-1',
        expect.objectContaining({
          type: 'match_result',
          data: expect.objectContaining({
            matchResult: expect.objectContaining({
              winnerId: 'team-1',
              homeScore: 80,
              awayScore: 75,
            }),
          }),
        })
      );
    });

    it('should handle forfeit scenarios', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatch = MockDataGenerator.generateMockMatch({
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.findOne.mockResolvedValue(mockMatch);
      matchRepository.save.mockResolvedValue({
        ...mockMatch,
        homeScore: 0,
        awayScore: 0,
        winnerId: 'team-1', // Won by forfeit
        status: MatchStatus.COMPLETED,
        gameStats: { forfeit: true, forfeitedBy: 'team-2' },
      });

      const result = await service.updateMatchResult(
        'tournament-1',
        'match-1',
        {
          homeScore: 0,
          awayScore: 0,
          gameStats: { forfeit: true, forfeitedBy: 'team-2' },
        },
        'user-1',
        'org-1'
      );

      expect(result.gameStats.forfeit).toBe(true);
      expect(result.winnerId).toBe('team-1');
    });

    it('should validate score inputs', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatch = MockDataGenerator.generateMockMatch();

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.findOne.mockResolvedValue(mockMatch);

      // Test negative scores
      await expect(
        service.updateMatchResult(
          'tournament-1',
          'match-1',
          { homeScore: -10, awayScore: 75 },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow();

      // Test non-numeric scores would be handled by DTO validation
      // This test ensures the service properly handles the validated input
    });

    it('should throw error for non-existent match', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      
      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMatchResult(
          'tournament-1',
          'nonexistent-match',
          { homeScore: 75, awayScore: 68 },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Team Registration', () => {
    it('should register team successfully', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        currentTeamCount: 5,
        maxTeams: 16,
      });

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.findOne.mockResolvedValue(null); // Team not already registered
      teamRepository.create.mockReturnValue({} as any);
      teamRepository.save.mockResolvedValue(MockDataGenerator.generateMockTeam());
      tournamentRepository.save.mockResolvedValue({
        ...mockTournament,
        currentTeamCount: 6,
      });

      const teamData = {
        teamId: 'team-1',
        teamName: 'Test Team',
        divisionId: 'division-1',
        roster: [],
        coaches: [],
      };

      const result = await service.registerTeam(
        'tournament-1',
        teamData,
        'user-1',
        'org-1'
      );

      expect(teamRepository.save).toHaveBeenCalled();
      expect(tournamentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentTeamCount: 6 })
      );
      expect(websocketGateway.broadcastTournamentUpdate).toHaveBeenCalledWith(
        'tournament-1',
        expect.objectContaining({
          type: 'team_registration',
        })
      );
    });

    it('should reject registration when tournament is full', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        currentTeamCount: 16,
        maxTeams: 16,
      });

      tournamentRepository.findOne.mockResolvedValue(mockTournament);

      await expect(
        service.registerTeam(
          'tournament-1',
          { teamId: 'team-1', teamName: 'Test Team' },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate team registration', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_OPEN,
        currentTeamCount: 5,
        maxTeams: 16,
      });
      const existingTeam = MockDataGenerator.generateMockTeam();

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.findOne.mockResolvedValue(existingTeam);

      await expect(
        service.registerTeam(
          'tournament-1',
          { teamId: 'team-1', teamName: 'Test Team' },
          'user-1',
          'org-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent bracket generations efficiently', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament({
        status: TournamentStatus.REGISTRATION_CLOSED,
        minTeams: 4,
      });
      const mockTeams = MockDataGenerator.generateMockTeams(16);
      const mockBracketResult = {
        structure: { rounds: 4, matches: [] },
        matches: Array.from({ length: 15 }, (_, i) => MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })),
        totalRounds: 4,
      };

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      teamRepository.find.mockResolvedValue(mockTeams);
      bracketGenerator.generateBracket.mockResolvedValue(mockBracketResult);
      mockQueryRunner.manager.save.mockResolvedValue(mockBracketResult.matches);

      // Test concurrent operations
      const promises = Array.from({ length: 10 }, () =>
        service.generateBracket('tournament-1', 'user-1', 'org-1')
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return Promise.allSettled(promises);
      });

      expect(duration).toMatchPerformanceThreshold(5000); // Should handle 10 concurrent requests within 5 seconds
    });

    it('should efficiently query tournament standings', async () => {
      const mockTournament = MockDataGenerator.generateMockTournament();
      const mockMatches = Array.from({ length: 100 }, (_, i) => 
        MockDataGenerator.generateMockMatch({ id: `match-${i + 1}` })
      );

      tournamentRepository.findOne.mockResolvedValue(mockTournament);
      matchRepository.find.mockResolvedValue(mockMatches);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.getBracket('tournament-1', 'org-1');
      });

      expect(duration).toMatchPerformanceThreshold(50); // Should complete within 50ms
    });
  });
});