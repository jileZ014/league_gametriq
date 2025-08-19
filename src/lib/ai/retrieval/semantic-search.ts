/**
 * Semantic Search for Basketball Analytics
 * Advanced search capabilities for basketball knowledge and statistics
 */

import { 
  SemanticSearchQuery,
  VectorSearchResult,
  RetrievedDocument,
  BasketballKnowledge,
  Player,
  Team,
  Game,
  PlayerGameStats
} from '../types';
import { BasketballVectorStore } from './vector-store';
import { StatEmbeddingsGenerator } from '../embeddings/stat-embeddings';

export class BasketballSemanticSearch {
  private vectorStore: BasketballVectorStore;
  private embeddingsGenerator: StatEmbeddingsGenerator;
  private basketballKnowledge: BasketballKnowledge;

  constructor(vectorStore: BasketballVectorStore, embeddingsGenerator: StatEmbeddingsGenerator) {
    this.vectorStore = vectorStore;
    this.embeddingsGenerator = embeddingsGenerator;
    this.basketballKnowledge = this.initializeBasketballKnowledge();
  }

  private initializeBasketballKnowledge(): BasketballKnowledge {
    return {
      rules: [
        'A basketball game consists of 4 quarters of 12 minutes each in professional play',
        'Youth basketball may use shorter quarters or halves depending on age group',
        'Teams get 7 team fouls per quarter before bonus free throws',
        'Players foul out after 5 personal fouls in high school/college, 6 in professional',
        'Shot clock is 24 seconds in professional, 30-35 seconds in college/high school',
        'Three-point line distance varies by level: 19\'9" in high school, 20\'9" in college, 23\'9" in NBA',
        'Teams can call timeouts to stop play and strategize',
        'Jump ball situations occur at start of game and alternating possession thereafter'
      ],
      statistics: [
        'Points per game (PPG): Average points scored per game',
        'Assists per game (APG): Average assists made per game',
        'Rebounds per game (RPG): Average rebounds collected per game',
        'Field goal percentage (FG%): Percentage of field goals made',
        'Free throw percentage (FT%): Percentage of free throws made',
        'Three-point percentage (3P%): Percentage of three-point shots made',
        'Player efficiency rating (PER): Overall player performance metric',
        'Plus-minus (+/-): Point differential when player is on court',
        'True shooting percentage (TS%): Shooting efficiency including free throws',
        'Usage rate: Percentage of team plays used by player when on court'
      ],
      strategies: [
        'Fast break: Quick offensive transition to score before defense sets up',
        'Pick and roll: Screen set for ball handler followed by roll to basket',
        'Zone defense: Defending areas rather than specific players',
        'Man-to-man defense: Each defender guards a specific offensive player',
        'Full court press: Defensive pressure applied the length of the court',
        'Motion offense: Continuous player and ball movement to create scoring opportunities',
        'Isolation play: Clearing out space for one-on-one matchup',
        'Post-up play: Positioning player near basket for close-range scoring'
      ],
      positions: [
        'Point Guard (PG): Primary ball handler and playmaker',
        'Shooting Guard (SG): Perimeter scorer and shooter',
        'Small Forward (SF): Versatile wing player, can score inside and outside',
        'Power Forward (PF): Strong inside player, rebounds and scores near basket',
        'Center (C): Tallest player, dominates paint on both ends'
      ],
      terminology: {
        'Assist': 'Pass that directly leads to a made basket',
        'Rebound': 'Gaining possession of ball after missed shot',
        'Steal': 'Taking possession away from opponent',
        'Block': 'Deflecting opponent shot attempt',
        'Turnover': 'Losing possession of ball to opponent',
        'Foul': 'Rule violation involving illegal contact',
        'Technical Foul': 'Non-contact rule violation or unsportsmanlike conduct',
        'Flagrant Foul': 'Excessive or intentional contact',
        'Double-double': 'Double digits in two statistical categories',
        'Triple-double': 'Double digits in three statistical categories',
        'Buzzer beater': 'Shot made just before time expires',
        'Alley-oop': 'Pass thrown high for teammate to catch and score in one motion'
      }
    };
  }

