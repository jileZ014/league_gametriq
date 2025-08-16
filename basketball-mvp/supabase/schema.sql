-- Basketball League MVP Database Schema
-- Designed for Phoenix market: 80+ leagues, 3,500+ teams, 1000+ concurrent users
-- Optimized for real-time updates and offline-first architecture

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For exclusion constraints

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS player_game_stats CASCADE;
DROP TABLE IF EXISTS team_game_stats CASCADE;
DROP TABLE IF EXISTS tournament_games CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==========================================
-- CORE TABLES
-- ==========================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$' OR phone IS NULL)
);

-- User roles table (multi-role support)
CREATE TABLE user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'parent', 'player', 'referee', 'scorekeeper', 'spectator')),
    entity_type TEXT CHECK (entity_type IN ('league', 'team', 'game', NULL)),
    entity_id UUID,
    is_active BOOLEAN DEFAULT true NOT NULL,
    valid_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Prevent duplicate active roles
    CONSTRAINT unique_active_role UNIQUE (user_id, role, entity_type, entity_id, is_active),
    -- Ensure temporal validity
    CONSTRAINT valid_time_range CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Leagues table
CREATE TABLE leagues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    location TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL, -- Store league-specific rules
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Seasons table
CREATE TABLE seasons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start DATE,
    registration_end DATE,
    is_active BOOLEAN DEFAULT false NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_season_dates CHECK (end_date > start_date),
    CONSTRAINT valid_registration_dates CHECK (
        (registration_start IS NULL AND registration_end IS NULL) OR
        (registration_end > registration_start)
    ),
    CONSTRAINT unique_season_name UNIQUE (league_id, name)
);

-- Divisions table (age groups/skill levels)
CREATE TABLE divisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age_group TEXT,
    skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'elite', NULL)),
    gender TEXT CHECK (gender IN ('male', 'female', 'mixed', NULL)),
    max_roster_size INTEGER DEFAULT 12,
    min_roster_size INTEGER DEFAULT 8,
    game_rules JSONB DEFAULT '{}' NOT NULL, -- quarters vs halves, timeout rules, etc.
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_roster_size CHECK (max_roster_size >= min_roster_size),
    CONSTRAINT unique_division UNIQUE (season_id, name)
);

-- Teams table
CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assistant_coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    home_venue TEXT,
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    wins INTEGER DEFAULT 0 NOT NULL,
    losses INTEGER DEFAULT 0 NOT NULL,
    ties INTEGER DEFAULT 0 NOT NULL,
    points_for INTEGER DEFAULT 0 NOT NULL,
    points_against INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT unique_team_name UNIQUE (division_id, name),
    CONSTRAINT valid_colors CHECK (
        (primary_color ~ '^#[0-9A-Fa-f]{6}$' OR primary_color IS NULL) AND
        (secondary_color ~ '^#[0-9A-Fa-f]{6}$' OR secondary_color IS NULL)
    )
);

-- Team players (roster management with temporal validity)
CREATE TABLE team_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    jersey_number INTEGER,
    position TEXT CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C', NULL)),
    is_captain BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    medical_clearance BOOLEAN DEFAULT false NOT NULL,
    emergency_contact JSONB,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_jersey_number UNIQUE (team_id, jersey_number, is_active),
    CONSTRAINT unique_active_player UNIQUE (team_id, player_id, is_active),
    CONSTRAINT valid_jersey_number CHECK (jersey_number BETWEEN 0 AND 99),
    CONSTRAINT valid_membership_period CHECK (left_at IS NULL OR left_at > joined_at)
);

-- ==========================================
-- GAME MANAGEMENT TABLES
-- ==========================================

-- Games table
CREATE TABLE games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    venue TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    game_type TEXT DEFAULT 'regular' CHECK (game_type IN ('regular', 'playoff', 'tournament', 'scrimmage')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
    
    -- Score tracking
    home_score INTEGER DEFAULT 0 NOT NULL,
    away_score INTEGER DEFAULT 0 NOT NULL,
    current_period INTEGER DEFAULT 1 NOT NULL,
    current_period_time_remaining INTEGER, -- seconds
    
    -- Foul and timeout tracking
    home_team_fouls INTEGER DEFAULT 0 NOT NULL,
    away_team_fouls INTEGER DEFAULT 0 NOT NULL,
    home_timeouts_remaining INTEGER DEFAULT 3 NOT NULL,
    away_timeouts_remaining INTEGER DEFAULT 3 NOT NULL,
    
    -- Officials
    referee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    scorekeeper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id),
    CONSTRAINT valid_scores CHECK (home_score >= 0 AND away_score >= 0),
    CONSTRAINT valid_period CHECK (current_period >= 1 AND current_period <= 6),
    CONSTRAINT valid_fouls CHECK (home_team_fouls >= 0 AND away_team_fouls >= 0),
    CONSTRAINT valid_timeouts CHECK (home_timeouts_remaining >= 0 AND away_timeouts_remaining >= 0)
);

