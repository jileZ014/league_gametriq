/**
 * Basketball AI Analytics System
 * Main entry point for AI-powered basketball analytics
 */

// Models
export { GamePredictionModel } from './models/game-prediction.model';
export { PlayerPerformanceModel } from './models/player-performance.model';
export { LineupOptimizerModel } from './models/lineup-optimizer.model';
export { TournamentSeedingModel } from './models/tournament-seeding.model';

// Embeddings
export { StatEmbeddingsGenerator } from './embeddings/stat-embeddings';

// Retrieval
export { BasketballVectorStore } from './retrieval/vector-store';
export { BasketballSemanticSearch } from './retrieval/semantic-search';
export { BasketballContextBuilder } from './retrieval/context-builder';

// Analytics Services
export { GameAnalyticsService } from './analytics/game-analytics.service';
export { PlayerAnalyticsService } from './analytics/player-analytics.service';
export { TeamAnalyticsService } from './analytics/team-analytics.service';
export { TournamentAnalyticsService } from './analytics/tournament-analytics.service';

// Types
export * from './types';

// Main AI Analytics Engine
import { GamePredictionModel } from './models/game-prediction.model';
import { PlayerPerformanceModel } from './models/player-performance.model';
import { LineupOptimizerModel } from './models/lineup-optimizer.model';
import { TournamentSeedingModel } from './models/tournament-seeding.model';
import { StatEmbeddingsGenerator } from './embeddings/stat-embeddings';
import { BasketballVectorStore } from './retrieval/vector-store';
import { BasketballSemanticSearch } from './retrieval/semantic-search';
import { BasketballContextBuilder } from './retrieval/context-builder';
import { GameAnalyticsService } from './analytics/game-analytics.service';
import { PlayerAnalyticsService } from './analytics/player-analytics.service';
import { TeamAnalyticsService } from './analytics/team-analytics.service';
import { TournamentAnalyticsService } from './analytics/tournament-analytics.service';
import { AIConfig } from './types';

/**
 * Main Basketball AI Analytics Engine
 * Coordinates all AI services and provides unified interface
 */
export class BasketballAIEngine {
  private config: AIConfig;
  private isInitialized = false;

  // Models
  private gamePredictionModel: GamePredictionModel;
  private playerPerformanceModel: PlayerPerformanceModel;
  private lineupOptimizerModel: LineupOptimizerModel;
  private tournamentSeedingModel: TournamentSeedingModel;

  // Core Systems
  private embeddingsGenerator: StatEmbeddingsGenerator;
  private vectorStore: BasketballVectorStore;
  private semanticSearch: BasketballSemanticSearch;
  private contextBuilder: BasketballContextBuilder;

