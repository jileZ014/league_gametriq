import { Injectable, Logger } from '@nestjs/common';
import { TournamentMatch } from '../entities/tournament-match.entity';
import { TournamentCourt } from '../entities/tournament-court.entity';
import { TournamentTeam } from '../entities/tournament-team.entity';

export interface ScheduleConstraints {
  minRestTime: number; // Minutes between games for same team
  maxGamesPerDay: number; // Maximum games per team per day
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  gameDuration: number; // Minutes including warmup and buffer
  courtAvailability?: Map<string, CourtAvailability[]>;
  teamAvailability?: Map<string, TeamAvailability[]>;
  preferredCourts?: Map<string, string[]>; // teamId -> courtIds
  blackoutPeriods?: BlackoutPeriod[];
  priorityMatches?: string[]; // Match IDs that should be scheduled first
}

export interface CourtAvailability {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface TeamAvailability {
  teamId: string;
  date: string;
  unavailableTimes?: { start: string; end: string }[];
}

export interface BlackoutPeriod {
  startTime: string;
  endTime: string;
  reason: string;
  affectedCourts?: string[];
}

export interface ScheduleSlot {
  courtId: string;
  date: string;
  startTime: Date;
  endTime: Date;
  matchId?: string;
  isAvailable: boolean;
}

export interface OptimizedSchedule {
  matches: ScheduledMatch[];
  conflicts: ScheduleConflict[];
  metrics: ScheduleMetrics;
  courtUtilization: Map<string, number>;
  teamSchedules: Map<string, TeamSchedule>;
}

export interface ScheduledMatch {
  matchId: string;
  courtId: string;
  scheduledTime: Date;
  duration: number;
  teams: string[];
  priority: number;
}

export interface ScheduleConflict {
  type: 'rest_time' | 'availability' | 'court_conflict' | 'max_games';
  matchId: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestedResolution?: string;
}

export interface ScheduleMetrics {
  totalDuration: number; // Total tournament duration in hours
  averageRestTime: number; // Average rest time between games
  courtUtilizationRate: number; // Percentage of available court time used
  backToBackGames: number; // Number of teams with back-to-back games
  conflictsResolved: number;
  totalTravelTime?: number; // If multiple venues
}

export interface TeamSchedule {
  teamId: string;
  games: {
    matchId: string;
    time: Date;
    courtId: string;
    opponent: string;
  }[];
  restTimes: number[]; // Minutes between games
  totalGames: number;
  conflicts: string[];
}

@Injectable()
export class ScheduleOptimizerService {
  private readonly logger = new Logger(ScheduleOptimizerService.name);

  /**
   * Optimize tournament schedule based on constraints
   */
  async optimizeSchedule(
    matches: TournamentMatch[],
    courts: TournamentCourt[],
    teams: TournamentTeam[],
    constraints: ScheduleConstraints,
    tournamentStartDate: Date,
    tournamentEndDate: Date
  ): Promise<OptimizedSchedule> {
    this.logger.log(`Optimizing schedule for ${matches.length} matches across ${courts.length} courts`);

    // Initialize data structures
    const courtSlots = this.generateCourtSlots(courts, tournamentStartDate, tournamentEndDate, constraints);
    const teamSchedules = new Map<string, TeamSchedule>();
    const scheduledMatches: ScheduledMatch[] = [];
    const conflicts: ScheduleConflict[] = [];

    // Sort matches by priority (finals first, then semis, etc.)
    const prioritizedMatches = this.prioritizeMatches(matches, constraints.priorityMatches);

    // Group matches by round for better scheduling
    const matchesByRound = this.groupMatchesByRound(prioritizedMatches);

    // Schedule each round
    for (const [round, roundMatches] of matchesByRound) {
      const roundSchedule = await this.scheduleRound(
        roundMatches,
        courtSlots,
        teamSchedules,
        constraints,
        courts
      );

      scheduledMatches.push(...roundSchedule.scheduled);
      conflicts.push(...roundSchedule.conflicts);
    }

    // Calculate metrics
    const metrics = this.calculateScheduleMetrics(
      scheduledMatches,
      courtSlots,
      teamSchedules,
      tournamentStartDate,
      tournamentEndDate
    );

    // Calculate court utilization
    const courtUtilization = this.calculateCourtUtilization(courtSlots, courts);

    return {
      matches: scheduledMatches,
      conflicts,
      metrics,
      courtUtilization,
      teamSchedules,
    };
  }

