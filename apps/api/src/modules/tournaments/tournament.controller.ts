import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Organization } from '../../common/decorators/organization.decorator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { RegisterTeamDto } from './dto/register-team.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { AssignCourtsDto } from './dto/assign-courts.dto';
import { TournamentStatus, TournamentFormat } from './entities/tournament.entity';

@Controller('tournaments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  /**
   * Create a new tournament
   */
  @Post()
  @Roles('admin', 'league_admin')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateTournamentDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.create(createDto, user.id, organizationId);
  }

  /**
   * Get all tournaments
   */
  @Get()
  async findAll(
    @Organization() organizationId: string,
    @Query('status') status?: TournamentStatus,
    @Query('format') format?: TournamentFormat,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.tournamentService.findAll(organizationId, {
      status,
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get a single tournament
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.findOne(id, organizationId);
  }

  /**
   * Update tournament details
   */
  @Put(':id')
  @Roles('admin', 'league_admin')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTournamentDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.update(id, updateDto, user.id, organizationId);
  }

  /**
   * Register a team for the tournament
   */
  @Post(':id/teams')
  @Roles('admin', 'league_admin', 'coach')
  async registerTeam(
    @Param('id') tournamentId: string,
    @Body() registerDto: RegisterTeamDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.registerTeam(
      tournamentId,
      registerDto,
      user.id,
      organizationId
    );
  }

  /**
   * Generate tournament bracket
   */
  @Post(':id/bracket/generate')
  @Roles('admin', 'league_admin')
  async generateBracket(
    @Param('id') tournamentId: string,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.generateBracket(
      tournamentId,
      user.id,
      organizationId
    );
  }

  /**
   * Get tournament bracket
   */
  @Get(':id/bracket')
  async getBracket(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.getBracket(tournamentId, organizationId);
  }

  /**
   * Generate optimized schedule
   */
  @Post(':id/schedule/generate')
  @Roles('admin', 'league_admin')
  async generateSchedule(
    @Param('id') tournamentId: string,
    @Body() scheduleDto: GenerateScheduleDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.generateSchedule(
      tournamentId,
      scheduleDto,
      user.id,
      organizationId
    );
  }

  /**
   * Get tournament schedule
   */
  @Get(':id/schedule')
  async getSchedule(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.getSchedule(tournamentId, organizationId);
  }

  /**
   * Assign courts to matches
   */
  @Post(':id/courts/assign')
  @Roles('admin', 'league_admin')
  async assignCourts(
    @Param('id') tournamentId: string,
    @Body() assignDto: AssignCourtsDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.assignCourts(
      tournamentId,
      assignDto.criteria,
      user.id,
      organizationId
    );
  }

  /**
   * Update match result
   */
  @Put(':id/matches/:matchId')
  @Roles('admin', 'league_admin', 'scorekeeper', 'referee')
  async updateMatchResult(
    @Param('id') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() resultDto: UpdateMatchResultDto,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.updateMatchResult(
      tournamentId,
      matchId,
      resultDto,
      user.id,
      organizationId
    );
  }

  /**
   * Start tournament
   */
  @Post(':id/start')
  @Roles('admin', 'league_admin')
  async startTournament(
    @Param('id') tournamentId: string,
    @CurrentUser() user: any,
    @Organization() organizationId: string,
  ) {
    return this.tournamentService.startTournament(
      tournamentId,
      user.id,
      organizationId
    );
  }

  /**
   * Get live tournament updates (for polling if WebSocket not available)
   */
  @Get(':id/live')
  async getLiveUpdates(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
    @Query('since') since?: string,
  ) {
    // This would return recent updates since the given timestamp
    // Useful for clients that can't use WebSockets
    const tournament = await this.tournamentService.findOne(tournamentId, organizationId);
    
    // Get matches in progress
    const liveMatches = tournament.matches?.filter(m => 
      m.status === 'in_progress' || 
      (m.scheduledTime && new Date(m.scheduledTime) <= new Date())
    );

    return {
      tournament: {
        id: tournament.id,
        status: tournament.status,
        currentRound: tournament.currentRound,
      },
      liveMatches: liveMatches?.map(m => ({
        id: m.id,
        matchNumber: m.matchNumber,
        status: m.status,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        viewerCount: m.viewerCount,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get tournament statistics
   */
  @Get(':id/statistics')
  async getStatistics(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
  ) {
    const tournament = await this.tournamentService.findOne(tournamentId, organizationId);

    // Calculate statistics
    const totalMatches = tournament.matches?.length || 0;
    const completedMatches = tournament.matches?.filter(m => m.status === 'completed').length || 0;
    const upcomingMatches = tournament.matches?.filter(m => m.status === 'scheduled').length || 0;

    // Calculate scoring statistics
    let totalPoints = 0;
    let highestScoringMatch = null;
    let highestScore = 0;

    tournament.matches?.forEach(match => {
      if (match.status === 'completed') {
        const matchTotal = match.homeScore + match.awayScore;
        totalPoints += matchTotal;
        
        if (matchTotal > highestScore) {
          highestScore = matchTotal;
          highestScoringMatch = {
            matchId: match.id,
            matchNumber: match.matchNumber,
            score: `${match.homeScore}-${match.awayScore}`,
            total: matchTotal,
          };
        }
      }
    });

    const averageScore = completedMatches > 0 ? totalPoints / completedMatches : 0;

    return {
      tournamentId: tournament.id,
      statistics: {
        totalTeams: tournament.currentTeamCount,
        totalMatches,
        completedMatches,
        upcomingMatches,
        completionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
        totalPoints,
        averageScore,
        highestScoringMatch,
        currentRound: tournament.currentRound,
        totalRounds: tournament.totalRounds,
      },
    };
  }

  /**
   * Get tournament standings
   */
  @Get(':id/standings')
  async getStandings(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
    @Query('poolId') poolId?: string,
  ) {
    const tournament = await this.tournamentService.findOne(tournamentId, organizationId);

    // Filter teams by pool if specified
    let teams = tournament.teams;
    if (poolId) {
      teams = teams.filter(t => t.poolId === poolId);
    }

    // Sort by tournament record
    const standings = teams
      .map(team => ({
        teamId: team.teamId,
        teamName: team.teamName,
        seed: team.seed,
        poolId: team.poolId,
        wins: team.tournamentRecord?.wins || 0,
        losses: team.tournamentRecord?.losses || 0,
        pointsFor: team.tournamentRecord?.pointsFor || 0,
        pointsAgainst: team.tournamentRecord?.pointsAgainst || 0,
        pointDifferential: (team.tournamentRecord?.pointsFor || 0) - (team.tournamentRecord?.pointsAgainst || 0),
        status: team.status,
        currentRound: team.currentRound,
        finalPlacement: team.finalPlacement,
      }))
      .sort((a, b) => {
        // First by final placement if set
        if (a.finalPlacement && b.finalPlacement) {
          return a.finalPlacement - b.finalPlacement;
        }
        if (a.finalPlacement) return -1;
        if (b.finalPlacement) return 1;

        // Then by wins
        if (a.wins !== b.wins) {
          return b.wins - a.wins;
        }

        // Then by point differential
        return b.pointDifferential - a.pointDifferential;
      });

    return {
      tournamentId: tournament.id,
      format: tournament.format,
      standings,
    };
  }

  /**
   * Export tournament data
   */
  @Get(':id/export')
  @Roles('admin', 'league_admin')
  async exportTournament(
    @Param('id') tournamentId: string,
    @Organization() organizationId: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const tournament = await this.tournamentService.findOne(tournamentId, organizationId);

    if (format === 'csv') {
      // Convert to CSV format
      // This would be implemented with a CSV library
      return {
        message: 'CSV export not yet implemented',
      };
    }

    // Return full JSON data
    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        settings: tournament.settings,
      },
      teams: tournament.teams,
      matches: tournament.matches,
      courts: tournament.courts,
      exportedAt: new Date().toISOString(),
    };
  }
}