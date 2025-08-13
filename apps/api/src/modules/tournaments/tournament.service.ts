import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, IsNull } from 'typeorm';
import { Tournament, TournamentFormat, TournamentStatus } from './entities/tournament.entity';
import { TournamentTeam, TeamStatus } from './entities/tournament-team.entity';
import { TournamentMatch, MatchStatus } from './entities/tournament-match.entity';
import { TournamentCourt } from './entities/tournament-court.entity';
import { BracketGeneratorService } from './services/bracket-generator.service';
import { ScheduleOptimizerService } from './services/schedule-optimizer.service';
import { CourtAssignerService } from './services/court-assigner.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { WebSocketGatewayService } from '../../websocket/websocket.gateway';

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentTeam)
    private teamRepository: Repository<TournamentTeam>,
    @InjectRepository(TournamentMatch)
    private matchRepository: Repository<TournamentMatch>,
    @InjectRepository(TournamentCourt)
    private courtRepository: Repository<TournamentCourt>,
    private dataSource: DataSource,
    private bracketGenerator: BracketGeneratorService,
    private scheduleOptimizer: ScheduleOptimizerService,
    private courtAssigner: CourtAssignerService,
    private websocketGateway: WebSocketGatewayService,
  ) {}

  /**
   * Create a new tournament
   */
  async create(createDto: CreateTournamentDto, userId: string, organizationId: string): Promise<Tournament> {
    this.logger.log(`Creating tournament: ${createDto.name}`);

    const tournament = this.tournamentRepository.create({
      ...createDto,
      organizationId,
      createdBy: userId,
      status: TournamentStatus.DRAFT,
    });

    const saved = await this.tournamentRepository.save(tournament);

    // Create courts if provided
    if (createDto.courts && createDto.courts.length > 0) {
      const courts = createDto.courts.map(court => 
        this.courtRepository.create({
          ...court,
          tournamentId: saved.id,
        })
      );
      await this.courtRepository.save(courts);
    }

    return saved;
  }

  /**
   * Get all tournaments for an organization
   */
  async findAll(organizationId: string, filters?: {
    status?: TournamentStatus;
    format?: TournamentFormat;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Tournament[]> {
    const query = this.tournamentRepository.createQueryBuilder('tournament')
      .where('tournament.organizationId = :organizationId', { organizationId });

    if (filters?.status) {
      query.andWhere('tournament.status = :status', { status: filters.status });
    }

    if (filters?.format) {
      query.andWhere('tournament.format = :format', { format: filters.format });
    }

    if (filters?.startDate) {
      query.andWhere('tournament.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('tournament.endDate <= :endDate', { endDate: filters.endDate });
    }

    return query.orderBy('tournament.startDate', 'DESC').getMany();
  }

  /**
   * Get a single tournament with all related data
   */
  async findOne(id: string, organizationId: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id, organizationId },
      relations: ['teams', 'matches', 'courts'],
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    return tournament;
  }

  /**
   * Update tournament details
   */
  async update(id: string, updateDto: UpdateTournamentDto, userId: string, organizationId: string): Promise<Tournament> {
    const tournament = await this.findOne(id, organizationId);

    // Prevent certain updates based on status
    if (tournament.status === TournamentStatus.IN_PROGRESS || 
        tournament.status === TournamentStatus.COMPLETED) {
      const allowedFields = ['description', 'settings.displaySeed', 'settings.publicBracket'];
      const updateFields = Object.keys(updateDto);
      
      const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
      if (hasRestrictedFields) {
        throw new BadRequestException('Cannot modify tournament structure while in progress or completed');
      }
    }

    Object.assign(tournament, {
      ...updateDto,
      updatedBy: userId,
    });

    return this.tournamentRepository.save(tournament);
  }

  /**
   * Register a team for the tournament
   */
  async registerTeam(
    tournamentId: string,
    teamData: {
      teamId: string;
      teamName: string;
      divisionId?: string;
      roster?: any[];
      coaches?: any[];
      preferences?: any;
    },
    userId: string,
    organizationId: string
  ): Promise<TournamentTeam> {
    const tournament = await this.findOne(tournamentId, organizationId);

    // Check if registration is open
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Tournament registration is not open');
    }

    // Check if tournament is full
    if (tournament.currentTeamCount >= tournament.maxTeams) {
      throw new BadRequestException('Tournament is full');
    }

    // Check if team is already registered
    const existing = await this.teamRepository.findOne({
      where: {
        tournamentId,
        teamId: teamData.teamId,
      },
    });

    if (existing) {
      throw new BadRequestException('Team is already registered for this tournament');
    }

    // Create team registration
    const tournamentTeam = this.teamRepository.create({
      tournamentId,
      ...teamData,
      status: TeamStatus.REGISTERED,
      registration: {
        registeredAt: new Date(),
        registeredBy: userId,
        paymentStatus: 'pending',
      },
    });

    const saved = await this.teamRepository.save(tournamentTeam);

    // Update tournament team count
    tournament.currentTeamCount++;
    await this.tournamentRepository.save(tournament);

    // Send notification
    await this.websocketGateway.broadcastTournamentUpdate(tournamentId, {
      tournamentId,
      type: 'team_registration',
      data: {
        teamId: saved.teamId,
        teamName: saved.teamName,
        currentTeamCount: tournament.currentTeamCount,
        maxTeams: tournament.maxTeams,
      },
    });

    return saved;
  }

  /**
   * Generate tournament bracket
   */
  async generateBracket(
    tournamentId: string,
    userId: string,
    organizationId: string
  ): Promise<{ bracket: any; matches: TournamentMatch[] }> {
    const tournament = await this.findOne(tournamentId, organizationId);

    // Validate tournament can have bracket generated
    if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED &&
        tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException('Cannot generate bracket at this stage');
    }

    // Get confirmed teams
    const teams = await this.teamRepository.find({
      where: {
        tournamentId,
        status: In([TeamStatus.CONFIRMED, TeamStatus.CHECKED_IN]),
      },
    });

    if (teams.length < tournament.minTeams) {
      throw new BadRequestException(`Need at least ${tournament.minTeams} teams to generate bracket`);
    }

    // Generate bracket structure
    const bracketResult = await this.bracketGenerator.generateBracket({
      format: tournament.format,
      teams,
      seedingMethod: tournament.seedingMethod,
      includeConsolation: tournament.settings?.consolationBracket,
      includeThirdPlace: tournament.settings?.thirdPlaceGame,
      poolCount: tournament.settings?.poolCount,
      teamsPerPool: tournament.settings?.teamsPerPool,
      advanceFromPool: tournament.settings?.advanceFromPool,
    });

    // Save matches to database
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete existing matches if regenerating
      await queryRunner.manager.delete(TournamentMatch, { tournamentId });

      // Create new matches
      const matches = bracketResult.matches.map(matchData => 
        queryRunner.manager.create(TournamentMatch, {
          ...matchData,
          tournamentId,
          status: MatchStatus.PENDING,
        })
      );

      const savedMatches = await queryRunner.manager.save(TournamentMatch, matches);

      // Update tournament with bracket data
      tournament.bracketData = bracketResult.structure;
      tournament.totalRounds = bracketResult.totalRounds;
      tournament.currentRound = 1;
      await queryRunner.manager.save(Tournament, tournament);

      await queryRunner.commitTransaction();

      // Broadcast bracket update
      await this.websocketGateway.broadcastTournamentUpdate(tournamentId, {
        tournamentId,
        type: 'bracket',
        data: {
          bracket: bracketResult.structure,
          totalRounds: bracketResult.totalRounds,
        },
      });

      return {
        bracket: bracketResult.structure,
        matches: savedMatches,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate optimized schedule
   */
  async generateSchedule(
    tournamentId: string,
    constraints: {
      minRestTime?: number;
      maxGamesPerDay?: number;
      startTime?: string;
      endTime?: string;
      gameDuration?: number;
    },
    userId: string,
    organizationId: string
  ): Promise<any> {
    const tournament = await this.findOne(tournamentId, organizationId);

    // Get all matches
    const matches = await this.matchRepository.find({
      where: { tournamentId },
      relations: ['homeTeam', 'awayTeam'],
    });

    // Get all courts
    const courts = await this.courtRepository.find({
      where: { tournamentId, isActive: true },
    });

    // Get all teams
    const teams = await this.teamRepository.find({
      where: { tournamentId },
    });

    // Generate optimized schedule
    const schedule = await this.scheduleOptimizer.optimizeSchedule(
      matches,
      courts,
      teams,
      {
        minRestTime: constraints.minRestTime || tournament.settings?.minRestTime || 30,
        maxGamesPerDay: constraints.maxGamesPerDay || tournament.settings?.maxGamesPerDay || 3,
        startTime: constraints.startTime || tournament.settings?.preferredStartTime || '08:00',
        endTime: constraints.endTime || tournament.settings?.preferredEndTime || '20:00',
        gameDuration: constraints.gameDuration || tournament.settings?.gameDuration || 60,
      },
      tournament.startDate,
      tournament.endDate
    );

    // Save schedule to matches
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const scheduledMatch of schedule.matches) {
        await queryRunner.manager.update(
          TournamentMatch,
          { id: scheduledMatch.matchId },
          {
            scheduledTime: scheduledMatch.scheduledTime,
            courtId: scheduledMatch.courtId,
            duration: scheduledMatch.duration,
          }
        );
      }

      // Update tournament with schedule data
      tournament.schedule = schedule;
      await queryRunner.manager.save(Tournament, tournament);

      await queryRunner.commitTransaction();

      // Broadcast schedule update
      await this.websocketGateway.broadcastTournamentUpdate(tournamentId, {
        tournamentId,
        type: 'schedule_change',
        data: {
          schedule: schedule.matches,
          metrics: schedule.metrics,
        },
      });

      return schedule;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Assign courts to matches
   */
  async assignCourts(
    tournamentId: string,
    criteria?: any,
    userId: string,
    organizationId: string
  ): Promise<any> {
    const tournament = await this.findOne(tournamentId, organizationId);

    // Get unassigned matches
    const matches = await this.matchRepository.find({
      where: {
        tournamentId,
        courtId: null,
      },
    });

    // Get available courts
    const courts = await this.courtRepository.find({
      where: {
        tournamentId,
        isActive: true,
      },
    });

    // Assign courts
    const assignments = await this.courtAssigner.assignCourts(
      matches,
      courts,
      criteria
    );

    // Save assignments
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const assignment of assignments.assignments) {
        await queryRunner.manager.update(
          TournamentMatch,
          { id: assignment.matchId },
          { courtId: assignment.courtId }
        );

        // Update court schedule
        const court = courts.find(c => c.id === assignment.courtId);
        if (court) {
          const match = matches.find(m => m.id === assignment.matchId);
          if (match && match.scheduledTime) {
            if (!court.schedule) court.schedule = [];
            court.schedule.push({
              matchId: match.id,
              matchNumber: match.matchNumber,
              startTime: match.scheduledTime.toISOString(),
              endTime: new Date(match.scheduledTime.getTime() + (match.duration || 60) * 60000).toISOString(),
              teamIds: [match.homeTeamId, match.awayTeamId].filter(Boolean),
              status: 'scheduled',
            });
            await queryRunner.manager.save(TournamentCourt, court);
          }
        }
      }

      await queryRunner.commitTransaction();

      return assignments;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update match result and advance winner
   */
  async updateMatchResult(
    tournamentId: string,
    matchId: string,
    result: UpdateMatchResultDto,
    userId: string,
    organizationId: string
  ): Promise<TournamentMatch> {
    const tournament = await this.findOne(tournamentId, organizationId);

    const match = await this.matchRepository.findOne({
      where: { id: matchId, tournamentId },
      relations: ['homeTeam', 'awayTeam'],
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    // Update match result
    match.homeScore = result.homeScore;
    match.awayScore = result.awayScore;
    match.scoreByPeriod = result.scoreByPeriod;
    match.gameStats = result.gameStats;
    match.status = MatchStatus.COMPLETED;
    match.actualEndTime = new Date();

    // Determine winner
    if (result.homeScore > result.awayScore) {
      match.winnerId = match.homeTeamId;
      match.loserId = match.awayTeamId;
    } else {
      match.winnerId = match.awayTeamId;
      match.loserId = match.homeTeamId;
    }

    const savedMatch = await this.matchRepository.save(match);

    // Handle advancement
    await this.handleMatchAdvancement(savedMatch, tournament);

    // Update team records
    await this.updateTeamRecords(savedMatch);

    // Broadcast match result
    await this.websocketGateway.broadcastTournamentUpdate(tournamentId, {
      tournamentId,
      type: 'match_result',
      data: {
        matchId,
        matchResult: {
          winnerId: match.winnerId,
          loserId: match.loserId,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        },
      },
    });

    return savedMatch;
  }

  /**
   * Handle team advancement after match completion
   */
  private async handleMatchAdvancement(
    match: TournamentMatch,
    tournament: Tournament
  ): Promise<void> {
    if (!match.nextMatches) return;

    // Handle winner advancement
    if (match.nextMatches.winnerTo) {
      const nextMatch = await this.matchRepository.findOne({
        where: {
          tournamentId: tournament.id,
          matchNumber: match.nextMatches.winnerTo.matchId,
        },
      });

      if (nextMatch) {
        if (match.nextMatches.winnerTo.position === 'home') {
          nextMatch.homeTeamId = match.winnerId;
        } else {
          nextMatch.awayTeamId = match.winnerId;
        }

        // Check if match is ready to be scheduled
        if (nextMatch.homeTeamId && nextMatch.awayTeamId) {
          nextMatch.status = MatchStatus.SCHEDULED;
        }

        await this.matchRepository.save(nextMatch);

        // Broadcast advancement
        await this.websocketGateway.broadcastTournamentUpdate(tournament.id, {
          tournamentId: tournament.id,
          type: 'team_advance',
          data: {
            teamId: match.winnerId,
            toMatch: nextMatch.matchNumber,
            round: nextMatch.round,
          },
        });
      }
    }

    // Handle loser advancement (for double elimination)
    if (match.nextMatches.loserTo) {
      const loserMatch = await this.matchRepository.findOne({
        where: {
          tournamentId: tournament.id,
          matchNumber: match.nextMatches.loserTo.matchId,
        },
      });

      if (loserMatch) {
        if (match.nextMatches.loserTo.position === 'home') {
          loserMatch.homeTeamId = match.loserId;
        } else {
          loserMatch.awayTeamId = match.loserId;
        }

        if (loserMatch.homeTeamId && loserMatch.awayTeamId) {
          loserMatch.status = MatchStatus.SCHEDULED;
        }

        await this.matchRepository.save(loserMatch);
      }
    }

    // Update team elimination status
    if (match.loserId && tournament.format === TournamentFormat.SINGLE_ELIMINATION) {
      await this.teamRepository.update(
        { tournamentId: tournament.id, teamId: match.loserId },
        {
          status: TeamStatus.ELIMINATED,
          eliminatedInRound: match.round,
          eliminatedBy: match.winnerId,
        }
      );
    }

    // Check if tournament is complete
    await this.checkTournamentCompletion(tournament);
  }

  /**
   * Update team records after match
   */
  private async updateTeamRecords(match: TournamentMatch): Promise<void> {
    // Update winner record
    if (match.winnerId) {
      const winnerTeam = await this.teamRepository.findOne({
        where: {
          tournamentId: match.tournamentId,
          teamId: match.winnerId,
        },
      });

      if (winnerTeam) {
        if (!winnerTeam.tournamentRecord) {
          winnerTeam.tournamentRecord = {
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          };
        }

        winnerTeam.tournamentRecord.wins++;
        winnerTeam.tournamentRecord.pointsFor += match.winnerId === match.homeTeamId 
          ? match.homeScore 
          : match.awayScore;
        winnerTeam.tournamentRecord.pointsAgainst += match.winnerId === match.homeTeamId
          ? match.awayScore
          : match.homeScore;

        await this.teamRepository.save(winnerTeam);
      }
    }

    // Update loser record
    if (match.loserId) {
      const loserTeam = await this.teamRepository.findOne({
        where: {
          tournamentId: match.tournamentId,
          teamId: match.loserId,
        },
      });

      if (loserTeam) {
        if (!loserTeam.tournamentRecord) {
          loserTeam.tournamentRecord = {
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          };
        }

        loserTeam.tournamentRecord.losses++;
        loserTeam.tournamentRecord.pointsFor += match.loserId === match.homeTeamId
          ? match.homeScore
          : match.awayScore;
        loserTeam.tournamentRecord.pointsAgainst += match.loserId === match.homeTeamId
          ? match.awayScore
          : match.homeScore;

        await this.teamRepository.save(loserTeam);
      }
    }
  }

  /**
   * Check if tournament is complete
   */
  private async checkTournamentCompletion(tournament: Tournament): Promise<void> {
    // Check if final match is complete
    const finalMatch = await this.matchRepository.findOne({
      where: {
        tournamentId: tournament.id,
        matchType: In([MatchType.CHAMPIONSHIP, MatchType.FINAL]),
      },
      order: {
        round: 'DESC',
      },
    });

    if (finalMatch && finalMatch.status === MatchStatus.COMPLETED) {
      tournament.status = TournamentStatus.COMPLETED;
      tournament.completedAt = new Date();
      tournament.championId = finalMatch.winnerId;
      tournament.runnerUpId = finalMatch.loserId;

      await this.tournamentRepository.save(tournament);

      // Broadcast tournament completion
      await this.websocketGateway.broadcastTournamentUpdate(tournament.id, {
        tournamentId: tournament.id,
        type: 'tournament_status',
        data: {
          status: 'completed',
          championId: tournament.championId,
          runnerUpId: tournament.runnerUpId,
        },
      });
    }
  }

  /**
   * Get tournament bracket data for display
   */
  async getBracket(tournamentId: string, organizationId: string): Promise<any> {
    const tournament = await this.findOne(tournamentId, organizationId);

    const matches = await this.matchRepository.find({
      where: { tournamentId },
      relations: ['homeTeam', 'awayTeam', 'court'],
      order: {
        round: 'ASC',
        position: 'ASC',
      },
    });

    // Group matches by round
    const rounds = new Map<number, TournamentMatch[]>();
    matches.forEach(match => {
      if (!rounds.has(match.round)) {
        rounds.set(match.round, []);
      }
      rounds.get(match.round).push(match);
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        currentRound: tournament.currentRound,
        totalRounds: tournament.totalRounds,
      },
      rounds: Array.from(rounds.entries()).map(([round, matches]) => ({
        round,
        matches: matches.map(match => ({
          id: match.id,
          matchNumber: match.matchNumber,
          round: match.round,
          position: match.position,
          homeTeam: match.homeTeam ? {
            id: match.homeTeam.teamId,
            name: match.homeTeam.teamName,
            seed: match.homeTeam.seed,
          } : null,
          awayTeam: match.awayTeam ? {
            id: match.awayTeam.teamId,
            name: match.awayTeam.teamName,
            seed: match.awayTeam.seed,
          } : null,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          winnerId: match.winnerId,
          status: match.status,
          scheduledTime: match.scheduledTime,
          court: match.court ? {
            id: match.court.id,
            name: match.court.name,
          } : null,
        })),
      })),
    };
  }

  /**
   * Get tournament schedule
   */
  async getSchedule(tournamentId: string, organizationId: string): Promise<any> {
    const tournament = await this.findOne(tournamentId, organizationId);

    const matches = await this.matchRepository.find({
      where: { 
        tournamentId,
        scheduledTime: Not(IsNull()),
      },
      relations: ['homeTeam', 'awayTeam', 'court'],
      order: {
        scheduledTime: 'ASC',
      },
    });

    // Group by date
    const schedule = new Map<string, TournamentMatch[]>();
    matches.forEach(match => {
      const date = match.scheduledTime.toISOString().split('T')[0];
      if (!schedule.has(date)) {
        schedule.set(date, []);
      }
      schedule.get(date).push(match);
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      },
      schedule: Array.from(schedule.entries()).map(([date, matches]) => ({
        date,
        matches: matches.map(match => ({
          id: match.id,
          matchNumber: match.matchNumber,
          time: match.scheduledTime,
          duration: match.duration,
          homeTeam: match.homeTeam?.teamName,
          awayTeam: match.awayTeam?.teamName,
          court: match.court?.name,
          status: match.status,
        })),
      })),
    };
  }

  /**
   * Start tournament
   */
  async startTournament(
    tournamentId: string,
    userId: string,
    organizationId: string
  ): Promise<Tournament> {
    const tournament = await this.findOne(tournamentId, organizationId);

    if (tournament.status !== TournamentStatus.PUBLISHED) {
      throw new BadRequestException('Tournament must be published before starting');
    }

    tournament.status = TournamentStatus.IN_PROGRESS;
    const saved = await this.tournamentRepository.save(tournament);

    // Broadcast tournament start
    await this.websocketGateway.broadcastTournamentUpdate(tournamentId, {
      tournamentId,
      type: 'tournament_status',
      data: {
        status: 'in_progress',
      },
    });

    return saved;
  }
}