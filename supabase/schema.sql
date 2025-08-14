-- ============================================================================
-- Basketball League Management Platform - Supabase Schema
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-08-13
-- Description: Comprehensive Supabase database schema for basketball league management
-- Features: Multi-tenant, Real-time, RLS, Offline-first support
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption
CREATE EXTENSION IF NOT EXISTS "pgjwt"; -- For JWT handling

-- ============================================================================
-- Custom Types and Enums
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'coach',
    'parent',
    'player',
    'referee',
    'scorekeeper',
    'spectator'
);

-- League status
CREATE TYPE league_status AS ENUM (
    'draft',
    'registration_open',
    'active',
    'completed',
    'archived'
);

-- Team status
CREATE TYPE team_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);

-- Game status
CREATE TYPE game_status AS ENUM (
    'scheduled',
    'in_progress',
    'halftime',
    'completed',
    'cancelled',
    'postponed'
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);

-- Tournament status
CREATE TYPE tournament_status AS ENUM (
    'draft',
    'registration_open',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);

-- Report status
CREATE TYPE report_status AS ENUM (
    'scheduled',
    'generating',
    'completed',
    'failed',
    'cancelled'
);

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'spectator',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    birth_year INTEGER, -- COPPA compliance - year only
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user searches
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_name ON public.users USING gin((first_name || ' ' || last_name) gin_trgm_ops);

-- Organizations (Multi-tenant support)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.users(id),
    settings JSONB DEFAULT '{}',
    stripe_account_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);

-- User organization memberships
CREATE TABLE public.user_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'spectator',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_orgs_user ON public.user_organizations(user_id);
CREATE INDEX idx_user_orgs_org ON public.user_organizations(organization_id);

-- Leagues table
CREATE TABLE public.leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    status league_status DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    rules JSONB DEFAULT '{}',
    registration_fee DECIMAL(10,2) DEFAULT 0,
    max_teams INTEGER DEFAULT 100,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_leagues_org ON public.leagues(organization_id);
CREATE INDEX idx_leagues_status ON public.leagues(status);
CREATE INDEX idx_leagues_dates ON public.leagues(start_date, end_date);

-- Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    division TEXT,
    coach_id UUID REFERENCES public.users(id),
    assistant_coach_ids UUID[] DEFAULT '{}',
    status team_status DEFAULT 'active',
    colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#FFFFFF"}',
    logo_url TEXT,
    roster_size INTEGER DEFAULT 0,
    max_roster_size INTEGER DEFAULT 15,
    home_venue_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, slug)
);

CREATE INDEX idx_teams_league ON public.teams(league_id);
CREATE INDEX idx_teams_coach ON public.teams(coach_id);
CREATE INDEX idx_teams_division ON public.teams(division);
CREATE INDEX idx_teams_status ON public.teams(status);

-- Players table
CREATE TABLE public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    jersey_number INTEGER,
    position TEXT,
    birth_year INTEGER, -- COPPA compliance
    parent_id UUID REFERENCES public.users(id),
    emergency_contact JSONB,
    medical_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, jersey_number)
);

CREATE INDEX idx_players_user ON public.players(user_id);
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_parent ON public.players(parent_id);

-- Games table
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES public.teams(id),
    away_team_id UUID NOT NULL REFERENCES public.teams(id),
    venue_id UUID,
    scheduled_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    status game_status DEFAULT 'scheduled',
    
    -- Live scoring fields
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    current_period INTEGER DEFAULT 1,
    period_time_remaining INTEGER, -- seconds
    home_timeouts_remaining INTEGER DEFAULT 3,
    away_timeouts_remaining INTEGER DEFAULT 3,
    home_fouls INTEGER DEFAULT 0,
    away_fouls INTEGER DEFAULT 0,
    
    -- Game metadata
    referee_ids UUID[] DEFAULT '{}',
    scorekeeper_id UUID REFERENCES public.users(id),
    live_stream_url TEXT,
    notes TEXT,
    weather_conditions JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_games_league ON public.games(league_id);
CREATE INDEX idx_games_teams ON public.games(home_team_id, away_team_id);
CREATE INDEX idx_games_scheduled ON public.games(scheduled_time);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_venue ON public.games(venue_id);

-- Game scores table (for real-time updates)
CREATE TABLE public.game_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id),
    player_id UUID REFERENCES public.players(id),
    action_type TEXT NOT NULL, -- 'point', 'foul', 'timeout', 'substitution'
    points INTEGER DEFAULT 0,
    period INTEGER NOT NULL,
    game_time INTEGER NOT NULL, -- seconds into period
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_scores_game ON public.game_scores(game_id);
CREATE INDEX idx_game_scores_team ON public.game_scores(team_id);
CREATE INDEX idx_game_scores_player ON public.game_scores(player_id);
CREATE INDEX idx_game_scores_time ON public.game_scores(game_id, created_at);

-- Tournaments table
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status tournament_status DEFAULT 'draft',
    format TEXT NOT NULL, -- 'single_elimination', 'double_elimination', 'round_robin'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_deadline DATE,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    max_teams INTEGER DEFAULT 32,
    current_round INTEGER DEFAULT 0,
    bracket_data JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournaments_org ON public.tournaments(organization_id);
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournaments_dates ON public.tournaments(start_date, end_date);