-- Team game statistics
CREATE TABLE team_game_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Quarter/Period scores
    period_scores JSONB DEFAULT '[]' NOT NULL, -- Array of period scores
    
    -- Team statistics
    field_goals_made INTEGER DEFAULT 0 NOT NULL,
    field_goals_attempted INTEGER DEFAULT 0 NOT NULL,
    three_pointers_made INTEGER DEFAULT 0 NOT NULL,
    three_pointers_attempted INTEGER DEFAULT 0 NOT NULL,
    free_throws_made INTEGER DEFAULT 0 NOT NULL,
    free_throws_attempted INTEGER DEFAULT 0 NOT NULL,
    offensive_rebounds INTEGER DEFAULT 0 NOT NULL,
    defensive_rebounds INTEGER DEFAULT 0 NOT NULL,
    assists INTEGER DEFAULT 0 NOT NULL,
    steals INTEGER DEFAULT 0 NOT NULL,
    blocks INTEGER DEFAULT 0 NOT NULL,
    turnovers INTEGER DEFAULT 0 NOT NULL,
    personal_fouls INTEGER DEFAULT 0 NOT NULL,
    technical_fouls INTEGER DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_team_game_stats UNIQUE (game_id, team_id),
    CONSTRAINT valid_field_goals CHECK (field_goals_made <= field_goals_attempted),
    CONSTRAINT valid_three_pointers CHECK (three_pointers_made <= three_pointers_attempted),
    CONSTRAINT valid_free_throws CHECK (free_throws_made <= free_throws_attempted)
);

-- Player game statistics
CREATE TABLE player_game_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Playing time
    minutes_played NUMERIC(4,1) DEFAULT 0 NOT NULL,
    started BOOLEAN DEFAULT false NOT NULL,
    
    -- Scoring
    points INTEGER DEFAULT 0 NOT NULL,
    field_goals_made INTEGER DEFAULT 0 NOT NULL,
    field_goals_attempted INTEGER DEFAULT 0 NOT NULL,
    three_pointers_made INTEGER DEFAULT 0 NOT NULL,
    three_pointers_attempted INTEGER DEFAULT 0 NOT NULL,
    free_throws_made INTEGER DEFAULT 0 NOT NULL,
    free_throws_attempted INTEGER DEFAULT 0 NOT NULL,
    
    -- Rebounds
    offensive_rebounds INTEGER DEFAULT 0 NOT NULL,
    defensive_rebounds INTEGER DEFAULT 0 NOT NULL,
    
    -- Other stats
    assists INTEGER DEFAULT 0 NOT NULL,
    steals INTEGER DEFAULT 0 NOT NULL,
    blocks INTEGER DEFAULT 0 NOT NULL,
    turnovers INTEGER DEFAULT 0 NOT NULL,
    personal_fouls INTEGER DEFAULT 0 NOT NULL,
    technical_fouls INTEGER DEFAULT 0 NOT NULL,
    flagrant_fouls INTEGER DEFAULT 0 NOT NULL,
    
    -- Calculated fields (can be computed via triggers)
    plus_minus INTEGER DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_player_game_stats UNIQUE (game_id, player_id),
    CONSTRAINT valid_minutes CHECK (minutes_played >= 0 AND minutes_played <= 48),
    CONSTRAINT valid_player_field_goals CHECK (field_goals_made <= field_goals_attempted),
    CONSTRAINT valid_player_three_pointers CHECK (three_pointers_made <= three_pointers_attempted),
    CONSTRAINT valid_player_free_throws CHECK (free_throws_made <= free_throws_attempted),
    CONSTRAINT valid_fouls_count CHECK (personal_fouls >= 0 AND personal_fouls <= 6)
);