  /**
   * Generate available court time slots
   */
  private generateCourtSlots(
    courts: TournamentCourt[],
    startDate: Date,
    endDate: Date,
    constraints: ScheduleConstraints
  ): Map<string, ScheduleSlot[]> {
    const slots = new Map<string, ScheduleSlot[]>();

    courts.forEach(court => {
      const courtSlots: ScheduleSlot[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const daySlots = this.generateDaySlots(
          court,
          currentDate,
          constraints.startTime,
          constraints.endTime,
          constraints.gameDuration,
          constraints.blackoutPeriods
        );

        // Apply court availability constraints
        if (constraints.courtAvailability) {
          const availability = constraints.courtAvailability.get(court.id);
          if (availability) {
            daySlots.forEach(slot => {
              const slotAvailable = this.checkSlotAvailability(slot, availability);
              slot.isAvailable = slot.isAvailable && slotAvailable;
            });
          }
        }

        courtSlots.push(...daySlots);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      slots.set(court.id, courtSlots);
    });

    return slots;
  }

  /**
   * Generate time slots for a single day
   */
  private generateDaySlots(
    court: TournamentCourt,
    date: Date,
    startTime: string,
    endTime: string,
    gameDuration: number,
    blackoutPeriods?: BlackoutPeriod[]
  ): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + gameDuration);

      if (slotEnd <= dayEnd) {
        const slot: ScheduleSlot = {
          courtId: court.id,
          date: date.toISOString().split('T')[0],
          startTime: new Date(slotStart),
          endTime: new Date(slotEnd),
          isAvailable: true,
        };

        // Check blackout periods
        if (blackoutPeriods) {
          slot.isAvailable = !this.isInBlackoutPeriod(slot, blackoutPeriods, court.id);
        }

        slots.push(slot);
      }

      slotStart.setMinutes(slotStart.getMinutes() + gameDuration);
    }