-- Tournament teams
CREATE TABLE public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id),
    seed INTEGER,
    current_position TEXT, -- bracket position
    is_eliminated BOOLEAN DEFAULT false,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_tournament_teams_tournament ON public.tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team ON public.tournament_teams(team_id);

-- Venues table
CREATE TABLE public.venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone TEXT,
    capacity INTEGER,
    court_count INTEGER DEFAULT 1,
    amenities JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_org ON public.venues(organization_id);
CREATE INDEX idx_venues_location ON public.venues(city, state);

-- Scheduled reports table
CREATE TABLE public.scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    schedule TEXT NOT NULL, -- cron expression
    recipients TEXT[] DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    format TEXT DEFAULT 'pdf', -- 'pdf', 'csv', 'excel'
    status report_status DEFAULT 'scheduled',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_org ON public.scheduled_reports(organization_id);
CREATE INDEX idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at);
CREATE INDEX idx_scheduled_reports_status ON public.scheduled_reports(status);

-- Payment records table (Stripe integration)
CREATE TABLE public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    payment_type TEXT NOT NULL, -- 'registration', 'tournament', 'subscription'
    reference_id UUID, -- ID of related entity (team, tournament, etc.)
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON public.payment_records(organization_id);
CREATE INDEX idx_payments_user ON public.payment_records(user_id);
CREATE INDEX idx_payments_status ON public.payment_records(status);
CREATE INDEX idx_payments_stripe_intent ON public.payment_records(stripe_payment_intent_id);
CREATE INDEX idx_payments_reference ON public.payment_records(reference_id);

-- Audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check user organization membership
CREATE OR REPLACE FUNCTION check_user_org_membership(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_organizations
        WHERE user_organizations.user_id = $1
        AND user_organizations.organization_id = $2
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get user role in organization
CREATE OR REPLACE FUNCTION get_user_org_role(user_id UUID, org_id UUID)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result
    FROM public.user_organizations
    WHERE user_organizations.user_id = $1
    AND user_organizations.organization_id = $2;
    
    RETURN user_role_result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to update team roster size
CREATE OR REPLACE FUNCTION update_team_roster_size()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.teams
        SET roster_size = (
            SELECT COUNT(*)
            FROM public.players
            WHERE team_id = NEW.team_id
            AND is_active = true
        )
        WHERE id = NEW.team_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.teams
        SET roster_size = (
            SELECT COUNT(*)
            FROM public.players
            WHERE team_id = OLD.team_id
            AND is_active = true
        )
        WHERE id = OLD.team_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON public.scheduled_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON public.payment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Roster size update trigger
CREATE TRIGGER update_roster_size_on_player_change
    AFTER INSERT OR UPDATE OR DELETE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_team_roster_size();

-- Audit logging triggers (for critical tables)
CREATE TRIGGER audit_teams_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_games_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.games
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_payment_records_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_records
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Organization members can view other members"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_organizations uo1
            WHERE uo1.user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.user_organizations uo2
                WHERE uo2.user_id = public.users.id
                AND uo2.organization_id = uo1.organization_id
            )
        )
    );

-- Organizations policies
CREATE POLICY "Organizations are viewable by members"
    ON public.organizations FOR SELECT
    USING (
        check_user_org_membership(auth.uid(), id)
        OR is_active = true -- Public organizations
    );

CREATE POLICY "Organizations can be created by authenticated users"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organizations can be updated by admins"
    ON public.organizations FOR UPDATE
    USING (
        owner_id = auth.uid()
        OR get_user_org_role(auth.uid(), id) IN ('admin', 'super_admin')
    );

-- User organizations policies
CREATE POLICY "Users can view their own memberships"
    ON public.user_organizations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage memberships"
    ON public.user_organizations FOR ALL
    USING (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Leagues policies
CREATE POLICY "Leagues are viewable by organization members"
    ON public.leagues FOR SELECT
    USING (
        check_user_org_membership(auth.uid(), organization_id)
    );

CREATE POLICY "Leagues can be created by organization admins"
    ON public.leagues FOR INSERT
    WITH CHECK (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

CREATE POLICY "Leagues can be updated by organization admins"
    ON public.leagues FOR UPDATE
    USING (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Teams policies
CREATE POLICY "Teams are viewable by league members"
    ON public.teams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leagues
            WHERE leagues.id = teams.league_id
            AND check_user_org_membership(auth.uid(), leagues.organization_id)
        )
    );

CREATE POLICY "Teams can be managed by coaches and admins"
    ON public.teams FOR UPDATE
    USING (
        coach_id = auth.uid()
        OR auth.uid() = ANY(assistant_coach_ids)
        OR EXISTS (
            SELECT 1 FROM public.leagues
            WHERE leagues.id = teams.league_id
            AND get_user_org_role(auth.uid(), leagues.organization_id) IN ('admin', 'super_admin')
        )
    );

-- Players policies
CREATE POLICY "Players are viewable by team members and parents"
    ON public.players FOR SELECT
    USING (
        user_id = auth.uid()
        OR parent_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.teams
            WHERE teams.id = players.team_id
            AND (teams.coach_id = auth.uid() OR auth.uid() = ANY(teams.assistant_coach_ids))
        )
    );

