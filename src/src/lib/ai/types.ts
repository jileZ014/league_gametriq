/**
 * AI Analytics System Types
 * Comprehensive type definitions for basketball league AI analytics
 */

// Core Basketball Domain Types
export interface Team {
  id: string;
  name: string;
  league: string;
  division: string;
  ageGroup: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  lastFiveGames: string[];
  homeCourt?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: string;
  age: number;
  height: number;
  weight: number;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  assistsPerGame: number;
  reboundsPerGame: number;
  fieldGoalPercentage: number;
  freeThrowPercentage: number;
  efficiency: number;
  plusMinus: number;
  injuryHistory: string[];
  fatigueFactor: number;
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: Date;
  venue: string;
  homeScore?: number;
  awayScore?: number;
  quarter?: number;
  timeRemaining?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  weather?: string;
  attendance?: number;
  officials: string[];
  playerStats?: PlayerGameStats[];
}

export interface PlayerGameStats {
  playerId: string;
  gameId: string;
  minutes: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fieldGoals: { made: number; attempted: number };
  freeThrows: { made: number; attempted: number };
  threePointers: { made: number; attempted: number };
  plusMinus: number;
}

// AI Model Types
export interface GamePrediction {
  gameId: string;
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  confidence: number;
  factors: PredictionFactor[];
  lastUpdated: Date;
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface PlayerPerformancePrediction {
  playerId: string;
  gameId: string;
  expectedPoints: number;
  expectedAssists: number;
  expectedRebounds: number;
  efficiency: number;
  injuryRisk: number;
  fatigueLevel: number;
  confidence: number;
  trends: PerformanceTrend[];
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  magnitude: number;
  confidence: number;
}

export interface LineupOptimization {
  teamId: string;
  positions: {
    pointGuard: string;
    shootingGuard: string;
    smallForward: string;
    powerForward: string;
    center: string;
  };
  synergy: number;
  offensiveRating: number;
  defensiveRating: number;
  expectedPlusMinusPerGame: number;
  alternatives: LineupOptimization[];
}

export interface TournamentSeeding {
  teamId: string;
  seed: number;
  rating: number;
  projectedWins: number;
  strengthOfSchedule: number;
  upsetProbability: number;
  championshipOdds: number;
}

// Vector Database Types
export interface Embedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  type: 'team' | 'player' | 'game' | 'stat_pattern';
  created: Date;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  distance: number;
}

export interface SemanticSearchQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  threshold?: number;
  type?: 'team' | 'player' | 'game' | 'stat_pattern';
}

// RAG System Types
export interface RAGContext {
  query: string;
  retrievedDocs: RetrievedDocument[];
  teamContext?: Team[];
  playerContext?: Player[];
  gameContext?: Game[];
  historicalStats?: any[];
}

export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  type: string;
}

export interface BasketballKnowledge {
  rules: string[];
  statistics: string[];
  strategies: string[];
  positions: string[];
  terminology: Record<string, string>;
}

// Analytics Service Types
export interface AnalyticsResult<T = any> {
  data: T;
  confidence: number;
  factors: string[];
  cached: boolean;
  generatedAt: Date;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastEvaluated: Date;
  sampleSize: number;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  expiry: Date;
  hits: number;
}

// Configuration Types
export interface AIConfig {
  models: {
    gamePrediction: ModelConfig;
    playerPerformance: ModelConfig;
    lineupOptimization: ModelConfig;
    tournamentSeeding: ModelConfig;
  };
  vectorDB: VectorDBConfig;
  cache: CacheConfig;
  performance: PerformanceConfig;
}

export interface ModelConfig {
  enabled: boolean;
  updateFrequency: number; // minutes
  confidenceThreshold: number;
  maxPredictionHorizon: number; // days
  features: string[];
}

export interface VectorDBConfig {
  dimensions: number;
  similarityMetric: 'cosine' | 'euclidean' | 'dot_product';
  indexType: 'hnsw' | 'ivf' | 'flat';
  batchSize: number;
}

export interface CacheConfig {
  ttl: number; // seconds
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl';
}

export interface PerformanceConfig {
  maxConcurrentPredictions: number;
  timeoutMs: number;
  retryAttempts: number;
  backgroundProcessing: boolean;
}

// Error Types
export interface AIError extends Error {
  code: string;
  context?: Record<string, any>;
  retryable: boolean;
}

// Event Types for Real-time Updates
export interface AIAnalyticsEvent {
  type: 'prediction_updated' | 'model_retrained' | 'lineup_optimized' | 'tournament_seeded';
  payload: any;
  timestamp: Date;
  userId?: string;
  teamId?: string;
}

// Basketball Specific Analytics
export interface TeamAnalytics {
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  paceOfPlay: number;
  reboundRate: number;
  turnoverRate: number;
  freeThrowRate: number;
  threePointRate: number;
  strengths: string[];
  weaknesses: string[];
  optimalGameplan: string[];
}

export interface MatchupAnalysis {
  homeTeam: TeamAnalytics;
  awayTeam: TeamAnalytics;
  keyMatchups: PlayerMatchup[];
  tacticalAdvantages: string[];
  gameplan: string[];
  injuryImpact: InjuryImpact[];
}

export interface PlayerMatchup {
  homePlayer: Player;
  awayPlayer: Player;
  advantage: 'home' | 'away' | 'neutral';
  impact: number;
  reasoning: string;
}

export interface InjuryImpact {
  playerId: string;
  impact: 'high' | 'medium' | 'low';
  replacement: string;
  teamImpact: number;
}

// Tournament Analytics
export interface TournamentAnalytics {
  bracket: TournamentBracket;
  upsetProbabilities: UpsetProbability[];
  championshipProjections: ChampionshipProjection[];
  optimalSeeding: OptimalSeeding[];
}

export interface TournamentBracket {
  regions: TournamentRegion[];
  finalFour: Team[];
  championship: Team[];
  winner: Team | null;
}

export interface TournamentRegion {
  name: string;
  teams: Team[];
  matchups: TournamentMatchup[];
}

export interface TournamentMatchup {
  id: string;
  round: number;
  team1: Team;
  team2: Team;
  winProbability1: number;
  winProbability2: number;
  upset: boolean;
  advance: Team | null;
}

export interface UpsetProbability {
  matchup: TournamentMatchup;
  probability: number;
  factors: string[];
}

export interface ChampionshipProjection {
  team: Team;
  probability: number;
  path: Team[];
  keyFactors: string[];
}

export interface OptimalSeeding {
  current: TournamentSeeding[];
  optimal: TournamentSeeding[];
  improvements: SeedingImprovement[];
}

export interface SeedingImprovement {
  team: Team;
  currentSeed: number;
  optimalSeed: number;
  reasoning: string;
  impact: number;
}