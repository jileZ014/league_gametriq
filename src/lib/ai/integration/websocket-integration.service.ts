/**
 * WebSocket Integration Service
 * Handles real-time AI analytics integration with game events
 */

import { getAIEngine } from '../index';
import { Team, Game, Player, PlayerGameStats } from '../types';

export class WebSocketAIIntegration {
  private socket: any = null;
  private isConnected = false;
  private eventHandlers = new Map<string, Function>();

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Initialize WebSocket connection for AI integration
   */
  initialize(socket: any): void {
    this.socket = socket;
    this.isConnected = true;
    this.attachEventListeners();
    console.log('AI WebSocket integration initialized');
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.socket) {
      this.detachEventListeners();
    }
    this.socket = null;
    this.isConnected = false;
    console.log('AI WebSocket integration disconnected');
  }

  private setupEventHandlers(): void {
    // Game score updates trigger live insights
    this.eventHandlers.set('game:score_updated', this.handleScoreUpdate.bind(this));
    
    // Player stats updates trigger embedding updates
    this.eventHandlers.set('game:player_stats_updated', this.handlePlayerStatsUpdate.bind(this));
    
    // Lineup changes trigger optimization suggestions
    this.eventHandlers.set('game:lineup_changed', this.handleLineupChange.bind(this));
    
    // Game completion triggers performance analysis
    this.eventHandlers.set('game:completed', this.handleGameCompleted.bind(this));
    
    // Tournament updates trigger bracket predictions
    this.eventHandlers.set('tournament:bracket_updated', this.handleTournamentUpdate.bind(this));
    
    // Request for AI predictions
    this.eventHandlers.set('ai:request_prediction', this.handlePredictionRequest.bind(this));
    
    // Request for lineup optimization
    this.eventHandlers.set('ai:request_lineup_optimization', this.handleLineupOptimizationRequest.bind(this));
  }

  private attachEventListeners(): void {
    if (!this.socket) return;

    for (const [event, handler] of this.eventHandlers) {
      this.socket.on(event, handler);
    }
  }

  private detachEventListeners(): void {
    if (!this.socket) return;

    for (const [event, handler] of this.eventHandlers) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Handle live game score updates
   */
  private async handleScoreUpdate(data: {
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    currentStats?: PlayerGameStats[];
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const gameAnalytics = aiEngine.getGameAnalytics();

      // Generate live game insights
      const insights = await gameAnalytics.getLiveGameInsights(
        data.game,
        data.homeTeam,
        data.awayTeam,
        data.currentStats || []
      );

      // Emit insights to connected clients
      this.emitToClients('ai:live_insights', {
        gameId: data.game.id,
        insights: insights.data,
        confidence: insights.confidence,
        factors: insights.factors,
        timestamp: new Date(),
        type: 'live_insights'
      });

      console.log(`Generated live insights for game ${data.game.id}`);
    } catch (error) {
      console.error('Error handling score update:', error);
      this.emitError('live_insights_failed', error);
    }
  }

  /**
   * Handle player statistics updates
   */
  private async handlePlayerStatsUpdate(data: {
    player: Player;
    stats: PlayerGameStats[];
    game: Game;
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const embeddingsGenerator = aiEngine.getEmbeddingsGenerator();
      const vectorStore = aiEngine.getVectorStore();

      // Update player embeddings with new statistics
      const embedding = await embeddingsGenerator.generatePlayerStatEmbedding(
        data.player,
        data.stats
      );
      
      await vectorStore.store(embedding);

      // Generate updated player insights
      const playerAnalytics = aiEngine.getPlayerAnalytics();
      const insights = await playerAnalytics.analyzePlayerTrends(data.player, data.stats);

      this.emitToClients('ai:player_insights_updated', {
        playerId: data.player.id,
        insights: insights.data,
        confidence: insights.confidence,
        timestamp: new Date(),
        type: 'player_insights'
      });

      console.log(`Updated embeddings and insights for player ${data.player.id}`);
    } catch (error) {
      console.error('Error handling player stats update:', error);
      this.emitError('player_insights_failed', error);
    }
  }

  /**
   * Handle lineup changes
   */
  private async handleLineupChange(data: {
    team: Team;
    players: Player[];
    opponent?: Team;
    gameId?: string;
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const teamAnalytics = aiEngine.getTeamAnalytics();

      // Generate lineup optimization suggestions
      const optimization = await teamAnalytics.optimizeLineup(data.players, data.opponent);

      this.emitToClients('ai:lineup_suggestions', {
        teamId: data.team.id,
        gameId: data.gameId,
        suggestions: optimization.data,
        confidence: optimization.confidence,
        timestamp: new Date(),
        type: 'lineup_optimization'
      });

      console.log(`Generated lineup suggestions for team ${data.team.id}`);
    } catch (error) {
      console.error('Error handling lineup change:', error);
      this.emitError('lineup_optimization_failed', error);
    }
  }

  /**
   * Handle game completion
   */
  private async handleGameCompleted(data: {
    game: Game;
    homeTeam: Team;
    awayTeam: Team;
    playerStats: PlayerGameStats[];
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const gameAnalytics = aiEngine.getGameAnalytics();

      // Generate post-game performance analysis
      const analysis = await gameAnalytics.analyzeGamePerformance(
        data.game,
        data.homeTeam,
        data.awayTeam,
        data.playerStats
      );

      // Update game embeddings
      const embeddingsGenerator = aiEngine.getEmbeddingsGenerator();
      const vectorStore = aiEngine.getVectorStore();
      
      const gameEmbedding = await embeddingsGenerator.generateGameStatEmbedding(
        data.game,
        data.homeTeam,
        data.awayTeam,
        data.playerStats
      );
      
      await vectorStore.store(gameEmbedding);

      this.emitToClients('ai:game_analysis_completed', {
        gameId: data.game.id,
        analysis: analysis.data,
        confidence: analysis.confidence,
        timestamp: new Date(),
        type: 'game_analysis'
      });

      console.log(`Completed post-game analysis for game ${data.game.id}`);
    } catch (error) {
      console.error('Error handling game completion:', error);
      this.emitError('game_analysis_failed', error);
    }
  }

  /**
   * Handle tournament bracket updates
   */
  private async handleTournamentUpdate(data: {
    teams: Team[];
    tournamentId: string;
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const tournamentAnalytics = aiEngine.getTournamentAnalytics();

      // Generate updated tournament predictions
      const [seeding, predictions, upsets] = await Promise.all([
        tournamentAnalytics.generateSeeding(data.teams),
        tournamentAnalytics.generateChampionshipProjections([], data.teams),
        tournamentAnalytics.identifyUpsets([], data.teams)
      ]);

      this.emitToClients('ai:tournament_predictions_updated', {
        tournamentId: data.tournamentId,
        seeding: seeding.data,
        predictions: predictions.data,
        upsets: upsets.data,
        timestamp: new Date(),
        type: 'tournament_analysis'
      });

      console.log(`Updated tournament predictions for tournament ${data.tournamentId}`);
    } catch (error) {
      console.error('Error handling tournament update:', error);
      this.emitError('tournament_analysis_failed', error);
    }
  }

  /**
   * Handle direct prediction requests
   */
  private async handlePredictionRequest(data: {
    homeTeam: Team;
    awayTeam: Team;
    game: Game;
    requestId: string;
    userId?: string;
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const gameAnalytics = aiEngine.getGameAnalytics();

      const prediction = await gameAnalytics.predictGame(
        data.homeTeam,
        data.awayTeam,
        data.game
      );

      this.emitToUser(data.userId, 'ai:prediction_response', {
        requestId: data.requestId,
        prediction: prediction.data,
        confidence: prediction.confidence,
        factors: prediction.factors,
        timestamp: new Date(),
        type: 'game_prediction'
      });

      console.log(`Generated prediction for request ${data.requestId}`);
    } catch (error) {
      console.error('Error handling prediction request:', error);
      this.emitToUser(data.userId, 'ai:prediction_error', {
        requestId: data.requestId,
        error: error instanceof Error ? error.message : 'Prediction failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle lineup optimization requests
   */
  private async handleLineupOptimizationRequest(data: {
    team: Team;
    players: Player[];
    opponent?: Team;
    requestId: string;
    userId?: string;
  }): Promise<void> {
    try {
      const aiEngine = getAIEngine();
      const teamAnalytics = aiEngine.getTeamAnalytics();

      const optimization = await teamAnalytics.optimizeLineup(data.players, data.opponent);

      this.emitToUser(data.userId, 'ai:lineup_optimization_response', {
        requestId: data.requestId,
        optimization: optimization.data,
        confidence: optimization.confidence,
        factors: optimization.factors,
        timestamp: new Date(),
        type: 'lineup_optimization'
      });

      console.log(`Generated lineup optimization for request ${data.requestId}`);
    } catch (error) {
      console.error('Error handling lineup optimization request:', error);
      this.emitToUser(data.userId, 'ai:lineup_optimization_error', {
        requestId: data.requestId,
        error: error instanceof Error ? error.message : 'Optimization failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit data to all connected clients
   */
  private emitToClients(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Emit data to specific user
   */
  private emitToUser(userId: string | undefined, event: string, data: any): void {
    if (this.socket && this.isConnected && userId) {
      this.socket.to(userId).emit(event, data);
    } else if (this.socket && this.isConnected) {
      // Fallback to broadcast if no specific user
      this.socket.emit(event, data);
    }
  }

  /**
   * Emit error to clients
   */
  private emitError(errorType: string, error: any): void {
    this.emitToClients('ai:error', {
      type: errorType,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    });
  }

  /**
   * Get integration status
   */
  getStatus(): {
    connected: boolean;
    handlersRegistered: number;
    lastActivity?: Date;
  } {
    return {
      connected: this.isConnected,
      handlersRegistered: this.eventHandlers.size,
      lastActivity: new Date()
    };
  }

  /**
   * Manually trigger AI analysis for specific game
   */
  async triggerGameAnalysis(gameId: string, gameData: any): Promise<void> {
    if (gameData.game && gameData.homeTeam && gameData.awayTeam) {
      await this.handleScoreUpdate(gameData);
    }
  }

  /**
   * Manually trigger lineup optimization
   */
  async triggerLineupOptimization(teamData: any): Promise<void> {
    if (teamData.team && teamData.players) {
      await this.handleLineupChange(teamData);
    }
  }
}

// Singleton instance
let webSocketAIIntegration: WebSocketAIIntegration | null = null;

export function getWebSocketAIIntegration(): WebSocketAIIntegration {
  if (!webSocketAIIntegration) {
    webSocketAIIntegration = new WebSocketAIIntegration();
  }
  return webSocketAIIntegration;
}