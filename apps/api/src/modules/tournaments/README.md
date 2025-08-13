# Tournament Management System

## Overview

A comprehensive tournament management system for the basketball league platform, supporting multiple tournament formats with real-time updates, intelligent scheduling, and automated bracket progression.

## Features

### Tournament Formats
- **Single Elimination**: Standard bracket with automatic advancement
- **Double Elimination**: Winners and losers brackets with grand finals
- **Round Robin**: Every team plays everyone once
- **Pool Play**: Group stage followed by knockout rounds

### Core Capabilities

#### 1. Bracket Generation
- Automatic bracket creation based on team count
- Proper seeding placement (1 vs 16, 2 vs 15, etc.)
- Bye handling for non-power-of-2 team counts
- Support for 4 to 128 teams
- Consolation brackets and third-place games

#### 2. Schedule Optimization
- Intelligent game scheduling with constraints
- Minimum rest time between games (configurable)
- Maximum games per day limits
- Court availability management
- Conflict resolution and automatic rescheduling

#### 3. Court Assignment
- Smart court allocation based on match importance
- Championship courts for finals
- Load balancing across multiple courts
- Multi-venue support
- Court quality matching (championship, primary, secondary)

#### 4. Live Updates
- Real-time bracket progression via WebSocket
- Automatic winner advancement
- Live score updates
- Match status tracking
- Viewer count monitoring

## API Endpoints

### Tournament Management
- `POST /tournaments` - Create new tournament
- `GET /tournaments` - List all tournaments
- `GET /tournaments/:id` - Get tournament details
- `PUT /tournaments/:id` - Update tournament
- `DELETE /tournaments/:id` - Delete tournament

### Team Registration
- `POST /tournaments/:id/teams` - Register team
- `GET /tournaments/:id/teams` - List registered teams
- `PUT /tournaments/:id/teams/:teamId` - Update team registration
- `DELETE /tournaments/:id/teams/:teamId` - Withdraw team

### Bracket Operations
- `POST /tournaments/:id/bracket/generate` - Generate bracket
- `GET /tournaments/:id/bracket` - Get current bracket
- `PUT /tournaments/:id/bracket/reseed` - Reseed teams

### Scheduling
- `POST /tournaments/:id/schedule/generate` - Generate optimized schedule
- `GET /tournaments/:id/schedule` - Get tournament schedule
- `PUT /tournaments/:id/schedule/optimize` - Re-optimize schedule

### Court Management
- `POST /tournaments/:id/courts/assign` - Assign courts to matches
- `GET /tournaments/:id/courts` - List tournament courts
- `PUT /tournaments/:id/courts/:courtId` - Update court availability

### Match Management
- `GET /tournaments/:id/matches` - List all matches
- `GET /tournaments/:id/matches/:matchId` - Get match details
- `PUT /tournaments/:id/matches/:matchId` - Update match result
- `POST /tournaments/:id/matches/:matchId/forfeit` - Record forfeit

### Live Operations
- `POST /tournaments/:id/start` - Start tournament
- `GET /tournaments/:id/live` - Get live updates
- `GET /tournaments/:id/statistics` - Get tournament stats
- `GET /tournaments/:id/standings` - Get current standings

## WebSocket Events

### Client Events (Subscribe)
- `subscribe_tournament` - Subscribe to tournament updates
- `unsubscribe_tournament` - Unsubscribe from tournament
- `subscribe_match` - Subscribe to specific match
- `update_live_score` - Update live score (authorized users)
- `game_event` - Report game events (fouls, timeouts)

### Server Events (Broadcast)
- `tournament_state` - Initial tournament state
- `bracket_update` - Bracket structure changed
- `match_completed` - Match finished
- `team_advanced` - Team advanced to next round
- `tournament_status_changed` - Tournament status update
- `live_score_update` - Real-time score update
- `game_event` - Game event occurred

## Database Schema

### Tables
- `tournaments` - Main tournament information
- `tournament_teams` - Registered teams and their records
- `tournament_matches` - All tournament matches
- `tournament_courts` - Available courts and assignments

