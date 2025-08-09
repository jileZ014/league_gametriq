-- Migration: 001_create_schedule_tables
-- Create comprehensive schedule management tables for Basketball League Management Platform
-- Date: 2025-01-21

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Seasons table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start DATE NOT NULL,
    registration_deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'REGISTRATION_OPEN', 'ACTIVE', 'COMPLETED')),
    registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    settings JSONB DEFAULT '{}',
    max_games_per_team INTEGER DEFAULT 20,
    playoffs_enabled BOOLEAN DEFAULT false,
    playoff_format JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT seasons_dates_check CHECK (end_date > start_date),
    CONSTRAINT seasons_registration_check CHECK (registration_deadline <= start_date),
    CONSTRAINT seasons_fee_check CHECK (registration_fee >= 0)
);

-- Divisions table
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    skill_level VARCHAR(20) NOT NULL CHECK (skill_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE')),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'COED')),
    max_teams INTEGER NOT NULL DEFAULT 12,
    min_teams_to_start INTEGER NOT NULL DEFAULT 4,
    max_players_per_team INTEGER NOT NULL DEFAULT 15,
    min_players_per_team INTEGER NOT NULL DEFAULT 8,
    rules JSONB DEFAULT '{}',
    additional_fee DECIMAL(10,2) DEFAULT 0,
    requires_tryouts BOOLEAN DEFAULT false,
    tryout_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT divisions_age_check CHECK (max_age >= min_age AND min_age >= 6 AND max_age <= 18),
    CONSTRAINT divisions_teams_check CHECK (max_teams >= min_teams_to_start),
    CONSTRAINT divisions_players_check CHECK (max_players_per_team >= min_players_per_team)
);

-- Venues table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    venue_code VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INDOOR', 'OUTDOOR', 'HYBRID')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    location GEOMETRY(POINT, 4326),
    contact_info JSONB DEFAULT '{}',
    operating_hours JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    rental_cost_per_hour DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    capacity INTEGER NOT NULL,
    accessible BOOLEAN DEFAULT true,
    directions TEXT,
    parking_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT venues_capacity_check CHECK (capacity > 0),
    CONSTRAINT venues_cost_check CHECK (rental_cost_per_hour >= 0)
);

-- Courts table (multiple courts per venue)
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('FULL', 'HALF', 'PRACTICE')),
    surface VARCHAR(20) NOT NULL CHECK (surface IN ('HARDWOOD', 'SYNTHETIC', 'OUTDOOR')),
    size VARCHAR(20) NOT NULL CHECK (size IN ('REGULATION', 'YOUTH', 'CUSTOM')),
    length_feet DECIMAL(5,1) NOT NULL,
    width_feet DECIMAL(5,1) NOT NULL,
    active BOOLEAN DEFAULT true,
    amenities JSONB DEFAULT '{}',
    maintenance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT courts_dimensions_check CHECK (length_feet > 0 AND width_feet > 0)
);

-- Venue availability table
CREATE TABLE venue_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('AVAILABLE', 'BLOCKED', 'MAINTENANCE')),
    cost_per_hour DECIMAL(10,2) DEFAULT 0,
    priority INTEGER DEFAULT 1,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT venue_availability_time_check CHECK (end_time > start_time),
    CONSTRAINT venue_availability_dates_check CHECK (expiry_date IS NULL OR expiry_date > effective_date)
);

-- Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL,
    away_team_id UUID NOT NULL,
    venue_id UUID NOT NULL REFERENCES venues(id),
    court_id UUID REFERENCES courts(id),
    game_number VARCHAR(20) NOT NULL,
    game_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR' CHECK (game_type IN ('REGULAR', 'PLAYOFF', 'CHAMPIONSHIP', 'SCRIMMAGE')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FORFEITED', 'POSTPONED')),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    winner_team_id UUID,
    game_time JSONB DEFAULT '{}',
    period INTEGER DEFAULT 0,
    period_status VARCHAR(20) DEFAULT 'NOT_STARTED',
    notes TEXT,
    cancelled_reason TEXT,
    forfeiting_team_id UUID,
    temperature_f DECIMAL(5,1),
    weather_conditions JSONB,
    heat_policy_applied BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT games_teams_check CHECK (home_team_id != away_team_id),
    CONSTRAINT games_scores_check CHECK (home_score >= 0 AND away_score >= 0),
    CONSTRAINT games_times_check CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

