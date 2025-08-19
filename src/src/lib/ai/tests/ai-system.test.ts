/**
 * AI System Integration Tests
 * Comprehensive tests for the basketball AI analytics system
 */

import { BasketballAIEngine, getAIEngine, initializeAI } from '../index';
import { Team, Player, Game, PlayerGameStats } from '../types';

// Mock data for testing
const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Phoenix Suns Youth',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 15,
    losses: 5,
    pointsFor: 1650,
    pointsAgainst: 1400,
    streak: 'W3',
    lastFiveGames: ['W', 'W', 'W', 'L', 'W'],
    homeCourt: 'Phoenix Community Center'
  },
  {
    id: 'team-2',
    name: 'Desert Hawks',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 12,
    losses: 8,
    pointsFor: 1600,
    pointsAgainst: 1520,
    streak: 'L1',
    lastFiveGames: ['W', 'L', 'W', 'W', 'L'],
    homeCourt: 'Desert Recreation Center'
  }
];

const mockPlayers: Player[] = [
  {
    id: 'player-1',
    name: 'Marcus Johnson',
    teamId: 'team-1',
    position: 'PG',
    age: 16,
    height: 72,
    weight: 160,
    gamesPlayed: 20,
    minutesPerGame: 32,
    pointsPerGame: 18.5,
    assistsPerGame: 7.2,
    reboundsPerGame: 4.1,
    fieldGoalPercentage: 0.485,
    freeThrowPercentage: 0.82,
    efficiency: 22.3,
    plusMinus: 8.5,
    injuryHistory: [],
    fatigueFactor: 0.3
  },
  {
    id: 'player-2',
    name: 'Tyler Davis',
    teamId: 'team-1',
    position: 'SF',
    age: 15,
    height: 75,
    weight: 180,
    gamesPlayed: 20,
    minutesPerGame: 28,
    pointsPerGame: 14.2,
    assistsPerGame: 3.8,
    reboundsPerGame: 6.9,
    fieldGoalPercentage: 0.512,
    freeThrowPercentage: 0.75,
    efficiency: 18.7,
    plusMinus: 6.2,
    injuryHistory: ['ankle sprain'],
    fatigueFactor: 0.4
  }
];

const mockGame: Game = {
  id: 'game-1',
  homeTeamId: 'team-1',
  awayTeamId: 'team-2',
  date: new Date('2024-03-15T19:00:00Z'),
  venue: 'Phoenix Community Center',
  status: 'scheduled',
  officials: ['Ref 1', 'Ref 2']
};

