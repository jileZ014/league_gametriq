-- ============================================================================
-- Basketball League Management Platform - Phase 2
-- PostgreSQL Database Schema (DDL Scripts)
-- ============================================================================
-- Document ID: SCHEMA-BLMP-001
-- Version: 2.0
-- Date: August 8, 2025
-- Author: Sports Database Architect
-- Status: Phase 2 Database Schema Implementation
-- Classification: Technical Implementation
-- ============================================================================

-- Enable required PostgreSQL extensions
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostGIS for geographic data (venues, locations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Advanced indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- JSON query functions
CREATE EXTENSION IF NOT EXISTS jsonb_plperl;

-- Performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- Custom Types and Domains
-- ============================================================================

-- Status Types
CREATE TYPE organization_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'TRIAL');
CREATE TYPE league_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE season_status AS ENUM ('UPCOMING', 'REGISTRATION_OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE team_status AS ENUM ('ACTIVE', 'INACTIVE', 'DISBANDED', 'SUSPENDED');
CREATE TYPE player_status AS ENUM ('ACTIVE', 'INACTIVE', 'INJURED', 'SUSPENDED', 'TRANSFERRED');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'ARCHIVED');

-- Game and Event Types
CREATE TYPE game_status AS ENUM ('SCHEDULED', 'DELAYED', 'IN_PROGRESS', 'HALFTIME', 'COMPLETED', 'CANCELLED', 'FORFEITED', 'POSTPONED');
CREATE TYPE game_type AS ENUM ('REGULAR', 'PLAYOFF', 'CHAMPIONSHIP', 'SCRIMMAGE', 'TOURNAMENT');
CREATE TYPE event_category AS ENUM ('SCORE', 'FOUL', 'TIMEOUT', 'SUBSTITUTION', 'TECHNICAL', 'INJURY', 'GAME_CONTROL');

-- Sports and Skill Levels
CREATE TYPE sport AS ENUM ('BASKETBALL', 'SOCCER', 'BASEBALL', 'VOLLEYBALL', 'SOFTBALL', 'FOOTBALL');
CREATE TYPE skill_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE', 'RECREATIONAL');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'COED', 'OTHER', 'PREFER_NOT_TO_SAY');

-- User Roles
CREATE TYPE user_role AS ENUM ('SYSTEM_ADMIN', 'ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH', 'ASSISTANT_COACH', 'PARENT', 'PLAYER', 'REFEREE', 'SCOREKEEPER', 'VOLUNTEER');

-- Payment Types
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE payment_type AS ENUM ('REGISTRATION', 'SUBSCRIPTION', 'LATE_FEE', 'TOURNAMENT_ENTRY', 'MERCHANDISE', 'REFUND');
CREATE TYPE payment_method AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY', 'CASH', 'CHECK');

-- Notification Types
CREATE TYPE notification_type AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK');
CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');
CREATE TYPE notification_category AS ENUM ('GAME_UPDATE', 'TEAM_NEWS', 'REGISTRATION', 'PAYMENT', 'SYSTEM', 'MARKETING', 'SAFETY', 'WEATHER');

-- Venue Types
CREATE TYPE venue_type AS ENUM ('INDOOR', 'OUTDOOR', 'HYBRID', 'VIRTUAL');
CREATE TYPE court_type AS ENUM ('FULL_COURT', 'HALF_COURT', 'PRACTICE', 'SKILLS');
CREATE TYPE surface_type AS ENUM ('HARDWOOD', 'SYNTHETIC', 'CONCRETE', 'ASPHALT', 'TURF');

-- Custom Domains for Data Validation
CREATE DOMAIN email_address AS TEXT 
CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN phone_number AS TEXT 
CHECK (VALUE ~ '^\+?[1-9]\d{1,14}$');

CREATE DOMAIN url_slug AS TEXT 
CHECK (VALUE ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(VALUE) >= 2 AND length(VALUE) <= 100);

CREATE DOMAIN percentage AS DECIMAL(5,4) 
CHECK (VALUE >= 0 AND VALUE <= 1);

CREATE DOMAIN currency_amount AS DECIMAL(10,2) 
CHECK (VALUE >= 0);

CREATE DOMAIN age_years AS INTEGER 
CHECK (VALUE >= 6 AND VALUE <= 25);

CREATE DOMAIN jersey_number AS INTEGER 
CHECK (VALUE >= 0 AND VALUE <= 99);

-- ============================================================================
-- Multi-Tenant Foundation
-- ============================================================================

-- Organizations Table (Tenant Root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug url_slug NOT NULL UNIQUE,
    description TEXT,
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'BASIC',
    settings JSONB NOT NULL DEFAULT '{}',
    contact_info JSONB NOT NULL DEFAULT '{}',
    address JSONB,
    billing_info JSONB,
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    logo_url TEXT,
    website_url TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Phoenix',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT org_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT org_valid_timezone CHECK (timezone IN (
        'America/Phoenix', 'America/New_York', 'America/Chicago', 
        'America/Denver', 'America/Los_Angeles', 'UTC'
    ))
);

-- Organization Settings Management
CREATE TABLE organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    data_type VARCHAR(50) NOT NULL DEFAULT 'string',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, category, setting_key),
    CONSTRAINT valid_data_type CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array'))
);

-- ============================================================================
-- User Management and Identity
-- ============================================================================

-- Users Table (Global Users with Multi-Tenant Support)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email email_address NOT NULL,
    username VARCHAR(100),
    password_hash VARCHAR(255), -- NULL for social logins
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender gender_type,
    phone phone_number,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    preferences JSONB NOT NULL DEFAULT '{}',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Phoenix',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    coppa_compliant BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    profile_image_url TEXT,
    emergency_contact JSONB,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, username),
    CONSTRAINT user_name_length CHECK (
        length(first_name) >= 1 AND length(first_name) <= 100 AND
        length(last_name) >= 1 AND length(last_name) <= 100
    ),
    CONSTRAINT user_adult_parent CHECK (
        CASE 
            WHEN birth_date IS NOT NULL AND birth_date > CURRENT_DATE - INTERVAL '13 years' 
            THEN parent_id IS NOT NULL 
            ELSE TRUE 
        END
    ),
    CONSTRAINT user_no_self_parent CHECK (id != parent_id),
    CONSTRAINT user_valid_failed_attempts CHECK (failed_login_attempts >= 0)
);

-- User Roles (Multi-Role Support)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    context_type VARCHAR(50), -- 'league', 'team', 'division', 'venue'
    context_id UUID, -- ID of the context entity
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    assigned_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, organization_id, role, context_type, context_id),
    CONSTRAINT role_valid_context CHECK (
        (context_type IS NULL AND context_id IS NULL) OR
        (context_type IS NOT NULL AND context_id IS NOT NULL)
    ),
    CONSTRAINT role_valid_dates CHECK (
        expiry_date IS NULL OR expiry_date >= effective_date
    )
);

