# Basketball League Application - Project Context

## Project Overview
Building a basketball league management platform for the Phoenix market with 80+ youth basketball leagues and 3,500+ teams.

## Key Information
- **Timeline**: MVP in 24 hours
- **Budget**: Bootstrap/self-funded
- **Market**: Phoenix, Arizona (hot climate, indoor venues preferred)
- **Scale**: 80+ leagues, 3,500+ teams, 1000+ concurrent users on Saturdays

## User Personas
1. **League Administrators** - Manage schedules, teams, standings
2. **Coaches** - Track games, manage rosters, view stats
3. **Parents** - Follow games remotely, view schedules
4. **Players** (ages 6-18) - Check schedules, view stats
5. **Referees** - Access game assignments, submit reports
6. **Scorekeepers** - Record live scores, track fouls/timeouts
7. **Spectators** - View live scores, schedules

## Technical Constraints
- **Offline-first architecture required** (poor gym wifi)
- **Mobile-first design** (tablets/phones courtside)
- **Real-time updates** (scores must sync immediately)
- **High concurrent usage** (Saturday tournaments)

## Current Pain Points
- Manual scheduling processes
- Paper scoresheets
- Poor communication between stakeholders
- No real-time score updates

## Development Guidelines
- Use INVEST criteria for user stories
- Story format: "As a [persona], I want to [action], so that [benefit]"
- Acceptance criteria in Given/When/Then format
- Story points: 1, 2, 3, 5, or 8
- Priority levels: P0-Critical, P1-High, P2-Medium, P3-Low

## Basketball Domain Knowledge
- Games have quarters (youth) or halves (older divisions)
- Team fouls reset each quarter/half
- Bonus free throws after 7 team fouls
- Timeouts vary by age division
- Saturday tournaments have multiple simultaneous games

## Testing Commands
Please provide the following commands when available:
- Lint command (e.g., `npm run lint`)
- Type check command (e.g., `npm run typecheck`)
- Test command (e.g., `npm test`)
- Build command (e.g., `npm run build`)

## Architecture Decisions
- Offline-first with queue-based syncing
- Optimistic UI updates for scorekeeping
- WebSocket connections for real-time updates
- Progressive Web App for mobile access