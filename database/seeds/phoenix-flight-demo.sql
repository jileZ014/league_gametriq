-- Phoenix Flight Youth Basketball League Demo Seed Data
-- Generated for MVP Access Pack Demonstration
-- Organization: Phoenix Flight Youth Basketball
-- Location: Phoenix, Arizona
-- Season: Spring 2024

-- Clear existing demo data
DELETE FROM game_events WHERE organization_id = 'org-phoenix-flight';
DELETE FROM game_officials WHERE organization_id = 'org-phoenix-flight';
DELETE FROM games WHERE organization_id = 'org-phoenix-flight';
DELETE FROM team_players WHERE organization_id = 'org-phoenix-flight';
DELETE FROM teams WHERE organization_id = 'org-phoenix-flight';
DELETE FROM divisions WHERE organization_id = 'org-phoenix-flight';
DELETE FROM seasons WHERE organization_id = 'org-phoenix-flight';
DELETE FROM leagues WHERE organization_id = 'org-phoenix-flight';
DELETE FROM officials WHERE organization_id = 'org-phoenix-flight';
DELETE FROM venues WHERE organization_id = 'org-phoenix-flight';
DELETE FROM players WHERE organization_id = 'org-phoenix-flight';
DELETE FROM users WHERE organization_id = 'org-phoenix-flight';
DELETE FROM organizations WHERE id = 'org-phoenix-flight';

-- Create Organization
INSERT INTO organizations (id, name, timezone, settings, created_at, updated_at) VALUES
('org-phoenix-flight', 'Phoenix Flight Youth Basketball', 'America/Phoenix', 
 '{"heatSafetyEnabled": true, "heatThreshold": 105, "coppaCompliant": true, "safeSportIntegrated": true, "maxTeamsPerDivision": 12, "minPlayersPerTeam": 8, "maxPlayersPerTeam": 15}'::jsonb,
 NOW(), NOW());

-- Create Demo Users
INSERT INTO users (id, organization_id, email, first_name, last_name, role, phone, created_at, updated_at) VALUES
-- Administrators
('user-admin-1', 'org-phoenix-flight', 'admin@phoenixflight.demo', 'Sarah', 'Johnson', 'SUPER_ADMIN', '602-555-0100', NOW(), NOW()),
('user-manager-1', 'org-phoenix-flight', 'manager@phoenixflight.demo', 'Michael', 'Rodriguez', 'LEAGUE_MANAGER', '602-555-0101', NOW(), NOW()),
-- Coaches
('user-coach-1', 'org-phoenix-flight', 'coach1@suns.demo', 'David', 'Thompson', 'COACH', '602-555-0201', NOW(), NOW()),
('user-coach-2', 'org-phoenix-flight', 'coach2@mercury.demo', 'Jennifer', 'Williams', 'COACH', '602-555-0202', NOW(), NOW()),
('user-coach-3', 'org-phoenix-flight', 'coach3@rattlers.demo', 'Robert', 'Martinez', 'COACH', '602-555-0203', NOW(), NOW()),
('user-coach-4', 'org-phoenix-flight', 'coach4@rising.demo', 'Amanda', 'Davis', 'COACH', '602-555-0204', NOW(), NOW()),
-- Parents
('user-parent-1', 'org-phoenix-flight', 'parent1@phoenixflight.demo', 'James', 'Anderson', 'PARENT', '602-555-0301', NOW(), NOW()),
('user-parent-2', 'org-phoenix-flight', 'parent2@phoenixflight.demo', 'Maria', 'Garcia', 'PARENT', '602-555-0302', NOW(), NOW()),
('user-parent-3', 'org-phoenix-flight', 'parent3@phoenixflight.demo', 'William', 'Brown', 'PARENT', '602-555-0303', NOW(), NOW()),
-- Officials
('user-ref-1', 'org-phoenix-flight', 'ref1@phoenixflight.demo', 'Thomas', 'Wilson', 'OFFICIAL', '602-555-0401', NOW(), NOW()),
('user-ref-2', 'org-phoenix-flight', 'ref2@phoenixflight.demo', 'Patricia', 'Moore', 'OFFICIAL', '602-555-0402', NOW(), NOW()),
('user-ref-3', 'org-phoenix-flight', 'ref3@phoenixflight.demo', 'Christopher', 'Taylor', 'OFFICIAL', '602-555-0403', NOW(), NOW());