-- Parental Consent (COPPA Compliance)
CREATE TABLE parental_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method VARCHAR(50) NOT NULL,
    verification_token VARCHAR(255),
    consent_details JSONB NOT NULL DEFAULT '{}',
    granted_date DATE,
    expiry_date DATE,
    revoked_date DATE,
    ip_address INET,
    user_agent TEXT,
    document_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(child_id, parent_id, consent_type),
    CONSTRAINT consent_valid_relationship CHECK (child_id != parent_id),
    CONSTRAINT consent_valid_dates CHECK (
        (granted = FALSE) OR
        (granted = TRUE AND granted_date IS NOT NULL AND 
         (expiry_date IS NULL OR expiry_date >= granted_date))
    ),
    CONSTRAINT consent_valid_revocation CHECK (
        revoked_date IS NULL OR revoked_date >= granted_date
    )
);

-- User Sessions (Authentication Tracking)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(50) NOT NULL DEFAULT 'WEB',
    device_info JSONB,
    ip_address INET NOT NULL,
    location JSONB,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    logout_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT session_valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT session_valid_device CHECK (device_type IN ('WEB', 'MOBILE_APP', 'API', 'TABLET'))
);

-- ============================================================================
-- League Management Domain
-- ============================================================================

-- Leagues Table
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug url_slug NOT NULL,
    description TEXT,
    sport sport NOT NULL DEFAULT 'BASKETBALL',
    status league_status NOT NULL DEFAULT 'DRAFT',
    rules JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{}',
    max_teams_per_division INTEGER NOT NULL DEFAULT 12,
    base_registration_fee currency_amount NOT NULL DEFAULT 0,
    registration_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    public_stats BOOLEAN NOT NULL DEFAULT TRUE,
    allow_guest_viewing BOOLEAN NOT NULL DEFAULT TRUE,
    logo_url TEXT,
    banner_url TEXT,
    contact_email email_address,
    website_url TEXT,
    social_media JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(organization_id, slug),
    CONSTRAINT league_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT league_max_teams CHECK (max_teams_per_division >= 4 AND max_teams_per_division <= 50),
    CONSTRAINT league_currency_code CHECK (registration_currency ~ '^[A-Z]{3}$')
);

-- Seasons Table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug url_slug NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start DATE,
    registration_deadline DATE NOT NULL,
    status season_status NOT NULL DEFAULT 'UPCOMING',
    registration_fee currency_amount NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    settings JSONB NOT NULL DEFAULT '{}',
    max_games_per_team INTEGER NOT NULL DEFAULT 16,
    playoffs_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    playoff_format JSONB,
    weather_monitoring BOOLEAN NOT NULL DEFAULT TRUE,
    heat_safety_threshold DECIMAL(4,1) DEFAULT 95.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(league_id, slug),
    CONSTRAINT season_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT season_valid_dates CHECK (
        start_date < end_date AND
        registration_deadline <= start_date AND
        (registration_start IS NULL OR registration_start <= registration_deadline)
    ),
    CONSTRAINT season_games_limit CHECK (max_games_per_team >= 6 AND max_games_per_team <= 50)
);

-- Divisions Table
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    min_age age_years NOT NULL,
    max_age age_years NOT NULL,
    skill_level skill_level NOT NULL DEFAULT 'RECREATIONAL',
    gender gender_type NOT NULL DEFAULT 'COED',
    max_teams INTEGER NOT NULL DEFAULT 12,
    min_teams_to_start INTEGER NOT NULL DEFAULT 4,
    max_players_per_team INTEGER NOT NULL DEFAULT 15,
    min_players_per_team INTEGER NOT NULL DEFAULT 8,
    rules JSONB NOT NULL DEFAULT '{}',
    additional_fee currency_amount NOT NULL DEFAULT 0,
    requires_tryouts BOOLEAN NOT NULL DEFAULT FALSE,
    tryout_date DATE,
    roster_lock_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(league_id, name),
    UNIQUE(league_id, code),
    CONSTRAINT division_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT division_valid_age_range CHECK (
        min_age < max_age AND 
        max_age - min_age <= 4
    ),
    CONSTRAINT division_valid_team_counts CHECK (
        min_teams_to_start <= max_teams AND
        max_teams >= 4 AND
        min_teams_to_start >= 2
    ),
    CONSTRAINT division_valid_roster_size CHECK (
        min_players_per_team <= max_players_per_team AND
        min_players_per_team >= 5 AND
        max_players_per_team <= 20
    )
);

-- League Rules (Governance)
CREATE TABLE league_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_text TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    applies_to_divisions UUID[], -- Array of division IDs
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(league_id, category, rule_name),
    CONSTRAINT rule_valid_dates CHECK (
        expiry_date IS NULL OR expiry_date >= effective_date
    ),
    CONSTRAINT rule_priority_range CHECK (priority >= 1 AND priority <= 1000)
);

-- ============================================================================
-- Team and Player Management
-- ============================================================================

-- Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug url_slug NOT NULL,
    team_code VARCHAR(10),
    description TEXT,
    colors JSONB NOT NULL DEFAULT '{"primary": "#000000", "secondary": "#FFFFFF"}',
    logo_url TEXT,
    banner_url TEXT,
    status team_status NOT NULL DEFAULT 'ACTIVE',
    roster_size INTEGER NOT NULL DEFAULT 0,
    max_roster_size INTEGER NOT NULL DEFAULT 15,
    contact_info JSONB,
    team_stats JSONB NOT NULL DEFAULT '{}',
    public_roster BOOLEAN NOT NULL DEFAULT TRUE,
    founded_date DATE,
    home_venue_id UUID,
    practice_schedule JSONB,
    team_motto TEXT,
    achievements JSONB NOT NULL DEFAULT '[]',
    social_media JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT team_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT team_valid_roster CHECK (roster_size >= 0 AND roster_size <= max_roster_size),
    CONSTRAINT team_code_format CHECK (team_code IS NULL OR team_code ~ '^[A-Z0-9]{2,10}$')
);

-- Create unique constraint after table creation to allow proper naming
ALTER TABLE teams ADD CONSTRAINT teams_division_name_unique UNIQUE(division_id, name);
ALTER TABLE teams ADD CONSTRAINT teams_division_slug_unique UNIQUE(division_id, slug);