-- Game events (for play-by-play and event sourcing)
CREATE TABLE game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'game_start', 'game_end', 'period_start', 'period_end',
        'field_goal_made', 'field_goal_missed', 'three_pointer_made', 'three_pointer_missed',
        'free_throw_made', 'free_throw_missed', 'rebound_offensive', 'rebound_defensive',
        'assist', 'steal', 'block', 'turnover', 'foul_personal', 'foul_technical', 'foul_flagrant',
        'timeout', 'substitution_in', 'substitution_out'
    )),
    period INTEGER NOT NULL,
    game_clock INTEGER NOT NULL, -- seconds remaining in period
    points_value INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Indexes for fast querying
    CONSTRAINT valid_period_event CHECK (period BETWEEN 1 AND 6),
    CONSTRAINT valid_game_clock CHECK (game_clock >= 0)
);

-- ==========================================
-- TOURNAMENT TABLES
-- ==========================================

-- Tournaments table
CREATE TABLE tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tournament_type TEXT DEFAULT 'single_elimination' CHECK (
        tournament_type IN ('single_elimination', 'double_elimination', 'round_robin', 'pool_play')
    ),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_teams INTEGER DEFAULT 16 NOT NULL,
    entry_fee NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    bracket_data JSONB DEFAULT '{}', -- Store bracket structure
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_tournament_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_max_teams CHECK (max_teams > 0 AND max_teams <= 64)
);

-- Tournament teams
CREATE TABLE tournament_teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    seed INTEGER,
    pool TEXT,
    is_eliminated BOOLEAN DEFAULT false NOT NULL,
    final_placement INTEGER,
    registration_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    
    -- Constraints
    CONSTRAINT unique_tournament_team UNIQUE (tournament_id, team_id),
    CONSTRAINT valid_seed CHECK (seed IS NULL OR seed > 0)
);

-- Tournament games (links games to tournaments)
CREATE TABLE tournament_games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    bracket_position TEXT, -- e.g., "QF1", "SF2", "F"
    
    -- Constraints
    CONSTRAINT unique_tournament_game UNIQUE (tournament_id, game_id),
    CONSTRAINT valid_round CHECK (round > 0)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- User and role indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_updated_at ON profiles(updated_at DESC);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE is_active = true;
CREATE INDEX idx_user_roles_entity ON user_roles(entity_type, entity_id) WHERE is_active = true;
CREATE INDEX idx_user_roles_role ON user_roles(role) WHERE is_active = true;

-- League and season indexes
CREATE INDEX idx_leagues_slug ON leagues(slug);
CREATE INDEX idx_leagues_active ON leagues(is_active) WHERE is_active = true;
CREATE INDEX idx_seasons_league_id ON seasons(league_id);
CREATE INDEX idx_seasons_active ON seasons(is_active) WHERE is_active = true;
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);

-- Division and team indexes
CREATE INDEX idx_divisions_season_id ON divisions(season_id);
CREATE INDEX idx_teams_division_id ON teams(division_id);
CREATE INDEX idx_teams_coach_id ON teams(coach_id);
CREATE INDEX idx_teams_standings ON teams(division_id, wins DESC, points_for DESC);

-- Roster indexes
CREATE INDEX idx_team_players_team_id ON team_players(team_id) WHERE is_active = true;
CREATE INDEX idx_team_players_player_id ON team_players(player_id) WHERE is_active = true;
CREATE INDEX idx_team_players_parent_id ON team_players(parent_id) WHERE parent_id IS NOT NULL;

-- Game indexes (critical for performance)
CREATE INDEX idx_games_division_id ON games(division_id);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_scheduled_at ON games(scheduled_at);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_in_progress ON games(status) WHERE status = 'in_progress';
CREATE INDEX idx_games_today ON games(scheduled_at) 
    WHERE scheduled_at >= CURRENT_DATE AND scheduled_at < CURRENT_DATE + INTERVAL '1 day';

-- Game statistics indexes
CREATE INDEX idx_team_game_stats_game_id ON team_game_stats(game_id);
CREATE INDEX idx_team_game_stats_team_id ON team_game_stats(team_id);
CREATE INDEX idx_player_game_stats_game_id ON player_game_stats(game_id);
CREATE INDEX idx_player_game_stats_player_id ON player_game_stats(player_id);
CREATE INDEX idx_player_game_stats_team_id ON player_game_stats(team_id);