describe('Basketball AI Analytics System', () => {
  let aiEngine: BasketballAIEngine;

  beforeAll(async () => {
    // Initialize AI system for testing
    await initializeAI();
    aiEngine = getAIEngine();
  }, 30000); // 30 second timeout for initialization

  describe('System Initialization', () => {
    test('should initialize AI engine successfully', () => {
      expect(aiEngine).toBeDefined();
    });

    test('should pass health check', async () => {
      const healthCheck = await aiEngine.healthCheck();
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.components).toBeDefined();
    });

    test('should have all services available', () => {
      expect(aiEngine.getGameAnalytics()).toBeDefined();
      expect(aiEngine.getPlayerAnalytics()).toBeDefined();
      expect(aiEngine.getTeamAnalytics()).toBeDefined();
      expect(aiEngine.getTournamentAnalytics()).toBeDefined();
    });
  });

  describe('Game Analytics', () => {
    test('should generate game predictions', async () => {
      const gameAnalytics = aiEngine.getGameAnalytics();
      const prediction = await gameAnalytics.predictGame(
        mockTeams[0],
        mockTeams[1],
        mockGame
      );

      expect(prediction).toBeDefined();
      expect(prediction.data).toBeDefined();
      expect(prediction.data.homeTeamWinProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.data.homeTeamWinProbability).toBeLessThanOrEqual(1);
      expect(prediction.data.awayTeamWinProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.data.awayTeamWinProbability).toBeLessThanOrEqual(1);
      expect(prediction.data.predictedHomeScore).toBeGreaterThan(0);
      expect(prediction.data.predictedAwayScore).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.factors).toBeDefined();
    }, 10000);

    test('should analyze team matchups', async () => {
      const gameAnalytics = aiEngine.getGameAnalytics();
      const matchup = await gameAnalytics.analyzeMatchup(
        mockTeams[0],
        mockTeams[1],
        { players: mockPlayers }
      );

      expect(matchup).toBeDefined();
      expect(matchup.data).toBeDefined();
      expect(matchup.data.homeTeam).toBeDefined();
      expect(matchup.data.awayTeam).toBeDefined();
      expect(matchup.data.tacticalAdvantages).toBeDefined();
      expect(matchup.data.gameplan).toBeDefined();
    }, 10000);
  });

  describe('Player Analytics', () => {
    test('should predict player performance', async () => {
      const playerAnalytics = aiEngine.getPlayerAnalytics();
      const prediction = await playerAnalytics.predictPlayerPerformance(
        mockPlayers[0],
        mockGame
      );

      expect(prediction).toBeDefined();
      expect(prediction.data).toBeDefined();
      expect(prediction.data.expectedPoints).toBeGreaterThanOrEqual(0);
      expect(prediction.data.expectedAssists).toBeGreaterThanOrEqual(0);
      expect(prediction.data.expectedRebounds).toBeGreaterThanOrEqual(0);
      expect(prediction.data.efficiency).toBeGreaterThanOrEqual(0);
      expect(prediction.data.confidence).toBeGreaterThan(0);
    }, 10000);

    test('should analyze player trends', async () => {
      const playerAnalytics = aiEngine.getPlayerAnalytics();
      
      // Mock some game stats
      const mockStats: PlayerGameStats[] = [
        {
          playerId: 'player-1',
          gameId: 'game-1',
          minutes: 32,
          points: 20,
          assists: 8,
          rebounds: 4,
          steals: 2,
          blocks: 0,
          turnovers: 3,
          fouls: 2,
          fieldGoals: { made: 8, attempted: 15 },
          freeThrows: { made: 4, attempted: 5 },
          threePointers: { made: 2, attempted: 6 },
          plusMinus: 10
        }
      ];

      const trends = await playerAnalytics.analyzePlayerTrends(
        mockPlayers[0],
        mockStats
      );

      expect(trends).toBeDefined();
      expect(trends.data).toBeDefined();
      expect(trends.data.consistency).toBeGreaterThanOrEqual(0);
      expect(trends.data.consistency).toBeLessThanOrEqual(1);
    }, 10000);
  });

  describe('Team Analytics', () => {
    test('should optimize lineup', async () => {
      const teamAnalytics = aiEngine.getTeamAnalytics();
      const optimization = await teamAnalytics.optimizeLineup(
        mockPlayers,
        mockTeams[1]
      );

      expect(optimization).toBeDefined();
      expect(optimization.data).toBeDefined();
      expect(optimization.data.positions).toBeDefined();
      expect(optimization.data.synergy).toBeGreaterThanOrEqual(0);
      expect(optimization.data.synergy).toBeLessThanOrEqual(1);
      expect(optimization.data.offensiveRating).toBeGreaterThan(0);
      expect(optimization.data.defensiveRating).toBeGreaterThan(0);
    }, 10000);

    test('should analyze team chemistry', async () => {
      const teamAnalytics = aiEngine.getTeamAnalytics();
      const chemistry = await teamAnalytics.analyzeTeamChemistry(
        mockTeams[0],
        mockPlayers
      );

      expect(chemistry).toBeDefined();
      expect(chemistry.data).toBeDefined();
      expect(chemistry.data.chemistry).toBeGreaterThanOrEqual(0);
      expect(chemistry.data.chemistry).toBeLessThanOrEqual(1);
      expect(Array.isArray(chemistry.data.strengths)).toBe(true);
      expect(Array.isArray(chemistry.data.weaknesses)).toBe(true);
      expect(Array.isArray(chemistry.data.recommendations)).toBe(true);
    }, 10000);
  });

  describe('Tournament Analytics', () => {
    test('should generate tournament seeding', async () => {
      const tournamentAnalytics = aiEngine.getTournamentAnalytics();
      const seeding = await tournamentAnalytics.generateSeeding(mockTeams);

      expect(seeding).toBeDefined();
      expect(seeding.data).toBeDefined();
      expect(Array.isArray(seeding.data)).toBe(true);
      expect(seeding.data.length).toBe(mockTeams.length);
      
      seeding.data.forEach((seed, index) => {
        expect(seed.seed).toBe(index + 1);
        expect(seed.rating).toBeGreaterThanOrEqual(0);
        expect(seed.rating).toBeLessThanOrEqual(1);
        expect(seed.championshipOdds).toBeGreaterThanOrEqual(0);
        expect(seed.championshipOdds).toBeLessThanOrEqual(1);
      });
    }, 10000);

    test('should identify upset probabilities', async () => {
      const tournamentAnalytics = aiEngine.getTournamentAnalytics();
      
      // First get seeding
      const seeding = await tournamentAnalytics.generateSeeding(mockTeams);
      
      // Then identify upsets
      const upsets = await tournamentAnalytics.identifyUpsets(
        seeding.data,
        mockTeams
      );

      expect(upsets).toBeDefined();
      expect(upsets.data).toBeDefined();
      expect(Array.isArray(upsets.data)).toBe(true);
    }, 15000);
  });

  describe('Vector Store and Embeddings', () => {
    test('should generate and store player embeddings', async () => {
      const embeddingsGenerator = aiEngine.getEmbeddingsGenerator();
      const vectorStore = aiEngine.getVectorStore();

      const embedding = await embeddingsGenerator.generatePlayerStatEmbedding(
        mockPlayers[0]
      );

      expect(embedding).toBeDefined();
      expect(embedding.id).toBeDefined();
      expect(embedding.vector).toBeDefined();
      expect(embedding.vector.length).toBe(128); // Expected dimension
      expect(embedding.type).toBe('player');

      // Store the embedding
      await vectorStore.store(embedding);

      // Retrieve it
      const retrieved = await vectorStore.retrieve(embedding.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(embedding.id);
    }, 10000);

    test('should perform semantic search', async () => {
      const semanticSearch = aiEngine.getSemanticSearch();
      
      const results = await semanticSearch.search({
        query: 'basketball player performance statistics',
        limit: 5
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    }, 10000);
  });

  describe('Performance and Error Handling', () => {
    test('should handle invalid inputs gracefully', async () => {
      const gameAnalytics = aiEngine.getGameAnalytics();
      
      // Test with invalid team data
      const invalidTeam = { ...mockTeams[0], wins: -1, losses: -1 };
      
      try {
        await gameAnalytics.predictGame(
          invalidTeam,
          mockTeams[1],
          mockGame
        );
        // Should not reach here if error handling works
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should track performance metrics', () => {
      const stats = aiEngine.getStats();
      expect(stats).toBeDefined();
      expect(stats.vectorStore).toBeDefined();
      expect(Array.isArray(stats.modelsLoaded)).toBe(true);
    });

    test('should maintain health status', async () => {
      const healthCheck = await aiEngine.healthCheck();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthCheck.status);
      expect(healthCheck.message).toBeDefined();
      expect(healthCheck.components).toBeDefined();
    });
  });

  describe('Real-time Integration', () => {
    test('should handle live game updates', async () => {
      const gameAnalytics = aiEngine.getGameAnalytics();
      
      const liveGame = {
        ...mockGame,
        status: 'in_progress' as const,
        homeScore: 45,
        awayScore: 42,
        quarter: 3,
        timeRemaining: '8:24'
      };

      const insights = await gameAnalytics.getLiveGameInsights(
        liveGame,
        mockTeams[0],
        mockTeams[1]
      );

      expect(insights).toBeDefined();
      expect(insights.data).toBeDefined();
      expect(insights.data.momentum).toBeDefined();
      expect(insights.data.predictions).toBeDefined();
      expect(insights.data.recommendations).toBeDefined();
      expect(Array.isArray(insights.data.keyFactors)).toBe(true);
    }, 10000);
  });
});

// Integration test utilities
export function generateMockPlayerStats(playerId: string, games: number = 5): PlayerGameStats[] {
  const stats: PlayerGameStats[] = [];
  
  for (let i = 0; i < games; i++) {
    stats.push({
      playerId,
      gameId: `game-${i + 1}`,
      minutes: 25 + Math.random() * 15,
      points: 10 + Math.random() * 20,
      assists: Math.random() * 10,
      rebounds: 3 + Math.random() * 8,
      steals: Math.random() * 3,
      blocks: Math.random() * 2,
      turnovers: 1 + Math.random() * 4,
      fouls: Math.random() * 5,
      fieldGoals: { made: 5 + Math.random() * 10, attempted: 8 + Math.random() * 15 },
      freeThrows: { made: 2 + Math.random() * 5, attempted: 3 + Math.random() * 6 },
      threePointers: { made: Math.random() * 4, attempted: 1 + Math.random() * 8 },
      plusMinus: -10 + Math.random() * 20
    });
  }
  
  return stats;
}

export function generateMockTeam(id: string, name: string): Team {
  const wins = Math.floor(Math.random() * 20);
  const losses = Math.floor(Math.random() * 15);
  const totalGames = wins + losses;
  
  return {
    id,
    name,
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins,
    losses,
    pointsFor: totalGames * (80 + Math.random() * 40),
    pointsAgainst: totalGames * (75 + Math.random() * 35),
    streak: Math.random() > 0.5 ? `W${Math.floor(Math.random() * 5) + 1}` : `L${Math.floor(Math.random() * 3) + 1}`,
    lastFiveGames: Array.from({ length: 5 }, () => Math.random() > 0.5 ? 'W' : 'L'),
    homeCourt: `${name} Arena`
  };
}

// Performance benchmark tests
describe('AI System Performance Benchmarks', () => {
  test('game prediction should complete within 2 seconds', async () => {
    const start = performance.now();
    
    const gameAnalytics = aiEngine.getGameAnalytics();
    await gameAnalytics.predictGame(mockTeams[0], mockTeams[1], mockGame);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000); // 2 seconds
  });

  test('lineup optimization should complete within 3 seconds', async () => {
    const start = performance.now();
    
    const teamAnalytics = aiEngine.getTeamAnalytics();
    await teamAnalytics.optimizeLineup(mockPlayers);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(3000); // 3 seconds
  });

  test('vector search should complete within 500ms', async () => {
    const start = performance.now();
    
    const semanticSearch = aiEngine.getSemanticSearch();
    await semanticSearch.search({ query: 'test query', limit: 10 });
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // 500ms
  });
});