-- Players Table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender gender_type NOT NULL,
    position VARCHAR(20),
    jersey_number jersey_number,
    height_inches DECIMAL(4,1),
    weight_lbs DECIMAL(5,1),
    dominant_hand VARCHAR(20) DEFAULT 'RIGHT',
    status player_status NOT NULL DEFAULT 'ACTIVE',
    eligibility_status VARCHAR(50) NOT NULL DEFAULT 'ELIGIBLE',
    medical_clearance JSONB,
    emergency_contact JSONB NOT NULL,
    parent_contact JSONB,
    allergies TEXT,
    medications TEXT,
    notes TEXT,
    photo_url TEXT,
    joined_team_at TIMESTAMP WITH TIME ZONE,
    left_team_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(team_id, jersey_number),
    CONSTRAINT player_name_length CHECK (
        length(first_name) >= 1 AND length(first_name) <= 100 AND
        length(last_name) >= 1 AND length(last_name) <= 100
    ),
    CONSTRAINT player_valid_birth_date CHECK (birth_date <= CURRENT_DATE),
    CONSTRAINT player_valid_measurements CHECK (
        (height_inches IS NULL OR height_inches BETWEEN 36 AND 96) AND
        (weight_lbs IS NULL OR weight_lbs BETWEEN 40 AND 400)
    ),
    CONSTRAINT player_valid_position CHECK (
        position IS NULL OR position IN ('PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL')
    ),
    CONSTRAINT player_valid_hand CHECK (dominant_hand IN ('LEFT', 'RIGHT', 'AMBIDEXTROUS'))
);

-- Team Roster History (Track player movement)
CREATE TABLE team_roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    left_date DATE,
    role VARCHAR(50) DEFAULT 'PLAYER',
    jersey_number jersey_number,
    registration_fee_paid currency_amount NOT NULL DEFAULT 0,
    fee_paid_in_full BOOLEAN NOT NULL DEFAULT FALSE,
    uniform_size VARCHAR(10),
    emergency_contact_verified BOOLEAN NOT NULL DEFAULT FALSE,
    medical_clearance_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(team_id, player_id, season_id),
    UNIQUE(team_id, season_id, jersey_number),
    CONSTRAINT roster_valid_dates CHECK (left_date IS NULL OR left_date >= joined_date),
    CONSTRAINT roster_valid_role CHECK (role IN ('PLAYER', 'CAPTAIN', 'ASSISTANT_CAPTAIN')),
    CONSTRAINT roster_valid_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'SUSPENDED'))
);

-- Team Staff (Coaches, Managers, etc.)
CREATE TABLE team_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    qualifications JSONB NOT NULL DEFAULT '{}',
    contact_info JSONB,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    background_check_completed BOOLEAN NOT NULL DEFAULT FALSE,
    background_check_date DATE,
    background_check_expiry DATE,
    compensation currency_amount,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(team_id, user_id, role, start_date),
    CONSTRAINT staff_valid_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT staff_valid_background_check CHECK (
        NOT background_check_completed OR background_check_date IS NOT NULL
    ),
    CONSTRAINT staff_coaching_roles CHECK (
        role IN ('HEAD_COACH', 'ASSISTANT_COACH', 'TEAM_MANAGER', 'TRAINER', 'VOLUNTEER')
    )
);

-- ============================================================================
-- Venue Management
-- ============================================================================

-- Venues Table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    venue_code VARCHAR(20),
    type venue_type NOT NULL DEFAULT 'INDOOR',
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'USA',
    location GEOGRAPHY(POINT, 4326),
    contact_info JSONB,
    operating_hours JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rental_cost_per_hour currency_amount DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    capacity INTEGER,
    is_accessible BOOLEAN NOT NULL DEFAULT TRUE,
    directions TEXT,
    parking_info TEXT,
    amenities JSONB NOT NULL DEFAULT '[]',
    rules JSONB NOT NULL DEFAULT '{}',
    emergency_procedures TEXT,
    photos JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, name),
    CONSTRAINT venue_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT venue_capacity CHECK (capacity IS NULL OR capacity > 0)
);

-- Courts within Venues
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    court_number INTEGER,
    type court_type NOT NULL DEFAULT 'FULL_COURT',
    surface surface_type NOT NULL DEFAULT 'HARDWOOD',
    size VARCHAR(50) NOT NULL DEFAULT 'REGULATION',
    length_feet DECIMAL(5,2),
    width_feet DECIMAL(5,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    amenities JSONB NOT NULL DEFAULT '[]',
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 10),
    last_maintenance DATE,
    maintenance_notes TEXT,
    photos JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(venue_id, name),
    UNIQUE(venue_id, court_number),
    CONSTRAINT court_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
    CONSTRAINT court_valid_dimensions CHECK (
        (length_feet IS NULL OR length_feet BETWEEN 50 AND 200) AND
        (width_feet IS NULL OR width_feet BETWEEN 25 AND 100)
    )
);

-- Venue Availability Scheduling
CREATE TABLE venue_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    availability_type VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    cost_per_hour currency_amount DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 100,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT availability_valid_time CHECK (start_time < end_time),
    CONSTRAINT availability_valid_dates CHECK (
        expiry_date IS NULL OR expiry_date >= effective_date
    ),
    CONSTRAINT availability_valid_type CHECK (
        availability_type IN ('AVAILABLE', 'BLOCKED', 'MAINTENANCE', 'RESERVED')
    ),
    CONSTRAINT availability_priority_range CHECK (priority BETWEEN 1 AND 1000)
);

-- Venue Bookings
CREATE TABLE venue_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    game_id UUID, -- Will be added as FK after games table
    event_name VARCHAR(255),
    booking_type VARCHAR(50) NOT NULL DEFAULT 'GAME',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    cost currency_amount DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    booked_by UUID REFERENCES users(id),
    purpose TEXT,
    setup_requirements JSONB,
    special_instructions TEXT,
    attendance_estimate INTEGER,
    actual_attendance INTEGER,
    notes TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT booking_valid_time CHECK (start_time < end_time),
    CONSTRAINT booking_valid_type CHECK (
        booking_type IN ('GAME', 'PRACTICE', 'TOURNAMENT', 'EVENT', 'MAINTENANCE', 'PRIVATE')
    ),
    CONSTRAINT booking_valid_status CHECK (
        status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')
    ),
    CONSTRAINT booking_attendance_positive CHECK (
        attendance_estimate IS NULL OR attendance_estimate >= 0
    )
);

-- ============================================================================
-- Game Operations Domain
-- ============================================================================

-- Games Table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
    game_number VARCHAR(50),
    game_type game_type NOT NULL DEFAULT 'REGULAR',
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status game_status NOT NULL DEFAULT 'SCHEDULED',
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    winner_team_id UUID REFERENCES teams(id),
    game_time JSONB, -- Current game clock info
    period INTEGER DEFAULT 1,
    period_status VARCHAR(50) DEFAULT 'PENDING',
    weather_conditions JSONB,
    temperature_f DECIMAL(4,1),
    humidity_percent DECIMAL(4,1),
    heat_index DECIMAL(4,1),
    game_notes TEXT,
    cancellation_reason TEXT,
    postponement_reason TEXT,
    forfeiting_team_id UUID REFERENCES teams(id),
    attendance INTEGER,
    ticket_sales currency_amount DEFAULT 0,
    broadcast_url TEXT,
    live_stream_viewers INTEGER DEFAULT 0,
    photos JSONB NOT NULL DEFAULT '[]',
    highlights JSONB NOT NULL DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT game_different_teams CHECK (home_team_id != away_team_id),
    CONSTRAINT game_valid_scores CHECK (home_score >= 0 AND away_score >= 0),
    CONSTRAINT game_valid_period CHECK (period >= 1 AND period <= 6), -- Allow overtimes
    CONSTRAINT game_valid_temperature CHECK (
        temperature_f IS NULL OR temperature_f BETWEEN -20 AND 130
    ),
    CONSTRAINT game_valid_humidity CHECK (
        humidity_percent IS NULL OR humidity_percent BETWEEN 0 AND 100
    ),
    CONSTRAINT game_valid_attendance CHECK (attendance IS NULL OR attendance >= 0),
    CONSTRAINT game_valid_viewers CHECK (live_stream_viewers >= 0)
);