-- Game events indexes (for real-time and play-by-play)
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_created_at ON game_events(game_id, created_at);
CREATE INDEX idx_game_events_player_id ON game_events(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_game_events_type ON game_events(event_type);

-- Tournament indexes
CREATE INDEX idx_tournaments_division_id ON tournaments(division_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team_id ON tournament_teams(team_id);
CREATE INDEX idx_tournament_games_tournament_id ON tournament_games(tournament_id);
CREATE INDEX idx_tournament_games_game_id ON tournament_games(game_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_games ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles" 
    ON user_roles FOR SELECT 
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin' 
        AND ur.is_active = true
    ));

CREATE POLICY "Admins can manage roles" 
    ON user_roles FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin' 
        AND ur.is_active = true
    ));

-- Leagues policies (public read, admin write)
CREATE POLICY "Leagues are viewable by everyone" 
    ON leagues FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage leagues" 
    ON leagues FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- Seasons policies
CREATE POLICY "Seasons are viewable by everyone" 
    ON seasons FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage seasons" 
    ON seasons FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- Divisions policies
CREATE POLICY "Divisions are viewable by everyone" 
    ON divisions FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage divisions" 
    ON divisions FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- Teams policies
CREATE POLICY "Teams are viewable by everyone" 
    ON teams FOR SELECT 
    USING (true);

CREATE POLICY "Coaches can update their teams" 
    ON teams FOR UPDATE 
    USING (coach_id = auth.uid() OR assistant_coach_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'coach')
        AND entity_type = 'team' 
        AND entity_id = teams.id 
        AND is_active = true
    ));

CREATE POLICY "Admins can manage teams" 
    ON teams FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- Team players policies
CREATE POLICY "Rosters are viewable by everyone" 
    ON team_players FOR SELECT 
    USING (true);

CREATE POLICY "Coaches can manage their rosters" 
    ON team_players FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM teams t 
        WHERE t.id = team_players.team_id 
        AND (t.coach_id = auth.uid() OR t.assistant_coach_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'coach')
        AND entity_type = 'team' 
        AND entity_id = team_players.team_id 
        AND is_active = true
    ));

-- Games policies
CREATE POLICY "Games are viewable by everyone" 
    ON games FOR SELECT 
    USING (true);

CREATE POLICY "Scorekeepers and referees can update games" 
    ON games FOR UPDATE 
    USING (
        scorekeeper_id = auth.uid() OR 
        referee_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'scorekeeper', 'referee')
            AND (entity_type = 'game' AND entity_id = games.id OR entity_type IS NULL)
            AND is_active = true
        )
    );

CREATE POLICY "Admins can manage games" 
    ON games FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- Game statistics policies
CREATE POLICY "Game stats are viewable by everyone" 
    ON team_game_stats FOR SELECT 
    USING (true);

CREATE POLICY "Game stats are viewable by everyone" 
    ON player_game_stats FOR SELECT 
    USING (true);

CREATE POLICY "Scorekeepers can manage game stats" 
    ON team_game_stats FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM games g 
        WHERE g.id = team_game_stats.game_id 
        AND (g.scorekeeper_id = auth.uid() OR g.referee_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'scorekeeper')
        AND is_active = true
    ));

CREATE POLICY "Scorekeepers can manage player stats" 
    ON player_game_stats FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM games g 
        WHERE g.id = player_game_stats.game_id 
        AND (g.scorekeeper_id = auth.uid() OR g.referee_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'scorekeeper')
        AND is_active = true
    ));

-- Game events policies
CREATE POLICY "Game events are viewable by everyone" 
    ON game_events FOR SELECT 
    USING (true);

CREATE POLICY "Scorekeepers can insert game events" 
    ON game_events FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM games g 
        WHERE g.id = game_events.game_id 
        AND (g.scorekeeper_id = auth.uid() OR g.referee_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'scorekeeper')
        AND is_active = true
    ));

-- Tournament policies
CREATE POLICY "Tournaments are viewable by everyone" 
    ON tournaments FOR SELECT 
    USING (true);

CREATE POLICY "Tournament teams are viewable by everyone" 
    ON tournament_teams FOR SELECT 
    USING (true);

CREATE POLICY "Tournament games are viewable by everyone" 
    ON tournament_games FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage tournaments" 
    ON tournaments FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

CREATE POLICY "Admins can manage tournament teams" 
    ON tournament_teams FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

