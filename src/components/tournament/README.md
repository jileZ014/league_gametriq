# Tournament Bracket Builder System

A comprehensive tournament management system for Legacy Youth Sports basketball platform, supporting multiple tournament formats with real-time updates and interactive bracket visualization.

## Features

### Tournament Formats
- **Single Elimination**: Traditional knockout format with optional consolation rounds
- **Double Elimination**: Teams must lose twice to be eliminated (winners & losers brackets)
- **Round Robin**: Every team plays every other team
- **Pool Play**: Pool play followed by elimination bracket
- **3-Game Guarantee**: Ensures each team plays minimum 3 games

### Advanced Features
- **Visual Bracket Builder**: Drag-and-drop team placement with real-time preview
- **Multiple Seeding Methods**: Power rating, win percentage, regional balance, manual
- **Real-time Updates**: Live score updates via WebSocket connections
- **Mobile Responsive**: Touch gestures and mobile-optimized interface
- **Export Options**: PDF, PNG, SVG, CSV export capabilities
- **Offline Support**: Bracket viewing works offline

## Core Components

### 1. Tournament Engine (`/lib/tournament/tournament-engine.ts`)
The heart of the system that handles bracket generation and tournament logic.

```typescript
import { TournamentEngine, TournamentFactory } from '@/lib/tournament';

// Create a single elimination tournament
const tournament = TournamentFactory.createSingleElimination(teams, {
  consolationRounds: 1,
  regionProtection: true
});

// Generate bracket
const engine = new TournamentEngine(tournament);
const bracket = engine.generateBracket();
```

### 2. Bracket Visualization (`BracketView.tsx`)
Interactive SVG-based bracket display with zoom, pan, and selection.

```tsx
import { BracketView } from '@/components/tournament/BracketView';

<BracketView
  tournament={tournament}
  bracket={bracket}
  onMatchClick={handleMatchClick}
  onTeamClick={handleTeamClick}
  showControls={true}
  interactive={true}
/>
```

### 3. Tournament Creation (`/admin/tournaments/create/page.tsx`)
Multi-step wizard for creating tournaments with drag-and-drop team management.

Features:
- Basic tournament information
- Drag-and-drop team selection and seeding
- Advanced tournament settings
- Live bracket preview

### 4. Spectator View (`/spectator/tournaments/[id]/page.tsx`)
Public tournament viewing with live updates and team statistics.

Features:
- Live match updates
- Team statistics and records
- Tournament progress tracking
- Share and notification options

## Real-time Updates

### WebSocket Integration
```typescript
import { useTournament, useTournamentEvents } from '@/hooks/useTournament';

// Connect to tournament with real-time updates
const { tournament, advanceTeam } = useTournament(tournamentId, true);

// Listen for specific events
const { events, isConnected } = useTournamentEvents(tournamentId, [
  'score_update',
  'team_advance'
]);
```

### Optimistic Updates
The system provides immediate UI feedback while syncing changes in the background:

```typescript
// Update score with immediate UI update
stateManager.updateMatchScore(matchId, team1Score, team2Score);

// Advance team with bracket update
stateManager.advanceTeam(matchId, winner, loser);
```

## Tournament Types & Configuration

### Seeding Methods
- **Power Rating**: Seed by team strength/rating
- **Win Percentage**: Seed by regular season record
- **Manual**: Admin assigns seed numbers
- **Regional Balance**: Distribute teams by region
- **Random**: Random team placement

### Protection Rules
- **Region Protection**: Avoid same-region matchups in early rounds
- **Division Protection**: Avoid same-division matchups in early rounds

### Tournament Settings
```typescript
interface TournamentSettings {
  autoAdvance: boolean;           // Auto-advance teams from byes
  randomizeByes: boolean;         // Random bye placement
  balancedBracket: boolean;       // Create balanced bracket
  regionProtection: boolean;      // Regional protection
  divisionProtection: boolean;    // Division protection
  consolationRounds: number;      // Number of consolation rounds
}
```

## Component Architecture

