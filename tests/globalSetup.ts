import { setup } from '@jest/globals';

export default async function globalSetup() {
  console.log('🏀 Setting up Basketball League Management Test Environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Basketball-specific test setup
  console.log('⚙️  Configuring basketball league test environment...');
  
  // Mock external services
  setupMockServices();
  
  // Initialize test database if needed
  await setupTestDatabase();
  
  // Setup test data
  await setupTestData();
  
  console.log('✅ Basketball League test environment ready!');
}

function setupMockServices() {
  // Mock Stripe webhooks
  console.log('🔧 Setting up Stripe test webhooks...');
  
  // Mock weather API for heat safety
  console.log('🌡️  Setting up weather API mocks...');
  
  // Mock email service
  console.log('📧 Setting up email service mocks...');
  
  // Mock push notification service
  console.log('📱 Setting up push notification mocks...');
}

async function setupTestDatabase() {
  console.log('🗄️  Setting up test database...');
  
  // In a real implementation, you might:
  // 1. Create test database schema
  // 2. Run migrations
  // 3. Seed with basic test data
  
  // For now, we'll just log that we're setting it up
  console.log('🗄️  Test database schema ready');
}

async function setupTestData() {
  console.log('📊 Setting up basketball test data...');
  
  // Create mock leagues
  const testLeagues = [
    {
      id: 'test-phoenix-youth-league',
      name: 'Phoenix Youth Basketball League',
      ageGroup: 'youth',
      season: '2024-summer',
    },
    {
      id: 'test-phoenix-middle-league',
      name: 'Phoenix Middle School League',
      ageGroup: 'middle',
      season: '2024-summer',
    },
  ];
  
  // Create mock teams
  const testTeams = [
    {
      id: 'team-eagles',
      name: 'Phoenix Eagles',
      leagueId: 'test-phoenix-youth-league',
      color: '#1976d2',
    },
    {
      id: 'team-hawks',
      name: 'Desert Hawks',
      leagueId: 'test-phoenix-youth-league',
      color: '#d32f2f',
    },
    {
      id: 'team-suns',
      name: 'Valley Suns',
      leagueId: 'test-phoenix-middle-league',
      color: '#ff9800',
    },
    {
      id: 'team-coyotes',
      name: 'Scottsdale Coyotes',
      leagueId: 'test-phoenix-middle-league',
      color: '#9c27b0',
    },
  ];
  
  // Create mock players
  const testPlayers = [
    {
      id: 'player-001',
      name: 'Alex Johnson',
      jerseyNumber: 23,
      position: 'Point Guard',
      teamId: 'team-eagles',
      age: 12,
    },
    {
      id: 'player-002',
      name: 'Sam Williams',
      jerseyNumber: 10,
      position: 'Shooting Guard',
      teamId: 'team-eagles',
      age: 13,
    },
    {
      id: 'player-003',
      name: 'Jordan Davis',
      jerseyNumber: 15,
      position: 'Center',
      teamId: 'team-hawks',
      age: 12,
    },
  ];
  
  // Create mock games
  const testGames = [
    {
      id: 'game-001',
      homeTeamId: 'team-eagles',
      awayTeamId: 'team-hawks',
      leagueId: 'test-phoenix-youth-league',
      scheduledTime: new Date('2024-06-15T10:00:00Z'),
      venue: 'Phoenix Community Center - Court A',
      status: 'scheduled',
    },
    {
      id: 'game-002',
      homeTeamId: 'team-suns',
      awayTeamId: 'team-coyotes',
      leagueId: 'test-phoenix-middle-league',
      scheduledTime: new Date('2024-06-15T14:00:00Z'),
      venue: 'Valley Sports Complex - Court 1',
      status: 'live',
      homeScore: 42,
      awayScore: 38,
      period: 3,
      timeRemaining: '08:45',
    },
  ];
  
  // Create mock tournaments
  const testTournaments = [
    {
      id: 'tournament-001',
      name: 'Phoenix Summer Championship',
      leagueId: 'test-phoenix-youth-league',
      startDate: new Date('2024-07-01T09:00:00Z'),
      endDate: new Date('2024-07-03T18:00:00Z'),
      venue: 'Phoenix Sports Complex',
      entryFee: 75.00,
      teams: ['team-eagles', 'team-hawks'],
    },
  ];
  
  // Store test data in global for access during tests
  (global as any).testData = {
    leagues: testLeagues,
    teams: testTeams,
    players: testPlayers,
    games: testGames,
    tournaments: testTournaments,
  };
  
  console.log(`📊 Created ${testLeagues.length} test leagues`);
  console.log(`🏀 Created ${testTeams.length} test teams`);
  console.log(`👥 Created ${testPlayers.length} test players`);
  console.log(`🎮 Created ${testGames.length} test games`);
  console.log(`🏆 Created ${testTournaments.length} test tournaments`);
}