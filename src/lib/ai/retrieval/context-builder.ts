/**
 * Context Builder for Basketball Analytics RAG System
 * Builds comprehensive context for AI-powered basketball insights
 */

import {
  RAGContext,
  RetrievedDocument,
  Player,
  Team,
  Game,
  PlayerGameStats,
  BasketballKnowledge
} from '../types';
import { BasketballSemanticSearch } from './semantic-search';

interface ContextBuildingOptions {
  includeHistorical?: boolean;
  maxDocuments?: number;
  prioritizeRecent?: boolean;
  includeComparisons?: boolean;
  includeStrategies?: boolean;
  contextType?: 'coaching' | 'scouting' | 'analysis' | 'prediction';
}

export class BasketballContextBuilder {
  private semanticSearch: BasketballSemanticSearch;
  private maxContextLength = 8000; // Maximum characters for context

  constructor(semanticSearch: BasketballSemanticSearch) {
    this.semanticSearch = semanticSearch;
  }

  /**
   * Build comprehensive context for basketball queries
   */
  async buildContext(
    query: string,
    options: ContextBuildingOptions = {},
    entities: {
      players?: Player[];
      teams?: Team[];
      games?: Game[];
      playerStats?: PlayerGameStats[];
    } = {}
  ): Promise<RAGContext> {
    const {
      includeHistorical = true,
      maxDocuments = 10,
      prioritizeRecent = true,
      includeComparisons = false,
      includeStrategies = false,
      contextType = 'analysis'
    } = options;

    const { players = [], teams = [], games = [], playerStats = [] } = entities;

    // Start building context
    const retrievedDocs: RetrievedDocument[] = [];

    // 1. Get relevant documents from semantic search
    const searchResults = await this.semanticSearch.search({
      query,
      limit: Math.floor(maxDocuments * 0.4), // 40% from general search
      threshold: 0.3
    });
    retrievedDocs.push(...searchResults);

    // 2. Add entity-specific context based on query intent
    const entityContext = await this.buildEntityContext(
      query,
      { players, teams, games, playerStats },
      contextType
    );
    retrievedDocs.push(...entityContext);

    // 3. Add comparative analysis if requested
    if (includeComparisons) {
      const comparativeContext = await this.buildComparativeContext(
        query,
        { players, teams, games }
      );
      retrievedDocs.push(...comparativeContext);
    }

    // 4. Add strategic insights if requested
    if (includeStrategies) {
      const strategicContext = await this.buildStrategicContext(
        query,
        teams[0], // Use first team if available
        players,
        games
      );
      retrievedDocs.push(...strategicContext);
    }

    // 5. Filter and prioritize documents
    const prioritizedDocs = this.prioritizeDocuments(
      retrievedDocs,
      query,
      prioritizeRecent,
      maxDocuments
    );

    // 6. Build final context
    const context: RAGContext = {
      query,
      retrievedDocs: prioritizedDocs,
      teamContext: this.getRelevantTeams(query, teams),
      playerContext: this.getRelevantPlayers(query, players),
      gameContext: this.getRelevantGames(query, games, prioritizeRecent),
      historicalStats: includeHistorical ? this.getHistoricalStats(playerStats) : []
    };

    return this.optimizeContextLength(context);
  }