-- Add foreign key for venue bookings now that games table exists
ALTER TABLE venue_bookings 
ADD CONSTRAINT venue_bookings_game_fk 
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;

-- Event Types for Game Events
CREATE TABLE event_types (
    id VARCHAR(50) PRIMARY KEY,
    category event_category NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_data JSONB NOT NULL DEFAULT '{}',
    affects_score BOOLEAN NOT NULL DEFAULT FALSE,
    affects_fouls BOOLEAN NOT NULL DEFAULT FALSE,
    affects_statistics BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    color_code VARCHAR(7), -- Hex color for UI
    icon_name VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT event_type_name_length CHECK (length(name) >= 2 AND length(name) <= 100),
    CONSTRAINT event_type_valid_color CHECK (
        color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$'
    )
);

-- Game Events (Event Sourcing)
CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_type_id VARCHAR(50) NOT NULL REFERENCES event_types(id),
    sequence_number INTEGER NOT NULL,
    period VARCHAR(10) NOT NULL,
    game_time VARCHAR(10), -- MM:SS format
    game_clock_seconds INTEGER, -- For precise ordering
    team_id UUID REFERENCES teams(id),
    player_id UUID REFERENCES players(id),
    assisting_player_id UUID REFERENCES players(id),
    event_data JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    coordinates JSONB, -- Court position for shot charts
    video_timestamp DECIMAL(8,2), -- Seconds into game video
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(game_id, sequence_number),
    CONSTRAINT event_valid_game_time CHECK (
        game_time IS NULL OR game_time ~ '^([0-9]|[1-5][0-9]):[0-5][0-9]$'
    ),
    CONSTRAINT event_valid_clock_seconds CHECK (
        game_clock_seconds IS NULL OR game_clock_seconds BETWEEN 0 AND 3600
    ),
    CONSTRAINT event_sequence_positive CHECK (sequence_number > 0),
    CONSTRAINT event_valid_period CHECK (period IN ('Q1', 'Q2', 'Q3', 'Q4', 'OT', 'OT2', 'OT3'))
);

-- Game Officials
CREATE TABLE game_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
    compensation currency_amount,
    travel_distance_miles DECIMAL(6,2),
    arrival_time TIMESTAMP WITH TIME ZONE,
    departure_time TIMESTAMP WITH TIME ZONE,
    performance_rating DECIMAL(3,2) CHECK (performance_rating BETWEEN 1 AND 5),
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(game_id, user_id, role),
    CONSTRAINT official_valid_role CHECK (role IN ('REFEREE', 'SCOREKEEPER', 'TIMEKEEPER')),
    CONSTRAINT official_valid_status CHECK (
        status IN ('ASSIGNED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED')
    ),
    CONSTRAINT official_valid_distance CHECK (
        travel_distance_miles IS NULL OR travel_distance_miles >= 0
    )
);

-- ============================================================================
-- Statistics and Performance Tracking
-- ============================================================================

-- Team Game Statistics
CREATE TABLE team_game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Basic Statistics
    points INTEGER NOT NULL DEFAULT 0,
    field_goals_made INTEGER NOT NULL DEFAULT 0,
    field_goals_attempted INTEGER NOT NULL DEFAULT 0,
    three_pointers_made INTEGER NOT NULL DEFAULT 0,
    three_pointers_attempted INTEGER NOT NULL DEFAULT 0,
    free_throws_made INTEGER NOT NULL DEFAULT 0,
    free_throws_attempted INTEGER NOT NULL DEFAULT 0,
    rebounds INTEGER NOT NULL DEFAULT 0,
    offensive_rebounds INTEGER NOT NULL DEFAULT 0,
    defensive_rebounds INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    steals INTEGER NOT NULL DEFAULT 0,
    blocks INTEGER NOT NULL DEFAULT 0,
    turnovers INTEGER NOT NULL DEFAULT 0,
    fouls INTEGER NOT NULL DEFAULT 0,
    technical_fouls INTEGER NOT NULL DEFAULT 0,
    timeouts_used INTEGER NOT NULL DEFAULT 0,
    timeouts_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Advanced Statistics
    field_goal_percentage percentage,
    three_point_percentage percentage,
    free_throw_percentage percentage,
    effective_field_goal_percentage percentage,
    true_shooting_percentage percentage,
    offensive_rating DECIMAL(6,2),
    defensive_rating DECIMAL(6,2),
    pace DECIMAL(6,2),
    plus_minus INTEGER,
    
    -- Calculated fields
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_event_sequence INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(game_id, team_id),
    CONSTRAINT team_stats_non_negative CHECK (
        points >= 0 AND field_goals_made >= 0 AND field_goals_attempted >= 0 AND
        three_pointers_made >= 0 AND three_pointers_attempted >= 0 AND
        free_throws_made >= 0 AND free_throws_attempted >= 0 AND
        rebounds >= 0 AND assists >= 0 AND steals >= 0 AND
        blocks >= 0 AND turnovers >= 0 AND fouls >= 0
    ),
    CONSTRAINT team_stats_logical_limits CHECK (
        field_goals_made <= field_goals_attempted AND
        three_pointers_made <= three_pointers_attempted AND
        free_throws_made <= free_throws_attempted AND
        three_pointers_made <= field_goals_made AND
        offensive_rebounds + defensive_rebounds = rebounds AND
        timeouts_used + timeouts_remaining <= 7
    )
);

