-- Migration: Create Tournament Management Tables
-- Description: Comprehensive tournament system with brackets, scheduling, and court management
-- Author: System
-- Date: 2025-01-13

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50) NOT NULL CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'pool_play')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    registration_open_date TIMESTAMP,
    registration_close_date TIMESTAMP,
    min_teams INTEGER DEFAULT 8,
    max_teams INTEGER DEFAULT 64,
    current_team_count INTEGER DEFAULT 0,
    seeding_method VARCHAR(50) DEFAULT 'ranked' CHECK (seeding_method IN ('manual', 'random', 'ranked', 'snake')),
    settings JSONB,
    prizes JSONB,
    divisions JSONB,
    entry_fee DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    venues JSONB,
    bracket_data JSONB,
    schedule JSONB,
    current_round INTEGER DEFAULT 0,
    total_rounds INTEGER,
    champion_id UUID,
    runner_up_id UUID,
    statistics JSONB,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_tournament_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create tournament_teams table
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    team_id UUID NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    division_id UUID,
    seed INTEGER,
    pool_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'checked_in', 'active', 'eliminated', 'withdrawn', 'disqualified')),
    registration JSONB,
    roster JSONB,
    coaches JSONB,
    regular_season_record JSONB,
    tournament_record JSONB,
    pool_play_record JSONB,
    statistics JSONB,
    current_round INTEGER DEFAULT 0,
    eliminated_in_round INTEGER,
    eliminated_by UUID,
    final_placement INTEGER,
    checked_in_at TIMESTAMP,
    checked_in_by UUID,
    is_waitlisted BOOLEAN DEFAULT FALSE,
    waitlist_position INTEGER,
    preferences JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tournament_team_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tournament_team_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT uq_tournament_team UNIQUE (tournament_id, team_id)
);

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    match_number VARCHAR(100) NOT NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    match_type VARCHAR(50) DEFAULT 'bracket' CHECK (match_type IN ('pool_play', 'bracket', 'placement', 'consolation', 'championship', 'third_place', 'quarterfinal', 'semifinal', 'final')),
    bracket VARCHAR(50),
    home_team_id UUID,
    away_team_id UUID,
    home_team_placeholder VARCHAR(255),
    away_team_placeholder VARCHAR(255),
    home_team_seed INTEGER,
    away_team_seed INTEGER,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    score_by_period JSONB,
    winner_id UUID,
    loser_id UUID,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'halftime', 'completed', 'postponed', 'cancelled', 'forfeited', 'no_contest')),
    scheduled_time TIMESTAMP,
    duration INTEGER, -- in minutes
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    court_id UUID,
    venue_id UUID,
    officials JSONB,
    game_stats JSONB,
    next_matches JSONB,
    previous_matches JSONB,
    is_forfeit BOOLEAN DEFAULT FALSE,
    forfeiting_team_id UUID,
    forfeit_reason TEXT,
    has_overtime BOOLEAN DEFAULT FALSE,
    overtime_periods INTEGER DEFAULT 0,
    incidents JSONB,
    notes TEXT,
    is_live BOOLEAN DEFAULT FALSE,
    is_highlighted BOOLEAN DEFAULT FALSE,
    viewer_count INTEGER DEFAULT 0,
    streaming_info JSONB,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tournament_match_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tournament_match_home_team FOREIGN KEY (home_team_id) REFERENCES tournament_teams(id),
    CONSTRAINT fk_tournament_match_away_team FOREIGN KEY (away_team_id) REFERENCES tournament_teams(id),
    CONSTRAINT fk_tournament_match_court FOREIGN KEY (court_id) REFERENCES tournament_courts(id)
);

-- Create tournament_courts table
CREATE TABLE IF NOT EXISTS tournament_courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    venue_id UUID,
    name VARCHAR(255) NOT NULL,
    court_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'reserved', 'maintenance', 'unavailable')),
    quality VARCHAR(50) DEFAULT 'primary' CHECK (quality IN ('championship', 'primary', 'secondary', 'practice')),
    priority INTEGER DEFAULT 1,
    features JSONB,
    availability JSONB,
    schedule JSONB,
    restrictions JSONB,
    location JSONB,
    games_played INTEGER DEFAULT 0,
    games_scheduled INTEGER DEFAULT 0,
    maintenance_log JSONB,
    equipment JSONB,
    hourly_rate DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    assigned_staff_id UUID,
    staff_schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tournament_court_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_tournaments_organization_status ON tournaments(organization_id, status);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_format ON tournaments(format);

CREATE INDEX idx_tournament_teams_tournament_status ON tournament_teams(tournament_id, status);
CREATE INDEX idx_tournament_teams_tournament_seed ON tournament_teams(tournament_id, seed);
CREATE INDEX idx_tournament_teams_pool ON tournament_teams(pool_id);
CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id);