### Key Indexes
- Tournament by organization and status
- Matches by round and position
- Teams by seed and pool
- Courts by availability

## Configuration

### Tournament Settings
```typescript
{
  gameDuration: 60,          // Minutes
  quarterDuration: 12,        // Minutes
  halftimeDuration: 15,       // Minutes
  timeoutsPerHalf: 3,
  foulsToBonus: 7,
  minRestTime: 30,           // Minutes between games
  maxGamesPerDay: 3,         // Per team
  preferredStartTime: "08:00",
  preferredEndTime: "20:00",
  consolationBracket: true,
  thirdPlaceGame: true
}
```

### Seeding Methods
- **Manual**: Admin sets seeds directly
- **Random**: Random seed assignment
- **Ranked**: Based on regular season record
- **Snake**: Snake draft for pool distribution

## Usage Examples

### Create Tournament
```typescript
const tournament = await tournamentService.create({
  name: "Spring Championship 2025",
  format: TournamentFormat.SINGLE_ELIMINATION,
  startDate: new Date("2025-03-15"),
  endDate: new Date("2025-03-17"),
  minTeams: 16,
  maxTeams: 32,
  seedingMethod: SeedingMethod.RANKED,
  settings: {
    gameDuration: 60,
    consolationBracket: true,
    thirdPlaceGame: true
  }
});
```

### Generate Bracket
```typescript
const bracket = await tournamentService.generateBracket(
  tournamentId,
  userId,
  organizationId
);
```

### Update Match Result
```typescript
await tournamentService.updateMatchResult(
  tournamentId,
  matchId,
  {
    homeScore: 75,
    awayScore: 68,
    scoreByPeriod: [
      { period: 1, homeScore: 18, awayScore: 20 },
      { period: 2, homeScore: 22, awayScore: 15 },
      { period: 3, homeScore: 17, awayScore: 18 },
      { period: 4, homeScore: 18, awayScore: 15 }
    ]
  },
  userId,
  organizationId
);
```

## Performance Considerations

### Optimization Strategies
1. **Bracket Generation**: O(n log n) for seeding, O(n) for bracket creation
2. **Schedule Optimization**: Greedy algorithm with backtracking for conflicts
3. **Court Assignment**: Score-based assignment with load balancing
4. **Database**: Proper indexes on all foreign keys and query fields

### Caching
- Tournament state cached in Redis for 5 minutes
- Bracket structure cached until modification
- Live scores stored in Redis for real-time access

### Scalability
- Supports up to 128 teams per tournament
- Handles 1000+ concurrent WebSocket connections
- Horizontal scaling via Redis adapter
- Database partitioning by organization

## Testing

### Unit Tests
```bash
npm test tournaments
```

### Integration Tests
```bash
npm run test:e2e tournaments
```

### Load Testing
```bash
npm run test:load tournaments
```

## Security

### Authorization
- Tournament creation: Admin/League Admin only
- Score updates: Scorekeeper/Referee/Admin
- Team registration: Coach/Admin
- Public bracket viewing: Optional setting

### Data Validation
- All inputs validated with class-validator
- Team eligibility verification
- Duplicate registration prevention
- Score range validation

## Monitoring

### Metrics Tracked
- Tournament creation rate
- Average bracket generation time
- Schedule optimization duration
- WebSocket connection count
- Match completion rate

### Alerts
- Tournament start/completion
- Bracket generation failures
- Schedule conflicts
- Court availability issues

## Future Enhancements

1. **Advanced Features**
   - Swiss system tournaments
   - Handicap/rating systems
   - Multi-sport support
   - Tournament series/circuits

2. **Analytics**
   - Performance predictions
   - Upset tracking
   - Player statistics aggregation
   - Historical comparisons

3. **Integration**
   - Live streaming integration
   - Automated referee assignment
   - Payment processing for entry fees
   - Trophy/award management

## Support

For issues or questions, contact the development team or refer to the main project documentation.