-- Player Game Statistics
CREATE TABLE player_game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    
    -- Playing Time
    minutes_played INTEGER NOT NULL DEFAULT 0,
    seconds_played INTEGER NOT NULL DEFAULT 0,
    started_game BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Basic Statistics
    points INTEGER NOT NULL DEFAULT 0,
    field_goals_made INTEGER NOT NULL DEFAULT 0,
    field_goals_attempted INTEGER NOT NULL DEFAULT 0,
    three_pointers_made INTEGER NOT NULL DEFAULT 0,
    three_pointers_attempted INTEGER NOT NULL DEFAULT 0,
    free_throws_made INTEGER NOT NULL DEFAULT 0,
    free_throws_attempted INTEGER NOT NULL DEFAULT 0,
    rebounds INTEGER NOT NULL DEFAULT 0,
    offensive_rebounds INTEGER NOT NULL DEFAULT 0,
    defensive_rebounds INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    steals INTEGER NOT NULL DEFAULT 0,
    blocks INTEGER NOT NULL DEFAULT 0,
    turnovers INTEGER NOT NULL DEFAULT 0,
    fouls INTEGER NOT NULL DEFAULT 0,
    technical_fouls INTEGER NOT NULL DEFAULT 0,
    
    -- Advanced Statistics
    plus_minus INTEGER DEFAULT 0,
    player_efficiency_rating DECIMAL(6,2),
    usage_rate percentage,
    assist_rate percentage,
    turnover_rate percentage,
    steal_rate percentage,
    block_rate percentage,
    
    -- Game Context
    substitutions JSONB NOT NULL DEFAULT '[]',
    foul_details JSONB NOT NULL DEFAULT '[]',
    shot_chart JSONB NOT NULL DEFAULT '[]',
    
    -- Calculated fields
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_event_sequence INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(game_id, player_id),
    CONSTRAINT player_stats_non_negative CHECK (
        minutes_played >= 0 AND seconds_played >= 0 AND points >= 0 AND
        field_goals_made >= 0 AND field_goals_attempted >= 0 AND
        three_pointers_made >= 0 AND three_pointers_attempted >= 0 AND
        free_throws_made >= 0 AND free_throws_attempted >= 0 AND
        rebounds >= 0 AND assists >= 0 AND steals >= 0 AND
        blocks >= 0 AND turnovers >= 0 AND fouls >= 0
    ),
    CONSTRAINT player_stats_logical_limits CHECK (
        field_goals_made <= field_goals_attempted AND
        three_pointers_made <= three_pointers_attempted AND
        free_throws_made <= free_throws_attempted AND
        three_pointers_made <= field_goals_made AND
        offensive_rebounds + defensive_rebounds = rebounds AND
        minutes_played * 60 + seconds_played <= 3600 -- Max game time
    )
);

-- Season Statistics (Aggregated)
CREATE TABLE player_season_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Games Played
    games_played INTEGER NOT NULL DEFAULT 0,
    games_started INTEGER NOT NULL DEFAULT 0,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Per Game Averages
    points_per_game DECIMAL(5,2) DEFAULT 0,
    rebounds_per_game DECIMAL(4,2) DEFAULT 0,
    assists_per_game DECIMAL(4,2) DEFAULT 0,
    steals_per_game DECIMAL(4,2) DEFAULT 0,
    blocks_per_game DECIMAL(4,2) DEFAULT 0,
    turnovers_per_game DECIMAL(4,2) DEFAULT 0,
    minutes_per_game DECIMAL(4,1) DEFAULT 0,
    
    -- Shooting Percentages
    field_goal_percentage percentage DEFAULT 0,
    three_point_percentage percentage DEFAULT 0,
    free_throw_percentage percentage DEFAULT 0,
    
    -- Totals
    total_points INTEGER DEFAULT 0,
    total_rebounds INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    total_steals INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,
    total_turnovers INTEGER DEFAULT 0,
    total_fouls INTEGER DEFAULT 0,
    
    -- Advanced Metrics
    player_efficiency_rating DECIMAL(6,2),
    win_shares DECIMAL(4,2),
    usage_rate percentage,
    true_shooting_percentage percentage,
    
    -- Rankings
    league_rank_points INTEGER,
    league_rank_rebounds INTEGER,
    league_rank_assists INTEGER,
    division_rank_points INTEGER,
    
    -- Calculation metadata
    last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_game_included UUID REFERENCES games(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(player_id, season_id),
    CONSTRAINT season_stats_non_negative CHECK (
        games_played >= 0 AND games_started >= 0 AND
        games_started <= games_played AND total_minutes >= 0
    )
);

-- Team Season Statistics
CREATE TABLE team_season_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    
    -- Record
    games_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    win_percentage percentage DEFAULT 0,
    
    -- Home/Away Record
    home_games INTEGER DEFAULT 0,
    home_wins INTEGER DEFAULT 0,
    home_losses INTEGER DEFAULT 0,
    away_games INTEGER DEFAULT 0,
    away_wins INTEGER DEFAULT 0,
    away_losses INTEGER DEFAULT 0,
    
    -- Scoring
    points_per_game DECIMAL(5,2) DEFAULT 0,
    points_allowed_per_game DECIMAL(5,2) DEFAULT 0,
    point_differential DECIMAL(5,2) DEFAULT 0,
    
    -- Team Statistics Averages
    field_goal_percentage percentage DEFAULT 0,
    three_point_percentage percentage DEFAULT 0,
    free_throw_percentage percentage DEFAULT 0,
    rebounds_per_game DECIMAL(4,2) DEFAULT 0,
    assists_per_game DECIMAL(4,2) DEFAULT 0,
    steals_per_game DECIMAL(4,2) DEFAULT 0,
    blocks_per_game DECIMAL(4,2) DEFAULT 0,
    turnovers_per_game DECIMAL(4,2) DEFAULT 0,
    
    -- Advanced Team Metrics
    offensive_rating DECIMAL(6,2),
    defensive_rating DECIMAL(6,2),
    pace DECIMAL(6,2),
    effective_field_goal_percentage percentage,
    true_shooting_percentage percentage,
    
    -- Streaks
    current_streak VARCHAR(10), -- "W5", "L3", etc.
    longest_win_streak INTEGER DEFAULT 0,
    longest_lose_streak INTEGER DEFAULT 0,
    
    -- Rankings
    league_rank INTEGER,
    division_rank INTEGER,
    conference_rank INTEGER,
    
    -- Playoff Information
    playoff_eligible BOOLEAN DEFAULT FALSE,
    playoff_seed INTEGER,
    
    -- Calculation metadata
    last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_game_included UUID REFERENCES games(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(team_id, season_id),
    CONSTRAINT team_season_valid_record CHECK (
        games_played >= 0 AND wins >= 0 AND losses >= 0 AND ties >= 0 AND
        wins + losses + ties = games_played AND
        home_wins + away_wins = wins AND
        home_losses + away_losses = losses AND
        home_games + away_games = games_played
    )
);

-- ============================================================================
-- Payment and Financial Management
-- ============================================================================

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_type payment_type NOT NULL,
    reference_id UUID, -- Registration, subscription, etc.
    reference_type VARCHAR(50), -- 'registration', 'subscription', etc.
    amount currency_amount NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'PENDING',
    
    -- Gateway Information
    gateway VARCHAR(50) NOT NULL DEFAULT 'STRIPE',
    gateway_transaction_id VARCHAR(255),
    gateway_customer_id VARCHAR(255),
    gateway_payment_method_id VARCHAR(255),
    gateway_metadata JSONB,
    
    -- Payment Method Details
    payment_method payment_method NOT NULL,
    payment_method_details JSONB, -- Last 4, brand, etc.
    
    -- Description and Metadata
    description TEXT NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Refund Information
    refunded_amount currency_amount DEFAULT 0,
    refund_reason TEXT,
    
    -- Processing Information
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Trail
    processed_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payment_positive_amount CHECK (amount > 0),
    CONSTRAINT payment_valid_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
    CONSTRAINT payment_retry_limit CHECK (retry_count >= 0 AND retry_count <= 5),
    CONSTRAINT payment_currency_code CHECK (currency ~ '^[A-Z]{3}$')
);