  // Services
  private gameAnalytics: GameAnalyticsService;
  private playerAnalytics: PlayerAnalyticsService;
  private teamAnalytics: TeamAnalyticsService;
  private tournamentAnalytics: TournamentAnalyticsService;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.initializeComponents();
  }

  /**
   * Initialize the AI engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Basketball AI Analytics Engine...');
      
      // Initialize models and services
      await this.initializeModels();
      await this.initializeServices();
      
      this.isInitialized = true;
      console.log('Basketball AI Analytics Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI engine:', error);
      throw error;
    }
  }

  /**
   * Get game analytics service
   */
  getGameAnalytics(): GameAnalyticsService {
    this.ensureInitialized();
    return this.gameAnalytics;
  }

  /**
   * Get player analytics service
   */
  getPlayerAnalytics(): PlayerAnalyticsService {
    this.ensureInitialized();
    return this.playerAnalytics;
  }

  /**
   * Get team analytics service
   */
  getTeamAnalytics(): TeamAnalyticsService {
    this.ensureInitialized();
    return this.teamAnalytics;
  }

  /**
   * Get tournament analytics service
   */
  getTournamentAnalytics(): TournamentAnalyticsService {
    this.ensureInitialized();
    return this.tournamentAnalytics;
  }

  /**
   * Get vector store for direct access
   */
  getVectorStore(): BasketballVectorStore {
    this.ensureInitialized();
    return this.vectorStore;
  }

  /**
   * Get semantic search for direct access
   */
  getSemanticSearch(): BasketballSemanticSearch {
    this.ensureInitialized();
    return this.semanticSearch;
  }

  /**
   * Get embeddings generator for direct access
   */
  getEmbeddingsGenerator(): StatEmbeddingsGenerator {
    this.ensureInitialized();
    return this.embeddingsGenerator;
  }

  /**
   * Health check for all AI components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    message: string;
  }> {
    const components: Record<string, boolean> = {};
    let healthyCount = 0;

    try {
      // Check models
      components.gamePrediction = this.gamePredictionModel.getModelInfo().initialized;
      components.playerPerformance = this.playerPerformanceModel.getModelInfo().initialized;
      components.lineupOptimizer = true; // Always available
      components.tournamentSeeding = true; // Always available

      // Check vector store
      const vectorStats = this.vectorStore.getStats();
      components.vectorStore = vectorStats.totalEmbeddings >= 0;

      // Check services
      components.gameAnalytics = this.gameAnalytics !== null;
      components.playerAnalytics = this.playerAnalytics !== null;
      components.teamAnalytics = this.teamAnalytics !== null;
      components.tournamentAnalytics = this.tournamentAnalytics !== null;

      healthyCount = Object.values(components).filter(Boolean).length;
      const totalComponents = Object.keys(components).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;

      if (healthyCount === totalComponents) {
        status = 'healthy';
        message = 'All AI components are operational';
      } else if (healthyCount >= totalComponents * 0.7) {
        status = 'degraded';
        message = `${healthyCount}/${totalComponents} components operational`;
      } else {
        status = 'unhealthy';
        message = `Only ${healthyCount}/${totalComponents} components operational`;
      }

      return { status, components, message };
    } catch (error) {
      return {
        status: 'unhealthy',
        components,
        message: `Health check failed: ${error}`
      };
    }
  }

  /**
   * Get AI engine statistics
   */
  getStats(): {
    vectorStore: any;
    modelsLoaded: boolean[];
    cacheStatus: any;
    uptime: number;
  } {
    this.ensureInitialized();

    return {
      vectorStore: this.vectorStore.getStats(),
      modelsLoaded: [
        this.gamePredictionModel.getModelInfo().initialized,
        this.playerPerformanceModel.getModelInfo().initialized,
        true, // lineup optimizer
        true  // tournament seeding
      ],
      cacheStatus: {
        // Cache statistics would be implemented here
        enabled: this.config.cache.strategy !== undefined
      },
      uptime: Date.now() - this.initializationTime
    };
  }

  private initializationTime = Date.now();

  private mergeWithDefaults(config: Partial<AIConfig>): AIConfig {
    return {
      models: {
        gamePrediction: {
          enabled: true,
          updateFrequency: 30,
          confidenceThreshold: 0.6,
          maxPredictionHorizon: 7,
          features: ['win_percentage', 'point_differential', 'recent_form']
        },
        playerPerformance: {
          enabled: true,
          updateFrequency: 15,
          confidenceThreshold: 0.7,
          maxPredictionHorizon: 3,
          features: ['season_averages', 'recent_performance', 'matchup_difficulty']
        },
        lineupOptimization: {
          enabled: true,
          updateFrequency: 60,
          confidenceThreshold: 0.8,
          maxPredictionHorizon: 1,
          features: ['player_synergy', 'position_fit', 'performance_metrics']
        },
        tournamentSeeding: {
          enabled: true,
          updateFrequency: 120,
          confidenceThreshold: 0.75,
          maxPredictionHorizon: 30,
          features: ['team_record', 'strength_of_schedule', 'recent_form']
        }
      },
      vectorDB: {
        dimensions: 128,
        similarityMetric: 'cosine',
        indexType: 'flat',
        batchSize: 100
      },
      cache: {
        ttl: 300,
        maxSize: 1000,
        strategy: 'lru'
      },
      performance: {
        maxConcurrentPredictions: 10,
        timeoutMs: 30000,
        retryAttempts: 3,
        backgroundProcessing: true
      },
      ...config
    };
  }

  private initializeComponents(): void {
    // Initialize models
    this.gamePredictionModel = new GamePredictionModel();
    this.playerPerformanceModel = new PlayerPerformanceModel();
    this.lineupOptimizerModel = new LineupOptimizerModel();
    this.tournamentSeedingModel = new TournamentSeedingModel();

    // Initialize core systems
    this.embeddingsGenerator = new StatEmbeddingsGenerator();
    this.vectorStore = new BasketballVectorStore(this.config.vectorDB);
    this.semanticSearch = new BasketballSemanticSearch(this.vectorStore, this.embeddingsGenerator);
    this.contextBuilder = new BasketballContextBuilder(this.semanticSearch);
  }

  private async initializeModels(): Promise<void> {
    // Models initialize themselves in their constructors
    console.log('AI models initialized');
  }

  private async initializeServices(): Promise<void> {
    // Initialize analytics services
    this.gameAnalytics = new GameAnalyticsService(
      this.gamePredictionModel,
      this.vectorStore,
      this.contextBuilder,
      this.embeddingsGenerator
    );

    this.playerAnalytics = new PlayerAnalyticsService(this.playerPerformanceModel);
    this.teamAnalytics = new TeamAnalyticsService(this.lineupOptimizerModel);
    this.tournamentAnalytics = new TournamentAnalyticsService(this.tournamentSeedingModel);

    console.log('AI services initialized');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AI engine not initialized. Call initialize() first.');
    }
  }
}

// Default instance for easy usage
let defaultEngine: BasketballAIEngine | null = null;

/**
 * Get the default AI engine instance
 */
export function getAIEngine(): BasketballAIEngine {
  if (!defaultEngine) {
    defaultEngine = new BasketballAIEngine();
  }
  return defaultEngine;
}

/**
 * Initialize the default AI engine
 */
export async function initializeAI(): Promise<void> {
  const engine = getAIEngine();
  await engine.initialize();
}

/**
 * Utility function for prediction confidence levels
 */
export function getConfidenceLevel(confidence: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (confidence < 0.5) return 'Low';
  if (confidence < 0.7) return 'Medium';
  if (confidence < 0.85) return 'High';
  return 'Very High';
}

/**
 * Utility function for formatting prediction factors
 */
export function formatPredictionFactors(factors: string[]): string {
  return factors.map(factor => 
    factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  ).join(', ');
}