-- Create Venues
INSERT INTO venues (id, organization_id, name, address, city, state, zip, courts, latitude, longitude, amenities, created_at, updated_at) VALUES
('venue-1', 'org-phoenix-flight', 'Desert Sky Sports Complex', '3220 W Roosevelt St', 'Phoenix', 'AZ', '85009', 4, 33.4598, -112.1305, '{"parking": true, "concessions": true, "restrooms": true, "ac": true}'::jsonb, NOW(), NOW()),
('venue-2', 'org-phoenix-flight', 'Steele Indian School Park', '300 E Indian School Rd', 'Phoenix', 'AZ', '85012', 3, 33.4947, -112.0686, '{"parking": true, "restrooms": true, "water": true}'::jsonb, NOW(), NOW()),
('venue-3', 'org-phoenix-flight', 'Paradise Valley Community Center', '17402 N 40th St', 'Phoenix', 'AZ', '85032', 2, 33.6370, -111.9957, '{"parking": true, "concessions": true, "restrooms": true, "ac": true}'::jsonb, NOW(), NOW()),
('venue-4', 'org-phoenix-flight', 'South Mountain Community Center', '212 E Alta Vista Rd', 'Phoenix', 'AZ', '85042', 3, 33.3901, -112.0735, '{"parking": true, "restrooms": true, "ac": true}'::jsonb, NOW(), NOW()),
('venue-5', 'org-phoenix-flight', 'Maryvale Community Center', '4420 N 51st Ave', 'Phoenix', 'AZ', '85031', 2, 33.5017, -112.1706, '{"parking": true, "restrooms": true, "water": true, "ac": true}'::jsonb, NOW(), NOW()),
('venue-6', 'org-phoenix-flight', 'Deer Valley Community Center', '2001 W Wahalla Ln', 'Phoenix', 'AZ', '85027', 3, 33.6812, -112.1058, '{"parking": true, "concessions": true, "restrooms": true, "ac": true}'::jsonb, NOW(), NOW()),
('venue-7', 'org-phoenix-flight', 'Eastlake Park', '1549 E Jefferson St', 'Phoenix', 'AZ', '85034', 2, 33.4463, -112.0476, '{"parking": true, "restrooms": true, "water": true}'::jsonb, NOW(), NOW()),
('venue-8', 'org-phoenix-flight', 'Washington Park', '6655 N 23rd Ave', 'Phoenix', 'AZ', '85015', 2, 33.5367, -112.1067, '{"parking": true, "restrooms": true, "playground": true}'::jsonb, NOW(), NOW());

-- Create Officials
INSERT INTO officials (id, organization_id, user_id, first_name, last_name, email, phone, certification_level, specialties, max_games_per_day, max_games_per_week, travel_radius, hourly_rate, active, created_at, updated_at) VALUES
('official-1', 'org-phoenix-flight', 'user-ref-1', 'Thomas', 'Wilson', 'ref1@phoenixflight.demo', '602-555-0401', 'ADVANCED', '["REFEREE", "SCOREKEEPER"]', 4, 20, 25, 45.00, true, NOW(), NOW()),
('official-2', 'org-phoenix-flight', 'user-ref-2', 'Patricia', 'Moore', 'ref2@phoenixflight.demo', '602-555-0402', 'EXPERT', '["REFEREE"]', 5, 25, 30, 55.00, true, NOW(), NOW()),
('official-3', 'org-phoenix-flight', 'user-ref-3', 'Christopher', 'Taylor', 'ref3@phoenixflight.demo', '602-555-0403', 'INTERMEDIATE', '["REFEREE", "CLOCK_OPERATOR"]', 3, 15, 20, 35.00, true, NOW(), NOW()),
('official-4', 'org-phoenix-flight', NULL, 'Daniel', 'Anderson', 'ref4@phoenixflight.demo', '602-555-0404', 'ADVANCED', '["REFEREE"]', 4, 20, 25, 45.00, true, NOW(), NOW()),
('official-5', 'org-phoenix-flight', NULL, 'Michelle', 'Jackson', 'ref5@phoenixflight.demo', '602-555-0405', 'BEGINNER', '["SCOREKEEPER", "CLOCK_OPERATOR"]', 3, 12, 15, 25.00, true, NOW(), NOW());

