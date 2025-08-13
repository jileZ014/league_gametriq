import { Injectable, Logger } from '@nestjs/common';
import { TournamentMatch, MatchType } from '../entities/tournament-match.entity';
import { TournamentCourt, CourtQuality } from '../entities/tournament-court.entity';

export interface CourtAssignment {
  matchId: string;
  courtId: string;
  courtName: string;
  reason: string;
  score: number;
}

export interface AssignmentResult {
  assignments: CourtAssignment[];
  unassigned: string[];
  conflicts: AssignmentConflict[];
  courtLoad: Map<string, number>;
  metrics: AssignmentMetrics;
}

export interface AssignmentConflict {
  matchId: string;
  type: 'no_court_available' | 'time_conflict' | 'court_unavailable';
  description: string;
  suggestedResolution?: string;
}

export interface AssignmentMetrics {
  totalAssigned: number;
  totalUnassigned: number;
  averageCourtLoad: number;
  maxCourtLoad: number;
  minCourtLoad: number;
  distributionScore: number; // 0-100, higher is more even
}

export interface AssignmentCriteria {
  matchImportance?: Map<string, number>; // matchId -> importance (0-10)
  teamPreferences?: Map<string, string[]>; // teamId -> preferred courtIds
  courtReservations?: Map<string, string[]>; // courtId -> reserved for matchIds
  minimizeTravel?: boolean; // For multi-venue tournaments
  balanceLoad?: boolean; // Distribute matches evenly
  preserveContinuity?: boolean; // Keep teams on same court when possible
}

@Injectable()
export class CourtAssignerService {
  private readonly logger = new Logger(CourtAssignerService.name);

