# Entity Relationship Diagram (ERD)
## Basketball League Management Platform - Phase 2

**Document ID:** ERD-BLMP-001  
**Version:** 2.0  
**Date:** August 8, 2025  
**Author:** Sports Database Architect  
**Status:** Phase 2 Database Design  
**Classification:** Technical Architecture  

---

## Executive Summary

This Entity Relationship Diagram (ERD) document provides the complete data model for the Basketball League Management Platform Phase 2, designed to support 1000+ concurrent connections, sub-100ms query response times, and comprehensive basketball league operations including multi-tenant architecture, event sourcing, and real-time game statistics.

### Key Database Design Principles

- **Database Normalization**: 3NF/BCNF compliance for data integrity
- **Event Sourcing**: Complete audit trail for all game operations
- **Multi-Tenant Architecture**: Tenant isolation with shared infrastructure
- **Performance Optimization**: Strategic indexing and query optimization
- **COPPA Compliance**: Youth data protection and parental controls
- **Real-time Capabilities**: Live game updates and statistics
- **Scalability**: Partitioning and sharding for 100x growth

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Core Entity Model](#2-core-entity-model)
3. [Complete ERD Diagrams](#3-complete-erd-diagrams)
4. [Domain-Specific Models](#4-domain-specific-models)
5. [Event Sourcing Model](#5-event-sourcing-model)
6. [Multi-Tenant Architecture](#6-multi-tenant-architecture)
7. [Relationship Constraints](#7-relationship-constraints)
8. [Data Volume Estimates](#8-data-volume-estimates)

---

## 1. Database Overview

### 1.1 Database Architecture Context

```mermaid
graph TB
    subgraph "Database Architecture Layers"
        subgraph "Application Layer"
            API[REST APIs<br/>GraphQL<br/>WebSocket Connections]
        end
        
        subgraph "Service Layer"
            LEAGUE_SVC[League Management<br/>Service]
            GAME_SVC[Game Operations<br/>Service]
            USER_SVC[User Management<br/>Service]
            PAYMENT_SVC[Payment<br/>Service]
        end
        
        subgraph "Data Access Layer"
            REPO[Repository Pattern<br/>CQRS Implementation<br/>Event Store Interface]
        end
        
        subgraph "Database Layer"
            PRIMARY_DB[(Primary Database<br/>PostgreSQL 15<br/>Write Operations)]
            READ_REPLICAS[(Read Replicas<br/>Query Optimization<br/>Analytics)]
            EVENT_STORE[(Event Store<br/>Audit Trail<br/>Game Statistics)]
            CACHE[(Redis Cache<br/>Session Management<br/>Real-time Data)]
        end
    end
    
    API --> LEAGUE_SVC
    API --> GAME_SVC
    API --> USER_SVC
    API --> PAYMENT_SVC
    
    LEAGUE_SVC --> REPO
    GAME_SVC --> REPO
    USER_SVC --> REPO
    PAYMENT_SVC --> REPO
    
    REPO --> PRIMARY_DB
    REPO --> READ_REPLICAS
    REPO --> EVENT_STORE
    REPO --> CACHE
    
    PRIMARY_DB -.->|Replication| READ_REPLICAS
    GAME_SVC -.->|Events| EVENT_STORE
    
    style PRIMARY_DB fill:#ff6b35
    style READ_REPLICAS fill:#4ecdc4
    style EVENT_STORE fill:#45b7d1
    style CACHE fill:#96ceb4
```

### 1.2 Database Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Primary Database** | PostgreSQL | 15+ | OLTP operations, data consistency |
| **Read Replicas** | PostgreSQL | 15+ | Query optimization, read scaling |
| **Event Store** | PostgreSQL + Custom Schema | 15+ | Event sourcing, audit trail |
| **Cache Layer** | Redis | 7.0+ | Session management, real-time data |
| **Connection Pooling** | PgBouncer | 1.18+ | Connection optimization |
| **Monitoring** | pg_stat_statements | Built-in | Performance monitoring |

### 1.3 Multi-Tenant Architecture

```mermaid
graph TB
    subgraph "Multi-Tenant Data Model"
        subgraph "Shared Infrastructure"
            TENANT_MGR[Tenant Manager<br/>Organization Isolation<br/>Resource Allocation]
        end
        
        subgraph "Tenant A - Phoenix Youth Basketball"
            TENANT_A_LEAGUES[(Leagues<br/>Seasons<br/>Teams)]
            TENANT_A_GAMES[(Games<br/>Statistics<br/>Events)]
            TENANT_A_USERS[(Users<br/>Players<br/>Parents)]
        end
        
        subgraph "Tenant B - Desert Storm League"
            TENANT_B_LEAGUES[(Leagues<br/>Seasons<br/>Teams)]
            TENANT_B_GAMES[(Games<br/>Statistics<br/>Events)]
            TENANT_B_USERS[(Users<br/>Players<br/>Parents)]
        end
        
        subgraph "Shared Resources"
            SHARED_REF[(Reference Data<br/>Venues<br/>Rules<br/>Templates)]
            SHARED_AUDIT[(Audit Logs<br/>System Events<br/>Compliance)]
        end
    end
    
    TENANT_MGR --> TENANT_A_LEAGUES
    TENANT_MGR --> TENANT_A_GAMES
    TENANT_MGR --> TENANT_A_USERS
    
    TENANT_MGR --> TENANT_B_LEAGUES
    TENANT_MGR --> TENANT_B_GAMES
    TENANT_MGR --> TENANT_B_USERS
    
    TENANT_A_LEAGUES --> SHARED_REF
    TENANT_B_LEAGUES --> SHARED_REF
    
    TENANT_A_GAMES --> SHARED_AUDIT
    TENANT_B_GAMES --> SHARED_AUDIT
    
    style TENANT_MGR fill:#ff6b35
    style SHARED_REF fill:#ffeaa7
    style SHARED_AUDIT fill:#dda0dd
```

---

## 2. Core Entity Model

### 2.1 Primary Entities Overview

| Entity | Purpose | Cardinality | Key Relationships |
|--------|---------|-------------|-------------------|
| **Organization** | Multi-tenant root | 1:N | Leagues, Users, Venues |
| **League** | Competition structure | 1:N | Seasons, Divisions, Teams |
| **Season** | Time-bounded competition | 1:N | Games, Registrations |
| **Division** | Age/skill grouping | 1:N | Teams, Players |
| **Team** | Player collection | 1:N | Players, Games |
| **Player** | Individual participant | 1:N | Statistics, Events |
| **Game** | Match between teams | 1:N | Events, Statistics |
| **User** | System actor | 1:N | Players, Teams, Roles |
| **Venue** | Game location | 1:N | Games, Facilities |
| **Payment** | Financial transaction | 1:N | Registrations, Subscriptions |

### 2.2 Entity Attributes Summary

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        varchar name
        varchar slug
        text description
        varchar status
        jsonb settings
        jsonb contact_info
        timestamp created_at
        timestamp updated_at
        varchar created_by
    }
    
    LEAGUE {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar slug
        text description
        varchar sport
        varchar status
        jsonb rules
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    SEASON {
        uuid id PK
        uuid league_id FK
        varchar name
        date start_date
        date end_date
        date registration_deadline
        varchar status
        decimal registration_fee
        jsonb settings
        timestamp created_at
    }
    
    DIVISION {
        uuid id PK
        uuid league_id FK
        varchar name
        int min_age
        int max_age
        varchar skill_level
        int max_teams
        int max_players_per_team
        jsonb rules
        timestamp created_at
    }
    
    TEAM {
        uuid id PK
        uuid division_id FK
        uuid coach_id FK
        varchar name
        varchar slug
        text description
        jsonb colors
        varchar status
        timestamp created_at
        timestamp updated_at
    }
    
    PLAYER {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        varchar first_name
        varchar last_name
        date birth_date
        varchar gender
        varchar position
        int jersey_number
        varchar status
        jsonb emergency_contact
        timestamp created_at
        timestamp updated_at
    }
    
    USER {
        uuid id PK
        uuid organization_id FK
        varchar email
        varchar username
        varchar password_hash
        varchar first_name
        varchar last_name
        date birth_date
        varchar phone
        varchar status
        jsonb roles
        jsonb preferences
        boolean coppa_compliant
        uuid parent_id FK
        timestamp last_login
        timestamp created_at
        timestamp updated_at
    }
    
    GAME {
        uuid id PK
        uuid season_id FK
        uuid home_team_id FK
        uuid away_team_id FK
        uuid venue_id FK
        timestamp scheduled_time
        varchar status
        int home_score
        int away_score
        jsonb game_time
        jsonb weather_conditions
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }
    
    VENUE {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar type
        text address
        point location
        jsonb facilities
        jsonb availability
        jsonb contact_info
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    
    PAYMENT {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        varchar type
        decimal amount
        varchar currency
        varchar status
        varchar gateway_transaction_id
        varchar description
        jsonb metadata
        timestamp processed_at
        timestamp created_at
    }
```

---

## 3. Complete ERD Diagrams

### 3.1 Master ERD - All Entities

```mermaid
erDiagram
    %% Core Organization Structure
    ORGANIZATION ||--o{ LEAGUE : "organizes"
    ORGANIZATION ||--o{ USER : "manages"
    ORGANIZATION ||--o{ VENUE : "owns"
    ORGANIZATION ||--o{ PAYMENT : "processes"
    
    %% League Management Structure
    LEAGUE ||--o{ SEASON : "contains"
    LEAGUE ||--o{ DIVISION : "organizes"
    
    SEASON ||--o{ GAME : "schedules"
    SEASON ||--o{ TEAM_REGISTRATION : "includes"
    
    DIVISION ||--o{ TEAM : "groups"
    DIVISION ||--o{ PLAYER_ELIGIBILITY : "defines"
    
    %% Team and Player Structure
    TEAM ||--o{ PLAYER : "rostered"
    TEAM ||--o{ GAME : "home_team"
    TEAM ||--o{ GAME : "away_team"
    TEAM }|--|| USER : "coached_by"
    
    PLAYER }|--|| USER : "profile"
    PLAYER ||--o{ PLAYER_STATISTIC : "performance"
    PLAYER ||--o{ GAME_EVENT : "participates"
    
    %% User Management
    USER ||--o{ USER : "parent_child"
    USER ||--o{ USER_ROLE : "assigned"
    USER ||--o{ PARENTAL_CONSENT : "provides"
    USER ||--o{ PAYMENT : "makes"
    
    %% Game Operations
    GAME }|--|| VENUE : "played_at"
    GAME ||--o{ GAME_EVENT : "contains"
    GAME ||--o{ GAME_OFFICIAL : "officiated_by"
    GAME ||--o{ GAME_STATISTIC : "generates"
    
    %% Event Sourcing
    GAME_EVENT }|--|| EVENT_TYPE : "categorized"
    GAME_EVENT ||--o{ PLAYER_STATISTIC : "contributes_to"
    
    %% Payment and Registration
    TEAM_REGISTRATION }|--|| TEAM : "registers"
    TEAM_REGISTRATION }|--|| SEASON : "for_season"
    TEAM_REGISTRATION }|--|| PAYMENT : "payment_required"
    
    %% Compliance and Audit
    PARENTAL_CONSENT }|--|| USER : "child"
    PARENTAL_CONSENT }|--|| USER : "parent"
    AUDIT_LOG ||--o{ USER : "action_by"
    
    %% Reference Data
    VENUE_FACILITY }|--|| VENUE : "has"
    FACILITY_TYPE ||--o{ VENUE_FACILITY : "categorizes"
    
    %% Notifications and Communication
    NOTIFICATION }|--|| USER : "recipient"
    NOTIFICATION }|--|| NOTIFICATION_TYPE : "categorized"
    
    %% Tournament Structure (Extension)
    TOURNAMENT }|--|| LEAGUE : "part_of"
    TOURNAMENT ||--o{ TOURNAMENT_BRACKET : "structured"
    TOURNAMENT_BRACKET ||--o{ GAME : "includes"
```

### 3.2 League Management Domain ERD

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        varchar name
        varchar slug "URL-friendly identifier"
        text description
        varchar status "ACTIVE, SUSPENDED, ARCHIVED"
        jsonb settings "Organization-level configuration"
        jsonb contact_info "Contact details and social media"
        varchar subscription_tier "BASIC, PREMIUM, ENTERPRISE"
        timestamp trial_ends_at
        timestamp created_at
        timestamp updated_at
        varchar created_by FK
    }
    
    LEAGUE {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar slug
        text description
        varchar sport "BASKETBALL, SOCCER, etc."
        varchar status "DRAFT, ACTIVE, COMPLETED, ARCHIVED"
        jsonb rules "League-specific rules and regulations"
        jsonb settings "Scoring rules, game duration, etc."
        int max_teams_per_division
        decimal base_registration_fee
        varchar registration_currency "USD, CAD, etc."
        boolean public_stats "Public visibility of statistics"
        boolean allow_guest_viewing
        timestamp created_at
        timestamp updated_at
        varchar updated_by FK
    }
    
    SEASON {
        uuid id PK
        uuid league_id FK
        varchar name
        varchar slug
        text description
        date start_date
        date end_date
        date registration_start
        date registration_deadline
        varchar status "UPCOMING, REGISTRATION_OPEN, ACTIVE, COMPLETED"
        decimal registration_fee
        varchar currency
        jsonb settings "Season-specific overrides"
        int max_games_per_team
        boolean playoffs_enabled
        jsonb playoff_format
        timestamp created_at
        timestamp updated_at
    }
    
    DIVISION {
        uuid id PK
        uuid league_id FK
        varchar name
        varchar code "U12A, U14B, etc."
        text description
        int min_age
        int max_age
        varchar skill_level "BEGINNER, INTERMEDIATE, ADVANCED, COMPETITIVE"
        varchar gender "MALE, FEMALE, COED"
        int max_teams
        int min_teams_to_start
        int max_players_per_team
        int min_players_per_team
        jsonb rules "Division-specific rules"
        decimal additional_fee
        boolean requires_tryouts
        timestamp tryout_date
        timestamp created_at
        timestamp updated_at
    }
    
    LEAGUE_RULE {
        uuid id PK
        uuid league_id FK
        varchar category "GAME_PLAY, ELIGIBILITY, CONDUCT, SAFETY"
        varchar name
        text description
        text rule_text
        int priority "Display order"
        boolean active
        date effective_date
        date expiry_date
        timestamp created_at
        timestamp updated_at
    }
    
    SEASON_SCHEDULE {
        uuid id PK
        uuid season_id FK
        varchar name "Regular Season, Playoffs, Championship"
        date start_date
        date end_date
        varchar schedule_type "ROUND_ROBIN, ELIMINATION, LADDER"
        jsonb configuration
        varchar status "DRAFT, PUBLISHED, ACTIVE, COMPLETED"
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    ORGANIZATION ||--o{ LEAGUE : "organizes"
    LEAGUE ||--o{ SEASON : "contains"
    LEAGUE ||--o{ DIVISION : "organizes"
    LEAGUE ||--o{ LEAGUE_RULE : "governs"
    SEASON ||--o{ SEASON_SCHEDULE : "scheduled_in"
```

### 3.3 User Management Domain ERD

```mermaid
erDiagram
    USER {
        uuid id PK
        uuid organization_id FK
        varchar email UK "Unique within organization"
        varchar username UK "Unique within organization"
        varchar password_hash "Hashed password"
        varchar first_name
        varchar last_name
        date birth_date
        varchar gender "MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY"
        varchar phone
        varchar status "ACTIVE, INACTIVE, SUSPENDED, PENDING_VERIFICATION"
        jsonb preferences "UI preferences, notifications, etc."
        varchar language "en, es, fr, etc."
        varchar timezone "America/Phoenix, etc."
        boolean email_verified
        boolean phone_verified
        boolean coppa_compliant "COPPA compliance flag"
        uuid parent_id FK "For child accounts"
        text profile_image_url
        jsonb emergency_contact
        timestamp last_login
        timestamp password_changed_at
        timestamp created_at
        timestamp updated_at
        varchar created_by FK
    }
    
    USER_ROLE {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        varchar role "LEAGUE_ADMIN, COACH, PARENT, PLAYER, REFEREE, SCOREKEEPER"
        varchar context_type "LEAGUE, TEAM, DIVISION"
        uuid context_id "ID of league/team/division"
        jsonb permissions "Granular permissions within role"
        boolean active
        date effective_date
        date expiry_date
        varchar assigned_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    PARENTAL_CONSENT {
        uuid id PK
        uuid child_id FK "Child user ID"
        uuid parent_id FK "Parent user ID"
        varchar consent_type "REGISTRATION, PHOTO_VIDEO, COMMUNICATION, MARKETING"
        boolean granted
        varchar verification_method "EMAIL, SMS, DIGITAL_SIGNATURE, IN_PERSON"
        varchar verification_token
        jsonb consent_details "Specific permissions granted"
        date granted_date
        date expiry_date
        varchar ip_address "IP where consent was granted"
        varchar user_agent "Browser/app information"
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    
    USER_SESSION {
        uuid id PK
        uuid user_id FK
        varchar session_token UK
        varchar device_type "WEB, MOBILE_APP, API"
        varchar device_info "Browser/app details"
        varchar ip_address
        varchar location "City, State derived from IP"
        timestamp last_activity
        timestamp expires_at
        boolean active
        timestamp created_at
    }
    
    USER_PROFILE {
        uuid id PK
        uuid user_id FK
        text bio
        jsonb social_links
        jsonb achievements
        varchar skill_level "For players"
        varchar coaching_certification "For coaches"
        int years_experience
        jsonb availability "For officials"
        jsonb medical_info "Encrypted sensitive medical data"
        boolean public_profile
        timestamp created_at
        timestamp updated_at
    }
    
    NOTIFICATION_PREFERENCE {
        uuid id PK
        uuid user_id FK
        varchar category "GAME_UPDATES, TEAM_NEWS, SYSTEM, MARKETING"
        boolean email_enabled
        boolean sms_enabled
        boolean push_enabled
        boolean in_app_enabled
        varchar frequency "IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST"
        jsonb specific_settings
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    USER ||--o{ USER : "parent_child"
    USER ||--o{ USER_ROLE : "assigned"
    USER ||--o{ PARENTAL_CONSENT : "child_consents"
    USER ||--o{ PARENTAL_CONSENT : "parent_grants"
    USER ||--o{ USER_SESSION : "sessions"
    USER ||--|| USER_PROFILE : "profile"
    USER ||--o{ NOTIFICATION_PREFERENCE : "preferences"
```

### 3.4 Game Operations Domain ERD

```mermaid
erDiagram
    GAME {
        uuid id PK
        uuid season_id FK
        uuid home_team_id FK
        uuid away_team_id FK
        uuid venue_id FK
        varchar game_number "Game identifier within season"
        varchar game_type "REGULAR, PLAYOFF, CHAMPIONSHIP, SCRIMMAGE"
        timestamp scheduled_time
        varchar status "SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, FORFEITED"
        int home_score
        int away_score
        uuid winner_team_id FK "NULL for ties"
        jsonb game_time "Current game time structure"
        int period "Current period/quarter"
        varchar period_status "ACTIVE, BREAK, TIMEOUT, HALFTIME"
        jsonb weather_conditions "For outdoor games"
        decimal temperature_f "Heat safety tracking"
        text notes
        varchar cancelled_reason
        uuid forfeiting_team_id FK
        timestamp started_at
        timestamp completed_at
        varchar created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    GAME_EVENT {
        uuid id PK
        uuid game_id FK
        uuid event_type_id FK
        int sequence_number "Order of events in game"
        varchar period "Q1, Q2, Q3, Q4, OT, etc."
        varchar game_time "12:34 format"
        uuid team_id FK "Team associated with event"
        uuid player_id FK "Player associated with event"
        uuid assisting_player_id FK "For assists"
        jsonb event_data "Type-specific event data"
        text description "Human-readable description"
        varchar recorded_by FK "User who recorded event"
        timestamp recorded_at
        boolean system_generated "Auto-generated vs manual"
        timestamp created_at
    }
    
    EVENT_TYPE {
        varchar id PK "SCORE_2PT, SCORE_3PT, FREE_THROW, etc."
        varchar category "SCORE, FOUL, TIMEOUT, SUBSTITUTION, TECHNICAL"
        varchar name
        text description
        jsonb default_data "Default structure for event_data"
        boolean affects_score
        boolean affects_fouls
        boolean affects_statistics
        int display_order
        boolean active
        timestamp created_at
    }
    
    GAME_STATISTIC {
        uuid id PK
        uuid game_id FK
        uuid team_id FK
        uuid player_id FK
        varchar statistic_type "POINTS, REBOUNDS, ASSISTS, FOULS, etc."
        decimal value
        jsonb breakdown "Detailed breakdown if applicable"
        boolean official "Official vs calculated"
        varchar calculated_from "Event types used for calculation"
        timestamp calculated_at
        timestamp created_at
        timestamp updated_at
    }
    
    GAME_OFFICIAL {
        uuid id PK
        uuid game_id FK
        uuid user_id FK "Official user"
        varchar role "REFEREE, SCOREKEEPER, TIMEKEEPER"
        varchar status "ASSIGNED, CONFIRMED, NO_SHOW, REPLACED"
        decimal compensation "Payment for officiating"
        text notes
        timestamp assigned_at
        varchar assigned_by FK
        timestamp confirmed_at
        timestamp created_at
        timestamp updated_at
    }
    
    TEAM_GAME_STATS {
        uuid id PK
        uuid game_id FK
        uuid team_id FK
        int points
        int field_goals_made
        int field_goals_attempted
        int three_pointers_made
        int three_pointers_attempted
        int free_throws_made
        int free_throws_attempted
        int rebounds
        int assists
        int steals
        int blocks
        int turnovers
        int fouls
        int timeouts_used
        int timeouts_remaining
        jsonb advanced_stats "Additional calculated statistics"
        timestamp calculated_at
        timestamp created_at
        timestamp updated_at
    }
    
    PLAYER_GAME_STATS {
        uuid id PK
        uuid game_id FK
        uuid player_id FK
        int minutes_played
        int points
        int field_goals_made
        int field_goals_attempted
        int three_pointers_made
        int three_pointers_attempted
        int free_throws_made
        int free_throws_attempted
        int rebounds
        int assists
        int steals
        int blocks
        int turnovers
        int fouls
        boolean started_game
        jsonb substitutions "In/out times"
        jsonb advanced_stats
        timestamp calculated_at
        timestamp created_at
        timestamp updated_at
    }
    
    GAME_TIMELINE {
        uuid id PK
        uuid game_id FK
        varchar event_type "GAME_START, PERIOD_START, TIMEOUT, SUBSTITUTION, etc."
        timestamp event_time
        varchar game_clock "Time on game clock"
        uuid triggered_by FK "User who triggered event"
        jsonb event_details
        text description
        timestamp created_at
    }
    
    %% Relationships
    GAME ||--o{ GAME_EVENT : "contains"
    GAME ||--o{ GAME_OFFICIAL : "officiated_by"
    GAME ||--o{ TEAM_GAME_STATS : "team_performance"
    GAME ||--o{ PLAYER_GAME_STATS : "player_performance"
    GAME ||--o{ GAME_STATISTIC : "generates"
    GAME ||--o{ GAME_TIMELINE : "timeline"
    
    GAME_EVENT }|--|| EVENT_TYPE : "categorized"
    GAME_EVENT ||--o{ GAME_STATISTIC : "contributes_to"
```

### 3.5 Team and Player Domain ERD

```mermaid
erDiagram
    TEAM {
        uuid id PK
        uuid division_id FK
        uuid coach_id FK "Primary coach"
        varchar name
        varchar slug
        text description
        varchar team_code "Short identifier"
        jsonb colors "Primary, secondary colors"
        text logo_url
        varchar status "ACTIVE, INACTIVE, DISBANDED"
        int roster_size
        int max_roster_size
        jsonb contact_info "Team contact details"
        jsonb team_stats "Season aggregated stats"
        boolean public_roster
        timestamp founded_date
        timestamp created_at
        timestamp updated_at
    }
    
    PLAYER {
        uuid id PK
        uuid user_id FK "Link to user account"
        uuid team_id FK "Current team"
        varchar first_name
        varchar last_name
        date birth_date
        varchar gender
        varchar position "PG, SG, SF, PF, C"
        int jersey_number UK "Unique within team"
        decimal height_inches
        decimal weight_lbs
        varchar dominant_hand "LEFT, RIGHT, AMBIDEXTROUS"
        varchar status "ACTIVE, INACTIVE, INJURED, SUSPENDED"
        varchar eligibility_status "ELIGIBLE, INELIGIBLE, PENDING"
        jsonb medical_clearance "Encrypted medical data"
        jsonb emergency_contact
        text notes
        timestamp joined_team_at
        timestamp left_team_at
        timestamp created_at
        timestamp updated_at
    }
    
    TEAM_ROSTER {
        uuid id PK
        uuid team_id FK
        uuid player_id FK
        uuid season_id FK
        varchar status "ACTIVE, INACTIVE, TRANSFERRED"
        date joined_date
        date left_date
        varchar role "PLAYER, CAPTAIN, ASSISTANT_CAPTAIN"
        decimal registration_fee_paid
        boolean fee_paid_in_full
        varchar uniform_size
        timestamp created_at
        timestamp updated_at
    }
    
    TEAM_STAFF {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        varchar role "HEAD_COACH, ASSISTANT_COACH, TEAM_MANAGER, TRAINER"
        varchar status "ACTIVE, INACTIVE"
        jsonb qualifications "Certifications, experience"
        jsonb contact_info
        date start_date
        date end_date
        boolean background_check_completed
        date background_check_date
        timestamp created_at
        timestamp updated_at
    }
    
    PLAYER_STATISTIC {
        uuid id PK
        uuid player_id FK
        uuid season_id FK
        uuid team_id FK
        varchar period "SEASON, GAME, MONTH, etc."
        date period_start
        date period_end
        int games_played
        decimal minutes_per_game
        decimal points_per_game
        decimal rebounds_per_game
        decimal assists_per_game
        decimal steals_per_game
        decimal blocks_per_game
        decimal turnovers_per_game
        decimal field_goal_percentage
        decimal three_point_percentage
        decimal free_throw_percentage
        jsonb advanced_stats "PER, TS%, etc."
        timestamp calculated_at
        timestamp created_at
        timestamp updated_at
    }
    
    TEAM_STATISTIC {
        uuid id PK
        uuid team_id FK
        uuid season_id FK
        varchar period "SEASON, MONTH, etc."
        date period_start
        date period_end
        int games_played
        int wins
        int losses
        int ties
        decimal win_percentage
        decimal points_per_game
        decimal points_allowed_per_game
        decimal point_differential
        int home_wins
        int home_losses
        int away_wins
        int away_losses
        jsonb advanced_stats
        int league_rank
        int division_rank
        timestamp calculated_at
        timestamp created_at
        timestamp updated_at
    }
    
    PLAYER_DEVELOPMENT {
        uuid id PK
        uuid player_id FK
        uuid coach_id FK "Coach providing assessment"
        date assessment_date
        varchar assessment_type "SKILLS, FITNESS, ATTITUDE, GAME_IQ"
        jsonb skill_ratings "Specific skill assessments"
        text strengths
        text areas_for_improvement
        text goals
        text notes
        boolean shared_with_parent
        timestamp created_at
        timestamp updated_at
    }
    
    INJURY_REPORT {
        uuid id PK
        uuid player_id FK
        varchar injury_type "SPRAIN, STRAIN, FRACTURE, CONCUSSION, etc."
        varchar body_part "ANKLE, KNEE, SHOULDER, HEAD, etc."
        varchar severity "MINOR, MODERATE, MAJOR"
        varchar status "ACTIVE, RECOVERING, CLEARED"
        date injury_date
        date expected_return_date
        date actual_return_date
        text description
        text treatment_plan
        boolean requires_medical_clearance
        varchar reported_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    TEAM ||--o{ PLAYER : "rostered"
    TEAM ||--o{ TEAM_ROSTER : "roster_history"
    TEAM ||--o{ TEAM_STAFF : "staffed_by"
    TEAM ||--o{ TEAM_STATISTIC : "performance"
    
    PLAYER ||--o{ PLAYER_STATISTIC : "performance"
    PLAYER ||--o{ PLAYER_DEVELOPMENT : "development"
    PLAYER ||--o{ INJURY_REPORT : "injuries"
    PLAYER ||--o{ TEAM_ROSTER : "team_history"
```

---

## 4. Domain-Specific Models

### 4.1 Venue Management Model

```mermaid
erDiagram
    VENUE {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar venue_code "Short identifier"
        varchar type "INDOOR, OUTDOOR, HYBRID"
        text address
        varchar city
        varchar state
        varchar zip_code
        varchar country
        point location "PostGIS geometry"
        jsonb contact_info
        jsonb operating_hours
        boolean active
        decimal rental_cost_per_hour
        varchar currency
        int capacity
        boolean accessible "ADA compliant"
        text directions
        text parking_info
        timestamp created_at
        timestamp updated_at
    }
    
    COURT {
        uuid id PK
        uuid venue_id FK
        varchar name "Court A, Main Court, etc."
        varchar type "FULL, HALF, PRACTICE"
        varchar surface "HARDWOOD, SYNTHETIC, OUTDOOR"
        varchar size "REGULATION, YOUTH, CUSTOM"
        decimal length_feet
        decimal width_feet
        boolean active
        jsonb amenities "Scoreboard, sound system, etc."
        text maintenance_notes
        timestamp created_at
        timestamp updated_at
    }
    
    VENUE_AVAILABILITY {
        uuid id PK
        uuid venue_id FK
        uuid court_id FK
        varchar day_of_week "MONDAY, TUESDAY, etc."
        time start_time
        time end_time
        varchar availability_type "AVAILABLE, BLOCKED, MAINTENANCE"
        decimal cost_per_hour
        int priority "Booking priority"
        date effective_date
        date expiry_date
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    VENUE_BOOKING {
        uuid id PK
        uuid venue_id FK
        uuid court_id FK
        uuid game_id FK
        uuid event_id FK
        varchar booking_type "GAME, PRACTICE, EVENT, MAINTENANCE"
        timestamp start_time
        timestamp end_time
        varchar status "CONFIRMED, PENDING, CANCELLED"
        decimal cost
        varchar currency
        uuid booked_by FK
        text purpose
        jsonb setup_requirements
        text notes
        timestamp confirmed_at
        timestamp created_at
        timestamp updated_at
    }
    
    FACILITY {
        uuid id PK
        uuid venue_id FK
        varchar name "Restrooms, Concessions, Parking, etc."
        varchar type "AMENITY, SERVICE, UTILITY"
        text description
        int capacity
        boolean accessible
        varchar status "AVAILABLE, MAINTENANCE, OUT_OF_ORDER"
        jsonb operating_hours
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    VENUE ||--o{ COURT : "contains"
    VENUE ||--o{ VENUE_AVAILABILITY : "availability"
    VENUE ||--o{ VENUE_BOOKING : "bookings"
    VENUE ||--o{ FACILITY : "facilities"
    
    COURT ||--o{ VENUE_AVAILABILITY : "court_specific"
    COURT ||--o{ VENUE_BOOKING : "court_bookings"
```

### 4.2 Payment and Financial Model

```mermaid
erDiagram
    PAYMENT {
        uuid id PK
        uuid user_id FK "Payer"
        uuid organization_id FK
        varchar payment_type "REGISTRATION, SUBSCRIPTION, LATE_FEE, REFUND"
        uuid reference_id "Registration/subscription ID"
        decimal amount
        varchar currency
        varchar status "PENDING, COMPLETED, FAILED, REFUNDED"
        varchar gateway "STRIPE, PAYPAL, DWOLLA"
        varchar gateway_transaction_id
        varchar gateway_customer_id
        jsonb gateway_metadata
        varchar payment_method "CARD, ACH, WALLET"
        varchar last_four "Last 4 digits of card/account"
        varchar description
        text failure_reason
        decimal refunded_amount
        timestamp processed_at
        timestamp refunded_at
        varchar processed_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        varchar plan "BASIC, PREMIUM, FAMILY"
        varchar status "ACTIVE, CANCELLED, SUSPENDED, PAST_DUE"
        decimal amount
        varchar currency
        varchar billing_cycle "MONTHLY, QUARTERLY, ANNUALLY"
        date start_date
        date next_billing_date
        date cancelled_date
        varchar gateway_subscription_id
        jsonb plan_features
        decimal discount_amount
        varchar discount_code
        int billing_failures
        timestamp created_at
        timestamp updated_at
    }
    
    REGISTRATION_FEE {
        uuid id PK
        uuid season_id FK
        uuid division_id FK
        varchar fee_type "BASE, LATE, EARLY_BIRD, SIBLING_DISCOUNT"
        decimal amount
        varchar currency
        date effective_date
        date expiry_date
        text description
        jsonb conditions "Requirements for fee applicability"
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    
    REFUND {
        uuid id PK
        uuid payment_id FK
        decimal amount
        varchar currency
        varchar reason "CANCELLATION, ERROR, POLICY, DISPUTE"
        varchar status "PENDING, COMPLETED, FAILED"
        varchar gateway_refund_id
        text notes
        varchar processed_by FK
        timestamp requested_at
        timestamp processed_at
        timestamp created_at
    }
    
    PAYMENT_METHOD {
        uuid id PK
        uuid user_id FK
        varchar type "CARD, BANK_ACCOUNT, WALLET"
        varchar gateway "STRIPE, PAYPAL"
        varchar gateway_payment_method_id
        varchar last_four
        varchar brand "VISA, MASTERCARD, etc."
        int exp_month
        int exp_year
        boolean is_default
        varchar status "ACTIVE, EXPIRED, INVALID"
        timestamp created_at
        timestamp updated_at
    }
    
    INVOICE {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        varchar invoice_number UK
        varchar status "DRAFT, SENT, PAID, OVERDUE, CANCELLED"
        decimal subtotal
        decimal tax_amount
        decimal discount_amount
        decimal total_amount
        varchar currency
        date issue_date
        date due_date
        date paid_date
        text notes
        jsonb line_items
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    PAYMENT }|--|| USER : "paid_by"
    PAYMENT ||--o{ REFUND : "refunds"
    
    SUBSCRIPTION }|--|| USER : "subscriber"
    SUBSCRIPTION ||--o{ PAYMENT : "billing"
    
    USER ||--o{ PAYMENT_METHOD : "payment_methods"
    
    INVOICE }|--|| USER : "billed_to"
    INVOICE ||--o{ PAYMENT : "payments"
```

### 4.3 Communication and Notification Model

```mermaid
erDiagram
    NOTIFICATION {
        uuid id PK
        uuid recipient_id FK "User receiving notification"
        uuid organization_id FK
        varchar type "EMAIL, SMS, PUSH, IN_APP"
        varchar category "GAME_UPDATE, TEAM_NEWS, SYSTEM, EMERGENCY"
        varchar priority "LOW, NORMAL, HIGH, URGENT"
        varchar subject
        text message
        jsonb data "Structured notification data"
        varchar status "PENDING, SENT, DELIVERED, FAILED, READ"
        timestamp scheduled_for
        timestamp sent_at
        timestamp delivered_at
        timestamp read_at
        varchar gateway "SENDGRID, TWILIO, FIREBASE"
        varchar gateway_message_id
        text failure_reason
        int retry_count
        timestamp created_at
        timestamp updated_at
    }
    
    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        varchar message_type "TEXT, IMAGE, FILE, SYSTEM"
        text content
        jsonb attachments
        varchar status "SENT, DELIVERED, READ"
        boolean system_message
        uuid reply_to_id FK "For threaded messages"
        timestamp sent_at
        timestamp delivered_at
        timestamp read_at
        timestamp created_at
        timestamp updated_at
    }
    
    CONVERSATION {
        uuid id PK
        uuid organization_id FK
        varchar type "TEAM, PRIVATE, GROUP, ANNOUNCEMENT"
        varchar name
        text description
        uuid created_by FK
        jsonb participants "User IDs with roles"
        varchar status "ACTIVE, ARCHIVED, LOCKED"
        timestamp last_activity
        timestamp created_at
        timestamp updated_at
    }
    
    ANNOUNCEMENT {
        uuid id PK
        uuid organization_id FK
        varchar scope "ORGANIZATION, LEAGUE, TEAM, DIVISION"
        uuid scope_id FK "ID of league/team/division"
        varchar title
        text content
        varchar priority "NORMAL, HIGH, URGENT"
        varchar category "NEWS, SCHEDULE, POLICY, EMERGENCY"
        boolean sticky "Pin to top"
        timestamp publish_at
        timestamp expires_at
        uuid author_id FK
        varchar status "DRAFT, PUBLISHED, EXPIRED, ARCHIVED"
        int view_count
        jsonb attachments
        timestamp created_at
        timestamp updated_at
    }
    
    EMAIL_TEMPLATE {
        varchar id PK "welcome, game_reminder, etc."
        uuid organization_id FK
        varchar name
        varchar subject
        text html_content
        text text_content
        jsonb variables "Available template variables"
        varchar category "TRANSACTIONAL, MARKETING, SYSTEM"
        boolean active
        varchar language "en, es, fr"
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    NOTIFICATION }|--|| USER : "recipient"
    
    CONVERSATION ||--o{ MESSAGE : "contains"
    MESSAGE }|--|| USER : "sender"
    
    ANNOUNCEMENT }|--|| USER : "author"
```

---

## 5. Event Sourcing Model

### 5.1 Event Store Architecture

```mermaid
erDiagram
    EVENT_STREAM {
        uuid stream_id PK
        varchar stream_type "GAME, TEAM, USER, PAYMENT"
        varchar aggregate_id "ID of the aggregate"
        varchar aggregate_type "Game, Team, User, etc."
        int version "Current version of stream"
        timestamp created_at
        timestamp updated_at
    }
    
    EVENT {
        uuid id PK
        uuid stream_id FK
        int sequence_number "Order within stream"
        varchar event_type "GameStarted, PlayerScored, etc."
        varchar event_version "v1, v2 for schema evolution"
        jsonb event_data "Event payload"
        jsonb metadata "Context, correlation IDs, etc."
        uuid correlation_id "Group related events"
        uuid causation_id "Event that caused this event"
        varchar user_id "User who triggered event"
        timestamp occurred_at "When event actually occurred"
        timestamp recorded_at "When event was persisted"
        text checksum "Data integrity verification"
    }
    
    SNAPSHOT {
        uuid id PK
        uuid stream_id FK
        int version "Stream version at snapshot"
        varchar aggregate_type
        jsonb aggregate_data "Complete aggregate state"
        timestamp created_at
        text checksum
    }
    
    PROJECTION {
        varchar id PK "game_statistics, player_rankings, etc."
        varchar name
        text description
        varchar status "ACTIVE, REBUILDING, ERROR"
        jsonb configuration
        bigint last_processed_position "Global event position"
        timestamp last_processed_at
        int error_count
        text last_error
        timestamp created_at
        timestamp updated_at
    }
    
    EVENT_SUBSCRIPTION {
        uuid id PK
        varchar subscription_name
        varchar event_types "Comma-separated event types"
        varchar status "ACTIVE, PAUSED, ERROR"
        bigint checkpoint "Last processed position"
        varchar endpoint_url "Webhook URL or queue name"
        jsonb settings "Retry, timeout settings"
        int failure_count
        timestamp last_success
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    EVENT_STREAM ||--o{ EVENT : "contains"
    EVENT_STREAM ||--o{ SNAPSHOT : "snapshots"
```

### 5.2 Game Event Sourcing

```mermaid
erDiagram
    GAME_EVENT_STREAM {
        uuid game_id PK
        varchar status "IN_PROGRESS, COMPLETED, CANCELLED"
        int event_count
        timestamp last_event_at
        uuid last_event_id
        jsonb current_state "Cached current state"
        timestamp created_at
        timestamp updated_at
    }
    
    GAME_EVENT {
        uuid id PK
        uuid game_id FK
        int sequence_number
        varchar event_type
        timestamp game_time "Time on game clock"
        varchar period "Q1, Q2, Q3, Q4, OT"
        uuid team_id FK
        uuid player_id FK
        jsonb event_data
        varchar recorded_by FK
        timestamp occurred_at
        timestamp recorded_at
        boolean replayed "For event replay scenarios"
    }
    
    GAME_STATE_PROJECTION {
        uuid game_id PK
        int home_score
        int away_score
        varchar period
        varchar period_time
        varchar status
        jsonb team_fouls
        jsonb player_fouls
        jsonb timeouts
        jsonb substitutions
        int last_processed_sequence
        timestamp last_updated
    }
    
    PLAYER_STATISTICS_PROJECTION {
        uuid id PK
        uuid game_id FK
        uuid player_id FK
        int points
        int field_goals_made
        int field_goals_attempted
        int three_pointers_made
        int three_pointers_attempted
        int free_throws_made
        int free_throws_attempted
        int rebounds
        int assists
        int steals
        int blocks
        int turnovers
        int fouls
        int minutes_played
        int last_processed_sequence
        timestamp last_updated
    }
    
    TEAM_STATISTICS_PROJECTION {
        uuid id PK
        uuid game_id FK
        uuid team_id FK
        int points
        int field_goals_made
        int field_goals_attempted
        int three_pointers_made
        int three_pointers_attempted
        int free_throws_made
        int free_throws_attempted
        int rebounds
        int assists
        int steals
        int blocks
        int turnovers
        int fouls
        int timeouts_used
        int last_processed_sequence
        timestamp last_updated
    }
    
    %% Relationships
    GAME_EVENT_STREAM ||--o{ GAME_EVENT : "events"
    GAME_EVENT_STREAM ||--|| GAME_STATE_PROJECTION : "current_state"
    GAME_EVENT ||--o{ PLAYER_STATISTICS_PROJECTION : "updates"
    GAME_EVENT ||--o{ TEAM_STATISTICS_PROJECTION : "updates"
```

---

## 6. Multi-Tenant Architecture

### 6.1 Tenant Management

```mermaid
erDiagram
    TENANT {
        uuid id PK
        varchar name
        varchar domain "subdomain or custom domain"
        varchar status "ACTIVE, SUSPENDED, TRIAL, EXPIRED"
        varchar tier "BASIC, PREMIUM, ENTERPRISE"
        jsonb features "Enabled features for tenant"
        jsonb limits "Resource limits"
        jsonb settings "Tenant-specific configuration"
        varchar database_schema "Dedicated schema name"
        varchar storage_bucket "S3 bucket or equivalent"
        date trial_ends_at
        timestamp created_at
        timestamp updated_at
    }
    
    TENANT_USER {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK "Global user ID"
        varchar local_username "Username within tenant"
        varchar local_email "Email within tenant"
        jsonb tenant_specific_data
        varchar status "ACTIVE, INACTIVE, INVITED"
        timestamp joined_at
        timestamp created_at
    }
    
    TENANT_RESOURCE_USAGE {
        uuid id PK
        uuid tenant_id FK
        date usage_date
        varchar resource_type "STORAGE, BANDWIDTH, USERS, GAMES"
        decimal usage_amount
        varchar unit "GB, MB, COUNT"
        decimal cost
        varchar currency
        timestamp recorded_at
    }
    
    TENANT_BILLING {
        uuid id PK
        uuid tenant_id FK
        varchar billing_period "MONTHLY, ANNUALLY"
        decimal base_cost
        decimal usage_cost
        decimal total_cost
        varchar currency
        date billing_date
        varchar status "PENDING, PAID, OVERDUE"
        uuid payment_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relationships
    TENANT ||--o{ TENANT_USER : "users"
    TENANT ||--o{ TENANT_RESOURCE_USAGE : "usage"
    TENANT ||--o{ TENANT_BILLING : "billing"
```

### 6.2 Data Isolation Strategy

```mermaid
graph TB
    subgraph "Multi-Tenant Data Architecture"
        subgraph "Tenant A Schema"
            TA_LEAGUES[(leagues)]
            TA_TEAMS[(teams)]
            TA_GAMES[(games)]
            TA_USERS[(users)]
        end
        
        subgraph "Tenant B Schema"
            TB_LEAGUES[(leagues)]
            TB_TEAMS[(teams)]
            TB_GAMES[(games)]
            TB_USERS[(users)]
        end
        
        subgraph "Shared Schema"
            SHARED_VENUES[(venues)]
            SHARED_EVENTS[(event_store)]
            SHARED_TEMPLATES[(email_templates)]
            SHARED_LOOKUP[(lookup_tables)]
        end
        
        subgraph "System Schema"
            SYS_TENANTS[(tenants)]
            SYS_USERS[(global_users)]
            SYS_AUDIT[(audit_logs)]
            SYS_METRICS[(system_metrics)]
        end
    end
    
    TA_LEAGUES --> SHARED_VENUES
    TA_GAMES --> SHARED_EVENTS
    
    TB_LEAGUES --> SHARED_VENUES
    TB_GAMES --> SHARED_EVENTS
    
    SYS_TENANTS --> TA_LEAGUES
    SYS_TENANTS --> TB_LEAGUES
    
    style TA_LEAGUES fill:#ff6b35
    style TB_LEAGUES fill:#4ecdc4
    style SHARED_VENUES fill:#ffeaa7
    style SYS_TENANTS fill:#dda0dd
```

---

## 7. Relationship Constraints

### 7.1 Primary Key and Foreign Key Constraints

| Table | Primary Key | Foreign Key Constraints |
|-------|-------------|-------------------------|
| **organization** | id (UUID) | created_by → user(id) |
| **league** | id (UUID) | organization_id → organization(id) |
| **season** | id (UUID) | league_id → league(id) |
| **division** | id (UUID) | league_id → league(id) |
| **team** | id (UUID) | division_id → division(id), coach_id → user(id) |
| **player** | id (UUID) | user_id → user(id), team_id → team(id) |
| **game** | id (UUID) | season_id → season(id), home_team_id → team(id), away_team_id → team(id), venue_id → venue(id) |
| **user** | id (UUID) | organization_id → organization(id), parent_id → user(id) |
| **venue** | id (UUID) | organization_id → organization(id) |
| **payment** | id (UUID) | user_id → user(id), organization_id → organization(id) |

### 7.2 Unique Constraints

| Table | Unique Constraints | Purpose |
|-------|-------------------|---------|
| **organization** | slug | URL-friendly unique identifier |
| **league** | (organization_id, slug) | Unique within organization |
| **season** | (league_id, slug) | Unique within league |
| **team** | (division_id, name) | Unique team name within division |
| **player** | (team_id, jersey_number) | Unique jersey numbers |
| **user** | (organization_id, email) | Unique email within tenant |
| **user** | (organization_id, username) | Unique username within tenant |
| **venue** | (organization_id, name) | Unique venue names |

### 7.3 Check Constraints

| Table | Check Constraints | Business Rule |
|-------|------------------|---------------|
| **division** | min_age >= 6 AND max_age <= 18 | Youth league age limits |
| **division** | min_age < max_age | Valid age range |
| **player** | birth_date <= CURRENT_DATE - INTERVAL '6 years' | Minimum age requirement |
| **game** | home_team_id != away_team_id | Teams cannot play themselves |
| **game** | home_score >= 0 AND away_score >= 0 | Non-negative scores |
| **payment** | amount > 0 | Positive payment amounts |
| **user** | CASE WHEN birth_date <= CURRENT_DATE - INTERVAL '13 years' THEN parent_id IS NULL ELSE parent_id IS NOT NULL END | COPPA compliance |

---

## 8. Data Volume Estimates

### 8.1 Growth Projections

| Entity | Year 1 | Year 3 | Year 5 | Growth Rate |
|--------|--------|--------|--------|-------------|
| **Organizations** | 50 | 500 | 2,000 | 100x over 5 years |
| **Users** | 5,000 | 50,000 | 200,000 | 40x over 5 years |
| **Players** | 2,000 | 20,000 | 80,000 | 40x over 5 years |
| **Teams** | 200 | 2,000 | 8,000 | 40x over 5 years |
| **Games per Season** | 1,000 | 10,000 | 40,000 | 40x over 5 years |
| **Events per Game** | 150 avg | 150 avg | 150 avg | Stable per game |
| **Total Events/Year** | 150K | 1.5M | 6M | 40x over 5 years |

### 8.2 Storage Requirements

| Data Category | Year 1 (GB) | Year 3 (GB) | Year 5 (GB) | Notes |
|---------------|-------------|-------------|-------------|-------|
| **Core Data** | 2 | 20 | 80 | Organizations, users, teams |
| **Game Events** | 5 | 50 | 200 | Event sourcing data |
| **Statistics** | 3 | 30 | 120 | Calculated statistics |
| **Media Files** | 10 | 200 | 1,000 | Photos, videos, documents |
| **Audit Logs** | 1 | 15 | 75 | Compliance and security logs |
| **Backups** | 21 | 315 | 1,475 | 1.5x production data |
| **Total** | 42 | 630 | 2,950 | Includes all data and backups |

### 8.3 Query Volume Estimates

| Query Type | Peak QPS Year 1 | Peak QPS Year 3 | Peak QPS Year 5 | Scaling Factor |
|------------|-----------------|-----------------|-----------------|----------------|
| **User Authentication** | 50 | 500 | 2,000 | 40x |
| **Game State Updates** | 20 | 200 | 800 | 40x |
| **Statistics Queries** | 100 | 1,000 | 4,000 | 40x |
| **Search Operations** | 30 | 300 | 1,200 | 40x |
| **Reporting Queries** | 10 | 100 | 400 | 40x |
| **Real-time Updates** | 200 | 2,000 | 8,000 | 40x |
| **Total Peak QPS** | 410 | 4,100 | 16,400 | 40x |

---

This comprehensive ERD provides the complete data model foundation for the Basketball League Management Platform Phase 2, designed to support all functional requirements while maintaining performance, security, and compliance standards.