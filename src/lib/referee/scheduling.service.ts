/**
 * Referee Scheduling Service
 * Implements Constraint Satisfaction Problem (CSP) solver with backtracking
 * for optimal referee assignments
 */

import {
  Referee,
  Assignment,
  Game,
  Venue,
  AssignmentConstraints,
  SchedulingContext,
  SchedulingResult,
  Conflict,
  UnassignedGame,
  AssignmentRole,
  AssignmentStatus,
  ExperienceLevel,
  Division,
  RequiredOfficial,
  SchedulingMetrics,
  Suggestion,
  ConflictType,
  OptimizationObjective,
  DayOfWeek
} from './types';

export class RefereeSchedulingService {
  private static instance: RefereeSchedulingService;
  
  // Cache for distance calculations
  private distanceCache: Map<string, number> = new Map();
  
  // Performance tracking
  private performanceMetrics = {
    schedulingAttempts: 0,
    backtrackCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageSchedulingTime: 0,
  };

  private constructor() {}

  public static getInstance(): RefereeSchedulingService {
    if (!RefereeSchedulingService.instance) {
      RefereeSchedulingService.instance = new RefereeSchedulingService();
    }
    return RefereeSchedulingService.instance;
  }

  /**
   * Main scheduling algorithm using CSP with backtracking
   */
  public async scheduleReferees(context: SchedulingContext): Promise<SchedulingResult> {
    const startTime = Date.now();
    this.performanceMetrics.schedulingAttempts++;

    // Initialize result structure
    const result: SchedulingResult = {
      success: false,
      assignments: [],
      unassignedGames: [],
      conflicts: [],
      metrics: this.initializeMetrics(context),
      suggestions: []
    };

    try {
      // Pre-process and validate input
      const validationResult = this.validateContext(context);
      if (!validationResult.valid) {
        result.conflicts.push(...validationResult.conflicts);
        return result;
      }

      // Sort games by priority and difficulty
      const sortedGames = this.prioritizeGames(context.games);

      // Build domain values for each variable (game-role pairs)
      const domains = this.buildDomains(sortedGames, context);

      // Apply constraint propagation to reduce search space
      this.propagateConstraints(domains, context);

      // Run CSP solver with backtracking
      const solution = await this.solveCSP(
        domains,
        context,
        result,
        new Map(),
        0
      );

      if (solution) {
        result.assignments = Array.from(solution.values());
        result.success = this.evaluateSolution(result, context);
      }

      // Generate improvement suggestions
      result.suggestions = this.generateSuggestions(result, context);

      // Calculate final metrics
      result.metrics = this.calculateMetrics(result, context);

    } catch (error) {
      console.error('Scheduling failed:', error);
      result.conflicts.push({
        type: 'DOUBLE_BOOKING',
        severity: 'CRITICAL',
        description: `Scheduling algorithm failed: ${error}`,
        affectedEntities: {},
        resolution: 'Manual intervention required'
      });
    }

    const schedulingTime = Date.now() - startTime;
    this.updatePerformanceMetrics(schedulingTime);

    return result;
  }

  /**
   * CSP Solver with backtracking and forward checking
   */
  private async solveCSP(
    domains: Map<string, Referee[]>,
    context: SchedulingContext,
    result: SchedulingResult,
    assignments: Map<string, Assignment>,
    depth: number
  ): Promise<Map<string, Assignment> | null> {
    // Base case: all variables assigned
    if (assignments.size === domains.size) {
      return assignments;
    }

    // Select next variable using MRV (Minimum Remaining Values) heuristic
    const nextVariable = this.selectNextVariable(domains, assignments);
    if (!nextVariable) {
      return null;
    }

    // Get domain values for the selected variable
    const candidates = domains.get(nextVariable) || [];

    // Try each candidate referee
    for (const referee of candidates) {
      // Check if assignment is consistent with constraints
      if (this.isConsistent(nextVariable, referee, assignments, context)) {
        // Create assignment
        const assignment = this.createAssignment(nextVariable, referee, context);
        
        // Add to current assignments
        const newAssignments = new Map(assignments);
        newAssignments.set(nextVariable, assignment);

        // Forward checking: update domains based on this assignment
        const updatedDomains = this.forwardCheck(
          domains,
          nextVariable,
          referee,
          context
        );

        // Recursive call
        const solution = await this.solveCSP(
          updatedDomains,
          context,
          result,
          newAssignments,
          depth + 1
        );

        if (solution) {
          return solution;
        }

        // Backtrack
        this.performanceMetrics.backtrackCount++;
      }
    }

    // No solution found for this branch
    return null;
  }