-- Create Leagues
INSERT INTO leagues (id, organization_id, name, description, sport, created_at, updated_at) VALUES
('league-youth', 'org-phoenix-flight', 'Phoenix Youth Basketball League', 'Competitive youth basketball for ages 8-14', 'BASKETBALL', NOW(), NOW()),
('league-rec', 'org-phoenix-flight', 'Phoenix Recreation League', 'Recreational basketball for all skill levels', 'BASKETBALL', NOW(), NOW());

-- Create Spring 2024 Season
INSERT INTO seasons (id, organization_id, league_id, name, start_date, end_date, registration_start, registration_end, status, created_at, updated_at) VALUES
('season-spring-2024', 'org-phoenix-flight', 'league-youth', 'Spring 2024', '2024-03-01', '2024-05-31', '2024-01-15', '2024-02-15', 'ACTIVE', NOW(), NOW()),
('season-rec-2024', 'org-phoenix-flight', 'league-rec', 'Recreation Spring 2024', '2024-03-01', '2024-05-31', '2024-01-15', '2024-02-15', 'ACTIVE', NOW(), NOW());

-- Create Divisions
INSERT INTO divisions (id, organization_id, season_id, name, age_group, skill_level, max_teams, created_at, updated_at) VALUES
-- Youth League Divisions
('div-u8', 'org-phoenix-flight', 'season-spring-2024', 'Under 8', 'U8', 'BEGINNER', 8, NOW(), NOW()),
('div-u10', 'org-phoenix-flight', 'season-spring-2024', 'Under 10', 'U10', 'INTERMEDIATE', 10, NOW(), NOW()),
('div-u12', 'org-phoenix-flight', 'season-spring-2024', 'Under 12', 'U12', 'INTERMEDIATE', 12, NOW(), NOW()),
('div-u14', 'org-phoenix-flight', 'season-spring-2024', 'Under 14', 'U14', 'ADVANCED', 12, NOW(), NOW()),
-- Recreation League Divisions
('div-rec-a', 'org-phoenix-flight', 'season-rec-2024', 'Recreation A', 'OPEN', 'BEGINNER', 8, NOW(), NOW()),
('div-rec-b', 'org-phoenix-flight', 'season-rec-2024', 'Recreation B', 'OPEN', 'INTERMEDIATE', 8, NOW(), NOW());