```
/components/tournament/
├── BracketView.tsx           # Main bracket visualization
├── BracketPreview.tsx        # Compact bracket preview
├── MatchCard.tsx             # Individual match display
├── TeamPlacement.tsx         # Drag-and-drop team component
├── TournamentSettings.tsx    # Tournament configuration
└── README.md                 # This documentation

/lib/tournament/
├── tournament-engine.ts      # Core tournament logic
├── types.ts                  # Type definitions
├── realtime.ts              # Real-time updates
└── index.ts                 # Main exports

/hooks/
└── useTournament.ts         # React hooks for tournament state

/app/
├── admin/tournaments/create/        # Tournament creation
└── spectator/tournaments/[id]/      # Public tournament view
```

## Usage Examples

### Creating a Tournament
```typescript
import { TournamentFactory, TournamentEngine } from '@/lib/tournament';

// Step 1: Create tournament
const tournament = TournamentFactory.createSingleElimination(teams, {
  consolationRounds: 1,
  regionProtection: true
});

// Step 2: Generate bracket
const engine = new TournamentEngine(tournament);
const bracket = engine.generateBracket();

// Step 3: Save tournament
tournament.bracket = bracket;
tournament.matches = bracket.rounds.flatMap(round => round.matches);
```

### Real-time Score Updates
```typescript
import { useTournament } from '@/hooks/useTournament';

function ScoreKeeper({ tournamentId, matchId }) {
  const { tournament, advanceTeam } = useTournament(tournamentId);
  
  const handleScoreUpdate = (team1Score, team2Score) => {
    // Update score with real-time sync
    stateManager.updateMatchScore(matchId, team1Score, team2Score);
  };
  
  const handleMatchComplete = (winner, loser) => {
    // Advance team and update bracket
    advanceTeam(matchId, winner, loser);
  };
}
```

### Custom Tournament Formats
```typescript
// Create custom double elimination tournament
const tournament = TournamentFactory.createDoubleElimination(teams, {
  balancedBracket: true,
  seedingMethod: 'power_rating'
});

// Generate with custom settings
const engine = new TournamentEngine(tournament);
const bracket = engine.generateBracket();
```

## Data Models

### Tournament
```typescript
interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  teams: Team[];
  matches: Match[];
  bracket?: BracketStructure;
  status: 'setup' | 'in_progress' | 'completed';
  settings: TournamentSettings;
}
```

### Match
```typescript
interface Match {
  id: string;
  tournamentId: string;
  roundNumber: number;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  score?: { team1Score: number; team2Score: number };
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
  scheduledTime?: Date;
  court?: string;
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  seed?: number;
  powerRating?: number;
  record?: { wins: number; losses: number; ties?: number };
  regionId?: string;
  divisionId?: string;
}
```

## Performance Considerations

### Bracket Rendering
- SVG-based rendering for crisp graphics at any zoom level
- Virtualized rendering for large tournaments (64+ teams)
- Efficient re-rendering with React optimizations

### Real-time Updates
- WebSocket connections with automatic reconnection
- Optimistic UI updates for immediate feedback
- Event batching to prevent UI thrashing

### Mobile Optimization
- Touch gesture support (pan, zoom, tap)
- Responsive layout that adapts to screen size
- Offline bracket viewing capability

## Testing Commands

```bash
# Lint the tournament system
npm run lint

# Type check
npm run type-check

# Run tests
npm test

# Build for production
npm run build
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES2020 support

## Dependencies

### Required
- React 18+
- Next.js 14+
- TypeScript 5+
- @dnd-kit/core (drag and drop)
- chart.js (statistics charts)

### Optional
- WebSocket server for real-time updates
- PDF generation library for exports

## Contributing

When adding new tournament formats:

1. Define the format in `TOURNAMENT_FORMATS`
2. Implement generation logic in `TournamentEngine`
3. Add validation rules in `VALIDATION_RULES`
4. Create factory method in `TournamentFactory`
5. Add tests for the new format

## File Structure Reference

```
tournament/
├── README.md                 # This documentation
├── BracketView.tsx          # Main interactive bracket
├── BracketPreview.tsx       # Compact preview component
├── MatchCard.tsx            # Match display with scoring
├── TeamPlacement.tsx        # Drag-drop team management
└── TournamentSettings.tsx   # Configuration interface
```

This system provides a complete tournament management solution suitable for the Phoenix youth basketball market's demanding requirements of 100+ games on Saturdays with real-time updates across multiple courts.