  /**
   * Variable selection using MRV heuristic
   */
  private selectNextVariable(
    domains: Map<string, Referee[]>,
    assignments: Map<string, Assignment>
  ): string | null {
    let minDomainSize = Infinity;
    let selectedVariable: string | null = null;

    for (const [variable, domain] of domains) {
      if (!assignments.has(variable) && domain.length < minDomainSize) {
        minDomainSize = domain.length;
        selectedVariable = variable;
      }
    }

    return selectedVariable;
  }

  /**
   * Check if assignment satisfies all constraints
   */
  private isConsistent(
    variable: string,
    referee: Referee,
    assignments: Map<string, Assignment>,
    context: SchedulingContext
  ): boolean {
    const [gameId, role] = this.parseVariable(variable);
    const game = context.games.find(g => g.id === gameId);
    if (!game) return false;

    // Check hard constraints
    const hardConstraints = [
      () => this.checkAvailability(referee, game),
      () => this.checkExperience(referee, game, role as AssignmentRole),
      () => this.checkDoubleBooking(referee, game, assignments),
      () => this.checkRestPeriod(referee, game, assignments, context),
      () => this.checkMaxGames(referee, game, assignments, context),
      () => this.checkTravelTime(referee, game, assignments, context),
      () => this.checkBlackoutDates(referee, game),
      () => this.checkPartnerConflicts(referee, assignments, game)
    ];

    return hardConstraints.every(constraint => constraint());
  }

  /**
   * Forward checking to maintain arc consistency
   */
  private forwardCheck(
    domains: Map<string, Referee[]>,
    assignedVariable: string,
    assignedReferee: Referee,
    context: SchedulingContext
  ): Map<string, Referee[]> {
    const updatedDomains = new Map(domains);
    const [assignedGameId] = this.parseVariable(assignedVariable);
    const assignedGame = context.games.find(g => g.id === assignedGameId);
    
    if (!assignedGame) return updatedDomains;

    // Remove assigned referee from conflicting variables
    for (const [variable, domain] of updatedDomains) {
      if (variable === assignedVariable) continue;

      const [gameId] = this.parseVariable(variable);
      const game = context.games.find(g => g.id === gameId);
      
      if (game && this.gamesConflict(assignedGame, game, context)) {
        // Remove assigned referee from this game's domain
        updatedDomains.set(
          variable,
          domain.filter(r => r.id !== assignedReferee.id)
        );
      }
    }

    return updatedDomains;
  }

  /**
   * Build initial domains for each game-role variable
   */
  private buildDomains(
    games: Game[],
    context: SchedulingContext
  ): Map<string, Referee[]> {
    const domains = new Map<string, Referee[]>();

    for (const game of games) {
      for (const required of game.requiredOfficials) {
        for (let i = 0; i < required.quantity; i++) {
          const variable = this.createVariable(game.id, required.role, i);
          const candidates = this.findCandidateReferees(
            game,
            required,
            context.referees,
            context.constraints
          );
          domains.set(variable, candidates);
        }
      }
    }

    return domains;
  }