CREATE POLICY "Admins can manage tournament games" 
    ON tournament_games FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    ));

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_players_updated_at BEFORE UPDATE ON team_players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_game_stats_updated_at BEFORE UPDATE ON team_game_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_game_stats_updated_at BEFORE UPDATE ON player_game_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate player points from shots
CREATE OR REPLACE FUNCTION calculate_player_points()
RETURNS TRIGGER AS $$
BEGIN
    NEW.points = (NEW.field_goals_made - NEW.three_pointers_made) * 2 + 
                 NEW.three_pointers_made * 3 + 
                 NEW.free_throws_made;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_player_points_trigger 
    BEFORE INSERT OR UPDATE ON player_game_stats 
    FOR EACH ROW EXECUTE FUNCTION calculate_player_points();

-- Function to update team standings after game completion
CREATE OR REPLACE FUNCTION update_team_standings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update home team
        UPDATE teams SET
            wins = wins + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
            ties = ties + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
            points_for = points_for + NEW.home_score,
            points_against = points_against + NEW.away_score
        WHERE id = NEW.home_team_id;
        
        -- Update away team
        UPDATE teams SET
            wins = wins + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
            ties = ties + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
            points_for = points_for + NEW.away_score,
            points_against = points_against + NEW.home_score
        WHERE id = NEW.away_team_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_standings_after_game 
    AFTER UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_team_standings();

-- ==========================================
-- REAL-TIME SUBSCRIPTIONS
-- ==========================================

-- Enable real-time for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE player_game_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE team_game_stats;

-- ==========================================
-- SAMPLE DATA INSERTION
-- ==========================================

-- Insert sample data for testing
DO $$
DECLARE
    v_league_id UUID;
    v_season_id UUID;
    v_division_id UUID;
    v_team1_id UUID;
    v_team2_id UUID;
    v_team3_id UUID;
    v_team4_id UUID;
    v_game_id UUID;
    v_user1_id UUID;
    v_user2_id UUID;
    v_user3_id UUID;
    v_admin_id UUID;
