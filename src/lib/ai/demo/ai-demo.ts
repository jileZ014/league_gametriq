/**
 * AI Analytics Demo Script
 * Demonstrates the capabilities of the basketball AI analytics system
 */

import { initializeAI, getAIEngine } from '../index';
import { Team, Player, Game } from '../types';

// Demo data
const demoTeams: Team[] = [
  {
    id: 'phoenix-suns-youth',
    name: 'Phoenix Suns Youth',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 18,
    losses: 2,
    pointsFor: 1680,
    pointsAgainst: 1320,
    streak: 'W5',
    lastFiveGames: ['W', 'W', 'W', 'W', 'W'],
    homeCourt: 'Phoenix Community Center'
  },
  {
    id: 'desert-hawks',
    name: 'Desert Hawks',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 14,
    losses: 6,
    pointsFor: 1540,
    pointsAgainst: 1480,
    streak: 'W2',
    lastFiveGames: ['L', 'W', 'W', 'L', 'W'],
    homeCourt: 'Desert Recreation Center'
  },
  {
    id: 'valley-storm',
    name: 'Valley Storm',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 12,
    losses: 8,
    pointsFor: 1520,
    pointsAgainst: 1540,
    streak: 'L1',
    lastFiveGames: ['W', 'W', 'L', 'W', 'L'],
    homeCourt: 'Valley Sports Complex'
  },
  {
    id: 'cactus-cowboys',
    name: 'Cactus Cowboys',
    league: 'Legacy Youth Sports',
    division: 'U16 Elite',
    ageGroup: 'U16',
    wins: 10,
    losses: 10,
    pointsFor: 1480,
    pointsAgainst: 1520,
    streak: 'W1',
    lastFiveGames: ['L', 'L', 'W', 'L', 'W'],
    homeCourt: 'Cactus Community Gym'
  }
];

const demoPlayers: Player[] = [
  {
    id: 'marcus-johnson',
    name: 'Marcus Johnson',
    teamId: 'phoenix-suns-youth',
    position: 'PG',
    age: 16,
    height: 72,
    weight: 160,
    gamesPlayed: 20,
    minutesPerGame: 35,
    pointsPerGame: 22.5,
    assistsPerGame: 8.2,
    reboundsPerGame: 4.8,
    fieldGoalPercentage: 0.485,
    freeThrowPercentage: 0.84,
    efficiency: 26.3,
    plusMinus: 12.5,
    injuryHistory: [],
    fatigueFactor: 0.25
  },
  {
    id: 'tyler-davis',
    name: 'Tyler Davis',
    teamId: 'phoenix-suns-youth',
    position: 'SF',
    age: 15,
    height: 76,
    weight: 185,
    gamesPlayed: 20,
    minutesPerGame: 32,
    pointsPerGame: 18.2,
    assistsPerGame: 4.1,
    reboundsPerGame: 7.9,
    fieldGoalPercentage: 0.512,
    freeThrowPercentage: 0.78,
    efficiency: 21.7,
    plusMinus: 9.2,
    injuryHistory: [],
    fatigueFactor: 0.3
  },
  {
    id: 'jordan-smith',
    name: 'Jordan Smith',
    teamId: 'phoenix-suns-youth',
    position: 'C',
    age: 16,
    height: 80,
    weight: 220,
    gamesPlayed: 20,
    minutesPerGame: 28,
    pointsPerGame: 14.8,
    assistsPerGame: 2.3,
    reboundsPerGame: 11.2,
    fieldGoalPercentage: 0.58,
    freeThrowPercentage: 0.65,
    efficiency: 19.5,
    plusMinus: 8.1,
    injuryHistory: ['knee strain'],
    fatigueFactor: 0.4
  },
  {
    id: 'alex-rodriguez',
    name: 'Alex Rodriguez',
    teamId: 'desert-hawks',
    position: 'PG',
    age: 16,
    height: 70,
    weight: 155,
    gamesPlayed: 20,
    minutesPerGame: 33,
    pointsPerGame: 19.1,
    assistsPerGame: 6.8,
    reboundsPerGame: 3.5,
    fieldGoalPercentage: 0.445,
    freeThrowPercentage: 0.81,
    efficiency: 18.9,
    plusMinus: 4.2,
    injuryHistory: [],
    fatigueFactor: 0.35
  },
  {
    id: 'mike-thompson',
    name: 'Mike Thompson',
    teamId: 'desert-hawks',
    position: 'PF',
    age: 16,
    height: 78,
    weight: 200,
    gamesPlayed: 20,
    minutesPerGame: 30,
    pointsPerGame: 16.5,
    assistsPerGame: 3.2,
    reboundsPerGame: 9.1,
    fieldGoalPercentage: 0.498,
    freeThrowPercentage: 0.72,
    efficiency: 17.8,
    plusMinus: 3.8,
    injuryHistory: ['ankle sprain'],
    fatigueFactor: 0.45
  }
];