-- Create Teams for U12 Division (Focus Division for Demo)
INSERT INTO teams (id, organization_id, division_id, name, coach_id, assistant_coach_id, colors, logo_url, home_venue_id, wins, losses, ties, points_for, points_against, created_at, updated_at) VALUES
-- U12 Teams (12 teams for tournament demo)
('team-suns', 'org-phoenix-flight', 'div-u12', 'Phoenix Suns', 'user-coach-1', NULL, '["orange", "purple"]', 'https://cdn.gametriq.app/logos/suns.png', 'venue-1', 10, 2, 0, 580, 420, NOW(), NOW()),
('team-mercury', 'org-phoenix-flight', 'div-u12', 'Phoenix Mercury', 'user-coach-2', NULL, '["orange", "yellow"]', 'https://cdn.gametriq.app/logos/mercury.png', 'venue-2', 9, 3, 0, 560, 440, NOW(), NOW()),
('team-rattlers', 'org-phoenix-flight', 'div-u12', 'Arizona Rattlers', 'user-coach-3', NULL, '["black", "green"]', 'https://cdn.gametriq.app/logos/rattlers.png', 'venue-3', 8, 4, 0, 540, 460, NOW(), NOW()),
('team-rising', 'org-phoenix-flight', 'div-u12', 'Phoenix Rising', 'user-coach-4', NULL, '["red", "black"]', 'https://cdn.gametriq.app/logos/rising.png', 'venue-4', 8, 4, 0, 530, 470, NOW(), NOW()),
('team-coyotes', 'org-phoenix-flight', 'div-u12', 'Desert Coyotes', NULL, NULL, '["maroon", "white"]', 'https://cdn.gametriq.app/logos/coyotes.png', 'venue-5', 7, 5, 0, 520, 480, NOW(), NOW()),
('team-scorpions', 'org-phoenix-flight', 'div-u12', 'Scottsdale Scorpions', NULL, NULL, '["teal", "orange"]', 'https://cdn.gametriq.app/logos/scorpions.png', 'venue-6', 7, 5, 0, 510, 490, NOW(), NOW()),
('team-thunder', 'org-phoenix-flight', 'div-u12', 'Desert Thunder', NULL, NULL, '["blue", "yellow"]', 'https://cdn.gametriq.app/logos/thunder.png', 'venue-7', 6, 6, 0, 500, 500, NOW(), NOW()),
('team-hawks', 'org-phoenix-flight', 'div-u12', 'Valley Hawks', NULL, NULL, '["red", "gray"]', 'https://cdn.gametriq.app/logos/hawks.png', 'venue-8', 5, 7, 0, 490, 510, NOW(), NOW()),
('team-storm', 'org-phoenix-flight', 'div-u12', 'Monsoon Storm', NULL, NULL, '["purple", "silver"]', 'https://cdn.gametriq.app/logos/storm.png', 'venue-1', 5, 7, 0, 480, 520, NOW(), NOW()),
('team-heat', 'org-phoenix-flight', 'div-u12', 'Phoenix Heat', NULL, NULL, '["red", "orange"]', 'https://cdn.gametriq.app/logos/heat.png', 'venue-2', 4, 8, 0, 470, 530, NOW(), NOW()),
('team-vipers', 'org-phoenix-flight', 'div-u12', 'Desert Vipers', NULL, NULL, '["green", "black"]', 'https://cdn.gametriq.app/logos/vipers.png', 'venue-3', 3, 9, 0, 450, 550, NOW(), NOW()),
('team-firebirds', 'org-phoenix-flight', 'div-u12', 'Firebirds', NULL, NULL, '["red", "gold"]', 'https://cdn.gametriq.app/logos/firebirds.png', 'venue-4', 2, 10, 0, 420, 580, NOW(), NOW());