BEGIN
    -- Create test users (Note: In production, these would be created through Supabase Auth)
    -- For testing, we'll create placeholder profiles
    v_admin_id := uuid_generate_v4();
    v_user1_id := uuid_generate_v4();
    v_user2_id := uuid_generate_v4();
    v_user3_id := uuid_generate_v4();
    
    -- Insert test profiles
    INSERT INTO profiles (id, email, full_name, phone) VALUES
        (v_admin_id, 'admin@phoenixleague.com', 'Admin User', '+14805551234'),
        (v_user1_id, 'coach1@example.com', 'John Coach', '+14805551235'),
        (v_user2_id, 'coach2@example.com', 'Sarah Coach', '+14805551236'),
        (v_user3_id, 'scorekeeper@example.com', 'Mike Scorekeeper', '+14805551237');
    
    -- Assign roles
    INSERT INTO user_roles (user_id, role, is_active) VALUES
        (v_admin_id, 'admin', true),
        (v_user1_id, 'coach', true),
        (v_user2_id, 'coach', true),
        (v_user3_id, 'scorekeeper', true);
    
    -- Create a sample league
    INSERT INTO leagues (id, name, slug, description, location, contact_email)
    VALUES (
        uuid_generate_v4(),
        'Phoenix Youth Basketball League',
        'phoenix-youth',
        'Premier youth basketball league serving the Phoenix metro area',
        'Phoenix, AZ',
        'info@phoenixleague.com'
    ) RETURNING id INTO v_league_id;
    
    -- Create a season
    INSERT INTO seasons (id, league_id, name, start_date, end_date, is_active)
    VALUES (
        uuid_generate_v4(),
        v_league_id,
        'Winter 2025',
        '2025-01-15',
        '2025-03-30',
        true
    ) RETURNING id INTO v_season_id;
    
    -- Create divisions
    INSERT INTO divisions (id, season_id, name, age_group, skill_level, gender, game_rules)
    VALUES 
        (uuid_generate_v4(), v_season_id, 'U12 Boys', '10-12', 'intermediate', 'male', 
         '{"periods": 4, "period_length": 8, "timeouts_per_half": 2, "bonus_fouls": 7}'::jsonb),
        (uuid_generate_v4(), v_season_id, 'U14 Girls', '12-14', 'intermediate', 'female',
         '{"periods": 4, "period_length": 10, "timeouts_per_half": 3, "bonus_fouls": 7}'::jsonb)
    RETURNING id INTO v_division_id;
    
    -- Create teams
    INSERT INTO teams (id, division_id, name, coach_id, home_venue, primary_color, secondary_color)
    VALUES 
        (uuid_generate_v4(), v_division_id, 'Phoenix Suns Jr', v_user1_id, 'Desert Sky Gym', '#1D1160', '#E56020'),
        (uuid_generate_v4(), v_division_id, 'Scottsdale Storm', v_user2_id, 'Scottsdale Sports Complex', '#002868', '#BEC0C2'),
        (uuid_generate_v4(), v_division_id, 'Mesa Thunder', NULL, 'Mesa Recreation Center', '#002D62', '#FDBB30'),
        (uuid_generate_v4(), v_division_id, 'Tempe Tigers', NULL, 'Tempe Community Center', '#FB4F14', '#000000')
    RETURNING id INTO v_team1_id;
    
    SELECT id INTO v_team2_id FROM teams WHERE name = 'Scottsdale Storm';
    SELECT id INTO v_team3_id FROM teams WHERE name = 'Mesa Thunder';
    SELECT id INTO v_team4_id FROM teams WHERE name = 'Tempe Tigers';
    
    -- Add sample players to teams
    FOR i IN 1..10 LOOP
        INSERT INTO profiles (id, email, full_name, date_of_birth)
        VALUES (
            uuid_generate_v4(),
            'player' || (i + 100) || '@example.com',
            'Player ' || i || ' Phoenix',
            CURRENT_DATE - INTERVAL '12 years' - (i * INTERVAL '30 days')
        );
        
        INSERT INTO team_players (team_id, player_id, jersey_number, position, is_active, medical_clearance)
        VALUES (
            v_team1_id,
            (SELECT id FROM profiles WHERE email = 'player' || (i + 100) || '@example.com'),
            i,
            CASE 
                WHEN i <= 2 THEN 'PG'
                WHEN i <= 4 THEN 'SG'
                WHEN i <= 6 THEN 'SF'
                WHEN i <= 8 THEN 'PF'
                ELSE 'C'
            END,
            true,
            true
        );
    END LOOP;
    
    -- Create sample games
    INSERT INTO games (
        id, division_id, home_team_id, away_team_id, venue, 
        scheduled_at, status, referee_id, scorekeeper_id
    )
    VALUES 
        (uuid_generate_v4(), v_division_id, v_team1_id, v_team2_id, 'Desert Sky Gym',
         CURRENT_TIMESTAMP + INTERVAL '2 days', 'scheduled', NULL, v_user3_id),
        (uuid_generate_v4(), v_division_id, v_team3_id, v_team4_id, 'Mesa Recreation Center',
         CURRENT_TIMESTAMP + INTERVAL '3 days', 'scheduled', NULL, v_user3_id),
        (uuid_generate_v4(), v_division_id, v_team1_id, v_team3_id, 'Desert Sky Gym',
         CURRENT_TIMESTAMP - INTERVAL '1 day', 'completed', NULL, v_user3_id)
    RETURNING id INTO v_game_id;
    
    -- Update the completed game with scores
    UPDATE games 
    SET home_score = 68, 
        away_score = 62, 
        status = 'completed',
        actual_start_at = scheduled_at,
        actual_end_at = scheduled_at + INTERVAL '2 hours'
    WHERE id = v_game_id;
    
    -- Create a sample tournament
    INSERT INTO tournaments (
        division_id, name, tournament_type, start_date, end_date, 
        max_teams, entry_fee, status
    )
    VALUES (
        v_division_id,
        'Phoenix Winter Championship',
        'single_elimination',
        '2025-03-15',
        '2025-03-17',
        8,
        150.00,
        'upcoming'
    );
    
    RAISE NOTICE 'Sample data inserted successfully';
END $$;

-- ==========================================
-- PERFORMANCE VIEWS (Optional but recommended)
-- ==========================================

-- View for current games with team names
CREATE OR REPLACE VIEW v_games_with_teams AS
SELECT 
    g.*,
    ht.name AS home_team_name,
    ht.logo_url AS home_team_logo,
    at.name AS away_team_name,
    at.logo_url AS away_team_logo,
    d.name AS division_name,
    s.name AS season_name,
    l.name AS league_name
FROM games g
JOIN teams ht ON g.home_team_id = ht.id
JOIN teams at ON g.away_team_id = at.id
JOIN divisions d ON g.division_id = d.id
JOIN seasons s ON d.season_id = s.id
JOIN leagues l ON s.league_id = l.id;