-- Payment Methods (Stored payment methods for users)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gateway VARCHAR(50) NOT NULL DEFAULT 'STRIPE',
    gateway_payment_method_id VARCHAR(255) NOT NULL,
    type payment_method NOT NULL,
    
    -- Card/Account Details (encrypted or tokenized)
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    billing_address JSONB,
    
    -- Status and Metadata
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    failure_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payment_method_valid_exp CHECK (
        (exp_month IS NULL OR (exp_month >= 1 AND exp_month <= 12)) AND
        (exp_year IS NULL OR exp_year >= EXTRACT(YEAR FROM CURRENT_DATE))
    ),
    CONSTRAINT payment_method_last_four CHECK (
        last_four IS NULL OR last_four ~ '^[0-9]{4}$'
    ),
    CONSTRAINT payment_method_status CHECK (
        status IN ('ACTIVE', 'EXPIRED', 'INVALID', 'SUSPENDED')
    )
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    
    -- Billing Information
    amount currency_amount NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    
    -- Dates
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    next_billing_date DATE,
    cancelled_date DATE,
    ended_date DATE,
    
    -- Gateway Information
    gateway VARCHAR(50) NOT NULL DEFAULT 'STRIPE',
    gateway_subscription_id VARCHAR(255),
    gateway_customer_id VARCHAR(255),
    
    -- Plan Details
    plan_features JSONB NOT NULL DEFAULT '{}',
    plan_limits JSONB NOT NULL DEFAULT '{}',
    
    -- Discounts
    discount_amount currency_amount DEFAULT 0,
    discount_code VARCHAR(50),
    discount_end_date DATE,
    
    -- Billing Issues
    billing_failures INTEGER DEFAULT 0,
    last_billing_failure DATE,
    dunning_emails_sent INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subscription_positive_amount CHECK (amount > 0),
    CONSTRAINT subscription_valid_billing_cycle CHECK (
        billing_cycle IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY')
    ),
    CONSTRAINT subscription_valid_dates CHECK (
        current_period_start <= current_period_end AND
        start_date <= current_period_start
    ),
    CONSTRAINT subscription_valid_status CHECK (
        status IN ('ACTIVE', 'CANCELLED', 'SUSPENDED', 'PAST_DUE', 'EXPIRED')
    )
);

-- Registration Fees (Configuration)
CREATE TABLE registration_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    fee_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount currency_amount NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Date Ranges
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    
    -- Conditions
    conditions JSONB NOT NULL DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_refundable BOOLEAN NOT NULL DEFAULT TRUE,
    refund_policy_days INTEGER DEFAULT 14,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT reg_fee_positive_amount CHECK (amount >= 0),
    CONSTRAINT reg_fee_valid_dates CHECK (
        expiry_date IS NULL OR expiry_date >= effective_date
    ),
    CONSTRAINT reg_fee_valid_refund_days CHECK (
        refund_policy_days IS NULL OR refund_policy_days >= 0
    ),
    CONSTRAINT reg_fee_type_valid CHECK (
        fee_type IN ('BASE', 'EARLY_BIRD', 'LATE', 'SIBLING_DISCOUNT', 'SCHOLARSHIP', 'TOURNAMENT')
    )
);

-- ============================================================================
-- Communication and Notifications
-- ============================================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Message Details
    type notification_type NOT NULL,
    category notification_category NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'NORMAL',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    html_content TEXT,
    
    -- Structured Data
    data JSONB NOT NULL DEFAULT '{}',
    template_id VARCHAR(100),
    template_variables JSONB,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    send_after TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Gateway Information
    gateway VARCHAR(50),
    gateway_message_id VARCHAR(255),
    external_reference VARCHAR(255),
    
    -- Error Handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Tracking
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT notification_valid_retry CHECK (retry_count >= 0 AND retry_count <= max_retries),
    CONSTRAINT notification_valid_status CHECK (
        status IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'CANCELLED')
    ),
    CONSTRAINT notification_subject_length CHECK (length(subject) >= 1 AND length(subject) <= 255)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category notification_category NOT NULL,
    
    -- Channel Preferences
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timing Preferences
    frequency VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50),
    
    -- Content Preferences
    specific_settings JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, category),
    CONSTRAINT notif_pref_valid_frequency CHECK (
        frequency IN ('IMMEDIATE', 'HOURLY', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'NEVER')
    )
);

-- Email Templates
CREATE TABLE email_templates (
    id VARCHAR(100) PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    
    -- Template Metadata
    variables JSONB NOT NULL DEFAULT '{}',
    category VARCHAR(100) NOT NULL DEFAULT 'TRANSACTIONAL',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Usage Stats
    sent_count INTEGER DEFAULT 0,
    open_rate percentage,
    click_rate percentage,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT template_valid_category CHECK (
        category IN ('TRANSACTIONAL', 'MARKETING', 'SYSTEM', 'WELCOME', 'REMINDER')
    ),
    CONSTRAINT template_version_positive CHECK (version > 0)
);

-- ============================================================================
-- Event Sourcing and Audit
-- ============================================================================

-- Event Streams
CREATE TABLE event_streams (
    stream_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(aggregate_type, aggregate_id),
    CONSTRAINT stream_version_non_negative CHECK (version >= 0)
);

-- Events (Event Store)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES event_streams(stream_id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_version VARCHAR(10) NOT NULL DEFAULT 'v1',
    event_data JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Correlation and Causation
    correlation_id UUID,
    causation_id UUID REFERENCES events(id),
    
    -- Context
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Data Integrity
    checksum VARCHAR(64),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(stream_id, sequence_number),
    CONSTRAINT event_sequence_positive CHECK (sequence_number > 0),
    CONSTRAINT event_timing CHECK (recorded_at >= occurred_at)
);

-- Event Snapshots (Performance Optimization)
CREATE TABLE event_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES event_streams(stream_id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_data JSONB NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(stream_id, version),
    CONSTRAINT snapshot_version_positive CHECK (version > 0)
);

-- Audit Log (System-wide Audit Trail)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    
    -- Action Details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_id UUID,
    
    -- Additional Metadata
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    category VARCHAR(50) NOT NULL DEFAULT 'USER_ACTION',
    description TEXT,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT audit_valid_severity CHECK (
        severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')
    ),
    CONSTRAINT audit_valid_category CHECK (
        category IN ('USER_ACTION', 'SYSTEM', 'SECURITY', 'DATA_CHANGE', 'COMPLIANCE')
    )
);

