import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';

// This would import from your existing entities
// For now, I'll create interfaces to represent the expected structure
interface League {
  id: string;
  name: string;
  status: string;
  teamsCount?: number;
}

interface Team {
  id: string;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  leagueId: string;
}

interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: string;
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
}

interface Player {
  id: string;
  name: string;
  teamId: string;
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    gamesPlayed: number;
  };
}

@Injectable()
export class DataExtractionService {
  private readonly logger = new Logger(DataExtractionService.name);

  constructor(
    // Inject your actual entity repositories here
    // @InjectRepository(League) private leaguesRepository: Repository<League>,
    // @InjectRepository(Team) private teamsRepository: Repository<Team>,
    // @InjectRepository(Game) private gamesRepository: Repository<Game>,
    // @InjectRepository(Player) private playersRepository: Repository<Player>,
  ) {}

  async extractData(
    templateType: string,
    filters: Record<string, any>,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    this.logger.log(`Extracting data for template type: ${templateType}`);

    const data: Record<string, any> = {
      metadata: {
        generatedAt: new Date(),
        filters,
        variables,
      },
    };

    switch (templateType) {
      case 'league_summary':
        return await this.extractLeagueSummaryData(data, filters, variables);
      
      case 'financial':
        return await this.extractFinancialData(data, filters, variables);
      
      case 'game_results':
        return await this.extractGameResultsData(data, filters, variables);
      
      case 'attendance':
        return await this.extractAttendanceData(data, filters, variables);
      
      default:
        return data;
    }
  }

  private async extractLeagueSummaryData(
    data: Record<string, any>,
    filters: Record<string, any>,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const { organizationId, leagueId, seasonId } = filters;
    const { dateRange = 7, includeStats = true } = variables;

    // Mock data - replace with actual database queries
    const leagues = await this.getLeagues(organizationId, leagueId);
    const standings = await this.getStandings(leagueId, seasonId);
    const recentGames = await this.getRecentGames(leagueId, dateRange);
    const upcomingGames = await this.getUpcomingGames(leagueId, dateRange);
    const topScorers = includeStats ? await this.getTopScorers(leagueId, seasonId, 10) : [];

    return {
      ...data,
      leagues,
      standings,
      recentGames,
      upcomingGames,
      topScorers,
      summary: {
        totalTeams: standings.length,
        totalGames: recentGames.length,
        avgPointsPerGame: this.calculateAveragePoints(recentGames),
        activeLeagues: leagues.filter(l => l.status === 'ACTIVE').length,
      },
    };
  }

  private async extractFinancialData(
    data: Record<string, any>,
    filters: Record<string, any>,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const { organizationId, leagueId, seasonId } = filters;
    const { period = 'current_month' } = variables;

    // Mock financial data - replace with actual payment queries
    const registrationFees = await this.getRegistrationFees(organizationId, leagueId, period);
    const outstandingPayments = await this.getOutstandingPayments(organizationId, leagueId);
    const refunds = await this.getRefunds(organizationId, period);
    const revenue = await this.getRevenueBreakdown(organizationId, period);

    return {
      ...data,
      registrationFees,
      outstandingPayments,
      refunds,
      revenue,
      summary: {
        totalRevenue: revenue.total,
        pendingAmount: outstandingPayments.reduce((sum, p) => sum + p.amount, 0),
        refundAmount: refunds.reduce((sum, r) => sum + r.amount, 0),
        collectionRate: this.calculateCollectionRate(registrationFees, outstandingPayments),
      },
    };
  }

  private async extractGameResultsData(
    data: Record<string, any>,
    filters: Record<string, any>,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const { organizationId, leagueId, seasonId } = filters;
    const { startDate, endDate, includeBoxScores = true } = variables;

    const dateFilter = this.buildDateFilter(startDate, endDate);
    const games = await this.getGames(leagueId, seasonId, dateFilter);
    const gameStats = includeBoxScores ? await this.getGameStatistics(games.map(g => g.id)) : [];

    return {
      ...data,
      games,
      gameStats,
      summary: {
        totalGames: games.length,
        completedGames: games.filter(g => g.status === 'COMPLETED').length,
        averageScore: this.calculateAverageScore(games),
        highestScoringGame: this.findHighestScoringGame(games),
      },
    };
  }