-- View for player season statistics
CREATE OR REPLACE VIEW v_player_season_stats AS
SELECT 
    pgs.player_id,
    p.full_name AS player_name,
    pgs.team_id,
    t.name AS team_name,
    COUNT(DISTINCT pgs.game_id) AS games_played,
    SUM(pgs.minutes_played) AS total_minutes,
    SUM(pgs.points) AS total_points,
    SUM(pgs.field_goals_made) AS total_fgm,
    SUM(pgs.field_goals_attempted) AS total_fga,
    SUM(pgs.three_pointers_made) AS total_3pm,
    SUM(pgs.three_pointers_attempted) AS total_3pa,
    SUM(pgs.free_throws_made) AS total_ftm,
    SUM(pgs.free_throws_attempted) AS total_fta,
    SUM(pgs.offensive_rebounds + pgs.defensive_rebounds) AS total_rebounds,
    SUM(pgs.assists) AS total_assists,
    SUM(pgs.steals) AS total_steals,
    SUM(pgs.blocks) AS total_blocks,
    SUM(pgs.turnovers) AS total_turnovers,
    SUM(pgs.personal_fouls) AS total_fouls,
    -- Averages
    ROUND(AVG(pgs.points), 1) AS ppg,
    ROUND(AVG(pgs.offensive_rebounds + pgs.defensive_rebounds), 1) AS rpg,
    ROUND(AVG(pgs.assists), 1) AS apg,
    -- Percentages
    CASE 
        WHEN SUM(pgs.field_goals_attempted) > 0 
        THEN ROUND(100.0 * SUM(pgs.field_goals_made) / SUM(pgs.field_goals_attempted), 1)
        ELSE 0 
    END AS fg_percentage,
    CASE 
        WHEN SUM(pgs.three_pointers_attempted) > 0 
        THEN ROUND(100.0 * SUM(pgs.three_pointers_made) / SUM(pgs.three_pointers_attempted), 1)
        ELSE 0 
    END AS three_point_percentage,
    CASE 
        WHEN SUM(pgs.free_throws_attempted) > 0 
        THEN ROUND(100.0 * SUM(pgs.free_throws_made) / SUM(pgs.free_throws_attempted), 1)
        ELSE 0 
    END AS ft_percentage
FROM player_game_stats pgs
JOIN profiles p ON pgs.player_id = p.id
JOIN teams t ON pgs.team_id = t.id
JOIN games g ON pgs.game_id = g.id
WHERE g.status = 'completed'
GROUP BY pgs.player_id, p.full_name, pgs.team_id, t.name;

-- Team standings view
CREATE OR REPLACE VIEW v_team_standings AS
SELECT 
    t.*,
    d.name AS division_name,
    s.name AS season_name,
    l.name AS league_name,
    CASE 
        WHEN (t.wins + t.losses + t.ties) > 0 
        THEN ROUND(t.wins::numeric / (t.wins + t.losses + t.ties), 3)
        ELSE 0 
    END AS win_percentage,
    t.points_for - t.points_against AS point_differential,
    ROW_NUMBER() OVER (
        PARTITION BY t.division_id 
        ORDER BY t.wins DESC, (t.points_for - t.points_against) DESC
    ) AS division_rank
FROM teams t
JOIN divisions d ON t.division_id = d.id
JOIN seasons s ON d.season_id = s.id
JOIN leagues l ON s.league_id = l.id
WHERE t.is_active = true;

-- ==========================================
-- GRANT PERMISSIONS FOR VIEWS
-- ==========================================

GRANT SELECT ON v_games_with_teams TO authenticated;
GRANT SELECT ON v_player_season_stats TO authenticated;
GRANT SELECT ON v_team_standings TO authenticated;

-- ==========================================
-- FINAL SETUP NOTES
-- ==========================================

-- 1. Ensure Supabase Auth is configured
-- 2. Run this script in the Supabase SQL editor
-- 3. Configure real-time subscriptions in your application
-- 4. Set up storage buckets for logos and avatars
-- 5. Configure email templates for notifications
-- 6. Test RLS policies with different user roles
-- 7. Monitor query performance and adjust indexes as needed

COMMENT ON SCHEMA public IS 'Basketball League MVP - Optimized for Phoenix market with 80+ leagues and 3,500+ teams';