-- ============================================================================
-- Indexes for Performance Optimization
-- ============================================================================

-- User Management Indexes
CREATE INDEX idx_users_organization_email ON users(organization_id, email);
CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'ARCHIVED';
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_user_sessions_token ON user_sessions USING hash(session_token);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);

-- League Management Indexes
CREATE INDEX idx_leagues_organization ON leagues(organization_id);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_seasons_league ON seasons(league_id);
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX idx_divisions_league ON divisions(league_id);
CREATE INDEX idx_teams_division ON teams(division_id);
CREATE INDEX idx_teams_coach ON teams(coach_id);

-- Player and Roster Indexes
CREATE INDEX idx_players_user ON players(user_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_team_roster_season ON team_roster(season_id, team_id);
CREATE INDEX idx_team_roster_player ON team_roster(player_id);

-- Game Operations Indexes
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_games_scheduled_time ON games(scheduled_time);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_venue_time ON games(venue_id, scheduled_time);

-- Game Events Indexes (Critical for real-time performance)
CREATE INDEX idx_game_events_game_sequence ON game_events(game_id, sequence_number);
CREATE INDEX idx_game_events_type ON game_events(event_type_id);
CREATE INDEX idx_game_events_player ON game_events(player_id);
CREATE INDEX idx_game_events_recorded_at ON game_events(recorded_at);

-- Statistics Indexes
CREATE INDEX idx_team_game_stats_game ON team_game_statistics(game_id);
CREATE INDEX idx_player_game_stats_game ON player_game_statistics(game_id);
CREATE INDEX idx_player_game_stats_player ON player_game_statistics(player_id);
CREATE INDEX idx_player_season_stats_season ON player_season_statistics(season_id);
CREATE INDEX idx_team_season_stats_season ON team_season_statistics(season_id);

-- Venue Indexes
CREATE INDEX idx_venues_organization ON venues(organization_id);
CREATE INDEX idx_venues_location ON venues USING gist(location);
CREATE INDEX idx_courts_venue ON courts(venue_id);
CREATE INDEX idx_venue_bookings_time ON venue_bookings(start_time, end_time);
CREATE INDEX idx_venue_bookings_venue ON venue_bookings(venue_id, court_id);

-- Payment Indexes
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_transaction ON payments(gateway, gateway_transaction_id);
CREATE INDEX idx_payments_processed_at ON payments(processed_at);

-- Notification Indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_category ON notifications(category);

-- Event Sourcing Indexes
CREATE INDEX idx_events_stream ON events(stream_id, sequence_number);
CREATE INDEX idx_events_correlation ON events(correlation_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_occurred_at ON events(occurred_at);
CREATE INDEX idx_event_streams_aggregate ON event_streams(aggregate_type, aggregate_id);

-- Audit Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);

-- Composite Indexes for Common Queries
CREATE INDEX idx_users_org_status_created ON users(organization_id, status, created_at);
CREATE INDEX idx_games_season_status_time ON games(season_id, status, scheduled_time);
CREATE INDEX idx_players_team_status_jersey ON players(team_id, status, jersey_number);
CREATE INDEX idx_notifications_recipient_status_scheduled ON notifications(recipient_id, status, scheduled_for);

-- Full-text Search Indexes
CREATE INDEX idx_users_name_search ON users USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_teams_name_search ON teams USING gin(name gin_trgm_ops);
CREATE INDEX idx_venues_name_search ON venues USING gin(name gin_trgm_ops);

-- Partial Indexes for Performance
CREATE INDEX idx_games_active ON games(season_id, scheduled_time) 
WHERE status IN ('SCHEDULED', 'IN_PROGRESS');

CREATE INDEX idx_notifications_pending ON notifications(scheduled_for) 
WHERE status IN ('PENDING', 'QUEUED');

CREATE INDEX idx_payments_processing ON payments(created_at) 
WHERE status IN ('PENDING', 'PROCESSING');

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Active Players View
CREATE VIEW active_players AS
SELECT 
    p.*,
    u.email,
    u.phone,
    t.name AS team_name,
    d.name AS division_name,
    l.name AS league_name
FROM players p
JOIN users u ON p.user_id = u.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN divisions d ON t.division_id = d.id
LEFT JOIN leagues l ON d.league_id = l.id
WHERE p.status = 'ACTIVE' AND u.status = 'ACTIVE';

-- Game Schedule View
CREATE VIEW game_schedule AS
SELECT 
    g.*,
    ht.name AS home_team_name,
    at.name AS away_team_name,
    v.name AS venue_name,
    v.address AS venue_address,
    s.name AS season_name,
    l.name AS league_name
FROM games g
JOIN teams ht ON g.home_team_id = ht.id
JOIN teams at ON g.away_team_id = at.id
LEFT JOIN venues v ON g.venue_id = v.id
JOIN seasons s ON g.season_id = s.id
JOIN leagues l ON s.league_id = l.id;

-- Team Standings View
CREATE VIEW team_standings AS
SELECT 
    tss.*,
    t.name AS team_name,
    d.name AS division_name,
    l.name AS league_name,
    RANK() OVER (PARTITION BY d.id ORDER BY tss.win_percentage DESC, tss.point_differential DESC) AS division_rank,
    RANK() OVER (PARTITION BY l.id ORDER BY tss.win_percentage DESC, tss.point_differential DESC) AS league_rank
FROM team_season_statistics tss
JOIN teams t ON tss.team_id = t.id
JOIN divisions d ON t.division_id = d.id
JOIN leagues l ON d.league_id = l.id;

-- Player Statistics Leaderboard
CREATE VIEW player_stats_leaders AS
SELECT 
    pss.*,
    p.first_name || ' ' || p.last_name AS player_name,
    t.name AS team_name,
    d.name AS division_name,
    ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY pss.points_per_game DESC) as points_rank,
    ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY pss.rebounds_per_game DESC) as rebounds_rank,
    ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY pss.assists_per_game DESC) as assists_rank
FROM player_season_statistics pss
JOIN players p ON pss.player_id = p.id
JOIN teams t ON pss.team_id = t.id
JOIN divisions d ON t.division_id = d.id;

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate COPPA compliance
CREATE OR REPLACE FUNCTION check_coppa_compliance()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is under 13, require parent_id
    IF NEW.birth_date IS NOT NULL AND 
       NEW.birth_date > CURRENT_DATE - INTERVAL '13 years' AND 
       NEW.parent_id IS NULL THEN
        RAISE EXCEPTION 'Users under 13 require parental consent (parent_id)';
    END IF;
    
    -- Update COPPA compliance flag
    IF NEW.birth_date IS NOT NULL THEN
        NEW.coppa_compliant := (NEW.birth_date <= CURRENT_DATE - INTERVAL '13 years' OR NEW.parent_id IS NOT NULL);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coppa_compliance_check BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION check_coppa_compliance();

