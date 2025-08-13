-- =====================================================
-- Basketball League Platform Performance Optimization
-- Migration 009: Critical Performance Indexes
-- Target: Sub-50ms database query average
-- =====================================================

BEGIN;

-- =====================================================
-- CRITICAL INDEXES FOR LIVE GAME QUERIES
-- =====================================================

-- Games performance index - for live game tracking
-- Handles tournament day traffic spikes with 1000+ concurrent users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_live_performance 
ON games(status, league_id, game_date) 
WHERE status IN ('live', 'in_progress', 'scheduled');

-- Live games with location for court assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_live_location
ON games(status, venue_id, scheduled_time)
WHERE status IN ('live', 'in_progress');

-- Game results for standings calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_results_standings
ON games(league_id, division_id, status, game_date)
WHERE status = 'completed';

-- =====================================================
-- STANDINGS PERFORMANCE OPTIMIZATION
-- =====================================================

-- Current standings queries - heavily accessed during tournaments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_standings_current 
ON team_standings(league_id, division_id, season_id, wins DESC, losses ASC)
WHERE is_current = true;

-- Team standings lookup by ID
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_standings_team_lookup
ON team_standings(team_id, season_id)
WHERE is_current = true;

-- =====================================================
-- TOURNAMENT BRACKET PERFORMANCE
-- =====================================================

-- Tournament matches - critical for bracket display
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_matches_live 
ON tournament_matches(tournament_id, status, round_number, scheduled_time)
WHERE status IN ('scheduled', 'in_progress', 'completed');

-- Tournament bracket ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_bracket_order
ON tournament_matches(tournament_id, round_number, match_order);

-- Tournament teams for seeding
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_teams_seeding
ON tournament_teams(tournament_id, seed_position, team_id);

-- =====================================================
-- PLAYER STATISTICS AGGREGATION
-- =====================================================

-- Player stats by game date for performance trends
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_stats_aggregation 
ON player_game_stats(player_id, game_date DESC, points);

-- Player stats by team and season
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_stats_team_season
ON player_game_stats(team_id, season_id, player_id);

-- Top performers index for leaderboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_stats_leaders
ON player_game_stats(league_id, season_id, points DESC)
WHERE game_status = 'completed';

-- =====================================================
-- TEAM PERFORMANCE QUERIES
-- =====================================================

-- Team roster lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_players_active
ON team_players(team_id, season_id)
WHERE status = 'active';

-- Team game statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_game_stats_performance
ON team_game_stats(team_id, season_id, game_date DESC);

-- =====================================================
-- PAYMENT AND REGISTRATION OPTIMIZATION
-- =====================================================

-- Payment status queries - critical for registration flow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status 
ON payments(status, created_at DESC)
WHERE status IN ('pending', 'processing', 'succeeded', 'failed');

-- Registration orders by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registration_orders_tenant
ON registration_orders(organization_id, status, created_at DESC);

-- =====================================================
-- USER AND AUTHENTICATION PERFORMANCE
-- =====================================================

