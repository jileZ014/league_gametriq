// Mock Supabase implementation for testing
const supabaseMock = {
  // Auth methods
  auth: {
    getSession: jest.fn(() => Promise.resolve({
      data: {
        session: {
          user: {
            id: 'user-test-coach',
            email: 'coach@example.com',
            user_metadata: {
              name: 'Coach Johnson',
              role: 'coach',
            },
          },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      },
      error: null,
    })),
    
    getUser: jest.fn(() => Promise.resolve({
      data: {
        user: {
          id: 'user-test-coach',
          email: 'coach@example.com',
          user_metadata: {
            name: 'Coach Johnson',
            role: 'coach',
          },
        },
      },
      error: null,
    })),
    
    signIn: jest.fn(() => Promise.resolve({
      data: {
        session: {
          user: {
            id: 'user-test-coach',
            email: 'coach@example.com',
          },
          access_token: 'mock-access-token',
        },
      },
      error: null,
    })),
    
    signUp: jest.fn(() => Promise.resolve({
      data: {
        user: {
          id: 'user-test-new',
          email: 'newuser@example.com',
        },
        session: null,
      },
      error: null,
    })),
    
    signOut: jest.fn(() => Promise.resolve({
      error: null,
    })),
    
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })),
    
    resetPasswordForEmail: jest.fn(() => Promise.resolve({
      data: {},
      error: null,
    })),
    
    updateUser: jest.fn(() => Promise.resolve({
      data: {
        user: {
          id: 'user-test-coach',
          email: 'coach@example.com',
        },
      },
      error: null,
    })),
  },
  
  // Database methods - returns a chainable query builder
  from: jest.fn((table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    
    // Filters
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    
    // Modifiers
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    
    // Return single result
    single: jest.fn(() => {
      const mockData = getMockDataForTable(table);
      return Promise.resolve({
        data: mockData ? mockData[0] : null,
        error: null,
      });
    }),
    
    // Return maybe single result
    maybeSingle: jest.fn(() => {
      const mockData = getMockDataForTable(table);
      return Promise.resolve({
        data: mockData ? mockData[0] : null,
        error: null,
      });
    }),
    
    // Execute query and return results
    then: jest.fn((resolve) => {
      const mockData = getMockDataForTable(table);
      return resolve({
        data: mockData || [],
        error: null,
        count: mockData ? mockData.length : 0,
      });
    }),
  })),
  
  // Real-time subscriptions
  realtime: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve()),
      unsubscribe: jest.fn(() => Promise.resolve()),
    })),
  },
  
  // Storage methods
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({
        data: {
          path: 'test-file-path.jpg',
          id: 'test-file-id',
          fullPath: 'basketball-assets/test-file-path.jpg',
        },
        error: null,
      })),
      
      download: jest.fn(() => Promise.resolve({
        data: new Blob(['test file content'], { type: 'image/jpeg' }),
        error: null,
      })),
      
      remove: jest.fn(() => Promise.resolve({
        data: [],
        error: null,
      })),
      
      list: jest.fn(() => Promise.resolve({
        data: [
          {
            name: 'team-logo-eagles.png',
            id: 'logo-eagles-id',
            updated_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            last_accessed_at: '2024-01-01T00:00:00Z',
            metadata: { size: 15420 },
          },
        ],
        error: null,
      })),
      
      getPublicUrl: jest.fn(() => ({
        data: {
          publicUrl: 'https://test.supabase.co/storage/v1/object/public/basketball-assets/test-file.jpg',
        },
      })),
    })),
  },
  
  // Functions (Edge Functions)
  functions: {
    invoke: jest.fn(() => Promise.resolve({
      data: { message: 'Function executed successfully' },
      error: null,
    })),
  },
};