  private async extractAttendanceData(
    data: Record<string, any>,
    filters: Record<string, any>,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const { organizationId, leagueId, seasonId } = filters;
    const { includePlayerStats = true } = variables;

    const attendanceRecords = await this.getAttendanceRecords(leagueId, seasonId);
    const teamAttendance = await this.getTeamAttendanceRates(leagueId, seasonId);
    const playerAttendance = includePlayerStats ? await this.getPlayerAttendanceStats(leagueId, seasonId) : [];

    return {
      ...data,
      attendanceRecords,
      teamAttendance,
      playerAttendance,
      summary: {
        overallAttendanceRate: this.calculateOverallAttendanceRate(attendanceRecords),
        bestAttendingTeam: teamAttendance.reduce((best, current) => 
          current.attendanceRate > (best?.attendanceRate || 0) ? current : best, null),
        averagePlayersPerGame: this.calculateAveragePlayersPerGame(attendanceRecords),
      },
    };
  }

  // Mock data methods - replace with actual database queries
  private async getLeagues(organizationId: string, leagueId?: string): Promise<League[]> {
    // Mock implementation
    return [
      {
        id: leagueId || 'league-1',
        name: 'Phoenix Flight Youth Basketball',
        status: 'ACTIVE',
        teamsCount: 12,
      },
    ];
  }

  private async getStandings(leagueId?: string, seasonId?: string): Promise<any[]> {
    return [
      { rank: 1, team: 'Thunder Bolts', wins: 8, losses: 2, winPercentage: 0.8 },
      { rank: 2, team: 'Lightning Hawks', wins: 7, losses: 3, winPercentage: 0.7 },
      { rank: 3, team: 'Fire Dragons', wins: 6, losses: 4, winPercentage: 0.6 },
      { rank: 4, team: 'Ice Wolves', wins: 5, losses: 5, winPercentage: 0.5 },
      { rank: 5, team: 'Storm Eagles', wins: 4, losses: 6, winPercentage: 0.4 },
    ];
  }

  private async getRecentGames(leagueId?: string, days = 7): Promise<Game[]> {
    const mockGames: Game[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      mockGames.push({
        id: `game-${i}`,
        homeTeam: { id: 'team-1', name: 'Thunder Bolts' } as Team,
        awayTeam: { id: 'team-2', name: 'Lightning Hawks' } as Team,
        homeScore: Math.floor(Math.random() * 40) + 40,
        awayScore: Math.floor(Math.random() * 40) + 40,
        status: 'COMPLETED',
        scheduledTime: date,
        actualStartTime: date,
        actualEndTime: new Date(date.getTime() + 2 * 60 * 60 * 1000),
      });
    }
    return mockGames;
  }

  private async getUpcomingGames(leagueId?: string, days = 7): Promise<Game[]> {
    const mockGames: Game[] = [];
    for (let i = 1; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      mockGames.push({
        id: `upcoming-game-${i}`,
        homeTeam: { id: 'team-3', name: 'Fire Dragons' } as Team,
        awayTeam: { id: 'team-4', name: 'Ice Wolves' } as Team,
        homeScore: 0,
        awayScore: 0,
        status: 'SCHEDULED',
        scheduledTime: date,
      });
    }
    return mockGames;
  }

  private async getTopScorers(leagueId?: string, seasonId?: string, limit = 10): Promise<Player[]> {
    return [
      { id: 'player-1', name: 'John Smith', teamId: 'team-1', stats: { points: 24.5, rebounds: 8.2, assists: 6.1, gamesPlayed: 10 } },
      { id: 'player-2', name: 'Mike Johnson', teamId: 'team-2', stats: { points: 22.8, rebounds: 5.4, assists: 8.3, gamesPlayed: 10 } },
      { id: 'player-3', name: 'David Wilson', teamId: 'team-3', stats: { points: 21.2, rebounds: 12.1, assists: 3.2, gamesPlayed: 9 } },
    ];
  }

  // Financial mock methods
  private async getRegistrationFees(organizationId: string, leagueId?: string, period = 'current_month'): Promise<any[]> {
    return [
      { leagueId: 'league-1', amount: 150, status: 'PAID', paidAt: new Date(), playerName: 'John Smith' },
      { leagueId: 'league-1', amount: 150, status: 'PENDING', dueDate: new Date(), playerName: 'Jane Doe' },
    ];
  }

  private async getOutstandingPayments(organizationId: string, leagueId?: string): Promise<any[]> {
    return [
      { amount: 150, dueDate: new Date(), playerName: 'Jane Doe', daysOverdue: 5 },
      { amount: 75, dueDate: new Date(), playerName: 'Bob Wilson', daysOverdue: 12 },
    ];
  }