-- Create Players for Top Teams (Demo Focus)
INSERT INTO players (id, organization_id, first_name, last_name, date_of_birth, parent_email, parent_phone, jersey_number, position, height, weight, emergency_contact, medical_notes, created_at, updated_at) VALUES
-- Phoenix Suns Players
('player-1', 'org-phoenix-flight', 'Alex', 'Johnson', '2012-03-15', 'parent1@phoenixflight.demo', '602-555-1001', '23', 'GUARD', '5-2', 95, '{"name": "James Johnson", "phone": "602-555-1001", "relationship": "Father"}', NULL, NOW(), NOW()),
('player-2', 'org-phoenix-flight', 'Maya', 'Williams', '2012-05-22', 'parent2@phoenixflight.demo', '602-555-1002', '10', 'FORWARD', '5-4', 100, '{"name": "Sarah Williams", "phone": "602-555-1002", "relationship": "Mother"}', NULL, NOW(), NOW()),
('player-3', 'org-phoenix-flight', 'Jordan', 'Davis', '2012-07-08', 'parent3@phoenixflight.demo', '602-555-1003', '5', 'CENTER', '5-6', 110, '{"name": "Michael Davis", "phone": "602-555-1003", "relationship": "Father"}', 'Asthma - carries inhaler', NOW(), NOW()),
('player-4', 'org-phoenix-flight', 'Sophia', 'Martinez', '2012-09-14', 'parent4@phoenixflight.demo', '602-555-1004', '12', 'GUARD', '5-1', 90, '{"name": "Maria Martinez", "phone": "602-555-1004", "relationship": "Mother"}', NULL, NOW(), NOW()),
('player-5', 'org-phoenix-flight', 'Ethan', 'Brown', '2012-11-20', 'parent5@phoenixflight.demo', '602-555-1005', '30', 'FORWARD', '5-5', 105, '{"name": "Robert Brown", "phone": "602-555-1005", "relationship": "Father"}', NULL, NOW(), NOW()),
('player-6', 'org-phoenix-flight', 'Isabella', 'Garcia', '2012-01-25', 'parent6@phoenixflight.demo', '602-555-1006', '22', 'GUARD', '5-3', 95, '{"name": "Carlos Garcia", "phone": "602-555-1006", "relationship": "Father"}', NULL, NOW(), NOW()),
('player-7', 'org-phoenix-flight', 'Liam', 'Rodriguez', '2012-04-10', 'parent7@phoenixflight.demo', '602-555-1007', '15', 'CENTER', '5-7', 115, '{"name": "Ana Rodriguez", "phone": "602-555-1007", "relationship": "Mother"}', NULL, NOW(), NOW()),
('player-8', 'org-phoenix-flight', 'Olivia', 'Wilson', '2012-06-18', 'parent8@phoenixflight.demo', '602-555-1008', '7', 'FORWARD', '5-4', 100, '{"name": "Thomas Wilson", "phone": "602-555-1008", "relationship": "Father"}', NULL, NOW(), NOW()),
-- Phoenix Mercury Players
('player-9', 'org-phoenix-flight', 'Noah', 'Anderson', '2012-08-05', 'parent9@phoenixflight.demo', '602-555-1009', '11', 'GUARD', '5-2', 92, '{"name": "Lisa Anderson", "phone": "602-555-1009", "relationship": "Mother"}', NULL, NOW(), NOW()),
('player-10', 'org-phoenix-flight', 'Emma', 'Taylor', '2012-10-12', 'parent10@phoenixflight.demo', '602-555-1010', '3', 'FORWARD', '5-5', 103, '{"name": "John Taylor", "phone": "602-555-1010", "relationship": "Father"}', 'Peanut allergy', NOW(), NOW()),
('player-11', 'org-phoenix-flight', 'Mason', 'Moore', '2012-12-28', 'parent11@phoenixflight.demo', '602-555-1011', '21', 'CENTER', '5-6', 112, '{"name": "Patricia Moore", "phone": "602-555-1011", "relationship": "Mother"}', NULL, NOW(), NOW()),
('player-12', 'org-phoenix-flight', 'Ava', 'Jackson', '2012-02-14', 'parent12@phoenixflight.demo', '602-555-1012', '14', 'GUARD', '5-1', 88, '{"name": "Daniel Jackson", "phone": "602-555-1012", "relationship": "Father"}', NULL, NOW(), NOW());