  /**
   * Build context for game predictions
   */
  async buildPredictionContext(
    homeTeam: Team,
    awayTeam: Team,
    players: Player[] = [],
    historicalGames: Game[] = [],
    playerStats: PlayerGameStats[] = []
  ): Promise<RAGContext> {
    const query = `game prediction ${homeTeam.name} vs ${awayTeam.name}`;
    
    const retrievedDocs: RetrievedDocument[] = [];

    // Add team analysis
    const teamAnalysis = await this.buildTeamAnalysisContext(homeTeam, awayTeam, historicalGames);
    retrievedDocs.push(...teamAnalysis);

    // Add head-to-head history
    const headToHead = this.buildHeadToHeadContext(homeTeam, awayTeam, historicalGames);
    retrievedDocs.push(...headToHead);

    // Add player performance context
    const playerContext = this.buildPlayerPerformanceContext(
      players.filter(p => p.teamId === homeTeam.id || p.teamId === awayTeam.id),
      playerStats
    );
    retrievedDocs.push(...playerContext);

    // Add recent form analysis
    const recentForm = this.buildRecentFormContext(homeTeam, awayTeam, historicalGames);
    retrievedDocs.push(...recentForm);

    return {
      query,
      retrievedDocs: retrievedDocs.slice(0, 15), // Limit for prediction context
      teamContext: [homeTeam, awayTeam],
      playerContext: players.filter(p => p.teamId === homeTeam.id || p.teamId === awayTeam.id),
      gameContext: historicalGames.slice(0, 10),
      historicalStats: playerStats.slice(0, 20)
    };
  }

  /**
   * Build context for lineup optimization
   */
  async buildLineupContext(
    team: Team,
    players: Player[],
    opponent?: Team,
    recentGames: Game[] = []
  ): Promise<RAGContext> {
    const query = `lineup optimization ${team.name}${opponent ? ` vs ${opponent.name}` : ''}`;
    
    const retrievedDocs: RetrievedDocument[] = [];

    // Add player synergy analysis
    const synergyAnalysis = this.buildPlayerSynergyContext(players);
    retrievedDocs.push(...synergyAnalysis);

    // Add matchup analysis if opponent provided
    if (opponent) {
      const matchupAnalysis = await this.buildMatchupAnalysisContext(team, opponent);
      retrievedDocs.push(...matchupAnalysis);
    }

    // Add performance trends
    const performanceTrends = this.buildPerformanceTrendsContext(players, recentGames);
    retrievedDocs.push(...performanceTrends);

    // Add tactical recommendations
    const tacticalContext = await this.semanticSearch.searchCoachingInsights(
      query,
      team,
      players,
      recentGames
    );
    retrievedDocs.push(...tacticalContext);

    return {
      query,
      retrievedDocs: retrievedDocs.slice(0, 12),
      teamContext: opponent ? [team, opponent] : [team],
      playerContext: players,
      gameContext: recentGames.slice(0, 5),
      historicalStats: []
    };
  }

  /**
   * Build context for tournament analysis
   */
  async buildTournamentContext(
    teams: Team[],
    games: Game[] = [],
    query: string = 'tournament analysis'
  ): Promise<RAGContext> {
    const retrievedDocs: RetrievedDocument[] = [];

    // Add team strength analysis
    const teamStrengths = this.buildTeamStrengthContext(teams, games);
    retrievedDocs.push(...teamStrengths);

    // Add historical tournament patterns
    const tournamentPatterns = await this.semanticSearch.search({
      query: 'tournament seeding bracket prediction',
      type: 'stat_pattern',
      limit: 5
    });
    retrievedDocs.push(...tournamentPatterns);

    // Add upset potential analysis
    const upsetAnalysis = this.buildUpsetAnalysisContext(teams);
    retrievedDocs.push(...upsetAnalysis);

    return {
      query,
      retrievedDocs: retrievedDocs.slice(0, 15),
      teamContext: teams,
      playerContext: [],
      gameContext: games.slice(0, 20),
      historicalStats: []
    };
  }

  // Private helper methods

  private async buildEntityContext(
    query: string,
    entities: {
      players: Player[];
      teams: Team[];
      games: Game[];
      playerStats: PlayerGameStats[];
    },
    contextType: string
  ): Promise<RetrievedDocument[]> {
    const docs: RetrievedDocument[] = [];

    // Player context
    if (entities.players.length > 0) {
      const playerDocs = await this.semanticSearch.searchPlayerInsights(
        query,
        entities.players,
        { includeStats: true, includeComparisons: contextType === 'scouting' }
      );
      docs.push(...playerDocs.slice(0, 3));
    }

    // Team context
    if (entities.teams.length > 0) {
      const teamDocs = await this.semanticSearch.searchTeamInsights(
        query,
        entities.teams,
        entities.games
      );
      docs.push(...teamDocs.slice(0, 3));
    }

    // Game context
    if (entities.games.length > 0) {
      const gameDocs = await this.semanticSearch.searchGameInsights(
        query,
        entities.games,
        entities.teams,
        entities.playerStats
      );
      docs.push(...gameDocs.slice(0, 2));
    }

    return docs;
  }