const championshipGame: Game = {
  id: 'championship-game',
  homeTeamId: 'phoenix-suns-youth',
  awayTeamId: 'desert-hawks',
  date: new Date('2024-03-20T19:00:00Z'),
  venue: 'Legacy Youth Sports Arena',
  status: 'scheduled',
  officials: ['John Smith', 'Sarah Wilson', 'Mike Davis']
};

/**
 * Run comprehensive AI analytics demo
 */
export async function runAIDemo(): Promise<void> {
  console.log('🏀 Basketball AI Analytics Demo - Legacy Youth Sports');
  console.log('==================================================\n');

  try {
    // Initialize AI system
    console.log('🔧 Initializing AI Analytics System...');
    await initializeAI();
    const aiEngine = getAIEngine();
    console.log('✅ AI System initialized successfully\n');

    // Health check
    console.log('🔍 Performing system health check...');
    const healthCheck = await aiEngine.healthCheck();
    console.log(`📊 System Status: ${healthCheck.status.toUpperCase()}`);
    console.log(`📝 Message: ${healthCheck.message}\n`);

    // Demo 1: Game Prediction
    console.log('🎯 DEMO 1: Championship Game Prediction');
    console.log('=======================================');
    console.log(`🏠 Home: ${demoTeams[0].name} (${demoTeams[0].wins}-${demoTeams[0].losses})`);
    console.log(`🚌 Away: ${demoTeams[1].name} (${demoTeams[1].wins}-${demoTeams[1].losses})`);
    console.log(`📍 Venue: ${championshipGame.venue}`);
    console.log(`📅 Date: ${championshipGame.date.toLocaleDateString()}\n`);

    const gameAnalytics = aiEngine.getGameAnalytics();
    const prediction = await gameAnalytics.predictGame(
      demoTeams[0],
      demoTeams[1],
      championshipGame
    );

    console.log('🤖 AI Prediction Results:');
    console.log(`   ${demoTeams[0].name}: ${Math.round(prediction.data.homeTeamWinProbability * 100)}% win probability`);
    console.log(`   ${demoTeams[1].name}: ${Math.round(prediction.data.awayTeamWinProbability * 100)}% win probability`);
    console.log(`   Predicted Score: ${prediction.data.predictedHomeScore} - ${prediction.data.predictedAwayScore}`);
    console.log(`   Confidence: ${Math.round(prediction.confidence * 100)}%`);
    console.log(`   Key Factors:`);
    prediction.data.factors.slice(0, 3).forEach(factor => {
      console.log(`     • ${factor.description}`);
    });
    console.log('');

    // Demo 2: Player Performance Prediction
    console.log('👤 DEMO 2: Star Player Performance Prediction');
    console.log('============================================');
    const starPlayer = demoPlayers[0]; // Marcus Johnson
    console.log(`🌟 Player: ${starPlayer.name} (${starPlayer.position})`);
    console.log(`📊 Season Averages: ${starPlayer.pointsPerGame} PPG, ${starPlayer.assistsPerGame} APG, ${starPlayer.reboundsPerGame} RPG\n`);

    const playerAnalytics = aiEngine.getPlayerAnalytics();
    const playerPrediction = await playerAnalytics.predictPlayerPerformance(
      starPlayer,
      championshipGame
    );

    console.log('🎯 Championship Game Prediction:');
    console.log(`   Expected Points: ${playerPrediction.data.expectedPoints.toFixed(1)}`);
    console.log(`   Expected Assists: ${playerPrediction.data.expectedAssists.toFixed(1)}`);
    console.log(`   Expected Rebounds: ${playerPrediction.data.expectedRebounds.toFixed(1)}`);
    console.log(`   Efficiency Rating: ${playerPrediction.data.efficiency.toFixed(1)}`);
    console.log(`   Injury Risk: ${Math.round(playerPrediction.data.injuryRisk * 100)}%`);
    console.log(`   Fatigue Level: ${Math.round(playerPrediction.data.fatigueLevel * 100)}%`);
    console.log('');

    // Demo 3: Lineup Optimization
    console.log('⚡ DEMO 3: AI-Powered Lineup Optimization');
    console.log('========================================');
    const phoenixPlayers = demoPlayers.filter(p => p.teamId === 'phoenix-suns-youth');
    console.log(`🏀 Optimizing lineup for ${demoTeams[0].name}`);
    console.log(`👥 Available Players: ${phoenixPlayers.length}\n`);

    const teamAnalytics = aiEngine.getTeamAnalytics();
    const lineupOptimization = await teamAnalytics.optimizeLineup(
      phoenixPlayers,
      demoTeams[1]
    );

    console.log('🎯 Optimal Starting Lineup:');
    console.log(`   PG: ${phoenixPlayers.find(p => p.id === lineupOptimization.data.positions.pointGuard)?.name || 'TBD'}`);
    console.log(`   SG: ${phoenixPlayers.find(p => p.id === lineupOptimization.data.positions.shootingGuard)?.name || 'TBD'}`);
    console.log(`   SF: ${phoenixPlayers.find(p => p.id === lineupOptimization.data.positions.smallForward)?.name || 'TBD'}`);
    console.log(`   PF: ${phoenixPlayers.find(p => p.id === lineupOptimization.data.positions.powerForward)?.name || 'TBD'}`);
    console.log(`   C: ${phoenixPlayers.find(p => p.id === lineupOptimization.data.positions.center)?.name || 'TBD'}`);
    console.log(`   Team Synergy: ${Math.round(lineupOptimization.data.synergy * 100)}%`);
    console.log(`   Offensive Rating: ${lineupOptimization.data.offensiveRating.toFixed(1)}`);
    console.log(`   Defensive Rating: ${lineupOptimization.data.defensiveRating.toFixed(1)}`);
    console.log(`   Expected +/-: ${lineupOptimization.data.expectedPlusMinusPerGame > 0 ? '+' : ''}${lineupOptimization.data.expectedPlusMinusPerGame.toFixed(1)}`);
    console.log('');

    // Demo 4: Tournament Analysis
    console.log('🏆 DEMO 4: Tournament Seeding & Predictions');
    console.log('==========================================');
    console.log(`🎯 Analyzing ${demoTeams.length} teams for tournament seeding\n`);

    const tournamentAnalytics = aiEngine.getTournamentAnalytics();
    const seeding = await tournamentAnalytics.generateSeeding(demoTeams);

    console.log('📊 AI-Generated Tournament Seeding:');
    seeding.data.forEach((seed, index) => {
      const team = demoTeams.find(t => t.id === seed.teamId);
      if (team) {
        console.log(`   ${seed.seed}. ${team.name} (${team.wins}-${team.losses}) - ${Math.round(seed.championshipOdds * 100)}% title odds`);
      }
    });
    console.log('');

    // Championship projections
    const championships = await tournamentAnalytics.generateChampionshipProjections(
      seeding.data,
      demoTeams
    );

    console.log('🏆 Championship Probability Rankings:');
    championships.data.slice(0, 3).forEach((projection, index) => {
      console.log(`   ${index + 1}. ${projection.team.name}: ${Math.round(projection.probability * 100)}% chance`);
      console.log(`      Key Factors: ${projection.keyFactors.slice(0, 2).join(', ')}`);
    });
    console.log('');

    // Demo 5: AI-Powered Search
    console.log('🔍 DEMO 5: Intelligent Basketball Knowledge Search');
    console.log('================================================');
    
    const semanticSearch = aiEngine.getSemanticSearch();
    const searchResults = await semanticSearch.search({
      query: 'point guard assists basketball strategy',
      limit: 3
    });

    console.log('🧠 AI Knowledge Search Results:');
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.metadata.type || 'Knowledge'} (${Math.round(result.relevanceScore * 100)}% relevant)`);
      console.log(`      ${result.content.substring(0, 80)}...`);
    });
    console.log('');

    // System Statistics
    console.log('📈 DEMO 6: System Performance Statistics');
    console.log('=======================================');
    const stats = aiEngine.getStats();
    console.log(`🧠 Models Loaded: ${stats.modelsLoaded.filter(Boolean).length}/4`);
    console.log(`💾 Vector Store: ${stats.vectorStore.totalEmbeddings} embeddings stored`);
    console.log(`⚡ Cache Status: ${stats.cacheStatus.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`⏱️  System Uptime: ${Math.round(stats.uptime / 1000)}s`);
    console.log('');

    console.log('🎉 AI Analytics Demo Completed Successfully!');
    console.log('==========================================');
    console.log('🏀 The Legacy Youth Sports AI system is ready to enhance');
    console.log('   basketball league management with intelligent insights.');
    console.log('');
    console.log('✨ Key Capabilities Demonstrated:');
    console.log('   • Game outcome predictions with confidence scores');
    console.log('   • Individual player performance forecasting');
    console.log('   • Intelligent lineup optimization');
    console.log('   • Tournament seeding and bracket analysis');
    console.log('   • Semantic search of basketball knowledge');
    console.log('   • Real-time performance monitoring');
    console.log('');
    console.log('🚀 System is production-ready with error handling,');
    console.log('   caching, and Legacy Youth Sports branding!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

/**
 * Run live game simulation demo
 */
export async function runLiveGameDemo(): Promise<void> {
  console.log('📺 Live Game AI Analytics Demo');
  console.log('==============================\n');

  const aiEngine = getAIEngine();
  const gameAnalytics = aiEngine.getGameAnalytics();

  // Simulate live game
  const liveGame: Game = {
    ...championshipGame,
    status: 'in_progress',
    homeScore: 58,
    awayScore: 55,
    quarter: 3,
    timeRemaining: '4:32'
  };

  console.log('🔴 LIVE: Championship Game - 3rd Quarter');
  console.log(`🏠 ${demoTeams[0].name}: 58`);
  console.log(`🚌 ${demoTeams[1].name}: 55`);
  console.log(`⏰ Time: 4:32 remaining in 3rd quarter\n`);

  const liveInsights = await gameAnalytics.getLiveGameInsights(
    liveGame,
    demoTeams[0],
    demoTeams[1]
  );

  console.log('🤖 AI Live Insights:');
  console.log(`   Game Momentum: ${liveInsights.data.momentum}`);
  console.log(`   Predicted Final Score: ${liveInsights.data.predictions.finalScore.home} - ${liveInsights.data.predictions.finalScore.away}`);
  console.log(`   Live Win Probability:`);
  console.log(`     ${demoTeams[0].name}: ${Math.round(liveInsights.data.predictions.winProbability.home * 100)}%`);
  console.log(`     ${demoTeams[1].name}: ${Math.round(liveInsights.data.predictions.winProbability.away * 100)}%`);
  console.log(`   Key Factors:`);
  liveInsights.data.keyFactors.forEach(factor => {
    console.log(`     • ${factor}`);
  });
  console.log(`   AI Recommendations:`);
  liveInsights.data.recommendations.forEach(rec => {
    console.log(`     • ${rec}`);
  });
  console.log('');
}

// Export for testing and development
export { demoTeams, demoPlayers, championshipGame };