-- Game events table (for event sourcing)
CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_type_id VARCHAR(50) NOT NULL,
    sequence_number INTEGER NOT NULL,
    period VARCHAR(10) NOT NULL,
    game_time VARCHAR(10),
    team_id UUID,
    player_id UUID,
    assisting_player_id UUID,
    event_data JSONB DEFAULT '{}',
    description TEXT,
    recorded_by UUID NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    system_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT game_events_sequence_check CHECK (sequence_number > 0)
);

-- Event types lookup table
CREATE TABLE event_types (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(20) NOT NULL CHECK (category IN ('SCORE', 'FOUL', 'TIMEOUT', 'SUBSTITUTION', 'TECHNICAL')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_data JSONB DEFAULT '{}',
    affects_score BOOLEAN DEFAULT false,
    affects_fouls BOOLEAN DEFAULT false,
    affects_statistics BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game statistics table
CREATE TABLE game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID,
    player_id UUID,
    statistic_type VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL DEFAULT 0,
    breakdown JSONB DEFAULT '{}',
    official BOOLEAN DEFAULT true,
    calculated_from VARCHAR(255),
    calculated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game officials table
CREATE TABLE game_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('REFEREE', 'SCOREKEEPER', 'TIMEKEEPER')),
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'CONFIRMED', 'NO_SHOW', 'REPLACED')),
    compensation DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blackout dates table
CREATE TABLE blackout_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('HOLIDAY', 'MAINTENANCE', 'WEATHER', 'EVENT', 'OTHER')),
    affects_venues UUID[] DEFAULT '{}',
    affects_divisions UUID[] DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT blackout_dates_check CHECK (end_date >= start_date)
);