CREATE POLICY "Players can be updated by themselves, parents, or coaches"
    ON public.players FOR UPDATE
    USING (
        user_id = auth.uid()
        OR parent_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.teams
            WHERE teams.id = players.team_id
            AND (teams.coach_id = auth.uid() OR auth.uid() = ANY(teams.assistant_coach_ids))
        )
    );

-- Games policies
CREATE POLICY "Games are viewable by league members"
    ON public.games FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leagues
            WHERE leagues.id = games.league_id
            AND check_user_org_membership(auth.uid(), leagues.organization_id)
        )
    );

CREATE POLICY "Games can be updated by officials and admins"
    ON public.games FOR UPDATE
    USING (
        scorekeeper_id = auth.uid()
        OR auth.uid() = ANY(referee_ids)
        OR EXISTS (
            SELECT 1 FROM public.leagues
            WHERE leagues.id = games.league_id
            AND get_user_org_role(auth.uid(), leagues.organization_id) IN ('admin', 'super_admin')
        )
    );

-- Game scores policies
CREATE POLICY "Game scores are viewable by league members"
    ON public.game_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.games
            JOIN public.leagues ON leagues.id = games.league_id
            WHERE games.id = game_scores.game_id
            AND check_user_org_membership(auth.uid(), leagues.organization_id)
        )
    );

CREATE POLICY "Game scores can be created by scorekeepers and referees"
    ON public.game_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = game_scores.game_id
            AND (
                games.scorekeeper_id = auth.uid()
                OR auth.uid() = ANY(games.referee_ids)
            )
        )
    );

-- Tournament policies
CREATE POLICY "Tournaments are viewable by organization members"
    ON public.tournaments FOR SELECT
    USING (
        check_user_org_membership(auth.uid(), organization_id)
    );

CREATE POLICY "Tournaments can be managed by organization admins"
    ON public.tournaments FOR ALL
    USING (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Venues policies
CREATE POLICY "Venues are viewable by organization members"
    ON public.venues FOR SELECT
    USING (
        check_user_org_membership(auth.uid(), organization_id)
    );

CREATE POLICY "Venues can be managed by organization admins"
    ON public.venues FOR ALL
    USING (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Scheduled reports policies
CREATE POLICY "Reports are viewable by creators and admins"
    ON public.scheduled_reports FOR SELECT
    USING (
        created_by = auth.uid()
        OR get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

CREATE POLICY "Reports can be managed by creators and admins"
    ON public.scheduled_reports FOR ALL
    USING (
        created_by = auth.uid()
        OR get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Payment records policies
CREATE POLICY "Users can view their own payments"
    ON public.payment_records FOR SELECT
    USING (
        user_id = auth.uid()
        OR get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

CREATE POLICY "Payments can be created by authenticated users"
    ON public.payment_records FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- Audit logs policies
CREATE POLICY "Audit logs are viewable by organization admins only"
    ON public.audit_logs FOR SELECT
    USING (
        get_user_org_role(auth.uid(), organization_id) IN ('admin', 'super_admin')
    );

-- ============================================================================
-- Real-time Subscriptions Setup
-- ============================================================================

-- Enable real-time for game updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;

-- Enable real-time for team updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;

-- Enable real-time for tournament brackets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_teams;

-- ============================================================================
-- Performance Indexes for Common Queries
-- ============================================================================

-- Composite indexes for game queries
CREATE INDEX idx_games_league_status_time ON public.games(league_id, status, scheduled_time);
 

-- Indexes for real-time score updates
CREATE INDEX idx_game_scores_recent ON public.game_scores(game_id, created_at DESC);

-- Indexes for tournament brackets
CREATE INDEX idx_tournament_teams_active ON public.tournament_teams(tournament_id)
    WHERE is_eliminated = false;

-- Indexes for payment queries
CREATE INDEX idx_payments_recent ON public.payment_records(created_at DESC);
CREATE INDEX idx_payments_pending ON public.payment_records(status, created_at)
    WHERE status IN ('pending', 'processing');

-- ============================================================================
-- Initial Seed Data
-- ============================================================================

-- Insert default user roles (handled by enum)

-- Insert system user for automated actions
 

-- ============================================================================
-- Storage Buckets Configuration (for Supabase Storage)
-- ============================================================================

-- These should be created via Supabase Dashboard or CLI:
-- 1. avatars - User profile pictures
-- 2. team-logos - Team logos
-- 3. tournament-assets - Tournament related images
-- 4. game-media - Game photos and highlights
-- 5. reports - Generated reports

-- ============================================================================
-- End of Schema
-- ============================================================================

-- Schema version tracking
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.schema_migrations (version, name)
VALUES (1, 'Initial Basketball League Management Schema for Supabase')
ON CONFLICT (version) DO NOTHING;

COMMENT ON SCHEMA public IS 'Basketball League Management Platform - Optimized for Supabase';