  private async buildComparativeContext(
    query: string,
    entities: {
      players: Player[];
      teams: Team[];
      games: Game[];
    }
  ): Promise<RetrievedDocument[]> {
    const docs: RetrievedDocument[] = [];

    if (entities.players.length >= 2) {
      // Player comparisons
      const topPlayers = entities.players
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 5);
      
      docs.push({
        id: 'player_comparison_context',
        content: this.generatePlayerComparisonContent(topPlayers),
        metadata: { type: 'comparison', subtype: 'players' },
        relevanceScore: 0.8,
        type: 'comparison'
      });
    }

    if (entities.teams.length >= 2) {
      // Team comparisons
      docs.push({
        id: 'team_comparison_context',
        content: this.generateTeamComparisonContent(entities.teams.slice(0, 4)),
        metadata: { type: 'comparison', subtype: 'teams' },
        relevanceScore: 0.8,
        type: 'comparison'
      });
    }

    return docs;
  }

  private async buildStrategicContext(
    query: string,
    team?: Team,
    players: Player[] = [],
    games: Game[] = []
  ): Promise<RetrievedDocument[]> {
    if (!team) return [];

    return await this.semanticSearch.searchCoachingInsights(
      query,
      team,
      players,
      games
    );
  }

  private async buildTeamAnalysisContext(
    homeTeam: Team,
    awayTeam: Team,
    games: Game[]
  ): Promise<RetrievedDocument[]> {
    const docs: RetrievedDocument[] = [];

    // Home team analysis
    docs.push({
      id: `team_analysis_${homeTeam.id}`,
      content: this.generateTeamAnalysisContent(homeTeam, games),
      metadata: { type: 'team_analysis', teamId: homeTeam.id },
      relevanceScore: 0.9,
      type: 'team_analysis'
    });

    // Away team analysis
    docs.push({
      id: `team_analysis_${awayTeam.id}`,
      content: this.generateTeamAnalysisContent(awayTeam, games),
      metadata: { type: 'team_analysis', teamId: awayTeam.id },
      relevanceScore: 0.9,
      type: 'team_analysis'
    });

    return docs;
  }

  private buildHeadToHeadContext(
    homeTeam: Team,
    awayTeam: Team,
    games: Game[]
  ): RetrievedDocument[] {
    const h2hGames = games.filter(game => 
      (game.homeTeamId === homeTeam.id && game.awayTeamId === awayTeam.id) ||
      (game.homeTeamId === awayTeam.id && game.awayTeamId === homeTeam.id)
    );

    if (h2hGames.length === 0) {
      return [{
        id: `h2h_${homeTeam.id}_${awayTeam.id}`,
        content: `No recent head-to-head history between ${homeTeam.name} and ${awayTeam.name}.`,
        metadata: { type: 'head_to_head', teams: [homeTeam.id, awayTeam.id] },
        relevanceScore: 0.3,
        type: 'head_to_head'
      }];
    }

    return [{
      id: `h2h_${homeTeam.id}_${awayTeam.id}`,
      content: this.generateHeadToHeadContent(homeTeam, awayTeam, h2hGames),
      metadata: { type: 'head_to_head', teams: [homeTeam.id, awayTeam.id] },
      relevanceScore: 0.9,
      type: 'head_to_head'
    }];
  }

  private buildPlayerPerformanceContext(
    players: Player[],
    playerStats: PlayerGameStats[]
  ): RetrievedDocument[] {
    const docs: RetrievedDocument[] = [];

    // Group stats by player
    const playerStatsMap = new Map<string, PlayerGameStats[]>();
    for (const stat of playerStats) {
      if (!playerStatsMap.has(stat.playerId)) {
        playerStatsMap.set(stat.playerId, []);
      }
      playerStatsMap.get(stat.playerId)!.push(stat);
    }

    // Get top performers
    const topPerformers = players
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    for (const player of topPerformers) {
      const stats = playerStatsMap.get(player.id) || [];
      docs.push({
        id: `player_performance_${player.id}`,
        content: this.generatePlayerPerformanceContent(player, stats),
        metadata: { type: 'player_performance', playerId: player.id },
        relevanceScore: 0.8,
        type: 'player_performance'
      });
    }

    return docs;
  }

  private buildRecentFormContext(
    homeTeam: Team,
    awayTeam: Team,
    games: Game[]
  ): RetrievedDocument[] {
    const recentHomeGames = games
      .filter(g => g.homeTeamId === homeTeam.id || g.awayTeamId === homeTeam.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    const recentAwayGames = games
      .filter(g => g.homeTeamId === awayTeam.id || g.awayTeamId === awayTeam.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return [
      {
        id: `recent_form_${homeTeam.id}`,
        content: this.generateRecentFormContent(homeTeam, recentHomeGames),
        metadata: { type: 'recent_form', teamId: homeTeam.id },
        relevanceScore: 0.8,
        type: 'recent_form'
      },
      {
        id: `recent_form_${awayTeam.id}`,
        content: this.generateRecentFormContent(awayTeam, recentAwayGames),
        metadata: { type: 'recent_form', teamId: awayTeam.id },
        relevanceScore: 0.8,
        type: 'recent_form'
      }
    ];
  }

  private buildPlayerSynergyContext(players: Player[]): RetrievedDocument[] {
    return [{
      id: 'player_synergy_analysis',
      content: this.generatePlayerSynergyContent(players),
      metadata: { type: 'synergy_analysis' },
      relevanceScore: 0.7,
      type: 'synergy_analysis'
    }];
  }

  private async buildMatchupAnalysisContext(
    team: Team,
    opponent: Team
  ): Promise<RetrievedDocument[]> {
    return [{
      id: `matchup_analysis_${team.id}_${opponent.id}`,
      content: this.generateMatchupAnalysisContent(team, opponent),
      metadata: { type: 'matchup_analysis', teams: [team.id, opponent.id] },
      relevanceScore: 0.8,
      type: 'matchup_analysis'
    }];
  }

  private buildPerformanceTrendsContext(
    players: Player[],
    games: Game[]
  ): RetrievedDocument[] {
    return [{
      id: 'performance_trends',
      content: this.generatePerformanceTrendsContent(players, games),
      metadata: { type: 'performance_trends' },
      relevanceScore: 0.7,
      type: 'performance_trends'
    }];
  }

  private buildTeamStrengthContext(teams: Team[], games: Game[]): RetrievedDocument[] {
    const strengthAnalysis = teams.map(team => {
      const totalGames = team.wins + team.losses;
      const winPct = totalGames > 0 ? team.wins / totalGames : 0;
      const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 0;
      const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 0;
      
      return {
        team,
        winPct,
        avgPointsFor,
        avgPointsAgainst,
        pointDiff: avgPointsFor - avgPointsAgainst,
        strength: winPct * 0.4 + (avgPointsFor / 120) * 0.3 + (1 - avgPointsAgainst / 120) * 0.3
      };
    }).sort((a, b) => b.strength - a.strength);

    return [{
      id: 'team_strength_rankings',
      content: this.generateTeamStrengthContent(strengthAnalysis),
      metadata: { type: 'team_strength' },
      relevanceScore: 0.8,
      type: 'team_strength'
    }];
  }

  private buildUpsetAnalysisContext(teams: Team[]): RetrievedDocument[] {
    // Simple upset potential based on variance in performance
    const upsetCandidates = teams.filter(team => {
      const totalGames = team.wins + team.losses;
      const winPct = totalGames > 0 ? team.wins / totalGames : 0;
      
      // Teams with inconsistent records or recent improvements
      return winPct > 0.3 && winPct < 0.7 && team.streak.includes('W');
    });

    return [{
      id: 'upset_analysis',
      content: this.generateUpsetAnalysisContent(upsetCandidates),
      metadata: { type: 'upset_analysis' },
      relevanceScore: 0.6,
      type: 'upset_analysis'
    }];
  }

  private prioritizeDocuments(
    docs: RetrievedDocument[],
    query: string,
    prioritizeRecent: boolean,
    maxDocuments: number
  ): RetrievedDocument[] {
    // Remove duplicates
    const uniqueDocs = docs.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );

    // Sort by relevance score
    let sortedDocs = uniqueDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply recency boost if requested
    if (prioritizeRecent) {
      sortedDocs = this.applyRecencyBoost(sortedDocs);
    }

    return sortedDocs.slice(0, maxDocuments);
  }

  private applyRecencyBoost(docs: RetrievedDocument[]): RetrievedDocument[] {
    const now = new Date();
    
    return docs.map(doc => {
      let boost = 0;
      
      // Boost based on document type and recency
      if (doc.metadata.date) {
        const docDate = new Date(doc.metadata.date);
        const daysDiff = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 7) boost = 0.2;
        else if (daysDiff <= 30) boost = 0.1;
        else if (daysDiff <= 90) boost = 0.05;
      }
      
      return {
        ...doc,
        relevanceScore: Math.min(1, doc.relevanceScore + boost)
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getRelevantTeams(query: string, teams: Team[]): Team[] {
    const queryLower = query.toLowerCase();
    
    return teams.filter(team => {
      return queryLower.includes(team.name.toLowerCase()) ||
             queryLower.includes(team.league.toLowerCase()) ||
             queryLower.includes(team.division.toLowerCase());
    }).slice(0, 5);
  }

  private getRelevantPlayers(query: string, players: Player[]): Player[] {
    const queryLower = query.toLowerCase();
    
    return players.filter(player => {
      return queryLower.includes(player.name.toLowerCase()) ||
             queryLower.includes(player.position.toLowerCase());
    }).slice(0, 10);
  }

  private getRelevantGames(query: string, games: Game[], prioritizeRecent: boolean): Game[] {
    let relevantGames = games;
    
    if (prioritizeRecent) {
      relevantGames = games.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    
    return relevantGames.slice(0, 10);
  }

  private getHistoricalStats(playerStats: PlayerGameStats[]): any[] {
    // Return summary statistics
    return playerStats.slice(0, 50).map(stat => ({
      playerId: stat.playerId,
      gameId: stat.gameId,
      points: stat.points,
      assists: stat.assists,
      rebounds: stat.rebounds,
      efficiency: stat.points + stat.assists + stat.rebounds - stat.turnovers
    }));
  }

  private optimizeContextLength(context: RAGContext): RAGContext {
    let currentLength = JSON.stringify(context).length;
    
    if (currentLength <= this.maxContextLength) {
      return context;
    }

    // Trim documents if context is too long
    while (currentLength > this.maxContextLength && context.retrievedDocs.length > 1) {
      context.retrievedDocs.pop();
      currentLength = JSON.stringify(context).length;
    }

    // Trim historical stats
    while (currentLength > this.maxContextLength && context.historicalStats && context.historicalStats.length > 1) {
      context.historicalStats.pop();
      currentLength = JSON.stringify(context).length;
    }

    return context;
  }

  // Content generation methods

  private generatePlayerComparisonContent(players: Player[]): string {
    let content = 'Player Performance Comparison:\n\n';
    
    players.forEach((player, index) => {
      content += `${index + 1}. ${player.name} (${player.position})\n`;
      content += `   - PPG: ${player.pointsPerGame}, APG: ${player.assistsPerGame}, RPG: ${player.reboundsPerGame}\n`;
      content += `   - Efficiency: ${player.efficiency}, FG%: ${(player.fieldGoalPercentage * 100).toFixed(1)}%\n\n`;
    });

    return content;
  }

  private generateTeamComparisonContent(teams: Team[]): string {
    let content = 'Team Performance Comparison:\n\n';
    
    teams.forEach((team, index) => {
      const totalGames = team.wins + team.losses;
      const winPct = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0';
      const avgPointsFor = totalGames > 0 ? (team.pointsFor / totalGames).toFixed(1) : '0.0';
      const avgPointsAgainst = totalGames > 0 ? (team.pointsAgainst / totalGames).toFixed(1) : '0.0';
      
      content += `${index + 1}. ${team.name}\n`;
      content += `   - Record: ${team.wins}-${team.losses} (${winPct}%)\n`;
      content += `   - Scoring: ${avgPointsFor} PPG (For), ${avgPointsAgainst} PPG (Against)\n`;
      content += `   - Current Streak: ${team.streak}\n\n`;
    });

    return content;
  }

  private generateTeamAnalysisContent(team: Team, games: Game[]): string {
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0';
    const avgPointsFor = totalGames > 0 ? (team.pointsFor / totalGames).toFixed(1) : '0.0';
    const avgPointsAgainst = totalGames > 0 ? (team.pointsAgainst / totalGames).toFixed(1) : '0.0';

    let content = `${team.name} Team Analysis:\n\n`;
    content += `Season Record: ${team.wins}-${team.losses} (${winPct}%)\n`;
    content += `League: ${team.league}, Division: ${team.division}\n`;
    content += `Offensive Average: ${avgPointsFor} PPG\n`;
    content += `Defensive Average: ${avgPointsAgainst} PPG\n`;
    content += `Point Differential: ${(parseFloat(avgPointsFor) - parseFloat(avgPointsAgainst)).toFixed(1)}\n`;
    content += `Current Streak: ${team.streak}\n`;
    content += `Recent Form (Last 5): ${team.lastFiveGames.join('-')}\n\n`;

    // Add recent game performance
    const teamGames = games
      .filter(g => g.homeTeamId === team.id || g.awayTeamId === team.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);

    if (teamGames.length > 0) {
      content += `Recent Games:\n`;
      teamGames.forEach(game => {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        const result = (teamScore || 0) > (opponentScore || 0) ? 'W' : 'L';
        
        content += `- ${result} ${teamScore}-${opponentScore} (${game.date.toLocaleDateString()})\n`;
      });
    }

    return content;
  }

  private generateHeadToHeadContent(
    homeTeam: Team,
    awayTeam: Team,
    h2hGames: Game[]
  ): string {
    let content = `Head-to-Head: ${homeTeam.name} vs ${awayTeam.name}\n\n`;
    
    if (h2hGames.length === 0) {
      content += 'No recent head-to-head games found.\n';
      return content;
    }

    let homeWins = 0;
    let awayWins = 0;
    
    content += `Recent Matchups (${h2hGames.length} games):\n`;
    
    h2hGames.slice(0, 5).forEach(game => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      const homeWon = homeScore > awayScore;
      
      if ((game.homeTeamId === homeTeam.id && homeWon) || 
          (game.awayTeamId === homeTeam.id && !homeWon)) {
        homeWins++;
      } else {
        awayWins++;
      }
      
      content += `- ${game.date.toLocaleDateString()}: ${homeScore}-${awayScore}\n`;
    });
    
    content += `\nSeries Record: ${homeTeam.name} ${homeWins}-${awayWins} ${awayTeam.name}\n`;
    
    return content;
  }

  private generatePlayerPerformanceContent(
    player: Player,
    recentStats: PlayerGameStats[]
  ): string {
    let content = `${player.name} Performance Analysis:\n\n`;
    content += `Season Averages:\n`;
    content += `- Points: ${player.pointsPerGame} PPG\n`;
    content += `- Assists: ${player.assistsPerGame} APG\n`;
    content += `- Rebounds: ${player.reboundsPerGame} RPG\n`;
    content += `- Efficiency: ${player.efficiency}\n`;
    content += `- FG%: ${(player.fieldGoalPercentage * 100).toFixed(1)}%\n\n`;

    if (recentStats.length > 0) {
      const recentAvgPoints = recentStats.reduce((sum, stat) => sum + stat.points, 0) / recentStats.length;
      const recentAvgAssists = recentStats.reduce((sum, stat) => sum + stat.assists, 0) / recentStats.length;
      const recentAvgRebounds = recentStats.reduce((sum, stat) => sum + stat.rebounds, 0) / recentStats.length;
      
      content += `Recent Performance (Last ${recentStats.length} games):\n`;
      content += `- Points: ${recentAvgPoints.toFixed(1)} PPG\n`;
      content += `- Assists: ${recentAvgAssists.toFixed(1)} APG\n`;
      content += `- Rebounds: ${recentAvgRebounds.toFixed(1)} RPG\n`;
    }

    return content;
  }

  private generateRecentFormContent(team: Team, recentGames: Game[]): string {
    let content = `${team.name} Recent Form:\n\n`;
    
    if (recentGames.length === 0) {
      content += 'No recent games available.\n';
      return content;
    }

    let wins = 0;
    let totalPoints = 0;
    let totalPointsAgainst = 0;

    content += `Last ${recentGames.length} games:\n`;
    
    recentGames.forEach(game => {
      const isHome = game.homeTeamId === team.id;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;
      const won = (teamScore || 0) > (opponentScore || 0);
      
      if (won) wins++;
      totalPoints += teamScore || 0;
      totalPointsAgainst += opponentScore || 0;
      
      content += `- ${won ? 'W' : 'L'} ${teamScore}-${opponentScore} (${game.date.toLocaleDateString()})\n`;
    });

    const winPct = (wins / recentGames.length * 100).toFixed(1);
    const avgPoints = (totalPoints / recentGames.length).toFixed(1);
    const avgPointsAgainst = (totalPointsAgainst / recentGames.length).toFixed(1);

    content += `\nRecent Form Summary:\n`;
    content += `- Record: ${wins}-${recentGames.length - wins} (${winPct}%)\n`;
    content += `- Avg Points: ${avgPoints} PPG\n`;
    content += `- Avg Points Against: ${avgPointsAgainst} PPG\n`;

    return content;
  }

  private generatePlayerSynergyContent(players: Player[]): string {
    let content = 'Player Synergy Analysis:\n\n';
    
    const guards = players.filter(p => ['PG', 'SG'].includes(p.position));
    const forwards = players.filter(p => ['SF', 'PF'].includes(p.position));
    const centers = players.filter(p => p.position === 'C');

    content += `Roster Composition:\n`;
    content += `- Guards: ${guards.length} (${guards.map(p => p.name).join(', ')})\n`;
    content += `- Forwards: ${forwards.length} (${forwards.map(p => p.name).join(', ')})\n`;
    content += `- Centers: ${centers.length} (${centers.map(p => p.name).join(', ')})\n\n`;

    // Analyze balance
    const totalScoring = players.reduce((sum, p) => sum + p.pointsPerGame, 0);
    const totalAssists = players.reduce((sum, p) => sum + p.assistsPerGame, 0);
    const totalRebounds = players.reduce((sum, p) => sum + p.reboundsPerGame, 0);

    content += `Team Strengths:\n`;
    if (totalScoring / players.length > 12) content += `- Balanced scoring attack\n`;
    if (totalAssists / players.length > 3) content += `- Good ball movement\n`;
    if (totalRebounds / players.length > 6) content += `- Strong rebounding\n`;

    return content;
  }

  private generateMatchupAnalysisContent(team: Team, opponent: Team): string {
    const teamGames = team.wins + team.losses;
    const opponentGames = opponent.wins + opponent.losses;
    
    const teamWinPct = teamGames > 0 ? team.wins / teamGames : 0;
    const opponentWinPct = opponentGames > 0 ? opponent.wins / opponentGames : 0;
    
    const teamAvgPoints = teamGames > 0 ? team.pointsFor / teamGames : 0;
    const teamAvgAgainst = teamGames > 0 ? team.pointsAgainst / teamGames : 0;
    const opponentAvgPoints = opponentGames > 0 ? opponent.pointsFor / opponentGames : 0;
    const opponentAvgAgainst = opponentGames > 0 ? opponent.pointsAgainst / opponentGames : 0;

    let content = `Matchup Analysis: ${team.name} vs ${opponent.name}\n\n`;
    
    content += `Team Comparison:\n`;
    content += `${team.name}: ${team.wins}-${team.losses} (${(teamWinPct * 100).toFixed(1)}%)\n`;
    content += `${opponent.name}: ${opponent.wins}-${opponent.losses} (${(opponentWinPct * 100).toFixed(1)}%)\n\n`;
    
    content += `Offensive Comparison:\n`;
    content += `${team.name}: ${teamAvgPoints.toFixed(1)} PPG\n`;
    content += `${opponent.name}: ${opponentAvgPoints.toFixed(1)} PPG\n\n`;
    
    content += `Defensive Comparison:\n`;
    content += `${team.name}: ${teamAvgAgainst.toFixed(1)} PPG allowed\n`;
    content += `${opponent.name}: ${opponentAvgAgainst.toFixed(1)} PPG allowed\n\n`;
    
    // Key matchup factors
    content += `Key Factors:\n`;
    if (teamAvgPoints > opponentAvgAgainst + 5) {
      content += `- ${team.name} offense vs ${opponent.name} defense favors ${team.name}\n`;
    }
    if (opponentAvgPoints > teamAvgAgainst + 5) {
      content += `- ${opponent.name} offense vs ${team.name} defense favors ${opponent.name}\n`;
    }
    if (Math.abs(teamWinPct - opponentWinPct) < 0.1) {
      content += `- Evenly matched teams based on record\n`;
    }

    return content;
  }

  private generatePerformanceTrendsContent(players: Player[], games: Game[]): string {
    let content = 'Performance Trends Analysis:\n\n';
    
    const topPerformers = players
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 3);

    content += 'Top Performers:\n';
    topPerformers.forEach((player, index) => {
      content += `${index + 1}. ${player.name}: ${player.efficiency} efficiency\n`;
    });

    content += '\nTeam Trends:\n';
    if (games.length > 0) {
      const recentGames = games.slice(0, 5);
      const avgRecentPoints = recentGames.reduce((sum, game) => 
        sum + (game.homeScore || 0) + (game.awayScore || 0), 0) / recentGames.length;
      
      content += `- Recent scoring average: ${avgRecentPoints.toFixed(1)} total points\n`;
      content += `- Games analyzed: ${recentGames.length}\n`;
    }

    return content;
  }

  private generateTeamStrengthContent(
    strengthAnalysis: Array<{
      team: Team;
      winPct: number;
      avgPointsFor: number;
      avgPointsAgainst: number;
      pointDiff: number;
      strength: number;
    }>
  ): string {
    let content = 'Team Strength Rankings:\n\n';
    
    strengthAnalysis.slice(0, 10).forEach((analysis, index) => {
      content += `${index + 1}. ${analysis.team.name}\n`;
      content += `   - Win%: ${(analysis.winPct * 100).toFixed(1)}%\n`;
      content += `   - Point Diff: ${analysis.pointDiff > 0 ? '+' : ''}${analysis.pointDiff.toFixed(1)}\n`;
      content += `   - Strength Score: ${analysis.strength.toFixed(3)}\n\n`;
    });

    return content;
  }

  private generateUpsetAnalysisContent(upsetCandidates: Team[]): string {
    let content = 'Upset Potential Analysis:\n\n';
    
    if (upsetCandidates.length === 0) {
      content += 'No significant upset candidates identified based on current form.\n';
      return content;
    }

    content += 'Teams with upset potential:\n';
    upsetCandidates.forEach((team, index) => {
      const totalGames = team.wins + team.losses;
      const winPct = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0';
      
      content += `${index + 1}. ${team.name}\n`;
      content += `   - Record: ${team.wins}-${team.losses} (${winPct}%)\n`;
      content += `   - Current Streak: ${team.streak}\n`;
      content += `   - Upset Factor: Inconsistent record with recent momentum\n\n`;
    });

    return content;
  }
}