-- Schedule generation logs table
CREATE TABLE schedule_generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    games_generated INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    generation_time_ms INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    error_message TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standings table
CREATE TABLE standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    team_id UUID NOT NULL,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    point_differential INTEGER DEFAULT 0,
    win_percentage DECIMAL(5,3) DEFAULT 0.000,
    home_wins INTEGER DEFAULT 0,
    home_losses INTEGER DEFAULT 0,
    away_wins INTEGER DEFAULT 0,
    away_losses INTEGER DEFAULT 0,
    division_rank INTEGER,
    league_rank INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT standings_games_check CHECK (games_played = wins + losses + ties),
    CONSTRAINT standings_records_check CHECK (wins >= 0 AND losses >= 0 AND ties >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_seasons_organization_status ON seasons(organization_id, status);
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX idx_divisions_league_org ON divisions(league_id, organization_id);
CREATE INDEX idx_venues_organization_active ON venues(organization_id, active);
CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_courts_venue ON courts(venue_id);
CREATE INDEX idx_venue_availability_venue_day ON venue_availability(venue_id, day_of_week);
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_scheduled_time ON games(scheduled_time);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_games_venue ON games(venue_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_events_game_sequence ON game_events(game_id, sequence_number);
CREATE INDEX idx_game_statistics_game ON game_statistics(game_id);
CREATE INDEX idx_game_officials_game ON game_officials(game_id);
CREATE INDEX idx_blackout_dates_season ON blackout_dates(season_id);
CREATE INDEX idx_blackout_dates_dates ON blackout_dates(start_date, end_date);
CREATE INDEX idx_standings_season_division ON standings(season_id, division_id);
CREATE INDEX idx_standings_team ON standings(team_id);

-- Create unique constraints
CREATE UNIQUE INDEX idx_seasons_org_slug ON seasons(organization_id, slug);
CREATE UNIQUE INDEX idx_divisions_org_code ON divisions(organization_id, code);
CREATE UNIQUE INDEX idx_venues_org_code ON venues(organization_id, venue_code);
CREATE UNIQUE INDEX idx_games_season_number ON games(season_id, game_number);
CREATE UNIQUE INDEX idx_standings_season_team ON standings(season_id, team_id);

-- Insert default event types
INSERT INTO event_types (id, category, name, description, affects_score, affects_fouls, affects_statistics) VALUES
('SCORE_2PT', 'SCORE', '2-Point Field Goal', 'Successful 2-point field goal', true, false, true),
('SCORE_3PT', 'SCORE', '3-Point Field Goal', 'Successful 3-point field goal', true, false, true),
('FREE_THROW_MADE', 'SCORE', 'Free Throw Made', 'Successful free throw', true, false, true),
('FREE_THROW_MISSED', 'SCORE', 'Free Throw Missed', 'Missed free throw', false, false, true),
('FIELD_GOAL_MISSED', 'SCORE', 'Field Goal Missed', 'Missed field goal attempt', false, false, true),
('REBOUND_OFFENSIVE', 'SCORE', 'Offensive Rebound', 'Offensive rebound', false, false, true),
('REBOUND_DEFENSIVE', 'SCORE', 'Defensive Rebound', 'Defensive rebound', false, false, true),
('ASSIST', 'SCORE', 'Assist', 'Assist on made basket', false, false, true),
('STEAL', 'SCORE', 'Steal', 'Steal', false, false, true),
('BLOCK', 'SCORE', 'Block', 'Blocked shot', false, false, true),
('TURNOVER', 'SCORE', 'Turnover', 'Turnover', false, false, true),
('FOUL_PERSONAL', 'FOUL', 'Personal Foul', 'Personal foul', false, true, true),
('FOUL_TECHNICAL', 'TECHNICAL', 'Technical Foul', 'Technical foul', false, true, true),
('FOUL_FLAGRANT', 'FOUL', 'Flagrant Foul', 'Flagrant foul', false, true, true),
('TIMEOUT_TEAM', 'TIMEOUT', 'Team Timeout', 'Team timeout called', false, false, false),
('TIMEOUT_OFFICIAL', 'TIMEOUT', 'Official Timeout', 'Official timeout', false, false, false),
('SUBSTITUTION', 'SUBSTITUTION', 'Substitution', 'Player substitution', false, false, false),
('PERIOD_START', 'GAME', 'Period Start', 'Period/quarter start', false, false, false),
('PERIOD_END', 'GAME', 'Period End', 'Period/quarter end', false, false, false),
('GAME_START', 'GAME', 'Game Start', 'Game started', false, false, false),
('GAME_END', 'GAME', 'Game End', 'Game ended', false, false, false);

-- Add comments for documentation
COMMENT ON TABLE seasons IS 'Basketball seasons with registration and playoff information';
COMMENT ON TABLE divisions IS 'Age and skill-based divisions within leagues';
COMMENT ON TABLE venues IS 'Game venues with location and availability information';
COMMENT ON TABLE courts IS 'Individual courts within venues';
COMMENT ON TABLE games IS 'Scheduled games with scores and status tracking';
COMMENT ON TABLE game_events IS 'Event sourcing for all game actions and statistics';
COMMENT ON TABLE standings IS 'Team standings calculated from game results';
COMMENT ON TABLE blackout_dates IS 'Dates when games cannot be scheduled';

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER courts_updated_at BEFORE UPDATE ON courts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER venue_availability_updated_at BEFORE UPDATE ON venue_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER game_statistics_updated_at BEFORE UPDATE ON game_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER game_officials_updated_at BEFORE UPDATE ON game_officials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER blackout_dates_updated_at BEFORE UPDATE ON blackout_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER schedule_generation_logs_updated_at BEFORE UPDATE ON schedule_generation_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER standings_updated_at BEFORE UPDATE ON standings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();