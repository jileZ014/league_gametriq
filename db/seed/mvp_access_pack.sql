-- Gametriq Basketball League Platform
-- MVP Access Pack Seed Data
-- Sprint 5.2 - Production Ready
-- Organization: Phoenix Flight Youth Basketball

BEGIN;

-- Set timezone for consistent data
SET TIME ZONE 'America/Phoenix';

-- ========================================
-- ORGANIZATIONS
-- ========================================
INSERT INTO organizations (id, name, slug, logo_url, primary_color, secondary_color, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Phoenix Flight Youth Basketball', 'phoenix-flight', 
 'https://gametriq-assets.s3.us-west-2.amazonaws.com/logos/phoenix-flight.png', 
 '#FF6900', '#FFFFFF', NOW() - INTERVAL '1 year'),
('550e8400-e29b-41d4-a716-446655440002', 'Desert Valley Sports', 'desert-valley', 
 'https://gametriq-assets.s3.us-west-2.amazonaws.com/logos/desert-valley.png', 
 '#0033A0', '#FFFFFF', NOW() - INTERVAL '8 months'),
('550e8400-e29b-41d4-a716-446655440003', 'Scottsdale Athletics', 'scottsdale-athletics', 
 'https://gametriq-assets.s3.us-west-2.amazonaws.com/logos/scottsdale.png', 
 '#4B0082', '#FFD700', NOW() - INTERVAL '6 months');

-- ========================================
-- USERS (All Personas)
-- ========================================
-- Password for all demo users: Demo2024!
-- Hashed with bcrypt + pepper

-- Super Admin
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at, mfa_enabled) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'admin@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Sarah', 'Johnson', 'super_admin', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550100', true, NOW(), true);

-- League Manager
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'manager@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Michael', 'Chen', 'league_manager', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550101', true, NOW());

-- Coaches
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440102', 'coach1@suns.demo', 
 '$2a$10$YourHashedPasswordHere', 'David', 'Williams', 'coach', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550102', true, NOW()),
('550e8400-e29b-41d4-a716-446655440103', 'coach2@hawks.demo', 
 '$2a$10$YourHashedPasswordHere', 'Jennifer', 'Martinez', 'coach', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550103', true, NOW());

-- Parents
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440104', 'parent1@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Robert', 'Smith', 'parent', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550104', true, NOW()),
('550e8400-e29b-41d4-a716-446655440105', 'parent2@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Lisa', 'Anderson', 'parent', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550105', true, NOW());

-- Players (with year-only DOB for COPPA)
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, birth_year, is_minor, parent_email, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440106', 'player1@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Jake', 'Smith', 'player', 
 '550e8400-e29b-41d4-a716-446655440001', 2012, true, 'parent1@phoenixflight.demo', true, NOW()),
('550e8400-e29b-41d4-a716-446655440107', 'player2@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Emma', 'Anderson', 'player', 
 '550e8400-e29b-41d4-a716-446655440001', 2011, true, 'parent2@phoenixflight.demo', true, NOW());

-- Referees
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440108', 'ref1@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Thomas', 'Wilson', 'referee', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550108', true, NOW()),
('550e8400-e29b-41d4-a716-446655440109', 'ref2@phoenixflight.demo', 
 '$2a$10$YourHashedPasswordHere', 'Maria', 'Garcia', 'referee', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550109', true, NOW());

-- Scorekeepers
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, phone_number, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440110', 'scorekeeper@demo.gametriq.app', 
 '$2a$10$YourHashedPasswordHere', 'Kevin', 'Lee', 'scorekeeper', 
 '550e8400-e29b-41d4-a716-446655440001', '+16025550110', true, NOW());

-- Spectators
INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440111', 'spectator@demo.gametriq.app', 
 '$2a$10$YourHashedPasswordHere', 'John', 'Doe', 'spectator', 
 '550e8400-e29b-41d4-a716-446655440001', true, NOW());