-- Assign Players to Teams
INSERT INTO team_players (id, organization_id, team_id, player_id, jersey_number, position, status, created_at, updated_at) VALUES
-- Phoenix Suns Roster
('tp-1', 'org-phoenix-flight', 'team-suns', 'player-1', '23', 'GUARD', 'ACTIVE', NOW(), NOW()),
('tp-2', 'org-phoenix-flight', 'team-suns', 'player-2', '10', 'FORWARD', 'ACTIVE', NOW(), NOW()),
('tp-3', 'org-phoenix-flight', 'team-suns', 'player-3', '5', 'CENTER', 'ACTIVE', NOW(), NOW()),
('tp-4', 'org-phoenix-flight', 'team-suns', 'player-4', '12', 'GUARD', 'ACTIVE', NOW(), NOW()),
('tp-5', 'org-phoenix-flight', 'team-suns', 'player-5', '30', 'FORWARD', 'ACTIVE', NOW(), NOW()),
('tp-6', 'org-phoenix-flight', 'team-suns', 'player-6', '22', 'GUARD', 'ACTIVE', NOW(), NOW()),
('tp-7', 'org-phoenix-flight', 'team-suns', 'player-7', '15', 'CENTER', 'ACTIVE', NOW(), NOW()),
('tp-8', 'org-phoenix-flight', 'team-suns', 'player-8', '7', 'FORWARD', 'ACTIVE', NOW(), NOW()),
-- Phoenix Mercury Roster
('tp-9', 'org-phoenix-flight', 'team-mercury', 'player-9', '11', 'GUARD', 'ACTIVE', NOW(), NOW()),
('tp-10', 'org-phoenix-flight', 'team-mercury', 'player-10', '3', 'FORWARD', 'ACTIVE', NOW(), NOW()),
('tp-11', 'org-phoenix-flight', 'team-mercury', 'player-11', '21', 'CENTER', 'ACTIVE', NOW(), NOW()),
('tp-12', 'org-phoenix-flight', 'team-mercury', 'player-12', '14', 'GUARD', 'ACTIVE', NOW(), NOW());