  /**
   * Perform intelligent search across basketball knowledge and statistics
   */
  async search(query: SemanticSearchQuery): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];

    // 1. Search vector embeddings
    const vectorResults = await this.vectorStore.semanticSearch(query);
    results.push(...this.convertVectorResultsToDocuments(vectorResults));

    // 2. Search basketball knowledge base
    const knowledgeResults = this.searchBasketballKnowledge(query.query);
    results.push(...knowledgeResults);

    // 3. Search statistical patterns
    if (query.type === 'stat_pattern' || !query.type) {
      const patternResults = await this.searchStatisticalPatterns(query);
      results.push(...patternResults);
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit if specified
    const limit = query.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * Search for player insights and comparisons
   */
  async searchPlayerInsights(
    query: string,
    players: Player[],
    options: { includeStats?: boolean; includeComparisons?: boolean } = {}
  ): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];

    // Search for similar players based on query
    for (const player of players) {
      const playerEmbedding = await this.vectorStore.retrieve(`player_${player.id}_stats`);
      if (!playerEmbedding) continue;

      const relevance = this.calculatePlayerQueryRelevance(query, player);
      if (relevance > 0.3) {
        results.push({
          id: `player_insight_${player.id}`,
          content: this.generatePlayerInsightContent(player, query),
          metadata: {
            type: 'player_insight',
            playerId: player.id,
            playerName: player.name,
            position: player.position,
            relevance
          },
          relevanceScore: relevance,
          type: 'player_insight'
        });
      }
    }

    // Add player comparisons if requested
    if (options.includeComparisons && players.length >= 2) {
      const comparisonResults = await this.generatePlayerComparisons(query, players);
      results.push(...comparisonResults);
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for team analytics and insights
   */
  async searchTeamInsights(
    query: string,
    teams: Team[],
    games: Game[] = []
  ): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];

    for (const team of teams) {
      const relevance = this.calculateTeamQueryRelevance(query, team);
      if (relevance > 0.3) {
        const teamGames = games.filter(g => 
          g.homeTeamId === team.id || g.awayTeamId === team.id
        );

        results.push({
          id: `team_insight_${team.id}`,
          content: this.generateTeamInsightContent(team, teamGames, query),
          metadata: {
            type: 'team_insight',
            teamId: team.id,
            teamName: team.name,
            league: team.league,
            relevance
          },
          relevanceScore: relevance,
          type: 'team_insight'
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for game patterns and analysis
   */
  async searchGameInsights(
    query: string,
    games: Game[],
    teams: Team[],
    playerStats: PlayerGameStats[] = []
  ): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    for (const game of games) {
      const relevance = this.calculateGameQueryRelevance(query, game);
      if (relevance > 0.3) {
        const homeTeam = teamMap.get(game.homeTeamId);
        const awayTeam = teamMap.get(game.awayTeamId);
        const gamePlayerStats = playerStats.filter(ps => ps.gameId === game.id);

        results.push({
          id: `game_insight_${game.id}`,
          content: this.generateGameInsightContent(game, homeTeam, awayTeam, gamePlayerStats, query),
          metadata: {
            type: 'game_insight',
            gameId: game.id,
            homeTeamId: game.homeTeamId,
            awayTeamId: game.awayTeamId,
            date: game.date.toISOString(),
            relevance
          },
          relevanceScore: relevance,
          type: 'game_insight'
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search for coaching strategies and recommendations
   */
  async searchCoachingInsights(
    query: string,
    team: Team,
    players: Player[],
    recentGames: Game[] = []
  ): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];

    // Search for relevant strategies
    const strategies = this.basketballKnowledge.strategies.filter(strategy =>
      this.calculateTextRelevance(query, strategy) > 0.3
    );

    for (const strategy of strategies) {
      results.push({
        id: `coaching_strategy_${this.hashString(strategy)}`,
        content: `Strategy: ${strategy}\n\nApplication for ${team.name}:\n${this.generateStrategyApplication(strategy, team, players)}`,
        metadata: {
          type: 'coaching_strategy',
          teamId: team.id,
          strategy: strategy
        },
        relevanceScore: this.calculateTextRelevance(query, strategy),
        type: 'coaching_insight'
      });
    }

    // Add tactical recommendations based on team performance
    const tacticalRecommendations = this.generateTacticalRecommendations(team, players, recentGames, query);
    results.push(...tacticalRecommendations);

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Private helper methods

  private convertVectorResultsToDocuments(vectorResults: VectorSearchResult[]): RetrievedDocument[] {
    return vectorResults.map(result => ({
      id: result.id,
      content: this.generateContentFromMetadata(result.metadata),
      metadata: result.metadata,
      relevanceScore: result.score,
      type: result.metadata.type || 'vector_result'
    }));
  }

  private searchBasketballKnowledge(query: string): RetrievedDocument[] {
    const results: RetrievedDocument[] = [];
    const queryLower = query.toLowerCase();

    // Search rules
    for (const rule of this.basketballKnowledge.rules) {
      const relevance = this.calculateTextRelevance(queryLower, rule.toLowerCase());
      if (relevance > 0.3) {
        results.push({
          id: `rule_${this.hashString(rule)}`,
          content: `Basketball Rule: ${rule}`,
          metadata: { type: 'rule', rule },
          relevanceScore: relevance,
          type: 'knowledge'
        });
      }
    }

    // Search statistics definitions
    for (const stat of this.basketballKnowledge.statistics) {
      const relevance = this.calculateTextRelevance(queryLower, stat.toLowerCase());
      if (relevance > 0.3) {
        results.push({
          id: `stat_${this.hashString(stat)}`,
          content: `Basketball Statistic: ${stat}`,
          metadata: { type: 'statistic', statistic: stat },
          relevanceScore: relevance,
          type: 'knowledge'
        });
      }
    }

    // Search terminology
    for (const [term, definition] of Object.entries(this.basketballKnowledge.terminology)) {
      const relevance = this.calculateTextRelevance(queryLower, `${term} ${definition}`.toLowerCase());
      if (relevance > 0.3) {
        results.push({
          id: `term_${this.hashString(term)}`,
          content: `${term}: ${definition}`,
          metadata: { type: 'terminology', term, definition },
          relevanceScore: relevance,
          type: 'knowledge'
        });
      }
    }

    return results;
  }

  private async searchStatisticalPatterns(query: SemanticSearchQuery): Promise<RetrievedDocument[]> {
    // Search for statistical patterns in the vector store
    const patternResults = await this.vectorStore.semanticSearch({
      ...query,
      type: 'stat_pattern'
    });

    return this.convertVectorResultsToDocuments(patternResults);
  }

  private calculatePlayerQueryRelevance(query: string, player: Player): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    // Name matching
    if (player.name.toLowerCase().includes(queryLower)) {
      relevance += 0.8;
    }

    // Position matching
    if (queryLower.includes(player.position.toLowerCase())) {
      relevance += 0.6;
    }

    // Performance indicators
    if (queryLower.includes('score') || queryLower.includes('point')) {
      relevance += player.pointsPerGame > 15 ? 0.4 : 0.2;
    }
    if (queryLower.includes('assist') || queryLower.includes('playmaker')) {
      relevance += player.assistsPerGame > 5 ? 0.4 : 0.2;
    }
    if (queryLower.includes('rebound')) {
      relevance += player.reboundsPerGame > 8 ? 0.4 : 0.2;
    }
    if (queryLower.includes('efficient') || queryLower.includes('effective')) {
      relevance += player.efficiency > 15 ? 0.4 : 0.2;
    }

    return Math.min(1, relevance);
  }

  private calculateTeamQueryRelevance(query: string, team: Team): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    // Name matching
    if (team.name.toLowerCase().includes(queryLower)) {
      relevance += 0.8;
    }

    // League/division matching
    if (team.league.toLowerCase().includes(queryLower) || 
        team.division.toLowerCase().includes(queryLower)) {
      relevance += 0.5;
    }

    // Performance indicators
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0;

    if (queryLower.includes('winning') || queryLower.includes('successful')) {
      relevance += winPct > 0.6 ? 0.4 : 0.1;
    }
    if (queryLower.includes('offense') || queryLower.includes('scoring')) {
      const avgPoints = totalGames > 0 ? team.pointsFor / totalGames : 0;
      relevance += avgPoints > 100 ? 0.3 : 0.1;
    }
    if (queryLower.includes('defense') || queryLower.includes('defensive')) {
      const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 0;
      relevance += avgPointsAgainst < 90 ? 0.3 : 0.1;
    }

    return Math.min(1, relevance);
  }

  private calculateGameQueryRelevance(query: string, game: Game): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    // Date relevance (recent games more relevant)
    const daysSinceGame = (Date.now() - game.date.getTime()) / (1000 * 60 * 60 * 24);
    relevance += Math.max(0, 0.3 - daysSinceGame * 0.01);

    // Score relevance
    if (game.homeScore !== undefined && game.awayScore !== undefined) {
      const totalPoints = game.homeScore + game.awayScore;
      const scoreDiff = Math.abs(game.homeScore - game.awayScore);

      if (queryLower.includes('high scoring') || queryLower.includes('offense')) {
        relevance += totalPoints > 180 ? 0.4 : 0.1;
      }
      if (queryLower.includes('close') || queryLower.includes('competitive')) {
        relevance += scoreDiff <= 5 ? 0.4 : 0.1;
      }
      if (queryLower.includes('blowout') || queryLower.includes('dominant')) {
        relevance += scoreDiff >= 20 ? 0.4 : 0.1;
      }
    }

    // Status relevance
    if (queryLower.includes('completed') && game.status === 'completed') {
      relevance += 0.2;
    }
    if (queryLower.includes('live') && game.status === 'in_progress') {
      relevance += 0.3;
    }

    return Math.min(1, relevance);
  }

  private calculateTextRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const textLower = text.toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matches++;
      }
    }
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  private generateContentFromMetadata(metadata: Record<string, any>): string {
    const type = metadata.type;
    
    switch (type) {
      case 'player_stats':
        return `Player: ${metadata.playerName} (${metadata.position})\nTeam: ${metadata.teamId}\nPPG: ${metadata.pointsPerGame}, APG: ${metadata.assistsPerGame}, RPG: ${metadata.reboundsPerGame}\nEfficiency: ${metadata.efficiency}`;
      
      case 'team_stats':
        return `Team: ${metadata.teamName}\nLeague: ${metadata.league}, Division: ${metadata.division}\nRecord: ${metadata.wins}-${metadata.losses} (${metadata.winPercentage?.toFixed(3)})\nPoints For: ${metadata.pointsFor}, Points Against: ${metadata.pointsAgainst}`;
      
      case 'game_stats':
        return `Game: ${metadata.homeTeamId} vs ${metadata.awayTeamId}\nDate: ${new Date(metadata.date).toLocaleDateString()}\nVenue: ${metadata.venue}\nScore: ${metadata.homeScore}-${metadata.awayScore}\nStatus: ${metadata.status}`;
      
      default:
        return JSON.stringify(metadata, null, 2);
    }
  }

  private generatePlayerInsightContent(player: Player, query: string): string {
    let content = `Player Analysis: ${player.name}\n\n`;
    content += `Position: ${player.position}\n`;
    content += `Season Averages:\n`;
    content += `- Points: ${player.pointsPerGame} per game\n`;
    content += `- Assists: ${player.assistsPerGame} per game\n`;
    content += `- Rebounds: ${player.reboundsPerGame} per game\n`;
    content += `- Field Goal %: ${(player.fieldGoalPercentage * 100).toFixed(1)}%\n`;
    content += `- Efficiency Rating: ${player.efficiency}\n\n`;

    // Add query-specific insights
    if (query.toLowerCase().includes('strength')) {
      content += this.getPlayerStrengths(player);
    }
    if (query.toLowerCase().includes('weakness')) {
      content += this.getPlayerWeaknesses(player);
    }
    if (query.toLowerCase().includes('improvement')) {
      content += this.getPlayerImprovementAreas(player);
    }

    return content;
  }

  private generateTeamInsightContent(team: Team, games: Game[], query: string): string {
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? (team.wins / totalGames * 100).toFixed(1) : '0.0';
    const avgPointsFor = totalGames > 0 ? (team.pointsFor / totalGames).toFixed(1) : '0.0';
    const avgPointsAgainst = totalGames > 0 ? (team.pointsAgainst / totalGames).toFixed(1) : '0.0';

    let content = `Team Analysis: ${team.name}\n\n`;
    content += `League: ${team.league}, Division: ${team.division}\n`;
    content += `Record: ${team.wins}-${team.losses} (${winPct}%)\n`;
    content += `Scoring: ${avgPointsFor} PPG (For), ${avgPointsAgainst} PPG (Against)\n`;
    content += `Current Streak: ${team.streak}\n`;
    content += `Recent Form: ${team.lastFiveGames.join('-')}\n\n`;

    // Add query-specific insights
    if (query.toLowerCase().includes('offense')) {
      content += `Offensive Analysis:\n- Averaging ${avgPointsFor} points per game\n- Recent offensive trend: ${this.analyzeOffensiveTrend(games)}\n\n`;
    }
    if (query.toLowerCase().includes('defense')) {
      content += `Defensive Analysis:\n- Allowing ${avgPointsAgainst} points per game\n- Defensive efficiency: ${this.analyzeDefensiveEfficiency(team)}\n\n`;
    }

    return content;
  }

  private generateGameInsightContent(
    game: Game, 
    homeTeam?: Team, 
    awayTeam?: Team, 
    playerStats: PlayerGameStats[] = [],
    query: string = ''
  ): string {
    let content = `Game Analysis: ${homeTeam?.name || 'Home'} vs ${awayTeam?.name || 'Away'}\n\n`;
    content += `Date: ${game.date.toLocaleDateString()}\n`;
    content += `Venue: ${game.venue}\n`;
    
    if (game.homeScore !== undefined && game.awayScore !== undefined) {
      content += `Final Score: ${game.homeScore}-${game.awayScore}\n`;
      content += `Total Points: ${game.homeScore + game.awayScore}\n`;
      content += `Margin of Victory: ${Math.abs(game.homeScore - game.awayScore)}\n\n`;
    }

    if (playerStats.length > 0) {
      content += `Key Performances:\n`;
      const topScorers = playerStats.sort((a, b) => b.points - a.points).slice(0, 3);
      topScorers.forEach((stat, index) => {
        content += `${index + 1}. Player ${stat.playerId}: ${stat.points} pts, ${stat.assists} ast, ${stat.rebounds} reb\n`;
      });
    }

    return content;
  }

  private async generatePlayerComparisons(query: string, players: Player[]): Promise<RetrievedDocument[]> {
    const results: RetrievedDocument[] = [];
    
    // Compare top players by different metrics
    if (query.toLowerCase().includes('scorer') || query.toLowerCase().includes('point')) {
      const topScorers = players.sort((a, b) => b.pointsPerGame - a.pointsPerGame).slice(0, 3);
      results.push({
        id: 'top_scorers_comparison',
        content: this.generateScorerComparison(topScorers),
        metadata: { type: 'player_comparison', metric: 'scoring' },
        relevanceScore: 0.8,
        type: 'comparison'
      });
    }

    if (query.toLowerCase().includes('assist') || query.toLowerCase().includes('playmaker')) {
      const topPlaymakers = players.sort((a, b) => b.assistsPerGame - a.assistsPerGame).slice(0, 3);
      results.push({
        id: 'top_playmakers_comparison',
        content: this.generatePlaymakerComparison(topPlaymakers),
        metadata: { type: 'player_comparison', metric: 'assists' },
        relevanceScore: 0.8,
        type: 'comparison'
      });
    }

    return results;
  }

  private generateScorerComparison(players: Player[]): string {
    let content = 'Top Scorers Comparison:\n\n';
    players.forEach((player, index) => {
      content += `${index + 1}. ${player.name}: ${player.pointsPerGame} PPG\n`;
      content += `   - FG%: ${(player.fieldGoalPercentage * 100).toFixed(1)}%\n`;
      content += `   - Efficiency: ${player.efficiency}\n\n`;
    });
    return content;
  }

  private generatePlaymakerComparison(players: Player[]): string {
    let content = 'Top Playmakers Comparison:\n\n';
    players.forEach((player, index) => {
      content += `${index + 1}. ${player.name}: ${player.assistsPerGame} APG\n`;
      content += `   - Points: ${player.pointsPerGame} PPG\n`;
      content += `   - Assist/Turnover Ratio: ${(player.assistsPerGame / Math.max(1, player.assistsPerGame * 0.3)).toFixed(1)}\n\n`;
    });
    return content;
  }

  private generateTacticalRecommendations(
    team: Team,
    players: Player[],
    recentGames: Game[],
    query: string
  ): RetrievedDocument[] {
    const recommendations: RetrievedDocument[] = [];

    // Analyze team needs based on performance
    const totalGames = team.wins + team.losses;
    const avgPointsFor = totalGames > 0 ? team.pointsFor / totalGames : 0;
    const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 0;

    if (avgPointsFor < 90) {
      recommendations.push({
        id: `offensive_recommendation_${team.id}`,
        content: this.generateOffensiveRecommendation(team, players),
        metadata: { type: 'tactical_recommendation', area: 'offense', teamId: team.id },
        relevanceScore: 0.7,
        type: 'coaching_insight'
      });
    }

    if (avgPointsAgainst > 100) {
      recommendations.push({
        id: `defensive_recommendation_${team.id}`,
        content: this.generateDefensiveRecommendation(team, players),
        metadata: { type: 'tactical_recommendation', area: 'defense', teamId: team.id },
        relevanceScore: 0.7,
        type: 'coaching_insight'
      });
    }

    return recommendations;
  }

  // Additional helper methods

  private getPlayerStrengths(player: Player): string {
    const strengths: string[] = [];
    
    if (player.pointsPerGame > 15) strengths.push('Consistent scorer');
    if (player.assistsPerGame > 5) strengths.push('Excellent playmaker');
    if (player.reboundsPerGame > 8) strengths.push('Strong rebounder');
    if (player.fieldGoalPercentage > 0.5) strengths.push('Efficient shooter');
    if (player.efficiency > 15) strengths.push('High overall efficiency');

    return strengths.length > 0 
      ? `Key Strengths:\n${strengths.map(s => `- ${s}`).join('\n')}\n\n`
      : 'Strengths: Developing player with room for growth\n\n';
  }

  private getPlayerWeaknesses(player: Player): string {
    const weaknesses: string[] = [];
    
    if (player.fieldGoalPercentage < 0.4) weaknesses.push('Shooting efficiency needs improvement');
    if (player.freeThrowPercentage < 0.7) weaknesses.push('Free throw shooting inconsistent');
    if (player.fatigueFactor > 0.7) weaknesses.push('Endurance concerns');
    if (player.efficiency < 10) weaknesses.push('Overall productivity could improve');

    return weaknesses.length > 0 
      ? `Areas for Improvement:\n${weaknesses.map(w => `- ${w}`).join('\n')}\n\n`
      : 'Weaknesses: Well-rounded player with no major weaknesses\n\n';
  }

  private getPlayerImprovementAreas(player: Player): string {
    let content = 'Development Focus:\n';
    
    if (player.fieldGoalPercentage < 0.45) {
      content += '- Work on shot selection and shooting mechanics\n';
    }
    if (player.assistsPerGame < 3 && player.position === 'PG') {
      content += '- Develop court vision and passing skills\n';
    }
    if (player.reboundsPerGame < 5 && ['PF', 'C'].includes(player.position)) {
      content += '- Focus on positioning and rebounding technique\n';
    }
    if (player.fatigueFactor > 0.6) {
      content += '- Improve conditioning and stamina\n';
    }
    
    content += '- Continue developing basketball IQ and game awareness\n';
    
    return content + '\n';
  }

  private analyzeOffensiveTrend(games: Game[]): string {
    if (games.length < 3) return 'Insufficient data';
    
    const recentGames = games.slice(-3);
    const avgPoints = recentGames.reduce((sum, game) => 
      sum + (game.homeScore || 0) + (game.awayScore || 0), 0) / recentGames.length;
    
    return avgPoints > 100 ? 'Improving' : avgPoints > 90 ? 'Stable' : 'Declining';
  }

  private analyzeDefensiveEfficiency(team: Team): string {
    const totalGames = team.wins + team.losses;
    const avgPointsAgainst = totalGames > 0 ? team.pointsAgainst / totalGames : 100;
    
    if (avgPointsAgainst < 85) return 'Excellent';
    if (avgPointsAgainst < 95) return 'Good';
    if (avgPointsAgainst < 105) return 'Average';
    return 'Needs Improvement';
  }

  private generateStrategyApplication(strategy: string, team: Team, players: Player[]): string {
    // Generate contextual strategy application based on team composition
    const guards = players.filter(p => ['PG', 'SG'].includes(p.position));
    const forwards = players.filter(p => ['SF', 'PF'].includes(p.position));
    const centers = players.filter(p => p.position === 'C');

    let application = '';

    if (strategy.includes('fast break')) {
      application = guards.length > 0 
        ? `Utilize ${guards[0]?.name || 'primary guard'} to push the pace in transition`
        : 'Focus on developing guard play for effective fast breaks';
    } else if (strategy.includes('pick and roll')) {
      application = guards.length > 0 && (forwards.length > 0 || centers.length > 0)
        ? `Run pick and roll with ${guards[0]?.name || 'point guard'} and ${forwards[0]?.name || centers[0]?.name || 'big man'}`
        : 'Develop guard-big man chemistry for effective pick and roll execution';
    } else {
      application = `This strategy can be adapted to ${team.name}'s current roster composition`;
    }

    return application;
  }

  private generateOffensiveRecommendation(team: Team, players: Player[]): string {
    let content = `Offensive Improvement Plan for ${team.name}:\n\n`;
    
    const topScorer = players.sort((a, b) => b.pointsPerGame - a.pointsPerGame)[0];
    const topPlaymaker = players.sort((a, b) => b.assistsPerGame - a.assistsPerGame)[0];

    content += `Key Focus Areas:\n`;
    content += `- Build offense around ${topScorer?.name || 'top scorer'} (${topScorer?.pointsPerGame || 0} PPG)\n`;
    content += `- Improve ball movement through ${topPlaymaker?.name || 'primary playmaker'}\n`;
    content += `- Work on shooting efficiency in practice\n`;
    content += `- Implement more structured offensive sets\n\n`;

    content += `Recommended Strategies:\n`;
    content += `- Motion offense to create better shot opportunities\n`;
    content += `- Pick and roll combinations\n`;
    content += `- Fast break opportunities off defensive rebounds\n`;

    return content;
  }

  private generateDefensiveRecommendation(team: Team, players: Player[]): string {
    let content = `Defensive Improvement Plan for ${team.name}:\n\n`;
    
    const bigMen = players.filter(p => ['PF', 'C'].includes(p.position));
    const perimeter = players.filter(p => ['PG', 'SG', 'SF'].includes(p.position));

    content += `Key Focus Areas:\n`;
    content += `- Improve interior defense with ${bigMen[0]?.name || 'post players'}\n`;
    content += `- Enhance perimeter defense and communication\n`;
    content += `- Work on defensive rebounding\n`;
    content += `- Practice help defense rotations\n\n`;

    content += `Recommended Strategies:\n`;
    content += `- Implement zone defense to protect the paint\n`;
    content += `- Full court pressure to create turnovers\n`;
    content += `- Emphasize team defensive communication\n`;

    return content;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}