-- ========================================
-- LEAGUES & DIVISIONS
-- ========================================
INSERT INTO leagues (id, organization_id, name, season, start_date, end_date, status) VALUES
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440001', 
 'Spring 2024 League', 'Spring 2024', '2024-01-15', '2024-05-30', 'active'),
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', 
 'Winter 2023 League', 'Winter 2023', '2023-10-01', '2024-01-14', 'completed');

INSERT INTO divisions (id, league_id, name, age_group, gender, max_teams) VALUES
('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440200', 
 'U12 Boys', '10-12', 'boys', 12),
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440200', 
 'U14 Boys', '13-14', 'boys', 12),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440200', 
 'U10 Girls', '8-10', 'girls', 10),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440200', 
 'U12 Girls', '10-12', 'girls', 10);

-- ========================================
-- TEAMS
-- ========================================
INSERT INTO teams (id, division_id, name, coach_id, wins, losses, points_for, points_against) VALUES
-- U12 Boys Division
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440300', 
 'Phoenix Suns', '550e8400-e29b-41d4-a716-446655440102', 10, 2, 624, 498),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440300', 
 'Desert Hawks', '550e8400-e29b-41d4-a716-446655440103', 9, 3, 598, 512),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440300', 
 'Valley Thunder', NULL, 8, 4, 576, 534),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440300', 
 'Mesa Lightning', NULL, 7, 5, 562, 548),
('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440300', 
 'Tempe Titans', NULL, 6, 6, 540, 540),
('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440300', 
 'Chandler Chargers', NULL, 5, 7, 524, 556),

-- U14 Boys Division
('550e8400-e29b-41d4-a716-446655440406', '550e8400-e29b-41d4-a716-446655440301', 
 'Scottsdale Storm', NULL, 11, 1, 732, 598),
('550e8400-e29b-41d4-a716-446655440407', '550e8400-e29b-41d4-a716-446655440301', 
 'Gilbert Gladiators', NULL, 9, 3, 684, 612);

-- ========================================
-- TEAM ROSTERS
-- ========================================
INSERT INTO team_players (team_id, player_id, jersey_number, position, status) VALUES
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440106', '23', 'Guard', 'active'),
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440107', '10', 'Forward', 'active');

-- ========================================
-- VENUES
-- ========================================
INSERT INTO venues (id, name, address, city, state, zip, capacity, phone) VALUES
('550e8400-e29b-41d4-a716-446655440500', 'Phoenix Sports Complex', 
 '1234 Sports Way', 'Phoenix', 'AZ', '85001', 500, '+16025550200'),
('550e8400-e29b-41d4-a716-446655440501', 'Desert Valley Gym', 
 '5678 Court St', 'Tempe', 'AZ', '85281', 300, '+14805550201'),
('550e8400-e29b-41d4-a716-446655440502', 'Scottsdale Arena', 
 '9012 Basketball Blvd', 'Scottsdale', 'AZ', '85251', 400, '+14805550202');

-- ========================================
-- GAMES (Mix of completed, live, and upcoming)
-- ========================================
INSERT INTO games (id, division_id, home_team_id, away_team_id, venue_id, game_date, game_time, status, home_score, away_score, period, time_remaining) VALUES
-- Live Games
('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440300',
 '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440401',
 '550e8400-e29b-41d4-a716-446655440500', CURRENT_DATE, '18:00:00', 'in_progress', 42, 38, 3, '5:23'),
 
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440301',
 '550e8400-e29b-41d4-a716-446655440406', '550e8400-e29b-41d4-a716-446655440407',
 '550e8400-e29b-41d4-a716-446655440501', CURRENT_DATE, '19:30:00', 'in_progress', 55, 51, 4, '2:15'),

-- Upcoming Games
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440300',
 '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440404',
 '550e8400-e29b-41d4-a716-446655440500', CURRENT_DATE + 1, '18:00:00', 'scheduled', 0, 0, 1, '10:00'),