  /**
   * Find suitable referee candidates for a game-role
   */
  private findCandidateReferees(
    game: Game,
    required: RequiredOfficial,
    referees: Referee[],
    constraints: AssignmentConstraints
  ): Referee[] {
    return referees.filter(referee => {
      // Check if referee is active
      if (!referee.active || referee.status !== 'ACTIVE') return false;

      // Check experience level
      if (!this.meetsExperienceRequirement(
        referee.experience,
        required.experienceLevel
      )) return false;

      // Check specializations for the role
      if (!this.hasRoleSpecialization(referee, required.role)) return false;

      // Check travel radius
      if (!this.withinTravelRadius(referee, game, constraints)) return false;

      return true;
    }).sort((a, b) => {
      // Sort by suitability score
      return this.calculateSuitabilityScore(b, game, required.role) -
             this.calculateSuitabilityScore(a, game, required.role);
    });
  }

  /**
   * Calculate suitability score for referee-game pairing
   */
  private calculateSuitabilityScore(
    referee: Referee,
    game: Game,
    role: AssignmentRole
  ): number {
    let score = 0;

    // Experience bonus (0-30 points)
    const experiencePoints = {
      'VOLUNTEER': 0,
      'BEGINNER': 5,
      'INTERMEDIATE': 15,
      'EXPERIENCED': 25,
      'CERTIFIED': 30
    };
    score += experiencePoints[referee.experience] || 0;

    // Performance rating (0-20 points)
    score += (referee.performanceRating / 5) * 20;

    // Reliability and punctuality (0-20 points)
    score += (referee.reliability / 100) * 10;
    score += (referee.punctuality / 100) * 10;

    // Games officiated bonus (0-10 points)
    score += Math.min(10, referee.gamesOfficiated / 100);

    // Venue preference (0-10 points)
    if (referee.preferredVenues.includes(game.venueId)) {
      score += 10;
    }

    // Division specialization (0-10 points)
    const specialization = referee.specializations.find(
      s => s.division.id === game.divisionId
    );
    if (specialization) {
      score += specialization.experienceLevel === 'EXPERT' ? 10 :
               specialization.experienceLevel === 'PROFICIENT' ? 7 : 3;
    }

    return score;
  }

  /**
   * Constraint checking methods
   */
  private checkAvailability(referee: Referee, game: Game): boolean {
    const gameDate = new Date(game.scheduledTime);
    const dayOfWeek = gameDate.getDay() as DayOfWeek;
    const gameTime = `${gameDate.getHours().toString().padStart(2, '0')}:${
      gameDate.getMinutes().toString().padStart(2, '0')}`;

    // Check regular availability
    const available = referee.availability.some(rule => {
      if (rule.dayOfWeek !== dayOfWeek) return false;
      if (rule.effectiveFrom > gameDate) return false;
      if (rule.effectiveTo && rule.effectiveTo < gameDate) return false;
      
      return gameTime >= rule.startTime && gameTime <= rule.endTime;
    });

    return available;
  }

  private checkExperience(
    referee: Referee,
    game: Game,
    role: AssignmentRole
  ): boolean {
    const requiredLevel = game.requiredOfficials.find(
      r => r.role === role
    )?.experienceLevel;
    
    if (!requiredLevel) return true;

    return this.meetsExperienceRequirement(
      referee.experience,
      requiredLevel
    );
  }

  private checkDoubleBooking(
    referee: Referee,
    game: Game,
    assignments: Map<string, Assignment>
  ): boolean {
    for (const [variable, assignment] of assignments) {
      if (assignment.refereeId !== referee.id) continue;

      const [otherGameId] = this.parseVariable(variable);
      const otherGame = this.getGameById(otherGameId);
      
      if (otherGame && this.gamesOverlap(game, otherGame)) {
        return false;
      }
    }
    return true;
  }

  private checkRestPeriod(
    referee: Referee,
    game: Game,
    assignments: Map<string, Assignment>,
    context: SchedulingContext
  ): boolean {
    const refereeAssignments = Array.from(assignments.values())
      .filter(a => a.refereeId === referee.id);

    for (const assignment of refereeAssignments) {
      const otherGame = context.games.find(g => g.id === assignment.gameId);
      if (!otherGame) continue;

      const timeDiff = Math.abs(
        game.scheduledTime.getTime() - otherGame.scheduledTime.getTime()
      );
      const minRestMs = referee.minRestBetweenGames * 60 * 1000;

      if (timeDiff < minRestMs + otherGame.estimatedDuration * 60 * 1000) {
        return false;
      }
    }

    return true;
  }