// Helper function to return mock data based on table name
function getMockDataForTable(tableName) {
  const mockData = {
    leagues: [
      {
        id: 'league-phoenix-youth',
        name: 'Phoenix Youth Basketball League',
        description: 'Youth basketball league for ages 8-14',
        age_group: 'youth',
        season: '2024-summer',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    
    teams: [
      {
        id: 'team-eagles',
        name: 'Phoenix Eagles',
        league_id: 'league-phoenix-youth',
        coach_id: 'user-test-coach',
        primary_color: '#1976d2',
        secondary_color: '#ffffff',
        wins: 8,
        losses: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'team-hawks',
        name: 'Desert Hawks',
        league_id: 'league-phoenix-youth',
        coach_id: 'user-test-coach-2',
        primary_color: '#d32f2f',
        secondary_color: '#ffffff',
        wins: 6,
        losses: 4,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    
    players: [
      {
        id: 'player-001',
        name: 'Alex Johnson',
        jersey_number: 23,
        position: 'Point Guard',
        team_id: 'team-eagles',
        birth_year: 2011,
        parent_email: 'parent1@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'player-002',
        name: 'Sam Williams',
        jersey_number: 10,
        position: 'Shooting Guard',
        team_id: 'team-eagles',
        birth_year: 2012,
        parent_email: 'parent2@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    
    games: [
      {
        id: 'game-001',
        home_team_id: 'team-eagles',
        away_team_id: 'team-hawks',
        league_id: 'league-phoenix-youth',
        scheduled_time: '2024-06-15T10:00:00Z',
        venue: 'Phoenix Community Center',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        period: null,
        time_remaining: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'game-002',
        home_team_id: 'team-eagles',
        away_team_id: 'team-hawks',
        league_id: 'league-phoenix-youth',
        scheduled_time: '2024-06-01T14:00:00Z',
        venue: 'Valley Sports Complex',
        status: 'completed',
        home_score: 65,
        away_score: 58,
        period: 4,
        time_remaining: '00:00',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-01T16:00:00Z',
      },
    ],
    
    tournaments: [
      {
        id: 'tournament-001',
        name: 'Phoenix Summer Championship',
        league_id: 'league-phoenix-youth',
        start_date: '2024-07-01T09:00:00Z',
        end_date: '2024-07-03T18:00:00Z',
        venue: 'Phoenix Sports Complex',
        entry_fee: 75.00,
        max_teams: 16,
        status: 'registration_open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    
    game_stats: [
      {
        id: 'stat-001',
        game_id: 'game-002',
        player_id: 'player-001',
        points: 18,
        rebounds: 7,
        assists: 9,
        steals: 3,
        blocks: 1,
        turnovers: 2,
        fouls: 2,
        minutes_played: 32,
        created_at: '2024-06-01T16:00:00Z',
        updated_at: '2024-06-01T16:00:00Z',
      },
    ],
    
    registrations: [
      {
        id: 'reg-001',
        player_id: 'player-001',
        league_id: 'league-phoenix-youth',
        team_id: 'team-eagles',
        registration_fee: 150.00,
        payment_status: 'paid',
        stripe_payment_intent_id: 'pi_test_basketball_league',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    
    users: [
      {
        id: 'user-test-coach',
        email: 'coach@example.com',
        name: 'Coach Johnson',
        role: 'coach',
        phone: '+1-555-0123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
  };
  
  return mockData[tableName] || [];
}

// Mock createClient function
const createClientMock = jest.fn(() => supabaseMock);

module.exports = {
  // Core Supabase mock
  createClient: createClientMock,
  
  // Basketball-specific test utilities
  createMockUser: (overrides = {}) => ({
    id: 'user-test-mock',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      role: 'parent',
    },
    ...overrides,
  }),
  
  createMockTeam: (overrides = {}) => ({
    id: 'team-test-mock',
    name: 'Test Team',
    league_id: 'league-test',
    coach_id: 'user-test-coach',
    primary_color: '#1976d2',
    wins: 0,
    losses: 0,
    ...overrides,
  }),
  
  createMockGame: (overrides = {}) => ({
    id: 'game-test-mock',
    home_team_id: 'team-home',
    away_team_id: 'team-away',
    scheduled_time: new Date().toISOString(),
    venue: 'Test Venue',
    status: 'scheduled',
    ...overrides,
  }),
  
  createMockPlayer: (overrides = {}) => ({
    id: 'player-test-mock',
    name: 'Test Player',
    jersey_number: 99,
    position: 'Guard',
    team_id: 'team-test',
    birth_year: 2010,
    parent_email: 'parent@example.com',
    ...overrides,
  }),
  
  // Mock response helpers
  createSuccessResponse: (data = null) => ({
    data,
    error: null,
  }),
  
  createErrorResponse: (message = 'Test error') => ({
    data: null,
    error: {
      message,
      details: 'Mock error for testing',
      hint: null,
      code: 'TEST_ERROR',
    },
  }),
  
  // Real-time subscription mock
  createMockSubscription: () => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve()),
    unsubscribe: jest.fn(() => Promise.resolve()),
  }),
  
  // Reset all mocks
  resetMocks: () => {
    Object.values(supabaseMock.auth).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });
    
    supabaseMock.from.mockClear();
    createClientMock.mockClear();
  },
};