('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440300',
 '550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440400',
 '550e8400-e29b-41d4-a716-446655440502', CURRENT_DATE + 3, '14:00:00', 'scheduled', 0, 0, 1, '10:00'),

-- Completed Games
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440300',
 '550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440403',
 '550e8400-e29b-41d4-a716-446655440500', CURRENT_DATE - 3, '18:00:00', 'completed', 58, 52, 4, '0:00'),

('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440300',
 '550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440405',
 '550e8400-e29b-41d4-a716-446655440501', CURRENT_DATE - 7, '19:00:00', 'completed', 62, 48, 4, '0:00');

-- ========================================
-- REFEREE ASSIGNMENTS
-- ========================================
INSERT INTO referee_assignments (game_id, referee_id, role, pay_rate, status) VALUES
('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440108', 'head', 45.00, 'confirmed'),
('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440109', 'assistant', 35.00, 'confirmed'),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440108', 'head', 45.00, 'confirmed'),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440109', 'head', 45.00, 'pending');

-- ========================================
-- PAYMENTS (Sample registration payments)
-- ========================================
INSERT INTO payments (id, user_id, amount, status, type, stripe_payment_intent_id, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440700', '550e8400-e29b-41d4-a716-446655440104', 
 250.00, 'succeeded', 'registration', 'pi_demo_1234567890', NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440105', 
 250.00, 'succeeded', 'registration', 'pi_demo_1234567891', NOW() - INTERVAL '25 days');

-- ========================================
-- GAME STATISTICS (Sample for completed games)
-- ========================================
INSERT INTO game_stats (game_id, player_id, team_id, points, rebounds, assists, fouls, minutes_played) VALUES
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440106', 
 '550e8400-e29b-41d4-a716-446655440400', 18, 5, 3, 2, 28),
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440107', 
 '550e8400-e29b-41d4-a716-446655440400', 14, 7, 2, 1, 25);

-- ========================================
-- NOTIFICATIONS (Sample pending notifications)
-- ========================================
INSERT INTO notifications (user_id, type, title, message, read, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440104', 'game_reminder', 
 'Game Tomorrow', 'Phoenix Suns vs Tempe Titans at 6:00 PM', false, NOW()),
('550e8400-e29b-41d4-a716-446655440102', 'roster_update', 
 'Roster Change', 'New player added to your team roster', false, NOW() - INTERVAL '1 hour');

-- ========================================
-- AUDIT LOG (Sample entries)
-- ========================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'CREATE', 'game', '550e8400-e29b-41d4-a716-446655440602', 
 '192.168.1.100', 'Mozilla/5.0', NOW() - INTERVAL '2 hours'),
('550e8400-e29b-41d4-a716-446655440108', 'UPDATE', 'game_score', '550e8400-e29b-41d4-a716-446655440600', 
 '192.168.1.101', 'Mobile Safari', NOW() - INTERVAL '10 minutes');

-- ========================================
-- FEATURE FLAGS (Organization-specific)
-- ========================================
INSERT INTO organization_features (organization_id, feature_key, enabled) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'playoffs_v1', true),
('550e8400-e29b-41d4-a716-446655440001', 'real_time_scoring', true),
('550e8400-e29b-41d4-a716-446655440001', 'offline_mode', true),
('550e8400-e29b-41d4-a716-446655440001', 'push_notifications', true);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_teams_division ON teams(division_id);
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ========================================
-- STATISTICS UPDATE
-- ========================================
-- Update team standings based on games
UPDATE teams SET 
  games_played = wins + losses,
  win_percentage = CASE WHEN (wins + losses) > 0 THEN CAST(wins AS DECIMAL) / (wins + losses) ELSE 0 END,
  points_differential = points_for - points_against;

COMMIT;

-- ========================================
-- SUMMARY
-- ========================================
-- Organizations: 3
-- Users: 12 (all personas covered)
-- Teams: 8
-- Games: 6 (2 live, 2 upcoming, 2 completed)
-- Venues: 3
-- Payments: 2
-- Ready for MVP demo!