  private checkMaxGames(
    referee: Referee,
    game: Game,
    assignments: Map<string, Assignment>,
    context: SchedulingContext
  ): boolean {
    const gameDate = new Date(game.scheduledTime);
    const startOfDay = new Date(gameDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(gameDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Count games on the same day
    const sameDayGames = Array.from(assignments.values()).filter(a => {
      if (a.refereeId !== referee.id) return false;
      const assignedGame = context.games.find(g => g.id === a.gameId);
      if (!assignedGame) return false;
      
      const assignedDate = new Date(assignedGame.scheduledTime);
      return assignedDate >= startOfDay && assignedDate <= endOfDay;
    }).length;

    if (sameDayGames >= referee.maxGamesPerDay) {
      return false;
    }

    // Count games in the same week
    const startOfWeek = new Date(gameDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const sameWeekGames = Array.from(assignments.values()).filter(a => {
      if (a.refereeId !== referee.id) return false;
      const assignedGame = context.games.find(g => g.id === a.gameId);
      if (!assignedGame) return false;
      
      const assignedDate = new Date(assignedGame.scheduledTime);
      return assignedDate >= startOfWeek && assignedDate <= endOfWeek;
    }).length;

    return sameWeekGames < referee.maxGamesPerWeek;
  }

  private checkTravelTime(
    referee: Referee,
    game: Game,
    assignments: Map<string, Assignment>,
    context: SchedulingContext
  ): boolean {
    const gameVenue = context.venues.find(v => v.id === game.venueId);
    if (!gameVenue) return true;

    // Check distance from referee's home
    const homeDistance = this.calculateDistance(
      referee.address,
      gameVenue.address
    );
    if (homeDistance > referee.travelRadius) {
      return false;
    }

    // Check travel time from previous/next games
    const refereeAssignments = Array.from(assignments.values())
      .filter(a => a.refereeId === referee.id);

    for (const assignment of refereeAssignments) {
      const otherGame = context.games.find(g => g.id === assignment.gameId);
      if (!otherGame) continue;

      const otherVenue = context.venues.find(v => v.id === otherGame.venueId);
      if (!otherVenue) continue;

      const distance = this.calculateDistance(
        gameVenue.address,
        otherVenue.address
      );
      
      const travelTime = this.estimateTravelTime(distance);
      const timeBetweenGames = Math.abs(
        game.scheduledTime.getTime() - otherGame.scheduledTime.getTime()
      ) / (60 * 1000); // Convert to minutes

      if (timeBetweenGames < travelTime + 30) { // 30 min buffer
        return false;
      }
    }

    return true;
  }

  private checkBlackoutDates(referee: Referee, game: Game): boolean {
    const gameDate = new Date(game.scheduledTime);

    return !referee.blackoutDates.some(blackout => {
      const isWithinDateRange = gameDate >= blackout.startDate && 
                                gameDate <= blackout.endDate;
      
      if (!isWithinDateRange) return false;

      // Check partial blackout times if specified
      if (blackout.partial) {
        const gameTime = `${gameDate.getHours().toString().padStart(2, '0')}:${
          gameDate.getMinutes().toString().padStart(2, '0')}`;
        
        if (blackout.partial.startTime && blackout.partial.endTime) {
          return gameTime >= blackout.partial.startTime && 
                 gameTime <= blackout.partial.endTime;
        }
      }

      return true;
    });
  }

  private checkPartnerConflicts(
    referee: Referee,
    assignments: Map<string, Assignment>,
    game: Game
  ): boolean {
    // Get other referees assigned to this game
    const gameAssignments = Array.from(assignments.entries())
      .filter(([variable]) => {
        const [gameId] = this.parseVariable(variable);
        return gameId === game.id;
      })
      .map(([, assignment]) => assignment.refereeId);

    // Check for avoided partners
    for (const avoidedId of referee.avoidPartners) {
      if (gameAssignments.includes(avoidedId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper methods
   */
  private createVariable(gameId: string, role: AssignmentRole, index: number): string {
    return `${gameId}:${role}:${index}`;
  }

  private parseVariable(variable: string): [string, string, number] {
    const parts = variable.split(':');
    return [parts[0], parts[1], parseInt(parts[2])];
  }

  private gamesOverlap(game1: Game, game2: Game): boolean {
    const start1 = game1.scheduledTime.getTime();
    const end1 = start1 + game1.estimatedDuration * 60 * 1000;
    const start2 = game2.scheduledTime.getTime();
    const end2 = start2 + game2.estimatedDuration * 60 * 1000;

    return start1 < end2 && start2 < end1;
  }

  private gamesConflict(
    game1: Game,
    game2: Game,
    context: SchedulingContext
  ): boolean {
    const timeDiff = Math.abs(
      game1.scheduledTime.getTime() - game2.scheduledTime.getTime()
    );
    const minSeparation = (game1.estimatedDuration + game2.estimatedDuration) * 30 * 1000;
    
    return timeDiff < minSeparation;
  }

  private calculateDistance(
    from: { latitude?: number; longitude?: number },
    to: { latitude?: number; longitude?: number }
  ): number {
    const cacheKey = `${from.latitude},${from.longitude}-${to.latitude},${to.longitude}`;
    
    if (this.distanceCache.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.distanceCache.get(cacheKey)!;
    }

    this.performanceMetrics.cacheMisses++;

    if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) {
      return 0;
    }

    // Haversine formula for distance calculation
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) * 
      Math.cos(this.toRad(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    this.distanceCache.set(cacheKey, distance);
    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private estimateTravelTime(distance: number): number {
    // Assume average speed of 30 mph in city
    return (distance / 30) * 60; // Convert to minutes
  }

  private meetsExperienceRequirement(
    refereeLevel: ExperienceLevel,
    requiredLevel: ExperienceLevel
  ): boolean {
    const levels = {
      'VOLUNTEER': 0,
      'BEGINNER': 1,
      'INTERMEDIATE': 2,
      'EXPERIENCED': 3,
      'CERTIFIED': 4
    };

    return levels[refereeLevel] >= levels[requiredLevel];
  }

  private hasRoleSpecialization(
    referee: Referee,
    role: AssignmentRole
  ): boolean {
    // For now, assume all referees can perform basic roles
    // In a real system, this would check certifications
    return true;
  }

  private withinTravelRadius(
    referee: Referee,
    game: Game,
    constraints: AssignmentConstraints
  ): boolean {
    // Simplified check - would use actual venue location in production
    return true;
  }

  private prioritizeGames(games: Game[]): Game[] {
    return games.sort((a, b) => {
      // Sort by importance
      const importanceOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
      const importanceDiff = 
        importanceOrder[a.importance] - importanceOrder[b.importance];
      if (importanceDiff !== 0) return importanceDiff;

      // Then by game type
      const typeOrder = { 
        'CHAMPIONSHIP': 0,
        'PLAYOFF': 1,
        'TOURNAMENT': 2,
        'REGULAR': 3,
        'FRIENDLY': 4
      };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;

      // Finally by date
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
  }

  private propagateConstraints(
    domains: Map<string, Referee[]>,
    context: SchedulingContext
  ): void {
    // Arc consistency maintenance
    let changed = true;
    while (changed) {
      changed = false;
      
      for (const [variable, domain] of domains) {
        const [gameId] = this.parseVariable(variable);
        const game = context.games.find(g => g.id === gameId);
        if (!game) continue;

        const filteredDomain = domain.filter(referee => {
          // Apply unary constraints
          if (!this.checkAvailability(referee, game)) return false;
          if (!this.checkBlackoutDates(referee, game)) return false;
          return true;
        });

        if (filteredDomain.length < domain.length) {
          domains.set(variable, filteredDomain);
          changed = true;
        }
      }
    }
  }

  private createAssignment(
    variable: string,
    referee: Referee,
    context: SchedulingContext
  ): Assignment {
    const [gameId, role] = this.parseVariable(variable);
    const game = context.games.find(g => g.id === gameId)!;

    const baseRate = this.calculatePayRate(referee, game, role as AssignmentRole);
    const bonuses = this.calculateBonuses(referee, game, context);
    
    return {
      id: this.generateId(),
      gameId,
      refereeId: referee.id,
      role: role as AssignmentRole,
      status: 'PENDING',
      assignedAt: new Date(),
      assignedBy: 'SYSTEM',
      payRate: baseRate,
      bonuses,
      totalPay: baseRate + bonuses.reduce((sum, b) => sum + b.amount, 0),
      conflictScore: 0,
      autoAssigned: true
    };
  }

  private calculatePayRate(
    referee: Referee,
    game: Game,
    role: AssignmentRole
  ): number {
    let rate = referee.baseRate;

    // Role multipliers
    const roleMultipliers = {
      'HEAD_REFEREE': 1.0,
      'ASSISTANT_REFEREE': 0.85,
      'SCOREKEEPER': 0.7,
      'CLOCK_OPERATOR': 0.65,
      'SHOT_CLOCK_OPERATOR': 0.65
    };
    rate *= roleMultipliers[role] || 1.0;

    // Experience multiplier
    rate *= referee.experienceMultiplier;

    // Game importance multiplier
    const importanceMultipliers = {
      'CRITICAL': 1.5,
      'HIGH': 1.25,
      'NORMAL': 1.0,
      'LOW': 0.9
    };
    rate *= importanceMultipliers[game.importance] || 1.0;

    return Math.round(rate * 100) / 100;
  }

  private calculateBonuses(
    referee: Referee,
    game: Game,
    context: SchedulingContext
  ): Array<{ type: any; amount: number; reason: string }> {
    const bonuses = [];

    // Tournament bonus
    if (game.type === 'TOURNAMENT' || game.type === 'CHAMPIONSHIP') {
      bonuses.push({
        type: 'TOURNAMENT',
        amount: referee.baseRate * 0.25,
        reason: 'Tournament/Championship game'
      });
    }

    // Last-minute assignment bonus (within 24 hours)
    const hoursUntilGame = 
      (game.scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilGame < 24) {
      bonuses.push({
        type: 'LAST_MINUTE',
        amount: referee.baseRate * 0.5,
        reason: 'Last-minute assignment'
      });
    }

    // Holiday bonus
    if (this.isHoliday(game.scheduledTime)) {
      bonuses.push({
        type: 'HOLIDAY',
        amount: referee.baseRate * 0.5,
        reason: 'Holiday game'
      });
    }

    return bonuses;
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday check
    const month = date.getMonth();
    const day = date.getDate();
    
    // Major holidays
    const holidays = [
      [0, 1],   // New Year's Day
      [6, 4],   // July 4th
      [11, 25], // Christmas
      // Add more holidays as needed
    ];

    return holidays.some(([m, d]) => month === m && day === d);
  }

  private validateContext(context: SchedulingContext): {
    valid: boolean;
    conflicts: Conflict[];
  } {
    const conflicts: Conflict[] = [];

    // Check if there are any games to schedule
    if (context.games.length === 0) {
      conflicts.push({
        type: 'EXPERIENCE_MISMATCH',
        severity: 'HIGH',
        description: 'No games to schedule',
        affectedEntities: {}
      });
    }

    // Check if there are any referees available
    if (context.referees.length === 0) {
      conflicts.push({
        type: 'EXPERIENCE_MISMATCH',
        severity: 'CRITICAL',
        description: 'No referees available',
        affectedEntities: {}
      });
    }

    // Check if venues are provided
    if (context.venues.length === 0) {
      conflicts.push({
        type: 'EXPERIENCE_MISMATCH',
        severity: 'HIGH',
        description: 'No venues provided',
        affectedEntities: {}
      });
    }

    return {
      valid: conflicts.length === 0,
      conflicts
    };
  }

  private evaluateSolution(
    result: SchedulingResult,
    context: SchedulingContext
  ): boolean {
    // Calculate coverage rate
    const requiredAssignments = context.games.reduce(
      (sum, game) => sum + game.requiredOfficials.reduce(
        (s, r) => s + r.quantity, 0
      ), 0
    );
    
    const coverageRate = result.assignments.length / requiredAssignments;
    
    // Solution is successful if we have > 90% coverage and no critical conflicts
    return coverageRate > 0.9 && 
           !result.conflicts.some(c => c.severity === 'CRITICAL');
  }

  private generateSuggestions(
    result: SchedulingResult,
    context: SchedulingContext
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Check coverage rate
    if (result.metrics.coverageRate < 0.8) {
      suggestions.push({
        type: 'ADD_REFEREES',
        priority: 'HIGH',
        description: 'Insufficient referee coverage',
        impact: `Current coverage: ${(result.metrics.coverageRate * 100).toFixed(1)}%`,
        implementation: 'Recruit additional referees or relax experience requirements'
      });
    }

    // Check workload balance
    if (result.metrics.workloadBalance < 0.5) {
      suggestions.push({
        type: 'ADJUST_CONSTRAINTS',
        priority: 'MEDIUM',
        description: 'Unbalanced workload distribution',
        impact: 'Some referees are overworked while others are underutilized',
        implementation: 'Adjust max games per referee or improve scheduling algorithm'
      });
    }

    // Check cost
    if (result.metrics.averageCostPerGame > 150) {
      suggestions.push({
        type: 'ADJUST_CONSTRAINTS',
        priority: 'LOW',
        description: 'High average cost per game',
        impact: `Average cost: $${result.metrics.averageCostPerGame.toFixed(2)}`,
        implementation: 'Consider using more junior referees for lower-level games'
      });
    }

    return suggestions;
  }

  private initializeMetrics(context: SchedulingContext): SchedulingMetrics {
    return {
      totalGames: context.games.length,
      assignedGames: 0,
      coverageRate: 0,
      totalCost: 0,
      averageCostPerGame: 0,
      refereeUtilization: new Map(),
      travelDistance: new Map(),
      workloadBalance: 0,
      satisfactionScore: 0
    };
  }

  private calculateMetrics(
    result: SchedulingResult,
    context: SchedulingContext
  ): SchedulingMetrics {
    const metrics = this.initializeMetrics(context);

    // Calculate assigned games
    const assignedGameIds = new Set(
      result.assignments.map(a => a.gameId)
    );
    metrics.assignedGames = assignedGameIds.size;

    // Calculate coverage rate
    const requiredAssignments = context.games.reduce(
      (sum, game) => sum + game.requiredOfficials.reduce(
        (s, r) => s + r.quantity, 0
      ), 0
    );
    metrics.coverageRate = result.assignments.length / requiredAssignments;

    // Calculate costs
    metrics.totalCost = result.assignments.reduce(
      (sum, a) => sum + a.totalPay, 0
    );
    metrics.averageCostPerGame = metrics.assignedGames > 0 ?
      metrics.totalCost / metrics.assignedGames : 0;

    // Calculate referee utilization
    for (const referee of context.referees) {
      const assignments = result.assignments.filter(
        a => a.refereeId === referee.id
      );
      const utilization = assignments.length / referee.maxGamesPerWeek;
      metrics.refereeUtilization.set(referee.id, utilization);
    }

    // Calculate workload balance (Gini coefficient)
    const utilizationValues = Array.from(metrics.refereeUtilization.values());
    metrics.workloadBalance = this.calculateGiniCoefficient(utilizationValues);

    // Calculate satisfaction score
    metrics.satisfactionScore = this.calculateSatisfactionScore(
      result,
      context
    );

    return metrics;
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    const cumSum = sorted.reduce((acc, val, i) => {
      acc.push((acc[i - 1] || 0) + val);
      return acc;
    }, [] as number[]);
    
    const totalSum = cumSum[n - 1];
    if (totalSum === 0) return 0;
    
    const gini = 1 - (2 / n) * cumSum.reduce((sum, val) => sum + val, 0) / totalSum;
    return 1 - gini; // Invert so higher is more balanced
  }

  private calculateSatisfactionScore(
    result: SchedulingResult,
    context: SchedulingContext
  ): number {
    let score = 100;

    // Deduct for unassigned games
    score -= result.unassignedGames.length * 5;

    // Deduct for conflicts
    result.conflicts.forEach(conflict => {
      const deduction = {
        'CRITICAL': 10,
        'HIGH': 5,
        'MEDIUM': 2,
        'LOW': 1
      };
      score -= deduction[conflict.severity] || 0;
    });

    // Bonus for balanced workload
    score += result.metrics.workloadBalance * 10;

    return Math.max(0, Math.min(100, score));
  }

  private updatePerformanceMetrics(schedulingTime: number): void {
    const currentAvg = this.performanceMetrics.averageSchedulingTime;
    const attempts = this.performanceMetrics.schedulingAttempts;
    
    this.performanceMetrics.averageSchedulingTime = 
      (currentAvg * (attempts - 1) + schedulingTime) / attempts;
  }

  private generateId(): string {
    return `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getGameById(gameId: string): Game | null {
    // This would normally fetch from a database
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Public API methods for managing assignments
   */
  public async confirmAssignment(assignmentId: string): Promise<Assignment> {
    // Update assignment status to CONFIRMED
    // Send notification to referee
    // Update database
    throw new Error('Not implemented');
  }

  public async declineAssignment(
    assignmentId: string,
    reason?: string
  ): Promise<Assignment> {
    // Update assignment status to DECLINED
    // Find replacement referee
    // Update database
    throw new Error('Not implemented');
  }

  public async reassignGame(
    gameId: string,
    fromRefereeId: string,
    toRefereeId: string
  ): Promise<Assignment> {
    // Validate new referee availability
    // Update assignment
    // Send notifications
    throw new Error('Not implemented');
  }

  public async getConflictsForReferee(
    refereeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Conflict[]> {
    // Check all conflicts for a specific referee
    throw new Error('Not implemented');
  }

  public async optimizeSchedule(
    context: SchedulingContext
  ): Promise<SchedulingResult> {
    // Run multiple optimization passes with different objectives
    const objectives: OptimizationObjective[] = [
      'MAXIMIZE_COVERAGE',
      'BALANCE_WORKLOAD',
      'MINIMIZE_COST',
      'MINIMIZE_TRAVEL'
    ];

    let bestResult: SchedulingResult | null = null;
    let bestScore = -Infinity;

    for (const objective of objectives) {
      const modifiedContext = { ...context, optimization: objective };
      const result = await this.scheduleReferees(modifiedContext);
      
      const score = this.scoreSchedulingResult(result, objective);
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    return bestResult!;
  }

  private scoreSchedulingResult(
    result: SchedulingResult,
    objective: OptimizationObjective
  ): number {
    let score = result.metrics.satisfactionScore;

    switch (objective) {
      case 'MAXIMIZE_COVERAGE':
        score += result.metrics.coverageRate * 100;
        break;
      case 'BALANCE_WORKLOAD':
        score += result.metrics.workloadBalance * 100;
        break;
      case 'MINIMIZE_COST':
        score += (1 - result.metrics.totalCost / 10000) * 100;
        break;
      case 'MINIMIZE_TRAVEL':
        const avgTravel = Array.from(result.metrics.travelDistance.values())
          .reduce((sum, d) => sum + d, 0) / result.metrics.travelDistance.size;
        score += (1 - avgTravel / 100) * 100;
        break;
    }

    return score;
  }
}