  /**
   * Assign courts to matches based on various criteria
   */
  async assignCourts(
    matches: TournamentMatch[],
    courts: TournamentCourt[],
    criteria: AssignmentCriteria = {}
  ): Promise<AssignmentResult> {
    this.logger.log(`Assigning ${matches.length} matches to ${courts.length} courts`);

    const assignments: CourtAssignment[] = [];
    const unassigned: string[] = [];
    const conflicts: AssignmentConflict[] = [];
    const courtLoad = new Map<string, number>();

    // Initialize court load tracking
    courts.forEach(court => {
      courtLoad.set(court.id, 0);
    });

    // Sort matches by importance
    const sortedMatches = this.sortMatchesByImportance(matches, criteria.matchImportance);

    // Process each match
    for (const match of sortedMatches) {
      const assignment = await this.findBestCourt(
        match,
        courts,
        courtLoad,
        assignments,
        criteria
      );

      if (assignment) {
        assignments.push(assignment);
        courtLoad.set(assignment.courtId, (courtLoad.get(assignment.courtId) || 0) + 1);
      } else {
        unassigned.push(match.id);
        conflicts.push({
          matchId: match.id,
          type: 'no_court_available',
          description: `Could not find suitable court for match ${match.matchNumber}`,
          suggestedResolution: 'Consider adding more courts or adjusting schedule',
        });
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(assignments, unassigned, courtLoad);

    // Optimize assignments if requested
    if (criteria.balanceLoad) {
      this.balanceCourtLoad(assignments, courtLoad, courts);
    }

    return {
      assignments,
      unassigned,
      conflicts,
      courtLoad,
      metrics,
    };
  }

  /**
   * Find the best court for a match
   */
  private async findBestCourt(
    match: TournamentMatch,
    courts: TournamentCourt[],
    currentLoad: Map<string, number>,
    existingAssignments: CourtAssignment[],
    criteria: AssignmentCriteria
  ): Promise<CourtAssignment | null> {
    let bestCourt: TournamentCourt | null = null;
    let bestScore = -Infinity;
    let bestReason = '';

    for (const court of courts) {
      // Check if court is reserved for specific matches
      if (criteria.courtReservations) {
        const reservedFor = criteria.courtReservations.get(court.id);
        if (reservedFor && !reservedFor.includes(match.id)) {
          continue; // Court is reserved for other matches
        }
      }

      // Check if court is available
      if (!this.isCourtAvailable(court, match)) {
        continue;
      }

      // Calculate score for this court
      const score = this.scoreCourtForMatch(
        court,
        match,
        currentLoad,
        existingAssignments,
        criteria
      );

      if (score.total > bestScore) {
        bestScore = score.total;
        bestCourt = court;
        bestReason = score.reason;
      }
    }

    if (bestCourt) {
      return {
        matchId: match.id,
        courtId: bestCourt.id,
        courtName: bestCourt.name,
        reason: bestReason,
        score: bestScore,
      };
    }

    return null;
  }

  /**
   * Score a court for a specific match
   */
  private scoreCourtForMatch(
    court: TournamentCourt,
    match: TournamentMatch,
    currentLoad: Map<string, number>,
    existingAssignments: CourtAssignment[],
    criteria: AssignmentCriteria
  ): { total: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Court quality vs match importance
    const qualityScore = this.scoreCourtQuality(court, match);
    score += qualityScore;
    if (qualityScore > 0) {
      reasons.push(`Quality match (${court.quality} court for ${match.matchType})`);
    }

    // Court features for important matches
    if (this.isImportantMatch(match)) {
      if (court.features?.hasScoreboard) {
        score += 20;
        reasons.push('Has scoreboard');
      }
      if (court.features?.hasVideoBoard) {
        score += 15;
        reasons.push('Has video board');
      }
      if (court.features?.seatingCapacity > 500) {
        score += 25;
        reasons.push(`Large capacity (${court.features.seatingCapacity} seats)`);
      }
    }

    // Load balancing
    if (criteria.balanceLoad) {
      const load = currentLoad.get(court.id) || 0;
      const avgLoad = this.calculateAverageLoad(currentLoad);
      if (load < avgLoad) {
        score += 10 * (avgLoad - load);
        reasons.push('Balances court usage');
      } else if (load > avgLoad) {
        score -= 5 * (load - avgLoad);
      }
    }

    // Team preferences
    if (criteria.teamPreferences) {
      const teams = [match.homeTeamId, match.awayTeamId].filter(Boolean);
      let preferenceMatch = 0;
      
      teams.forEach(teamId => {
        const preferences = criteria.teamPreferences.get(teamId);
        if (preferences?.includes(court.id)) {
          preferenceMatch++;
        }
      });

      if (preferenceMatch > 0) {
        score += preferenceMatch * 15;
        reasons.push(`Preferred by ${preferenceMatch} team(s)`);
      }
    }

    // Court continuity
    if (criteria.preserveContinuity) {
      const continuityScore = this.scoreContinuity(
        court,
        match,
        existingAssignments
      );
      score += continuityScore;
      if (continuityScore > 0) {
        reasons.push('Maintains team continuity');
      }
    }

    // Court priority
    score += (10 - court.priority) * 3;

    // Environmental factors
    if (court.features?.hasAirConditioning) {
      score += 5;
    }
    if (court.features?.lighting === 'excellent') {
      score += 5;
    }

    return {
      total: score,
      reason: reasons.join(', ') || 'Default assignment',
    };
  }

  /**
   * Score court quality based on match type
   */
  private scoreCourtQuality(court: TournamentCourt, match: TournamentMatch): number {
    const qualityMatrix = {
      [MatchType.CHAMPIONSHIP]: {
        [CourtQuality.CHAMPIONSHIP]: 100,
        [CourtQuality.PRIMARY]: 50,
        [CourtQuality.SECONDARY]: 20,
        [CourtQuality.PRACTICE]: 0,
      },
      [MatchType.FINAL]: {
        [CourtQuality.CHAMPIONSHIP]: 90,
        [CourtQuality.PRIMARY]: 60,
        [CourtQuality.SECONDARY]: 30,
        [CourtQuality.PRACTICE]: 0,
      },
      [MatchType.SEMIFINAL]: {
        [CourtQuality.CHAMPIONSHIP]: 70,
        [CourtQuality.PRIMARY]: 70,
        [CourtQuality.SECONDARY]: 40,
        [CourtQuality.PRACTICE]: 10,
      },
      [MatchType.QUARTERFINAL]: {
        [CourtQuality.CHAMPIONSHIP]: 50,
        [CourtQuality.PRIMARY]: 60,
        [CourtQuality.SECONDARY]: 50,
        [CourtQuality.PRACTICE]: 20,
      },
      [MatchType.THIRD_PLACE]: {
        [CourtQuality.CHAMPIONSHIP]: 60,
        [CourtQuality.PRIMARY]: 60,
        [CourtQuality.SECONDARY]: 40,
        [CourtQuality.PRACTICE]: 10,
      },
      [MatchType.BRACKET]: {
        [CourtQuality.CHAMPIONSHIP]: 30,
        [CourtQuality.PRIMARY]: 50,
        [CourtQuality.SECONDARY]: 50,
        [CourtQuality.PRACTICE]: 30,
      },
      [MatchType.POOL_PLAY]: {
        [CourtQuality.CHAMPIONSHIP]: 20,
        [CourtQuality.PRIMARY]: 40,
        [CourtQuality.SECONDARY]: 50,
        [CourtQuality.PRACTICE]: 40,
      },
      [MatchType.CONSOLATION]: {
        [CourtQuality.CHAMPIONSHIP]: 10,
        [CourtQuality.PRIMARY]: 30,
        [CourtQuality.SECONDARY]: 40,
        [CourtQuality.PRACTICE]: 50,
      },
      [MatchType.PLACEMENT]: {
        [CourtQuality.CHAMPIONSHIP]: 10,
        [CourtQuality.PRIMARY]: 30,
        [CourtQuality.SECONDARY]: 40,
        [CourtQuality.PRACTICE]: 40,
      },
    };

    return qualityMatrix[match.matchType]?.[court.quality] || 0;
  }

  /**
   * Score continuity - keeping teams on same court
   */
  private scoreContinuity(
    court: TournamentCourt,
    match: TournamentMatch,
    existingAssignments: CourtAssignment[]
  ): number {
    let score = 0;
    const teams = [match.homeTeamId, match.awayTeamId].filter(Boolean);

    teams.forEach(teamId => {
      // Find team's previous assignments
      const previousAssignments = existingAssignments.filter(a => {
        // This would need to check the match's teams
        // For now, simplified check
        return false;
      });

      const lastAssignment = previousAssignments[previousAssignments.length - 1];
      if (lastAssignment?.courtId === court.id) {
        score += 20; // Bonus for staying on same court
      }
    });

    return score;
  }

  /**
   * Check if a court is available for a match
   */
  private isCourtAvailable(court: TournamentCourt, match: TournamentMatch): boolean {
    // Check court status
    if (court.status !== 'available' && court.status !== 'reserved') {
      return false;
    }

    // Check if court is active
    if (!court.isActive) {
      return false;
    }

    // Check court availability schedule if match has scheduled time
    if (match.scheduledTime && court.availability) {
      const matchDate = match.scheduledTime.toISOString().split('T')[0];
      const dayAvailability = court.availability.find(a => a.date === matchDate);
      
      if (dayAvailability) {
        const matchHour = match.scheduledTime.getHours();
        const matchMinute = match.scheduledTime.getMinutes();
        
        for (const slot of dayAvailability.timeSlots) {
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);
          
          if (slot.isAvailable &&
              matchHour >= startHour &&
              matchHour < endHour) {
            return true;
          }
        }
        
        return false;
      }
    }

    return true;
  }

  /**
   * Balance court load across all courts
   */
  private balanceCourtLoad(
    assignments: CourtAssignment[],
    courtLoad: Map<string, number>,
    courts: TournamentCourt[]
  ): void {
    const targetLoad = Math.ceil(assignments.length / courts.length);
    
    // Find overloaded and underloaded courts
    const overloaded: string[] = [];
    const underloaded: string[] = [];
    
    courtLoad.forEach((load, courtId) => {
      if (load > targetLoad + 2) {
        overloaded.push(courtId);
      } else if (load < targetLoad - 2) {
        underloaded.push(courtId);
      }
    });

    // Attempt to rebalance
    for (const overCourt of overloaded) {
      const overAssignments = assignments.filter(a => a.courtId === overCourt);
      const toMove = courtLoad.get(overCourt) - targetLoad;
      
      for (let i = 0; i < toMove && i < overAssignments.length; i++) {
        const assignment = overAssignments[i];
        
        // Find best underloaded court for this match
        for (const underCourt of underloaded) {
          if (courtLoad.get(underCourt) < targetLoad) {
            // Move assignment
            assignment.courtId = underCourt;
            assignment.reason += ' (rebalanced)';
            
            // Update loads
            courtLoad.set(overCourt, courtLoad.get(overCourt) - 1);
            courtLoad.set(underCourt, courtLoad.get(underCourt) + 1);
            
            break;
          }
        }
      }
    }
  }

  /**
   * Sort matches by importance
   */
  private sortMatchesByImportance(
    matches: TournamentMatch[],
    customImportance?: Map<string, number>
  ): TournamentMatch[] {
    return matches.sort((a, b) => {
      // Check custom importance first
      if (customImportance) {
        const aImportance = customImportance.get(a.id) || 0;
        const bImportance = customImportance.get(b.id) || 0;
        
        if (aImportance !== bImportance) {
          return bImportance - aImportance;
        }
      }

      // Then by match type
      const typeImportance = {
        [MatchType.CHAMPIONSHIP]: 10,
        [MatchType.FINAL]: 9,
        [MatchType.THIRD_PLACE]: 8,
        [MatchType.SEMIFINAL]: 7,
        [MatchType.QUARTERFINAL]: 6,
        [MatchType.BRACKET]: 5,
        [MatchType.PLACEMENT]: 4,
        [MatchType.POOL_PLAY]: 3,
        [MatchType.CONSOLATION]: 2,
      };

      const aType = typeImportance[a.matchType] || 0;
      const bType = typeImportance[b.matchType] || 0;

      if (aType !== bType) {
        return bType - aType;
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
   * Check if a match is important
   */
  private isImportantMatch(match: TournamentMatch): boolean {
    const importantTypes = [
      MatchType.CHAMPIONSHIP,
      MatchType.FINAL,
      MatchType.SEMIFINAL,
      MatchType.THIRD_PLACE,
    ];

    return importantTypes.includes(match.matchType);
  }

  /**
   * Calculate average court load
   */
  private calculateAverageLoad(courtLoad: Map<string, number>): number {
    if (courtLoad.size === 0) return 0;
    
    let total = 0;
    courtLoad.forEach(load => {
      total += load;
    });
    
    return total / courtLoad.size;
  }

  /**
   * Calculate assignment metrics
   */
  private calculateMetrics(
    assignments: CourtAssignment[],
    unassigned: string[],
    courtLoad: Map<string, number>
  ): AssignmentMetrics {
    const loads = Array.from(courtLoad.values());
    const averageLoad = loads.length > 0
      ? loads.reduce((a, b) => a + b, 0) / loads.length
      : 0;

    const maxLoad = Math.max(...loads, 0);
    const minLoad = Math.min(...loads, 0);

    // Calculate distribution score (0-100)
    let distributionScore = 100;
    if (loads.length > 0 && averageLoad > 0) {
      const variance = loads.reduce((sum, load) => {
        return sum + Math.pow(load - averageLoad, 2);
      }, 0) / loads.length;
      
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / averageLoad) * 100;
      
      // Lower CV means better distribution
      distributionScore = Math.max(0, 100 - coefficientOfVariation);
    }

    return {
      totalAssigned: assignments.length,
      totalUnassigned: unassigned.length,
      averageCourtLoad: averageLoad,
      maxCourtLoad: maxLoad,
      minCourtLoad: minLoad,
      distributionScore,
    };
  }

  /**
   * Optimize court assignments for a specific time window
   */
  async optimizeTimeSlot(
    matches: TournamentMatch[],
    courts: TournamentCourt[],
    startTime: Date,
    endTime: Date,
    criteria: AssignmentCriteria = {}
  ): Promise<AssignmentResult> {
    // Filter matches within time window
    const timeSlotMatches = matches.filter(match => {
      if (!match.scheduledTime) return false;
      return match.scheduledTime >= startTime && match.scheduledTime < endTime;
    });

    // Filter available courts for this time
    const availableCourts = courts.filter(court => {
      // Check if court is available during this time
      return this.isCourtAvailableInTimeSlot(court, startTime, endTime);
    });

    return this.assignCourts(timeSlotMatches, availableCourts, criteria);
  }

  /**
   * Check if court is available in a time slot
   */
  private isCourtAvailableInTimeSlot(
    court: TournamentCourt,
    startTime: Date,
    endTime: Date
  ): boolean {
    if (!court.isActive || court.status === 'unavailable') {
      return false;
    }

    // Check scheduled matches on this court
    if (court.schedule) {
      for (const scheduled of court.schedule) {
        const schedStart = new Date(scheduled.startTime);
        const schedEnd = new Date(scheduled.endTime);
        
        // Check for overlap
        if (schedStart < endTime && schedEnd > startTime) {
          return false;
        }
      }
    }

    return true;
  }
}