    return slots;
  }

  /**
   * Schedule matches for a single round
   */
  private async scheduleRound(
    matches: TournamentMatch[],
    courtSlots: Map<string, ScheduleSlot[]>,
    teamSchedules: Map<string, TeamSchedule>,
    constraints: ScheduleConstraints,
    courts: TournamentCourt[]
  ): Promise<{ scheduled: ScheduledMatch[]; conflicts: ScheduleConflict[] }> {
    const scheduled: ScheduledMatch[] = [];
    const conflicts: ScheduleConflict[] = [];

    // Use a greedy algorithm with backtracking for complex constraints
    for (const match of matches) {
      const teams = [match.homeTeamId, match.awayTeamId].filter(Boolean);
      
      if (teams.length < 2 && !match.winnerId) {
        // Skip matches without both teams (byes or pending advancement)
        continue;
      }

      const bestSlot = this.findBestSlot(
        match,
        teams,
        courtSlots,
        teamSchedules,
        constraints,
        courts
      );

      if (bestSlot) {
        // Schedule the match
        const scheduledMatch: ScheduledMatch = {
          matchId: match.id,
          courtId: bestSlot.courtId,
          scheduledTime: bestSlot.startTime,
          duration: constraints.gameDuration,
          teams,
          priority: this.getMatchPriority(match),
        };

        scheduled.push(scheduledMatch);
        bestSlot.matchId = match.id;
        bestSlot.isAvailable = false;

        // Update team schedules
        teams.forEach(teamId => {
          if (!teamSchedules.has(teamId)) {
            teamSchedules.set(teamId, {
              teamId,
              games: [],
              restTimes: [],
              totalGames: 0,
              conflicts: [],
            });
          }

          const teamSchedule = teamSchedules.get(teamId);
          teamSchedule.games.push({
            matchId: match.id,
            time: bestSlot.startTime,
            courtId: bestSlot.courtId,
            opponent: teams.find(t => t !== teamId),
          });
          teamSchedule.totalGames++;

          // Calculate rest times
          if (teamSchedule.games.length > 1) {
            const lastGame = teamSchedule.games[teamSchedule.games.length - 2];
            const restTime = (bestSlot.startTime.getTime() - lastGame.time.getTime()) / (1000 * 60);
            teamSchedule.restTimes.push(restTime);
          }
        });
      } else {
        // Could not schedule match
        conflicts.push({
          type: 'court_conflict',
          matchId: match.id,
          description: `Could not find suitable slot for match ${match.matchNumber}`,
          severity: 'high',
          suggestedResolution: 'Consider extending tournament dates or adding more courts',
        });
      }
    }

    return { scheduled, conflicts };
  }

  /**
   * Find the best available slot for a match
   */
  private findBestSlot(
    match: TournamentMatch,
    teams: string[],
    courtSlots: Map<string, ScheduleSlot[]>,
    teamSchedules: Map<string, TeamSchedule>,
    constraints: ScheduleConstraints,
    courts: TournamentCourt[]
  ): ScheduleSlot | null {
    let bestSlot: ScheduleSlot | null = null;
    let bestScore = -Infinity;

    // Prioritize courts based on match importance and court quality
    const prioritizedCourts = this.prioritizeCourts(match, courts);

    for (const court of prioritizedCourts) {
      const slots = courtSlots.get(court.id) || [];

      for (const slot of slots) {
        if (!slot.isAvailable) continue;

        // Check if slot is valid for all teams
        const slotValid = this.validateSlotForTeams(
          slot,
          teams,
          teamSchedules,
          constraints
        );

        if (slotValid.isValid) {
          const score = this.scoreSlot(
            slot,
            match,
            teams,
            teamSchedules,
            constraints,
            court
          );

          if (score > bestScore) {
            bestScore = score;
            bestSlot = slot;
          }
        }
      }
    }

    return bestSlot;
  }

  /**
   * Validate if a slot is valid for given teams
   */
  private validateSlotForTeams(
    slot: ScheduleSlot,
    teams: string[],
    teamSchedules: Map<string, TeamSchedule>,
    constraints: ScheduleConstraints
  ): { isValid: boolean; reason?: string } {
    for (const teamId of teams) {
      const teamSchedule = teamSchedules.get(teamId);
      
      if (teamSchedule) {
        // Check rest time constraint
        const lastGame = teamSchedule.games[teamSchedule.games.length - 1];
        if (lastGame) {
          const restTime = (slot.startTime.getTime() - lastGame.time.getTime()) / (1000 * 60);
          if (restTime < constraints.minRestTime) {
            return {
              isValid: false,
              reason: `Team ${teamId} needs more rest time (${restTime} < ${constraints.minRestTime})`,
            };
          }
        }

        // Check max games per day
        const gamesOnDay = teamSchedule.games.filter(game => {
          const gameDate = game.time.toISOString().split('T')[0];
          const slotDate = slot.date;
          return gameDate === slotDate;
        }).length;

        if (gamesOnDay >= constraints.maxGamesPerDay) {
          return {
            isValid: false,
            reason: `Team ${teamId} already has maximum games on ${slot.date}`,
          };
        }
      }

      // Check team availability
      if (constraints.teamAvailability) {
        const availability = constraints.teamAvailability.get(teamId);
        if (availability) {
          const dayAvailability = availability.find(a => a.date === slot.date);
          if (dayAvailability?.unavailableTimes) {
            for (const unavailable of dayAvailability.unavailableTimes) {
              if (this.timeOverlaps(slot, unavailable)) {
                return {
                  isValid: false,
                  reason: `Team ${teamId} is unavailable at this time`,
                };
              }
            }
          }
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Score a slot based on various factors
   */
  private scoreSlot(
    slot: ScheduleSlot,
    match: TournamentMatch,
    teams: string[],
    teamSchedules: Map<string, TeamSchedule>,
    constraints: ScheduleConstraints,
    court: TournamentCourt
  ): number {
    let score = 0;

    // Prefer championship court for important matches
    if (match.matchType === 'championship' || match.matchType === 'final') {
      score += court.quality === 'championship' ? 100 : 0;
    }

    // Prefer optimal rest time (not too short, not too long)
    teams.forEach(teamId => {
      const teamSchedule = teamSchedules.get(teamId);
      if (teamSchedule?.games.length > 0) {
        const lastGame = teamSchedule.games[teamSchedule.games.length - 1];
        const restTime = (slot.startTime.getTime() - lastGame.time.getTime()) / (1000 * 60);
        
        // Optimal rest time scoring (peak at 90-120 minutes)
        if (restTime >= 90 && restTime <= 120) {
          score += 50;
        } else if (restTime >= constraints.minRestTime && restTime < 90) {
          score += 30;
        } else if (restTime > 120 && restTime < 240) {
          score += 20;
        }
      }
    });

    // Prefer prime time for important matches
    const hour = slot.startTime.getHours();
    if (match.matchType === 'final' || match.matchType === 'semifinal') {
      if (hour >= 14 && hour <= 20) { // 2 PM to 8 PM
        score += 30;
      }
    }

    // Prefer to keep teams on same court if possible
    teams.forEach(teamId => {
      const teamSchedule = teamSchedules.get(teamId);
      if (teamSchedule?.games.length > 0) {
        const lastGame = teamSchedule.games[teamSchedule.games.length - 1];
        if (lastGame.courtId === court.id) {
          score += 10; // Small bonus for court continuity
        }
      }
    });

    // Penalize very early or very late games
    if (hour < 8 || hour > 21) {
      score -= 20;
    }

    // Court priority
    score += (10 - court.priority) * 5;

    return score;
  }

  /**
   * Prioritize matches for scheduling
   */
  private prioritizeMatches(
    matches: TournamentMatch[],
    priorityMatchIds?: string[]
  ): TournamentMatch[] {
    return matches.sort((a, b) => {
      // First, check if either is in priority list
      if (priorityMatchIds) {
        const aPriority = priorityMatchIds.indexOf(a.id);
        const bPriority = priorityMatchIds.indexOf(b.id);
        
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        }
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
      }

      // Then by match type importance
      const typePriority = {
        'championship': 0,
        'final': 1,
        'third_place': 2,
        'semifinal': 3,
        'quarterfinal': 4,
        'bracket': 5,
        'placement': 6,
        'consolation': 7,
        'pool_play': 8,
      };

      const aTypePriority = typePriority[a.matchType] ?? 10;
      const bTypePriority = typePriority[b.matchType] ?? 10;

      if (aTypePriority !== bTypePriority) {
        return aTypePriority - bTypePriority;
      }

      // Then by round (later rounds first)
      if (a.round !== b.round) {
        return b.round - a.round;
      }

      // Finally by position
      return a.position - b.position;
    });
  }

  /**
   * Group matches by round
   */
  private groupMatchesByRound(matches: TournamentMatch[]): Map<number, TournamentMatch[]> {
    const grouped = new Map<number, TournamentMatch[]>();

    matches.forEach(match => {
      if (!grouped.has(match.round)) {
        grouped.set(match.round, []);
      }
      grouped.get(match.round).push(match);
    });

    // Sort rounds in ascending order
    return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
  }

  /**
   * Prioritize courts based on match and court quality
   */
  private prioritizeCourts(match: TournamentMatch, courts: TournamentCourt[]): TournamentCourt[] {
    return courts.sort((a, b) => {
      // Championship matches on championship courts
      if (match.matchType === 'championship' || match.matchType === 'final') {
        if (a.quality === 'championship' && b.quality !== 'championship') return -1;
        if (b.quality === 'championship' && a.quality !== 'championship') return 1;
      }

      // Then by court priority
      return a.priority - b.priority;
    });
  }

  /**
   * Check if slot overlaps with blackout period
   */
  private isInBlackoutPeriod(
    slot: ScheduleSlot,
    blackoutPeriods: BlackoutPeriod[],
    courtId: string
  ): boolean {
    for (const blackout of blackoutPeriods) {
      // Check if this blackout affects this court
      if (blackout.affectedCourts && !blackout.affectedCourts.includes(courtId)) {
        continue;
      }

      const [blackoutStartHour, blackoutStartMin] = blackout.startTime.split(':').map(Number);
      const [blackoutEndHour, blackoutEndMin] = blackout.endTime.split(':').map(Number);

      const blackoutStart = new Date(slot.startTime);
      blackoutStart.setHours(blackoutStartHour, blackoutStartMin, 0, 0);

      const blackoutEnd = new Date(slot.startTime);
      blackoutEnd.setHours(blackoutEndHour, blackoutEndMin, 0, 0);

      if (slot.startTime < blackoutEnd && slot.endTime > blackoutStart) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if slot is available based on court availability
   */
  private checkSlotAvailability(
    slot: ScheduleSlot,
    availability: CourtAvailability[]
  ): boolean {
    const slotDate = slot.date;
    const dayAvailability = availability.filter(a => a.date === slotDate);

    if (dayAvailability.length === 0) {
      return true; // No specific availability means available
    }

    for (const avail of dayAvailability) {
      if (!avail.isAvailable) {
        const [availStartHour, availStartMin] = avail.startTime.split(':').map(Number);
        const [availEndHour, availEndMin] = avail.endTime.split(':').map(Number);

        const unavailStart = new Date(slot.startTime);
        unavailStart.setHours(availStartHour, availStartMin, 0, 0);

        const unavailEnd = new Date(slot.startTime);
        unavailEnd.setHours(availEndHour, availEndMin, 0, 0);

        if (slot.startTime < unavailEnd && slot.endTime > unavailStart) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if times overlap
   */
  private timeOverlaps(
    slot: ScheduleSlot,
    unavailable: { start: string; end: string }
  ): boolean {
    const [unavailStartHour, unavailStartMin] = unavailable.start.split(':').map(Number);
    const [unavailEndHour, unavailEndMin] = unavailable.end.split(':').map(Number);

    const unavailStart = new Date(slot.startTime);
    unavailStart.setHours(unavailStartHour, unavailStartMin, 0, 0);

    const unavailEnd = new Date(slot.startTime);
    unavailEnd.setHours(unavailEndHour, unavailEndMin, 0, 0);

    return slot.startTime < unavailEnd && slot.endTime > unavailStart;
  }

  /**
   * Get match priority score
   */
  private getMatchPriority(match: TournamentMatch): number {
    const priorities = {
      'championship': 10,
      'final': 9,
      'third_place': 8,
      'semifinal': 7,
      'quarterfinal': 6,
      'bracket': 5,
      'placement': 4,
      'consolation': 3,
      'pool_play': 2,
    };

    return priorities[match.matchType] ?? 1;
  }

  /**
   * Calculate schedule metrics
   */
  private calculateScheduleMetrics(
    scheduledMatches: ScheduledMatch[],
    courtSlots: Map<string, ScheduleSlot[]>,
    teamSchedules: Map<string, TeamSchedule>,
    startDate: Date,
    endDate: Date
  ): ScheduleMetrics {
    // Total duration
    const totalDuration = scheduledMatches.length > 0
      ? (Math.max(...scheduledMatches.map(m => m.scheduledTime.getTime())) -
         Math.min(...scheduledMatches.map(m => m.scheduledTime.getTime()))) / (1000 * 60 * 60)
      : 0;

    // Average rest time
    let totalRestTime = 0;
    let restTimeCount = 0;
    teamSchedules.forEach(schedule => {
      schedule.restTimes.forEach(restTime => {
        totalRestTime += restTime;
        restTimeCount++;
      });
    });
    const averageRestTime = restTimeCount > 0 ? totalRestTime / restTimeCount : 0;

    // Court utilization
    let totalAvailableSlots = 0;
    let usedSlots = 0;
    courtSlots.forEach(slots => {
      totalAvailableSlots += slots.length;
      usedSlots += slots.filter(s => s.matchId).length;
    });
    const courtUtilizationRate = totalAvailableSlots > 0
      ? (usedSlots / totalAvailableSlots) * 100
      : 0;

    // Back-to-back games
    let backToBackGames = 0;
    teamSchedules.forEach(schedule => {
      schedule.restTimes.forEach(restTime => {
        if (restTime < 60) { // Less than 1 hour rest
          backToBackGames++;
        }
      });
    });

    return {
      totalDuration,
      averageRestTime,
      courtUtilizationRate,
      backToBackGames,
      conflictsResolved: 0, // Would be tracked during scheduling
    };
  }

  /**
   * Calculate court utilization percentages
   */
  private calculateCourtUtilization(
    courtSlots: Map<string, ScheduleSlot[]>,
    courts: TournamentCourt[]
  ): Map<string, number> {
    const utilization = new Map<string, number>();

    courts.forEach(court => {
      const slots = courtSlots.get(court.id) || [];
      const totalSlots = slots.length;
      const usedSlots = slots.filter(s => s.matchId).length;
      
      utilization.set(
        court.id,
        totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0
      );
    });

    return utilization;
  }
}