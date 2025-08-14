import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isLocaleDomain: true,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => 
    Promise.resolve({
      elements: jest.fn(() => ({
        create: jest.fn(() => ({
          mount: jest.fn(),
          unmount: jest.fn(),
          destroy: jest.fn(),
          on: jest.fn(),
          off: jest.fn(),
        })),
        getElement: jest.fn(),
      })),
      confirmCardPayment: jest.fn(),
      confirmPayment: jest.fn(),
      createPaymentMethod: jest.fn(),
      retrievePaymentIntent: jest.fn(),
    })
  ),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    realtime: {
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      })),
    },
  })),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    img: 'img',
    svg: 'svg',
    path: 'path',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useInView: () => [jest.fn(), true],
  useMotionValue: () => ({ get: jest.fn(), set: jest.fn() }),
  useSpring: () => ({ get: jest.fn(), set: jest.fn() }),
  useTransform: () => ({ get: jest.fn() }),
}));

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: () => [jest.fn(), true, {}],
  InView: ({ children }: { children: any }) => children({ inView: true, ref: jest.fn() }),
}));

// Mock WebSocket for real-time features
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen = jest.fn();
  onclose = jest.fn();
  onmessage = jest.fn();
  onerror = jest.fn();
  
  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen({} as Event);
    }, 0);
  }
  
  send = jest.fn();
  close = jest.fn();
}

global.WebSocket = MockWebSocket as any;

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Mock date-fns for consistent date testing
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') return 'Jan 1, 2024';
    if (formatStr === 'h:mm a') return '2:00 PM';
    return 'Jan 1, 2024';
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  isValid: jest.fn(() => true),
}));

// Mock crypto for secure ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn(() => new Uint8Array(16)),
    randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn((key: string) => {
    const storage: Record<string, string> = {};
    return storage[key] || null;
  }),
  setItem: jest.fn((key: string, value: string) => {
    const storage: Record<string, string> = {};
    storage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    const storage: Record<string, string> = {};
    delete storage[key];
  }),
  clear: jest.fn(() => {
    const storage: Record<string, string> = {};
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
});

// Mock window.navigator
Object.defineProperty(window.navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  },
});

// Basketball-specific test utilities
export const mockGameData = {
  id: 'game-123',
  homeTeam: {
    id: 'team-home',
    name: 'Phoenix Eagles',
    score: 42,
    color: '#1976d2',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Desert Hawks',
    score: 38,
    color: '#d32f2f',
  },
  status: 'live',
  period: 2,
  timeRemaining: '05:23',
  venue: 'Phoenix Community Center',
  startTime: new Date('2024-01-15T19:00:00Z'),
};

export const mockPlayerData = {
  id: 'player-123',
  name: 'John Smith',
  jerseyNumber: 23,
  position: 'Point Guard',
  age: 16,
  teamId: 'team-home',
  stats: {
    points: 15,
    rebounds: 7,
    assists: 5,
    steals: 2,
    blocks: 1,
    turnovers: 3,
    fouls: 2,
    minutesPlayed: 24,
  },
};

export const mockTournamentData = {
  id: 'tournament-123',
  name: 'Phoenix Summer Championship',
  startDate: new Date('2024-06-01T09:00:00Z'),
  endDate: new Date('2024-06-03T18:00:00Z'),
  venue: 'Phoenix Sports Complex',
  teams: ['team-1', 'team-2', 'team-3', 'team-4'],
  bracket: {
    rounds: [
      {
        name: 'Semifinals',
        matches: [
          { id: 'match-1', team1: 'team-1', team2: 'team-2' },
          { id: 'match-2', team1: 'team-3', team2: 'team-4' },
        ],
      },
      {
        name: 'Finals',
        matches: [
          { id: 'match-3', team1: 'winner-match-1', team2: 'winner-match-2' },
        ],
      },
    ],
  },
};

export const mockUserData = {
  id: 'user-123',
  email: 'coach@example.com',
  name: 'Coach Johnson',
  role: 'coach',
  teamId: 'team-home',
  leagueId: 'league-phoenix-youth',
};

// Test helper functions
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  // This would include theme providers, query clients, etc.
  return ui;
};

export const createMockEvent = (eventType: string, eventData = {}) => ({
  type: eventType,
  data: eventData,
  timestamp: new Date().toISOString(),
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage/sessionStorage
  localStorageMock.clear();
  
  // Reset console methods to avoid noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Increase timeout for basketball-specific async operations
jest.setTimeout(10000);