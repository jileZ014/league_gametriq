/**
 * AI Analytics Hook
 * React hook for integrating AI analytics with the application
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAIEngine, initializeAI } from '@/lib/ai';
import { useWebSocket } from './useWebSocket';

interface AIAnalyticsState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export function useAIAnalytics() {
  const [state, setState] = useState<AIAnalyticsState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    healthStatus: 'unknown'
  });

  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    initializeAISystem();
  }, []);

  useEffect(() => {
    if (isConnected && socket && state.isInitialized) {
      setupWebSocketIntegration();
    }
  }, [isConnected, socket, state.isInitialized]);

  const initializeAISystem = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await initializeAI();
      
      const aiEngine = getAIEngine();
      const healthCheck = await aiEngine.healthCheck();
      
      setState({
        isInitialized: true,
        isLoading: false,
        error: null,
        healthStatus: healthCheck.status
      });
      
      console.log('AI Analytics initialized:', healthCheck.message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI initialization failed';
      setState({
        isInitialized: false,
        isLoading: false,
        error: errorMessage,
        healthStatus: 'unhealthy'
      });
      console.error('AI Analytics initialization failed:', error);
    }
  };

  const setupWebSocketIntegration = useCallback(() => {
    if (!socket) return;

    // Listen for real-time game updates to trigger AI predictions
    socket.on('game:score_updated', async (data: any) => {
      try {
        const aiEngine = getAIEngine();
        const gameAnalytics = aiEngine.getGameAnalytics();
        
        // Trigger live game insights
        if (data.game && data.homeTeam && data.awayTeam) {
          const insights = await gameAnalytics.getLiveGameInsights(
            data.game,
            data.homeTeam,
            data.awayTeam,
            data.playerStats || []
          );
          
          // Emit AI insights back to clients
          socket.emit('ai:live_insights', {
            gameId: data.game.id,
            insights: insights.data,
            confidence: insights.confidence,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error generating live AI insights:', error);
      }
    });

    // Listen for player stats updates to update embeddings
    socket.on('game:player_stats_updated', async (data: any) => {
      try {
        const aiEngine = getAIEngine();
        const embeddingsGenerator = aiEngine.getEmbeddingsGenerator();
        const vectorStore = aiEngine.getVectorStore();
        
        // Update player embeddings with new stats
        if (data.player && data.stats) {
          const embedding = await embeddingsGenerator.generatePlayerStatEmbedding(
            data.player,
            data.stats
          );
          await vectorStore.store(embedding);
        }
      } catch (error) {
        console.error('Error updating player embeddings:', error);
      }
    });

    // Listen for lineup changes to provide optimization suggestions
    socket.on('game:lineup_changed', async (data: any) => {
      try {
        const aiEngine = getAIEngine();
        const teamAnalytics = aiEngine.getTeamAnalytics();
        
        if (data.team && data.players) {
          const optimization = await teamAnalytics.optimizeLineup(
            data.players,
            data.opponent
          );
          
          socket.emit('ai:lineup_suggestions', {
            teamId: data.team.id,
            suggestions: optimization.data,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error generating lineup suggestions:', error);
      }
    });

    console.log('AI Analytics WebSocket integration established');
  }, [socket]);

  const getGamePrediction = useCallback(async (homeTeam: any, awayTeam: any, game: any) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const gameAnalytics = aiEngine.getGameAnalytics();
    
    return await gameAnalytics.predictGame(homeTeam, awayTeam, game);
  }, [state.isInitialized]);

  const getPlayerInsights = useCallback(async (player: any, game?: any, recentStats?: any[]) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const playerAnalytics = aiEngine.getPlayerAnalytics();
    
    if (game) {
      return await playerAnalytics.predictPlayerPerformance(player, game, recentStats);
    } else {
      return await playerAnalytics.analyzePlayerTrends(player, recentStats || []);
    }
  }, [state.isInitialized]);

  const optimizeLineup = useCallback(async (players: any[], opponent?: any) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const teamAnalytics = aiEngine.getTeamAnalytics();
    
    return await teamAnalytics.optimizeLineup(players, opponent);
  }, [state.isInitialized]);

  const analyzeTeam = useCallback(async (team: any, players: any[]) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const teamAnalytics = aiEngine.getTeamAnalytics();
    
    return await teamAnalytics.analyzeTeamChemistry(team, players);
  }, [state.isInitialized]);

  const generateTournamentSeeding = useCallback(async (teams: any[]) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const tournamentAnalytics = aiEngine.getTournamentAnalytics();
    
    return await tournamentAnalytics.generateSeeding(teams);
  }, [state.isInitialized]);

  const searchBasketballKnowledge = useCallback(async (query: string, options?: any) => {
    if (!state.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    const aiEngine = getAIEngine();
    const semanticSearch = aiEngine.getSemanticSearch();
    
    return await semanticSearch.search({ query, ...options });
  }, [state.isInitialized]);

  const getAIStats = useCallback(() => {
    if (!state.isInitialized) {
      return null;
    }

    const aiEngine = getAIEngine();
    return aiEngine.getStats();
  }, [state.isInitialized]);

  const refreshHealthStatus = useCallback(async () => {
    if (!state.isInitialized) {
      return;
    }

    try {
      const aiEngine = getAIEngine();
      const healthCheck = await aiEngine.healthCheck();
      
      setState(prev => ({
        ...prev,
        healthStatus: healthCheck.status,
        error: healthCheck.status === 'unhealthy' ? healthCheck.message : null
      }));
      
      return healthCheck;
    } catch (error) {
      setState(prev => ({
        ...prev,
        healthStatus: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed'
      }));
    }
  }, [state.isInitialized]);

  return {
    // State
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    healthStatus: state.healthStatus,
    
    // Core AI Functions
    getGamePrediction,
    getPlayerInsights,
    optimizeLineup,
    analyzeTeam,
    generateTournamentSeeding,
    searchBasketballKnowledge,
    
    // Utility Functions
    getAIStats,
    refreshHealthStatus,
    reinitialize: initializeAISystem
  };
}