-- Create Regular Season Games (Completed)
INSERT INTO games (id, organization_id, season_id, division_id, home_team_id, away_team_id, venue_id, scheduled_time, actual_start_time, actual_end_time, status, home_score, away_score, game_type, game_number, created_at, updated_at) VALUES
-- Recent Completed Games for Standings
('game-1', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-suns', 'team-mercury', 'venue-1', '2024-03-02 10:00:00-07', '2024-03-02 10:00:00-07', '2024-03-02 11:30:00-07', 'COMPLETED', 52, 48, 'REGULAR', 101, NOW(), NOW()),
('game-2', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-rattlers', 'team-rising', 'venue-3', '2024-03-02 12:00:00-07', '2024-03-02 12:00:00-07', '2024-03-02 13:30:00-07', 'COMPLETED', 45, 43, 'REGULAR', 102, NOW(), NOW()),
('game-3', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-coyotes', 'team-scorpions', 'venue-5', '2024-03-02 14:00:00-07', '2024-03-02 14:00:00-07', '2024-03-02 15:30:00-07', 'COMPLETED', 38, 40, 'REGULAR', 103, NOW(), NOW()),
('game-4', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-thunder', 'team-hawks', 'venue-7', '2024-03-02 16:00:00-07', '2024-03-02 16:00:00-07', '2024-03-02 17:30:00-07', 'COMPLETED', 42, 35, 'REGULAR', 104, NOW(), NOW());

-- Create Upcoming Games (For Demo)
INSERT INTO games (id, organization_id, season_id, division_id, home_team_id, away_team_id, venue_id, scheduled_time, status, game_type, game_number, created_at, updated_at) VALUES
-- This Weekend's Games
('game-5', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-mercury', 'team-rattlers', 'venue-2', '2024-03-09 10:00:00-07', 'SCHEDULED', 'REGULAR', 201, NOW(), NOW()),
('game-6', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-rising', 'team-suns', 'venue-4', '2024-03-09 12:00:00-07', 'SCHEDULED', 'REGULAR', 202, NOW(), NOW()),
('game-7', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-scorpions', 'team-thunder', 'venue-6', '2024-03-09 14:00:00-07', 'SCHEDULED', 'REGULAR', 203, NOW(), NOW()),
('game-8', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-hawks', 'team-coyotes', 'venue-8', '2024-03-09 16:00:00-07', 'SCHEDULED', 'REGULAR', 204, NOW(), NOW()),
-- Next Weekend's Games
('game-9', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-suns', 'team-scorpions', 'venue-1', '2024-03-16 10:00:00-07', 'SCHEDULED', 'REGULAR', 301, NOW(), NOW()),
('game-10', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'team-mercury', 'team-coyotes', 'venue-2', '2024-03-16 12:00:00-07', 'SCHEDULED', 'REGULAR', 302, NOW(), NOW());

-- Create Playoff Bracket Structure (Ready for Demo)
INSERT INTO tournaments (id, organization_id, season_id, division_id, name, format, max_teams, start_date, status, created_at, updated_at) VALUES
('tourney-u12', 'org-phoenix-flight', 'season-spring-2024', 'div-u12', 'U12 Spring Championship', 'SINGLE_ELIMINATION', 8, '2024-03-23', 'PENDING', NOW(), NOW());

-- Create Tournament Seeds (Top 8 teams)
INSERT INTO tournament_seeds (id, tournament_id, team_id, seed, created_at, updated_at) VALUES
('seed-1', 'tourney-u12', 'team-suns', 1, NOW(), NOW()),
('seed-2', 'tourney-u12', 'team-mercury', 2, NOW(), NOW()),
('seed-3', 'tourney-u12', 'team-rattlers', 3, NOW(), NOW()),
('seed-4', 'tourney-u12', 'team-rising', 4, NOW(), NOW()),
('seed-5', 'tourney-u12', 'team-coyotes', 5, NOW(), NOW()),
('seed-6', 'tourney-u12', 'team-scorpions', 6, NOW(), NOW()),
('seed-7', 'tourney-u12', 'team-thunder', 7, NOW(), NOW()),
('seed-8', 'tourney-u12', 'team-hawks', 8, NOW(), NOW());

-- Create Officials Availability
INSERT INTO official_availability (id, official_id, day_of_week, start_time, end_time, availability_type, recurring, created_at, updated_at) VALUES
-- Thomas Wilson - Weekends
('avail-1', 'official-1', 6, '08:00', '18:00', 'AVAILABLE', true, NOW(), NOW()),
('avail-2', 'official-1', 0, '10:00', '16:00', 'AVAILABLE', true, NOW(), NOW()),
-- Patricia Moore - Flexible
('avail-3', 'official-2', 6, '07:00', '20:00', 'AVAILABLE', true, NOW(), NOW()),
('avail-4', 'official-2', 0, '08:00', '18:00', 'AVAILABLE', true, NOW(), NOW()),
('avail-5', 'official-2', 3, '16:00', '20:00', 'AVAILABLE', true, NOW(), NOW()),
-- Christopher Taylor - Limited
('avail-6', 'official-3', 6, '10:00', '14:00', 'AVAILABLE', true, NOW(), NOW()),
('avail-7', 'official-3', 0, '12:00', '16:00', 'AVAILABLE', true, NOW(), NOW());

-- Create Game Officials Assignments
INSERT INTO game_officials (id, organization_id, game_id, official_id, role, status, pay_rate, estimated_pay, created_at, updated_at) VALUES
-- Completed Games
('go-1', 'org-phoenix-flight', 'game-1', 'official-1', 'HEAD_REFEREE', 'CONFIRMED', 45.00, 67.50, NOW(), NOW()),
('go-2', 'org-phoenix-flight', 'game-1', 'official-5', 'SCOREKEEPER', 'CONFIRMED', 25.00, 37.50, NOW(), NOW()),
('go-3', 'org-phoenix-flight', 'game-2', 'official-2', 'HEAD_REFEREE', 'CONFIRMED', 55.00, 82.50, NOW(), NOW()),
('go-4', 'org-phoenix-flight', 'game-3', 'official-3', 'HEAD_REFEREE', 'CONFIRMED', 35.00, 52.50, NOW(), NOW()),
-- Upcoming Games
('go-5', 'org-phoenix-flight', 'game-5', 'official-1', 'HEAD_REFEREE', 'PENDING', 45.00, 67.50, NOW(), NOW()),
('go-6', 'org-phoenix-flight', 'game-6', 'official-2', 'HEAD_REFEREE', 'PENDING', 55.00, 82.50, NOW(), NOW()),
('go-7', 'org-phoenix-flight', 'game-7', 'official-3', 'HEAD_REFEREE', 'PENDING', 35.00, 52.50, NOW(), NOW()),
('go-8', 'org-phoenix-flight', 'game-8', 'official-4', 'HEAD_REFEREE', 'PENDING', 45.00, 67.50, NOW(), NOW());

-- Create Payment Records
INSERT INTO payments (id, organization_id, user_id, team_id, amount, status, type, stripe_payment_intent_id, metadata, created_at, updated_at) VALUES
('pay-1', 'org-phoenix-flight', 'user-parent-1', 'team-suns', 250.00, 'COMPLETED', 'REGISTRATION', 'pi_demo_1', '{"player": "Alex Johnson", "season": "Spring 2024"}'::jsonb, NOW(), NOW()),
('pay-2', 'org-phoenix-flight', 'user-parent-2', 'team-suns', 250.00, 'COMPLETED', 'REGISTRATION', 'pi_demo_2', '{"player": "Maya Williams", "season": "Spring 2024"}'::jsonb, NOW(), NOW()),
('pay-3', 'org-phoenix-flight', 'user-parent-3', 'team-suns', 250.00, 'COMPLETED', 'REGISTRATION', 'pi_demo_3', '{"player": "Jordan Davis", "season": "Spring 2024"}'::jsonb, NOW(), NOW());

-- Create Notifications
INSERT INTO notifications (id, organization_id, user_id, type, title, message, status, metadata, created_at, updated_at) VALUES
('notif-1', 'org-phoenix-flight', 'user-coach-1', 'GAME_REMINDER', 'Upcoming Game Tomorrow', 'Your team has a game tomorrow at 10:00 AM at Desert Sky Sports Complex', 'SENT', '{"game_id": "game-5"}'::jsonb, NOW(), NOW()),
('notif-2', 'org-phoenix-flight', 'user-parent-1', 'SCHEDULE_UPDATE', 'Schedule Update', 'Game time has been updated for this Saturday', 'SENT', '{"game_id": "game-6"}'::jsonb, NOW(), NOW()),
('notif-3', 'org-phoenix-flight', 'user-ref-1', 'ASSIGNMENT', 'New Game Assignment', 'You have been assigned to referee a game this Saturday', 'SENT', '{"game_id": "game-5"}'::jsonb, NOW(), NOW());

-- Create Sample Game Events (For Live Scoring Demo)
INSERT INTO game_events (id, game_id, organization_id, team_id, player_id, event_type, points, period, time_remaining, metadata, created_at) VALUES
('event-1', 'game-1', 'org-phoenix-flight', 'team-suns', 'player-1', 'SCORE', 2, 1, '10:00', '{"shot_type": "layup"}'::jsonb, '2024-03-02 10:05:00-07'),
('event-2', 'game-1', 'org-phoenix-flight', 'team-mercury', 'player-9', 'SCORE', 3, 1, '09:30', '{"shot_type": "three_pointer"}'::jsonb, '2024-03-02 10:06:00-07'),
('event-3', 'game-1', 'org-phoenix-flight', 'team-suns', 'player-2', 'SCORE', 2, 1, '08:45', '{"shot_type": "jump_shot"}'::jsonb, '2024-03-02 10:07:00-07'),
('event-4', 'game-1', 'org-phoenix-flight', 'team-suns', 'player-3', 'FOUL', 0, 1, '08:00', '{"foul_type": "personal"}'::jsonb, '2024-03-02 10:08:00-07'),
('event-5', 'game-1', 'org-phoenix-flight', 'team-mercury', 'player-10', 'SCORE', 1, 1, '07:45', '{"shot_type": "free_throw"}'::jsonb, '2024-03-02 10:09:00-07');

-- Update Organization Statistics
UPDATE organizations 
SET settings = jsonb_set(
  settings, 
  '{stats}', 
  '{"total_leagues": 2, "total_teams": 48, "total_players": 576, "total_games": 240, "total_officials": 20}'::jsonb
)
WHERE id = 'org-phoenix-flight';

-- Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_games_organization_status ON games(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_games_scheduled_time ON games(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_teams_division ON teams(division_id);
CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_officials_organization ON officials(organization_id);
CREATE INDEX IF NOT EXISTS idx_game_officials_game ON game_officials(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game ON game_events(game_id);