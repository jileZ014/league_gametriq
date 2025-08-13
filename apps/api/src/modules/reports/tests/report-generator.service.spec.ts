import { Test, TestingModule } from '@nestjs/testing';
import { ReportGeneratorService } from '../services/report-generator.service';
import { DataExtractionService } from '../services/data-extraction.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  let dataExtraction: jest.Mocked<DataExtractionService>;
  let pdfGenerator: jest.Mocked<PdfGeneratorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        {
          provide: DataExtractionService,
          useFactory: () => ({
            extractLeagueData: jest.fn(),
            extractTeamData: jest.fn(),
            extractGameData: jest.fn(),
            extractFinancialData: jest.fn(),
            extractPlayerStats: jest.fn(),
            executeCustomQuery: jest.fn(),
          }),
        },
        {
          provide: PdfGeneratorService,
          useFactory: () => ({
            generatePDF: jest.fn(),
            generateExcel: jest.fn(),
            generateCSV: jest.fn(),
            generateHTML: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<ReportGeneratorService>(ReportGeneratorService);
    dataExtraction = module.get(DataExtractionService);
    pdfGenerator = module.get(PdfGeneratorService);
  });

  describe('League Summary Report Generation', () => {
    it('should generate complete league summary report', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'LEAGUE_SUMMARY',
        dataQueries: {
          leagues: 'SELECT * FROM leagues',
          teams: 'SELECT * FROM teams',
          standings: 'SELECT * FROM standings',
        },
      });
      const settings = {
        leagueId: 'league-1',
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      };

      const mockLeagueData = {
        name: 'Phoenix Youth Basketball',
        teams: 32,
        games: 256,
        divisions: 4,
      };
      const mockTeamData = Array.from({ length: 32 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i}`,
        wins: Math.floor(Math.random() * 20),
        losses: Math.floor(Math.random() * 20),
      }));

      dataExtraction.extractLeagueData.mockResolvedValue(mockLeagueData);
      dataExtraction.extractTeamData.mockResolvedValue(mockTeamData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractLeagueData).toHaveBeenCalledWith(
        'league-1',
        expect.objectContaining(settings.dateRange)
      );
      expect(result.data).toEqual(expect.objectContaining({
        league: mockLeagueData,
        teams: mockTeamData,
      }));
      expect(result.metadata).toEqual(expect.objectContaining({
        generatedAt: expect.any(Date),
        templateType: 'LEAGUE_SUMMARY',
      }));
    });

    it('should include standings and rankings', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'LEAGUE_SUMMARY',
        sections: ['standings', 'rankings'],
      });
      const settings = {
        leagueId: 'league-1',
        includeStandings: true,
        includeRankings: true,
      };

      const mockStandings = Array.from({ length: 8 }, (_, i) => ({
        position: i + 1,
        teamId: `team-${i}`,
        teamName: `Team ${i}`,
        played: 20,
        wins: 20 - i,
        losses: i,
        percentage: (20 - i) / 20,
        gamesBehind: i * 0.5,
      }));

      dataExtraction.extractLeagueData.mockResolvedValue({});
      dataExtraction.extractTeamData.mockResolvedValue(mockStandings);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.data.standings).toBeDefined();
      expect(result.data.standings).toHaveLength(8);
      expect(result.data.standings[0].position).toBe(1);
    });

    it('should generate charts for visual representation', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'LEAGUE_SUMMARY',
        sections: ['charts'],
        chartConfig: {
          winLossChart: true,
          scoringTrends: true,
          teamComparison: true,
        },
      });
      const settings = { leagueId: 'league-1' };

      const mockData = {
        teams: Array.from({ length: 10 }, (_, i) => ({
          name: `Team ${i}`,
          wins: 10 + i,
          losses: 10 - i,
        })),
      };

      dataExtraction.extractLeagueData.mockResolvedValue(mockData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.charts).toBeDefined();
      expect(result.charts.winLossChart).toBeDefined();
      expect(result.charts.scoringTrends).toBeDefined();
      expect(result.charts.teamComparison).toBeDefined();
    });
  });

  describe('Financial Report Generation', () => {
    it('should generate financial summary report', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'FINANCIAL_SUMMARY',
        dataQueries: {
          revenue: 'SELECT SUM(amount) FROM payments',
          expenses: 'SELECT SUM(amount) FROM expenses',
          breakdown: 'SELECT category, SUM(amount) FROM payments GROUP BY category',
        },
      });
      const settings = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        includeProjections: true,
      };

      const mockFinancialData = {
        totalRevenue: 125000,
        totalExpenses: 85000,
        netIncome: 40000,
        breakdown: {
          registrations: 80000,
          tournaments: 30000,
          merchandise: 15000,
        },
        monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          revenue: 10000 + Math.random() * 5000,
          expenses: 7000 + Math.random() * 2000,
        })),
      };

      dataExtraction.extractFinancialData.mockResolvedValue(mockFinancialData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractFinancialData).toHaveBeenCalledWith(
        'org-1',
        settings.dateRange
      );
      expect(result.data.financial).toEqual(mockFinancialData);
      expect(result.data.summary).toEqual(expect.objectContaining({
        totalRevenue: 125000,
        totalExpenses: 85000,
        netIncome: 40000,
      }));
    });

    it('should calculate payment processing fees', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'FINANCIAL_SUMMARY',
        includeProcessingFees: true,
      });
      const settings = { dateRange: { start: '2024-01-01', end: '2024-12-31' } };

      const mockData = {
        payments: Array.from({ length: 100 }, (_, i) => ({
          id: `payment-${i}`,
          amount: 100 + i * 10,
          processingFee: (100 + i * 10) * 0.029 + 0.30, // Stripe fee
          netAmount: (100 + i * 10) * 0.971 - 0.30,
        })),
      };

      dataExtraction.extractFinancialData.mockResolvedValue(mockData);

      const result = await service.generateReport(template, settings, 'org-1');

      const totalFees = mockData.payments.reduce((sum, p) => sum + p.processingFee, 0);
      expect(result.data.processingFees).toBeCloseTo(totalFees, 2);
    });

    it('should generate revenue projections', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'FINANCIAL_SUMMARY',
        includeProjections: true,
      });
      const settings = {
        projectionMonths: 6,
        growthRate: 0.1, // 10% growth
      };

      const historicalData = {
        monthlyRevenue: [10000, 11000, 10500, 12000, 11500, 13000],
      };

      dataExtraction.extractFinancialData.mockResolvedValue(historicalData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.projections).toBeDefined();
      expect(result.projections).toHaveLength(6);
      expect(result.projections[0]).toBeGreaterThan(13000);
    });
  });

  describe('Game Results Report Generation', () => {
    it('should generate game results report', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'GAME_RESULTS',
        dataQueries: {
          games: 'SELECT * FROM games WHERE date >= :start AND date <= :end',
        },
      });
      const settings = {
        dateRange: { start: '2024-12-01', end: '2024-12-07' },
        includeStats: true,
      };

      const mockGameData = Array.from({ length: 20 }, (_, i) => ({
        id: `game-${i}`,
        date: new Date(`2024-12-0${(i % 7) + 1}`),
        homeTeam: `Team ${i * 2}`,
        awayTeam: `Team ${i * 2 + 1}`,
        homeScore: 70 + Math.floor(Math.random() * 30),
        awayScore: 70 + Math.floor(Math.random() * 30),
        status: 'completed',
      }));

      dataExtraction.extractGameData.mockResolvedValue(mockGameData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractGameData).toHaveBeenCalledWith(
        'org-1',
        settings.dateRange
      );
      expect(result.data.games).toHaveLength(20);
      expect(result.data.games[0]).toHaveProperty('homeScore');
      expect(result.data.games[0]).toHaveProperty('awayScore');
    });

    it('should include player statistics', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'GAME_RESULTS',
        includePlayerStats: true,
      });
      const settings = {
        gameIds: ['game-1', 'game-2'],
        statCategories: ['points', 'rebounds', 'assists'],
      };

      const mockPlayerStats = Array.from({ length: 10 }, (_, i) => ({
        playerId: `player-${i}`,
        playerName: `Player ${i}`,
        gameId: i < 5 ? 'game-1' : 'game-2',
        points: Math.floor(Math.random() * 30),
        rebounds: Math.floor(Math.random() * 15),
        assists: Math.floor(Math.random() * 10),
      }));

      dataExtraction.extractPlayerStats.mockResolvedValue(mockPlayerStats);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractPlayerStats).toHaveBeenCalledWith(
        settings.gameIds,
        settings.statCategories
      );
      expect(result.data.playerStats).toHaveLength(10);
    });

    it('should calculate team performance metrics', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'GAME_RESULTS',
        calculateMetrics: true,
      });
      const settings = { teamId: 'team-1' };

      const mockGames = Array.from({ length: 10 }, (_, i) => ({
        id: `game-${i}`,
        homeTeam: i % 2 === 0 ? 'team-1' : 'team-2',
        awayTeam: i % 2 === 0 ? 'team-2' : 'team-1',
        homeScore: 80 + i,
        awayScore: 75 + i,
      }));

      dataExtraction.extractGameData.mockResolvedValue(mockGames);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.averagePointsScored).toBeDefined();
      expect(result.metrics.averagePointsAllowed).toBeDefined();
      expect(result.metrics.winPercentage).toBeDefined();
    });
  });

  describe('Attendance Report Generation', () => {
    it('should generate attendance report', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'ATTENDANCE',
        dataQueries: {
          attendance: 'SELECT * FROM attendance',
        },
      });
      const settings = {
        dateRange: { start: '2024-12-01', end: '2024-12-31' },
      };

      const mockAttendanceData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(`2024-12-${i + 1}`),
        gameId: `game-${i}`,
        venue: `Venue ${i % 5}`,
        attendance: 100 + Math.floor(Math.random() * 200),
        capacity: 500,
        utilizationRate: 0.2 + Math.random() * 0.6,
      }));

      dataExtraction.executeCustomQuery.mockResolvedValue(mockAttendanceData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.data.attendance).toHaveLength(30);
      expect(result.data.averageAttendance).toBeDefined();
      expect(result.data.peakAttendance).toBeDefined();
    });
  });

  describe('Custom Report Generation', () => {
    it('should execute custom SQL queries', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'CUSTOM',
        dataQueries: {
          customQuery1: 'SELECT COUNT(*) as total FROM teams WHERE active = true',
          customQuery2: 'SELECT AVG(score) as avg_score FROM games',
        },
      });
      const settings = {};

      dataExtraction.executeCustomQuery
        .mockResolvedValueOnce({ total: 32 })
        .mockResolvedValueOnce({ avg_score: 78.5 });

      const result = await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.executeCustomQuery).toHaveBeenCalledTimes(2);
      expect(result.data.customQuery1).toEqual({ total: 32 });
      expect(result.data.customQuery2).toEqual({ avg_score: 78.5 });
    });

    it('should apply custom transformations', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'CUSTOM',
        transformations: {
          calculatePercentage: 'data.wins / data.totalGames * 100',
          formatCurrency: 'new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.amount)',
        },
      });
      const settings = {};

      const mockData = {
        wins: 15,
        totalGames: 20,
        amount: 1234.56,
      };

      dataExtraction.executeCustomQuery.mockResolvedValue(mockData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.data.percentage).toBe(75);
      expect(result.data.formattedAmount).toBe('$1,234.56');
    });
  });

  describe('Report Formatting', () => {
    it('should format report as HTML', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        htmlTemplate: '<html><body><h1>{{title}}</h1><p>{{content}}</p></body></html>',
      });
      const settings = {};
      const mockData = {
        title: 'Test Report',
        content: 'This is test content',
      };

      dataExtraction.extractLeagueData.mockResolvedValue(mockData);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.html).toContain('<h1>Test Report</h1>');
      expect(result.html).toContain('<p>This is test content</p>');
    });

    it('should format report as PDF', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'LEAGUE_SUMMARY',
      });
      const settings = { format: 'PDF' };
      const mockData = { league: 'Test League' };
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      dataExtraction.extractLeagueData.mockResolvedValue(mockData);
      pdfGenerator.generatePDF.mockResolvedValue(mockPdfBuffer);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(pdfGenerator.generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ league: 'Test League' }),
        })
      );
      expect(result.pdf).toBe(mockPdfBuffer);
    });

    it('should format report as Excel', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'FINANCIAL_SUMMARY',
      });
      const settings = { format: 'EXCEL' };
      const mockData = {
        revenue: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          amount: 10000 + i * 1000,
        })),
      };
      const mockExcelBuffer = Buffer.from('mock-excel-content');

      dataExtraction.extractFinancialData.mockResolvedValue(mockData);
      pdfGenerator.generateExcel.mockResolvedValue(mockExcelBuffer);

      const result = await service.generateReport(template, settings, 'org-1');

      expect(pdfGenerator.generateExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revenue: expect.any(Array) }),
        })
      );
      expect(result.excel).toBe(mockExcelBuffer);
    });

    it('should format report as CSV', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'GAME_RESULTS',
      });
      const settings = { format: 'CSV' };
      const mockData = {
        games: [
          { date: '2024-12-01', home: 'Team A', away: 'Team B', score: '85-78' },
          { date: '2024-12-02', home: 'Team C', away: 'Team D', score: '92-88' },
        ],
      };
      const mockCsvContent = 'Date,Home,Away,Score\n2024-12-01,Team A,Team B,85-78\n';

      dataExtraction.extractGameData.mockResolvedValue(mockData);
      pdfGenerator.generateCSV.mockResolvedValue(Buffer.from(mockCsvContent));

      const result = await service.generateReport(template, settings, 'org-1');

      expect(pdfGenerator.generateCSV).toHaveBeenCalled();
      expect(result.csv.toString()).toContain('Date,Home,Away,Score');
    });
  });

  describe('Performance Tests', () => {
    it('should generate large report within threshold', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        type: 'LEAGUE_SUMMARY',
      });
      const settings = {};
      
      const largeDataSet = {
        teams: Array.from({ length: 200 }, (_, i) => ({
          id: `team-${i}`,
          name: `Team ${i}`,
          stats: {
            wins: Math.floor(Math.random() * 30),
            losses: Math.floor(Math.random() * 30),
            points: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100)),
          },
        })),
        games: Array.from({ length: 1000 }, (_, i) => ({
          id: `game-${i}`,
          data: Array.from({ length: 10 }, () => Math.random()),
        })),
      };

      dataExtraction.extractLeagueData.mockResolvedValue(largeDataSet);

      const { result, duration } = await TestPerformanceMonitor.measureAsync(
        () => service.generateReport(template, settings, 'org-1')
      );

      expect(duration).toMatchPerformanceThreshold(5000);
      expect(result.data.teams).toHaveLength(200);
      expect(result.data.games).toHaveLength(1000);
    });

    it('should handle concurrent report generations', async () => {
      const template = MockDataGenerator.generateMockReportTemplate();
      const settings = {};

      dataExtraction.extractLeagueData.mockResolvedValue({ data: 'test' });

      const promises = Array.from({ length: 20 }, () =>
        service.generateReport(template, settings, 'org-1')
      );

      const { duration } = await TestPerformanceMonitor.measureAsync(
        () => Promise.all(promises)
      );

      expect(duration).toMatchPerformanceThreshold(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle data extraction failures', async () => {
      const template = MockDataGenerator.generateMockReportTemplate();
      const settings = {};

      dataExtraction.extractLeagueData.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        service.generateReport(template, settings, 'org-1')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid template configuration', async () => {
      const template = {
        type: 'INVALID_TYPE',
        dataQueries: {},
      };
      const settings = {};

      await expect(
        service.generateReport(template as any, settings, 'org-1')
      ).rejects.toThrow();
    });

    it('should handle PDF generation failures gracefully', async () => {
      const template = MockDataGenerator.generateMockReportTemplate();
      const settings = { format: 'PDF' };

      dataExtraction.extractLeagueData.mockResolvedValue({ data: 'test' });
      pdfGenerator.generatePDF.mockRejectedValue(new Error('PDF generation failed'));

      const result = await service.generateReport(template, settings, 'org-1');

      expect(result.pdf).toBeUndefined();
      expect(result.error).toBe('PDF generation failed');
      expect(result.data).toBeDefined(); // Data should still be returned
    });

    it('should validate required template variables', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        requiredVariables: ['leagueId', 'startDate', 'endDate'],
      });
      const settings = {
        leagueId: 'league-1',
        // Missing startDate and endDate
      };

      await expect(
        service.generateReport(template, settings, 'org-1')
      ).rejects.toThrow('Missing required variables');
    });
  });

  describe('Caching', () => {
    it('should cache frequently generated reports', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        cacheEnabled: true,
        cacheDuration: 3600, // 1 hour
      });
      const settings = { leagueId: 'league-1' };

      const mockData = { teams: [] };
      dataExtraction.extractLeagueData.mockResolvedValue(mockData);

      // First call
      await service.generateReport(template, settings, 'org-1');
      
      // Second call (should use cache)
      await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractLeagueData).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on data changes', async () => {
      const template = MockDataGenerator.generateMockReportTemplate({
        cacheEnabled: true,
      });
      const settings = { leagueId: 'league-1' };

      dataExtraction.extractLeagueData.mockResolvedValue({ teams: [] });

      await service.generateReport(template, settings, 'org-1');
      
      // Simulate data change
      await service.invalidateCache('league-1');
      
      await service.generateReport(template, settings, 'org-1');

      expect(dataExtraction.extractLeagueData).toHaveBeenCalledTimes(2);
    });
  });
});