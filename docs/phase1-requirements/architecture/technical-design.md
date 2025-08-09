# Technical Design Document (TDD)
## Basketball League Management Platform

**Document ID:** TDD-BLMP-001  
**Version:** 1.0  
**Date:** January 8, 2025  
**Author:** Lead Solutions Architect  
**Status:** Draft  
**Classification:** Technical Specification  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [API Design and Contracts](#2-api-design-and-contracts)
3. [Database Schema Design](#3-database-schema-design)
4. [Caching Strategy](#4-caching-strategy)
5. [Message Queue Design](#5-message-queue-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Real-time Communication](#7-real-time-communication)
8. [Service Implementation Details](#8-service-implementation-details)
9. [Error Handling & Resilience](#9-error-handling--resilience)
10. [Data Validation & Business Rules](#10-data-validation--business-rules)

---

## 1. Executive Summary

This Technical Design Document provides detailed specifications for implementing the Basketball League Management Platform. It translates high-level architecture into concrete technical implementations, API contracts, database schemas, and integration patterns.

### 1.1 Design Philosophy
- **API-First Development**: OpenAPI 3.0 specifications before implementation
- **Type Safety**: TypeScript throughout the stack
- **Event-Driven**: Asynchronous processing for scalability
- **Defensive Programming**: Comprehensive error handling
- **Clean Code**: SOLID principles and design patterns

---

## 2. API Design and Contracts

### 2.1 RESTful API Standards

All APIs follow REST principles with consistent conventions:

```yaml
openapi: 3.0.0
info:
  title: Basketball League Management API
  version: 1.0.0
  description: Core API for league management operations
servers:
  - url: https://api.basketballleague.com/v1
    description: Production server
  - url: https://staging-api.basketballleague.com/v1
    description: Staging server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: "VALIDATION_ERROR"
        message:
          type: string
          example: "Invalid input parameters"
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
          minimum: 1
          default: 1
        limit:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
        total:
          type: integer
        totalPages:
          type: integer
```

### 2.2 League Management API

```yaml
paths:
  /leagues:
    get:
      summary: List all leagues
      operationId: listLeagues
      tags:
        - Leagues
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, archived]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/League'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
    
    post:
      summary: Create a new league
      operationId: createLeague
      tags:
        - Leagues
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - startDate
                - endDate
                - registrationDeadline
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 100
                description:
                  type: string
                  maxLength: 500
                startDate:
                  type: string
                  format: date
                endDate:
                  type: string
                  format: date
                registrationDeadline:
                  type: string
                  format: date-time
                settings:
                  type: object
                  properties:
                    maxTeams:
                      type: integer
                      minimum: 4
                      maximum: 100
                    maxPlayersPerTeam:
                      type: integer
                      minimum: 5
                      maximum: 20
                    gameLength:
                      type: integer
                      description: Game length in minutes
                      default: 40
                    quarters:
                      type: integer
                      enum: [2, 4]
                      default: 4
      responses:
        '201':
          description: League created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/League'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

### 2.3 Game Operations API

```yaml
paths:
  /games/{gameId}/score:
    post:
      summary: Update game score
      operationId: updateScore
      tags:
        - Games
      security:
        - bearerAuth: []
      parameters:
        - name: gameId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - team
                - points
                - scoredBy
                - assistedBy
                - scoreType
              properties:
                team:
                  type: string
                  enum: [home, away]
                points:
                  type: integer
                  minimum: 1
                  maximum: 3
                scoredBy:
                  type: string
                  format: uuid
                  description: Player ID who scored
                assistedBy:
                  type: string
                  format: uuid
                  description: Player ID who assisted (optional)
                scoreType:
                  type: string
                  enum: [fieldGoal, threePointer, freeThrow]
                timestamp:
                  type: string
                  format: date-time
      responses:
        '200':
          description: Score updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  gameId:
                    type: string
                    format: uuid
                  currentScore:
                    type: object
                    properties:
                      home:
                        type: integer
                      away:
                        type: integer
                  quarter:
                    type: integer
                  timeRemaining:
                    type: string
        '409':
          description: Game not in progress
```

### 2.4 GraphQL API Schema

```graphql
type Query {
  # League queries
  league(id: ID!): League
  leagues(filter: LeagueFilter, pagination: PaginationInput): LeagueConnection!
  
  # Team queries
  team(id: ID!): Team
  teams(leagueId: ID!, divisionId: ID): [Team!]!
  
  # Player queries
  player(id: ID!): Player
  playerStats(playerId: ID!, seasonId: ID): PlayerStatistics
  
  # Game queries
  game(id: ID!): Game
  games(filter: GameFilter, pagination: PaginationInput): GameConnection!
  liveGames: [Game!]!
}

type Mutation {
  # League mutations
  createLeague(input: CreateLeagueInput!): League!
  updateLeague(id: ID!, input: UpdateLeagueInput!): League!
  
  # Team mutations
  createTeam(input: CreateTeamInput!): Team!
  addPlayerToRoster(teamId: ID!, playerId: ID!): Team!
  
  # Game mutations
  scheduleGame(input: ScheduleGameInput!): Game!
  startGame(gameId: ID!): Game!
  updateScore(gameId: ID!, score: ScoreUpdateInput!): Game!
  endGame(gameId: ID!): Game!
}

type Subscription {
  # Real-time subscriptions
  gameUpdates(gameId: ID!): GameUpdate!
  leagueNotifications(leagueId: ID!): Notification!
  playerStatUpdates(playerId: ID!): PlayerStatUpdate!
}

type League {
  id: ID!
  name: String!
  description: String
  startDate: Date!
  endDate: Date!
  status: LeagueStatus!
  divisions: [Division!]!
  teams: [Team!]!
  games: [Game!]!
  settings: LeagueSettings!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Team {
  id: ID!
  name: String!
  division: Division!
  coach: Coach!
  players: [Player!]!
  games: [Game!]!
  statistics: TeamStatistics!
  colorPrimary: String!
  colorSecondary: String!
}

type Game {
  id: ID!
  homeTeam: Team!
  awayTeam: Team!
  venue: Venue!
  scheduledTime: DateTime!
  status: GameStatus!
  score: Score
  statistics: GameStatistics
  officials: [Official!]!
  events: [GameEvent!]!
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  HALFTIME
  COMPLETED
  CANCELLED
  POSTPONED
}
```

---

## 3. Database Schema Design

### 3.1 Core Tables

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cognito_id ON users(cognito_id);

-- User Roles (RBAC)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    context_type VARCHAR(50) NOT NULL, -- 'league', 'team', 'system'
    context_id UUID, -- league_id or team_id
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'league_admin', 'coach', 'assistant_coach', 'parent', 'player', 'referee', 'scorekeeper')),
    UNIQUE(user_id, role, context_type, context_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_context ON user_roles(context_type, context_id);

-- Leagues
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    settings JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('draft', 'registration', 'active', 'completed', 'cancelled')),
    CONSTRAINT valid_dates CHECK (start_date <= end_date),
    CONSTRAINT valid_registration CHECK (registration_start < registration_end)
);

CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_dates ON leagues(start_date, end_date);

-- Divisions
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age_min INTEGER,
    age_max INTEGER,
    skill_level VARCHAR(50),
    max_teams INTEGER,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_age_range CHECK (age_min <= age_max),
    UNIQUE(league_id, name)
);

CREATE INDEX idx_divisions_league ON divisions(league_id);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    color_primary VARCHAR(7),
    color_secondary VARCHAR(7),
    home_venue_id UUID,
    roster_limit INTEGER DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_colors CHECK (color_primary ~* '^#[0-9A-Fa-f]{6}$' AND color_secondary ~* '^#[0-9A-Fa-f]{6}$'),
    UNIQUE(league_id, name)
);

CREATE INDEX idx_teams_league ON teams(league_id);
CREATE INDEX idx_teams_division ON teams(division_id);

-- Players
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    jersey_number VARCHAR(3),
    position VARCHAR(20),
    height_inches INTEGER,
    weight_lbs INTEGER,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_jersey CHECK (jersey_number ~* '^[0-9]{1,2}$'),
    UNIQUE(team_id, jersey_number)
);

CREATE INDEX idx_players_user ON players(user_id);
CREATE INDEX idx_players_team ON players(team_id);

-- Parent-Child Relationships (COPPA Compliance)
CREATE TABLE parent_child_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE,
    consent_ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_relationship CHECK (relationship_type IN ('parent', 'guardian', 'emergency_contact')),
    UNIQUE(parent_user_id, child_user_id)
);

CREATE INDEX idx_parent_child_parent ON parent_child_relationships(parent_user_id);
CREATE INDEX idx_parent_child_child ON parent_child_relationships(child_user_id);
```

### 3.2 Game Management Tables

```sql
-- Venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    facility_type VARCHAR(50),
    court_count INTEGER DEFAULT 1,
    amenities JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND 
        longitude BETWEEN -180 AND 180
    )
);

CREATE INDEX idx_venues_location ON venues USING GIST (
    ll_to_earth(latitude, longitude)
);

-- Games
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id),
    home_team_id UUID NOT NULL REFERENCES teams(id),
    away_team_id UUID NOT NULL REFERENCES teams(id),
    venue_id UUID REFERENCES venues(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    game_type VARCHAR(50) NOT NULL DEFAULT 'regular',
    period_length_minutes INTEGER DEFAULT 10,
    period_count INTEGER DEFAULT 4,
    current_period INTEGER,
    time_remaining_seconds INTEGER,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    notes TEXT,
    weather_conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'halftime', 'completed', 'cancelled', 'postponed')),
    CONSTRAINT valid_game_type CHECK (game_type IN ('regular', 'playoff', 'tournament', 'exhibition')),
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_games_league ON games(league_id);
CREATE INDEX idx_games_schedule ON games(scheduled_time);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);

-- Game Officials
CREATE TABLE game_officials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('referee', 'scorekeeper', 'timekeeper')),
    UNIQUE(game_id, user_id, role)
);

CREATE INDEX idx_game_officials_game ON game_officials(game_id);
CREATE INDEX idx_game_officials_user ON game_officials(user_id);

-- Game Events (for real-time updates and replay)
CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    team_id UUID REFERENCES teams(id),
    player_id UUID REFERENCES players(id),
    period INTEGER NOT NULL,
    game_clock_seconds INTEGER NOT NULL,
    points INTEGER,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'game_start', 'game_end', 'period_start', 'period_end',
        'field_goal', 'three_pointer', 'free_throw', 'rebound',
        'assist', 'steal', 'block', 'turnover', 'foul',
        'timeout', 'substitution', 'injury'
    ))
);

CREATE INDEX idx_game_events_game ON game_events(game_id, created_at);
CREATE INDEX idx_game_events_player ON game_events(player_id);
```

### 3.3 Statistics Tables

```sql
-- Player Game Statistics
CREATE TABLE player_game_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    minutes_played INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    three_pointers_made INTEGER DEFAULT 0,
    three_pointers_attempted INTEGER DEFAULT 0,
    free_throws_made INTEGER DEFAULT 0,
    free_throws_attempted INTEGER DEFAULT 0,
    offensive_rebounds INTEGER DEFAULT 0,
    defensive_rebounds INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    personal_fouls INTEGER DEFAULT 0,
    plus_minus INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id)
);

CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);

-- Team Game Statistics
CREATE TABLE team_game_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_home BOOLEAN NOT NULL,
    final_score INTEGER DEFAULT 0,
    q1_score INTEGER DEFAULT 0,
    q2_score INTEGER DEFAULT 0,
    q3_score INTEGER DEFAULT 0,
    q4_score INTEGER DEFAULT 0,
    overtime_score INTEGER DEFAULT 0,
    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    three_pointers_made INTEGER DEFAULT 0,
    three_pointers_attempted INTEGER DEFAULT 0,
    free_throws_made INTEGER DEFAULT 0,
    free_throws_attempted INTEGER DEFAULT 0,
    offensive_rebounds INTEGER DEFAULT 0,
    defensive_rebounds INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    team_fouls INTEGER DEFAULT 0,
    timeouts_used INTEGER DEFAULT 0,
    largest_lead INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, team_id)
);

CREATE INDEX idx_team_game_stats_game ON team_game_stats(game_id);
CREATE INDEX idx_team_game_stats_team ON team_game_stats(team_id);

-- Season Aggregated Statistics (Materialized View)
CREATE MATERIALIZED VIEW player_season_stats AS
SELECT 
    p.player_id,
    p.team_id,
    t.league_id,
    COUNT(DISTINCT p.game_id) as games_played,
    SUM(p.minutes_played) as total_minutes,
    SUM(p.points) as total_points,
    AVG(p.points)::DECIMAL(5,2) as ppg,
    SUM(p.field_goals_made) as total_fgm,
    SUM(p.field_goals_attempted) as total_fga,
    CASE 
        WHEN SUM(p.field_goals_attempted) > 0 
        THEN (SUM(p.field_goals_made)::DECIMAL / SUM(p.field_goals_attempted) * 100)::DECIMAL(5,2)
        ELSE 0 
    END as fg_percentage,
    SUM(p.offensive_rebounds + p.defensive_rebounds) as total_rebounds,
    AVG(p.offensive_rebounds + p.defensive_rebounds)::DECIMAL(5,2) as rpg,
    SUM(p.assists) as total_assists,
    AVG(p.assists)::DECIMAL(5,2) as apg,
    SUM(p.steals) as total_steals,
    SUM(p.blocks) as total_blocks,
    SUM(p.turnovers) as total_turnovers,
    SUM(p.personal_fouls) as total_fouls
FROM player_game_stats p
JOIN teams t ON p.team_id = t.id
GROUP BY p.player_id, p.team_id, t.league_id;

CREATE UNIQUE INDEX ON player_season_stats(player_id, team_id, league_id);
```

---

## 4. Caching Strategy

### 4.1 Redis Cache Structure

```typescript
// Cache key patterns and TTL configuration
export const CacheConfig = {
  // User session cache
  userSession: {
    key: (userId: string) => `session:${userId}`,
    ttl: 1800, // 30 minutes
  },
  
  // User profile cache
  userProfile: {
    key: (userId: string) => `user:${userId}`,
    ttl: 3600, // 1 hour
  },
  
  // League data cache
  league: {
    key: (leagueId: string) => `league:${leagueId}`,
    ttl: 300, // 5 minutes
  },
  
  // Live game cache (short TTL for real-time data)
  liveGame: {
    key: (gameId: string) => `game:live:${gameId}`,
    ttl: 10, // 10 seconds
  },
  
  // Game roster cache
  gameRoster: {
    key: (gameId: string, teamId: string) => `game:${gameId}:roster:${teamId}`,
    ttl: 600, // 10 minutes
  },
  
  // League standings cache
  standings: {
    key: (leagueId: string, divisionId?: string) => 
      divisionId ? `standings:${leagueId}:${divisionId}` : `standings:${leagueId}`,
    ttl: 300, // 5 minutes
  },
  
  // Player statistics cache
  playerStats: {
    key: (playerId: string, seasonId: string) => `stats:player:${playerId}:${seasonId}`,
    ttl: 900, // 15 minutes
  },
  
  // API rate limiting
  rateLimit: {
    key: (userId: string, endpoint: string) => `rate:${userId}:${endpoint}`,
    ttl: 60, // 1 minute window
  },
};
```

### 4.2 Cache Implementation

```typescript
import { Redis } from 'ioredis';
import { compress, decompress } from 'lz-string';

export class CacheService {
  private redis: Redis;
  private compressionThreshold = 1024; // Compress if > 1KB

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      // Check if data is compressed
      if (data.startsWith('LZ:')) {
        const decompressed = decompress(data.substring(3));
        return JSON.parse(decompressed);
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      let data = JSON.stringify(value);
      
      // Compress large values
      if (data.length > this.compressionThreshold) {
        data = 'LZ:' + compress(data);
      }

      if (ttl) {
        await this.redis.setex(key, ttl, data);
      } else {
        await this.redis.set(key, data);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateMultiple(patterns: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        pipeline.del(...keys);
      }
    }
    await pipeline.exec();
  }

  // Cache-aside pattern implementation
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    let value = await this.get<T>(key);
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }
    return value;
  }

  // Distributed lock for cache stampede prevention
  async acquireLock(resource: string, ttl: number = 5000): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const result = await this.redis.set(
      lockKey,
      Date.now(),
      'PX',
      ttl,
      'NX'
    );
    return result === 'OK';
  }

  async releaseLock(resource: string): Promise<void> {
    await this.redis.del(`lock:${resource}`);
  }
}
```

---

## 5. Message Queue Design

### 5.1 Event Types and Topics

```typescript
// Event type definitions
export enum EventTypes {
  // League events
  LEAGUE_CREATED = 'league.created',
  LEAGUE_UPDATED = 'league.updated',
  LEAGUE_REGISTRATION_OPENED = 'league.registration.opened',
  LEAGUE_REGISTRATION_CLOSED = 'league.registration.closed',
  
  // Team events
  TEAM_CREATED = 'team.created',
  TEAM_ROSTER_UPDATED = 'team.roster.updated',
  PLAYER_ADDED = 'team.player.added',
  PLAYER_REMOVED = 'team.player.removed',
  
  // Game events
  GAME_SCHEDULED = 'game.scheduled',
  GAME_STARTED = 'game.started',
  GAME_SCORE_UPDATED = 'game.score.updated',
  GAME_PERIOD_ENDED = 'game.period.ended',
  GAME_COMPLETED = 'game.completed',
  GAME_CANCELLED = 'game.cancelled',
  
  // Statistics events
  PLAYER_STAT_RECORDED = 'stats.player.recorded',
  TEAM_STAT_UPDATED = 'stats.team.updated',
  MILESTONE_ACHIEVED = 'stats.milestone.achieved',
  
  // Payment events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_PROCESSED = 'payment.refund.processed',
  
  // Notification events
  NOTIFICATION_SCHEDULED = 'notification.scheduled',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
}

// SQS Queue Configuration
export const QueueConfig = {
  gameProcessing: {
    name: 'game-processing-queue',
    visibilityTimeout: 300,
    messageRetentionPeriod: 1209600, // 14 days
    deadLetterQueue: 'game-processing-dlq',
    maxReceiveCount: 3,
  },
  
  notifications: {
    name: 'notification-queue',
    visibilityTimeout: 60,
    messageRetentionPeriod: 345600, // 4 days
    deadLetterQueue: 'notification-dlq',
    maxReceiveCount: 5,
  },
  
  analytics: {
    name: 'analytics-queue',
    visibilityTimeout: 120,
    messageRetentionPeriod: 604800, // 7 days
    deadLetterQueue: 'analytics-dlq',
    maxReceiveCount: 3,
  },
  
  payments: {
    name: 'payment-queue',
    visibilityTimeout: 180,
    messageRetentionPeriod: 1209600, // 14 days
    deadLetterQueue: 'payment-dlq',
    maxReceiveCount: 2,
  },
};
```

### 5.2 Event Publisher Implementation

```typescript
import { SNS } from 'aws-sdk';
import { SQS } from 'aws-sdk';
import { EventBridge } from 'aws-sdk';

export interface Event {
  id: string;
  type: EventTypes;
  source: string;
  timestamp: Date;
  data: any;
  metadata?: {
    userId?: string;
    correlationId?: string;
    version?: string;
  };
}

export class EventPublisher {
  private sns: SNS;
  private sqs: SQS;
  private eventBridge: EventBridge;

  constructor() {
    this.sns = new SNS({ region: process.env.AWS_REGION });
    this.sqs = new SQS({ region: process.env.AWS_REGION });
    this.eventBridge = new EventBridge({ region: process.env.AWS_REGION });
  }

  async publish(event: Event): Promise<void> {
    // Add correlation ID if not present
    if (!event.metadata?.correlationId) {
      event.metadata = {
        ...event.metadata,
        correlationId: this.generateCorrelationId(),
      };
    }

    // Route to appropriate service based on event type
    await this.routeEvent(event);
    
    // Store event for audit trail
    await this.storeEvent(event);
  }

  private async routeEvent(event: Event): Promise<void> {
    // Use EventBridge for event routing
    const params = {
      Entries: [
        {
          Source: event.source,
          DetailType: event.type,
          Detail: JSON.stringify(event),
          EventBusName: process.env.EVENT_BUS_NAME,
        },
      ],
    };

    try {
      await this.eventBridge.putEvents(params).promise();
    } catch (error) {
      console.error('Failed to publish event:', error);
      // Fallback to SQS for critical events
      await this.sendToQueue(event);
    }
  }

  private async sendToQueue(event: Event): Promise<void> {
    const queueUrl = this.getQueueUrl(event.type);
    
    const params = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.type,
        },
        correlationId: {
          DataType: 'String',
          StringValue: event.metadata?.correlationId || '',
        },
      },
    };

    await this.sqs.sendMessage(params).promise();
  }

  private getQueueUrl(eventType: EventTypes): string {
    // Route events to appropriate queues
    if (eventType.startsWith('game.')) {
      return process.env.GAME_QUEUE_URL!;
    } else if (eventType.startsWith('notification.')) {
      return process.env.NOTIFICATION_QUEUE_URL!;
    } else if (eventType.startsWith('payment.')) {
      return process.env.PAYMENT_QUEUE_URL!;
    } else if (eventType.startsWith('stats.')) {
      return process.env.ANALYTICS_QUEUE_URL!;
    }
    
    return process.env.DEFAULT_QUEUE_URL!;
  }

  private async storeEvent(event: Event): Promise<void> {
    // Store in DynamoDB for event sourcing
    // Implementation details in Event Store section
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## 6. Authentication & Authorization

### 6.1 JWT Token Structure

```typescript
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: Role[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface Role {
  name: string;
  context: 'system' | 'league' | 'team';
  contextId?: string;
  permissions: string[];
}

// Permission definitions
export const Permissions = {
  // League permissions
  LEAGUE_CREATE: 'league:create',
  LEAGUE_UPDATE: 'league:update',
  LEAGUE_DELETE: 'league:delete',
  LEAGUE_VIEW: 'league:view',
  
  // Team permissions
  TEAM_CREATE: 'team:create',
  TEAM_UPDATE: 'team:update',
  TEAM_DELETE: 'team:delete',
  TEAM_ROSTER_MANAGE: 'team:roster:manage',
  
  // Game permissions
  GAME_SCHEDULE: 'game:schedule',
  GAME_UPDATE: 'game:update',
  GAME_SCORE: 'game:score',
  GAME_OFFICIATE: 'game:officiate',
  
  // User permissions
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_VIEW: 'user:view',
  
  // Financial permissions
  PAYMENT_PROCESS: 'payment:process',
  PAYMENT_REFUND: 'payment:refund',
  FINANCIAL_VIEW: 'financial:view',
};
```

### 6.2 Authorization Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export class AuthMiddleware {
  private jwksClient: jwksClient.JwksClient;

  constructor() {
    this.jwksClient = jwksClient({
      jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = this.extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = await this.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  authorize = (requiredPermissions: string[]) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const user = req.user as JWTPayload;
      
      // Check if user has required permissions
      const hasPermission = requiredPermissions.every(permission =>
        this.userHasPermission(user, permission, req.params)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions,
        });
      }

      next();
    };
  };

  private userHasPermission(
    user: JWTPayload,
    permission: string,
    context: any
  ): boolean {
    // Check system-level permissions
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions with context
    for (const role of user.roles) {
      if (role.permissions.includes(permission)) {
        // Verify context if needed
        if (role.context === 'league' && context.leagueId) {
          return role.contextId === context.leagueId;
        }
        if (role.context === 'team' && context.teamId) {
          return role.contextId === context.teamId;
        }
        if (role.context === 'system') {
          return true;
        }
      }
    }

    return false;
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private async verifyToken(token: string): Promise<JWTPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token');
    }

    const key = await this.getSigningKey(decoded.header.kid);
    return jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      audience: process.env.COGNITO_CLIENT_ID,
    }) as JWTPayload;
  }

  private async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }
}
```

---

## 7. Real-time Communication

### 7.1 WebSocket Architecture

```typescript
import { Server as SocketServer, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

export class RealtimeService {
  private io: SocketServer;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(server: any) {
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    
    this.subClient = this.pubClient.duplicate();

    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Use Redis adapter for horizontal scaling
    this.io.adapter(createAdapter(this.pubClient, this.subClient));
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.use(this.authenticateSocket);

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Join user-specific room
      const userId = socket.data.userId;
      socket.join(`user:${userId}`);

      // Handle game subscriptions
      socket.on('subscribe:game', async (gameId: string) => {
        await this.subscribeToGame(socket, gameId);
      });

      socket.on('unsubscribe:game', async (gameId: string) => {
        await this.unsubscribeFromGame(socket, gameId);
      });

      // Handle live scoring
      socket.on('score:update', async (data: any) => {
        await this.handleScoreUpdate(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private async authenticateSocket(
    socket: Socket,
    next: (err?: Error) => void
  ): Promise<void> {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const user = await this.verifyToken(token);
      socket.data.userId = user.sub;
      socket.data.roles = user.roles;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  private async subscribeToGame(socket: Socket, gameId: string): Promise<void> {
    // Verify user has permission to view game
    const hasPermission = await this.checkGamePermission(
      socket.data.userId,
      gameId
    );

    if (!hasPermission) {
      socket.emit('error', { message: 'Permission denied' });
      return;
    }

    // Join game room
    socket.join(`game:${gameId}`);
    
    // Send current game state
    const gameState = await this.getGameState(gameId);
    socket.emit('game:state', gameState);
    
    console.log(`Socket ${socket.id} subscribed to game ${gameId}`);
  }

  private async unsubscribeFromGame(
    socket: Socket,
    gameId: string
  ): Promise<void> {
    socket.leave(`game:${gameId}`);
    console.log(`Socket ${socket.id} unsubscribed from game ${gameId}`);
  }

  private async handleScoreUpdate(socket: Socket, data: any): Promise<void> {
    const { gameId, update } = data;

    // Verify user is authorized to update scores
    if (!this.canUpdateScore(socket.data.roles, gameId)) {
      socket.emit('error', { message: 'Not authorized to update score' });
      return;
    }

    try {
      // Process score update
      const result = await this.processScoreUpdate(gameId, update);
      
      // Broadcast to all clients watching the game
      this.io.to(`game:${gameId}`).emit('score:updated', result);
      
      // Publish event for other services
      await this.publishGameEvent({
        type: 'SCORE_UPDATED',
        gameId,
        data: result,
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to update score' });
    }
  }

  // Broadcast methods for external services
  async broadcastGameUpdate(gameId: string, update: any): Promise<void> {
    this.io.to(`game:${gameId}`).emit('game:updated', update);
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  async broadcastToLeague(leagueId: string, event: string, data: any): Promise<void> {
    this.io.to(`league:${leagueId}`).emit(event, data);
  }

  // Helper methods
  private async verifyToken(token: string): Promise<any> {
    // JWT verification logic
    // Reuse from AuthMiddleware
  }

  private async checkGamePermission(
    userId: string,
    gameId: string
  ): Promise<boolean> {
    // Check if user is associated with the game
    // Query database for game participants
    return true; // Simplified
  }

  private canUpdateScore(roles: any[], gameId: string): boolean {
    // Check if user has scorekeeper or referee role for this game
    return roles.some(role => 
      role.name === 'scorekeeper' || role.name === 'referee'
    );
  }

  private async getGameState(gameId: string): Promise<any> {
    // Fetch current game state from cache or database
    const cacheKey = `game:live:${gameId}`;
    // Implementation details
  }

  private async processScoreUpdate(gameId: string, update: any): Promise<any> {
    // Validate and process score update
    // Update database and cache
    // Return updated game state
  }

  private async publishGameEvent(event: any): Promise<void> {
    // Publish to event bus for other services
    // Implementation details
  }
}
```

### 7.2 WebSocket Event Types

```typescript
// Client to Server Events
export interface ClientEvents {
  'subscribe:game': (gameId: string) => void;
  'unsubscribe:game': (gameId: string) => void;
  'subscribe:league': (leagueId: string) => void;
  'unsubscribe:league': (leagueId: string) => void;
  'score:update': (data: ScoreUpdateData) => void;
  'stat:record': (data: StatRecordData) => void;
  'game:timeout': (data: TimeoutData) => void;
  'game:substitution': (data: SubstitutionData) => void;
}

// Server to Client Events
export interface ServerEvents {
  'game:state': (state: GameState) => void;
  'game:updated': (update: GameUpdate) => void;
  'score:updated': (score: ScoreUpdate) => void;
  'stat:recorded': (stat: StatUpdate) => void;
  'game:started': (data: GameStartData) => void;
  'game:ended': (data: GameEndData) => void;
  'period:started': (data: PeriodData) => void;
  'period:ended': (data: PeriodData) => void;
  'notification': (notification: Notification) => void;
  'error': (error: ErrorMessage) => void;
}

// Data structures
export interface GameState {
  id: string;
  status: 'scheduled' | 'in_progress' | 'halftime' | 'completed';
  currentPeriod: number;
  timeRemaining: number;
  homeTeam: {
    id: string;
    name: string;
    score: number;
    timeouts: number;
  };
  awayTeam: {
    id: string;
    name: string;
    score: number;
    timeouts: number;
  };
  lastUpdate: Date;
}

export interface ScoreUpdateData {
  gameId: string;
  team: 'home' | 'away';
  points: number;
  scoredBy: string;
  assistedBy?: string;
  timestamp: Date;
}
```

---

## 8. Service Implementation Details

### 8.1 Base Service Class

```typescript
import { Express } from 'express';
import { Pool } from 'pg';
import { CacheService } from './cache-service';
import { EventPublisher } from './event-publisher';
import { Logger } from 'winston';

export abstract class BaseService {
  protected app: Express;
  protected db: Pool;
  protected cache: CacheService;
  protected events: EventPublisher;
  protected logger: Logger;

  constructor(app: Express) {
    this.app = app;
    this.db = this.initializeDatabase();
    this.cache = new CacheService();
    this.events = new EventPublisher();
    this.logger = this.initializeLogger();
    
    this.setupRoutes();
    this.setupErrorHandling();
  }

  protected abstract setupRoutes(): void;
  
  protected initializeDatabase(): Pool {
    return new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  protected initializeLogger(): Logger {
    // Winston logger configuration
    // Implementation details
  }

  protected setupErrorHandling(): void {
    this.app.use((err: any, req: any, res: any, next: any) => {
      this.logger.error('Unhandled error:', err);
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal server error',
          code: err.code || 'INTERNAL_ERROR',
        },
      });
    });
  }

  // Common database operations
  protected async executeQuery<T>(
    query: string,
    params: any[] = []
  ): Promise<T[]> {
    const client = await this.db.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  protected async executeTransaction<T>(
    operations: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await operations(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### 8.2 Game Service Implementation

```typescript
export class GameService extends BaseService {
  private realtimeService: RealtimeService;

  constructor(app: Express, realtimeService: RealtimeService) {
    super(app);
    this.realtimeService = realtimeService;
  }

  protected setupRoutes(): void {
    // Game management endpoints
    this.app.get('/games/:id', this.getGame.bind(this));
    this.app.post('/games', this.createGame.bind(this));
    this.app.put('/games/:id', this.updateGame.bind(this));
    this.app.post('/games/:id/start', this.startGame.bind(this));
    this.app.post('/games/:id/end', this.endGame.bind(this));
    
    // Scoring endpoints
    this.app.post('/games/:id/score', this.updateScore.bind(this));
    this.app.post('/games/:id/stats', this.recordStat.bind(this));
    
    // Game operations
    this.app.post('/games/:id/timeout', this.callTimeout.bind(this));
    this.app.post('/games/:id/substitution', this.makeSubstitution.bind(this));
  }

  private async getGame(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    try {
      // Check cache first
      const cacheKey = `game:${id}`;
      let game = await this.cache.get(cacheKey);
      
      if (!game) {
        // Query database
        const query = `
          SELECT 
            g.*,
            json_build_object(
              'id', ht.id,
              'name', ht.name,
              'logo_url', ht.logo_url
            ) as home_team,
            json_build_object(
              'id', at.id,
              'name', at.name,
              'logo_url', at.logo_url
            ) as away_team,
            json_build_object(
              'id', v.id,
              'name', v.name,
              'address', v.address
            ) as venue
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          LEFT JOIN venues v ON g.venue_id = v.id
          WHERE g.id = $1
        `;
        
        const result = await this.executeQuery(query, [id]);
        if (result.length === 0) {
          return res.status(404).json({ error: 'Game not found' });
        }
        
        game = result[0];
        await this.cache.set(cacheKey, game, 300); // Cache for 5 minutes
      }
      
      res.json(game);
    } catch (error) {
      this.logger.error('Error fetching game:', error);
      res.status(500).json({ error: 'Failed to fetch game' });
    }
  }

  private async updateScore(req: Request, res: Response): Promise<void> {
    const { id: gameId } = req.params;
    const { team, points, scoredBy, assistedBy, scoreType } = req.body;
    
    try {
      await this.executeTransaction(async (client) => {
        // Verify game is in progress
        const gameCheck = await client.query(
          'SELECT status, current_period FROM games WHERE id = $1',
          [gameId]
        );
        
        if (gameCheck.rows[0].status !== 'in_progress') {
          throw new Error('Game is not in progress');
        }
        
        // Update game score
        const scoreField = team === 'home' ? 'home_score' : 'away_score';
        await client.query(
          `UPDATE games SET ${scoreField} = ${scoreField} + $1, updated_at = NOW() WHERE id = $2`,
          [points, gameId]
        );
        
        // Record game event
        await client.query(
          `INSERT INTO game_events (
            game_id, event_type, team_id, player_id, 
            period, game_clock_seconds, points, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            gameId,
            scoreType,
            team === 'home' ? gameCheck.rows[0].home_team_id : gameCheck.rows[0].away_team_id,
            scoredBy,
            gameCheck.rows[0].current_period,
            0, // TODO: Get actual game clock
            points,
            JSON.stringify({ assistedBy })
          ]
        );
        
        // Update player statistics
        await this.updatePlayerStats(client, gameId, scoredBy, scoreType, points);
        if (assistedBy) {
          await this.updatePlayerStats(client, gameId, assistedBy, 'assist', 1);
        }
      });
      
      // Invalidate cache
      await this.cache.invalidate(`game:${gameId}*`);
      
      // Get updated game state
      const updatedGame = await this.getGameState(gameId);
      
      // Broadcast update via WebSocket
      await this.realtimeService.broadcastGameUpdate(gameId, {
        type: 'score_update',
        data: updatedGame,
      });
      
      // Publish event
      await this.events.publish({
        id: uuidv4(),
        type: EventTypes.GAME_SCORE_UPDATED,
        source: 'game-service',
        timestamp: new Date(),
        data: {
          gameId,
          team,
          points,
          scoredBy,
          assistedBy,
          scoreType,
          updatedScore: updatedGame.score,
        },
      });
      
      res.json({ success: true, game: updatedGame });
    } catch (error) {
      this.logger.error('Error updating score:', error);
      res.status(500).json({ error: error.message });
    }
  }

  private async updatePlayerStats(
    client: any,
    gameId: string,
    playerId: string,
    statType: string,
    value: number
  ): Promise<void> {
    const statMapping: Record<string, string> = {
      fieldGoal: 'field_goals_made',
      threePointer: 'three_pointers_made',
      freeThrow: 'free_throws_made',
      assist: 'assists',
      rebound: 'rebounds',
      steal: 'steals',
      block: 'blocks',
      turnover: 'turnovers',
    };
    
    const column = statMapping[statType];
    if (!column) return;
    
    await client.query(
      `INSERT INTO player_game_stats (game_id, player_id, ${column})
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id, player_id)
       DO UPDATE SET ${column} = player_game_stats.${column} + $3`,
      [gameId, playerId, value]
    );
  }
}
```

---

## 9. Error Handling & Resilience

### 9.1 Error Types and Codes

```typescript
export enum ErrorCodes {
  // Authentication errors (401)
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  
  // Authorization errors (403)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  
  // Validation errors (400)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors (404)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_CONFLICT = 'OPERATION_CONFLICT',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export class ApplicationError extends Error {
  constructor(
    public code: ErrorCodes,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
```

### 9.2 Circuit Breaker Implementation

```typescript
export class CircuitBreaker {
  private failures = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly successThreshold: number = 2
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new ApplicationError(
          ErrorCodes.EXTERNAL_SERVICE_ERROR,
          'Service temporarily unavailable',
          503
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() >= this.timeout
    );
  }
}
```

---

## 10. Data Validation & Business Rules

### 10.1 Validation Schemas

```typescript
import Joi from 'joi';

export const ValidationSchemas = {
  // League validation
  createLeague: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    registrationDeadline: Joi.date()
      .less(Joi.ref('startDate'))
      .required(),
    settings: Joi.object({
      maxTeams: Joi.number().min(4).max(100),
      maxPlayersPerTeam: Joi.number().min(5).max(20),
      gameLength: Joi.number().min(20).max(60),
      quarters: Joi.number().valid(2, 4),
    }),
  }),

  // Team validation
  createTeam: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    divisionId: Joi.string().uuid().required(),
    colorPrimary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    colorSecondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    rosterLimit: Joi.number().min(5).max(20),
  }),

  // Player registration
  registerPlayer: Joi.object({
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    dateOfBirth: Joi.date()
      .max('now')
      .required(),
    jerseyNumber: Joi.string().pattern(/^[0-9]{1,2}$/).required(),
    position: Joi.string().valid('PG', 'SG', 'SF', 'PF', 'C'),
    parentEmail: Joi.when('age', {
      is: Joi.number().less(13),
      then: Joi.string().email().required(),
      otherwise: Joi.string().email(),
    }),
  }),

  // Game scheduling
  scheduleGame: Joi.object({
    homeTeamId: Joi.string().uuid().required(),
    awayTeamId: Joi.string().uuid().required(),
    venueId: Joi.string().uuid().required(),
    scheduledTime: Joi.date().greater('now').required(),
    gameType: Joi.string().valid('regular', 'playoff', 'tournament'),
  }),

  // Score update
  updateScore: Joi.object({
    team: Joi.string().valid('home', 'away').required(),
    points: Joi.number().min(1).max(3).required(),
    scoredBy: Joi.string().uuid().required(),
    assistedBy: Joi.string().uuid(),
    scoreType: Joi.string()
      .valid('fieldGoal', 'threePointer', 'freeThrow')
      .required(),
  }),
};
```

### 10.2 Business Rules Engine

```typescript
export class BusinessRulesEngine {
  // League rules
  async validateLeagueCreation(data: any): Promise<void> {
    // Rule: Registration must close at least 7 days before league starts
    const registrationBuffer = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (
      new Date(data.startDate).getTime() -
      new Date(data.registrationDeadline).getTime() <
      registrationBuffer
    ) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        'Registration must close at least 7 days before league starts',
        400
      );
    }

    // Rule: League duration cannot exceed 6 months
    const maxDuration = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months
    if (
      new Date(data.endDate).getTime() -
      new Date(data.startDate).getTime() >
      maxDuration
    ) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        'League duration cannot exceed 6 months',
        400
      );
    }
  }

  // Team rules
  async validateTeamRegistration(
    teamData: any,
    leagueId: string
  ): Promise<void> {
    // Rule: Check if league registration is open
    const league = await this.getLeague(leagueId);
    if (league.status !== 'registration') {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'League registration is not open',
        409
      );
    }

    // Rule: Check team limit for division
    const teamCount = await this.getTeamCountForDivision(teamData.divisionId);
    const division = await this.getDivision(teamData.divisionId);
    if (teamCount >= division.maxTeams) {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'Division has reached maximum team capacity',
        409
      );
    }

    // Rule: Team name must be unique within league
    const existingTeam = await this.findTeamByName(leagueId, teamData.name);
    if (existingTeam) {
      throw new ApplicationError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Team name already exists in this league',
        409
      );
    }
  }

  // Player rules
  async validatePlayerRegistration(
    playerData: any,
    teamId: string
  ): Promise<void> {
    // Rule: Age eligibility for division
    const team = await this.getTeam(teamId);
    const division = await this.getDivision(team.divisionId);
    const age = this.calculateAge(playerData.dateOfBirth);
    
    if (age < division.ageMin || age > division.ageMax) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        `Player age must be between ${division.ageMin} and ${division.ageMax} for this division`,
        400
      );
    }

    // Rule: Roster limit check
    const rosterCount = await this.getRosterCount(teamId);
    if (rosterCount >= team.rosterLimit) {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'Team roster is full',
        409
      );
    }

    // Rule: Jersey number uniqueness
    const jerseyTaken = await this.isJerseyNumberTaken(
      teamId,
      playerData.jerseyNumber
    );
    if (jerseyTaken) {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'Jersey number is already taken',
        409
      );
    }

    // Rule: COPPA compliance for under 13
    if (age < 13 && !playerData.parentConsent) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        'Parental consent required for players under 13',
        400
      );
    }
  }

  // Game rules
  async validateGameScheduling(gameData: any): Promise<void> {
    // Rule: Teams must be in same division
    const homeTeam = await this.getTeam(gameData.homeTeamId);
    const awayTeam = await this.getTeam(gameData.awayTeamId);
    
    if (homeTeam.divisionId !== awayTeam.divisionId) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        'Teams must be in the same division',
        400
      );
    }

    // Rule: No back-to-back games (minimum 2 hours between games)
    const minGap = 2 * 60 * 60 * 1000; // 2 hours
    const homeTeamGames = await this.getTeamGamesNearTime(
      gameData.homeTeamId,
      gameData.scheduledTime,
      minGap
    );
    const awayTeamGames = await this.getTeamGamesNearTime(
      gameData.awayTeamId,
      gameData.scheduledTime,
      minGap
    );
    
    if (homeTeamGames.length > 0 || awayTeamGames.length > 0) {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'Teams must have at least 2 hours between games',
        409
      );
    }

    // Rule: Venue availability
    const venueConflict = await this.checkVenueAvailability(
      gameData.venueId,
      gameData.scheduledTime
    );
    if (venueConflict) {
      throw new ApplicationError(
        ErrorCodes.OPERATION_CONFLICT,
        'Venue is not available at the scheduled time',
        409
      );
    }

    // Rule: Phoenix heat restrictions (no outdoor games 10am-6pm June-August)
    if (await this.violatesHeatRestrictions(gameData)) {
      throw new ApplicationError(
        ErrorCodes.VALIDATION_FAILED,
        'Outdoor games cannot be scheduled between 10am-6pm during summer months',
        400
      );
    }
  }

  // Helper methods
  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private async violatesHeatRestrictions(gameData: any): Promise<boolean> {
    const venue = await this.getVenue(gameData.venueId);
    if (venue.facilityType !== 'outdoor') {
      return false;
    }

    const gameDate = new Date(gameData.scheduledTime);
    const month = gameDate.getMonth() + 1; // JavaScript months are 0-indexed
    const hour = gameDate.getHours();

    // June (6), July (7), August (8)
    if (month >= 6 && month <= 8) {
      // Between 10am and 6pm
      if (hour >= 10 && hour < 18) {
        return true;
      }
    }

    return false;
  }

  // Database query methods (simplified)
  private async getLeague(leagueId: string): Promise<any> {
    // Database query implementation
  }

  private async getDivision(divisionId: string): Promise<any> {
    // Database query implementation
  }

  private async getTeam(teamId: string): Promise<any> {
    // Database query implementation
  }

  private async getVenue(venueId: string): Promise<any> {
    // Database query implementation
  }

  private async getTeamCountForDivision(divisionId: string): Promise<number> {
    // Database query implementation
  }

  private async findTeamByName(leagueId: string, name: string): Promise<any> {
    // Database query implementation
  }

  private async getRosterCount(teamId: string): Promise<number> {
    // Database query implementation
  }

  private async isJerseyNumberTaken(
    teamId: string,
    jerseyNumber: string
  ): Promise<boolean> {
    // Database query implementation
  }

  private async getTeamGamesNearTime(
    teamId: string,
    time: string,
    gap: number
  ): Promise<any[]> {
    // Database query implementation
  }

  private async checkVenueAvailability(
    venueId: string,
    time: string
  ): Promise<boolean> {
    // Database query implementation
  }
}
```

---

## Appendices

### Appendix A: API Response Standards

All API responses follow a consistent format:

```typescript
// Success response
{
  "success": true,
  "data": { /* response data */ },
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "version": "1.0.0",
    "requestId": "uuid"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error context */ }
  },
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "version": "1.0.0",
    "requestId": "uuid"
  }
}

// Paginated response
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  },
  "metadata": { /* standard metadata */ }
}
```

### Appendix B: Database Indexes

Critical indexes for performance optimization:

```sql
-- User queries
CREATE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Game queries
CREATE INDEX idx_games_league_schedule ON games(league_id, scheduled_time);
CREATE INDEX idx_games_status_time ON games(status, scheduled_time) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_games_venue_time ON games(venue_id, scheduled_time);

-- Statistics queries
CREATE INDEX idx_player_stats_player_game ON player_game_stats(player_id, game_id);
CREATE INDEX idx_player_stats_points ON player_game_stats(points DESC);

-- Search indexes
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX idx_teams_search ON teams USING gin(to_tsvector('english', name));
```

### Appendix C: Environment Variables

Required environment variables for deployment:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=basketball_league
DB_USER=app_user
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# AWS
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Cognito
COGNITO_USER_POOL_ID=us-west-2_xxx
COGNITO_CLIENT_ID=xxx

# External Services
STRIPE_SECRET_KEY=sk_live_xxx
SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
FIREBASE_PROJECT_ID=xxx

# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1
JWT_SECRET=xxx
ENCRYPTION_KEY=xxx
```

---

*This Technical Design Document is a living artifact and will be updated as implementation progresses.*

**Document Control:**
- Review Cycle: Sprint boundaries
- Change Process: Technical review required
- Distribution: Development Team, QA Team, DevOps Team