-- User lookup by email (authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users(email)
WHERE status = 'active';

-- User sessions for concurrent user handling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active
ON user_sessions(user_id, expires_at)
WHERE status = 'active';

-- =====================================================
-- SCHEDULING AND VENUE OPTIMIZATION
-- =====================================================

-- Game schedule by venue and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_venue_date
ON games(venue_id, game_date, scheduled_time);

-- Referee assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referee_assignments_date
ON referee_assignments(referee_id, game_date);

-- =====================================================
-- AUDIT AND LOGGING PERFORMANCE
-- =====================================================

-- Audit log cleanup and queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_date_action
ON audit_logs(created_at DESC, action, entity_type);

-- Tenant isolation performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant
ON audit_logs(organization_id, created_at DESC);

-- =====================================================
-- MATERIALIZED VIEWS FOR HEAVY AGGREGATIONS
-- =====================================================

-- Team season statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_team_season_stats AS
SELECT 
    t.team_id,
    t.team_name,
    t.league_id,
    t.division_id,
    t.season_id,
    COUNT(g.game_id) as games_played,
    SUM(CASE WHEN tgs.result = 'win' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN tgs.result = 'loss' THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN tgs.result = 'tie' THEN 1 ELSE 0 END) as ties,
    ROUND(AVG(tgs.points_scored), 2) as avg_points_scored,
    ROUND(AVG(tgs.points_allowed), 2) as avg_points_allowed,
    SUM(tgs.points_scored) as total_points_scored,
    SUM(tgs.points_allowed) as total_points_allowed,
    CASE 
        WHEN COUNT(g.game_id) > 0 
        THEN ROUND((SUM(CASE WHEN tgs.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(g.game_id)) * 100, 1)
        ELSE 0 
    END as win_percentage,
    NOW() as last_updated
FROM teams t
LEFT JOIN games g ON t.team_id IN (g.home_team_id, g.away_team_id)
LEFT JOIN team_game_stats tgs ON tgs.team_id = t.team_id AND tgs.game_id = g.game_id
WHERE t.season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
    AND (g.status = 'completed' OR g.status IS NULL)
GROUP BY t.team_id, t.team_name, t.league_id, t.division_id, t.season_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_team_season_stats_pk 
ON mv_team_season_stats(team_id, season_id);

CREATE INDEX IF NOT EXISTS idx_mv_team_season_stats_standings
ON mv_team_season_stats(league_id, division_id, wins DESC, losses ASC);

-- Player season statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_player_season_stats AS
SELECT 
    p.player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    p.league_id,
    p.season_id,
    COUNT(pgs.game_id) as games_played,
    ROUND(AVG(pgs.points), 2) as avg_points,
    ROUND(AVG(pgs.rebounds), 2) as avg_rebounds,
    ROUND(AVG(pgs.assists), 2) as avg_assists,
    MAX(pgs.points) as max_points,
    SUM(pgs.points) as total_points,
    SUM(pgs.rebounds) as total_rebounds,
    SUM(pgs.assists) as total_assists,
    NOW() as last_updated
FROM players p
LEFT JOIN player_game_stats pgs ON p.player_id = pgs.player_id
WHERE p.season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
    AND (pgs.game_status = 'completed' OR pgs.game_status IS NULL)
GROUP BY p.player_id, p.first_name, p.last_name, p.team_id, p.league_id, p.season_id;

-- Index on player materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_player_season_stats_pk
ON mv_player_season_stats(player_id, season_id);

CREATE INDEX IF NOT EXISTS idx_mv_player_season_stats_leaders
ON mv_player_season_stats(league_id, avg_points DESC);

-- =====================================================
-- AUTOMATED MATERIALIZED VIEW REFRESH
-- =====================================================

-- Function to refresh team stats
CREATE OR REPLACE FUNCTION refresh_team_stats()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_season_stats;
    RAISE NOTICE 'Team stats materialized view refreshed at %', NOW();
END;
$$;

-- Function to refresh player stats
CREATE OR REPLACE FUNCTION refresh_player_stats()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_player_season_stats;
    RAISE NOTICE 'Player stats materialized view refreshed at %', NOW();
END;
$$;

-- =====================================================
-- QUERY PERFORMANCE MONITORING
-- =====================================================

-- Performance monitoring table for slow queries
CREATE TABLE IF NOT EXISTS query_performance_log (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    table_name VARCHAR(100),
    index_used VARCHAR(100),
    rows_examined INTEGER,
    rows_returned INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (query_type, execution_time_ms DESC),
    INDEX (timestamp DESC)
);

-- Function to log slow queries (called by application)
CREATE OR REPLACE FUNCTION log_slow_query(
    p_query_hash VARCHAR(64),
    p_query_type VARCHAR(50),
    p_execution_time_ms INTEGER,
    p_table_name VARCHAR(100) DEFAULT NULL,
    p_index_used VARCHAR(100) DEFAULT NULL,
    p_rows_examined INTEGER DEFAULT NULL,
    p_rows_returned INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log queries slower than 50ms
    IF p_execution_time_ms > 50 THEN
        INSERT INTO query_performance_log (
            query_hash,
            query_type, 
            execution_time_ms,
            table_name,
            index_used,
            rows_examined,
            rows_returned
        ) VALUES (
            p_query_hash,
            p_query_type,
            p_execution_time_ms,
            p_table_name,
            p_index_used,
            p_rows_examined,
            p_rows_returned
        );
    END IF;
END;
$$;

-- =====================================================
-- DATABASE STATISTICS UPDATE
-- =====================================================

-- Schedule statistics updates for query planner optimization
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update statistics for critical tables
    ANALYZE games;
    ANALYZE team_standings;
    ANALYZE player_game_stats;
    ANALYZE tournament_matches;
    ANALYZE payments;
    ANALYZE users;
    
    RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$;

-- =====================================================
-- PERFORMANCE CONSTRAINTS AND VALIDATIONS
-- =====================================================

-- Ensure tournament matches have valid scheduling
ALTER TABLE tournament_matches 
ADD CONSTRAINT chk_tournament_match_timing 
CHECK (scheduled_time > created_at);

-- Ensure game dates are reasonable
ALTER TABLE games
ADD CONSTRAINT chk_game_date_reasonable
CHECK (game_date >= '2024-01-01' AND game_date <= '2030-12-31');

-- Ensure player stats are realistic
ALTER TABLE player_game_stats
ADD CONSTRAINT chk_player_stats_realistic
CHECK (points >= 0 AND points <= 200 AND rebounds >= 0 AND rebounds <= 50);

COMMIT;

-- =====================================================
-- POST-MIGRATION PERFORMANCE VERIFICATION
-- =====================================================

-- Verify index creation
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%performance%' OR indexname LIKE 'idx_%live%';
    
    RAISE NOTICE 'Created % performance indexes', index_count;
END;
$$;

-- Initial statistics update
SELECT update_table_statistics();

-- Initial materialized view refresh
SELECT refresh_team_stats();
SELECT refresh_player_stats();

-- Performance optimization complete
RAISE NOTICE 'Basketball League Platform Performance Optimization Complete - Target: <50ms average query time';