CREATE INDEX idx_tournament_matches_tournament_round_position ON tournament_matches(tournament_id, round, position);
CREATE INDEX idx_tournament_matches_tournament_status ON tournament_matches(tournament_id, status);
CREATE INDEX idx_tournament_matches_scheduled_time ON tournament_matches(scheduled_time);
CREATE INDEX idx_tournament_matches_court ON tournament_matches(court_id);
CREATE INDEX idx_tournament_matches_home_team ON tournament_matches(home_team_id);
CREATE INDEX idx_tournament_matches_away_team ON tournament_matches(away_team_id);

CREATE INDEX idx_tournament_courts_tournament_status ON tournament_courts(tournament_id, status);
CREATE INDEX idx_tournament_courts_venue ON tournament_courts(venue_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_tournament_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_updated_at();

CREATE TRIGGER update_tournament_teams_updated_at
    BEFORE UPDATE ON tournament_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_updated_at();

CREATE TRIGGER update_tournament_matches_updated_at
    BEFORE UPDATE ON tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_updated_at();

CREATE TRIGGER update_tournament_courts_updated_at
    BEFORE UPDATE ON tournament_courts
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_updated_at();

-- Create function to update tournament team count
CREATE OR REPLACE FUNCTION update_tournament_team_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tournaments 
        SET current_team_count = current_team_count + 1 
        WHERE id = NEW.tournament_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tournaments 
        SET current_team_count = current_team_count - 1 
        WHERE id = OLD.tournament_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_count_on_insert
    AFTER INSERT ON tournament_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_team_count();

CREATE TRIGGER update_team_count_on_delete
    AFTER DELETE ON tournament_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_team_count();

-- Add RLS policies for multi-tenancy
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_courts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tournaments_organization_policy ON tournaments
    FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY tournament_teams_organization_policy ON tournament_teams
    FOR ALL USING (
        tournament_id IN (
            SELECT id FROM tournaments 
            WHERE organization_id = current_setting('app.current_organization_id')::UUID
        )
    );

CREATE POLICY tournament_matches_organization_policy ON tournament_matches
    FOR ALL USING (
        tournament_id IN (
            SELECT id FROM tournaments 
            WHERE organization_id = current_setting('app.current_organization_id')::UUID
        )
    );

CREATE POLICY tournament_courts_organization_policy ON tournament_courts
    FOR ALL USING (
        tournament_id IN (
            SELECT id FROM tournaments 
            WHERE organization_id = current_setting('app.current_organization_id')::UUID
        )
    );

-- Create view for tournament standings
CREATE OR REPLACE VIEW tournament_standings AS
SELECT 
    tt.tournament_id,
    tt.team_id,
    tt.team_name,
    tt.seed,
    tt.pool_id,
    tt.status,
    COALESCE((tt.tournament_record->>'wins')::INTEGER, 0) as wins,
    COALESCE((tt.tournament_record->>'losses')::INTEGER, 0) as losses,
    COALESCE((tt.tournament_record->>'pointsFor')::INTEGER, 0) as points_for,
    COALESCE((tt.tournament_record->>'pointsAgainst')::INTEGER, 0) as points_against,
    COALESCE((tt.tournament_record->>'pointsFor')::INTEGER, 0) - 
    COALESCE((tt.tournament_record->>'pointsAgainst')::INTEGER, 0) as point_differential,
    tt.current_round,
    tt.final_placement
FROM tournament_teams tt
ORDER BY 
    tt.final_placement NULLS LAST,
    wins DESC,
    point_differential DESC;

-- Create view for live matches
CREATE OR REPLACE VIEW live_tournament_matches AS
SELECT 
    tm.*,
    ht.team_name as home_team_name,
    at.team_name as away_team_name,
    tc.name as court_name
FROM tournament_matches tm
LEFT JOIN tournament_teams ht ON tm.home_team_id = ht.id
LEFT JOIN tournament_teams at ON tm.away_team_id = at.id
LEFT JOIN tournament_courts tc ON tm.court_id = tc.id
WHERE tm.status IN ('in_progress', 'halftime')
   OR (tm.status = 'scheduled' AND tm.scheduled_time <= CURRENT_TIMESTAMP + INTERVAL '30 minutes');

-- Grant permissions
GRANT ALL ON tournaments TO authenticated;
GRANT ALL ON tournament_teams TO authenticated;
GRANT ALL ON tournament_matches TO authenticated;
GRANT ALL ON tournament_courts TO authenticated;
GRANT SELECT ON tournament_standings TO authenticated;
GRANT SELECT ON live_tournament_matches TO authenticated;