  private async getRefunds(organizationId: string, period: string): Promise<any[]> {
    return [
      { amount: 150, refundedAt: new Date(), reason: 'Injury withdrawal', playerName: 'Sarah Lee' },
    ];
  }

  private async getRevenueBreakdown(organizationId: string, period: string): Promise<any> {
    return {
      total: 15000,
      registrationFees: 12000,
      lateFees: 500,
      tournamentFees: 2500,
      breakdown: [
        { category: 'Registration Fees', amount: 12000 },
        { category: 'Tournament Fees', amount: 2500 },
        { category: 'Late Fees', amount: 500 },
      ],
    };
  }

  // Game-related mock methods
  private async getGames(leagueId?: string, seasonId?: string, dateFilter?: any): Promise<Game[]> {
    return await this.getRecentGames(leagueId, 30);
  }

  private async getGameStatistics(gameIds: string[]): Promise<any[]> {
    return gameIds.map(id => ({
      gameId: id,
      stats: {
        totalPoints: 156,
        totalRebounds: 45,
        totalAssists: 32,
        leadChanges: 8,
        biggestLead: 15,
      },
    }));
  }

  // Attendance mock methods
  private async getAttendanceRecords(leagueId?: string, seasonId?: string): Promise<any[]> {
    return [
      { gameId: 'game-1', playersPresent: 18, totalPlayers: 20, attendanceRate: 0.9 },
      { gameId: 'game-2', playersPresent: 16, totalPlayers: 20, attendanceRate: 0.8 },
    ];
  }

  private async getTeamAttendanceRates(leagueId?: string, seasonId?: string): Promise<any[]> {
    return [
      { teamId: 'team-1', teamName: 'Thunder Bolts', attendanceRate: 0.95, gamesPlayed: 10 },
      { teamId: 'team-2', teamName: 'Lightning Hawks', attendanceRate: 0.88, gamesPlayed: 10 },
    ];
  }

  private async getPlayerAttendanceStats(leagueId?: string, seasonId?: string): Promise<any[]> {
    return [
      { playerId: 'player-1', playerName: 'John Smith', attendanceRate: 1.0, gamesAttended: 10, totalGames: 10 },
      { playerId: 'player-2', playerName: 'Mike Johnson', attendanceRate: 0.9, gamesAttended: 9, totalGames: 10 },
    ];
  }

  // Utility methods
  private buildDateFilter(startDate?: string, endDate?: string): any {
    if (!startDate && !endDate) return undefined;
    
    const filter: any = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    
    return Between(filter.gte, filter.lte);
  }

  private calculateAveragePoints(games: Game[]): number {
    if (games.length === 0) return 0;
    
    const totalPoints = games.reduce((sum, game) => sum + game.homeScore + game.awayScore, 0);
    return Math.round((totalPoints / games.length) * 10) / 10;
  }

  private calculateAverageScore(games: Game[]): { home: number; away: number } {
    if (games.length === 0) return { home: 0, away: 0 };
    
    const totals = games.reduce(
      (acc, game) => ({
        home: acc.home + game.homeScore,
        away: acc.away + game.awayScore,
      }),
      { home: 0, away: 0 }
    );
    
    return {
      home: Math.round((totals.home / games.length) * 10) / 10,
      away: Math.round((totals.away / games.length) * 10) / 10,
    };
  }

  private findHighestScoringGame(games: Game[]): Game | null {
    if (games.length === 0) return null;
    
    return games.reduce((highest, current) => {
      const currentTotal = current.homeScore + current.awayScore;
      const highestTotal = highest.homeScore + highest.awayScore;
      return currentTotal > highestTotal ? current : highest;
    });
  }

  private calculateCollectionRate(fees: any[], outstanding: any[]): number {
    const totalFees = fees.length;
    const paidFees = fees.filter(f => f.status === 'PAID').length;
    
    if (totalFees === 0) return 100;
    return Math.round((paidFees / totalFees) * 100);
  }

  private calculateOverallAttendanceRate(records: any[]): number {
    if (records.length === 0) return 0;
    
    const totalRate = records.reduce((sum, record) => sum + record.attendanceRate, 0);
    return Math.round((totalRate / records.length) * 100);
  }

  private calculateAveragePlayersPerGame(records: any[]): number {
    if (records.length === 0) return 0;
    
    const totalPlayers = records.reduce((sum, record) => sum + record.playersPresent, 0);
    return Math.round((totalPlayers / records.length) * 10) / 10;
  }
}