-- Function to update team roster size
CREATE OR REPLACE FUNCTION update_team_roster_size()
RETURNS TRIGGER AS $$
BEGIN
    -- Update roster size when players are added/removed
    IF TG_OP = 'INSERT' THEN
        UPDATE teams 
        SET roster_size = (
            SELECT COUNT(*) 
            FROM players 
            WHERE team_id = NEW.team_id AND status = 'ACTIVE'
        )
        WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update both old and new teams if team changed
        IF OLD.team_id != NEW.team_id THEN
            UPDATE teams 
            SET roster_size = (
                SELECT COUNT(*) 
                FROM players 
                WHERE team_id = OLD.team_id AND status = 'ACTIVE'
            )
            WHERE id = OLD.team_id;
        END IF;
        
        UPDATE teams 
        SET roster_size = (
            SELECT COUNT(*) 
            FROM players 
            WHERE team_id = NEW.team_id AND status = 'ACTIVE'
        )
        WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE teams 
        SET roster_size = (
            SELECT COUNT(*) 
            FROM players 
            WHERE team_id = OLD.team_id AND status = 'ACTIVE'
        )
        WHERE id = OLD.team_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roster_size AFTER INSERT OR UPDATE OR DELETE ON players
    FOR EACH ROW EXECUTE FUNCTION update_team_roster_size();

-- ============================================================================
-- Initial Data and Configuration
-- ============================================================================

-- Insert default event types for basketball
INSERT INTO event_types (id, category, name, description, affects_score, affects_fouls, default_data) VALUES
-- Scoring Events
('SCORE_2PT', 'SCORE', '2-Point Field Goal', 'Two-point field goal made', true, false, '{"points": 2}'),
('SCORE_3PT', 'SCORE', '3-Point Field Goal', 'Three-point field goal made', true, false, '{"points": 3}'),
('FREE_THROW_MADE', 'SCORE', 'Free Throw Made', 'Free throw made', true, false, '{"points": 1}'),
('FREE_THROW_MISSED', 'SCORE', 'Free Throw Missed', 'Free throw missed', false, false, '{}'),

-- Foul Events
('PERSONAL_FOUL', 'FOUL', 'Personal Foul', 'Personal foul committed', false, true, '{}'),
('TECHNICAL_FOUL', 'FOUL', 'Technical Foul', 'Technical foul committed', false, true, '{"technical": true}'),
('FLAGRANT_FOUL', 'FOUL', 'Flagrant Foul', 'Flagrant foul committed', false, true, '{"flagrant": true}'),
('OFFENSIVE_FOUL', 'FOUL', 'Offensive Foul', 'Offensive foul/charge', false, true, '{"offensive": true}'),

-- Game Control Events
('TIMEOUT_FULL', 'TIMEOUT', 'Full Timeout', 'Full timeout called', false, false, '{"duration": 60}'),
('TIMEOUT_30SEC', 'TIMEOUT', '30-Second Timeout', '30-second timeout called', false, false, '{"duration": 30}'),
('SUBSTITUTION', 'SUBSTITUTION', 'Player Substitution', 'Player substitution', false, false, '{}'),
('JUMP_BALL', 'GAME_CONTROL', 'Jump Ball', 'Jump ball situation', false, false, '{}'),

-- Other Events
('REBOUND_OFF', 'SCORE', 'Offensive Rebound', 'Offensive rebound', false, false, '{"type": "offensive"}'),
('REBOUND_DEF', 'SCORE', 'Defensive Rebound', 'Defensive rebound', false, false, '{"type": "defensive"}'),
('ASSIST', 'SCORE', 'Assist', 'Assist on made basket', false, false, '{}'),
('STEAL', 'GAME_CONTROL', 'Steal', 'Steal/turnover forced', false, false, '{}'),
('BLOCK', 'GAME_CONTROL', 'Block', 'Shot blocked', false, false, '{}'),
('TURNOVER', 'GAME_CONTROL', 'Turnover', 'Turnover committed', false, false, '{}');

-- Insert default notification templates
INSERT INTO email_templates (id, name, subject, html_content, text_content, category) VALUES
('welcome', 'Welcome Email', 'Welcome to {{organization_name}}!', 
 '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining {{organization_name}}.</p>',
 'Welcome {{user_name}}! Thank you for joining {{organization_name}}.', 'WELCOME'),

('game_reminder', 'Game Reminder', 'Game Reminder: {{home_team}} vs {{away_team}}',
 '<h2>Game Reminder</h2><p>{{home_team}} vs {{away_team}}</p><p>Time: {{game_time}}</p><p>Venue: {{venue_name}}</p>',
 'Game Reminder: {{home_team}} vs {{away_team}} at {{game_time}} - {{venue_name}}', 'REMINDER'),

('payment_confirmation', 'Payment Confirmation', 'Payment Confirmation - {{amount}}',
 '<h2>Payment Confirmed</h2><p>We have received your payment of {{amount}} for {{description}}.</p>',
 'Payment Confirmed: {{amount}} for {{description}}', 'TRANSACTIONAL');

-- ============================================================================
-- Comments and Documentation
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Basketball League Management Platform - Phase 2 Database';

-- Table Comments
COMMENT ON TABLE organizations IS 'Multi-tenant root table for league organizations';
COMMENT ON TABLE users IS 'Global users with multi-tenant support and COPPA compliance';
COMMENT ON TABLE leagues IS 'Sports leagues within organizations';
COMMENT ON TABLE seasons IS 'Time-bounded competition periods within leagues';
COMMENT ON TABLE divisions IS 'Age/skill-based groupings within leagues';
COMMENT ON TABLE teams IS 'Player teams competing in divisions';
COMMENT ON TABLE players IS 'Individual participants linked to users';
COMMENT ON TABLE games IS 'Matches between teams with full game state';
COMMENT ON TABLE game_events IS 'Event sourcing for all game actions';
COMMENT ON TABLE venues IS 'Physical locations where games are played';
COMMENT ON TABLE payments IS 'Financial transactions with gateway integration';

-- Column Comments
COMMENT ON COLUMN users.coppa_compliant IS 'Automated COPPA compliance flag based on age and parental consent';
COMMENT ON COLUMN games.heat_index IS 'Calculated heat index for player safety monitoring';
COMMENT ON COLUMN game_events.sequence_number IS 'Sequential event ordering for event sourcing replay';
COMMENT ON COLUMN events.checksum IS 'Data integrity verification hash';

-- ============================================================================
-- Performance and Monitoring Setup
-- ============================================================================

-- Enable query performance tracking
SELECT pg_stat_statements_reset();

-- Set up database monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Performance monitoring views will be created by monitoring tools

-- ============================================================================
-- Database Schema Version
-- ============================================================================

CREATE TABLE schema_migrations (
    version VARCHAR(14) PRIMARY KEY,
    description VARCHAR(255),
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) VALUES 
('20250808000001', 'Initial Basketball League Management Platform Schema - Phase 2');

-- ============================================================================
-- End of Schema
-- ============================================================================